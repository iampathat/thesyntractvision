from __future__ import annotations

"""QCDS Cancer Lab engine.

This module is an orchestration layer around the canonical QCDS Fabric 4.2
primitives already present in this repository. It deliberately does NOT carry
an independent "consensus" algorithm or a separate Grover approximation.

Latest Cancer-Lab topology:

    Condition (0/1/?)
      -> top-down cancer oracle set
      -> 16 balanced rotation banks x 8 true-null lanes = 128 QCDS lanes
      -> exact canonical Grover in every lane
      -> 128 -> 8 Rotational Syntract family binds
      -> 8 -> 1 higher-order Syntract bind
      -> fresh Parent Grover
      -> parent-marked structure becomes the recursive oracle
      -> rotate again / repeat until the canonical stability gate or max cycle

The 0/1/? input is a Condition. True rotational exclusion remains null/absence
inside a lane and is never implemented by turning a fixed input bit into '?'.
"""

from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable, Sequence
import math
import sys

ROOT = Path(__file__).resolve().parents[1]
FABRIC_SRC = ROOT / "qcds_fabric_4_2" / "src"
if str(FABRIC_SRC) not in sys.path:
    sys.path.insert(0, str(FABRIC_SRC))

from qcds_fabric_4_2.bind import RotationalSyntractBind, total_variation
from qcds_fabric_4_2.grover import run_grover
from qcds_fabric_4_2.rotation import RotationalIngressCell
from qcds_fabric_4_2.stability import StabilityEngine
from qcds_fabric_4_2.types import BindResult, LaneResult, ParentResult

DIMENSIONS = (
    "mutation_load",
    "dna_repair_state",
    "growth_signal",
    "apoptosis_escape",
    "immune_evasion",
    "drug_target_engagement",
    "resistance_state",
    "cell_process_state",
)

MAX_GROVER_ITERS = 40
ROTATION_BANKS = 16
LANES_PER_BANK = 8
PARALLEL_LANES = ROTATION_BANKS * LANES_PER_BANK
PARENT_MAX_CANDIDATES = 8
PARENT_MARK_RATIO = 0.60


def validate_mask(mask: str) -> str:
    if len(mask) != len(DIMENSIONS):
        raise ValueError(f"mask must contain exactly {len(DIMENSIONS)} symbols")
    bad = set(mask) - {"0", "1", "?"}
    if bad:
        raise ValueError(f"invalid mask symbols: {sorted(bad)}")
    return mask


def state_to_semantic_bits(state: int) -> str:
    """Return bits in DIMENSIONS order (dimension 0 first), not MSB display order."""
    return "".join(str((state >> i) & 1) for i in range(len(DIMENSIONS)))


def semantic_bits_to_state(bits: str) -> int:
    validate_mask(bits)
    if "?" in bits:
        raise ValueError("state bits must be fully bound")
    out = 0
    for i, bit in enumerate(bits):
        out |= int(bit) << i
    return out


def state_matches_mask(state: int, mask: str) -> bool:
    validate_mask(mask)
    return all(m == "?" or ((state >> i) & 1) == int(m) for i, m in enumerate(mask))


@dataclass(frozen=True)
class CancerHypothesis:
    name: str
    mask: str
    provenance: str = "top-down cancer hypothesis"

    def __post_init__(self) -> None:
        validate_mask(self.mask)

    @property
    def required_dimensions(self) -> frozenset[str]:
        return frozenset(DIMENSIONS[i] for i, b in enumerate(self.mask) if b != "?")

    def matches_assignment(self, assignment: dict[str, int]) -> bool:
        for i, bit in enumerate(self.mask):
            if bit == "?":
                continue
            dim = DIMENSIONS[i]
            if dim not in assignment or assignment[dim] != int(bit):
                return False
        return True


DEFAULT_HYPOTHESES = (
    CancerHypothesis("dna_repair", "11??0???", "legacy cancer hypothesis"),
    CancerHypothesis("pi3k_axis", "??1?1???", "legacy cancer hypothesis"),
    CancerHypothesis("receptor_axis", "???111??", "legacy cancer hypothesis"),
    CancerHypothesis("hr_plus_broad", "1??1????", "legacy cancer hypothesis"),
    CancerHypothesis("pi3k_hr_combo", "??11????", "legacy cancer hypothesis"),
)


