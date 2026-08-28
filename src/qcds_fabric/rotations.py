from __future__ import annotations

from itertools import product
from typing import Sequence

from .models import BaseBundle, ChannelView
from .oracles import OracleStack


def circular_position_maps(width: int) -> tuple[tuple[int, ...], ...]:
    """Return all circular canonical-dimension → execution-slot maps."""
    if width <= 0:
        raise ValueError("width must be positive")
    return tuple(tuple((index + shift) % width for index in range(width)) for shift in range(width))


def circular_oracle_maps(oracle_ids: Sequence[str]) -> tuple[tuple[str, ...], ...]:
    """Return circular exposure orders over one immutable oracle identity set."""
    ids = tuple(oracle_ids)
    if not ids:
        return ((),)
    return tuple(ids[shift:] + ids[:shift] for shift in range(len(ids)))


def positional_views(
    bundle: BaseBundle,
    oracle_stack: OracleStack,
    *,
    position_maps: Sequence[Sequence[int]] | None = None,
) -> tuple[ChannelView, ...]:
    maps = tuple(tuple(m) for m in position_maps) if position_maps is not None else circular_position_maps(bundle.width)
    return tuple(
        ChannelView.transformed(
            bundle,
            oracle_stack_version=oracle_stack.identity,
            oracle_ids=oracle_stack.oracle_ids,
            position_map=position_map,
            transformation_provenance={
                "rotation": "position",
                "axes": ("position",),
                "position_map": position_map,
                "oracle_map": oracle_stack.oracle_ids,
                "null_index": None,
            },
        )
        for position_map in maps
    )


def oracle_exposure_views(
    bundle: BaseBundle,
    oracle_stack: OracleStack,
    *,
    oracle_maps: Sequence[Sequence[str]] | None = None,
) -> tuple[ChannelView, ...]:
    maps = tuple(tuple(m) for m in oracle_maps) if oracle_maps is not None else circular_oracle_maps(oracle_stack.oracle_ids)
    return tuple(
        ChannelView.transformed(
            bundle,
            oracle_stack_version=oracle_stack.identity,
            oracle_ids=oracle_stack.oracle_ids,
            oracle_map=oracle_map,
            transformation_provenance={
                "rotation": "oracle_exposure",
                "axes": ("oracle_exposure",),
                "position_map": tuple(range(bundle.width)),
                "oracle_map": oracle_map,
                "null_index": None,
            },
        )
        for oracle_map in maps
    )


def crossed_views(
    bundle: BaseBundle,
    oracle_stack: OracleStack,
    *,
    null_indices: Sequence[int | None] | None = None,
    position_maps: Sequence[Sequence[int]] | None = None,
    oracle_maps: Sequence[Sequence[str]] | None = None,
) -> tuple[ChannelView, ...]:
    nulls = tuple(null_indices) if null_indices is not None else tuple(range(bundle.width))
    positions = tuple(tuple(m) for m in position_maps) if position_maps is not None else circular_position_maps(bundle.width)
    oracles = tuple(tuple(m) for m in oracle_maps) if oracle_maps is not None else circular_oracle_maps(oracle_stack.oracle_ids)

    views: list[ChannelView] = []
    for null_index, position_map, oracle_map in product(nulls, positions, oracles):
        axes = []
        if null_index is not None:
            axes.append("dimension_null")
        axes.extend(("position", "oracle_exposure"))
        views.append(
            ChannelView.transformed(
                bundle,
                oracle_stack_version=oracle_stack.identity,
                oracle_ids=oracle_stack.oracle_ids,
                null_index=null_index,
                position_map=position_map,
                oracle_map=oracle_map,
                transformation_provenance={
                    "rotation": "crossed",
                    "axes": tuple(axes),
                    "null_index": null_index,
                    "position_map": position_map,
                    "oracle_map": oracle_map,
                },
            )
        )
    return tuple(views)
