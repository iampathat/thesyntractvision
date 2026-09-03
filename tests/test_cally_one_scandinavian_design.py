from __future__ import annotations

from qcds_fabric.robots.cally_one.enhanced_ui import cally_one_html


def test_scandinavian_design_system_is_flat_precise_and_tokenized() -> None:
    html = cally_one_html()
    assert 'Cally.One Scandinavian strictness pass' in html
    assert '--cally-bg:#f3f1eb' in html
    assert '--cally-r-sm:9px' in html
    assert '--shadow:none' in html
    assert 'box-shadow:none!important' in html


def test_header_is_one_aligned_control_system() -> None:
    html = cally_one_html()
    assert '.topActions .btn,.callyMenuButton{' in html
    assert 'width:42px!important;min-width:42px!important;height:42px!important;min-height:42px!important' in html
    assert '#eventBtn{background:var(--cally-accent)!important' in html
    assert '.callyMenuButton::before{content:"";width:17px;height:12px' in html
    assert '#personBtn .actionIcon::before{content:"P+"' in html


def test_date_navigation_is_composed_not_four_unrelated_pills() -> None:
    html = cally_one_html()
    assert '.dateNav{gap:0!important' in html
    assert 'border:1px solid var(--cally-line)!important;border-radius:11px!important' in html
    assert '.dateNav .btn{' in html
    assert 'border-radius:0!important' in html


def test_calendar_views_use_editorial_grid_and_event_strips() -> None:
    html = cally_one_html()
    assert '.viewbar{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important' in html
    assert 'border-left:3px solid var(--cally-accent)!important' in html
    assert '.monthEvent{' in html
    assert 'border-radius:5px!important' in html
    assert '.miniMonth{padding:12px!important;border:1px solid var(--cally-line)!important;border-radius:12px!important' in html


def test_mobile_keeps_the_same_strict_geometry() -> None:
    html = cally_one_html()
    assert '@media(max-width:760px)' in html
    assert '.topActions .btn,.callyMenuButton{width:40px!important;min-width:40px!important;height:40px!important;min-height:40px!important' in html
    assert '.dateNav{grid-template-columns:40px 78px 40px minmax(0,1fr)!important' in html
