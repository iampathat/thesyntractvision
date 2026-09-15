from __future__ import annotations

from .grover import run_grover
from .types import BindResult, ParentResult


def _next_power_of_two(n: int) -> int:
    if n <= 1:
        return 1
    return 1 << (n - 1).bit_length()


class ParentInferenceEngine:
    """4.2D higher-order parent inference over bound child structure.

    The parent does not count child votes. It builds candidates from the bound
    distribution, maps those structures into a fresh executable parent space,
    and amplifies parent candidates that survive a declared score threshold.
    """

    def __init__(self, *, max_candidates: int = 16, mark_ratio: float = 0.60, max_iterations: int = 40) -> None:
        if max_candidates < 2:
            raise ValueError("max_candidates must be >= 2")
        if not 0 < mark_ratio <= 1:
            raise ValueError("mark_ratio must lie in (0,1]")
        self.max_candidates = max_candidates
        self.mark_ratio = mark_ratio
        self.max_iterations = max_iterations

    def run(self, bound: BindResult) -> ParentResult:
        ranked = sorted(
            range(len(bound.canonical_probabilities)),
            key=bound.canonical_probabilities.__getitem__,
            reverse=True,
        )[: self.max_candidates]
        scores = tuple(bound.canonical_probabilities[s] for s in ranked)
        parent_n = _next_power_of_two(len(ranked))
        top_score = scores[0]
        marked_indices = frozenset(
            idx for idx, score in enumerate(scores) if score >= top_score * self.mark_ratio
        )
        # Padding states are never marked. The mapping remains explicit.
        grover = run_grover(parent_n, marked_indices, max_iterations=self.max_iterations)
        return ParentResult(
            candidate_states=tuple(ranked),
            candidate_scores=scores,
            state_index_to_canonical={i: state for i, state in enumerate(ranked)},
            marked_parent_states=marked_indices,
            grover=grover,
            source_top_state=bound.top_state,
            provenance={
                "parent_state_count": parent_n,
                "candidate_count": len(ranked),
                "mark_ratio": self.mark_ratio,
                "child_full_distribution_consumed": True,
                "child_top_probability": bound.top_probability,
            },
        )
