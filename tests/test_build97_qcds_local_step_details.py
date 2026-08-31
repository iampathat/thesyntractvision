from pathlib import Path

from qcds_fabric.living_robot_public import living_robot_public_html


def test_build100_try_qcds_is_stable_native_accordion_surface() -> None:
    html = living_robot_public_html(static_mode=True)

    assert "BUILD 100: clean Try QCDS presentation" in html
    assert "details.className='q100Stage'" in html
    assert "const summary=document.createElement('summary')" in html
    assert "details.addEventListener('toggle'" in html
    assert "q100StageBody" in html
    assert "Each stage expands here and stays open until you close it." in html

    # Independent native <details> elements are the interaction model. There is
    # no shared inspect panel being moved among step buttons and no auto-open.
    assert "q97PlaceInspect" not in html
    assert "q98EnsureStages" not in html
    assert "window.q69Open=function" not in html
    assert "q69Open(1,result)" not in html
    assert "insertAdjacentElement('afterend',panel)" not in html
    assert "window.scrollBy({top:delta" not in html

    # All primary TRY example buttons have one fixed visual width on desktop and
    # one fixed width on mobile, so label length cannot resize the controls.
    assert "inline-size:190px!important" in html
    assert "min-inline-size:190px!important" in html
    assert "max-inline-size:190px!important" in html
    assert "inline-size:146px!important" in html

    # A visitor gets immediate visible feedback while the existing QCDS/Pyodide
    # run executes, without adding a second inference path.
    assert "QCDS EMULATING…" in html
    assert "q100Running" in html
    assert "q100StartRunning" in html
    assert "box.scrollIntoView=()=>{}" in html

    source = Path("src/qcds_fabric/living_robot_public_visual96.py").read_text(encoding="utf-8")
    assert "window.q67Render=function(result)" in source
    assert "consumes the exact result returned by the" in source
    assert "problem_to_syntract" not in source
    assert "run_parallel" not in source
