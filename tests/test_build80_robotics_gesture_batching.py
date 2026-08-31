from __future__ import annotations

from qcds_fabric.living_robot_public import living_robot_public_html


def test_robotics_batches_drawing_before_qcds_emulation() -> None:
    html = living_robot_public_html(static_mode=True)

    assert "BUILD 80" in html
    assert "Q75.editing=false" in html
    assert "Q75.editDirty=false" in html
    assert "Q75.editSettleTimer=null" in html
    assert "EDITING WORLD · keep drawing · QCDS waits until you finish" in html
    assert "WORLD EDIT READY · waiting briefly for another stroke" in html
    assert "function q80BeginEdit()" in html
    assert "function q80MarkWorldDirty()" in html
    assert "function q80EndEdit()" in html
    assert "Q75.editSettleTimer=setTimeout" in html
    assert "},220);" in html
    assert "q75ApplyCell=function(x,y)" in html
    assert "if(before!==Q75.blocked.has(key))q80MarkWorldDirty();" in html
    assert "q75BindCanvas=function()" in html
    assert "c.addEventListener('pointerup',finish)" in html
    assert "c.addEventListener('pointercancel',finish)" in html
    assert "if(Q75.editing||Q75.editSettleTimer||Q75.planning" in html


def test_robotics_does_not_emulate_once_per_drawn_cell() -> None:
    html = living_robot_public_html(static_mode=True)
    build80 = html.split("/* BUILD 80: one settled drawing edit = one QCDS re-inference. */", 1)[1]

    apply_cell = build80.split("q75ApplyCell=function(x,y){", 1)[1].split("};", 1)[0]
    assert "q75SchedulePlan" not in apply_cell
    assert "q80MarkWorldDirty" in apply_cell
