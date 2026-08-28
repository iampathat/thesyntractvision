from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from .metrics import normalized_lift
from .models import BaseBundle, StabilizedReturn, State, TruthDistribution


def _lift_null_distribution(bundle: BaseBundle, distribution: TruthDistribution, null_index: int) -> dict[State, float]:
    """Lift a B-1 dimensional null view back to canonical B coordinates.

    The absent binary dimension is marginalized: each null-view mass is split
    equally over its two possible canonical values. This preserves absence
    semantics rather than silently treating ∅ as either 0 or 1.
    """
    lifted: dict[State, float] = {}
    for state, probability in zip(distribution.support, distribution.probabilities):
        if state[null_index] != -1:
            raise ValueError("expected -1 sentinel at null dimension")
        for value in (0, 1):
            canonical = list(state)
            canonical[null_index] = value
            key = tuple(canonical)
            lifted[key] = lifted.get(key, 0.0) + probability / 2.0
    return lifted


@dataclass(frozen=True)
class DistributionStabilizer:
    top_k: int = 8

    def stabilize(
        self,
        bundle: BaseBundle,
        baseline: TruthDistribution,
        null_distributions: Iterable[tuple[int, TruthDistribution]],
        *,
        oracle_stack_identity: str,
    ) -> StabilizedReturn:
        nulls = list(null_distributions)
        if len(nulls) != bundle.width:
            raise ValueError("full core null bank requires one null distribution per dimension")
        if {index for index, _ in nulls} != set(range(bundle.width)):
            raise ValueError("null bank must cover every dimension exactly once")

        canonical_states = baseline.support
        aggregate = {state: 0.0 for state in canonical_states}
        influence: dict[str, dict[str, float]] = {}
        baseline_entropy = baseline.entropy
        baseline_lift = normalized_lift(baseline)
        contradiction_count = 0

        for null_index, distribution in nulls:
            lifted = _lift_null_distribution(bundle, distribution, null_index)
            for state in aggregate:
                aggregate[state] += lifted.get(state, 0.0) / len(nulls)
            influence[bundle.dimension_ids[null_index]] = {
                "entropy_delta": distribution.entropy - baseline_entropy,
                "lift_delta": normalized_lift(distribution) - baseline_lift,
                "agreement_delta": distribution.oracle_agreement - baseline.oracle_agreement,
            }
            contradiction_count += int(bool(distribution.contradiction_markers))

        probs = tuple(aggregate[state] for state in canonical_states)
        total = sum(probs)
        probs = tuple(p / total for p in probs)
        ordering = sorted(range(len(canonical_states)), key=lambda i: probs[i], reverse=True)
        top = tuple(canonical_states[i] for i in ordering[: min(self.top_k, len(canonical_states))])
        entropy = TruthDistribution.shannon_entropy(probs)

        stabilized = TruthDistribution(
            support=canonical_states,
            probabilities=probs,
            raw_scores=probs,
            top_k=top,
            entropy=entropy,
            oracle_agreement=sum(d.oracle_agreement for _, d in nulls) / len(nulls),
            contradiction_markers=tuple(marker for _, d in nulls for marker in d.contradiction_markers),
            normalization="mean_of_marginalized_null_views",
            provenance={
                "bundle_id": bundle.bundle_id,
                "oracle_stack": oracle_stack_identity,
                "stabilizer": "distribution_mean_v0",
                "views": bundle.width,
            },
        )

        return StabilizedReturn(
            stabilized_distribution=stabilized,
            per_dimension_influence=influence,
            rotation_sensitivity={"null_entropy_spread": max(d.entropy for _, d in nulls) - min(d.entropy for _, d in nulls)},
            retained_uncertainty=entropy,
            comparison_metrics={
                "baseline_entropy": baseline_entropy,
                "stabilized_entropy": entropy,
                "baseline_normalized_lift": baseline_lift,
                "null_contradiction_fraction": contradiction_count / len(nulls),
            },
            pruning_actions=(),
            provenance={
                "bundle_id": bundle.bundle_id,
                "oracle_stack": oracle_stack_identity,
                "full_dimension_null_coverage": True,
                "automatic_pruning": False,
            },
        )
