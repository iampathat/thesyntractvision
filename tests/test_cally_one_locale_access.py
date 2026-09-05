from qcds_fabric.robots.cally_one.enhanced_ui import cally_one_html


def test_language_domain_has_swedish_and_english_values():
    html = cally_one_html(static_mode=True)
    assert "key:'language'" in html
    assert "language-state" in html
    assert "{code:'sv'" in html
    assert "{code:'en'" in html
    assert "labels:{sv:'Språk',en:'Language'}" in html
    assert "state.state_model.language_is_dimension = true" in html


def test_language_picker_lives_under_hamburger_menu():
    html = cally_one_html(static_mode=True)
    assert "#callyMobileMenu" in html
    assert "callyLocaleAccessMenu" in html
    assert "data-cally-language" in html
    assert "Språk & konto" in html
    assert "Language & account" in html
    assert "location.reload()" in html


def test_superadmin_and_subscription_owner_are_explicit_account_state():
    html = cally_one_html(static_mode=True)
    assert "account_role" in html
    assert "access-role-state" in html
    assert "subscription_responsible" in html
    assert "role:'superadmin'" in html
    assert "window.__callyIsSuperadmin" in html
    assert "data-cally-account-admin" in html
    assert "data-admin-role" in html
    assert "data-admin-responsible" in html


def test_account_role_does_not_replace_person_work_role():
    html = cally_one_html(static_mode=True)
    assert "Rollerna är dimensionsstate och ersätter inte personens jobb-/familjeroll" in html
    assert "These are dimension states and do not replace a person’s work/family role" in html


def test_locale_access_stays_outside_qcds_inference_boundary():
    html = cally_one_html(static_mode=True)
    locale_part = html.split('Cally.One language + account-access surface.', 1)[1]
    assert "/api/infer" not in locale_part
    assert "initializeCore" not in locale_part
    assert "MutationObserver" not in locale_part
    assert "native_clients_are_adapters = true" in locale_part
    assert "shared_domain_contract = true" in locale_part
