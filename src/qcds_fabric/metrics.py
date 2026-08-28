from __future__ import annotations

from math import log2
from typing import Mapping

from .models import State, TruthDistribution


def topk_jaccard(a: TruthDistribution, b: TruthDistribution) -> float:
    sa, sb = set(a.top_k), set(b.top_k)
    if not sa and not sb:
        return 1.0
    return len(sa & sb) / len(sa | sb)


def normalized_lift(distribution: TruthDistribution) -> float:
    if not distribution.probabilities:
        return 0.0
    baseline = 1.0 / len(distribution.probabilities)
    return max(distribution.probabilities) / baseline


def kl_divergence(p: Mapping[State, float], q: Mapping[State, float], epsilon: float = 1e-12) -> float:
    keys = set(p) | set(q)
    result = 0.0
    for key in keys:
        pv = max(p.get(key, 0.0), epsilon)
        qv = max(q.get(key, 0.0), epsilon)
        result += pv * log2(pv / qv)
    return result
