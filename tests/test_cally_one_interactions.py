from __future__ import annotations

from qcds_fabric.robots.cally_one.enhanced_ui import cally_one_html


def test_day_view_can_fill_viewport_without_forced_timeline_width() -> None:
    html = cally_one_html()
    assert 'timeline[style*="--days:1"]' in html
    assert 'width:100%;min-width:0' in html
    assert '--cally-header-h' in html
    assert 'height:calc(100dvh - var(--cally-header-h))' in html
    assert '-webkit-overflow-scrolling:touch' in html


def test_event_movement_requires_explicit_four_arrow_handle() -> None:
    html = cally_one_html()
    assert 'className = `eventMove' in html
    assert 'Drag to move' in html
    assert "if (ev.target.closest?.('.eventMove')) return" in html
    assert 'Event cards are inert for movement unless the explicit four-arrow handle is used.' in html


def test_day_week_events_have_resize_and_edit_controls() -> None:
    html = cally_one_html()
    assert 'resizeHandle' in html
    assert 'Drag to change duration' in html
    assert 'Event duration changed' in html
    assert 'data-edit-event' in html
    assert 'Edit event' in html


def test_movement_semantics_follow_calendar_projection() -> None:
    html = cally_one_html()
    assert "el.classList.contains('event') || el.classList.contains('monthEvent') || el.classList.contains('laneCard')" in html
    assert "if (el.classList.contains('event')) el.appendChild(makeResize" in html


def test_perspective_and_top_navigation_wrap_instead_of_page_scroll() -> None:
    html = cally_one_html()
    assert '.viewbar{flex-wrap:wrap;overflow-x:hidden' in html
    assert '.composer{flex-wrap:wrap;overflow-x:hidden' in html
