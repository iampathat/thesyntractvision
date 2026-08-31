from pathlib import Path

from qcds_fabric.living_robot_public import living_robot_public_html


def test_build99_try_qcds_is_non_scrolling_and_visibly_busy() -> None:
    html = living_robot_public_html(static_mode=True)

    assert "BUILD 99: stable Try QCDS UX" in html
    assert "q99StartBusy" in html
    assert "QCDS EMULATING…" in html
    assert "Forming the Logical Space and oracle constraints…" in html
    assert "aria-busy" in html
    assert "q99BusyDot" in html

    # Legacy quick-result code may still call scrollIntoView internally, but the
    # final public layer shadows it with a no-op before any visitor can run QCDS.
    assert "box.scrollIntoView=()=>{}" in html
    assert "data-q99-no-scroll" not in html  # dataset is set at runtime, not fake markup

    # Stages are local and independent. A later stage must not collapse all
    # earlier open stages and therefore must not change layout above the click.
    assert "if(!clickedButton)" in html
    assert "q67Render historically auto-opened STEP 1" in html
    assert "Other open stages remain untouched" in html
    assert "state.stages.forEach(stage=>{\n      stage.classList.remove('open')" not in html
    assert "window.scrollBy({top:delta" not in html
    assert "q97PlaceInspect" not in html

    # Active/focus states remain dark and readable on Safari/touch browsers.
    assert "background:#09281f!important" in html
    assert "background:#061923!important" in html
    assert "-webkit-tap-highlight-color:transparent!important" in html

    # Presentation continues to delegate to the existing real QCDS run and
    # inspection renderer instead of introducing another inference engine.
    source = Path("src/qcds_fabric/living_robot_public_visual96.py").read_text(encoding="utf-8")
    assert "const baseOpen=window.q69Open" in source
    assert "const baseRender=window.q67Render" in source
    assert "problem_to_syntract" not in source
    assert "run_parallel" not in source
