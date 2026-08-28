from __future__ import annotations

from cmath import exp
from dataclasses import dataclass
from math import pi, sqrt
from typing import Protocol, runtime_checkable

from .models import ChannelView, TruthDistribution
from .oracles import OracleStack


@runtime_checkable
class InferenceSubstrate(Protocol):
    """Minimal local-pass contract required by QCDS Fabric.

    Substrates may be classical, simulated quantum, native quantum, or hybrid.
    They must consume the same logical ChannelView + OracleStack boundary and
    return an uncertainty-bearing TruthDistribution.
    """

    @property
    def substrate_id(self) -> str: ...

    def run(self, view: ChannelView, oracle_stack: OracleStack) -> TruthDistribution: ...


@dataclass(frozen=True)
class StatevectorGroverSubstrate:
    """Bounded statevector reference adapter with Grover-style amplification.

    This implementation performs complex-amplitude evolution in software:
    equal-superposition initialization, score-derived phase marking, and
    inversion-about-the-mean diffusion. It is a simulator and makes no claim of
    native quantum speedup or query advantage.

    ``phase_scale`` defaults to pi. Per-state phase is
    ``phase_scale * (oracle_score / max_oracle_score)`` within the current view.
    That weighted phase policy is a BUILD 6 reference choice, not a new
    canonical QCDS Fabric rule.
    """

    iterations: int = 1
    top_k: int = 8
    phase_scale: float = pi
    max_states: int = 4096

    @property
    def substrate_id(self) -> str:
        return "statevector_grover_simulator"

    def __post_init__(self) -> None:
        if self.iterations <= 0:
            raise ValueError("iterations must be positive")
        if self.top_k <= 0:
            raise ValueError("top_k must be positive")
        if self.phase_scale <= 0:
            raise ValueError("phase_scale must be positive")
        if self.max_states <= 0:
            raise ValueError("max_states must be positive")

    def run(self, view: ChannelView, oracle_stack: OracleStack) -> TruthDistribution:
        support = view.candidate_states()
        state_count = len(support)
        if state_count > self.max_states:
            raise ValueError(
                f"statevector support {state_count} exceeds max_states {self.max_states}; "
                "use a narrower bundle, a different substrate, or raise the explicit simulator bound"
            )

        raw_scores: list[float] = []
        agreements: list[float] = []
        for state in support:
            score, agreement = oracle_stack.score(view, state)
            if score < 0:
                raise ValueError("statevector reference substrate requires non-negative oracle scores")
            raw_scores.append(score)
            agreements.append(agreement)

        contradiction_markers: list[str] = []
        max_score = max(raw_scores, default=0.0)
        if max_score <= 0.0:
            probabilities = tuple(1.0 / state_count for _ in support)
            normalization = "explicit_global_contradiction_uniform_statevector_fallback"
            contradiction_markers.append("all_candidate_states_rejected")
        else:
            amplitude = 1.0 / sqrt(state_count)
            amplitudes = [complex(amplitude, 0.0) for _ in support]
            phases = [self.phase_scale * (score / max_score) for score in raw_scores]

            for _ in range(self.iterations):
                amplitudes = [
                    value * exp(1j * phase)
                    for value, phase in zip(amplitudes, phases)
                ]
                mean = sum(amplitudes) / state_count
                amplitudes = [2.0 * mean - value for value in amplitudes]

            unnormalized = [abs(value) ** 2 for value in amplitudes]
            norm = sum(unnormalized)
            if norm <= 0.0:
                raise RuntimeError("statevector norm collapsed to zero")
            probabilities = tuple(value / norm for value in unnormalized)
            normalization = "statevector_grover_probability"

        ordering = sorted(range(state_count), key=lambda i: probabilities[i], reverse=True)
        k = min(self.top_k, state_count)
        top = tuple(support[i] for i in ordering[:k])
        weighted_agreement = sum(p * a for p, a in zip(probabilities, agreements))

        return TruthDistribution(
            support=support,
            probabilities=probabilities,
            raw_scores=tuple(raw_scores),
            top_k=top,
            entropy=TruthDistribution.shannon_entropy(probabilities),
            oracle_agreement=weighted_agreement,
            contradiction_markers=tuple(contradiction_markers),
            normalization=normalization,
            provenance={
                "bundle_id": view.base_bundle.bundle_id,
                "null_dimension_id": view.null_dimension_id,
                "oracle_stack": oracle_stack.identity,
                "transformation": dict(view.transformation_provenance),
                "kernel": "statevector_grover_reference",
                "substrate_id": self.substrate_id,
                "declared_substrate_target": view.substrate_target,
                "state_count": state_count,
                "grover_iterations": self.iterations,
                "phase_scale": self.phase_scale,
                "phase_policy": "phase_scale_times_score_over_view_max_score",
                "native_qpu": False,
                "quantum_advantage_claim": False,
            },
        )
