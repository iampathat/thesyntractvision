from qcds_fabric.living_robot_public_fix48 import living_robot_public_fix48_html


def test_pick_a_world_public_repair_bypasses_manual_observation_parser() -> None:
    html = living_robot_public_fix48_html(static_mode=True)

    assert "function q48Compile(seed)" in html
    assert "space:q48Space(seed)" in html
    assert "terms:[seed.subject,dimension,String(expected)]" in html
    assert "q38Compile=q48Compile" in html
    assert "builder-observations',lines.join('\\n')" in html
    assert "Translating question/material into oracle constraints" in html
    assert "QCDS run failed:" in html


def test_try_qcds_navigation_scrolls_to_the_actual_try_surface() -> None:
    html = living_robot_public_fix48_html(static_mode=True)

    assert "target=document.getElementById('try-logical-robot')" in html
    assert "target.scrollIntoView" in html
    assert "window.trySeed=function(name)" in html


def test_advanced_defaults_to_one_compact_summary_and_hides_legacy_wall() -> None:
    html = living_robot_public_fix48_html(static_mode=True)

    assert 'id="public-advanced"' in html
    assert "More depth without the wall of controls." in html
    assert "MANUAL SPACE + PROBE" in html
    assert "RAW RESEARCH LAB" in html
    assert "body.publicCompact.publicViewAdvanced>.sessionSandbox{display:none!important}" in html
    assert "body.publicCompact.publicViewAdvanced.publicAdvancedManual>.sessionSandbox{display:block!important}" in html
    assert "body.publicCompact.publicViewAdvanced.publicAdvancedRaw>.domainLab{display:block!important}" in html
    assert "publicAdvancedMode('summary')" in html
    assert "q48LastRunTitle" in html
