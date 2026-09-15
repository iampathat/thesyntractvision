from __future__ import annotations

from dataclasses import dataclass
from itertools import combinations

from .types import BindResult


@dataclass(frozen=True)
class ExclusionRequest:
    excluded_dimensions: tuple[str, ...]
    reason: str
    priority: float


class AdaptiveRotationPlanner:
    """4.2I targeted higher-order exclusion planner."""

    def __init__(self, *, influence_threshold: float = 0.08, pair_limit: int = 3) -> None:
        self.influence_threshold = influence_threshold
        self.pair_limit = pair_limit

    def plan(self, bound: BindResult) -> tuple[ExclusionRequest, ...]:
        ranked = sorted(bound.dimension_influence.items(), key=lambda x: x[1], reverse=True)
        hot = [d for d, score in ranked if score >= self.influence_threshold]
        requests: list[ExclusionRequest] = []
        for dim in hot:
            requests.append(
                ExclusionRequest(
                    excluded_dimensions=(dim,),
                    reason="high first-order dimension influence",
                    priority=bound.dimension_influence[dim],
                )
            )
        for a, b in list(combinations(hot, 2))[: self.pair_limit]:
            requests.append(
                ExclusionRequest(
                    excluded_dimensions=(a, b),
                    reason="targeted second-order interaction check",
                    priority=(bound.dimension_influence[a] + bound.dimension_influence[b]) / 2,
                )
            )
        if bound.contradictions and not requests and ranked:
            dim, score = ranked[0]
            requests.append(
                ExclusionRequest(
                    excluded_dimensions=(dim,),
                    reason="unresolved contradiction",
                    priority=score,
                )
            )
        return tuple(sorted(requests, key=lambda r: r.priority, reverse=True))
