from __future__ import annotations

import math
from collections import Counter
from typing import Iterable

from .rotation import RotationalIngressCell
from .types import BindResult, LaneResult, RotationalView


def canonical_state(assignment: dict[str, int], canonical_dims: tuple[str, ...]) -> int:
    state = 0
    for bit, dim in enumerate(canonical_dims):
        state |= assignment[dim] << bit
    return state


def lift_lane_distribution(view: RotationalView, probabilities: tuple[float, ...]) -> tuple[float, ...]:
    """Lift N-1 distribution into canonical N-space without inventing the null bit."""
    if len(probabilities) != view.state_count:
        raise ValueError("Distribution length does not match lane state space")
    out = [0.0] * (1 << len(view.canonical_dimensions))
    for local_state, p in enumerate(probabilities):
        active = RotationalIngressCell.decode_local_state(view, local_state)
        for missing in (0, 1):
            assignment = dict(active)
            assignment[view.excluded_dimension] = missing
            out[canonical_state(assignment, view.canonical_dimensions)] += p * 0.5
    return tuple(out)


def total_variation(p: tuple[float, ...], q: tuple[float, ...]) -> float:
    if len(p) != len(q):
        raise ValueError("Distributions must share support")
    return 0.5 * sum(abs(a - b) for a, b in zip(p, q, strict=True))


class RotationalSyntractBind:
    """Full-distribution binder; deliberately not a lane-majority vote."""

    def __init__(
        self,
        *,
        epsilon: float = 1e-15,
        stable_ratio: float = 0.30,
        shell_ratio: float = 0.05,
    ) -> None:
        self.epsilon = epsilon
        self.stable_ratio = stable_ratio
        self.shell_ratio = shell_ratio

    def bind(self, lanes: Iterable[LaneResult]) -> BindResult:
        lane_list = tuple(lanes)
        if not lane_list:
            raise ValueError("Need at least one lane")
        dims = lane_list[0].view.canonical_dimensions
        if any(l.view.canonical_dimensions != dims for l in lane_list):
            raise ValueError("All lanes must share canonical semantic space")

        lifted = [lift_lane_distribution(l.view, l.grover.probabilities) for l in lane_list]
        width = len(lifted[0])
        log_scores = [0.0] * width
        for dist in lifted:
            for idx, p in enumerate(dist):
                log_scores[idx] += math.log(max(p, self.epsilon))
        log_scores = [s / len(lifted) for s in log_scores]
        shift = max(log_scores)
        raw = [math.exp(s - shift) for s in log_scores]
        z = sum(raw)
        consensus = tuple(v / z for v in raw)
        top_state = max(range(width), key=consensus.__getitem__)
        top_p = consensus[top_state]

        influence: dict[str, float] = {}
        necessity: dict[str, float] = {}
        lane_top: dict[int, int] = {}
        for lane, dist in zip(lane_list, lifted, strict=True):
            dim = lane.view.excluded_dimension
            tvd = total_variation(dist, consensus)
            influence[dim] = tvd
            # Necessity is separated from raw influence. If exclusion destroys
            # the bound top state's support relative to consensus, the dimension
            # is more likely necessary than merely orientation-sensitive.
            necessity[dim] = max(0.0, top_p - dist[top_state])
            lane_top[lane.view.lane_id] = max(range(width), key=dist.__getitem__)

        stable_core = tuple(i for i, p in enumerate(consensus) if p >= top_p * self.stable_ratio)
        sensitive_shell = tuple(
            i for i, p in enumerate(consensus)
            if top_p * self.shell_ratio <= p < top_p * self.stable_ratio
        )
        sensitive_dims = tuple(sorted(influence, key=influence.__getitem__, reverse=True))

        counts = Counter(lane_top.values())
        contradictions: list[str] = []
        if len(counts) > 1:
            contradictions.append(
                "complementary views disagree on lifted top state: "
                + ", ".join(f"{state}:{count}" for state, count in counts.most_common())
            )

        return BindResult(
            canonical_probabilities=consensus,
            top_state=top_state,
            top_probability=top_p,
            dimension_influence=influence,
            dimensional_necessity=necessity,
            lane_top_states=lane_top,
            stable_core=stable_core,
            sensitive_shell=sensitive_shell,
            sensitive_dimensions=sensitive_dims,
            contradictions=tuple(contradictions),
            provenance={
                "bank_ids": tuple(sorted({l.view.bank_id for l in lane_list})),
                "lane_count": len(lane_list),
                "oracle_versions": tuple(sorted({str(l.metadata.get('oracle_version', 'unknown')) for l in lane_list})),
                "full_distributions_preserved": True,
                "binder": "logarithmic-opinion-pool",
            },
        )
