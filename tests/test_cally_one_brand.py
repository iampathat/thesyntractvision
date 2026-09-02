from __future__ import annotations

from pathlib import Path

from qcds_fabric.cally_one import CallyOneService, run_cally_one
from qcds_fabric.cally_one_ui import cally_one_html


def test_cally_one_is_public_identity_over_calendar_space(tmp_path) -> None:
    service = CallyOneService(tmp_path)
    state = service.state()

    assert state["product"] == "Cally.One"
    assert state["space_id"] == "cally-one"
    assert state["provenance"]["public_identity"] == "Cally.One"
    assert state["provenance"]["technical_space"] == "Calendar Space"
    assert state["provenance"]["system_boundary"] == "SyntractSystem"
    assert state["provenance"]["single_qcds_architecture"] is True


def test_cally_one_public_ui_uses_cally_one_brand() -> None:
    html = cally_one_html()

    assert "Cally.One" in html
    assert "Cally.One Tribute License 1.0" in html
    assert "Calendar Space" in html
    assert "QCDS / Syntract" in html


def test_static_cally_one_uses_packaged_python_core() -> None:
    html = cally_one_html(static_mode=True)
    worker = Path("web/session_core_worker.js").read_text(encoding="utf-8")

    assert "cally_one_run" in html
    assert "qcds_fabric.zip" in html
    assert "localStorage" in html
    assert "run_cally_one_json" in worker
    assert "msg.type === 'cally_one_run'" in worker
    assert "run_cally_one_json(__payload_json)" in worker


def test_browser_session_actions_keep_calendar_state_and_qcds_path() -> None:
    run_cally_one({"action": "hydrate", "state": {"people": [], "events": []}})
    person = run_cally_one({"action": "person", "payload": {"person_id": "p1", "name": "Person 1"}})
    assert person["state"]["people"][0]["person_id"] == "p1"

    run_cally_one(
        {
            "action": "event",
            "payload": {
                "event_id": "fixed",
                "title": "Fixed",
                "start": "2026-09-02T17:00",
                "end": "2026-09-02T18:00",
                "people": ["p1"],
                "locked": True,
            },
        }
    )
    run_cally_one(
        {
            "action": "event",
            "payload": {
                "event_id": "move",
                "title": "Move",
                "start": "2026-09-02T16:00",
                "end": "2026-09-02T17:00",
                "people": ["p1"],
            },
        }
    )
    inference = run_cally_one(
        {
            "action": "infer",
            "payload": {
                "event_id": "move",
                "candidates": [
                    {"candidate_id": "blocked", "start": "2026-09-02T17:00", "end": "2026-09-02T18:00"},
                    {"candidate_id": "clear", "start": "2026-09-02T18:00", "end": "2026-09-02T19:00"},
                ],
            },
        }
    )["result"]

    assert inference["candidate_worlds"]["blocked"]["fit"] == "blocked"
    assert inference["candidate_worlds"]["clear"]["fit"] == "clear"
    assert inference["provenance"]["system_boundary"] == "SyntractSystem"
    assert inference["truth_distribution_bound"] is True
