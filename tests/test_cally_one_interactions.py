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
    assert "function jumpToday(){state.anchor=startOfDay(new Date());state.activeSavedView=null;render()}" in html
    assert "if(state.view==='year')state.view='month'" not in html
    assert "else if(state.view==='month')state.view='day'" not in html
    assert "$('#todayBtn').textContent='Today'" in html


def test_today_also_reveals_today_inside_year_month_and_timeline() -> None:
    html = cally_one_html()
    assert 'function focusTodayInCurrentProjection()' in html
    assert "stage.querySelector('.miniDay.today')" in html
    assert "stage.querySelector('.dayCell.today')" in html
    assert "stage.querySelector('.nowline')" in html
    assert "month.offsetTop" in html
    assert "behavior: 'smooth'" in html


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


def test_calendar_surface_has_no_transparent_seam_and_time_rail_is_sticky() -> None:
    html = cally_one_html()
    assert '.stage{padding:0 12px 12px!important;background:var(--paper,#fffdf8)!important}' in html
    assert '.timeHead{position:sticky!important;top:0!important;left:0!important' in html
    assert '.timeRail{position:sticky!important;left:0!important' in html
    assert '.hour{background:#fffdf8!important}' in html


def test_mobile_perspective_button_can_reveal_the_side_panel() -> None:
    html = cally_one_html()
    assert '.rightSide{display:block!important}' in html
    assert "$('#perspectiveBtn').onclick=()=>$('#rightSide').classList.add('open')" in html
    assert '.rightSide.open{transform:translateX(0)}' in html


def test_week_numbers_are_first_class_across_calendar_views() -> None:
    html = cally_one_html()
    assert 'function isoWeekNumber(date)' in html
    assert 'class="callyWeekNumber"' in html
    assert 'class="callyMonthWeek"' in html
    assert 'class="miniWeekRange"' in html
    assert 'Veckonummer visas enligt ISO 8601' in html


def test_calendar_system_is_a_switchable_display_dimension() -> None:
    html = cally_one_html()
    for calendar in ('gregory', 'iso8601', 'islamic', 'islamic-umalqura', 'chinese', 'hebrew', 'persian', 'indian', 'buddhist', 'japanese'):
        assert f"['{calendar}'" in html or f"['{calendar}'," in html
    assert 'KALENDERDIMENSION' in html
    assert 'calendar:prefs.calendar' in html
    assert 'Händelsernas underliggande tid ändras inte' in html


def test_timezone_and_12_24_hour_projection_are_explicit() -> None:
    html = cally_one_html()
    assert "Intl.supportedValuesOf('timeZone')" in html
    assert "timeZoneName:'short'" in html
    assert "prefs.hourCycle === 'h12'" in html
    assert "prefs.hourCycle === 'h23'" in html
    assert "12 h · 6:30 PM" in html
    assert "24 h · 18:30" in html
    assert 'cally.one.display.v1' in html


def test_calendar_display_changes_do_not_call_qcds_inference() -> None:
    html = cally_one_html(static_mode=True)
    display = html.split('/* Cally.One calendar/time display dimension — projection only; no QCDS startup. */', 1)[1]
    assert "fetch('/api/infer'" not in display
    assert "action:'infer'" not in display


def test_week_event_is_clipped_to_its_own_day_column() -> None:
    html = cally_one_html()
    assert '.dayCol{min-width:0;overflow:hidden!important;isolation:isolate' in html
    assert '.event{box-sizing:border-box!important;max-width:calc(100% - 10px)!important;overflow:hidden!important}' in html


def test_non_today_week_columns_remain_neutral_when_horizontal_scrolling() -> None:
    html = cally_one_html()
    assert 'background-color:var(--paper,#fffdf8)!important' in html
    assert '.dayCol.today{background-color:#f2f8f3!important}' in html


def test_mobile_calendar_chrome_uses_one_control_geometry_and_grid_alignment() -> None:
    html = cally_one_html()
    assert '--cally-control-h:44px' in html
    assert '.topActions .btn,.callyMenuButton,.dateNav .btn{height:var(--cally-control-h)!important' in html
    assert 'grid-template-columns:repeat(4,minmax(0,1fr))!important' in html
    assert '.view{width:100%!important;min-width:0!important;max-width:none!important;min-height:48px!important' in html


def test_visible_tribute_notice_explains_free_personal_and_paid_commercial_use() -> None:
    html = cally_one_html()
    assert 'Tribute License 1.0 · personal/family free · commercial/professional use €99/mo or €990/yr' in html


def test_hamburger_menu_is_compact_grouped_and_matches_perspective_hierarchy() -> None:
    html = cally_one_html()
    assert 'grid-template-areas:"head head" "space space" "perspective dimensions"' in html
    assert '.callyMobileMenu::before{content:"CALLY.ONE  ·  MENY"' in html
    assert 'button[data-nav="add-person"]{grid-area:add;background:var(--green' in html
    assert 'button[data-nav="space"]::after{content:"Öppna hela Calendar Space"}' in html
    assert 'button[data-cally-display-settings]::after{content:"Tidszon, tideräkning och 12/24 h"}' in html


def test_top_brand_and_action_controls_share_one_geometry_and_alignment() -> None:
    html = cally_one_html()
    assert '.mark{display:grid!important;place-items:center!important;width:var(--cally-control-h)!important' in html
    assert "mark.textContent = 'C'" in html
    assert "if (menuButton.parentElement !== actions) actions.appendChild(menuButton)" in html
    assert "['perspectiveBtn','personBtn','eventBtn','callyMenuButton']" in html
    assert '.topActions .actionText{display:none!important}' in html


def test_month_events_prioritize_readable_titles_over_permanent_edit_controls() -> None:
    html = cally_one_html()
    assert '.monthEvent{box-sizing:border-box!important;width:100%!important;max-width:100%!important;min-height:30px!important' in html
    assert '.monthEvent .eventMove,.monthEvent [data-edit-event],.monthEvent .pinBtn,.monthEvent .resizeHandle{display:none!important}' in html
    assert '.dayCell{min-width:0!important;overflow:hidden!important' in html


def test_year_view_shows_event_titles_instead_of_only_coloring_days() -> None:
    html = cally_one_html()
    assert 'function decorateYearEvents()' in html
    assert "document.querySelectorAll('.miniDay[data-jump-date]')" in html
    assert "first.className = 'callyYearEvent'" in html
    assert "first.textContent = String(events[0].title || 'Händelse')" in html
    assert '.callyYearEvent{display:block!important;width:100%!important' in html
    assert '.miniDay.has{background:#f2f8f3!important;border-color:#d4e2d9!important' in html
