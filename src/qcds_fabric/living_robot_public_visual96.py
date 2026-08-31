from __future__ import annotations

from .living_robot_public_visual87 import living_robot_public_visual87_html as _base_html


_CSS = r'''
/* BUILD 96: presentation-fit desktop Robotics. Keep the whole demo moment visible. */
@media(min-width:1051px){
  body.publicViewRobotics #public-robotics .publicRoboticsStage{
    grid-template-columns:minmax(0,1.35fr) minmax(310px,.85fr)!important;
    column-gap:12px!important;
    align-items:start!important;
  }
  body.publicViewRobotics #public-robotics .publicRobotCanvasWrap{
    display:grid!important;
    place-items:center!important;
    min-width:0!important;
  }
  body.publicViewRobotics #public-robotics #q75Canvas{
    width:auto!important;
    height:min(46vh,440px)!important;
    max-width:100%!important;
    aspect-ratio:5/3!important;
  }
  body.publicViewRobotics #public-robotics .publicRoboticsTools{
    justify-content:center!important;
  }
}
'''


def living_robot_public_visual96_html(*, static_mode: bool = False) -> str:
    """Desktop presentation-fit layer only; QCDS/Robotics inference is unchanged."""
    html = _base_html(static_mode=static_mode)
    if "</style>" not in html:
        raise RuntimeError("public style shell changed; BUILD 96 cannot attach safely")
    return html.replace("</style>", _CSS + "\n</style>", 1)


__all__ = ["living_robot_public_visual96_html"]
