from __future__ import annotations

from tempfile import TemporaryDirectory

from qcds_fabric.robots.cally_one.dimensions import BUILTIN_DIMENSIONS, LANGUAGE_VALUES
from qcds_fabric.robots.cally_one.enhanced_ui import cally_one_html
from qcds_fabric.robots.cally_one.runtime_v3 import CallyOneService


def test_language_and_calendar_projection_are_canonical_dimension_states() -> None:
    required = {
        "language",
        "interface_language",
        "calendar_display_language",
        "calendar_system",
        "time_zone",
        "clock_format",
        "account_role",
        "visibility_policy",
        "calendar_layer_priority",
    }
    assert required.issubset(BUILTIN_DIMENSIONS)
    assert [item["code"] for item in LANGUAGE_VALUES] == ["sv", "en"]
    assert BUILTIN_DIMENSIONS["calendar_display_language"]["value_kind"] == "language-state"
    assert BUILTIN_DIMENSIONS["calendar_system"]["value_kind"] == "calendar-system-state"
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
