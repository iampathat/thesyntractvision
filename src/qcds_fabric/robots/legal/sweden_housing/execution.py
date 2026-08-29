from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping

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
    max_states: int
    grover_max_iterations: int | None = None


def classical_exact_profile(*, top_k: int = 8) -> tuple[LegalExecutionProfile, FabricLayer]:
    profile = LegalExecutionProfile(
        profile_id="classical_exact",
        substrate_id="classical",
        exact_classical_reference=True,
        grover_emulated=False,
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
        max_states=max_states,
        grover_max_iterations=max_iterations,
    )
    return profile, FabricLayer(kernel=substrate)


def candidate_state_count(bundle: BaseBundle) -> int:
    """Return exact baseline state count without materializing the state tuple."""
    return 1 << sum(1 for value in bundle.values if value == "?")


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


__all__ = [
    "LegalExecutionProfile",
    "candidate_state_count",
    "classical_exact_profile",
    "grover_emulated_profile",
    "profile_payload",
    "run_profile",
]
