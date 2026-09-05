from __future__ import annotations

from tempfile import TemporaryDirectory

from qcds_fabric.robots.cally_one.dimensions import BUILTIN_DIMENSIONS, LANGUAGE_VALUES, TIME_REFERENCE_VALUES
from qcds_fabric.robots.cally_one.enhanced_ui import cally_one_html
from qcds_fabric.robots.cally_one.runtime_v3 import CallyOneService


def test_language_and_calendar_projection_are_canonical_dimension_states() -> None:
    required = {
        "language",
        "interface_language",
        "calendar_display_language",
        "calendar_system",
        "time_zone",
        "time_reference",
        "time_epoch",
        "reference_body",
        "reference_frame",
        "clock_source",
        "clock_format",
        "account_role",
        "visibility_policy",
        "calendar_layer_priority",
    }
    assert required.issubset(BUILTIN_DIMENSIONS)
    assert [item["code"] for item in LANGUAGE_VALUES] == ["sv", "en"]
    assert BUILTIN_DIMENSIONS["calendar_display_language"]["value_kind"] == "language-state"
    assert BUILTIN_DIMENSIONS["calendar_system"]["value_kind"] == "calendar-system-state"
    assert BUILTIN_DIMENSIONS["time_reference"]["value_kind"] == "time-reference-state"
    assert BUILTIN_DIMENSIONS["account_role"]["value_kind"] == "access-role-state"


def test_dimension_snapshot_carries_language_meanings_and_calendar_system_values() -> None:
    with TemporaryDirectory() as root:
        service = CallyOneService(root)
        dimensions = {item["key"]: item for item in service.state()["dimension_states"]}
        assert {item["code"] for item in dimensions["language"]["values"]} == {"sv", "en"}
        assert next(item for item in dimensions["language"]["values"] if item["code"] == "sv")["native_label"] == "Svenska"
        assert next(item for item in dimensions["language"]["values"] if item["code"] == "en")["native_label"] == "English"
        calendar_codes = {item["code"] for item in dimensions["calendar_system"]["values"]}
        assert {"gregory", "iso8601", "chinese", "islamic", "japanese"}.issubset(calendar_codes)


def test_hamburger_has_one_system_control_surface_and_dimensions_open_a_real_manager() -> None:
    html = cally_one_html(static_mode=True)
    assert "Cally.One unified state/dimension control center." in html
    control = html.split("Cally.One unified state/dimension control center.", 1)[1]
    assert "data-cally-system-menu" in control
    assert "data-system-action=\"dimensions\"" in control
    assert "window.__callyOpenDimensionCenter" in control
    assert "if(action==='dimensions')renderCenter('dimensions')" in control
    assert "data-language-meaning" in control
    assert "data-save-language-meanings" in control
    assert "State Space" in control
    assert "Constraints / Oracles" in control
    assert "QCDS 4 phases" in control
    assert "Syntract" in control
    assert "<button data-nav=\"people\">" not in control
    assert "<button data-nav=\"organizations\">" not in control


def test_interface_language_calendar_language_system_and_timezone_are_independent() -> None:
    html = cally_one_html(static_mode=True)
    assert "cally.one.interface-locale.v2" in html
    assert "displayLocale" in html
    assert "calendar_display_language_is_independent:true" in html
    assert "calendar_system_is_independent:true" in html
    assert "time_zone_is_independent:true" in html
    assert "interface_language_is_independent_projection = true" in html
    assert "svenska huvudmenyer + English kalendertext + kinesisk tideräkning + Asia/Shanghai" in html
    assert "data-calendar-display-locale" in html
    assert "{code:'sv'" in html
    assert "{code:'en'" in html
    assert "callyLangFlag" in html
    assert "calendar_projection" in html


def test_earth_time_zone_uses_canonical_iana_choices_not_free_text() -> None:
    html = cally_one_html(static_mode=True)
    assert "Cally.One civil Earth time-zone selector." in html
    civil = html.split("Cally.One civil Earth time-zone selector.", 1)[1]
    assert "Intl.supportedValuesOf('timeZone')" in civil
    assert "select.id = 'callyTimeZone'" in civil
    assert "data.callyCanonicalZones" not in civil
    assert "dataset.callyCanonicalZones = '1'" in civil
    assert "Europe/Stockholm" in civil
    assert "Asia/Shanghai" in civil
    assert "Jordisk visningstidszon" in civil
    assert "IANA-tidszoner gäller Jorden" in civil
    for forbidden in ("/api/infer", "initializeCore", "loadPyodide", "new MutationObserver"):
        assert forbidden not in civil


def test_machine_mission_lunar_and_space_time_are_visible_separate_state() -> None:
    codes = {item["code"] for item in TIME_REFERENCE_VALUES}
    assert {"utc", "tai", "gps", "tt", "ut1", "tcg", "tcb", "tdb", "met", "mrt", "sclk", "unix", "tcl", "ltc"}.issubset(codes)
    html = cally_one_html(static_mode=True)
    assert "Cally.One machine / mission / space time projection." in html
    temporal = html.split("Cally.One machine / mission / space time projection.", 1)[1]
    for code in ("utc", "tai", "gps", "tt", "ut1", "tcg", "tcb", "tdb", "met", "mrt", "sclk", "unix", "tcl", "ltc"):
        assert f"code:'{code}'" in temporal
    assert "callyTimeReference" in temporal
    assert "callyReferenceBody" in temporal
    assert "callyTimeEpoch" in temporal
    assert "callyReferenceFrame" in temporal
    assert "callyClockSource" in temporal
    assert "time_reference_is_independent_from_time_zone:true" in temporal
    assert "machine_and_space_time_are_state:true" in temporal
    assert "standard_time_facts_are_read_only_projection:true" in temporal
    assert "input.readOnly=derived" in temporal
    assert "data-time-field-badge" in temporal
    assert "1970-01-01T00:00:00Z" in temporal
    assert "GCRS · Geocentric Celestial Reference System" in temporal
    assert "BCRS · Barycentric Celestial Reference System" in temporal
    assert "LCRS · Lunar Celestial Reference System" in temporal
    for forbidden in ("/api/infer", "initializeCore", "loadPyodide", "new MutationObserver"):
        assert forbidden not in temporal


def test_language_meanings_are_editable_in_dimension_surface_not_hidden_in_ui_code() -> None:
    html = cally_one_html(static_mode=True)
    assert "Konfigurera språkets betydelser i Dimensioner" in html
    assert "Betydelser & språkstate" in html
    assert "data-meaning-sv" in html
    assert "data-meaning-en" in html
    assert "data-meaning-native" in html
    assert "data-meaning-locale" in html
    assert "postDimension" in html


def test_state_and_projection_controls_do_not_cross_qcds_inference_boundary() -> None:
    html = cally_one_html(static_mode=True)
    control = html.split("Cally.One unified state/dimension control center.", 1)[1]
    for forbidden in ("/api/infer", "initializeCore", "loadPyodide", "new MutationObserver"):
        assert forbidden not in control
    display = html.split("Cally.One calendar/time display dimension — projection only; no QCDS startup.", 1)[1].split("Cally.One Demo Space", 1)[0]
    for forbidden in ("/api/infer", "initializeCore", "loadPyodide", "new MutationObserver"):
        assert forbidden not in display
