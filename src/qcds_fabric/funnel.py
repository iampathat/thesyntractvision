from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Sequence

from .models import StabilizedReturn


@dataclass(frozen=True)
class BoundCondition:
    """Higher-order bound structure produced by a contraction funnel step.

    BUILD 2 deliberately retains all leaf StabilizedReturn objects instead of
    collapsing them to one binary value or opaque score. A later build may
    compile this bound structure into a higher-order local QCDS Condition.
    """

    condition_id: str
    leaf_returns: tuple[StabilizedReturn, ...]
    retained_uncertainty: float
    provenance: Mapping[str, Any]

    @property
    def leaf_count(self) -> int:
        return len(self.leaf_returns)

    @property
    def source_bundle_ids(self) -> tuple[str, ...]:
        return tuple(str(item.provenance.get("bundle_id", "unknown")) for item in self.leaf_returns)


@dataclass(frozen=True)
class FunnelLayerResult:
    layer_id: str
    input_count: int
    output_count: int
    conditions: tuple[BoundCondition, ...]
    provenance: Mapping[str, Any]


@dataclass(frozen=True)
class FunnelTrace:
    layers: tuple[FunnelLayerResult, ...]
    final_conditions: tuple[BoundCondition, ...]
    initial_leaf_count: int

    @property
    def final_condition(self) -> BoundCondition | None:
        return self.final_conditions[0] if len(self.final_conditions) == 1 else None


FunnelItem = StabilizedReturn | BoundCondition


def _leaves(item: FunnelItem) -> tuple[StabilizedReturn, ...]:
    if isinstance(item, BoundCondition):
        return item.leaf_returns
    return (item,)


def _item_id(item: FunnelItem, fallback: int) -> str:
    if isinstance(item, BoundCondition):
        return item.condition_id
    return str(item.provenance.get("bundle_id", f"return-{fallback}"))


def _balanced_groups(items: Sequence[FunnelItem], next_count: int) -> tuple[tuple[FunnelItem, ...], ...]:
    if not items:
        raise ValueError("funnel input cannot be empty")
    if next_count <= 0:
        raise ValueError("next_count must be positive")
    if next_count > len(items):
        raise ValueError("contraction funnel cannot expand the number of items")

    base, remainder = divmod(len(items), next_count)
    groups: list[tuple[FunnelItem, ...]] = []
    cursor = 0
    for index in range(next_count):
        size = base + (1 if index < remainder else 0)
        groups.append(tuple(items[cursor : cursor + size]))
        cursor += size
    return tuple(groups)


def funnel_step(items: Sequence[FunnelItem], *, next_count: int, layer_id: str) -> FunnelLayerResult:
    resolved = tuple(items)
    groups = _balanced_groups(resolved, next_count)
    conditions: list[BoundCondition] = []

    for group_index, group in enumerate(groups):
        leaves = tuple(leaf for item in group for leaf in _leaves(item))
        uncertainty = sum(leaf.retained_uncertainty for leaf in leaves) / len(leaves)
        input_ids = tuple(_item_id(item, i) for i, item in enumerate(group))
        source_ids = tuple(str(leaf.provenance.get("bundle_id", "unknown")) for leaf in leaves)
        conditions.append(
            BoundCondition(
                condition_id=f"{layer_id}:C{group_index}",
                leaf_returns=leaves,
                retained_uncertainty=uncertainty,
                provenance={
                    "layer_id": layer_id,
                    "group_index": group_index,
                    "input_item_ids": input_ids,
                    "source_bundle_ids": source_ids,
                    "binding": "provenance_preserving_group_v0",
                    "hard_collapse": False,
                },
            )
        )

    return FunnelLayerResult(
        layer_id=layer_id,
        input_count=len(resolved),
        output_count=len(conditions),
        conditions=tuple(conditions),
        provenance={
            "layer_id": layer_id,
            "input_count": len(resolved),
            "output_count": len(conditions),
            "serial_contraction": True,
            "preserve_leaf_distributions": True,
        },
    )


def recursive_contraction_funnel(
    initial_returns: Sequence[StabilizedReturn],
    widths: Sequence[int],
) -> FunnelTrace:
    if not initial_returns:
        raise ValueError("initial_returns cannot be empty")
    if not widths:
        raise ValueError("at least one funnel width is required")

    current: tuple[FunnelItem, ...] = tuple(initial_returns)
    layers: list[FunnelLayerResult] = []
    for layer_index, next_count in enumerate(widths):
        result = funnel_step(current, next_count=next_count, layer_id=f"F{layer_index}")
        layers.append(result)
        current = result.conditions

    return FunnelTrace(
        layers=tuple(layers),
        final_conditions=tuple(item for item in current if isinstance(item, BoundCondition)),
        initial_leaf_count=len(initial_returns),
    )
