from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from typing import Callable


@dataclass(frozen=True)
class TopologyPlan:
    widths: tuple[int, ...]

    def __post_init__(self) -> None:
        if not self.widths or any(w <= 0 for w in self.widths):
            raise ValueError("Topology widths must be positive")

    @property
    def depth(self) -> int:
        return len(self.widths)

    @property
    def max_width(self) -> int:
        return max(self.widths)

    @property
    def expands_after_contraction(self) -> bool:
        seen_drop = False
        for left, right in zip(self.widths, self.widths[1:]):
            if right < left:
                seen_drop = True
            elif seen_drop and right > left:
                return True
        return False


@dataclass(frozen=True)
class NodeProvenance:
    layer: int
    node: int
    parent_layer_width: int | None
    layer_width: int


@dataclass(frozen=True)
class TopologyExecution:
    plan: TopologyPlan
    completed_nodes: int
    layer_barriers: int
    concurrent_layers: tuple[int, ...]
    provenance_count: int
    topology_expands_after_contraction: bool


class EmulatedFabricScheduler:
    """4.2F bounded graph scheduler.

    This is an execution/scheduling acceptance layer. It does *not* claim that
    all logical nodes form one coherent quantum register.
    """

    def __init__(self, *, max_workers: int = 32) -> None:
        if max_workers < 1:
            raise ValueError("max_workers must be >= 1")
        self.max_workers = max_workers

    def execute(
        self,
        plan: TopologyPlan,
        node_fn: Callable[[NodeProvenance], object] | None = None,
    ) -> TopologyExecution:
        node_fn = node_fn or (lambda p: (p.layer, p.node))
        completed = 0
        provenance_count = 0
        concurrent_layers: list[int] = []
        previous_width: int | None = None
        for layer, width in enumerate(plan.widths):
            prov = tuple(
                NodeProvenance(
                    layer=layer,
                    node=node,
                    parent_layer_width=previous_width,
                    layer_width=width,
                )
                for node in range(width)
            )
            workers = min(self.max_workers, width)
            if workers > 1 and width > 1:
                concurrent_layers.append(layer)
            with ThreadPoolExecutor(max_workers=workers) as pool:
                results = tuple(pool.map(node_fn, prov))
            # Exhausting the layer's futures is the explicit layer barrier.
            completed += len(results)
            provenance_count += len(prov)
            previous_width = width
        return TopologyExecution(
            plan=plan,
            completed_nodes=completed,
            layer_barriers=max(0, plan.depth - 1),
            concurrent_layers=tuple(concurrent_layers),
            provenance_count=provenance_count,
            topology_expands_after_contraction=plan.expands_after_contraction,
        )


def canonical_512x12_plan() -> TopologyPlan:
    return TopologyPlan((512, 512, 256, 128, 256, 128, 64, 128, 32, 16, 4, 1))
