from __future__ import annotations

import json
from collections import deque
from typing import Any, Mapping, Sequence


DEFAULT_WIDTH = 20
DEFAULT_HEIGHT = 12
DEFAULT_START = (1, 6)
DEFAULT_GOAL = (18, 6)


def _cell(value: Sequence[Any], *, name: str) -> tuple[int, int]:
    if len(value) != 2:
        raise ValueError(f"{name} must contain x,y")
    return int(value[0]), int(value[1])


def _neighbors(cell: tuple[int, int], width: int, height: int):
    x, y = cell
    for dx, dy in ((1, 0), (0, 1), (-1, 0), (0, -1)):
        nx, ny = x + dx, y + dy
        if 0 <= nx < width and 0 <= ny < height:
            yield nx, ny


def _representative_path(
    goal: tuple[int, int],
    start: tuple[int, int],
    parents: Mapping[tuple[int, int], tuple[tuple[int, int], ...]],
) -> list[tuple[int, int]]:
    if goal == start:
        return [start]
    path = [goal]
    current = goal
    previous_direction: tuple[int, int] | None = None
    while current != start:
        options = list(parents.get(current, ()))
        if not options:
            return []
        if previous_direction is None:
            parent = min(options, key=lambda p: (abs(p[1] - start[1]), abs(p[0] - start[0]), p[1], p[0]))
        else:
            def key(parent: tuple[int, int]):
                direction = (current[0] - parent[0], current[1] - parent[1])
                turn = 0 if direction == previous_direction else 1
                return (turn, abs(parent[1] - start[1]), abs(parent[0] - start[0]), parent[1], parent[0])
            parent = min(options, key=key)
        previous_direction = (current[0] - parent[0], current[1] - parent[1])
        current = parent
        path.append(current)
    path.reverse()
    return path


def run_robotics_playground(payload: Mapping[str, Any] | None = None) -> dict[str, Any]:
    payload = dict(payload or {})
    width = int(payload.get("width", DEFAULT_WIDTH))
    height = int(payload.get("height", DEFAULT_HEIGHT))
    if width < 4 or height < 4 or width * height > 600:
        raise ValueError("grid must be at least 4x4 and no larger than 600 cells")

    start = _cell(payload.get("start", DEFAULT_START), name="start")
    goal = _cell(payload.get("goal", DEFAULT_GOAL), name="goal")
    for name, cell in (("start", start), ("goal", goal)):
        if not (0 <= cell[0] < width and 0 <= cell[1] < height):
            raise ValueError(f"{name} is outside the grid")

    blocked = {_cell(item, name="blocked cell") for item in payload.get("blocked", ())}
    blocked.discard(start)
    blocked.discard(goal)
    blocked = {cell for cell in blocked if 0 <= cell[0] < width and 0 <= cell[1] < height}

    distance: dict[tuple[int, int], int] = {start: 0}
    path_count: dict[tuple[int, int], int] = {start: 1}
    parents_mut: dict[tuple[int, int], list[tuple[int, int]]] = {start: []}
    frontier = [start]
    layers: list[list[tuple[int, int]]] = [[start]]

    while frontier and goal not in distance:
        next_frontier: list[tuple[int, int]] = []
        next_seen: set[tuple[int, int]] = set()
        for cell in frontier:
            next_distance = distance[cell] + 1
            for neighbor in _neighbors(cell, width, height):
                if neighbor in blocked:
                    continue
                if neighbor not in distance:
                    distance[neighbor] = next_distance
                    parents_mut[neighbor] = [cell]
                    path_count[neighbor] = path_count[cell]
                    if neighbor not in next_seen:
                        next_seen.add(neighbor)
                        next_frontier.append(neighbor)
                elif distance[neighbor] == next_distance:
                    if cell not in parents_mut[neighbor]:
                        parents_mut[neighbor].append(cell)
                        path_count[neighbor] = path_count.get(neighbor, 0) + path_count[cell]
        if next_frontier:
            next_frontier.sort(key=lambda c: (c[1], c[0]))
            layers.append(next_frontier)
        frontier = next_frontier

    parents = {cell: tuple(values) for cell, values in parents_mut.items()}
    reachable = goal in distance
    route = _representative_path(goal, start, parents) if reachable else []
    shortest_steps = distance.get(goal)
    shortest_path_count = int(path_count.get(goal, 0)) if reachable else 0

    obstacle_oracles = [
        {
            "oracle_id": f"obstacle:{x}:{y}",
            "type": "drawn_obstacle",
            "logic": f"position != ({x},{y})",
            "cell": [x, y],
        }
        for x, y in sorted(blocked, key=lambda c: (c[1], c[0]))
    ]
    structural_oracles = [
        {"oracle_id": "grid:bounds", "type": "structural", "logic": f"0 <= x < {width} AND 0 <= y < {height}"},
        {"oracle_id": "motion:adjacent", "type": "structural", "logic": "next position must be one orthogonally adjacent cell"},
        {"oracle_id": "goal:reach", "type": "goal", "logic": f"reach ({goal[0]},{goal[1]}) at the minimum coherent depth"},
    ]

    return {
        "status": "ok",
        "engine": "qcds_robotics_parallel_state_emulation_v1",
        "execution": "classical_browser_emulation_of_parallel_logical_route_space",
        "width": width,
        "height": height,
        "start": list(start),
        "goal": list(goal),
        "cell_condition_count": width * height,
        "blocked": [list(cell) for cell in sorted(blocked, key=lambda c: (c[1], c[0]))],
        "oracle_summary": {
            "total": len(structural_oracles) + len(obstacle_oracles),
            "structural": len(structural_oracles),
            "drawn_obstacles": len(obstacle_oracles),
        },
        "oracles": structural_oracles + obstacle_oracles,
        "reachable": reachable,
        "shortest_steps": shortest_steps,
        "shortest_path_count": shortest_path_count,
        "representative_shortest_path": [list(cell) for cell in route],
        "frontier_layers": [[[x, y] for x, y in layer] for layer in layers],
        "visited_state_count": len(distance),
        "qcds_phases": [
            {"number": 1, "name": "Condition Formation", "plain": f"Represent {width * height} possible position Conditions."},
            {"number": 2, "name": "Conditional Evolution", "plain": f"Apply {len(obstacle_oracles)} drawn obstacle oracles plus motion and goal logic."},
            {"number": 3, "name": "Recursive Inference", "plain": "Propagate the complete viable route frontier in parallel until the goal first becomes reachable."},
            {"number": 4, "name": "Truth Alignment", "plain": "Bind the minimum-depth route family without pretending one route is unique when several shortest routes survive."},
        ],
        "route_binding": {
            "minimum_depth": shortest_steps,
            "surviving_shortest_routes": shortest_path_count,
            "representative_route_selected_for_robot_body": bool(route),
            "unique_shortest_route": shortest_path_count == 1,
        },
        "quantum_explanation": (
            "Quantum idea: route alternatives can be represented together and obstacle logic can act as oracles over that space. "
            "This GitHub Pages playground classically emulates the parallel-state logic; it does not claim quantum speedup."
        ),
        "canonical_qcds_spec_modified": False,
    }


def run_robotics_playground_json(payload_json: str) -> str:
    payload = json.loads(payload_json)
    if not isinstance(payload, Mapping):
        raise ValueError("robotics playground payload must be an object")
    return json.dumps(run_robotics_playground(payload), ensure_ascii=False, sort_keys=True)


__all__ = ["run_robotics_playground", "run_robotics_playground_json"]
