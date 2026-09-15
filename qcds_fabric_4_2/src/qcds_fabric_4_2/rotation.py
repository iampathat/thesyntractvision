from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Mapping

from .types import ExclusionView, RotationalView


@dataclass(frozen=True)
class RotationScheduler:
    """Deterministic balanced semantic rotation / leave-one-out scheduler."""

    seed: int = 0

    def balanced_views(
        self,
        dimensions: Iterable[str],
        *,
        bank_id: int = 0,
    ) -> tuple[RotationalView, ...]:
        dims = tuple(dimensions)
        _validate_dimensions(dims)
        n = len(dims)
        bank_offset = (self.seed + bank_id) % n
        views: list[RotationalView] = []
        for lane_id in range(n):
            shift = (bank_offset + lane_id) % n
            ordered = dims[shift:] + dims[:shift]
            excluded = dims[lane_id]
            active = tuple(d for d in ordered if d != excluded)
            p2s = {pos: dim for pos, dim in enumerate(ordered)}
            views.append(
                RotationalView(
                    lane_id=lane_id,
                    bank_id=bank_id,
                    canonical_dimensions=dims,
                    ordered_dimensions=ordered,
                    active_dimensions=active,
                    excluded_dimension=excluded,
                    position_to_semantic=p2s,
                    semantic_to_position={dim: pos for pos, dim in p2s.items()},
                )
            )
        return tuple(views)

    def targeted_view(
        self,
        dimensions: Iterable[str],
        excluded_dimensions: Iterable[str],
        *,
        bank_id: int,
        view_id: str,
    ) -> ExclusionView:
        dims = tuple(dimensions)
        _validate_dimensions(dims)
        excluded = tuple(dict.fromkeys(excluded_dimensions))
        if not excluded or len(excluded) >= len(dims):
            raise ValueError("targeted exclusion must remove between 1 and N-1 dimensions")
        if any(d not in dims for d in excluded):
            raise ValueError("targeted exclusion contains an unknown dimension")
        shift = (self.seed + bank_id) % len(dims)
        ordered = dims[shift:] + dims[:shift]
        active = tuple(d for d in ordered if d not in excluded)
        p2s = {pos: dim for pos, dim in enumerate(ordered)}
        return ExclusionView(
            view_id=view_id,
            bank_id=bank_id,
            canonical_dimensions=dims,
            ordered_dimensions=ordered,
            active_dimensions=active,
            excluded_dimensions=excluded,
            position_to_semantic=p2s,
            semantic_to_position={dim: pos for pos, dim in p2s.items()},
        )


def _validate_dimensions(dims: tuple[str, ...]) -> None:
    if len(dims) < 2:
        raise ValueError("A rotational cell needs at least two dimensions")
    if len(set(dims)) != len(dims):
        raise ValueError("Semantic dimension names must be unique")


class RotationalIngressCell:
    """Reusable N-dimensional bias-resistance cell (Fabric 4.2A)."""

    def __init__(self, dimensions: Iterable[str], *, seed: int = 0) -> None:
        self.dimensions = tuple(dimensions)
        _validate_dimensions(self.dimensions)
        self.scheduler = RotationScheduler(seed=seed)

    def build_bank(self, bank_id: int = 0) -> tuple[RotationalView, ...]:
        return self.scheduler.balanced_views(self.dimensions, bank_id=bank_id)

    def build_targeted_view(
        self,
        excluded_dimensions: Iterable[str],
        *,
        bank_id: int,
        view_id: str,
    ) -> ExclusionView:
        return self.scheduler.targeted_view(
            self.dimensions,
            excluded_dimensions,
            bank_id=bank_id,
            view_id=view_id,
        )

    @staticmethod
    def decode_state(active_dimensions: tuple[str, ...], state: int) -> dict[str, int]:
        width = len(active_dimensions)
        if state < 0 or state >= (1 << width):
            raise ValueError("State outside local state space")
        return {dim: (state >> bit) & 1 for bit, dim in enumerate(active_dimensions)}

    @staticmethod
    def encode_state(active_dimensions: tuple[str, ...], assignment: Mapping[str, int]) -> int:
        if set(assignment) != set(active_dimensions):
            raise ValueError("Assignment must contain exactly the active dimensions")
        state = 0
        for bit, dim in enumerate(active_dimensions):
            value = assignment[dim]
            if value not in (0, 1):
                raise ValueError("Binary dimensions must be 0/1")
            state |= value << bit
        return state

    @staticmethod
    def decode_local_state(view: RotationalView, state: int) -> dict[str, int]:
        return RotationalIngressCell.decode_state(view.active_dimensions, state)

    @staticmethod
    def encode_local_state(view: RotationalView, assignment: Mapping[str, int]) -> int:
        if view.excluded_dimension in assignment:
            raise ValueError("Excluded dimension must be absent from a lane assignment")
        return RotationalIngressCell.encode_state(view.active_dimensions, assignment)
