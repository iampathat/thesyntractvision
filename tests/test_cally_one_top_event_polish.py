from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory

from qcds_fabric.robots.cally_one.enhanced_ui import cally_one_html
from qcds_fabric.robots.cally_one.runtime_v3 import CallyOneService


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
    assert 'line-height:0!important' in html
    assert 'transform:translateY(.5px)!important' in html


def test_day_week_event_title_has_priority_over_controls() -> None:
    html = cally_one_html()
    assert '.event{\n  padding:8px 36px 8px 10px!important;' in html
    assert '.event .pinBtn{left:auto!important;right:6px!important;top:6px!important;bottom:auto!important;z-index:15!important}' in html
    assert '.eventMove{left:auto!important;right:34px!important;top:auto!important;bottom:6px!important;cursor:grab!important}' in html
    assert '.eventEdit{left:auto!important;right:6px!important;top:auto!important;bottom:6px!important}' in html
    assert 'text-overflow:ellipsis!important' in html
    assert '.event .pinBtn:not(.locked){background:#fff!important;border-color:#9eafa5!important;color:#214638!important}' in html
    assert '.event .pinBtn.locked{background:var(--cally-accent-dark)!important;border-color:var(--cally-accent-dark)!important;color:#fff!important;opacity:1!important}' in html


def test_person_and_event_editors_share_the_scandinavian_surface_system() -> None:
    html = cally_one_html()
    assert '.stateSheet,\n#modalBack[data-cally-base-editor="1"]>.modal' in html
    assert 'width:min(720px,100%)!important' in html
    assert 'border-radius:18px!important' in html
    assert '.sheetHead,.callyEventHead{' in html
    assert 'border-bottom:1px solid var(--cally-line)!important' in html
    assert '.stateInput,\n#modalBack[data-cally-base-editor="1"] input:not([type="checkbox"]):not([type="radio"])' in html
    assert 'min-height:44px!important' in html
    assert '.smallStateBtn,\n.statePrimary,\n.callyEventActions button{' in html
    assert 'align-items:center!important' in html
    assert 'justify-content:center!important' in html
    assert '.callyEventTitleInput{' in html
    assert 'min-height:48px!important' in html


def test_editor_v2_is_compact_headline_first_and_time_grouped() -> None:
    html = cally_one_html()
    assert 'Cally.One editor strict v2' in html
    assert "when.classList.add('callyWhenSection')" in html
    assert '#modalBack[data-cally-base-editor="1"] .callyEventTitleInput{' in html
    assert 'border-radius:0!important' in html
    assert 'font-size:24px!important' in html
    assert '#modalBack[data-cally-base-editor="1"] .callyWhenSection .field{' in html
    assert 'grid-template-columns:62px minmax(0,1fr)!important' in html
    assert '.callyEventActions>*{flex:0 0 auto!important}' in html
    assert 'min-width:112px!important' in html
    assert '.stateSheet .statePrimary{' in html
    assert 'justify-self:end!important' in html


def test_add_event_and_person_use_compact_popovers_without_qcds() -> None:
    html = cally_one_html(static_mode=True)
    layout = Path('src/qcds_fabric/robots/cally_one/calendar_layout_hotfix.js').read_text(encoding='utf-8')
    assert "openEventQuickAdd" in html
    assert "openPersonQuickAdd" in html
    assert "text.textContent = 'Event'" in html
    assert "text.textContent = 'Person'" in html
    assert "callyQuickAdd" in html
    assert "grid-auto-columns:max-content!important" in html
    assert "transform:translateY(1.75px)!important" in html
    assert "fetch('/api/event'" in layout
    assert "fetch('/api/person'" in layout
    quick_section = layout.split('async function openEventQuickAdd', 1)[1].split('function focusTodayInCurrentProjection', 1)[0]
    assert '/api/infer' not in quick_section
    assert 'initializeCore' not in quick_section
    assert 'MutationObserver' not in quick_section
    assert "function openEvent(id=null)" in html


