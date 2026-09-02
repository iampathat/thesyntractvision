from __future__ import annotations

from pathlib import Path

from qcds_fabric.robots.cally_one.runtime_v3 import CallyOneService, run_cally_one
from qcds_fabric.robots.cally_one.enhanced_ui import cally_one_html


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
    assert state["provenance"]["qcds_core_modified"] is False


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

    assert "perspectives:['location','person']" in html
    assert "filters:[]" in html
    assert "eventMatchesFilters" in html
    assert "perspectiveNode" in html
    assert "data-stack-up" in html
    assert "data-filter-value" in html
    assert "data-jump-month" in html
    assert "data-jump-date" in html
    assert "jumpToday" in html
    assert "state.view='month'" in html
    assert "state.view='day'" in html


def test_responsive_header_contains_no_page_level_horizontal_overflow_contract() -> None:
    html = cally_one_html()

    assert "html,body" in html and "overflow-x:hidden" in html
    assert "max-width:100vw" in html
    assert 'grid-template-areas:"brand date actions"' in html
    assert 'grid-template-areas:"brand actions" "date date"' in html
    assert ".viewbar" in html and "overflow-x:auto" in html
    assert ".stage" in html and "overflow:auto" in html


def test_events_have_pin_lock_controls_that_gate_dragging() -> None:
    html = cally_one_html()

    assert "eventPinButton" in html
    assert "data-pin-event" in html
    assert "toggleEventPin" in html
    assert "locked:!e.locked" in html
    assert "if(ev.target.closest('[data-pin-event]'))return" in html
    assert "if(!item||item.locked)return" in html
    assert "locked:!!current?.locked" in html


def test_perspective_composer_is_drag_drop_and_can_pin_dedicated_views() -> None:
    html = cally_one_html()

    assert 'id="perspectiveComposer"' in html
    assert "data-perspective-index" in html
    assert "data-perspective-drag" in html
    assert "perspectiveDragStart" in html
    assert "perspectiveDragMove" in html
    assert "perspectiveDragEnd" in html
    assert "pinCurrentPerspective" in html
    assert "SAVED_VIEW_KEY" in html
    assert 'id="savedViews"' in html
    assert "data-saved-view" in html
    assert "applySavedView" in html


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
    assert "from qcds_fabric.robots.cally_one.runtime_v3 import run_cally_one_json" in worker
    assert "msg.type === 'cally_one_run'" in worker
    assert "run_cally_one_json(__payload_json)" in worker
    assert "Kolla tider" in html
    assert "Åker med" in html
    assert "callyNeedsResolution" in html


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
    browser_state = run_cally_one({"action": "state"})["state"]
    assert "language" in browser_state["dimensions"]
    assert "custom_dimension_299" in browser_state["dimensions"]

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

    assert inference["mode"] == "qcds-resolve"
    assert inference["candidate_worlds"]["blocked"]["coherence"] == "blocked"
    assert inference["candidate_worlds"]["clear"]["coherence"] == "coherent"
    assert inference["provenance"]["logical_robot"] is True
    assert inference["provenance"]["system_boundary"] == "SyntractSystem"
    assert inference["provenance"]["single_qcds_architecture"] is True
    assert inference["provenance"]["qcds_core_replaced"] is False
    assert inference["truth_distribution_bound"] is True
