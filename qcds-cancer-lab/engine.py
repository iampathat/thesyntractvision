from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Dict, Iterable, List, Optional, Sequence, Tuple
from itertools import product
import math
import random

Bit = str  # '0' | '1' | '?'


def validate_mask(mask: str, n: Optional[int] = None) -> str:
    if n is not None and len(mask) != n:
        raise ValueError(f"mask length {len(mask)} != {n}")
    bad = set(mask) - {"0", "1", "?"}
    if bad:
        raise ValueError(f"invalid mask symbols: {sorted(bad)}")
    return mask


def expand_mask(mask: str) -> List[str]:
    """Expand only true unknowns. A complete mask such as 0110 is one valid state."""
    validate_mask(mask)
    slots = [i for i, b in enumerate(mask) if b == "?"]
    if not slots:
        return [mask]
    out: List[str] = []
    for vals in product("01", repeat=len(slots)):
        chars = list(mask)
        for i, v in zip(slots, vals):
            chars[i] = v
        out.append("".join(chars))
    return out


def mask_matches(state: str, mask: str, excluded: Optional[Iterable[int]] = None) -> bool:
    ex = set(excluded or ())
    validate_mask(mask, len(state))
    return all(i in ex or m == "?" or state[i] == m for i, m in enumerate(mask))


@dataclass(frozen=True)
class Oracle:
    name: str
    mask: str
    weight: float = 1.0
    provenance: str = "human/domain"
    generation: int = 0
    hard: bool = False

    def __post_init__(self):
        validate_mask(self.mask)
        if self.weight <= 0:
            raise ValueError("oracle weight must be > 0")

    def score(self, state: str, excluded: Optional[Iterable[int]] = None) -> float:
        return self.weight if mask_matches(state, self.mask, excluded) else 0.0


@dataclass
class Syntract:
    dimensions: List[str]
    logic: str
    oracles: List[Oracle]
    name: str = "cancer"
    depth: int = 0

    def __post_init__(self):
        validate_mask(self.logic, len(self.dimensions))
        for o in self.oracles:
            validate_mask(o.mask, len(self.dimensions))

    @property
    def unknowns(self) -> int:
        return self.logic.count("?")

    @property
    def compatible_state_count(self) -> int:
        return 1 << self.unknowns


@dataclass
class KernelConfig:
    shots: int = 4096
    max_grover_iters: int = 40
    mark_tolerance: float = 0.0
    physical_bitflip: Tuple[float, ...] = (0.008, 0.012, 0.009, 0.015, 0.010, 0.013, 0.011, 0.014)
    seed: int = 173


@dataclass
class BranchResult:
    excluded_dimension: int
    rotation: int
    perspective: int
    marked_count: int
    grover_iters: int
    distribution: Dict[str, float]
    top_state: str
    top_p: float


@dataclass
class FamilyResult:
    excluded_dimension: int
    distribution: Dict[str, float]
    top_state: str
    top_p: float
    stability: float


@dataclass
class RoundResult:
    depth: int
    input_logic: str
    unknowns: int
    state_count: int
    baseline_top: str
    baseline_p: float
    families: List[FamilyResult]
    consensus_distribution: Dict[str, float]
    consensus_top: str
    consensus_p: float
    derived_logic: str
    dimension_influence: Dict[str, float]
    added_oracle: Optional[Oracle] = None


@dataclass
class RunResult:
    syntract_name: str
    dimensions: List[str]
    rounds: List[RoundResult]
    final_state: str
    final_p: float
    final_logic: str
    final_oracles: List[Oracle]

    def to_dict(self) -> dict:
        return asdict(self)


