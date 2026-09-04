from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory

from qcds_fabric.robots.cally_one.enhanced_ui import cally_one_html
from qcds_fabric.robots.cally_one.runtime_v3 import CallyOneService


def test_brand_home_moves_c_into_action_family_and_preserves_state_space() -> None:
    html = cally_one_html(static_mode=True)
    js = Path('src/qcds_fabric/robots/cally_one/brand_home_polish.js').read_text(encoding='utf-8')
    css = Path('src/qcds_fabric/robots/cally_one/brand_home_polish.css').read_text(encoding='utf-8')

    assert 'callyHomeTile' in html
    assert 'callyWordmarkHome' in html
    assert "['callyHomeTile','perspectiveBtn','personBtn','eventBtn','callyMenuButton']" in js
    assert "home.textContent = 'C'" in js
    assert "home.title = 'Calendar Space · alla states'" in js
    assert "home.addEventListener('click', openAllStates)" in js
    assert "const legacyStateTrigger = qs('.mark')" in js
    assert 'if (legacyStateTrigger) legacyStateTrigger.click()' in js
    assert "wordmark.addEventListener('click', goHome)" in js
    assert "week && !week.classList.contains('active')" in js
    assert "qs('#todayBtn')?.click()" in js
    assert '.callyLegacyMark{' in css
    assert '#callyHomeTile{' in css
    assert '.brandText::after{content:none!important' in css


def test_attribution_and_tribute_license_live_in_hamburger_menu() -> None:
    html = cally_one_html(static_mode=True)
    js = Path('src/qcds_fabric/robots/cally_one/brand_home_polish.js').read_text(encoding='utf-8')

    assert 'callyMenuAbout' in html
    assert 'OM CALLY.ONE' in html
    assert 'by Patrik Sundblom · Tribute License 1.0' in html
    assert 'Personal/family free · commercial/professional use €99/mo or €990/yr' in html
    assert "qs('.brand small')?.setAttribute('hidden', '')" in js
    assert '/api/infer' not in js
    assert 'initializeCore' not in js
    assert 'MutationObserver' not in js


def test_timeline_overlap_layout_fans_cards_then_expands_without_inference() -> None:
    html = cally_one_html(static_mode=True)
    base_js = Path('src/qcds_fabric/robots/cally_one/brand_home_polish.js').read_text(encoding='utf-8')
    fan_js = Path('src/qcds_fabric/robots/cally_one/manual_resolution_ui.js').read_text(encoding='utf-8')
    css = Path('src/qcds_fabric/robots/cally_one/brand_home_polish.css').read_text(encoding='utf-8')

    assert 'layoutTimelineOverlaps(state)' in base_js
    assert 'assignOverlapColumns(items)' in base_js
    assert 'applyCollapsedOverlap(cluster)' in fan_js
    assert 'applyExpandedOverlap(cluster)' in fan_js
    assert 'ensureOverlapSpreadButton(cluster)' in fan_js
    assert 'ensureOverlapTiming(cluster)' in fan_js
    assert "peek.className = 'callyOverlapPeek'" in fan_js
    assert "button.className = 'callyOverlapSpread'" in fan_js
    assert "<em>Fäll ihop</em>" in fan_js
    assert 'dayWidth * .24' in fan_js
    assert 'cardWidth >= 108' in fan_js
    assert "event.style.setProperty('--cally-overlap-left'" in fan_js
    assert "event.style.setProperty('--cally-overlap-width'" in fan_js
    assert "event.style.top = `${relative}px`" in fan_js
    assert '.callyOverlapCluster.callyOverlapFan{' in css
    assert '.callyOverlapPeek{' in css
    assert '.callyOverlapSpread{' in css
    assert '.callyOverlapCluster.expanded{' in css
    assert 'overflow-x:auto!important' in css
    assert '.resizeHandle' in html
    fan_section = fan_js.split('function overlapColumn', 1)[1].split('function enhancePlanningCards', 1)[0]
    assert '/api/infer' not in fan_section
    assert 'initializeCore' not in fan_section
    assert 'MutationObserver' not in fan_section


