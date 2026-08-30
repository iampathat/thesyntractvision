from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Sequence

from qcds_fabric.fabric import FabricLayer, StabilizedRotationSuiteResult
from qcds_fabric.grover_depth import AdaptiveGroverSubstrate, GroverDepthConfig
from qcds_fabric.kernel import ClassicalInferenceKernel
from qcds_fabric.models import BaseBundle
from qcds_fabric.oracles import OracleStack


@dataclass(frozen=True)
class LegalExecutionProfile:
    profile_id: str
    substrate_id: str
    exact_classical_reference: bool
    grover_emulated: bool
    native_quantum_target: bool
    semantic_projection_allowed: bool
    resource_bounded_emulation: bool
    max_states: int
    grover_max_iterations: int | None = None

    @property
    def requires_full_logical_universe(self) -> bool:
        return self.native_quantum_target and not self.semantic_projection_allowed


@dataclass(frozen=True)
class LegalEmulationResourceProfile:
    """Capacity policy for software execution, never a change to QCDS semantics."""

    profile_id: str
    environment: str
    max_unknown_dimensions: int
    grover_max_states: int
    grover_max_iterations: int
    projection_allowed: bool = True

    @property
    def max_exact_candidate_states(self) -> int:
        return 1 << self.max_unknown_dimensions

    def as_dict(self) -> Mapping[str, object]:
        return {
            "profile_id": self.profile_id,
            "environment": self.environment,
            "max_unknown_dimensions": self.max_unknown_dimensions,
            "max_exact_candidate_states": self.max_exact_candidate_states,
            "grover_max_states": self.grover_max_states,
            "grover_max_iterations": self.grover_max_iterations,
            "projection_allowed": self.projection_allowed,
            "changes_qcds_semantics": False,
            "applies_to_quantum_full_space": False,
        }


def browser_emulation_resource_profile() -> LegalEmulationResourceProfile:
    return LegalEmulationResourceProfile(
        profile_id="browser_session",
        environment="browser / Pyodide session",
        max_unknown_dimensions=16,
        grover_max_states=2048,
        grover_max_iterations=4,
    )


def macbook_emulation_resource_profile() -> LegalEmulationResourceProfile:
    return LegalEmulationResourceProfile(
        profile_id="macbook_local",
        environment="local MacBook-class machine",
        max_unknown_dimensions=20,
        grover_max_states=16384,
        grover_max_iterations=8,
    )


def central_emulation_resource_profile() -> LegalEmulationResourceProfile:
    return LegalEmulationResourceProfile(
        profile_id="central_emulation",
        environment="central high-capacity software fabric",
        max_unknown_dimensions=22,
        grover_max_states=65536,
        grover_max_iterations=10,
    )


def resolve_emulation_resource_profile(profile_id: str) -> LegalEmulationResourceProfile:
    profiles = {
        "browser": browser_emulation_resource_profile(),
        "browser_session": browser_emulation_resource_profile(),
        "macbook": macbook_emulation_resource_profile(),
        "macbook_local": macbook_emulation_resource_profile(),
        "central": central_emulation_resource_profile(),
        "central_emulation": central_emulation_resource_profile(),
    }
    key = str(profile_id).strip().lower()
    if key not in profiles:
        raise ValueError(
            f"unknown legal emulation resource profile {profile_id!r}; "
            "expected browser, macbook, or central"
        )
    return profiles[key]


def classical_exact_profile(*, top_k: int = 8) -> tuple[LegalExecutionProfile, FabricLayer]:
    """Exact bounded classical reference over the already formed active room.

    Classical execution may use resource-aware Condition Formation before this
    profile is invoked. Once the BaseBundle is supplied, however, this profile
    enumerates its complete 2^N support and never silently prunes candidate
    states.
    """
    profile = LegalExecutionProfile(
        profile_id="classical_exact",
        substrate_id="classical",
        exact_classical_reference=True,
        grover_emulated=False,
        native_quantum_target=False,
        semantic_projection_allowed=True,
        resource_bounded_emulation=True,
        max_states=0,
        grover_max_iterations=None,
    )
    return profile, FabricLayer(kernel=ClassicalInferenceKernel(top_k=top_k))


def grover_emulated_profile(
    *,
    top_k: int = 8,
    max_states: int = 4096,
    max_iterations: int = 8,
) -> tuple[LegalExecutionProfile, FabricLayer]:
    """Software statevector/Grover emulation of the active QCDS room.

    This mode is deliberately resource bounded. It may run a classically formed
    active room or an exact separable decomposition, because the statevector is
    materialized in software. That classical resource concession must never be
    confused with the native quantum target semantics.
    """
    config = GroverDepthConfig(
        top_k=top_k,
        max_states=max_states,
        max_iterations=max_iterations,
    )
    substrate = AdaptiveGroverSubstrate(config=config)
    profile = LegalExecutionProfile(
        profile_id="grover_emulated",
        substrate_id=substrate.substrate_id,
        exact_classical_reference=False,
        grover_emulated=True,
        native_quantum_target=False,
        semantic_projection_allowed=True,
        resource_bounded_emulation=True,
        max_states=max_states,
        grover_max_iterations=max_iterations,
    )
    return profile, FabricLayer(kernel=substrate)


