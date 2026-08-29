from __future__ import annotations

import json
import threading
from pathlib import Path
from urllib.request import urlopen

from qcds_fabric.intelligence_growth import IntelligenceGrowthView
from qcds_fabric.living_robot_ui import living_robot_html
from qcds_fabric.logical_robot_live import create_live_robot_server
from qcds_fabric.logical_space import LogicalBinding
from qcds_fabric.logical_transform import LogicalTransformRule
from qcds_fabric.logical_universe import CsvLogicalUniverseStore


def _seed_growth(root: Path) -> None:
    universes = CsvLogicalUniverseStore(root)
    universes.ensure_reality()
    universes.space("reality").append([
        LogicalBinding("alice-1", ("alice", "human"), "observation:a", 1.0),
        LogicalBinding("bob-1", ("bob", "human"), "observation:b", 1.0),
        LogicalBinding("fido-1", ("fido", "dog"), "observation:c", 1.0),
    ])
    universes.rules("reality").install(LogicalTransformRule(
        "human-happy",
        ("human",),
        ("happy",),
        "qcds:test:challenged",
        provenance={"challenge_passed": True, "external_truth_claim": False},
    ))


def test_growth_view_shows_actual_before_after_without_mutating_base(tmp_path: Path) -> None:
    _seed_growth(tmp_path)
    base_before = (tmp_path / "logical_space.csv").read_bytes()
    rules_before = (tmp_path / "logical_rules.csv").read_bytes()

    result = IntelligenceGrowthView(tmp_path).snapshot()

    assert result["stage_counts"]["observed_base_bindings"] == 3
    assert result["stage_counts"]["active_governed_rules"] == 1
    assert result["latest_promotion"]["rule_text"] == "human ⇒ happy"
    assert result["latest_promotion"]["resolved_bindings_changed"] == 2
    assert result["latest_promotion"]["new_resolved_term_instances"] == 2
    assert all("happy" not in row["before"] for row in result["latest_promotion"]["examples"])
    assert all("happy" in row["after"] for row in result["latest_promotion"]["examples"])
    assert (tmp_path / "logical_space.csv").read_bytes() == base_before
    assert (tmp_path / "logical_rules.csv").read_bytes() == rules_before
    assert result["provenance"]["read_only_manifestation"] is True


def test_growth_endpoint_is_live_and_read_only(tmp_path: Path) -> None:
    _seed_growth(tmp_path)
    base_before = (tmp_path / "logical_space.csv").read_bytes()
    server = create_live_robot_server(store_root=tmp_path, host="127.0.0.1", port=0)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    host, port = server.server_address
    try:
        growth = json.loads(urlopen(f"http://{host}:{port}/api/growth", timeout=3).read())
        health = json.loads(urlopen(f"http://{host}:{port}/api/health", timeout=3).read())
        assert health["status"] == "ok"
        assert growth["latest_promotion"]["rule_id"] == "human-happy"
        assert growth["before_after"]["resolved_bindings_changed"] == 2
        assert (tmp_path / "logical_space.csv").read_bytes() == base_before
    finally:
        service = getattr(server, "qcds_service")
        service.close()
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)


def test_manifest_centers_promoted_logic_and_one_step_execution() -> None:
    html = living_robot_html(static_mode=False)
    assert "INTELLIGENCE GROWTH" in html
    assert "NEW LOGIC PROMOTED" in html
    assert "RUN NEXT FRONTIER STEP" in html
    assert "Before → after intelligence" in html
    assert "Observation" in html and "Candidate logic" in html and "Promoted logic" in html
    assert "/api/growth" in html
    assert "/api/process-one" in html
    assert "Human text and web sources remain input/evidence" in html


def test_static_manifest_shows_verified_logic_growth_not_fake_live() -> None:
    html = living_robot_html(static_mode=True)
    assert "RECORDED VERIFIED PROOF" in html
    assert "france ⇒ paris" in html
    assert "resolved_bindings_changed:2" in html
    assert "new_resolved_term_instances:2" in html
    assert "verified-build24-proof" in html