class QuantumLikeKernel:
    """Small exact amplitude-amplification emulator for the bounded logical subspace.

    This is deliberately not presented as real quantum execution. It emulates the
    phase-oracle + diffusion structure and then applies a reproducible physical-qubit
    bit-flip model after rotating logical dimensions onto physical positions.
    """

    def __init__(self, config: KernelConfig):
        self.cfg = config

    def _oracle_scores(self, states: Sequence[str], oracles: Sequence[Oracle], excluded: Sequence[int]) -> Dict[str, float]:
        scores: Dict[str, float] = {}
        for s in states:
            score = 0.0
            hard_ok = True
            for o in oracles:
                m = mask_matches(s, o.mask, excluded)
                if o.hard and not m:
                    hard_ok = False
                    break
                if m:
                    score += o.weight
            scores[s] = score if hard_ok else -math.inf
        return scores

    def _mark(self, states: Sequence[str], scores: Dict[str, float]) -> List[str]:
        finite = [scores[s] for s in states if math.isfinite(scores[s])]
        if not finite:
            return []
        best = max(finite)
        threshold = best - self.cfg.mark_tolerance
        return [s for s in states if math.isfinite(scores[s]) and scores[s] >= threshold]

    @staticmethod
    def _ideal_amplify(states: Sequence[str], marked: Sequence[str], max_iters: int) -> Tuple[Dict[str, float], int]:
        n = len(states)
        if n == 0:
            return {}, 0
        marked_set = set(marked)
        if not marked_set or len(marked_set) == n:
            p = 1.0 / n
            return {s: p for s in states}, 0
        # Standard amplitude amplification inside the compatible subspace.
        m = max(1, min(max_iters, int(round((math.pi / 4.0) * math.sqrt(n / len(marked_set)) - 0.5))))
        amp = {s: 1 / math.sqrt(n) for s in states}
        for _ in range(m):
            for s in marked_set:
                amp[s] *= -1
            mean = sum(amp.values()) / n
            for s in states:
                amp[s] = 2 * mean - amp[s]
        probs = {s: float((a.real * a.real) + (a.imag * a.imag)) for s, a in amp.items()}
        z = sum(probs.values()) or 1.0
        return {s: p / z for s, p in probs.items()}, m

    def _physical_noise(self, distribution: Dict[str, float], rotation: int, branch_seed: int) -> Dict[str, float]:
        if not distribution or self.cfg.shots <= 0:
            return distribution
        states = list(distribution)
        weights = [distribution[s] for s in states]
        rng = random.Random(branch_seed)
        n = len(states[0])
        errs = self.cfg.physical_bitflip
        counts: Dict[str, int] = {}
        for _ in range(self.cfg.shots):
            logical = list(rng.choices(states, weights=weights, k=1)[0])
            # logical i -> physical (i + rotation) % n; noise happens physically.
            for logical_i in range(n):
                physical_i = (logical_i + rotation) % n
                e = errs[physical_i % len(errs)]
                if rng.random() < e:
                    logical[logical_i] = "1" if logical[logical_i] == "0" else "0"
            s = "".join(logical)
            counts[s] = counts.get(s, 0) + 1
        total = sum(counts.values()) or 1
        return {s: c / total for s, c in counts.items()}

    def run(self, syntract: Syntract, excluded_dimension: Optional[int], rotation: int, perspective: int, seed_offset: int = 0) -> BranchResult:
        logic = list(syntract.logic)
        excluded: List[int] = []
        if excluded_dimension is not None:
            excluded = [excluded_dimension]
            logic[excluded_dimension] = "?"  # remove that dimension's conditioning effect in this branch
        states = expand_mask("".join(logic))
        scores = self._oracle_scores(states, syntract.oracles, excluded)
        marked = self._mark(states, scores)
        ideal, m = self._ideal_amplify(states, marked, self.cfg.max_grover_iters)
        noisy = self._physical_noise(
            ideal,
            rotation=rotation,
            branch_seed=self.cfg.seed + seed_offset + syntract.depth * 100_000 + (excluded_dimension or 0) * 10_000 + rotation * 100 + perspective,
        )
        top_state, top_p = max(noisy.items(), key=lambda kv: kv[1]) if noisy else ("", 0.0)
        return BranchResult(
            excluded_dimension=-1 if excluded_dimension is None else excluded_dimension,
            rotation=rotation,
            perspective=perspective,
            marked_count=len(marked),
            grover_iters=m,
            distribution=noisy,
            top_state=top_state,
            top_p=top_p,
        )