def test_person_module_is_compact_expandable_and_inference_free() -> None:
    html = cally_one_html(static_mode=True)
    person_js = Path('src/qcds_fabric/robots/cally_one/person_module_polish.js').read_text(encoding='utf-8')
    assert 'PERSON SPACE' in html
    assert 'callyPersonToggle' in html
    assert 'callyPersonCount' in html
    assert 'lane.dataset.expanded' in html
    assert '.personLanes .laneEvents[hidden]{display:none!important}' in html
    assert 'grid-template-columns:30px minmax(0,1fr) auto 16px!important' in html
    assert "window.addEventListener('cally-one-ui-refresh', decoratePersonModule)" in person_js
    assert 'MutationObserver' not in person_js
    assert '/api/infer' not in person_js
    assert 'initializeCore' not in person_js


def test_all_add_person_entry_points_use_compact_person_panel() -> None:
    html = cally_one_html(static_mode=True)
    person_js = Path('src/qcds_fabric/robots/cally_one/person_module_polish.js').read_text(encoding='utf-8')
    assert "#personBtn,[data-add-state=\"person\"]" in person_js
    assert 'openCompactPersonAdd(anchor)' in person_js
    assert 'callyCompactPersonForm' in html
    assert 'callyCompactPersonTeam' in html
    assert 'callyPersonQuickDetails' in html
    assert 'Fler dimensioner' in html
    assert "postJson('/api/entity'" in person_js
    assert "postJson('/api/person'" in person_js
    compact_section = person_js.split('async function openCompactPersonAdd', 1)[1].split('function decoratePersonModule', 1)[0]
    assert '/api/infer' not in compact_section
    assert 'initializeCore' not in compact_section
    assert 'MutationObserver' not in compact_section


def test_level2_view_rail_is_one_row_scrollable_and_marks_active_green() -> None:
    html = cally_one_html(static_mode=True)
    person_js = Path('src/qcds_fabric/robots/cally_one/person_module_polish.js').read_text(encoding='utf-8')
    assert 'callyLevel2Rail' in html
    assert 'callyRailArrowLeft' in html
    assert 'callyRailArrowRight' in html
    assert "left.dataset.callyRail = 'left'" in person_js
    assert "right.dataset.callyRail = 'right'" in person_js
    assert "bar.scrollBy({left:direction * Math.max(180, bar.clientWidth * 0.72), behavior:'smooth'})" in person_js
    assert "window.addEventListener('cally-one-ui-refresh', ensureLevel2ViewRail)" in person_js
    assert '.callyLevel2Rail .viewbar{' in html
    assert 'display:flex!important;' in html
    assert 'flex-wrap:nowrap!important;' in html
    assert 'overflow-x:auto!important;' in html
    assert 'scrollbar-width:thin!important;' in html
    assert '.callyLevel2Rail .view.active{' in html
    assert 'background:var(--green,#087b58)!important;' in html
    rail_section = person_js.split('function ensureLevel2ViewRail', 1)[1].split('function closeEventPeek', 1)[0]
    assert '/api/infer' not in rail_section
    assert 'initializeCore' not in rail_section
    assert 'MutationObserver' not in rail_section


def test_compact_timeline_events_keep_resize_and_progressively_disclose_other_controls() -> None:
    html = cally_one_html(static_mode=True)
    person_js = Path('src/qcds_fabric/robots/cally_one/person_module_polish.js').read_text(encoding='utf-8')
    assert "const resize = qs('.resizeHandle', eventEl);" in person_js
    assert "more.textContent = '⋯';" in person_js
    assert "menu.append(move, pin, edit, info);" in person_js
    assert "info.textContent = 'i';" in person_js
    assert 'callyEventPeek' in html
    assert '.event.callyCompactControls{' in html
    assert '.resizeHandle{display:block!important;visibility:visible!important;opacity:1!important}' in html
    assert '.callyEventActionMenu[hidden]{display:none!important}' in html
    progressive = person_js.split('function closeEventPeek', 1)[1]
    assert '/api/infer' not in progressive
    assert 'initializeCore' not in progressive
    assert 'MutationObserver' not in progressive