@dataclass
class CycleResult:
    cycle: int
    lane_count: int
    family_count: int
    grover_min: int
    grover_max: int
    marked_min: int
    marked_max: int
    bind_top_state: str
    bind_top_probability: float
    parent_top_state: str
    parent_top_probability: float
    parent_iterations: int
    parent_marked_count: int
    derived_logic: str
    dimension_influence: dict[str, float]
    stable: bool
    stability_reasons: tuple[str, ...]


@dataclass
class CancerRunResult:
    input_logic: str
    cycles: list[CycleResult]
    final_state: str
    final_probability: float
    final_logic: str
    final_distribution: dict[str, float]
    parallel_lanes_per_cycle: int = PARALLEL_LANES
    exclusion_families: int = LANES_PER_BANK
    max_grover_iterations: int = MAX_GROVER_ITERS

    def to_dict(self) -> dict:
        return asdict(self)


class CancerOracleCompiler:
    """Compile Condition + union-of-hypotheses + recursive parent structure.

    Hard 0/1 input conditions are conjunctive.
    Candidate cancer hypotheses are alternative top-down oracles (union/OR).
    A hypothesis that requires a nulled dimension is inactive in that lane.
    A recursive parent oracle is an additional conjunctive restriction built
    from the parent-marked canonical states of the preceding cycle.
    """

    def __init__(
        self,
        input_logic: str,
        hypotheses: Sequence[CancerHypothesis],
        recursive_states: frozenset[int] | None,
    ) -> None:
        self.input_logic = validate_mask(input_logic)
        self.hypotheses = tuple(hypotheses)
        self.recursive_states = recursive_states

    def compile(self, view) -> frozenset[int]:
        active_set = frozenset(view.active_dimensions)
        active_hypotheses = tuple(
            h for h in self.hypotheses if h.required_dimensions <= active_set
        )

        marked: set[int] = set()
        for local_state in range(view.state_count):
            assignment = RotationalIngressCell.decode_local_state(view, local_state)

            hard_ok = True
            for i, bit in enumerate(self.input_logic):
                if bit == "?":
                    continue
                dim = DIMENSIONS[i]
                if dim in active_set and assignment[dim] != int(bit):
                    hard_ok = False
                    break
            if not hard_ok:
                continue

            hypothesis_ok = (
                True if not active_hypotheses
                else any(h.matches_assignment(assignment) for h in active_hypotheses)
            )
            if not hypothesis_ok:
                continue

            if self.recursive_states:
                recursive_ok = False
                for canonical_state in self.recursive_states:
                    if all(
                        assignment[dim] == ((canonical_state >> DIMENSIONS.index(dim)) & 1)
                        for dim in view.active_dimensions
                    ):
                        recursive_ok = True
                        break
                if not recursive_ok:
                    continue

            marked.add(local_state)
        return frozenset(marked)


def _full_distribution_bind(distributions: Sequence[tuple[float, ...]], *, epsilon: float = 1e-15) -> tuple[float, ...]:
    """The same logarithmic opinion-pool operator used by RotationalSyntractBind.

    This is the higher-order 8 -> 1 Syntract bind. No mean/majority consensus is
    used here.
    """
    if not distributions:
        raise ValueError("need at least one distribution to bind")
    width = len(distributions[0])
    if any(len(d) != width for d in distributions):
        raise ValueError("all bound distributions must share canonical support")

    log_scores = [0.0] * width
    for dist in distributions:
        for idx, p in enumerate(dist):
            log_scores[idx] += math.log(max(p, epsilon))
    log_scores = [s / len(distributions) for s in log_scores]
    shift = max(log_scores)
    raw = [math.exp(s - shift) for s in log_scores]
    z = sum(raw) or 1.0
    return tuple(v / z for v in raw)


def _condition_on_input(distribution: tuple[float, ...], input_logic: str) -> tuple[float, ...]:
    """Re-bind the global Condition after diagnostic null views are recombined."""
    raw = [p if state_matches_mask(i, input_logic) else 0.0 for i, p in enumerate(distribution)]
    z = sum(raw)
    if z <= 0:
        raise RuntimeError("QCDS bind produced no support compatible with the input Condition")
    return tuple(p / z for p in raw)


