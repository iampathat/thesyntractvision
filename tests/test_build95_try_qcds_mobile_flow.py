from qcds_fabric.living_robot_public import living_robot_public_html


def test_try_qcds_mobile_keeps_result_with_selected_example():
    html = living_robot_public_html(static_mode=True)

    assert "BUILD 95: Try QCDS is one local mobile interaction" in html
    assert ".seed:not(.q95Active)" in html
    assert ".seed.q95Active" in html
    assert "quickResult.q95Docked" in html
    assert "button.insertAdjacentElement('afterend',result)" in html
    assert "q95Dock(selected)" in html


def test_try_qcds_mobile_suppresses_old_result_jump_without_replacing_qcds():
    html = living_robot_public_html(static_mode=True)

    assert "window.q48QuickStatus=q95Status" in html
    assert "window.q67Render=function(data){return q95QuietBoxScroll(()=>baseRender(data))}" in html
    assert "const baseRender=window.q67Render" in html
    assert "const baseTry=window.trySeed" in html
    assert "return baseTry(selected)" in html
    assert "runSeed38" in html
    assert "pick_world_run" in html


def test_try_qcds_six_inspection_steps_remain_present():
    html = living_robot_public_html(static_mode=True)

    for label in (
        "WORLD CONDITIONS",
        "PROPERTY SPACE",
        "LOGICAL SPACE",
        "ORACLE SPACE",
        "QCDS",
        "SYNTRACT",
    ):
        assert label in html
