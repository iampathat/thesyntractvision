from __future__ import annotations

from typing import Any, Mapping, Sequence


Cell = tuple[int, int]


def _cell(value: Sequence[Any]) -> Cell:
    return int(value[0]), int(value[1])


def _neighbors(cell: Cell, width: int, height: int):
    x, y = cell
    for dx, dy in ((1, 0), (0, 1), (-1, 0), (0, -1)):
        nx, ny = x + dx, y + dy
        if 0 <= nx < width and 0 <= ny < height:
            yield nx, ny


def _parent_graph(layers: Sequence[Sequence[Cell]], width: int, height: int):
    parents: list[dict[Cell, tuple[Cell, ...]]] = [{}]
    for depth in range(1, len(layers)):
        previous = set(layers[depth - 1])
        parents.append(
            {
                cell: tuple(neighbor for neighbor in _neighbors(cell, width, height) if neighbor in previous)
                for cell in layers[depth]
            }
        )
    return parents


def _distance(left: Sequence[Cell], right: Sequence[Cell]) -> int:
    return sum(1 for a, b in zip(left, right) if a != b)


def _diverse_paths(
    goal: Cell,
    start: Cell,
    parents,
    representative: Sequence[Cell],
    *,
    limit: int = 8,
    candidate_limit: int = 96,
) -> list[list[Cell]]:
    if not parents or goal == start:
        return []

    representative_key = tuple(representative)
    candidates: list[list[Cell]] = []

    def walk(depth: int, current: Cell, reverse_path: list[Cell]) -> None:
        if len(candidates) >= candidate_limit:
            return
        if depth == 0:
            path = list(reversed(reverse_path))
            if path and path[0] == start and tuple(path) != representative_key:
                candidates.append(path)
            return
        for parent in sorted(parents[depth].get(current, ()), key=lambda cell: (cell[1], cell[0])):
            walk(depth - 1, parent, [*reverse_path, parent])
            if len(candidates) >= candidate_limit:
                return

    walk(len(parents) - 1, goal, [goal])

    selected: list[list[Cell]] = []
    references: list[Sequence[Cell]] = [representative]
    pool = candidates[:]
    while pool and len(selected) < limit:
        best = max(
            pool,
            key=lambda candidate: (
                min(_distance(candidate, reference) for reference in references),
                tuple(candidate),
            ),
        )
        selected.append(best)
        references.append(best)
        pool.remove(best)
    return selected


def add_route_family_preview(result: Mapping[str, Any], *, limit: int = 8) -> dict[str, Any]:
    """Add visual route-family samples without running a second inference engine.

    The source is the QCDS frontier sequence already returned by the route run.
    This module only reconstructs a few human-visible members of that already
    inferred minimum-depth family for presentation in the Robotics Playground.
    """
    out = dict(result)
    if not result.get("reachable"):
        out["alternative_shortest_paths"] = []
        out["alternative_route_count_shown"] = 0
        out["alternative_routes_source"] = "same_qcds_frontier_family"
        return out

    width = int(result["width"])
    height = int(result["height"])
    start = _cell(result["start"])
    goal = _cell(result["goal"])
    layers = [[_cell(cell) for cell in layer] for layer in result.get("frontier_layers", ())]
    representative = [_cell(cell) for cell in result.get("representative_shortest_path", ())]

    alternatives = _diverse_paths(
        goal,
        start,
        _parent_graph(layers, width, height),
        representative,
        limit=limit,
    )
    out["alternative_shortest_paths"] = [[[x, y] for x, y in path] for path in alternatives]
    out["alternative_route_count_shown"] = len(alternatives)
    out["alternative_routes_source"] = "same_qcds_frontier_family"
    out["alternative_routes_are_new_inference"] = False
    return out


__all__ = ["add_route_family_preview"]
