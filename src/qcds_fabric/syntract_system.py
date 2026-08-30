from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Sequence

from .central_fabric import CentralFabricRun, CentralQCDSFabric
from .evidence_planning import (
    ContinuationPolicy,
    EvidenceAcquisitionResult,
    EvidencePlan,
    EvidencePlanningConfig,
    IntelligenceCheckpoint,
)
from .fabric import FabricLayer
from .intelligence_store import CsvIntelligenceStore, StoredMissionState
from .models import Syntract, TruthDistribution
from .oracle_evolution import OracleChallengeSuite, OracleEvolutionConfig
from .oracle_genesis import (
    OracleFailureObservation,
    OracleGapDiscoveryConfig,
    OracleGenesisGenerator,
    PairwiseSemanticRuleGenesisGenerator,
)
from .oracle_space import OracleSpace
from .problem import (
    ProblemCompilation,
    ProblemInferenceResult,
    ProblemResult,
    SemanticProblemAdapter,
    SemanticProblemFrame,
    bind_problem_result,
    problem_to_syntract,
    run_problem_compilation,
    run_problem_text,
)
from .runtime import RuntimeStepResult, SuperintelligenceRuntime


class SyntractSystemError(ValueError):
    """Raised when the unified system boundary cannot preserve QCDS semantics."""


@dataclass(frozen=True)
class SyntractExecution:
    """One complete question/material -> QCDS -> Syntract execution.

    This object does not introduce another result type in the epistemic sense.
    It is a transport envelope around the existing ProblemResult plus the same
    BaseBundle + OracleStack manifested as one portable OracleSpace.
    """

    mission_id: str
    universe_id: str
    problem: ProblemResult
    oracle_space: OracleSpace
    provenance: Mapping[str, Any]

    @property
    def compilation(self) -> ProblemCompilation:
        return self.problem.compilation

    @property
    def inference(self) -> ProblemInferenceResult:
        return self.problem.inference

    @property
    def syntract(self) -> Syntract:
        return self.problem.syntract

    @property
    def truth_distribution(self) -> TruthDistribution:
        return self.syntract.bound_distribution

    @property
    def logical_width(self) -> int:
        bundle = self.compilation.bundle
        return 0 if bundle is None else bundle.width


@dataclass(frozen=True)
class SyntractMissionStep:
    """Persistent intelligence step expressed through the same SyntractSystem result."""

    runtime_step: RuntimeStepResult
    execution: SyntractExecution

    @property
    def checkpoint(self) -> IntelligenceCheckpoint:
        return self.runtime_step.cycle.checkpoint

    @property
    def plans(self) -> tuple[EvidencePlan, ...]:
        return self.runtime_step.cycle.plans

    @property
    def state(self) -> StoredMissionState:
        return self.runtime_step.state


class SyntractMission:
    """Persistent mission view over the existing SuperintelligenceRuntime.

    BUILD 56 does not create a new loop. It makes BUILD 15's persistent runtime
    callable through the same system boundary used for ordinary QCDS/Syntract
    execution.
    """

    def __init__(
        self,
        system: "SyntractSystem",
        store: CsvIntelligenceStore,
        *,
        universe_id: str | None = None,
    ) -> None:
        self.system = system
        self.store = store
        self.universe_id = universe_id or system.default_universe_id
        self.runtime = SuperintelligenceRuntime(
            store=store,
            fabric_layer=system.fabric_layer,
            max_width=system.max_width,
        )

    def state(self, mission_id: str) -> StoredMissionState:
        return self.runtime.state(mission_id)

    def create(self, frame: SemanticProblemFrame) -> SyntractExecution:
        self.runtime.create_mission(frame)
        return self.current(frame.mission_id)

    def current(self, mission_id: str) -> SyntractExecution:
        compilation = self.runtime.compilation(mission_id)
        return self.system.run_compilation(
            compilation,
            universe_id=self.universe_id,
            space_id=f"space:{mission_id}",
            syntract_id=f"syntract:mission:{mission_id}:current",
        )

    def advance(
        self,
        mission_id: str,
        challenge_suite: OracleChallengeSuite,
        *,
        observations: Sequence[OracleFailureObservation] = (),
        genesis_generators: Sequence[OracleGenesisGenerator] = (PairwiseSemanticRuleGenesisGenerator(),),
        discovery_config: OracleGapDiscoveryConfig | None = None,
        evolution_config: OracleEvolutionConfig | None = None,
        planning_config: EvidencePlanningConfig | None = None,
        continuation_policy: ContinuationPolicy | None = None,
        explicit_terminal: bool = False,
    ) -> SyntractMissionStep:
        step = self.runtime.step(
            mission_id,
            challenge_suite,
            observations=observations,
            genesis_generators=genesis_generators,
            discovery_config=discovery_config,
            evolution_config=evolution_config,
            planning_config=planning_config,
            continuation_policy=continuation_policy,
            explicit_terminal=explicit_terminal,
        )
        execution = self.system.run_compilation(
            step.compilation,
            universe_id=self.universe_id,
            space_id=f"space:{mission_id}",
            syntract_id=f"syntract:mission:{mission_id}:cycle:{step.state.cycle_index}",
        )
        return SyntractMissionStep(runtime_step=step, execution=execution)

    def observe(
        self,
        mission_id: str,
        results: Sequence[EvidenceAcquisitionResult],
    ) -> SyntractExecution:
        self.runtime.observe(mission_id, results)
        return self.current(mission_id)


