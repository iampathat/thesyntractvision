from pathlib import Path

from qcds_fabric.living_robot_public import living_robot_public_html


def test_build101_try_qcds_is_stable_native_accordion_surface() -> None:
    html = living_robot_public_html(static_mode=True)
    source = Path("src/qcds_fabric/living_robot_public_visual96.py").read_text(encoding="utf-8")

    assert "BUILD 100: clean Try QCDS presentation" in html
    assert "details.className='q100Stage'" in html
    assert "const summary=document.createElement('summary')" in html
    assert "details.addEventListener('toggle'" in html
    assert "q100StageBody" in html
    assert "Each stage expands here and stays open until you close it." in html

    # The final renderer uses independent native <details>. It never moves a
    # shared inspection panel and never invokes the historical q69Open flow.
    assert "q98EnsureStages" not in source
    assert "window.q69Open=function" not in source
    assert "q69Open(1,result)" not in source
    assert "insertAdjacentElement('afterend',panel)" not in source
    assert "window.scrollBy({top:delta" not in source

    # BUILD 101 fixes the real scroll bug: while QCDS is active the BODY itself
    # carries data-public-view=qcds. A broad closest([data-public-view=qcds])
    # therefore catches every click in the view. Only explicit ingress buttons
    # may reset the page to the top.
    assert "BUILD 101: only explicit QCDS ingress buttons" in html
    assert "button[data-public-view=\"qcds\"],button[data-qcds-top=\"1\"]" in html
    assert "closest?.('[data-public-view=\"qcds\"],[data-qcds-top=\"1\"]')" not in html
    assert "BUILD 101" in html

    # All primary TRY example buttons have one fixed visual width on desktop and
    # one fixed width on mobile, so label length cannot resize the controls.
    assert "inline-size:190px!important" in source
    assert "min-inline-size:190px!important" in source
    assert "max-inline-size:190px!important" in source
    assert "inline-size:146px!important" in source

    # A visitor gets immediate visible feedback while the existing QCDS/Pyodide
    # run executes, without adding a second inference path.
    assert "QCDS EMULATING…" in source
    assert "q100Running" in source
    assert "q100StartRunning" in source
    assert "box.scrollIntoView=()=>{}" in source

    assert "window.q67Render=function(result)" in source
    assert "consumes the exact result returned by the" in source
    assert "problem_to_syntract" not in source
    assert "run_parallel" not in source
