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
    assert 'const canMove = el.classList.contains(\'event\') || el.classList.contains(\'monthEvent\') || el.classList.contains(\'laneCard\')' in html


def test_event_surface_remains_available_for_normal_touch_scrolling() -> None:
    html = cally_one_html()
    assert 'touch-action:auto!important' in html
    assert 'touch-action:none!important' in html
    assert 'cursor:default!important' in html


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


def test_timeline_focuses_near_now_or_first_event_once_per_view() -> None:
    html = cally_one_html()
    assert 'function focusTimeline(stage)' in html
    assert 'stage.dataset.callyTimelineFocus' in html
    assert "stage.querySelector('.nowline')" in html
    assert "qsa('.event[data-event-id]', stage)" in html


def test_perspective_and_top_navigation_wrap_instead_of_page_scroll() -> None:
    html = cally_one_html()
    assert '.viewbar{flex-wrap:wrap;overflow-x:hidden' in html
    assert '.composer{flex-wrap:wrap;overflow-x:hidden' in html