class QCDSCancerEngine:
    def __init__(self, config: Optional[KernelConfig] = None, parallel_branches: int = 128, funnel_width: int = 8, recursion_depth: int = 4):
        self.config = config or KernelConfig()
        self.parallel_branches = parallel_branches
        self.funnel_width = funnel_width
        self.recursion_depth = recursion_depth
        self.kernel = QuantumLikeKernel(self.config)

    @staticmethod
    def _mean_distributions(dists: Sequence[Dict[str, float]]) -> Dict[str, float]:
        if not dists:
            return {}
        keys = set().union(*[set(d) for d in dists])
        out = {k: sum(d.get(k, 0.0) for d in dists) / len(dists) for k in keys}
        z = sum(out.values()) or 1.0
        return {k: v / z for k, v in out.items()}

    @staticmethod
    def _family_stability(branches: Sequence[BranchResult]) -> float:
        if not branches:
            return 0.0
        counts: Dict[str, int] = {}
        for b in branches:
            counts[b.top_state] = counts.get(b.top_state, 0) + 1
        return max(counts.values()) / len(branches)

    @staticmethod
    def _derive_logic(distribution: Dict[str, float], n: int, top_k: int = 8, bind_threshold: float = 0.875) -> str:
        if not distribution:
            return "?" * n
        top = sorted(distribution.items(), key=lambda kv: kv[1], reverse=True)[:max(1, min(top_k, len(distribution)))]
        total = sum(p for _, p in top) or 1.0
        chars: List[str] = []
        for i in range(n):
            p1 = sum(p for s, p in top if s[i] == "1") / total
            if p1 >= bind_threshold:
                chars.append("1")
            elif p1 <= 1.0 - bind_threshold:
                chars.append("0")
            else:
                chars.append("?")
        return "".join(chars)

    @staticmethod
    def _tv(a: Dict[str, float], b: Dict[str, float]) -> float:
        keys = set(a) | set(b)
        return 0.5 * sum(abs(a.get(k, 0.0) - b.get(k, 0.0)) for k in keys)

    def _run_round(self, syntract: Syntract) -> RoundResult:
        n = len(syntract.dimensions)
        # Baseline calibration: no dimension removed, rotated across physical positions.
        baseline_branches = [self.kernel.run(syntract, None, rotation=r % n, perspective=r // n, seed_offset=700_000) for r in range(max(n, 16))]
        baseline = self._mean_distributions([b.distribution for b in baseline_branches])
        baseline_top, baseline_p = max(baseline.items(), key=lambda kv: kv[1]) if baseline else ("", 0.0)

        # 128 -> 8: each dimension has its own exclusion family. For n=8 and 128 branches: 16 rotated/perspective tests per family.
        branches_per_family = max(1, self.parallel_branches // n)
        families: List[FamilyResult] = []
        for dim in range(n):
            branches: List[BranchResult] = []
            for j in range(branches_per_family):
                rotation = j % n
                perspective = j // n
                branches.append(self.kernel.run(syntract, dim, rotation, perspective))
            fd = self._mean_distributions([b.distribution for b in branches])
            top_state, top_p = max(fd.items(), key=lambda kv: kv[1]) if fd else ("", 0.0)
            families.append(FamilyResult(dim, fd, top_state, top_p, self._family_stability(branches)))

        # 8 -> 1 consensus: a state must remain strong across dimension-removal families.
        consensus = self._mean_distributions([f.distribution for f in families])
        ctop, cp = max(consensus.items(), key=lambda kv: kv[1]) if consensus else ("", 0.0)
        derived_logic = self._derive_logic(consensus, n, top_k=self.funnel_width)
        influence = {
            syntract.dimensions[f.excluded_dimension]: self._tv(baseline, f.distribution)
            for f in families
        }
        return RoundResult(
            depth=syntract.depth,
            input_logic=syntract.logic,
            unknowns=syntract.unknowns,
            state_count=syntract.compatible_state_count,
            baseline_top=baseline_top,
            baseline_p=baseline_p,
            families=families,
            consensus_distribution=consensus,
            consensus_top=ctop,
            consensus_p=cp,
            derived_logic=derived_logic,
            dimension_influence=influence,
        )

    def run(self, syntract: Syntract) -> RunResult:
        current = Syntract(list(syntract.dimensions), syntract.logic, list(syntract.oracles), syntract.name, syntract.depth)
        rounds: List[RoundResult] = []
        last_top: Optional[str] = None
        stable_count = 0
        for depth in range(self.recursion_depth):
            current.depth = depth
            rr = self._run_round(current)
            # Recursive oracle growth: what survived the entire 128->8->1 funnel becomes a new oracle.
            derived = Oracle(
                name=f"recursive_consensus_d{depth}",
                mask=rr.derived_logic,
                weight=1.0 + 0.25 * depth,
                provenance="QCDS:128→8→1 consensus",
                generation=depth + 1,
                hard=False,
            )
            rr.added_oracle = derived
            rounds.append(rr)
            current.oracles.append(derived)
            current.logic = rr.derived_logic

            if rr.consensus_top == last_top:
                stable_count += 1
            else:
                stable_count = 0
            last_top = rr.consensus_top
            # A fully bound logic or repeated stable top state ends this pass.
            if "?" not in current.logic or stable_count >= 1:
                break

        final_round = rounds[-1]
        return RunResult(
            syntract_name=current.name,
            dimensions=current.dimensions,
            rounds=rounds,
            final_state=final_round.consensus_top,
            final_p=final_round.consensus_p,
            final_logic=current.logic,
            final_oracles=current.oracles,
        )
