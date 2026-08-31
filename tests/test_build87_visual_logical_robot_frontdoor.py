from __future__ import annotations

from qcds_fabric.living_robot_public import PUBLIC_BUILD, living_robot_public_html


def test_visual_logical_robot_is_the_public_front_door() -> None:
    html = living_robot_public_html(static_mode=True)

    assert PUBLIC_BUILD == "87"
    assert "THE SYNTRACT VISION · ONE QCDS · MANY BODIES" in html
    assert "VISUAL LOGICAL ROBOT · QCDS / SYNTRACT" in html
    assert "Draw reality. Watch QCDS find the shortest coherent route." in html
    assert 'data-public-view="robotics" class="active"' in html
    assert "active?.dataset.publicView||'robotics'" in html

    nav = html.split('<div class="publicCompactActions">', 1)[1].split("</div>", 1)[0]
    assert nav.index("VISUAL LOGICAL ROBOT") < nav.index("TRY QCDS")
    assert nav.index("TRY QCDS") < nav.index("SYNTRACTS")


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
