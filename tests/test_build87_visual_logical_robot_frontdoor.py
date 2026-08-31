from __future__ import annotations

from qcds_fabric.living_robot_public import PUBLIC_BUILD, living_robot_public_html


def test_visual_logical_robot_is_the_public_front_door() -> None:
    html = living_robot_public_html(static_mode=True)

    assert int(PUBLIC_BUILD) >= 90
    assert "THE SYNTRACT VISION · ONE QCDS · MANY BODIES" in html
    assert "VISUAL LOGICAL ROBOT · QCDS / SYNTRACT" in html
    assert "Draw reality. Watch QCDS find the shortest coherent route." in html
    assert 'data-public-view="robotics" class="active"' in html
    body_tag = html.split("<body", 1)[1].split(">", 1)[0]
    assert "publicViewRobotics" in body_tag
    assert "publicViewQcds" not in body_tag
    assert 'data-public-view="robotics"' in body_tag
    assert "window.publicSelectView('robotics');" in html

    # The historical compact startup hook must never be allowed to seize the
    # public page back for TRY QCDS on first load or browser reload.
    assert "publicSetLegalContext('jb_unauthorized_sublet_forfeiture_2026.json');publicSelectView('qcds')" not in html
    assert "active?.dataset.publicView||'robotics'" not in html

    nav = html.split('<div class="publicCompactActions">', 1)[1].split("</div>", 1)[0]
    assert nav.index("VISUAL LOGICAL ROBOT") < nav.index("TRY QCDS")
    assert nav.index("TRY QCDS") < nav.index("SYNTRACTS")


def test_qcds_ingress_always_opens_at_the_top_of_the_public_view() -> None:
    html = living_robot_public_html(static_mode=True)

    # Both the top-menu action and the Visual Logical Robot bridge use the same
    # top-ingress contract. View switching must not preserve a deep scroll offset.
    assert 'data-qcds-top="1"' in html
    assert '[data-public-view="qcds"],[data-qcds-top="1"]' in html
    assert "requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'auto'}))" in html
    assert "UNDERSTAND QCDS →" in html
    assert "TRY QCDS" in html


def test_build_badge_is_small_and_fixed_in_the_upper_right_corner() -> None:
    html = living_robot_public_html(static_mode=True)

    assert ".publicBuildMark{position:fixed!important" in html
    assert "top:5px!important" in html
    assert "right:8px!important" in html
    assert "font-size:5.5px!important" in html
    assert "pointer-events:none!important" in html


def test_robotics_controls_are_docked_directly_below_the_route_grid() -> None:
    html = living_robot_public_html(static_mode=True)
    stage = html.split('<div class="publicRoboticsStage">', 1)[1].split('</aside>', 1)[0]

    canvas_pos = stage.index('id="q75Canvas"')
    tools_pos = stage.index('<div class="publicRoboticsTools">')
    panel_pos = stage.index('<aside class="publicRobotPanel">')
    assert canvas_pos < tools_pos < panel_pos
    assert 'grid-template-areas:"canvas panel" "tools panel"' in html
    assert 'grid-template-areas:"canvas" "tools" "panel"' in html
    assert 'overflow-x:auto' in html
    assert '-webkit-overflow-scrolling:touch' in html


def test_reset_control_signals_ready_after_a_changed_world_not_merely_at_b() -> None:
    html = living_robot_public_html(static_mode=True)

    assert 'id="q75Reset" data-ready="0"' in html
    assert "Q75.worldChangedSinceReset=false" in html
    assert "Q75.worldChangedSinceReset=true" in html
    assert "!!Q75.worldChangedSinceReset" in html
    assert "!!Q75.result?.reachable" in html
    assert "!Q75.planning && !Q75.editing && !Q75.editSettleTimer" in html
    assert "window.q90SyncResetCue=()=>canCue()?startCue():stopCue()" in html
    assert "q75Key(...Q75.robot)===q75Key(...Q75.goal)" in html  # historical BUILD 90 script may remain, but is overridden after DOMContentLoaded
    assert "Reaching B alone must not cue" in html
    assert "Q75.worldChangedSinceReset=false;\n    stopCue();\n    return baseReset" in html


def test_reset_ready_button_keeps_one_fixed_width_while_text_alternates() -> None:
    html = living_robot_public_html(static_mode=True)

    assert "#q75Reset{inline-size:13.5em!important" in html
    assert "min-inline-size:13.5em!important" in html
    assert "max-inline-size:13.5em!important" in html
    assert "box-sizing:border-box!important" in html
    assert "button.textContent=Q75.resetCuePhase?'READY':'RESET A → B'" in html
    assert "transform:none!important" in html
    assert "@keyframes q91ReadyGlow" in html


def test_visual_robot_explains_reality_oracles_qcds_syntract_and_body() -> None:
    html = living_robot_public_html(static_mode=True)

    for phrase in (
        "1 · REALITY",
        "2 · ORACLES",
        "3 · QCDS",
        "4 · SYNTRACT",
        "5 · BODY",
        "Reality becomes logic",
        "Alternatives are inferred together",
        "A coherent structure binds",
        "The robot manifests one route",
        "The body can change. The intelligence architecture does not.",
        "Camera / lidar → motors",
        "Logical Space → Oracles → QCDS → TruthDistribution → Syntract",
    ):
        assert phrase in html


def test_visual_narration_only_reads_the_existing_robotics_run() -> None:
    html = living_robot_public_html(static_mode=True)
    visual85 = html.split("/* BUILD 85: narrate the same route run; never infer anything in the presentation layer. */", 1)[1]

    assert "Q75.result" in visual85
    assert "q75Status=function" in visual85
    assert "q75UpdatePanel=function" in visual85
    assert "shortest_path_count" in visual85
    assert "robotics_playground_run" not in visual85
    assert "q75WorkerRun(" not in visual85
    assert "A*" not in visual85
    assert "breadth" not in visual85.lower()
