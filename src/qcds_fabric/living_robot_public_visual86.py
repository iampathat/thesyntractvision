from __future__ import annotations

from .living_robot_public_visual85 import living_robot_public_visual85_html as _base_html


_BADGES = r'''
<div class="visualHeroBadges" aria-label="Visual Logical Robot highlights">
  <span><b>DRAW</b> reality with your finger</span>
  <span><b>WATCH</b> the route space change</span>
  <span><b>SEE</b> QCDS → Syntract → action</span>
</div>
'''

_CSS = r'''
/* BUILD 86: make the Visual Logical Robot feel like the hero, not another lab card. */
body.publicCompact.publicViewRobotics{background:radial-gradient(circle at 50% 8%,#14382c 0,#071923 33%,#050c12 72%)}
.publicRobotics{max-width:1840px;margin:14px auto 0;padding:0 18px 28px}.publicRoboticsInner{position:relative;overflow:hidden;border-color:#487060;background:radial-gradient(circle at 20% -10%,#123b2c 0,#09251f 25%,#071b24 58%,#06131b 100%);box-shadow:0 24px 80px #0007,0 0 0 1px #8be3ad0d;padding:22px;border-radius:22px}.publicRoboticsInner:before{content:"";position:absolute;inset:-40% 42% 55% -10%;background:radial-gradient(circle,#82e5ac16 0,transparent 68%);pointer-events:none}.publicRoboticsHead{position:relative;z-index:1;align-items:center}.publicRoboticsKicker{font-size:8px!important;letter-spacing:.18em!important}.publicRoboticsHead h2{font-size:clamp(28px,3vw,48px)!important;line-height:1.02;margin:8px 0 10px!important;letter-spacing:-.035em;max-width:1150px}.publicRoboticsHead p{font-size:10px!important;line-height:1.6!important;color:#99b7b0!important;max-width:1150px!important}.publicRoboticsExplain{max-width:430px!important;padding:13px 14px!important;font-size:8px!important;border-left:2px solid #89e6ae!important;background:#0b2a20cc!important;border-radius:0 12px 12px 0}.visualHeroBadges{display:flex;gap:7px;flex-wrap:wrap;margin:14px 0 6px;position:relative;z-index:1}.visualHeroBadges span{border:1px solid #365c55;background:#071b18cc;border-radius:999px;padding:7px 10px;font-size:7px;color:#8faaa4}.visualHeroBadges b{color:#c8f7d8;letter-spacing:.09em}.publicRoboticsTools{margin-top:12px!important}.publicRoboticsTools button{border-radius:999px!important;padding:8px 11px!important}.publicRoboticsStage{grid-template-columns:minmax(0,1.82fr) minmax(285px,.58fr)!important;gap:13px!important}.publicRobotCanvasWrap{border-radius:17px!important;border-color:#3b6970!important;background:#031018!important;padding:10px!important;box-shadow:inset 0 0 0 1px #8fe6b00b,0 18px 48px #0005}.publicRobotCanvasWrap canvas{border-radius:12px!important;box-shadow:inset 0 0 40px #0007}.publicRobotPanel{gap:9px!important}.publicRobotStatus,.publicRobotStat,.publicRobotFlow,.publicRobotOracleList{border-radius:12px!important;background:#06161ddd!important}.publicRobotStatus{font-size:8px!important;padding:11px!important}.publicRobotStat strong{font-size:13px!important}.publicRobotQuantum{border-radius:14px!important;padding:12px 14px!important;background:linear-gradient(135deg,#130f20,#071d25)!important}.visualLogicRail{margin-top:12px!important}.visualLogicStep{backdrop-filter:blur(5px)}
@media(max-width:1050px){.publicRoboticsInner{padding:16px}.publicRoboticsStage{grid-template-columns:1fr!important}.publicRoboticsExplain{max-width:none!important;margin-top:10px}.publicRoboticsHead{display:block!important}}@media(max-width:650px){.publicRobotics{padding:0 8px 20px}.publicRoboticsInner{padding:12px;border-radius:16px}.publicRoboticsHead h2{font-size:30px!important}.publicRoboticsHead p{font-size:9px!important}.visualHeroBadges{gap:5px}.visualHeroBadges span{width:100%;border-radius:9px}}
'''


def living_robot_public_visual86_html(*, static_mode: bool = False) -> str:
    html = _base_html(static_mode=static_mode)
    anchor = '<div class="publicRoboticsTools">'
    if html.count(anchor) != 1:
        raise RuntimeError("Robotics tools changed; BUILD 86 hero polish cannot attach")
    html = html.replace(anchor, _BADGES + "\n" + anchor, 1)
    html = html.replace("</style>", _CSS + "\n</style>", 1)
    return html


__all__ = ["living_robot_public_visual86_html"]
