from __future__ import annotations

from qcds_fabric.living_robot_public import living_robot_public_html


def test_robotics_freezes_body_while_qcds_replans() -> None:
    html = living_robot_public_html(static_mode=True)

    for phrase in (
        'id="q79Emulating"',
        'QCDS EMULATING…',
        'Q75.planning=false',
        'Q75.planning||!Q75.running',
        'q79InvalidateRoute()',
        'Q75.result=null',
        'Q75.path=[]',
        'const seq=++Q75.planSeq',
        'if(seq!==Q75.planSeq)return',
        'Q75.blocked.has(nextKey)||manhattan!==1',
        'Oracle space changed. The previous route binding is invalid',
    ):
        assert phrase in html


def test_robotics_world_edit_invalidates_before_redraw() -> None:
    html = living_robot_public_html(static_mode=True)
    apply_start = html.index('q75ApplyCell=function(x,y)')
    apply_end = html.index('q75Tick=function()', apply_start)
    apply_block = html[apply_start:apply_end]

    assert 'q75SchedulePlan();' in apply_block
    assert 'q75DrawWorld();q75SchedulePlan()' not in apply_block
