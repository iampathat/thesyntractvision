from __future__ import annotations

import json
from dataclasses import dataclass
from math import ceil, log2
from typing import Any, Mapping, Sequence

from .fabric import FabricLayer
from .models import BaseBundle, ChannelView, State, Syntract, TruthDistribution
from .oracles import DistributionOracle, ExactOracle, OracleStack


DEFAULT_WIDTH = 20
DEFAULT_HEIGHT = 12
DEFAULT_START = (1, 6)
DEFAULT_GOAL = (18, 6)
_EPSILON = 1e-15


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


def _index(cell: tuple[int, int], width: int) -> int:
    return cell[1] * width + cell[0]


def _cell_from_index(index: int, width: int) -> tuple[int, int]:
    return index % width, index // width


def _state_for_index(index: int, bit_count: int) -> State:
    return tuple((index >> shift) & 1 for shift in reversed(range(bit_count)))


def _target_for_index(index: int, dimension_ids: tuple[str, ...]) -> dict[str, int]:
    state = _state_for_index(index, len(dimension_ids))
    return dict(zip(dimension_ids, state))


def _matching_indices(view: ChannelView, state: State, *, bit_count: int) -> tuple[int, ...]:
    active = view.state_as_mapping(state)
    dimension_ids = view.base_bundle.dimension_ids
    matches: list[int] = []
    for index in range(1 << bit_count):
        encoded = _state_for_index(index, bit_count)
        if all(encoded[position] == active[dimension_id] for position, dimension_id in enumerate(dimension_ids) if dimension_id in active):
            matches.append(index)
    return tuple(matches)


@dataclass(frozen=True)
class ValidPositionOracle:
    oracle_id: str
    cell_count: int

    def is_applicable(self, view: ChannelView) -> bool:
        return bool(view.active_dimension_ids())

    def score(self, view: ChannelView, state: State) -> float:
        matches = _matching_indices(view, state, bit_count=view.base_bundle.width)
        if not matches:
            return 0.0
        return sum(1.0 for index in matches if index < self.cell_count) / len(matches)


@dataclass(frozen=True)
class BlockedPositionOracle:
    oracle_id: str
    blocked_index: int

    def is_applicable(self, view: ChannelView) -> bool:
        return bool(view.active_dimension_ids())

    def score(self, view: ChannelView, state: State) -> float:
        matches = _matching_indices(view, state, bit_count=view.base_bundle.width)
        if not matches:
            return 0.0
        return sum(0.0 if index == self.blocked_index else 1.0 for index in matches) / len(matches)


@dataclass(frozen=True)
class AdjacentDistributionOracle:
    """Recursive QCDS re-entry: score next positions from the previous TruthDistribution.

    This is the route-space equivalent of carrying a complete distribution into
    a later pass. It never chooses a path itself. Every candidate position in
    the current 2^n state space is scored by probability mass in adjacent source
    positions from the previous QCDS distribution.
    """

    oracle_id: str
    width: int
    height: int
    source_probabilities: Mapping[int, float]

    def is_applicable(self, view: ChannelView) -> bool:
        return bool(view.active_dimension_ids())

    def _score_index(self, index: int) -> float:
        if not 0 <= index < self.width * self.height:
            return 0.0
        cell = _cell_from_index(index, self.width)
        return sum(
            float(self.source_probabilities.get(_index(neighbor, self.width), 0.0))
            for neighbor in _neighbors(cell, self.width, self.height)
        )

    def score(self, view: ChannelView, state: State) -> float:
        matches = _matching_indices(view, state, bit_count=view.base_bundle.width)
        if not matches:
            return 0.0
        return sum(self._score_index(index) for index in matches) / len(matches)


def _baseline_view(bundle: BaseBundle, stack: OracleStack, fabric: FabricLayer) -> ChannelView:
    return ChannelView.transformed(
        bundle,
        oracle_stack_version=stack.identity,
        oracle_ids=stack.oracle_ids,
        substrate_target=fabric.substrate_id,
        transformation_provenance={"rotation": "none", "axes": ()},
    )


