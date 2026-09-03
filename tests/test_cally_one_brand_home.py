from __future__ import annotations

from pathlib import Path

from qcds_fabric.robots.cally_one.enhanced_ui import cally_one_html


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
