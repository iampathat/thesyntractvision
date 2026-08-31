from pathlib import Path

from qcds_fabric.living_robot_public import living_robot_public_html


def test_build97_qcds_stage_details_stay_with_selected_stage() -> None:
    html = living_robot_public_html(static_mode=True)

    assert "BUILD 97: keep QCDS stage inspection local to the clicked stage" in html
    assert "q97PlaceInspect" in html
    assert "anchor.insertAdjacentElement('afterend',panel)" in html
    assert "grid-column:1 / -1!important" in html
    assert "window.scrollBy({top:delta,left:0,behavior:'auto'})" in html
    assert "q97UserStepClick" in html

    # The presentation layer must continue to delegate rendering to the existing
    # inspectable QCDS result rather than introducing another inference path.
    source = Path("src/qcds_fabric/living_robot_public_visual96.py").read_text(encoding="utf-8")
    assert "const baseOpen=window.q69Open" in source
    assert "q69Open still renders the exact same real QCDS inspection data" in source
    assert "problem_to_syntract" not in source
    assert "run_parallel" not in source
