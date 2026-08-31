from pathlib import Path

from qcds_fabric.living_robot_public import PUBLIC_BUILD, living_robot_public_html
from qcds_fabric.robotics_playground import run_robotics_playground


def test_robotics_playground_reacts_to_drawn_obstacle_oracles():
    base = run_robotics_playground({"width": 20, "height": 12, "start": [1, 6], "goal": [18, 6], "blocked": []})
    assert base["reachable"] is True
    assert base["shortest_steps"] == 17
    assert base["shortest_path_count"] == 1
    assert base["oracle_summary"] == {"total": 3, "structural": 3, "drawn_obstacles": 0}

    changed = run_robotics_playground({"width": 20, "height": 12, "start": [1, 6], "goal": [18, 6], "blocked": [[9, 6]]})
    assert changed["reachable"] is True
    assert changed["shortest_steps"] == 19
    assert changed["shortest_path_count"] > 1
    assert changed["oracle_summary"]["drawn_obstacles"] == 1
    assert any(o["oracle_id"] == "obstacle:9:6" and o["logic"] == "position != (9,6)" for o in changed["oracles"])
    assert changed["execution"] == "classical_browser_emulation_of_parallel_logical_route_space"
    assert changed["canonical_qcds_spec_modified"] is False


def test_robotics_playground_can_preserve_no_route_instead_of_inventing_one():
    wall = [[9, y] for y in range(12)]
    result = run_robotics_playground({"width": 20, "height": 12, "start": [1, 6], "goal": [18, 6], "blocked": wall})
    assert result["reachable"] is False
    assert result["shortest_steps"] is None
    assert result["shortest_path_count"] == 0
    assert result["representative_shortest_path"] == []


def test_public_surface_has_top_level_robotics_playground_and_python_worker_route():
    html = living_robot_public_html(static_mode=True)
    worker = Path("web/session_core_worker.js").read_text(encoding="utf-8")
    assert int(PUBLIC_BUILD) >= 75
    assert 'data-public-view="robotics"' in html
    assert "ROBOTICS PLAYGROUND" in html
    assert 'id="public-robotics"' in html
    assert 'id="q75Canvas"' in html
    assert "Draw reality. Watch the robot re-infer the route." in html
    assert "Every drawn cell becomes an explicit obstacle oracle" in html
    assert "classically emulates the same parallel-state logic" in html
    assert "robotics_playground_run" in html
    assert "robotics_playground_run" in worker
    assert "run_robotics_playground_json" in worker