def test_overlap_stack_control_is_topmost_and_last_active_event_can_return_to_front() -> None:
    html = cally_one_html(static_mode=True)
    projection = Path('src/qcds_fabric/robots/cally_one/dimension_filter_ui.js').read_text(encoding='utf-8')
    css = Path('src/qcds_fabric/robots/cally_one/calendar_display.css').read_text(encoding='utf-8')
    assert '.callyOverlapCluster:not(.expanded)>.callyOverlapSpread{' in html
    assert 'top:4px!important;' in css
    assert 'bottom:auto!important;' in css
    assert 'z-index:118!important;' in css
    assert 'const activeOverlapEvent = new Map();' in projection
    assert 'function rememberActive(cluster, eventId)' in projection
    assert "const zoomCard = event.target.closest?.('.callyOverlapZoomCard');" in projection
    assert "rememberActive(lastZoomCluster, source.dataset.eventId)" in projection
    assert "event.style.setProperty('--cally-overlap-z', String(90 - index))" in projection
    active_section = projection.split('function eventPriority', 1)[1]
    assert '/api/infer' not in active_section
    assert 'initializeCore' not in active_section
    assert 'MutationObserver' not in active_section


def test_event_layer_priority_and_scoped_sharing_are_represented_event_state() -> None:
    with TemporaryDirectory() as root:
        service = CallyOneService(root)
        event = service.upsert_event(
            {
                'title': 'Familjen i bilen',
                'start': '2026-09-05T17:00',
                'end': '2026-09-05T18:00',
                'dimensions': {
                    'calendar_layer_priority': 20,
                    'calendar_priority_dimension': 'resource',
                    'visibility_policy': {
                        'version': 1,
                        'scope': 'linked',
                        'audience_ids': ['family-car'],
                        'shared_state_presence': True,
                        'grants_calendar_access': False,
                        'principle': 'state_presence_without_calendar_access',
                        'fields': {
                            'title': 'busy',
                            'time': True,
                            'location': False,
                            'people': 'presence',
                            'linked_states': 'labels',
                        },
                    },
                },
            }
        )
        saved = next(item for item in service.state()['events'] if item['event_id'] == event.event_id)
        assert saved['dimensions']['calendar_layer_priority'] == 20
        assert saved['dimensions']['calendar_priority_dimension'] == 'resource'
        policy = saved['dimensions']['visibility_policy']
        assert policy['scope'] == 'linked'
        assert policy['shared_state_presence'] is True
        assert policy['grants_calendar_access'] is False
        assert policy['principle'] == 'state_presence_without_calendar_access'
        assert policy['fields']['people'] == 'presence'


def test_event_overflow_menu_exposes_layer_and_sharing_without_qcds() -> None:
    html = cally_one_html(static_mode=True)
    projection = Path('src/qcds_fabric/robots/cally_one/dimension_filter_ui.js').read_text(encoding='utf-8')
    assert 'callyEventProjectionAction' in html
    assert "button.title = 'Lager & delning'" in projection
    assert 'Visas överst när det är trångt' in projection
    assert 'Prioritera via dimension' in projection
    assert 'Vilka får se den här händelsen?' in projection
    assert 'Visa närvaro i delat tillstånd' in projection
    assert 'grants_calendar_access:false' in projection
    assert "principle:'state_presence_without_calendar_access'" in projection
    assert "fetch('/api/event'" in projection
    projection_section = projection.split('function eventPriority', 1)[1]
    assert '/api/infer' not in projection_section
    assert 'initializeCore' not in projection_section
    assert 'MutationObserver' not in projection_section