class SyntractSystem:
    """One public composition boundary for the existing QCDS/Syntract machine.

    The system deliberately delegates inference to the already-existing public
    QCDS functions. It does not reimplement the four phases, oracle semantics,
    stabilization, Syntract binding, Logical Space, persistence, or central
    execution.
    """

    def __init__(
        self,
        *,
        fabric_layer: FabricLayer | None = None,
        central_fabric: CentralQCDSFabric | None = None,
        max_width: int = 20,
        default_universe_id: str = "reality",
    ) -> None:
        if max_width <= 0:
            raise ValueError("SyntractSystem max_width must be positive")
        if not default_universe_id.strip():
            raise ValueError("SyntractSystem default_universe_id must be non-empty")
        self.fabric_layer = fabric_layer or FabricLayer()
        self.central_fabric = central_fabric or CentralQCDSFabric(fabric=self.fabric_layer)
        self.max_width = max_width
        self.default_universe_id = default_universe_id

    def _wrap(
        self,
        result: ProblemResult,
        *,
        universe_id: str | None = None,
        space_id: str | None = None,
    ) -> SyntractExecution:
        compilation = result.compilation
        if compilation.bundle is None or compilation.oracle_stack is None:
            raise SyntractSystemError("cannot manifest a non-executable problem as an Oracle Space")
        resolved_universe = universe_id or self.default_universe_id
        if not resolved_universe.strip():
            raise SyntractSystemError("universe_id must be non-empty")
        resolved_space = space_id or f"space:{result.frame.mission_id}"
        space = OracleSpace(
            space_id=resolved_space,
            universe_id=resolved_universe,
            bundle=compilation.bundle,
            oracle_stack=compilation.oracle_stack,
            host_kind="external",
            provenance={
                "source": "SyntractSystem",
                "mission_id": result.frame.mission_id,
                "problem_to_syntract": True,
                "truth_promoted_by_facade": False,
                "qcds_core_replaced": False,
                "canonical_spec_modified": False,
            },
            syntract_ids=(result.syntract.syntract_id,),
        )
        return SyntractExecution(
            mission_id=result.frame.mission_id,
            universe_id=resolved_universe,
            problem=result,
            oracle_space=space,
            provenance={
                "system": "SyntractSystem",
                "entrypoint": "problem_to_syntract",
                "single_qcds_architecture": True,
                "qcds_core_replaced": False,
                "canonical_spec_modified": False,
            },
        )

    def run_compilation(
        self,
        compilation: ProblemCompilation,
        *,
        universe_id: str | None = None,
        space_id: str | None = None,
        include_positional: bool = False,
        include_oracle_exposure: bool = False,
        include_crossed: bool = False,
        syntract_id: str | None = None,
    ) -> SyntractExecution:
        inference = run_problem_compilation(
            compilation,
            fabric_layer=self.fabric_layer,
            include_positional=include_positional,
            include_oracle_exposure=include_oracle_exposure,
            include_crossed=include_crossed,
        )
        syntract = bind_problem_result(inference, syntract_id=syntract_id)
        result = ProblemResult(compilation.frame, compilation, inference, syntract)
        return self._wrap(result, universe_id=universe_id, space_id=space_id)

    def run_frame(
        self,
        frame: SemanticProblemFrame,
        *,
        universe_id: str | None = None,
        space_id: str | None = None,
        include_positional: bool = False,
        include_oracle_exposure: bool = False,
        include_crossed: bool = False,
        syntract_id: str | None = None,
    ) -> SyntractExecution:
        result = problem_to_syntract(
            frame,
            max_width=self.max_width,
            fabric_layer=self.fabric_layer,
            include_positional=include_positional,
            include_oracle_exposure=include_oracle_exposure,
            include_crossed=include_crossed,
            syntract_id=syntract_id,
        )
        return self._wrap(result, universe_id=universe_id, space_id=space_id)

    def run_text(
        self,
        text: str,
        *,
        mission_id: str,
        adapter: SemanticProblemAdapter,
        universe_id: str | None = None,
        space_id: str | None = None,
        include_positional: bool = False,
        include_oracle_exposure: bool = False,
        include_crossed: bool = False,
        syntract_id: str | None = None,
    ) -> SyntractExecution:
        result = run_problem_text(
            text,
            mission_id=mission_id,
            adapter=adapter,
            max_width=self.max_width,
            fabric_layer=self.fabric_layer,
            include_positional=include_positional,
            include_oracle_exposure=include_oracle_exposure,
            include_crossed=include_crossed,
            syntract_id=syntract_id,
        )
        return self._wrap(result, universe_id=universe_id, space_id=space_id)

    def mission(self, store: CsvIntelligenceStore, *, universe_id: str | None = None) -> SyntractMission:
        return SyntractMission(self, store, universe_id=universe_id)

    def mount(self, execution: SyntractExecution, *, replace: bool = False) -> OracleSpace:
        """Mount the exact same logical contract on the central QCDS host."""
        return self.central_fabric.mount(execution.oracle_space, replace=replace)

    def run_mounted(self, space_id: str) -> CentralFabricRun:
        """Run a mounted Oracle Space through the existing CentralQCDSFabric."""
        return self.central_fabric.run(space_id)

    def mounted_manifest(self) -> tuple[Mapping[str, object], ...]:
        return self.central_fabric.mounted_manifest()


__all__ = [
    "SyntractSystemError",
    "SyntractExecution",
    "SyntractMissionStep",
    "SyntractMission",
    "SyntractSystem",
]
