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


def test_orange_transport_can_be_completed_by_human_state_editing() -> None:
    html = cally_one_html(static_mode=True)
    assert 'Markera som löst' in html
    assert "route_status:'resolved'" in html
    assert "resolved_by:'human'" in html
    assert 'Transportplanen är markerad som klar' in html
    assert 'completePlanningForEvent' in html
    assert "['uses','reserves'].includes(relation.predicate)" in html


def test_large_resource_sets_can_filter_by_state_dimensions() -> None:
    html = cally_one_html(static_mode=True)
    assert 'callyLinkedDimensionFilters' in html
    assert 'Alla typer' in html
    assert 'Alla platser' in html
    assert "String(dimensions.type || '') === wantedType" in html
    assert "String(dimensions.location || '') === wantedLocation" in html
    assert 'Visar ${Math.min(matched, 30)} av ${matched} träffar' in html


def test_today_keeps_the_current_view_and_only_moves_the_date_anchor() -> None:
    html = cally_one_html()
    assert "function jumpToday(){state.anchor=startOfDay(new Date());render()}" in html
    assert "if(state.view==='year')state.view='month'" not in html
    assert "else if(state.view==='month')state.view='day'" not in html
    assert "$('#todayBtn').textContent='Today'" in html


def test_all_primary_modal_layers_blur_the_calendar_behind_them() -> None:
    html = cally_one_html()
    assert '#modalBack[data-cally-base-editor="1"],.stateOverlay,.manageOverlay' in html
    assert 'backdrop-filter:blur(10px)' in html
    assert '-webkit-backdrop-filter:blur(10px)' in html


def test_event_editor_people_are_compact_selectors_not_giant_raw_checkboxes() -> None:
    html = cally_one_html()
    assert '.peopleChecks{display:grid!important' in html
    assert '.peopleChecks input[type="checkbox"]{appearance:none' in html
    assert '.peopleChecks input[type="checkbox"]:checked::after{content:"✓"' in html
