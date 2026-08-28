from __future__ import annotations

from dataclasses import dataclass

from .models import ChannelView, TruthDistribution
from .oracles import OracleStack


@dataclass(frozen=True)
class ClassicalInferenceKernel:
    """Bounded classical reference kernel for the four-phase local pass.

    This is intentionally not a claim of quantum advantage. It preserves the
    local logical semantics needed for Fabric validation.
    """

    amplification_power: float = 1.0
    top_k: int = 8

    @property
    def substrate_id(self) -> str:
        return "classical"

    def __post_init__(self) -> None:
        if self.amplification_power <= 0:
            raise ValueError("amplification_power must be positive")
        if self.top_k <= 0:
            raise ValueError("top_k must be positive")

    def run(self, view: ChannelView, oracle_stack: OracleStack) -> TruthDistribution:
        support = view.candidate_states()
        raw_scores: list[float] = []
        agreements: list[float] = []
        for state in support:
            score, agreement = oracle_stack.score(view, state)
            raw_scores.append(score)
            agreements.append(agreement)

        amplified = [score ** self.amplification_power for score in raw_scores]
        total = sum(amplified)
        contradiction_markers: list[str] = []
        if total == 0.0:
            probabilities = [1.0 / len(support)] * len(support)
            normalization = "explicit_global_contradiction_uniform_fallback"
            contradiction_markers.append("all_candidate_states_rejected")
        else:
            probabilities = [score / total for score in amplified]
            normalization = "normalized_oracle_weight"

        ordering = sorted(range(len(support)), key=lambda i: probabilities[i], reverse=True)
        k = min(self.top_k, len(support))
        top = tuple(support[i] for i in ordering[:k])
        entropy = TruthDistribution.shannon_entropy(probabilities)
        weighted_agreement = sum(p * a for p, a in zip(probabilities, agreements))

        return TruthDistribution(
            support=support,
            probabilities=tuple(probabilities),
            raw_scores=tuple(raw_scores),
            top_k=top,
            entropy=entropy,
            oracle_agreement=weighted_agreement,
            contradiction_markers=tuple(contradiction_markers),
            normalization=normalization,
            provenance={
                "bundle_id": view.base_bundle.bundle_id,
                "null_dimension_id": view.null_dimension_id,
                "oracle_stack": oracle_stack.identity,
                "transformation": dict(view.transformation_provenance),
                "kernel": "classical_reference",
                "amplification_power": self.amplification_power,
            },
        )
