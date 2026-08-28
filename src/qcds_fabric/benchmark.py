from __future__ import annotations

from dataclasses import dataclass
from math import log2
from typing import Any, Mapping, Sequence

from .fabric import FabricLayer
from .kernel import ClassicalInferenceKernel
from .models import BaseBundle, ChannelView, StabilizedReturn, State, TruthDistribution
from .oracles import OracleStack


@dataclass(frozen=True)
class SlotBias:
    """Synthetic implementation bias attached to an execution slot.

    This is a benchmark fault injector, not QCDS semantics.
    """

    slot: int
    preferred_value: int
    multiplier: float

    def __post_init__(self) -> None:
        if self.slot < 0:
            raise ValueError("slot must be non-negative")
        if self.preferred_value not in (0, 1):
            raise ValueError("preferred_value must be binary")
        if self.multiplier <= 0:
            raise ValueError("multiplier must be positive")


@dataclass(frozen=True)
class OracleExposureBias:
    """Synthetic fault coupled to one oracle's exposure position."""

    oracle_id: str
    exposure_position: int
    dimension_id: str
    preferred_value: int
    multiplier: float

    def __post_init__(self) -> None:
        if not self.oracle_id or not self.dimension_id:
            raise ValueError("oracle_id and dimension_id are required")
        if self.exposure_position < 0:
            raise ValueError("exposure_position must be non-negative")
        if self.preferred_value not in (0, 1):
            raise ValueError("preferred_value must be binary")
        if self.multiplier <= 0:
            raise ValueError("multiplier must be positive")


@dataclass(frozen=True)
class InjectedBiasKernel(ClassicalInferenceKernel):
    """Classical reference kernel with explicit synthetic implementation faults.

    Biases are applied *after* the ordinary reference-kernel distribution so
    benchmark code can measure whether rotations expose the fault. Contradiction
    markers are retained even if an injected bias creates a numerical peak.
    """

    slot_biases: tuple[SlotBias, ...] = ()
    oracle_exposure_biases: tuple[OracleExposureBias, ...] = ()

    def _bias_factor(self, view: ChannelView, state: State) -> float:
        factor = 1.0
        for bias in self.slot_biases:
            if bias.slot >= view.base_bundle.width:
                raise ValueError(f"slot bias {bias.slot} exceeds bundle width {view.base_bundle.width}")
            canonical_index = view.canonical_index_at_slot(bias.slot)
            if view.present[canonical_index] and state[canonical_index] == bias.preferred_value:
                factor *= bias.multiplier

        active = view.state_as_mapping(state)
        for bias in self.oracle_exposure_biases:
            if bias.exposure_position >= len(view.oracle_map):
                raise ValueError(
                    f"oracle exposure position {bias.exposure_position} exceeds oracle map width {len(view.oracle_map)}"
                )
            if (
                view.oracle_map[bias.exposure_position] == bias.oracle_id
                and bias.dimension_id in active
                and active[bias.dimension_id] == bias.preferred_value
            ):
                factor *= bias.multiplier
        return factor

    def run(self, view: ChannelView, oracle_stack: OracleStack) -> TruthDistribution:
        base = super().run(view, oracle_stack)
        factors = tuple(self._bias_factor(view, state) for state in base.support)
        weighted = tuple(probability * factor for probability, factor in zip(base.probabilities, factors))
        total = sum(weighted)
        if total <= 0.0:
            probabilities = base.probabilities
        else:
            probabilities = tuple(value / total for value in weighted)

        ordering = sorted(range(len(base.support)), key=lambda i: probabilities[i], reverse=True)
        top = tuple(base.support[i] for i in ordering[: min(self.top_k, len(base.support))])
        return TruthDistribution(
            support=base.support,
            probabilities=probabilities,
            raw_scores=tuple(score * factor for score, factor in zip(base.raw_scores, factors)),
            top_k=top,
            entropy=TruthDistribution.shannon_entropy(probabilities),
            oracle_agreement=base.oracle_agreement,
            contradiction_markers=base.contradiction_markers,
            normalization=f"{base.normalization}+synthetic_injected_bias",
            provenance={
                **dict(base.provenance),
                "benchmark_fault_injection": True,
                "slot_bias_count": len(self.slot_biases),
                "oracle_exposure_bias_count": len(self.oracle_exposure_biases),
            },
        )


@dataclass(frozen=True)
class BenchmarkMetrics:
    l1_to_target: float
    kl_target_to_observed: float
    entropy: float
    oracle_agreement: float
    peak_probability: float
    target_mode_probability: float
    target_mode_hit: bool
    contradiction_marker_count: int


@dataclass(frozen=True)
class AblationVariant:
    name: str
    baseline_only: bool = False
    include_positional: bool = False
    include_oracle_exposure: bool = False
    include_crossed: bool = False


DEFAULT_ABLATIONS = (
    AblationVariant("no_diagnostics", baseline_only=True),
    AblationVariant("null_only"),
    AblationVariant("null_plus_position", include_positional=True),
    AblationVariant("null_plus_oracle", include_oracle_exposure=True),
    AblationVariant(
        "full_diagnostics",
        include_positional=True,
        include_oracle_exposure=True,
        include_crossed=True,
    ),
)


