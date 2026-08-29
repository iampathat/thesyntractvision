from __future__ import annotations

import json
import threading
from pathlib import Path
from urllib.request import Request, urlopen

from qcds_fabric.living_robot_session import living_robot_session_html
from qcds_fabric.logical_robot_live35 import create_live_robot_server
from qcds_fabric.logical_space import LogicalBinding
from qcds_fabric.logical_universe import CsvLogicalUniverseStore
from qcds_fabric.session_sandbox_core import normalize_session_request, run_session


def _space() -> dict[str, object]:
    return {
        "domain_id": "battery-aging",
        "title": "Battery Aging",
        "tagline": "Open battery space.",
        "audience": "Battery researchers",
        "universe_mode": "simulation",
        "description": "A generic logical room for battery observations.",
        "challenge": "What capacity state is best supported?",
        "learning_target": "Distinguish low from high capacity without a supplied solution rule.",
        "explore_prompt": "Explore the represented battery conditions.",
        "observations": [
            {
                "binding_id": "battery-aging-001",
                "terms": ["cell-001", "temperature-high", "capacity-low"],
                "source_id": "user:battery-aging:001",
                "confidence": 1.0,
            },
            {
                "binding_id": "battery-aging-002",
                "terms": ["cell-002", "temperature-low", "capacity-high"],
                "source_id": "user:battery-aging:002",
                "confidence": 1.0,
            },
        ],
        "starter_rules": [],
        "truth_boundary": {
            "external_truth_claim": False,
            "solution_rule_supplied": False,
            "starting_lab_modifies_reality": False,
        },
    }


def _request() -> dict[str, object]:
    return {
        "space": _space(),
        "probe": {
            "subject": "cell-001",
            "predicate": "capacity",
            "candidate_values": ["low", "high"],
        },
        "evidence": [
            {
                "subject": "cell-001",
                "predicate": "capacity",
                "value": "low",
                "source_id": "session:explicit:001",
                "confidence": 0.95,
                "polarity": True,
            }
        ],
        "max_width": 20,
    }


def _post(url: str, payload: dict[str, object]) -> dict[str, object]:
    request = Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"content-type": "application/json"},
        method="POST",
    )
    return json.loads(urlopen(request, timeout=5).read())


def test_session_request_preserves_explicit_semantic_boundary() -> None:
    normalized = normalize_session_request(_request())

    assert normalized["space"]["starter_rules"] == []
    assert len(normalized["space"]["observations"]) == 2
    assert len(normalized["evidence"]) == 1
    assert normalized["probe"]["candidate_values"] == ("low", "high")


def test_session_core_runs_existing_problem_to_syntract_without_persistence() -> None:
    result = run_session(_request())

    assert result["status"] == "ok"
    assert result["session_only"] is True
    assert result["persistent_state"] is False
    assert result["database_used"] is False
    assert result["logical_robot_to_core"] is True
    assert result["core_execution"] == "qcds_fabric.problem.problem_to_syntract"
    assert result["truth_effect_on_reality"] == 0
    assert result["answer_is_external_truth_claim"] is False
    assert result["canonical_spec_modified"] is False
    assert result["generic_binding_count"] == 2
    assert result["generic_bindings_promoted_to_semantic_evidence"] == 0
    assert result["explicit_evidence_count"] == 1
    assert result["logical_width"] == 2
    assert result["candidate_binary_space"] == "2^2"
    probabilities = {row["value"]: row["probability"] for row in result["stabilized"]}
    assert probabilities["low"] > probabilities["high"]
    assert result["leading_candidates"] == ["low"]


def test_public_html_is_session_only_and_uses_wasm_as_transport_substrate() -> None:
    html = living_robot_session_html(static_mode=True)

    assert "BUILD 35 · EPHEMERAL LOGICAL SPACE SANDBOX" in html
    assert "RUN QCDS CORE" in html
    assert "SESSION · WASM CORE" in html
    assert "sessionStorage" in html
    assert "session_core_worker.js" in html
    assert "qcds_fabric.zip" in html
    assert "/api/session/run" in living_robot_session_html(static_mode=False)
    assert "localStorage" not in html
    assert "indexedDB" not in html
    assert "document.cookie" not in html
    assert "generic bindings used as semantic evidence" in html


def test_live_session_endpoint_runs_core_without_touching_reality(tmp_path: Path) -> None:
    universes = CsvLogicalUniverseStore(tmp_path)
    universes.ensure_reality()
    universes.space("reality").append(
        [LogicalBinding("reality-001", ("observed", "control"), "control:source", 1.0)]
    )
    reality_before = (tmp_path / "logical_space.csv").read_bytes()

    server = create_live_robot_server(store_root=tmp_path, host="127.0.0.1", port=0)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    host, port = server.server_address
    base = f"http://{host}:{port}"
    try:
        result = _post(base + "/api/session/run", _request())
        state = json.loads(urlopen(base + "/api/state", timeout=5).read())
        page = urlopen(base + "/", timeout=5).read().decode("utf-8")

        assert result["leading_candidates"] == ["low"]
        assert result["truth_effect_on_reality"] == 0
        assert (tmp_path / "logical_space.csv").read_bytes() == reality_before
        assert 35 in state["provenance"]["builds"]
        assert state["provenance"]["public_session_sandbox"] is True
        assert state["provenance"]["session_persistence"] is False
        assert state["provenance"]["qcds_core_duplicated_in_client"] is False
        assert "SESSION · PYTHON CORE" in page
    finally:
        service = getattr(server, "qcds_service")
        service.close()
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
