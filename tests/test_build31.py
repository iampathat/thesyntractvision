from __future__ import annotations

import json
import threading
from pathlib import Path
from urllib.request import urlopen

from qcds_fabric.learning_moment import LearningMomentView, recorded_verified_learning_moment
from qcds_fabric.living_robot_learning import living_robot_learning_html
from qcds_fabric.logical_robot_live import create_live_robot_server
from qcds_fabric.logical_space import LogicalBinding
from qcds_fabric.logical_transform import LogicalTransformRule
from qcds_fabric.logical_universe import CsvLogicalUniverseStore


def _seed_promoted_logic(root: Path) -> None:
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


def _append_discovery_audit(root: Path) -> None:
    payload = {
        "mission_id": "build31-test-mission",
        "status": "expanded",
        "oracle_gap_count": 1,
        "rival_hypothesis_count": 12,
        "robot_observation_count": 3,
        "robot_source_ids": ["source-a", "source-b", "source-c"],
        "challenge_case_count": 3,
        "selection_case_count": 2,
        "holdout_case_count": 1,
        "provenance": {
            "manual_challenge_supplied": False,
            "robot_received_expected_answers": False,
        },
        "reality_result": {
            "oracle_hypothesis_count": 12,
            "oracle_rejected_count": 9,
            "oracle_promoted_count": 1,
            "before_probe_count": 0,
            "after_probe_count": 2,
            "knowledge_gain": 2,
            "base_space_unchanged_by_derived_logic": True,
            "governed_rule_outcomes": [{
                "logical_rule_id": "human-happy",
                "active": True,
                "status": "promoted_to_reality",
                "changed_bindings": 2,
                "changed_fraction": 2 / 3,
                "blast_override": False,
            }],
        },
    }
    with (root / "reality_discovery_history.jsonl").open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload, sort_keys=True) + "\n")


def test_learning_moment_links_actual_discovery_without_mutating_reality(tmp_path: Path) -> None:
    _seed_promoted_logic(tmp_path)
    _append_discovery_audit(tmp_path)
    base_before = (tmp_path / "logical_space.csv").read_bytes()
    rules_before = (tmp_path / "logical_rules.csv").read_bytes()
    audit_before = (tmp_path / "reality_discovery_history.jsonl").read_bytes()

    result = LearningMomentView(tmp_path).snapshot()

    assert result["status"] == "learned"
    assert result["headline"] == "THE LOGICAL ROBOT LEARNED SOMETHING"
    assert result["promotion"]["rule_text"] == "human ⇒ happy"
    assert result["capability_change"]["resolved_bindings_changed"] == 2
    assert result["capability_change"]["added_terms"] == ["happy"]
    assert result["discovery"]["linked"] is True
    assert result["discovery"]["rival_hypotheses"] == 12
    assert result["discovery"]["hypotheses_rejected"] == 9
    assert result["discovery"]["robot_observations"] == 3
    assert result["discovery"]["independent_sources"] == 3
    assert result["discovery"]["governance"]["changed_bindings"] == 2
    assert result["truth_boundary"]["browser_direct_truth_authority"] == 0
    assert (tmp_path / "logical_space.csv").read_bytes() == base_before
    assert (tmp_path / "logical_rules.csv").read_bytes() == rules_before
    assert (tmp_path / "reality_discovery_history.jsonl").read_bytes() == audit_before


def test_learning_moment_does_not_invent_discovery_metrics(tmp_path: Path) -> None:
    _seed_promoted_logic(tmp_path)

    result = LearningMomentView(tmp_path).snapshot()

    assert result["status"] == "learned"
    assert result["discovery"] == {"linked": False}
    assert result["capability_change"]["resolved_bindings_changed"] == 2


def test_empty_reality_does_not_claim_live_learning(tmp_path: Path) -> None:
    result = LearningMomentView(tmp_path).snapshot()

    assert result["status"] == "no_promoted_logic"
    assert result["learning_id"] is None
    assert result["promotion"] is None
    assert result["truth_boundary"]["browser_direct_truth_authority"] == 0


def test_build31_live_api_exposes_learning_without_new_truth_endpoint(tmp_path: Path) -> None:
    _seed_promoted_logic(tmp_path)
    _append_discovery_audit(tmp_path)
    server = create_live_robot_server(store_root=tmp_path, host="127.0.0.1", port=0)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    host, port = server.server_address
    try:
        page = urlopen(f"http://{host}:{port}/", timeout=3).read().decode("utf-8")
        learning = json.loads(urlopen(f"http://{host}:{port}/api/learning", timeout=3).read())
        state = json.loads(urlopen(f"http://{host}:{port}/api/state", timeout=3).read())
        assert "THE LOGICAL ROBOT LEARNED SOMETHING" in page
        assert "SHOW IT IN LOGICAL SPACE" in page
        assert "/api/learning" in page
        assert "/api/promote" not in page
        assert "/api/rule/install" not in page
        assert learning["promotion"]["rule_id"] == "human-happy"
        assert learning["discovery"]["hypotheses_rejected"] == 9
        assert 31 in state["provenance"]["builds"]
        assert state["provenance"]["builds"][-1] >= 31
    finally:
        service = getattr(server, "qcds_service")
        service.close()
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)


def test_static_learning_experience_is_explicitly_recorded_and_matches_live_web_proof() -> None:
    proof = recorded_verified_learning_moment()
    html = living_robot_learning_html(static_mode=True)

    assert proof["promotion"]["rule_text"] == "france ⇒ paris"
    assert proof["provenance"]["proof_run"] == 33236672283
    assert "RECORDED VERIFIED PROOF" in html
    assert "THE LOGICAL ROBOT LEARNED SOMETHING" in html
    assert "france ⇒ paris" in html
    assert "rival hypotheses evaluated" in html
    assert "UI direct truth authority" in html
    assert "WHY THIS LOGIC?" in html
    assert "SHOW IT IN LOGICAL SPACE" in html
    assert "BUILD ON THIS" in html
    assert "build31LastLearningId" in html
    assert "classList.add('fresh')" in html
