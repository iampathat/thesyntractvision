from pathlib import Path

from qcds_fabric.living_robot_public import living_robot_public_html


def test_build98_qcds_stage_details_are_local_stable_accordions() -> None:
    html = living_robot_public_html(static_mode=True)

    assert "BUILD 98: each QCDS stage owns its own detail area" in html
    assert "q98EnsureStages" in html
    assert "q98Stage" in html
    assert "q98Detail" in html
    assert "q98SourcePanel" in html
    assert "while(state.source.firstChild)detail.appendChild(state.source.firstChild)" in html

    # No viewport correction or panel shuffling from BUILD 97 remains.
    assert "q97PlaceInspect" not in html
    assert "window.scrollBy({top:delta" not in html
    assert "anchor.insertAdjacentElement('afterend',panel)" not in html

    # Active/focus states remain dark and readable on touch/mobile browsers.
    assert "background:#09281f!important" in html
    assert "background:#061923!important" in html

    # Presentation continues to delegate to the existing QCDS inspection renderer.
    source = Path("src/qcds_fabric/living_robot_public_visual96.py").read_text(encoding="utf-8")
    assert "const baseOpen=window.q69Open" in source
    assert "exact inspection data from the real run" in source
    assert "problem_to_syntract" not in source
    assert "run_parallel" not in source