def test_large_overlap_sets_have_position_indicator_and_paged_deep_explorer() -> None:
    html = cally_one_html(static_mode=True)
    fan_js = Path('src/qcds_fabric/robots/cally_one/manual_resolution_ui.js').read_text(encoding='utf-8')
    css = Path('src/qcds_fabric/robots/cally_one/brand_home_polish.css').read_text(encoding='utf-8')

    assert 'ensureOverlapProgress(cluster)' in fan_js
    assert "progress.className = 'callyOverlapProgress'" in fan_js
    assert 'callyOverlapProgressThumb' in fan_js
    assert 'callyOverlapProgressLabel' in fan_js
    assert "button.className = 'callyOverlapDeep'" in fan_js
    assert 'openOverlapExplorer(cluster)' in fan_js
    assert 'const pageSize = 60' in fan_js
    assert 'SAMTIDIGHET · DJUPVY' in fan_js
    assert '1000' not in fan_js  # no hard ceiling; paging scales with the actual count
    assert '.callyOverlapProgress{' in css
    assert '.callyOverlapDeep{' in css
    assert '.callyOverlapExplorer{' in css
    assert '.callyOverlapExplorerRow{' in css
    assert 'backdrop-filter:blur(10px)!important' in css
    assert 'callyOverlapExplorer' in html
    explorer_section = fan_js.split('function updateOverlapProgress', 1)[1].split('function enhancePlanningCards', 1)[0]
    assert '/api/infer' not in explorer_section
    assert 'initializeCore' not in explorer_section
    assert 'MutationObserver' not in explorer_section


def test_actual_conflict_can_be_explicitly_accepted_without_deleting_it() -> None:
    with TemporaryDirectory() as root:
        service = CallyOneService(root)
        ball = service.upsert_entity(
            {
                'kind': 'resource',
                'label': 'Matchboll',
                'dimensions': {
                    'type': 'ball',
                    'mobility': 'stationary',
                    'capacity': 1,
                    'capacity_dimension': 'booking',
                },
            }
        )
        first = service.upsert_event(
            {
                'title': 'Elsa · fotbollsmatch',
                'start': '2026-09-05T17:00',
                'end': '2026-09-05T18:30',
                'links': [{'predicate': 'uses', 'object_id': ball.entity_id, 'dimensions': {'load': 1}}],
            }
        )
        second = service.upsert_event(
            {
                'title': 'Leo · fotbollsmatch',
                'start': '2026-09-05T17:15',
                'end': '2026-09-05T18:15',
                'links': [{'predicate': 'uses', 'object_id': ball.entity_id, 'dimensions': {'load': 1}}],
            }
        )
        conflict = next(item for item in service.state_conflicts() if item['state_id'] == ball.entity_id)
        assert conflict['status'] == 'unresolved'
        assert set(conflict['event_ids']) == {first.event_id, second.event_id}

        service.upsert_relation(
            {
                'relation_id': f"acceptance:{conflict['conflict_id']}",
                'subject_id': first.event_id,
                'predicate': 'accepts_conflict',
                'object_id': second.event_id,
                'dimensions': {
                    'conflict_id': conflict['conflict_id'],
                    'state_id': ball.entity_id,
                    'event_ids': conflict['event_ids'],
                    'accepted': True,
                    'accepted_by': 'human',
                },
            }
        )

        accepted = next(item for item in service.state_conflicts() if item['conflict_id'] == conflict['conflict_id'])
        assert accepted['status'] == 'accepted'
        assert accepted['severity'] == 'accepted_conflict'
        assert accepted['accepted_by'] == 'human'
        state = service.state()
        assert state['unresolved_conflict_count'] == 0
        assert state['accepted_conflict_count'] == 1
        assert state['state_model']['accepted_conflict_is_represented_state'] is True
        assert state['state_model']['accepted_conflict_remains_auditable'] is True

        result = service.infer_placement(second.event_id)
        current = result['candidate_worlds']['shift-zero']
        assert not any(reason.startswith(f"state:{ball.entity_id}:capacity:") for reason in current['reasons'])
        assert result['provenance']['accepted_conflicts_are_represented_conditions'] is True


def test_conflict_acceptance_ui_is_stateful_and_not_qcds() -> None:
    html = cally_one_html(static_mode=True)
    js = Path('src/qcds_fabric/robots/cally_one/brand_home_polish.js').read_text(encoding='utf-8')
    guard = Path('src/qcds_fabric/robots/cally_one/manual_resolution_ui.js').read_text(encoding='utf-8')
    css = Path('src/qcds_fabric/robots/cally_one/brand_home_polish.css').read_text(encoding='utf-8')

    assert "predicate:'accepts_conflict'" in js
    assert "button.textContent = accepted ? 'Ångra godkännande' : 'Det här är okej'" in js
    assert 'Godkänd samtidig användning' in js
    assert 'callyAcceptedConflictBadge' in html
    assert '.callyAcceptedConflict{' in css
    assert '.callyConflictAccept{' in css
    assert "body?.predicate === 'accepts_conflict'" in guard
    assert 'body.object_id = String(body.dimensions.event_ids[1])' in guard
    acceptance_section = js.split('async function setConflictAccepted', 1)[1].split('function effectiveConflicts', 1)[0]
    assert '/api/relation' in acceptance_section
    assert '/api/infer' not in acceptance_section
    assert 'initializeCore' not in acceptance_section