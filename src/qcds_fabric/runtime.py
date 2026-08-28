from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

from .evidence_planning import (
    ContinuationPolicy,
    EvidenceAcquisitionResult,
    EvidencePlanningConfig,
    EvidencePlanningCycleResult,
    apply_evidence_results,
    run_evidence_planning_cycle,
)
from .fabric import FabricLayer
from .intelligence_store import CsvIntelligenceStore, StoredMissionState
from .logical_robot import (
    LogicalRobotPolicy,
    LogicalRobotRunResult,
    LogicalRobotTool,
    execute_logical_robot_plans,
)
from .oracle_evolution import OracleChallengeSuite, OracleEvolutionConfig, extract_problem_rule_population
from .oracle_genesis import (
    OracleFailureObservation,
    OracleGapDiscoveryConfig,
    OracleGenesisGenerator,
    PairwiseSemanticRuleGenesisGenerator,
)
from .oracles import OracleStack
from .problem import ProblemCompilation, SemanticProblemFrame, compile_problem_frame


class SuperintelligenceRuntimeError(ValueError):
    """Raised when BUILD 15 runtime state cannot continue safely."""


@dataclass(frozen=True)
class RuntimeStepResult:
    mission_id: str
    cycle: EvidencePlanningCycleResult
    state: StoredMissionState
    compilation: ProblemCompilation


@dataclass(frozen=True)
class RuntimeRobotResult:
    mission_id: str
    initial_step: RuntimeStepResult
    robot: LogicalRobotRunResult | None
    followup_step: RuntimeStepResult | None
    state: StoredMissionState


@dataclass
class SuperintelligenceRuntime:
    """Thin callable runtime above QCDS BUILD 0–14.

    The runtime is intentionally not another reasoning layer. It reconstructs a
    mission from the configured intelligence store, calls the existing QCDS
    genesis/evidence machinery, persists the evolved oracle population and lets
    logical robots submit observations back through the same stable interface.
    """

    store: CsvIntelligenceStore
    fabric_layer: FabricLayer | None = None
    max_width: int = 20

    def __post_init__(self) -> None:
        if self.max_width <= 0:
            raise ValueError("runtime max_width must be positive")

    def create_mission(self, frame: SemanticProblemFrame) -> StoredMissionState:
        compilation = compile_problem_frame(frame, max_width=self.max_width)
        if not compilation.executable:
            raise SuperintelligenceRuntimeError(
                "runtime mission must be executable; inspect semantic unresolved/blocked queries first"
            )
        self.store.save_frame(compilation.canonical_frame)
        population = extract_problem_rule_population(compilation)
        self.store.save_oracle_population(frame.mission_id, population, generation=0)
        self.store.initialize_population_history(frame.mission_id, population)
        return self.store.state(frame.mission_id)

    def compilation(self, mission_id: str) -> ProblemCompilation:
        return self.store.load_compilation(mission_id, max_width=self.max_width)

    def state(self, mission_id: str) -> StoredMissionState:
        return self.store.state(mission_id)

    @staticmethod
    def _persistent_population(
        previous: OracleStack,
        cycle: EvidencePlanningCycleResult,
        *,
        cycle_index: int,
    ) -> OracleStack:
        evolution = cycle.genesis.evolution
        if evolution is None or evolution.promotion_count == 0:
            return previous
        return OracleStack(
            stack_id=previous.stack_id,
            version=f"{previous.version}+c{cycle_index}.{evolution.promotion_count}",
            oracles=tuple(evolution.final_stack.oracles),
        )

    def step(
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
    ) -> RuntimeStepResult:
        compilation = self.compilation(mission_id)
        previous_population = self.store.load_oracle_population(mission_id)
        cycle_index = self.store.next_cycle_index(mission_id)
        cycle = run_evidence_planning_cycle(
            compilation,
            challenge_suite,
            observations=observations,
            genesis_generators=genesis_generators,
            fabric_layer=self.fabric_layer,
            discovery_config=discovery_config,
            evolution_config=evolution_config,
            planning_config=planning_config,
            continuation_policy=continuation_policy,
            cycle_index=cycle_index,
            explicit_terminal=explicit_terminal,
        )
        population = self._persistent_population(previous_population, cycle, cycle_index=cycle_index)
        self.store.save_oracle_population(mission_id, population, generation=cycle_index)
        evolution = cycle.genesis.evolution
        if evolution is not None:
            self.store.append_lineage(mission_id, evolution.lineage, cycle_index=cycle_index)
        self.store.append_checkpoint(mission_id, cycle.checkpoint)
        return RuntimeStepResult(
            mission_id=mission_id,
            cycle=cycle,
            state=self.store.state(mission_id),
            compilation=cycle.genesis.evolved_compilation,
        )

    def observe(
        self,
        mission_id: str,
        results: Sequence[EvidenceAcquisitionResult],
    ) -> StoredMissionState:
        resolved = tuple(results)
        if not resolved:
            raise SuperintelligenceRuntimeError("runtime.observe requires at least one evidence result")
        compilation = self.compilation(mission_id)
        updated = apply_evidence_results(compilation, resolved)
        self.store.save_frame(updated.canonical_frame)
        self.store.append_evidence(mission_id, resolved)
        return self.store.state(mission_id)

    def run_logical_robot_once(
        self,
        mission_id: str,
        challenge_suite: OracleChallengeSuite,
        tools: Sequence[LogicalRobotTool],
        *,
        observations: Sequence[OracleFailureObservation] = (),
        robot_policy: LogicalRobotPolicy | None = None,
        genesis_generators: Sequence[OracleGenesisGenerator] = (PairwiseSemanticRuleGenesisGenerator(),),
        discovery_config: OracleGapDiscoveryConfig | None = None,
        evolution_config: OracleEvolutionConfig | None = None,
        planning_config: EvidencePlanningConfig | None = None,
        continuation_policy: ContinuationPolicy | None = None,
    ) -> RuntimeRobotResult:
        """Convenience MVP: ask QCDS, let BUILD 14 observe, feed evidence back, ask QCDS again.

        External logical robots do not have to use this helper. They can call
        ``step()`` to receive plans and later call ``observe()`` with results.
        This method merely proves that the boundary is callable end-to-end.
        """

        initial = self.step(
            mission_id,
            challenge_suite,
            observations=observations,
            genesis_generators=genesis_generators,
            discovery_config=discovery_config,
            evolution_config=evolution_config,
            planning_config=planning_config,
            continuation_policy=continuation_policy,
        )
        if not initial.cycle.plans:
            return RuntimeRobotResult(mission_id, initial, None, None, self.state(mission_id))

        robot = execute_logical_robot_plans(
            initial.cycle.genesis.evolved_compilation,
            initial.cycle.plans,
            tools,
            policy=robot_policy,
        )
        if not robot.evidence_results:
            return RuntimeRobotResult(mission_id, initial, robot, None, self.state(mission_id))

        self.observe(mission_id, robot.evidence_results)
        followup = self.step(
            mission_id,
            challenge_suite,
            genesis_generators=genesis_generators,
            discovery_config=discovery_config,
            evolution_config=evolution_config,
            planning_config=planning_config,
            continuation_policy=continuation_policy,
        )
        return RuntimeRobotResult(mission_id, initial, robot, followup, self.state(mission_id))
