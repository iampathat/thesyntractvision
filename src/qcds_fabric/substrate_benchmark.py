from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Sequence

from .benchmark import BenchmarkMetrics, evaluate_against_target
from .fabric import FabricLayer, StabilizedRotationSuiteResult
from .kernel import ClassicalInferenceKernel
from .models import BaseBundle, State, TruthDistribution
from .oracles import OracleStack
from .substrates import InferenceSubstrate, StatevectorGroverSubstrate


@dataclass(frozen=True)
class SubstrateVariant:
    name: str
    substrate: InferenceSubstrate

    def __post_init__(self) -> None:
        if not self.name:
            raise ValueError("substrate variant name must be non-empty")


DEFAULT_SUBSTRATES = (
    SubstrateVariant("classical_reference", ClassicalInferenceKernel()),
    SubstrateVariant("statevector_grover_m1", StatevectorGroverSubstrate(iterations=1)),
)


@dataclass(frozen=True)
class SubstrateBenchmarkResult:
    variant: str
    substrate_id: str
    suite: StabilizedRotationSuiteResult
    baseline_metrics: BenchmarkMetrics
    stabilized_metrics: BenchmarkMetrics


@dataclass(frozen=True)
class SubstrateBenchmarkReport:
    results: tuple[SubstrateBenchmarkResult, ...]
    target_distribution: Mapping[State, float]
    pairwise_baseline_l1: Mapping[str, float]
    pairwise_stabilized_l1: Mapping[str, float]
    best_stabilized_l1_variant: str
    provenance: Mapping[str, Any]

    @property
    def by_name(self) -> Mapping[str, SubstrateBenchmarkResult]:
        return {result.variant: result for result in self.results}


def _distribution_l1(left: TruthDistribution, right: TruthDistribution) -> float:
    left_map = dict(zip(left.support, left.probabilities))
    right_map = dict(zip(right.support, right.probabilities))
    keys = set(left_map) | set(right_map)
    return sum(abs(left_map.get(state, 0.0) - right_map.get(state, 0.0)) for state in keys)


def _pairwise_distances(
    results: Sequence[SubstrateBenchmarkResult],
    *,
    stabilized: bool,
) -> dict[str, float]:
    resolved = tuple(results)
    distances: dict[str, float] = {}
    for left_index, left in enumerate(resolved):
        left_distribution = (
            left.suite.stabilized_return.stabilized_distribution
            if stabilized
            else left.suite.baseline_distribution
        )
        for right in resolved[left_index + 1 :]:
            right_distribution = (
                right.suite.stabilized_return.stabilized_distribution
                if stabilized
                else right.suite.baseline_distribution
            )
            distances[f"{left.variant}::{right.variant}"] = _distribution_l1(
                left_distribution,
                right_distribution,
            )
    return distances


def run_substrate_benchmark(
    bundle: BaseBundle,
    oracle_stack: OracleStack,
    target: Mapping[State, float],
    *,
    variants: Sequence[SubstrateVariant] = DEFAULT_SUBSTRATES,
    include_positional: bool = True,
    include_oracle_exposure: bool = True,
    include_crossed: bool = False,
) -> SubstrateBenchmarkReport:
    """Run one matched Fabric topology across multiple local substrates.

    Conditions, oracle identity, rotation-family selection, stabilization policy,
    and external benchmark target are held fixed. Only the local inference
    substrate changes.
    """
    resolved = tuple(variants)
    if len(resolved) < 2:
        raise ValueError("substrate benchmark requires at least two variants")
    if len({variant.name for variant in resolved}) != len(resolved):
        raise ValueError("substrate variant names must be unique")

    results: list[SubstrateBenchmarkResult] = []
    for variant in resolved:
        layer = FabricLayer(kernel=variant.substrate)
        suite = layer.run_stabilized_rotation_suite(
            bundle,
            oracle_stack,
            include_positional=include_positional,
            include_oracle_exposure=include_oracle_exposure,
            include_crossed=include_crossed,
        )
        results.append(
            SubstrateBenchmarkResult(
                variant=variant.name,
                substrate_id=variant.substrate.substrate_id,
                suite=suite,
                baseline_metrics=evaluate_against_target(suite.baseline_distribution, target),
                stabilized_metrics=evaluate_against_target(
                    suite.stabilized_return.stabilized_distribution,
                    target,
                ),
            )
        )

    resolved_results = tuple(results)
    best = min(resolved_results, key=lambda result: result.stabilized_metrics.l1_to_target)
    target_total = sum(target.values())
    if target_total <= 0:
        raise ValueError("target distribution must contain positive mass")
    normalized_target = {state: probability / target_total for state, probability in target.items()}

    return SubstrateBenchmarkReport(
        results=resolved_results,
        target_distribution=normalized_target,
        pairwise_baseline_l1=_pairwise_distances(resolved_results, stabilized=False),
        pairwise_stabilized_l1=_pairwise_distances(resolved_results, stabilized=True),
        best_stabilized_l1_variant=best.variant,
        provenance={
            "benchmark": "matched_substrate_comparison_v0",
            "bundle_id": bundle.bundle_id,
            "oracle_stack": oracle_stack.identity,
            "variant_names": tuple(result.variant for result in resolved_results),
            "substrate_ids": tuple(result.substrate_id for result in resolved_results),
            "same_conditions": True,
            "same_oracle_regime": True,
            "same_rotation_topology": True,
            "same_stabilizer": True,
            "include_positional": include_positional,
            "include_oracle_exposure": include_oracle_exposure,
            "include_crossed": include_crossed,
            "target_is_external_reference_for_benchmark": True,
            "superiority_assumed": False,
            "quantum_advantage_claim": False,
        },
    )