def quantum_full_space_profile() -> LegalExecutionProfile:
    """Native-QPU target contract for QCDS.

    This is an architectural execution contract, not a software QPU backend.
    The represented logical universe must not be reduced merely to satisfy a
    classical state-count/memory bound. Relevance is intended to emerge through
    Conditions, oracle interaction, amplitude evolution and recursive QCDS.

    A future native substrate must either accept the full represented bundle or
    use a decomposition that is itself a QCDS/Syntract operation preserving the
    complete represented universe. Classical semantic pre-filtering is forbidden
    in this mode.
    """
    return LegalExecutionProfile(
        profile_id="quantum_full_space",
        substrate_id="native_qpu_target",
        exact_classical_reference=False,
        grover_emulated=False,
        native_quantum_target=True,
        semantic_projection_allowed=False,
        resource_bounded_emulation=False,
        max_states=0,
        grover_max_iterations=None,
    )


def candidate_state_count(bundle: BaseBundle) -> int:
    """Return exact baseline state count without materializing the state tuple."""
    return 1 << sum(1 for value in bundle.values if value == "?")


def validate_execution_contract(
    profile: LegalExecutionProfile,
    *,
    represented_dimension_ids: Sequence[str],
    execution_dimension_ids: Sequence[str],
) -> None:
    """Enforce the classical-emulation vs native-quantum boundary.

    Emulation may intentionally execute a resource-bounded projection. Native
    quantum target mode may not drop represented dimensions as a hidden
    classical pre-filter.
    """
    represented = tuple(dict.fromkeys(str(value) for value in represented_dimension_ids))
    executed = tuple(dict.fromkeys(str(value) for value in execution_dimension_ids))
    if profile.requires_full_logical_universe and set(executed) != set(represented):
        missing = sorted(set(represented) - set(executed))
        extra = sorted(set(executed) - set(represented))
        raise ValueError(
            "quantum_full_space forbids semantic pre-filtering; execution dimensions must equal "
            f"the represented logical universe (missing={missing}, extra={extra})"
        )


def run_profile(
    profile: LegalExecutionProfile,
    fabric: FabricLayer,
    bundle: BaseBundle,
    oracle_stack: OracleStack,
    *,
    include_positional: bool = True,
    include_oracle_exposure: bool = True,
    include_crossed: bool = False,
) -> StabilizedRotationSuiteResult:
    if profile.native_quantum_target:
        raise NotImplementedError(
            "quantum_full_space is a native-QPU target contract; no physical QPU backend is connected in this reference build"
        )
    state_count = candidate_state_count(bundle)
    if profile.max_states and state_count > profile.max_states:
        raise ValueError(
            f"execution profile {profile.profile_id} supports at most {profile.max_states} states; "
            f"active QCDS space contains {state_count}"
        )
    return fabric.run_stabilized_rotation_suite(
        bundle,
        oracle_stack,
        include_positional=include_positional,
        include_oracle_exposure=include_oracle_exposure,
        include_crossed=include_crossed,
    )


def profile_payload(
    profile: LegalExecutionProfile,
    suite: StabilizedRotationSuiteResult,
) -> Mapping[str, object]:
    baseline = suite.baseline_distribution
    stabilized = suite.stabilized_return.stabilized_distribution
    selected_depths: dict[str, int] = {}
    if profile.grover_emulated:
        if "selected_grover_iterations" in baseline.provenance:
            selected_depths["baseline"] = int(baseline.provenance["selected_grover_iterations"])
        for family_name, bank in suite.families.items():
            for index, distribution in enumerate(bank.distributions):
                if "selected_grover_iterations" in distribution.provenance:
                    selected_depths[f"{family_name}:{index}"] = int(
                        distribution.provenance["selected_grover_iterations"]
                    )
    return {
        "profile_id": profile.profile_id,
        "substrate_id": profile.substrate_id,
        "exact_classical_reference": profile.exact_classical_reference,
        "grover_emulated": profile.grover_emulated,
        "native_quantum_target": profile.native_quantum_target,
        "semantic_projection_allowed": profile.semantic_projection_allowed,
        "resource_bounded_emulation": profile.resource_bounded_emulation,
        "state_count": len(baseline.support),
        "baseline_entropy": baseline.entropy,
        "stabilized_entropy": stabilized.entropy,
        "baseline_oracle_agreement": baseline.oracle_agreement,
        "stabilized_oracle_agreement": stabilized.oracle_agreement,
        "retained_uncertainty": suite.stabilized_return.retained_uncertainty,
        "rotation_sensitivity": dict(suite.stabilized_return.rotation_sensitivity),
        "selected_grover_iterations": selected_depths,
        "native_qpu": False,
        "quantum_advantage_claim": False,
    }


def target_profile_payload(profile: LegalExecutionProfile) -> Mapping[str, object]:
    """Describe a non-executed target profile without pretending it ran."""
    return {
        "profile_id": profile.profile_id,
        "substrate_id": profile.substrate_id,
        "status": "target_contract_only",
        "native_quantum_target": profile.native_quantum_target,
        "semantic_projection_allowed": profile.semantic_projection_allowed,
        "requires_full_logical_universe": profile.requires_full_logical_universe,
        "resource_bounded_emulation": profile.resource_bounded_emulation,
        "native_qpu_connected": False,
        "quantum_advantage_claim": False,
        "rule": "do not remove represented logical dimensions merely to satisfy classical memory/state-count limits",
    }


__all__ = [
    "LegalEmulationResourceProfile",
    "LegalExecutionProfile",
    "browser_emulation_resource_profile",
    "candidate_state_count",
    "central_emulation_resource_profile",
    "classical_exact_profile",
    "grover_emulated_profile",
    "macbook_emulation_resource_profile",
    "profile_payload",
    "quantum_full_space_profile",
    "resolve_emulation_resource_profile",
    "run_profile",
    "target_profile_payload",
    "validate_execution_contract",
]
