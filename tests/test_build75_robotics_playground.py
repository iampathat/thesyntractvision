import json
from pathlib import Path

from qcds_fabric.living_robot_public import PUBLIC_BUILD, living_robot_public_html
from qcds_fabric.robotics_playground_system import run_robotics_playground_system_json


def _run(payload):
    return json.loads(run_robotics_playground_system_json(json.dumps(payload)))


def test_robotics_playground_routes_through_qcds_distribution_reentry():
    base = _run({"width": 20, "height": 12, "start": [1, 6], "goal": [18, 6], "blocked": []})
    assert base["reachable"] is True
    assert base["shortest_steps"] == 17
    assert base["shortest_path_count"] == 1
    assert base["logical_width"] == 8
    assert base["candidate_binary_space"] == "2^8"
    assert base["position_state_capacity"] == 256
    assert base["cell_condition_count"] == 240
    assert base["qcds_core_execution"] is True
    assert base["separate_pathfinder"] is False
    assert base["browser_precomputed_route"] is False
    assert base["single_qcds_architecture"] is True
    assert base["system_boundary"] == "SyntractSystem"
    assert base["route_binding"]["syntract_id"] == "syntract:robotics:route"

    changed = _run({"width": 20, "height": 12, "start": [1, 6], "goal": [18, 6], "blocked": [[9, 6]]})
    assert changed["reachable"] is True
    assert changed["shortest_steps"] == 19
    assert changed["shortest_path_count"] >= 2
    assert changed["oracle_summary"]["drawn_obstacles"] == 1
    assert any(o["oracle_id"] == "obstacle:9:6" and o["logic"] == "position != (9,6)" for o in changed["oracles"])


def test_robotics_playground_enters_through_syntract_system_boundary():
    result = _run({
        "width": 20,
        "height": 12,
        "start": [1, 6],
        "goal": [18, 6],
        "blocked": [[9, 6]],
    })
    assert result["system_boundary"] == "SyntractSystem"
    assert result["single_qcds_architecture"] is True
    assert "SyntractSystem.fabric_layer" in result["execution"]
    assert result["qcds_core_execution"] is True


def test_robotics_playground_can_preserve_no_route_instead_of_inventing_one():
    wall = [[9, y] for y in range(12)]
    result = _run({"width": 20, "height": 12, "start": [1, 6], "goal": [18, 6], "blocked": wall})
    assert result["reachable"] is False
    assert result["shortest_steps"] is None
    assert result["shortest_path_count"] == 0
    assert result["representative_shortest_path"] == []


def test_public_surface_has_top_level_robotics_playground_and_python_worker_route():
    html = living_robot_public_html(static_mode=True)
    worker = Path("web/session_core_worker.js").read_text(encoding="utf-8")
    core = Path("src/qcds_fabric/robotics_route_qcds.py").read_text(encoding="utf-8")
    bridge = Path("src/qcds_fabric/robotics_playground_system.py").read_text(encoding="utf-8")
    assert int(PUBLIC_BUILD) >= 77
    assert 'data-public-view="robotics"' in html
    assert "ROBOTICS PLAYGROUND" in html
    assert 'id="public-robotics"' in html
    assert 'id="q75Canvas"' in html
    assert "Draw reality. Watch the robot re-infer the route." in html
    assert "Every drawn cell becomes an explicit obstacle oracle" in html
    assert "8 binary QCDS Conditions" in html
    assert "robotics_playground_run" in html
    assert "robotics_playground_run" in worker
    assert "robotics_playground_system" in worker
    assert "run_robotics_playground_json" in worker
    assert "SyntractSystem" in bridge
    assert "system.fabric_layer" in bridge
    assert "FabricLayer" in core
    assert "AdjacentDistributionOracle" in core
    assert "DistributionOracle" in core
    assert "deque" not in core
