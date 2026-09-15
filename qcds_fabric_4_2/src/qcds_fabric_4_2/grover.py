from __future__ import annotations

import math
from typing import Iterable

from .types import GroverRun


def grover_success_probability(state_count: int, marked_count: int, iterations: int) -> float:
    if state_count <= 0:
        raise ValueError("state_count must be positive")
    if not 0 < marked_count <= state_count:
        raise ValueError("marked_count must satisfy 1 <= M <= N")
    if iterations < 0:
        raise ValueError("iterations must be >= 0")
    theta = math.asin(math.sqrt(marked_count / state_count))
    return math.sin((2 * iterations + 1) * theta) ** 2


def peak_iteration_count(state_count: int, marked_count: int, *, max_iterations: int = 40) -> int:
    """Choose the best ideal amplitude peak in the declared finite range.

    The policy is explicitly not a fixed three-iteration rule. It uses only N,
    M and the declared iteration ceiling, never a hidden answer identity.
    """
    if max_iterations < 0:
        raise ValueError("max_iterations must be >= 0")
    if marked_count == state_count:
        return 0
    best_k = 0
    best_mass = -1.0
    for k in range(max_iterations + 1):
        mass = grover_success_probability(state_count, marked_count, k)
        if mass > best_mass + 1e-15:
            best_mass, best_k = mass, k
    return best_k


def iteration_envelope(state_count: int, marked_count: int, *, max_iterations: int = 40) -> tuple[float, ...]:
    return tuple(
        grover_success_probability(state_count, marked_count, k)
        for k in range(max_iterations + 1)
    )


def _entropy_bits(probabilities: Iterable[float]) -> float:
    return -sum(p * math.log2(p) for p in probabilities if p > 0.0)


def run_grover(
    state_count: int,
    marked_states: Iterable[int],
    *,
    iterations: int | None = None,
    max_iterations: int = 40,
) -> GroverRun:
    """Exact ideal local amplitude-amplification emulator."""
    if state_count <= 0 or state_count & (state_count - 1):
        raise ValueError("state_count must be a positive power of two")
    if max_iterations < 0:
        raise ValueError("max_iterations must be >= 0")
    marked = frozenset(marked_states)
    if any(s < 0 or s >= state_count for s in marked):
        raise ValueError("Marked state outside state space")
    if not marked:
        probs = tuple(1.0 / state_count for _ in range(state_count))
        return GroverRun(
            state_count=state_count,
            marked_count=0,
            iterations=0,
            probabilities=probs,
            marked_mass=0.0,
            entropy_bits=math.log2(state_count),
            top_state=0,
            top_probability=1.0 / state_count,
            max_iterations=max_iterations,
        )

    m = len(marked)
    if iterations is None:
        iterations = peak_iteration_count(state_count, m, max_iterations=max_iterations)
    if iterations < 0 or iterations > max_iterations:
        raise ValueError("iterations must lie inside the declared bounded range")

    amp = [1.0 / math.sqrt(state_count)] * state_count
    for _ in range(iterations):
        for idx in marked:
            amp[idx] = -amp[idx]
        mean = sum(amp) / state_count
        amp = [2.0 * mean - a for a in amp]
    raw = [a * a for a in amp]
    total = sum(raw)
    probs = tuple(p / total for p in raw)
    top_state = max(range(state_count), key=probs.__getitem__)
    return GroverRun(
        state_count=state_count,
        marked_count=m,
        iterations=iterations,
        probabilities=probs,
        marked_mass=sum(probs[i] for i in marked),
        entropy_bits=_entropy_bits(probs),
        top_state=top_state,
        top_probability=probs[top_state],
        max_iterations=max_iterations,
    )