@dataclass(frozen=True)
class AblationResult:
    variant: str
    distribution: TruthDistribution
    metrics: BenchmarkMetrics
    diagnostics: Mapping[str, float]


@dataclass(frozen=True)
class BenchmarkReport:
    results: tuple[AblationResult, ...]
    target_distribution: Mapping[State, float]
    best_l1_variant: str
    provenance: Mapping[str, Any]

    @property
    def by_name(self) -> Mapping[str, AblationResult]:
        return {result.variant: result for result in self.results}


@dataclass(frozen=True)
class ContradictionProbe:
    baseline: TruthDistribution
    null_distributions: Mapping[str, TruthDistribution]
    resolution_candidates: tuple[str, ...]
    agreement_deltas: Mapping[str, float]
    provenance: Mapping[str, Any]


@dataclass(frozen=True)
class OracleLeaveOneOutResult:
    omitted_oracle_id: str
    distribution: TruthDistribution
    metrics: BenchmarkMetrics


@dataclass(frozen=True)
class OracleAblationReport:
    baseline: BenchmarkMetrics
    leave_one_out: tuple[OracleLeaveOneOutResult, ...]
    best_l1_omission: str | None
    provenance: Mapping[str, Any]


def _normalized_target(target: Mapping[State, float]) -> dict[State, float]:
    if not target:
        raise ValueError("target distribution cannot be empty")
    if any(probability < 0 for probability in target.values()):
        raise ValueError("target probabilities cannot be negative")
    total = sum(target.values())
    if total <= 0.0:
        raise ValueError("target distribution must contain positive mass")
    return {state: probability / total for state, probability in target.items()}


def evaluate_against_target(
    distribution: TruthDistribution,
    target: Mapping[State, float],
    *,
    epsilon: float = 1e-12,
) -> BenchmarkMetrics:
    if epsilon <= 0:
        raise ValueError("epsilon must be positive")
    expected = _normalized_target(target)
    observed = dict(zip(distribution.support, distribution.probabilities))
    keys = set(expected) | set(observed)
    l1 = sum(abs(expected.get(state, 0.0) - observed.get(state, 0.0)) for state in keys)
    kl = sum(
        probability * log2(probability / max(observed.get(state, 0.0), epsilon))
        for state, probability in expected.items()
        if probability > 0
    )
    target_peak = max(expected.values())
    target_modes = tuple(state for state, probability in expected.items() if probability == target_peak)
    observed_top = distribution.top_k[0] if distribution.top_k else None
    target_mode_probability = max((observed.get(state, 0.0) for state in target_modes), default=0.0)
    return BenchmarkMetrics(
        l1_to_target=l1,
        kl_target_to_observed=kl,
        entropy=distribution.entropy,
        oracle_agreement=distribution.oracle_agreement,
        peak_probability=max(distribution.probabilities, default=0.0),
        target_mode_probability=target_mode_probability,
        target_mode_hit=observed_top in target_modes,
        contradiction_marker_count=len(distribution.contradiction_markers),
    )


def max_pairwise_l1(distributions: Sequence[TruthDistribution]) -> float:
    resolved = tuple(distributions)
    maximum = 0.0
    for left_index, left in enumerate(resolved):
        left_map = dict(zip(left.support, left.probabilities))
        for right in resolved[left_index + 1 :]:
            right_map = dict(zip(right.support, right.probabilities))
            keys = set(left_map) | set(right_map)
            distance = sum(abs(left_map.get(state, 0.0) - right_map.get(state, 0.0)) for state in keys)
            maximum = max(maximum, distance)
    return maximum


def _suite_diagnostics(suite) -> dict[str, float]:
    diagnostics: dict[str, float] = {}
    for family_name, bank in suite.families.items():
        for key, value in bank.diagnostics.items():
            diagnostics[f"{family_name}_{key}"] = float(value)
        diagnostics[f"{family_name}_pairwise_l1_spread"] = max_pairwise_l1(bank.distributions)
    diagnostics["diagnostic_family_count"] = float(len(suite.families))
    return diagnostics


