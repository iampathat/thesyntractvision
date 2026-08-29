from __future__ import annotations

from typing import Mapping

from qcds_fabric.models import TruthDistribution


def compare_truth_distributions(
    reference: TruthDistribution,
    candidate: TruthDistribution,
) -> Mapping[str, object]:
    if reference.support != candidate.support:
        raise ValueError("distribution comparison requires identical support ordering")
    deltas = [abs(a - b) for a, b in zip(reference.probabilities, candidate.probabilities)]
    total_variation = 0.5 * sum(deltas)
    ref_top = reference.support[max(range(len(reference.probabilities)), key=reference.probabilities.__getitem__)]
    cand_top = candidate.support[max(range(len(candidate.probabilities)), key=candidate.probabilities.__getitem__)]
    return {
        "same_support": True,
        "state_count": len(reference.support),
        "total_variation_distance": total_variation,
        "max_probability_delta": max(deltas, default=0.0),
        "entropy_delta": candidate.entropy - reference.entropy,
        "oracle_agreement_delta": candidate.oracle_agreement - reference.oracle_agreement,
        "same_top_state": ref_top == cand_top,
        "reference_top_state": list(ref_top),
        "candidate_top_state": list(cand_top),
    }


__all__ = ["compare_truth_distributions"]