def _probabilities_by_index(distribution: TruthDistribution, cell_count: int) -> dict[int, float]:
    resolved: dict[int, float] = {}
    bit_count = len(distribution.support[0]) if distribution.support else 0
    for state, probability in zip(distribution.support, distribution.probabilities):
        if probability <= _EPSILON:
            continue
        index = 0
        for value in state:
            if value not in (0, 1):
                index = -1
                break
            index = (index << 1) | value
        if 0 <= index < cell_count:
            resolved[index] = float(probability)
    return resolved


def _frontier_cells(distribution: TruthDistribution, width: int, height: int) -> list[tuple[int, int]]:
    cell_count = width * height
    return [
        _cell_from_index(index, width)
        for index in sorted(_probabilities_by_index(distribution, cell_count))
    ]


def _route_graph(layers: Sequence[Sequence[tuple[int, int]]], width: int, height: int):
    parent_layers: list[dict[tuple[int, int], tuple[tuple[int, int], ...]]] = [{}]
    path_counts: dict[tuple[int, int], int] = {layers[0][0]: 1} if layers and layers[0] else {}
    for depth in range(1, len(layers)):
        previous = set(layers[depth - 1])
        parents: dict[tuple[int, int], tuple[tuple[int, int], ...]] = {}
        next_counts: dict[tuple[int, int], int] = {}
        for cell in layers[depth]:
            candidates = tuple(neighbor for neighbor in _neighbors(cell, width, height) if neighbor in previous)
            parents[cell] = candidates
            next_counts[cell] = sum(path_counts.get(parent, 0) for parent in candidates)
        parent_layers.append(parents)
        path_counts = next_counts
    return parent_layers, path_counts


def _representative_path(
    goal: tuple[int, int],
    start: tuple[int, int],
    parent_layers: Sequence[Mapping[tuple[int, int], tuple[tuple[int, int], ...]]],
) -> list[tuple[int, int]]:
    if goal == start:
        return [start]
    current = goal
    path = [goal]
    previous_direction: tuple[int, int] | None = None
    for depth in range(len(parent_layers) - 1, 0, -1):
        options = list(parent_layers[depth].get(current, ()))
        if not options:
            return []
        if previous_direction is None:
            parent = min(options, key=lambda p: (abs(p[1] - start[1]), abs(p[0] - start[0]), p[1], p[0]))
        else:
            def key(parent: tuple[int, int]):
                direction = (current[0] - parent[0], current[1] - parent[1])
                return (0 if direction == previous_direction else 1, abs(parent[1] - start[1]), parent[1], parent[0])
            parent = min(options, key=key)
        previous_direction = (current[0] - parent[0], current[1] - parent[1])
        current = parent
        path.append(current)
    path.reverse()
    return path if path and path[0] == start else []