def run_ablation_benchmark(
    bundle: BaseBundle,
    oracle_stack: OracleStack,
    target: Mapping[State, float],
    *,
    fabric_layer: FabricLayer | None = None,
    variants: Sequence[AblationVariant] = DEFAULT_ABLATIONS,
) -> BenchmarkReport:
    layer = fabric_layer or FabricLayer()
    resolved_variants = tuple(variants)
    if not resolved_variants:
        raise ValueError("at least one ablation variant is required")
    if len({variant.name for variant in resolved_variants}) != len(resolved_variants):
        raise ValueError("ablation variant names must be unique")

    normalized_target = _normalized_target(target)
    results: list[AblationResult] = []
    for variant in resolved_variants:
        if variant.baseline_only:
            view = ChannelView.baseline(
                bundle,
                oracle_stack_version=oracle_stack.identity,
                oracle_ids=oracle_stack.oracle_ids,
            )
            distribution = layer.kernel.run(view, oracle_stack)
            diagnostics: Mapping[str, float] = {"diagnostic_family_count": 0.0}
        else:
            suite = layer.run_stabilized_rotation_suite(
                bundle,
                oracle_stack,
                include_positional=variant.include_positional,
                include_oracle_exposure=variant.include_oracle_exposure,
                include_crossed=variant.include_crossed,
            )
            distribution = suite.stabilized_return.stabilized_distribution
            diagnostics = _suite_diagnostics(suite)
        results.append(
            AblationResult(
                variant=variant.name,
                distribution=distribution,
                metrics=evaluate_against_target(distribution, normalized_target),
                diagnostics=diagnostics,
            )
        )

    best = min(results, key=lambda result: result.metrics.l1_to_target)
    return BenchmarkReport(
        results=tuple(results),
        target_distribution=normalized_target,
        best_l1_variant=best.variant,
        provenance={
            "benchmark": "matched_ablation_matrix_v0",
            "bundle_id": bundle.bundle_id,
            "oracle_stack": oracle_stack.identity,
            "variant_names": tuple(result.variant for result in results),
            "target_is_external_reference_for_benchmark": True,
            "superiority_assumed": False,
            "diagnostic_views_count_as_independent_dimensions": False,
        },
    )


def probe_contradictions(
    bundle: BaseBundle,
    oracle_stack: OracleStack,
    *,
    fabric_layer: FabricLayer | None = None,
) -> ContradictionProbe:
    layer = fabric_layer or FabricLayer()
    result = layer.run_null_bank(bundle, oracle_stack)
    null_by_dimension = {
        view.null_dimension_id: distribution
        for view, distribution in zip(result.null_views, result.null_distributions)
        if view.null_dimension_id is not None
    }
    resolution_candidates = tuple(
        dimension_id
        for dimension_id, distribution in null_by_dimension.items()
        if result.baseline_distribution.contradiction_markers and not distribution.contradiction_markers
    )
    agreement_deltas = {
        dimension_id: distribution.oracle_agreement - result.baseline_distribution.oracle_agreement
        for dimension_id, distribution in null_by_dimension.items()
    }
    return ContradictionProbe(
        baseline=result.baseline_distribution,
        null_distributions=null_by_dimension,
        resolution_candidates=resolution_candidates,
        agreement_deltas=agreement_deltas,
        provenance={
            "probe": "dimension_null_contradiction_probe_v0",
            "bundle_id": bundle.bundle_id,
            "oracle_stack": oracle_stack.identity,
            "automatic_oracle_removal": False,
        },
    )


def rank_dimension_influence(
    stabilized_return: StabilizedReturn,
    *,
    metric: str = "agreement_delta",
) -> tuple[tuple[str, float], ...]:
    values: list[tuple[str, float]] = []
    for dimension_id, metrics in stabilized_return.per_dimension_influence.items():
        if metric not in metrics:
            raise ValueError(f"unknown dimension influence metric {metric!r}")
        values.append((dimension_id, float(metrics[metric])))
    return tuple(sorted(values, key=lambda item: abs(item[1]), reverse=True))


def run_oracle_leave_one_out(
    bundle: BaseBundle,
    oracle_stack: OracleStack,
    target: Mapping[State, float],
    *,
    kernel: ClassicalInferenceKernel | None = None,
) -> OracleAblationReport:
    resolved_kernel = kernel or ClassicalInferenceKernel()
    baseline_view = ChannelView.baseline(
        bundle,
        oracle_stack_version=oracle_stack.identity,
        oracle_ids=oracle_stack.oracle_ids,
    )
    baseline_distribution = resolved_kernel.run(baseline_view, oracle_stack)
    baseline_metrics = evaluate_against_target(baseline_distribution, target)

    results: list[OracleLeaveOneOutResult] = []
    for omitted in oracle_stack.oracles:
        retained = tuple(oracle for oracle in oracle_stack.oracles if oracle.oracle_id != omitted.oracle_id)
        ablated_stack = OracleStack(
            stack_id=f"{oracle_stack.stack_id}:loo:{omitted.oracle_id}",
            version=oracle_stack.version,
            oracles=retained,
        )
        view = ChannelView.baseline(
            bundle,
            oracle_stack_version=ablated_stack.identity,
            oracle_ids=ablated_stack.oracle_ids,
        )
        distribution = resolved_kernel.run(view, ablated_stack)
        results.append(
            OracleLeaveOneOutResult(
                omitted_oracle_id=omitted.oracle_id,
                distribution=distribution,
                metrics=evaluate_against_target(distribution, target),
            )
        )

    best = min(results, key=lambda result: result.metrics.l1_to_target) if results else None
    return OracleAblationReport(
        baseline=baseline_metrics,
        leave_one_out=tuple(results),
        best_l1_omission=best.omitted_oracle_id if best is not None else None,
        provenance={
            "benchmark": "oracle_leave_one_out_v0",
            "bundle_id": bundle.bundle_id,
            "source_oracle_stack": oracle_stack.identity,
            "oracle_count": len(oracle_stack.oracles),
            "automatic_oracle_retirement": False,
            "superiority_assumed": False,
        },
    )
