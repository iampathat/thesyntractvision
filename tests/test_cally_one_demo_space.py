from __future__ import annotations

from pathlib import Path

from qcds_fabric.robots.cally_one.enhanced_ui import cally_one_html


DEMO_JS = Path("src/qcds_fabric/robots/cally_one/demo_space.js")
CONTROLLER_JS = Path("src/qcds_fabric/robots/cally_one/interaction_controller.js")
DISPLAY_JS = Path("src/qcds_fabric/robots/cally_one/calendar_display.js")
LAYOUT_JS = Path("src/qcds_fabric/robots/cally_one/calendar_layout_hotfix.js")


def test_demo_space_is_a_separate_browser_state_domain() -> None:
    html = cally_one_html(static_mode=True)
    assert "cally.one.active-space.v1" in html
    assert "demo-family-company" in html
    assert "cally.one.state.demo.family-company.v1" in html
    assert "window.__callySpaceStorageKey" in html
    assert "localStorage.getItem(window.__callySpaceStorageKey())" in html
    assert "localStorage.setItem(window.__callySpaceStorageKey(), JSON.stringify(state))" in html
    assert "cally.one.saved.perspectives.demo.family-company.v1" in html


def test_demo_family_and_company_seed_is_rich_and_current_date_relative() -> None:
    demo = DEMO_JS.read_text(encoding="utf-8")
    for text in (
        "Johan Lindberg",
        "Anna Lindberg",
        "Elsa Lindberg",
        "Leo Lindberg",
        "Nordverk AB",
        "Familjen Lindberg",
        "Bromma FK",
        "Bromma Gymnastik",
        "Äppelviksskolan",
        "Daily stand-up · Nordverk",
        "Elsa · fotbollsträning",
        "Leo · gymnastik",
        "Matsäck",
        "Volvo XC60",
        "Mötesrum Eken",
    ):
        assert text in demo
    for coworker in (
        "Sara Berg",
        "Amir Rahimi",
        "Karin Nyström",
        "Daniel Holm",
        "Fatima Ali",
        "Oskar Lund",
        "Linnea Ek",
        "Magnus Sjöberg",
        "Emma Dahl",
        "Viktor Chen",
    ):
        assert coworker in demo
    assert "localStamp(now,day" in demo
    assert "space_domain:'demo.cally.one/family-company'" in demo
    assert "conflicts:[], state_conflicts:[], planning_states:[]" in demo


def test_demo_switcher_is_reversible_and_never_starts_qcds() -> None:
    demo = DEMO_JS.read_text(encoding="utf-8")
    assert "Demokalender" in demo
    assert "Öppna Demo Space" in demo
    assert "Min kalender" in demo
    assert "Återställ demo" in demo
    assert "localStorage.setItem(ACTIVE_SPACE_KEY, DEMO_SPACE_ID)" in demo
    assert "localStorage.removeItem(ACTIVE_SPACE_KEY)" in demo
    assert "location.reload()" in demo
    assert "/api/infer" not in demo
    assert "initializeCore" not in demo
    assert "new Worker" not in demo
    assert "MutationObserver" not in demo


def test_all_browser_projection_reads_follow_the_active_space() -> None:
    controller = CONTROLLER_JS.read_text(encoding="utf-8")
    display = DISPLAY_JS.read_text(encoding="utf-8")
    layout = LAYOUT_JS.read_text(encoding="utf-8")
    assert "typeof window.__callySpaceStorageKey === 'function'" in controller
    assert "localStorage.getItem(localKey())" in controller
    assert "localStorage.setItem(localKey(), JSON.stringify(state))" in controller
    assert "typeof window.__callySpaceStorageKey === 'function'" in display
    assert "typeof window.__callySpaceStorageKey === 'function'" in layout
