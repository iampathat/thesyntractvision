from __future__ import annotations

import math
from collections.abc import Sequence

from .bind import total_variation
from .types import BindResult, StabilityReport


def entropy_bits(p: tuple[float, ...]) -> float:
    return -sum(x * math.log2(x) for x in p if x > 0)


def topk(p: tuple[float, ...], k: int) -> frozenset[int]:
    return frozenset(sorted(range(len(p)), key=p.__getitem__, reverse=True)[:k])


def jaccard(a: frozenset[int], b: frozenset[int]) -> float:
    if not a and not b:
        return 1.0
    return len(a & b) / len(a | b)


class StabilityEngine:
    """4.2G multi-dimensional termination gate."""

    def __init__(
        self,
        *,
        window: int = 3,
        tvd_max: float = 0.03,
        entropy_delta_max: float = 0.05,
        topk_size: int = 8,
        topk_jaccard_min: float = 0.70,
        influence_delta_max: float = 0.05,
    ) -> None:
        if window < 2:
            raise ValueError("window must be >= 2")
        self.window = window
        self.tvd_max = tvd_max
        self.entropy_delta_max = entropy_delta_max
        self.topk_size = topk_size
        self.topk_jaccard_min = topk_jaccard_min
        self.influence_delta_max = influence_delta_max

    def evaluate(self, history: Sequence[BindResult]) -> StabilityReport:
        if len(history) < self.window:
            return StabilityReport(
                stable=False,
                comparisons=max(0, len(history) - 1),
                distribution_tvd_max=math.inf,
                entropy_delta_max=math.inf,
                top_identity_stable=False,
                topk_jaccard_min=0.0,
                influence_delta_max=math.inf,
                contradiction_count_stable=False,
                reasons=(f"need {self.window} cycles; have {len(history)}",),
            )
        recent = tuple(history[-self.window :])
        tvds: list[float] = []
        entropies: list[float] = []
        jac: list[float] = []
        influence_delta: list[float] = []
        for left, right in zip(recent, recent[1:]):
            tvds.append(total_variation(left.canonical_probabilities, right.canonical_probabilities))
            entropies.append(abs(entropy_bits(left.canonical_probabilities) - entropy_bits(right.canonical_probabilities)))
            jac.append(jaccard(topk(left.canonical_probabilities, self.topk_size), topk(right.canonical_probabilities, self.topk_size)))
            keys = set(left.dimension_influence) | set(right.dimension_influence)
            influence_delta.append(max((abs(left.dimension_influence.get(k, 0.0) - right.dimension_influence.get(k, 0.0)) for k in keys), default=0.0))

        top_stable = len({b.top_state for b in recent}) == 1
        contradiction_stable = len({len(b.contradictions) for b in recent}) == 1
        max_tvd = max(tvds, default=0.0)
        max_entropy = max(entropies, default=0.0)
        min_j = min(jac, default=1.0)
        max_influence = max(influence_delta, default=0.0)
        reasons: list[str] = []
        if max_tvd > self.tvd_max:
            reasons.append("distribution not stable")
        if max_entropy > self.entropy_delta_max:
            reasons.append("entropy not stable")
        if not top_stable:
            reasons.append("top identity not stable")
        if min_j < self.topk_jaccard_min:
            reasons.append("top-k not stable")
        if max_influence > self.influence_delta_max:
            reasons.append("dimension influence not stable")
        if not contradiction_stable:
            reasons.append("contradiction structure not stable")
        return StabilityReport(
            stable=not reasons,
            comparisons=len(recent) - 1,
            distribution_tvd_max=max_tvd,
            entropy_delta_max=max_entropy,
            top_identity_stable=top_stable,
            topk_jaccard_min=min_j,
            influence_delta_max=max_influence,
            contradiction_count_stable=contradiction_stable,
            reasons=tuple(reasons),
        )