def run_robotics_playground(
    payload: Mapping[str, Any] | None = None,
    *,
    fabric_layer: FabricLayer | None = None,
) -> dict[str, Any]:
    """Run the public robot body through the actual QCDS Fabric inference path.

    Position is binary-encoded into a bounded 2^n Logical Space. Recursive
    inference re-enters the complete previous TruthDistribution through an
    adjacency oracle. Drawn obstacles are explicit oracle constraints. The
    first recursive depth at which the goal receives support is therefore the
    minimum represented route depth. UI animation and representative-path
    selection happen only after QCDS has produced the route-space distributions.
    """

    payload = dict(payload or {})
    width = int(payload.get("width", DEFAULT_WIDTH))
    height = int(payload.get("height", DEFAULT_HEIGHT))
    cell_count = width * height
    if width < 4 or height < 4 or cell_count > 600:
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

    fabric = fabric_layer or FabricLayer()
    bit_count = max(1, ceil(log2(cell_count)))
    dimension_ids = tuple(f"position:b{index}" for index in range(bit_count))
    bundle = BaseBundle(
        bundle_id="robotics:position-space",
        dimension_ids=dimension_ids,
        values=("?",) * bit_count,
        provenance={
            "source": "RoboticsPlayground",
            "binary_position_encoding": True,
            "cell_count": cell_count,
        },
        semantic_domain={"domain": "robotics", "representation": "grid_position"},
    )

    blocked_oracles = tuple(
        BlockedPositionOracle(
            oracle_id=f"obstacle:{x}:{y}",
            blocked_index=_index((x, y), width),
        )
        for x, y in sorted(blocked, key=lambda cell: (cell[1], cell[0]))
    )
    validity = ValidPositionOracle("position:valid", cell_count)

    start_stack = OracleStack(
        stack_id="robotics-route-start",
        version="1",
        oracles=(validity, *blocked_oracles, ExactOracle("position:start", _target_for_index(_index(start, width), dimension_ids))),
    )
    current = fabric.kernel.run(_baseline_view(bundle, start_stack, fabric), start_stack)
    layers: list[list[tuple[int, int]]] = [_frontier_cells(current, width, height)]
    distributions: list[TruthDistribution] = [current]
    active_stack = start_stack
    reached = goal in layers[0]

    max_depth = cell_count
    depth = 0
    while not reached and depth < max_depth:
        source = _probabilities_by_index(current, cell_count)
        transition = AdjacentDistributionOracle(
            oracle_id=f"transition:depth:{depth + 1}",
            width=width,
            height=height,
            source_probabilities=source,
        )
        active_stack = OracleStack(
            stack_id="robotics-route-recursive",
            version=f"1.{depth + 1}",
            oracles=(validity, *blocked_oracles, transition),
        )
        candidate = fabric.kernel.run(_baseline_view(bundle, active_stack, fabric), active_stack)
        if not candidate.raw_scores or max(candidate.raw_scores) <= _EPSILON:
            break
        current = candidate
        distributions.append(current)
        frontier = _frontier_cells(current, width, height)
        if not frontier:
            break
        layers.append(frontier)
        depth += 1
        reached = goal in frontier

    shortest_steps = len(layers) - 1 if reached else None
    parent_layers, path_counts = _route_graph(layers, width, height)
    shortest_path_count = int(path_counts.get(goal, 0)) if reached else 0
    route = _representative_path(goal, start, parent_layers) if reached else []

    final_syntract: Syntract | None = None
    truth_alignment_distribution: TruthDistribution | None = None
    if reached:
        carried = DistributionOracle(
            oracle_id="route:distribution-reentry",
            dimension_ids=dimension_ids,
            probabilities={state: probability for state, probability in zip(current.support, current.probabilities)},
        )
        goal_oracle = ExactOracle("goal:reach", _target_for_index(_index(goal, width), dimension_ids))
        alignment_stack = OracleStack(
            stack_id="robotics-route-alignment",
            version="1",
            oracles=(validity, *blocked_oracles, carried, goal_oracle),
        )
        suite = fabric.run_stabilized_rotation_suite(
            bundle,
            alignment_stack,
            include_positional=False,
            include_oracle_exposure=False,
            include_crossed=False,
        )
        truth_alignment_distribution = suite.stabilized_return.stabilized_distribution
        final_syntract = Syntract(
            syntract_id="syntract:robotics:route",
            bound_distribution=truth_alignment_distribution,
            evidence_provenance={
                "source": "RoboticsPlayground",
                "recursive_depth": shortest_steps,
                "drawn_obstacle_oracles": len(blocked_oracles),
                "qcds_fabric_substrate": fabric.substrate_id,
            },
            contradiction_provenance=truth_alignment_distribution.contradiction_markers,
            composition_provenance={
                "distribution_reentry": True,
                "route_family_count": shortest_path_count,
                "representative_route_is_body_manifestation": True,
            },
        )

    obstacle_manifest = [
        {
            "oracle_id": oracle.oracle_id,
            "type": "drawn_obstacle",
            "logic": f"position != ({cell[0]},{cell[1]})",
            "cell": [cell[0], cell[1]],
        }
        for oracle, cell in zip(blocked_oracles, sorted(blocked, key=lambda item: (item[1], item[0])))
    ]

    return {
        "status": "ok",
        "engine": "qcds_robotics_recursive_distribution_reentry_v2",
        "execution": "SyntractSystem -> FabricLayer -> QCDS inference substrate -> TruthDistribution re-entry",
        "qcds_core_execution": True,
        "separate_pathfinder": False,
        "browser_precomputed_route": False,
        "substrate_id": fabric.substrate_id,
        "width": width,
        "height": height,
        "start": list(start),
        "goal": list(goal),
        "logical_width": bit_count,
        "candidate_binary_space": f"2^{bit_count}",
        "position_state_capacity": 1 << bit_count,
        "cell_condition_count": cell_count,
        "blocked": [list(cell) for cell in sorted(blocked, key=lambda item: (item[1], item[0]))],
        "oracle_summary": {
            "active_last_recursive_pass": len(active_stack.oracles),
            "structural": 2,
            "drawn_obstacles": len(blocked_oracles),
            "goal_alignment_oracles": 2 if reached else 0,
        },
        "oracles": [
            {"oracle_id": "position:valid", "type": "structural", "logic": f"binary position code < {cell_count}"},
            {"oracle_id": "transition:recursive", "type": "structural", "logic": "next position receives support only from adjacent mass in the previous QCDS TruthDistribution"},
            *obstacle_manifest,
            {"oracle_id": "goal:reach", "type": "truth_alignment", "logic": f"bind goal ({goal[0]},{goal[1]}) at the first recursive depth with support"},
        ],
        "reachable": reached,
        "shortest_steps": shortest_steps,
        "shortest_path_count": shortest_path_count,
        "representative_shortest_path": [list(cell) for cell in route],
        "frontier_layers": [[[x, y] for x, y in layer] for layer in layers],
        "recursive_qcds_passes": len(distributions),
        "visited_state_count": len({cell for layer in layers for cell in layer}),
        "qcds_phases": [
            {"number": 1, "name": "Condition Formation", "plain": f"Encode {cell_count} positions inside {bit_count} binary Conditions ({1 << bit_count} possible states)."},
            {"number": 2, "name": "Conditional Evolution", "plain": f"Apply validity, adjacency re-entry and {len(blocked_oracles)} drawn obstacle oracle constraints."},
            {"number": 3, "name": "Recursive Inference", "plain": f"Re-enter the complete TruthDistribution across {len(distributions)} QCDS passes until B first receives support."},
            {"number": 4, "name": "Truth Alignment", "plain": "Re-enter the terminal distribution with the goal oracle and bind the aligned result as a Syntract without claiming the representative body route is unique."},
        ],
        "route_binding": {
            "minimum_depth": shortest_steps,
            "surviving_shortest_routes": shortest_path_count,
            "representative_route_selected_for_robot_body": bool(route),
            "unique_shortest_route": shortest_path_count == 1,
            "syntract_id": final_syntract.syntract_id if final_syntract else None,
        },
        "quantum_explanation": (
            f"The represented position space is {bit_count} binary Conditions = 2^{bit_count} candidate states. "
            "Each recursive QCDS pass evaluates that whole bounded state space against the active oracle logic, and the complete TruthDistribution re-enters the next pass. "
            "This browser uses the classical QCDS reference substrate; a quantum substrate would preserve the same logical contract without this being a claim of quantum speedup."
        ),
        "canonical_qcds_spec_modified": False,
        "single_qcds_architecture": True,
    }


def run_robotics_playground_json(payload_json: str) -> str:
    payload = json.loads(payload_json)
    if not isinstance(payload, Mapping):
        raise ValueError("robotics playground payload must be an object")
    # Import lazily so the body depends on the unified system boundary without a
    # module-import cycle: SyntractSystem delegates back with its shared FabricLayer.
    from .syntract_system import SyntractSystem

    result = SyntractSystem().run_robotics_playground(payload)
    return json.dumps(result, ensure_ascii=False, sort_keys=True)


__all__ = ["run_robotics_playground", "run_robotics_playground_json"]
