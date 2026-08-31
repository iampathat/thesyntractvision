from qcds_fabric.living_robot_public_visual96 import living_robot_public_visual96_html


def test_build96_caps_robotics_canvas_only_on_desktop() -> None:
    html = living_robot_public_visual96_html(static_mode=True)
    assert "BUILD 96: presentation-fit desktop Robotics" in html
    assert "@media(min-width:1051px)" in html
    assert "height:min(46vh,440px)!important" in html
    assert "grid-template-columns:minmax(0,1.35fr) minmax(310px,.85fr)!important" in html
    assert "#q75Canvas" in html

    # Presentation only: the real Robotics worker/core contract remains present.
    assert "robotics_playground_run" in html
    assert "q75WorkerRun" in html
    assert "QCDS" in html
