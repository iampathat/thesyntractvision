from qcds_fabric.robots.cally_one.enhanced_ui import cally_one_html


def test_static_surface_is_lazy_until_core_backed_action():
    html = cally_one_html(static_mode=True)
    assert "let worker = null" in html
    assert "window.__callyWorkerStarted = false" in html
    assert "function ensureWorkerStarted()" in html
    assert "synchronizeCoreInBackground" not in html
    assert "observer.observe(document.body, {childList:true, subtree:true});" not in html
    assert "observer.observe(stage, {childList:true, subtree:true});" not in html
    assert "path === '/api/state' && !window.__callyWorkerStarted" in html


def test_event_editor_uses_swedish_product_language_and_local_title_autosave():
    html = cally_one_html(static_mode=True)
    for label in ("Händelse", "När", "Var", "Personer", "Kopplade tillstånd", "Mer", "Kolla tider", "Spara"):
        assert label in html
    assert "callyTitleAutosave" in html
    assert "localStorage.setItem(localKey" in html
    assert "event.title = next" in html


def test_navigation_is_explicit_and_mobile_menu_is_bounded():
    html = cally_one_html(static_mode=True)
    assert "nav.id = 'callyIntegratedNav'" in html
    assert 'id="callyMenuButton"' in html
    assert 'max-height:calc(100dvh' in html
    for label in ("Calendar Space", "Organisationer", "Resurser", "Saker/krav", "+ Person"):
        assert label in html


def test_person_cards_use_stable_entity_ids_and_direct_editor():
    html = cally_one_html(static_mode=True)
    assert 'data-state-entity="${esc(entity.entity_id)}"' in html
    assert "openPersonEditor(card.dataset.stateEntity)" in html
    assert "data-person-entity" in html
    assert "Händelsedeltagande och transportstatus ändras inte här" in html


def test_interaction_controller_is_singleton_and_observer_free():
    html = cally_one_html(static_mode=True)
    assert "if (window.__callyInteractionController) return" in html
    assert "window.__callyInteractionController = true" in html
    assert "document.addEventListener('click'" in html
    assert "observer.observe(document.body, {childList:true, subtree:true});" not in html


def test_visible_tribute_credit_names_creator_on_mobile_surface():
    html = cally_one_html(static_mode=True)
    assert "by Patrik Sundblom · Tribute License 1.0" in html
    assert ".brandText::after" in html


def test_single_event_uses_real_four_way_move_icon_not_overlap_expand_glyph():
    html = cally_one_html(static_mode=True)
    assert "const MOVE_ICON = '<svg" in html
    assert 'M12 2v20M2 12h20' in html
    assert 'html body #stage .event.callyCompactControls .callyEventActionMenu .eventMove{\n  display:grid!important;' in html
    assert 'pointer-events:auto!important;' in html
    assert 'touch-action:none!important;' in html
    assert 'html body #stage .event.callyCompactControls .callyEventActionMenu::before{\n  content:none!important;' in html
    assert '#callyMoveOverrideBar [data-move-override="free"]::before{\n  content:none!important;' in html


def test_four_way_move_handle_moves_on_the_visible_calendar_axes():
    html = cally_one_html(static_mode=True)
    integrity = html.split('Interaction integrity pass:', 1)[1]
    assert "event.target.closest?.('#stage .eventMove')" in integrity
    assert "handle.setPointerCapture?.(event.pointerId)" in integrity
    assert "document.elementFromPoint(event.clientX, event.clientY)" in integrity
    assert "under?.closest?.('[data-drop-date]')" in integrity
    assert "start.setFullYear(parts[0], parts[1]-1, parts[2]);" in integrity
    assert "if (dateCell.classList.contains('dayCol'))" in integrity
    assert "Math.round(rawMinutes / 15) * 15" in integrity
    assert "start.setHours(6 + Math.floor(snapped / 60), snapped % 60, 0, 0);" in integrity
    assert "fetch('/api/event/move'" in integrity
    assert "window.__callyGlobalMoveMode?.()" in integrity
    assert "mode === 'lock_all'" in integrity
    assert "mode === 'unlock_all'" in integrity
    assert '/api/infer' not in integrity
    assert 'initializeCore' not in integrity
    assert 'MutationObserver' not in integrity


def test_geometry_changes_get_bounded_overlap_rebuild_and_readable_count():
    html = cally_one_html(static_mode=True)
    integrity = html.split('Interaction integrity pass:', 1)[1]
    assert "await window.load?.();" in integrity
    assert "detail:{geometryExplicit:true}" in integrity
    assert "detail:{callyPostLayout:true}" in integrity
    assert "if (isFollowup) return;" in integrity
    assert "button.innerHTML = `<span>${count}</span><em>samtidiga</em><b aria-hidden=\"true\">↔</b>`;" in integrity
    assert "hasMissingProjectionAction()" in integrity
    assert ".callyEventProjectionAction" in integrity
    assert "callyProjectionRetry" in integrity
    assert '/api/infer' not in integrity
    assert 'initializeCore' not in integrity
