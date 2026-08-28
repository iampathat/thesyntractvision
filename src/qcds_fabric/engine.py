from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Sequence

from .fabric import FabricLayer, StabilizedRotationSuiteResult
from .funnel import BoundCondition, FunnelTrace, funnel_step, recursive_contraction_funnel
from .metrics import topk_jaccard
from .models import BaseBundle, Syntract, TruthDistribution
from .oracles import OracleStack
from .reentry import ReentryResult, run_bound_condition_reentry


@dataclass(frozen=True)
class ConvergenceConfig:
    """Explicit stopping policy for repeated QCDS Fabric re-entry.

    Convergence is a diagnostic condition, not a truth claim. A run is marked
    converged only when the selected distribution diagnostics remain inside the
    configured thresholds for ``patience`` consecutive comparisons.
    """

    max_cycles: int = 8
    min_cycles: int = 2
    patience: int = 2
    l1_tolerance: float = 1e-6
    entropy_tolerance: float = 1e-6
    topk_jaccard_threshold: float = 1.0
    peak_probability_tolerance: float = 1e-6
    max_reentry_width: int = 16
    include_positional: bool = False
    include_oracle_exposure: bool = False
    include_crossed: bool = False

    def __post_init__(self) -> None:
        if self.max_cycles <= 0:
            raise ValueError("max_cycles must be positive")
        if self.min_cycles <= 0 or self.min_cycles > self.max_cycles:
            raise ValueError("min_cycles must be in 1..max_cycles")
        if self.patience <= 0:
            raise ValueError("patience must be positive")
        if self.l1_tolerance < 0 or self.entropy_tolerance < 0 or self.peak_probability_tolerance < 0:
            raise ValueError("convergence tolerances must be non-negative")
        if not 0.0 <= self.topk_jaccard_threshold <= 1.0:
            raise ValueError("topk_jaccard_threshold must be in [0, 1]")
        if self.max_reentry_width <= 0:
            raise ValueError("max_reentry_width must be positive")


@dataclass(frozen=True)
class ConvergenceSnapshot:
    l1_distance: float
    entropy_delta: float
    topk_jaccard: float
    peak_probability_delta: float
    within_thresholds: bool


@dataclass(frozen=True)
class RecursiveCycleTrace:
    cycle_index: int
    input_condition: BoundCondition
    reentry: ReentryResult
    convergence: ConvergenceSnapshot | None
    provenance: Mapping[str, Any]


@dataclass(frozen=True)
class RecursiveFabricTrace:
    initial_suites: tuple[StabilizedRotationSuiteResult, ...]
    initial_funnel: FunnelTrace
    cycles: tuple[RecursiveCycleTrace, ...]
    funnel_widths: tuple[int, ...]
    config: ConvergenceConfig
    termination_reason: str
    converged: bool
    provenance: Mapping[str, Any]


@dataclass(frozen=True)
class RecursiveFabricResult:
    syntract: Syntract
    trace: RecursiveFabricTrace

    @property
    def converged(self) -> bool:
        return self.trace.converged


def automatic_contraction_widths(item_count: int) -> tuple[int, ...]:
    """Return a balanced contraction schedule ending in one item.

    Examples: 8 -> (4, 2, 1), 5 -> (3, 2, 1), 1 -> (1,).
    """
    if item_count <= 0:
        raise ValueError("item_count must be positive")
    widths: list[int] = []
    current = item_count
    while current > 1:
        current = (current + 1) // 2
        widths.append(current)
    if not widths:
        widths.append(1)
    return tuple(widths)


def compare_truth_distributions(
    previous: TruthDistribution,
    current: TruthDistribution,
    config: ConvergenceConfig,
) -> ConvergenceSnapshot:
    previous_map = dict(zip(previous.support, previous.probabilities))
    current_map = dict(zip(current.support, current.probabilities))
    keys = set(previous_map) | set(current_map)
    l1 = sum(abs(previous_map.get(key, 0.0) - current_map.get(key, 0.0)) for key in keys)
    entropy_delta = abs(previous.entropy - current.entropy)
    jaccard = topk_jaccard(previous, current)
    previous_peak = max(previous.probabilities, default=0.0)
    current_peak = max(current.probabilities, default=0.0)
    peak_delta = abs(previous_peak - current_peak)
    within = (
        l1 <= config.l1_tolerance
        and entropy_delta <= config.entropy_tolerance
        and jaccard >= config.topk_jaccard_threshold
        and peak_delta <= config.peak_probability_tolerance
    )
    return ConvergenceSnapshot(
        l1_distance=l1,
        entropy_delta=entropy_delta,
        topk_jaccard=jaccard,
        peak_probability_delta=peak_delta,
        within_thresholds=within,
    )


