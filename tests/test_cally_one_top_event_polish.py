from __future__ import annotations

from pathlib import Path

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
