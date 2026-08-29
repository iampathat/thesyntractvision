from __future__ import annotations

import json
import threading
from pathlib import Path
from urllib.request import Request, urlopen

from qcds_fabric.living_logical_space import LivingLogicalSpace
from qcds_fabric.living_robot_ui import export_static, living_robot_html
from qcds_fabric.logical_robot_control import LogicalRobotControlPlane
from qcds_fabric.logical_robot_live import create_live_robot_server
from qcds_fabric.logical_space import LogicalBinding
from qcds_fabric.logical_transform import LogicalTransformRule
from qcds_fabric.logical_universe import CsvLogicalUniverseStore


def _seed(root: Path) -> None:
    universes = CsvLogicalUniverseStore(root)
    universes.ensure_reality()
    universes.space("reality").append([
        LogicalBinding("b1", ("alice", "human"), "test", 1.0),
        LogicalBinding("b2", ("bob", "human"), "test", 1.0),
        LogicalBinding("b3", ("fido", "dog"), "test", 1.0),
    ])
    universes.rules("reality").install(LogicalTransformRule(
        "r1", ("human",), ("happy",), "test-rule", provenance={"challenged": True}
    ))


def test_living_projection_is_read_only_and_shows_rules(tmp_path: Path) -> None:
    _seed(tmp_path)
    base = (tmp_path / "logical_space.csv").read_bytes()
    living = LivingLogicalSpace(tmp_path)
    result = living.project()
    assert result["projection_is_not_ontology"] is True
    assert result["counts"] == {"bindings": 3, "logical_terms": 5, "active_rules": 1}
    assert any(edge["kind"] == "rule" and edge["source"] == "human" and edge["target"] == "happy" for edge in result["edges"])
    assert (tmp_path / "logical_space.csv").read_bytes() == base


def test_dialogue_has_zero_truth_effect_and_does_not_mutate_reality(tmp_path: Path) -> None:
    _seed(tmp_path)
    base = (tmp_path / "logical_space.csv").read_bytes()
    control = LogicalRobotControlPlane(tmp_path)
    result = control.submit_event("dialogue", {"text": "What color is the car?"})
    assert result["truth_effect"] == 0
    assert result["query"]["subject"] == "car"
    assert (tmp_path / "logical_space.csv").read_bytes() == base


def test_multiple_modes_can_be_active_and_human_goal_becomes_frontier_not_truth(tmp_path: Path) -> None:
    _seed(tmp_path)
    control = LogicalRobotControlPlane(tmp_path)
    for mode in ("dialogue", "public_web", "explore_domains", "build_own_frontier"):
        control.set_mode(mode, True)
    result = control.submit_event("explore_domain", {"text": "quantum biology", "priority": 7})
    assert result["status"] == "pending"
    assert result["goal"] == "quantum biology"
    state = control.state()
    assert all(state["modes"][mode] for mode in ("dialogue", "public_web", "explore_domains", "build_own_frontier"))
    assert state["frontier"]["pending"] == 1
    assert not (tmp_path / "logical_space.csv").read_text().casefold().count("quantum biology")


def test_robot_can_extend_its_frontier_from_its_own_unresolved_event(tmp_path: Path) -> None:
    control = LogicalRobotControlPlane(tmp_path)
    control.events.emit("awaiting_identifying_evidence", {"missing": "contrast"}, mission_id="m1")
    created = control.derive_frontier_from_events()
    assert created == 1
    item = control.frontier()[0]
    assert item.source == "logical_robot"
    assert "Acquire missing identifying evidence" in item.goal
    assert item.payload["origin_event_type"] == "awaiting_identifying_evidence"
    assert control.derive_frontier_from_events() == 0


def test_static_manifest_is_explicitly_recorded_not_fake_live(tmp_path: Path) -> None:
    html = living_robot_html(static_mode=True)
    assert "RECORDED VERIFIED PROOF" in html
    assert "Living Logical Space" in html
    target = export_static(tmp_path / "index.html")
    assert target.exists()
    assert "__QCDS_STATIC__" not in target.read_text(encoding="utf-8")


def test_live_http_surface_exposes_space_control_and_input_without_core_mutation(tmp_path: Path) -> None:
    _seed(tmp_path)
    base = (tmp_path / "logical_space.csv").read_bytes()
    server = create_live_robot_server(store_root=tmp_path, host="127.0.0.1", port=0)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    host, port = server.server_address
    try:
        health = json.loads(urlopen(f"http://{host}:{port}/api/health", timeout=3).read())
        assert health["status"] == "ok"
        space = json.loads(urlopen(f"http://{host}:{port}/api/space", timeout=3).read())
        assert space["counts"]["bindings"] == 3
        request = Request(
            f"http://{host}:{port}/api/input",
            data=json.dumps({"kind": "dialogue", "payload": {"text": "What color is the car?"}}).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        response = json.loads(urlopen(request, timeout=3).read())
        assert response["truth_effect"] == 0
        control = json.loads(urlopen(f"http://{host}:{port}/api/control", timeout=3).read())
        assert control["modes"]["dialogue"] is True
        assert (tmp_path / "logical_space.csv").read_bytes() == base
    finally:
        service = getattr(server, "qcds_service")
        service.close()
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
