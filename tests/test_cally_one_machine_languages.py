from __future__ import annotations

from tempfile import TemporaryDirectory

from qcds_fabric.robots.cally_one import CallyOneService
from qcds_fabric.robots.cally_one.dimensions import BUILTIN_DIMENSIONS
from qcds_fabric.robots.cally_one.enhanced_ui import cally_one_html
from qcds_fabric.robots.cally_one.machine_language_dimensions import MACHINE_LANGUAGE_VALUES


def test_machine_languages_are_canonical_adapter_state() -> None:
    required = {
        "machine_language",
        "connector_direction",
        "adapter_capability",
        "semantic_mapping",
        "identity_mapping",
        "time_semantics",
        "recurrence_semantics",
        "permission_semantics",
        "translation_fidelity",
        "connector_authority",
        "external_system",
        "external_id",
        "external_revision",
        "sync_state",
        "source_provenance",
    }
    assert required.issubset(BUILTIN_DIMENSIONS)
    assert BUILTIN_DIMENSIONS["machine_language"]["value_kind"] == "machine-language-state"

    codes = {item["code"] for item in MACHINE_LANGUAGE_VALUES}
    assert {
        "vcalendar_1_0",
        "icalendar",
        "caldav",
        "itip",
        "imip",
        "exchange_ews",
        "exchange_activesync",
        "google_calendar_api",
        "microsoft_graph_calendar",
        "generic_json_rest",
    }.issubset(codes)


def test_runtime_exposes_same_machine_language_dimension_catalogue() -> None:
    with TemporaryDirectory() as root:
        service = CallyOneService(root)
        dimensions = {item["key"]: item for item in service.state()["dimension_states"]}
        assert "machine_language" in dimensions
        codes = {item["code"] for item in dimensions["machine_language"]["values"]}
        assert {"icalendar", "caldav", "exchange_ews", "google_calendar_api", "microsoft_graph_calendar"}.issubset(codes)
        assert dimensions["translation_fidelity"]["value_kind"] == "translation-fidelity-state"
        assert dimensions["source_provenance"]["value_kind"] == "provenance-state"


def test_ui_makes_human_machine_calendar_space_relation_explicit() -> None:
    html = cally_one_html(static_mode=True)
    assert "Cally.One human + machine language bridge." in html
    machine = html.split("Cally.One human + machine language bridge.", 1)[1]
    assert "CALENDAR SPACE" in machine
    assert "QCDS 4 phases → Syntract" in machine
    assert "machine_language" in machine
    assert "semantic_mapping" in machine
    assert "translation_fidelity" in machine
    assert "source_provenance" in machine
    assert "vCalendar 1.0" in machine
    assert "iCalendar / ICS" in machine
    assert "CalDAV" in machine
    assert "Exchange EWS" in machine
    assert "Google Calendar API" in machine
    assert "Microsoft Graph · Calendar" in machine
    assert "Språk & API" in machine
    for forbidden in ("/api/infer", "initializeCore", "loadPyodide", "new MutationObserver"):
        assert forbidden not in machine