def _make_bind_result(
    distribution: tuple[float, ...],
    family_distributions: Sequence[tuple[float, ...]],
    contradictions: tuple[str, ...],
    provenance: dict[str, object],
) -> BindResult:
    top_state = max(range(len(distribution)), key=distribution.__getitem__)
    top_p = distribution[top_state]
    influence = {
        DIMENSIONS[i]: total_variation(family_distributions[i], distribution)
        for i in range(len(DIMENSIONS))
    }
    stable_core = tuple(i for i, p in enumerate(distribution) if p >= top_p * 0.30)
    sensitive_shell = tuple(i for i, p in enumerate(distribution) if top_p * 0.05 <= p < top_p * 0.30)
    sensitive_dims = tuple(sorted(influence, key=influence.__getitem__, reverse=True))
    return BindResult(
        canonical_probabilities=distribution,
        top_state=top_state,
        top_probability=top_p,
        dimension_influence=influence,
        dimensional_necessity={d: 0.0 for d in DIMENSIONS},
        lane_top_states={},
        stable_core=stable_core,
        sensitive_shell=sensitive_shell,
        sensitive_dimensions=sensitive_dims,
        contradictions=contradictions,
        provenance=provenance,
    )


def _next_power_of_two(n: int) -> int:
    if n <= 1:
        return 1
    return 1 << (n - 1).bit_length()


def _parent_grover(bound: BindResult, input_logic: str) -> tuple[ParentResult, dict[int, float]]:
    """Fresh executable parent inference, using canonical run_grover()."""
    compatible = [
        s for s, p in enumerate(bound.canonical_probabilities)
        if p > 0.0 and state_matches_mask(s, input_logic)
    ]
    ranked = sorted(
        compatible,
        key=bound.canonical_probabilities.__getitem__,
        reverse=True,
    )[:PARENT_MAX_CANDIDATES]
    if not ranked:
        raise RuntimeError("no compatible parent candidates")

    scores = tuple(bound.canonical_probabilities[s] for s in ranked)
    parent_n = _next_power_of_two(len(ranked))
    top_score = scores[0]
    marked = frozenset(i for i, score in enumerate(scores) if score >= top_score * PARENT_MARK_RATIO)
    grover = run_grover(
        parent_n,
        marked,
        max_iterations=MAX_GROVER_ITERS,
    )
    index_to_canonical = {i: state for i, state in enumerate(ranked)}
    mapped = {
        index_to_canonical[i]: grover.probabilities[i]
        for i in index_to_canonical
    }
    parent = ParentResult(
        candidate_states=tuple(ranked),
        candidate_scores=scores,
        state_index_to_canonical=index_to_canonical,
        marked_parent_states=marked,
        grover=grover,
        source_top_state=bound.top_state,
        provenance={
            "parent_state_count": parent_n,
            "candidate_count": len(ranked),
            "mark_ratio": PARENT_MARK_RATIO,
            "child_full_distribution_consumed": True,
        },
    )
    return parent, mapped


def _logic_from_states(states: Iterable[int], fallback: str) -> str:
    states = tuple(states)
    if not states:
        return fallback
    bits: list[str] = []
    for i in range(len(DIMENSIONS)):
        vals = {((s >> i) & 1) for s in states}
        bits.append(str(next(iter(vals))) if len(vals) == 1 else "?")
    return "".join(bits)


