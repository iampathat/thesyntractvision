from __future__ import annotations

from pathlib import Path

from qcds_fabric.robots.cally_one.robot import CallyOneService, run_cally_one
from qcds_fabric.robots.cally_one.ui import cally_one_html


def test_cally_one_is_public_identity_over_calendar_space(tmp_path) -> None:
    service = CallyOneService(tmp_path)
    state = service.state()

    assert state["product"] == "Cally.One"
    assert state["space_id"] == "cally-one"
    assert state["provenance"]["public_identity"] == "Cally.One"
    assert state["provenance"]["technical_space"] == "Calendar Space"
    assert state["provenance"]["logical_robot"] is True
    assert state["provenance"]["robot_package"] == "qcds_fabric.robots.cally_one"
    assert state["provenance"]["system_boundary"] == "SyntractSystem"
    assert state["provenance"]["single_qcds_architecture"] is True


def test_cally_one_public_ui_uses_searchable_unbounded_dimensions() -> None:
    html = cally_one_html()

    assert "Cally.One" in html
    assert "Cally.One Tribute License 1.0" in html
    assert "Calendar Space" in html
    assert "QCDS / Syntract" in html
    assert 'id="dimensionSearch"' in html
    assert 'id="perspectiveStack"' in html
    assert 'id="filterList"' in html
    assert 'id="addPerspective"' in html
    assert 'id="addFilter"' in html
    assert "dimensionKeys()" in html
    assert "Object.keys(e.dimensions||{})" in html
    assert "Dimension X · Y · Z" not in html
    assert "Calendar Space · X / Y / Z" not in html


def test_language_is_a_state_and_localized_words_resolve_to_same_dimension() -> None:
    html = cally_one_html()

    assert "language:{labels:{en:'Language',sv:'Språk'}" in html
    assert "location:{labels:{en:'Location',sv:'Plats'}" in html
    assert 'id="fLanguage"' in html
    assert "dims.language=lang" in html
    assert "resolveDimension" in html
    assert "Location</b> and <b>Plats</b> resolve to the same dimension" in html


def test_perspective_stack_filters_and_calendar_drilldown_are_first_class() -> None:
    html = cally_one_html()

    assert "state.perspectives=['location','person']" in html
    assert "state.filters=[]" in html
    assert "eventMatchesFilters" in html
    assert "perspectiveNode" in html
    assert "data-stack-up" in html
    assert "data-filter-value" in html
    assert "data-jump-month" in html
    assert "data-jump-date" in html
    assert "jumpToday" in html
    assert "state.view='month'" in html
    assert "state.view='day'" in html


def test_event_editor_accepts_many_additional_dimensions() -> None:
    html = cally_one_html()

    assert 'id="fDimensions"' in html
    assert 'id="addDimensionRow"' in html
    assert "addDimEditor" in html
    assert "#fDimensions .dimEdit" in html
    assert "EVENT_COMMON" in html


def test_cally_one_has_robot_local_non_mit_product_license() -> None:
    license_text = Path("src/qcds_fabric/robots/cally_one/LICENSE.md").read_text(encoding="utf-8")

    assert "Cally.One Tribute License 1.0" in license_text
    assert "Source availability is not an open-source grant" in license_text
    assert "does not" in license_text and "inherit the core's MIT license" in license_text
    assert "EUR 99 per month per organization" in license_text
    assert "EUR 990 per year per organization" in license_text


def test_static_cally_one_uses_packaged_python_core() -> None:
    html = cally_one_html(static_mode=True)
    worker = Path("web/session_core_worker.js").read_text(encoding="utf-8")

    assert "cally_one_run" in html
    assert "qcds_fabric.zip" in html
    assert "localStorage" in html
    assert "from qcds_fabric.robots.cally_one.robot import run_cally_one_json" in worker
    assert "msg.type === 'cally_one_run'" in worker
    assert "run_cally_one_json(__payload_json)" in worker


def test_browser_session_actions_keep_calendar_state_and_qcds_path() -> None:
    run_cally_one({"action": "hydrate", "state": {"people": [], "events": []}})
    person = run_cally_one({"action": "person", "payload": {"person_id": "p1", "name": "Person 1"}})
    assert person["logical_robot"] is True
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
                "dimensions": {"language": "sv", "priority": "must", "custom_dimension_299": "state-a"},
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
                "dimensions": {"language": "en", "activity": "hockey"},
            },
        }
    )
    state = run_cally_one({"action": "state"})["state"]
    assert "language" in state["dimensions"]
    assert "custom_dimension_299" in state["dimensions"]

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
    assert inference["provenance"]["logical_robot"] is True
    assert inference["provenance"]["system_boundary"] == "SyntractSystem"
    assert inference["provenance"]["single_qcds_architecture"] is True
    assert inference["provenance"]["qcds_core_replaced"] is False
    assert inference["truth_distribution_bound"] is True
