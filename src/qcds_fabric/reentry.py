from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping

from .fabric import FabricLayer, StabilizedRotationSuiteResult
from .funnel import BoundCondition
from .models import BaseBundle, ChannelView, State
from .oracles import DistributionOracle, OracleStack


@dataclass(frozen=True)
class ReentryCompilation:
    condition_id: str
    bundle: BaseBundle
    oracle_stack: OracleStack
    source_slices: Mapping[str, tuple[str, ...]]
    provenance: Mapping[str, Any]


@dataclass(frozen=True)
class ReentryResult:
    compilation: ReentryCompilation
    suite: StabilizedRotationSuiteResult


def compile_bound_condition(
    condition: BoundCondition,
    *,
    max_width: int = 16,
    stack_version: str = "1",
) -> ReentryCompilation:
    if max_width <= 0:
        raise ValueError("max_width must be positive")
    if not condition.leaf_returns:
        raise ValueError("BoundCondition has no leaf returns")

    combined_dimension_ids: list[str] = []
    distribution_oracles: list[DistributionOracle] = []
    source_slices: dict[str, tuple[str, ...]] = {}

    for leaf_index, leaf in enumerate(condition.leaf_returns):
        source_bundle_id = str(leaf.provenance.get("bundle_id", f"leaf-{leaf_index}"))
        raw_dimension_ids = leaf.provenance.get("dimension_ids")
        if raw_dimension_ids is None:
            raise ValueError("StabilizedReturn provenance is missing dimension_ids required for re-entry")
        dimension_ids = tuple(str(item) for item in raw_dimension_ids)
        distribution = leaf.stabilized_distribution
        if not distribution.support:
            raise ValueError("cannot re-enter an empty TruthDistribution")
        if any(len(state) != len(dimension_ids) for state in distribution.support):
            raise ValueError("distribution support width does not match provenance dimension_ids")
        if any(any(value not in (0, 1) for value in state) for state in distribution.support):
            raise ValueError("re-entry requires canonical binary stabilized support")

        namespace = f"{source_bundle_id}#{leaf_index}"
        namespaced_ids = tuple(f"{namespace}::{dimension_id}" for dimension_id in dimension_ids)
        combined_dimension_ids.extend(namespaced_ids)
        source_slices[namespace] = namespaced_ids
        probability_map: dict[State, float] = {
            state: probability
            for state, probability in zip(distribution.support, distribution.probabilities)
        }
        distribution_oracles.append(
            DistributionOracle(
                oracle_id=f"bound:{namespace}",
                dimension_ids=namespaced_ids,
                probabilities=probability_map,
            )
        )

    width = len(combined_dimension_ids)
    if width > max_width:
        raise ValueError(
            f"compiled re-entry width {width} exceeds max_width {max_width}; regroup the funnel or raise the explicit bound"
        )

    bundle = BaseBundle(
        bundle_id=f"reentry:{condition.condition_id}",
        dimension_ids=tuple(combined_dimension_ids),
        values=("?",) * width,
        provenance={
            "source_condition_id": condition.condition_id,
            "source_bundle_ids": condition.source_bundle_ids,
            "compiler": "distribution_factor_reentry_v0",
            "previous_uncertainty": condition.retained_uncertainty,
        },
        semantic_domain={
            "kind": "qcds_recursive_reentry",
            "higher_order": True,
        },
    )
    oracle_stack = OracleStack(
        stack_id=f"reentry:{condition.condition_id}",
        version=stack_version,
        oracles=tuple(distribution_oracles),
    )
    return ReentryCompilation(
        condition_id=condition.condition_id,
        bundle=bundle,
        oracle_stack=oracle_stack,
        source_slices=source_slices,
        provenance={
            "compiler": "distribution_factor_reentry_v0",
            "source_condition_id": condition.condition_id,
            "source_bundle_ids": condition.source_bundle_ids,
            "logical_width": width,
            "candidate_binary_space": f"2^{width}",
            "max_width": max_width,
            "hard_collapse": False,
            "distribution_oracle_count": len(distribution_oracles),
        },
    )


def run_bound_condition_reentry(
    condition: BoundCondition,
    *,
    max_width: int = 16,
    include_positional: bool = False,
    include_oracle_exposure: bool = False,
    include_crossed: bool = False,
    fabric_layer: FabricLayer | None = None,
) -> ReentryResult:
    compilation = compile_bound_condition(condition, max_width=max_width)
    layer = fabric_layer or FabricLayer()
    suite = layer.run_stabilized_rotation_suite(
        compilation.bundle,
        compilation.oracle_stack,
        include_positional=include_positional,
        include_oracle_exposure=include_oracle_exposure,
        include_crossed=include_crossed,
    )
    return ReentryResult(compilation=compilation, suite=suite)


def baseline_reentry_distribution(compilation: ReentryCompilation, *, fabric_layer: FabricLayer | None = None):
    """Expose the pre-null baseline product for falsification/debugging."""
    layer = fabric_layer or FabricLayer()
    view = ChannelView.baseline(
        compilation.bundle,
        oracle_stack_version=compilation.oracle_stack.identity,
        oracle_ids=compilation.oracle_stack.oracle_ids,
    )
    return layer.kernel.run(view, compilation.oracle_stack)
