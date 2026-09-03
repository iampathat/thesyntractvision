from __future__ import annotations

from qcds_fabric.robots.cally_one.enhanced_ui import cally_one_html


def test_top_actions_use_semantic_icons_in_one_control_family() -> None:
    html = cally_one_html()
    assert "const PERSON_PLUS_ICON = '<svg" in html
    assert "const CALENDAR_PLUS_ICON = '<svg" in html
    assert "setSemanticActionIcon('personBtn', PERSON_PLUS_ICON, 'Lägg till person')" in html
    assert "setSemanticActionIcon('eventBtn', CALENDAR_PLUS_ICON, 'Ny händelse')" in html
    assert "perspective.title = 'Perspektiv'" in html
    assert "menuButton.title = 'Meny'" in html
    assert 'grid-auto-flow:column!important' in html
    assert 'grid-auto-columns:42px!important' in html
    assert '#personBtn .actionIcon::before,#eventBtn .actionIcon::before{content:none!important}' in html


def test_day_week_event_controls_have_a_non_overlapping_control_rail() -> None:
    html = cally_one_html()
    assert '.event{\n  padding:8px 96px 8px 10px!important;' in html
    assert '.eventMove{left:auto!important;right:67px!important;cursor:grab!important}' in html
    assert '.eventEdit{left:auto!important;right:37px!important}' in html
    assert '.event .pinBtn{left:auto!important;right:7px!important;z-index:15!important}' in html
    assert '.event .pinBtn:not(.locked){background:#fff!important;border-color:#9eafa5!important;color:#214638!important}' in html
    assert '.event .pinBtn.locked{background:var(--cally-accent-dark)!important;border-color:var(--cally-accent-dark)!important;color:#fff!important;opacity:1!important}' in html
