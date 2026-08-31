from __future__ import annotations

import json

from qcds_fabric.living_robot_public import living_robot_public_html
from qcds_fabric.robotics_playground_system import run_robotics_playground_system_json


def test_robotics_exposes_other_surviving_shortest_routes_from_same_qcds_family() -> None:
    result = json.loads(
        run_robotics_playground_system_json(
            json.dumps(
                {
                    "width": 6,
                    "height": 4,
                    "start": [0, 0],
                    "goal": [4, 2],
                    "blocked": [],
                }
            )
        )
    )

    alternatives = result["alternative_shortest_paths"]
    assert result["qcds_core_execution"] is True
    assert result["separate_pathfinder"] is False
    assert result["alternative_routes_are_new_inference"] is False
    assert result["alternative_routes_source"] == "same_qcds_frontier_family"
    assert 1 <= len(alternatives) <= 8

    representative = result["representative_shortest_path"]
    for path in alternatives:
        assert path != representative
        assert path[0] == result["start"]
        assert path[-1] == result["goal"]
        assert len(path) == result["shortest_steps"] + 1
        for left, right in zip(path, path[1:]):
            assert abs(left[0] - right[0]) + abs(left[1] - right[1]) == 1


def test_public_robotics_draws_and_fades_up_to_eight_qcds_route_family_members() -> None:
    html = living_robot_public_html(static_mode=True)

    assert "BUILD 81" in html
    assert "alternative_shortest_paths" in html
    assert "alternativeRoutes.slice(0,8)" in html
    assert "ctx.setLineDash" in html
    assert "Q75.altRouteAlpha=.34" in html
    assert "const fadeMs=2600" in html
    assert "other surviving shortest routes · briefly visible" in html
    assert "q81StartAlternativeFade" in html