@dataclass(frozen=True)
class RecursiveFabricEngine:
    """BUILD 4 orchestration engine for bounded recursive QCDS Fabric execution.

    The engine automates the already-canonical topology. It does not change the
    QCDS Fabric v1.0 specification and does not interpret numerical convergence
    as external truth.
    """

    fabric_layer: FabricLayer = FabricLayer()
    config: ConvergenceConfig = ConvergenceConfig()

    def run(
        self,
        initial_bundles: Sequence[BaseBundle],
        oracle_stack: OracleStack,
        *,
        funnel_widths: Sequence[int] | None = None,
        syntract_id: str = "syntract:recursive-result",
    ) -> RecursiveFabricResult:
        bundles = tuple(initial_bundles)
        if not bundles:
            raise ValueError("initial_bundles cannot be empty")
        if len({bundle.bundle_id for bundle in bundles}) != len(bundles):
            raise ValueError("initial bundle ids must be unique")

        widths = tuple(funnel_widths) if funnel_widths is not None else automatic_contraction_widths(len(bundles))
        if not widths or widths[-1] != 1:
            raise ValueError("funnel_widths must end at 1 for recursive re-entry")

        initial_suites = tuple(
            self.fabric_layer.run_stabilized_rotation_suite(
                bundle,
                oracle_stack,
                include_positional=self.config.include_positional,
                include_oracle_exposure=self.config.include_oracle_exposure,
                include_crossed=self.config.include_crossed,
            )
            for bundle in bundles
        )
        initial_returns = tuple(suite.stabilized_return for suite in initial_suites)
        initial_funnel = recursive_contraction_funnel(initial_returns, widths)
        condition = initial_funnel.final_condition
        if condition is None:
            raise ValueError("contraction funnel must produce exactly one final BoundCondition")

        cycle_records: list[RecursiveCycleTrace] = []
        previous_distribution: TruthDistribution | None = None
        stable_comparisons = 0
        converged = False
        termination_reason = "max_cycles"

        for cycle_index in range(self.config.max_cycles):
            reentry = run_bound_condition_reentry(
                condition,
                max_width=self.config.max_reentry_width,
                include_positional=self.config.include_positional,
                include_oracle_exposure=self.config.include_oracle_exposure,
                include_crossed=self.config.include_crossed,
                fabric_layer=self.fabric_layer,
            )
            current_return = reentry.suite.stabilized_return
            current_distribution = current_return.stabilized_distribution
            convergence = None
            if previous_distribution is not None:
                convergence = compare_truth_distributions(previous_distribution, current_distribution, self.config)
                stable_comparisons = stable_comparisons + 1 if convergence.within_thresholds else 0

            cycle_records.append(
                RecursiveCycleTrace(
                    cycle_index=cycle_index,
                    input_condition=condition,
                    reentry=reentry,
                    convergence=convergence,
                    provenance={
                        "cycle_index": cycle_index,
                        "input_condition_id": condition.condition_id,
                        "compiled_width": reentry.compilation.bundle.width,
                        "oracle_stack": reentry.compilation.oracle_stack.identity,
                        "contradiction_markers": current_distribution.contradiction_markers,
                        "hard_collapse": False,
                    },
                )
            )

            executed_cycles = cycle_index + 1
            if (
                convergence is not None
                and executed_cycles >= self.config.min_cycles
                and stable_comparisons >= self.config.patience
            ):
                converged = True
                termination_reason = "converged"
                break

            previous_distribution = current_distribution
            condition = funnel_step(
                (current_return,),
                next_count=1,
                layer_id=f"R{executed_cycles}",
            ).conditions[0]

        if not cycle_records:
            raise RuntimeError("recursive engine produced no cycles")

        final_cycle = cycle_records[-1]
        final_return = final_cycle.reentry.suite.stabilized_return
        final_distribution = final_return.stabilized_distribution
        trace = RecursiveFabricTrace(
            initial_suites=initial_suites,
            initial_funnel=initial_funnel,
            cycles=tuple(cycle_records),
            funnel_widths=widths,
            config=self.config,
            termination_reason=termination_reason,
            converged=converged,
            provenance={
                "engine": "recursive_fabric_engine_v0",
                "initial_bundle_ids": tuple(bundle.bundle_id for bundle in bundles),
                "initial_oracle_stack": oracle_stack.identity,
                "initial_funnel_widths": widths,
                "cycle_count": len(cycle_records),
                "convergence_is_truth_claim": False,
                "canonical_spec_modified": False,
            },
        )
        syntract = Syntract(
            syntract_id=syntract_id,
            bound_distribution=final_distribution,
            evidence_provenance={
                "initial_bundle_ids": tuple(bundle.bundle_id for bundle in bundles),
                "initial_oracle_stack": oracle_stack.identity,
                "final_reentry_oracle_stack": final_cycle.reentry.compilation.oracle_stack.identity,
                "final_source_slices": dict(final_cycle.reentry.compilation.source_slices),
                "cycle_count": len(cycle_records),
            },
            contradiction_provenance=final_distribution.contradiction_markers,
            composition_provenance={
                "initial_funnel_widths": widths,
                "termination_reason": termination_reason,
                "converged": converged,
                "recursive_reentry": True,
                "hard_collapse": False,
                "final_condition_id": final_cycle.input_condition.condition_id,
            },
        )
        return RecursiveFabricResult(syntract=syntract, trace=trace)