class QCDSCancerEngine:
    def __init__(
        self,
        *,
        rotation_banks: int = ROTATION_BANKS,
        max_cycles: int = 4,
        min_cycles: int = 2,
        max_grover_iterations: int = MAX_GROVER_ITERS,
    ) -> None:
        if rotation_banks < 1:
            raise ValueError("rotation_banks must be >= 1")
        if max_cycles < 1:
            raise ValueError("max_cycles must be >= 1")
        self.rotation_banks = rotation_banks
        self.max_cycles = max_cycles
        self.min_cycles = min(min_cycles, max_cycles)
        self.max_grover_iterations = max_grover_iterations
        self.ingress = RotationalIngressCell(DIMENSIONS)
        self.family_binder = RotationalSyntractBind()
        self.stability = StabilityEngine(window=3)

    def run(
        self,
        input_logic: str = "????????",
        hypotheses: Sequence[CancerHypothesis] = DEFAULT_HYPOTHESES,
    ) -> CancerRunResult:
        input_logic = validate_mask(input_logic)
        hypotheses = tuple(hypotheses)
        recursive_states: frozenset[int] | None = None
        history: list[BindResult] = []
        cycle_results: list[CycleResult] = []
        final_parent: ParentResult | None = None
        final_mapped: dict[int, float] = {}
        final_logic = input_logic

        for cycle in range(self.max_cycles):
            compiler = CancerOracleCompiler(input_logic, hypotheses, recursive_states)
            families: dict[str, list[LaneResult]] = {dim: [] for dim in DIMENSIONS}
            all_lanes: list[LaneResult] = []

            # 16 balanced banks x 8 true-null dimensions = 128 independent QCDS lanes.
            for bank in range(self.rotation_banks):
                bank_id = cycle + bank  # self-rotation across recursive cycles
                for view in self.ingress.build_bank(bank_id=bank_id):
                    marked = compiler.compile(view)
                    grover = run_grover(
                        view.state_count,
                        marked,
                        max_iterations=self.max_grover_iterations,
                    )
                    lane = LaneResult(
                        view=view,
                        grover=grover,
                        marked_states=marked,
                        inactive_clause_names=(),
                        metadata={
                            "cycle": cycle,
                            "bank_id": bank_id,
                            "oracle_version": f"cancer-oracle-v{cycle}",
                            "recursive_oracle": bool(recursive_states),
                        },
                    )
                    all_lanes.append(lane)
                    families[view.excluded_dimension].append(lane)

            # 128 -> 8: each exclusion family is bound from its complete lane distributions.
            family_binds = [self.family_binder.bind(families[dim]) for dim in DIMENSIONS]
            family_distributions = [b.canonical_probabilities for b in family_binds]

            # 8 -> 1: same Syntract-binding operator at the higher level.
            bound_distribution = _full_distribution_bind(family_distributions)
            bound_distribution = _condition_on_input(bound_distribution, input_logic)

            contradiction_msgs = tuple(
                msg
                for b in family_binds
                for msg in b.contradictions
            )
            bound = _make_bind_result(
                bound_distribution,
                family_distributions,
                contradiction_msgs,
                provenance={
                    "architecture": "QCDS Cancer 128->8->1",
                    "rotation_banks": self.rotation_banks,
                    "lane_count": len(all_lanes),
                    "family_count": len(family_binds),
                    "full_distributions_preserved": True,
                    "family_binder": "RotationalSyntractBind",
                    "higher_order_binder": "RotationalSyntractBind/logarithmic-opinion-pool",
                },
            )

            # Fresh sequential parent Grover: the 1 is an executable inference node.
            parent, mapped = _parent_grover(bound, input_logic)
            final_parent, final_mapped = parent, mapped

            # Parent-marked structures form the next recursive oracle.
            recursive_states = frozenset(
                parent.state_index_to_canonical[i]
                for i in parent.marked_parent_states
                if i in parent.state_index_to_canonical
            )
            final_logic = _logic_from_states(recursive_states, fallback=input_logic)

            history.append(bound)
            report = self.stability.evaluate(history)
            grover_iters = [lane.grover.iterations for lane in all_lanes]
            marked_counts = [lane.grover.marked_count for lane in all_lanes]
            parent_top = parent.state_index_to_canonical[parent.grover.top_state]

            cycle_results.append(
                CycleResult(
                    cycle=cycle,
                    lane_count=len(all_lanes),
                    family_count=len(family_binds),
                    grover_min=min(grover_iters),
                    grover_max=max(grover_iters),
                    marked_min=min(marked_counts),
                    marked_max=max(marked_counts),
                    bind_top_state=state_to_semantic_bits(bound.top_state),
                    bind_top_probability=bound.top_probability,
                    parent_top_state=state_to_semantic_bits(parent_top),
                    parent_top_probability=parent.grover.top_probability,
                    parent_iterations=parent.grover.iterations,
                    parent_marked_count=parent.grover.marked_count,
                    derived_logic=final_logic,
                    dimension_influence=dict(bound.dimension_influence),
                    stable=report.stable,
                    stability_reasons=report.reasons,
                )
            )

            if cycle + 1 >= self.min_cycles and report.stable:
                break

        if final_parent is None:
            raise RuntimeError("QCDS produced no parent inference")

        final_state_int = final_parent.state_index_to_canonical[final_parent.grover.top_state]
        for state, p in final_mapped.items():
            if p > 1e-12 and not state_matches_mask(state, input_logic):
                raise RuntimeError("QCDS invariant failed: output violated the input Condition")

        final_distribution = {
            state_to_semantic_bits(state): p
            for state, p in sorted(final_mapped.items(), key=lambda kv: kv[1], reverse=True)
            if p > 0
        }
        return CancerRunResult(
            input_logic=input_logic,
            cycles=cycle_results,
            final_state=state_to_semantic_bits(final_state_int),
            final_probability=final_parent.grover.top_probability,
            final_logic=final_logic,
            final_distribution=final_distribution,
            parallel_lanes_per_cycle=self.rotation_banks * LANES_PER_BANK,
        )
