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
    assert 'html body #stage .event.callyCompactControls .callyEventActionMenu::before{\n  content:none!important;' in html
    assert '#callyMoveOverrideBar [data-move-override="free"]::before{\n  content:none!important;' in html
