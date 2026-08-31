from __future__ import annotations

import argparse
import re
from pathlib import Path
from typing import Sequence

from .living_robot_public_visual87 import living_robot_public_visual87_html as _base_html


PUBLIC_BUILD = "90"

_FACTS_CSS = r'''
/* BUILD 65: playground facts are metadata, not action cards. */
.invitePromise{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;min-width:500px;align-self:stretch;border-top:1px solid #31584d;border-bottom:1px solid #31584d;background:transparent}
.invitePromise div{position:relative;border:0!important;border-left:1px solid #31584d!important;background:transparent!important;border-radius:0!important;padding:10px 13px 10px 25px!important;box-shadow:none!important;cursor:default!important}
.invitePromise div:first-child{border-left:0!important}
.invitePromise div:before{content:"";position:absolute;left:11px;top:15px;width:6px;height:6px;border-radius:50%;background:#82e5ac;box-shadow:0 0 0 3px #82e5ac16}
.invitePromise b{display:block;color:#bff2d1!important;font-size:7px!important;line-height:1.2;letter-spacing:.12em;text-transform:uppercase}
.invitePromise span{display:block;color:#89a99a!important;font-size:7.5px!important;line-height:1.45;margin-top:4px!important}
@media(max-width:1050px){.invitePromise{min-width:0;margin-top:14px}}
@media(max-width:620px){.invitePromise{display:flex;flex-direction:column;border-bottom:0}.invitePromise div,.invitePromise div:first-child{border-left:0!important;border-top:1px solid #31584d!important;padding:10px 6px 10px 22px!important}.invitePromise div:first-child{border-top:0!important}.invitePromise div:before{left:7px;top:15px}.invitePromise b{font-size:7px!important}.invitePromise span{font-size:7.5px!important}}
'''

_ROUTER_CSS = r'''
/* BUILD 78: one top menu, one visible work surface. */
body.publicCompact #public-syntract-teaser,
body.publicCompact .publicCapabilityStrip{display:none!important}
body.publicCompact #try-logical-robot,
body.publicCompact #public-legal-question,
body.publicCompact #swedish-legal-robot,
body.publicCompact #public-robotics,
body.publicCompact #public-syntracts,
body.publicCompact>.hero,
body.publicCompact>.layout,
body.publicCompact>.learningMoment,
body.publicCompact>.understandBuild,
body.publicCompact>.domainLab,
body.publicCompact>.spaceBuilderWrap,
body.publicCompact>.sessionSandbox{display:none!important}
body.publicCompact.publicViewQcds #try-logical-robot{display:block!important}
body.publicCompact.publicViewLegal #public-legal-question,
body.publicCompact.publicViewLegal #swedish-legal-robot{display:block!important}
body.publicCompact.publicViewRobotics #public-robotics{display:block!important}
body.publicCompact.publicViewSyntract #public-syntracts{display:block!important}
body.publicCompact.publicViewAdvanced>.hero{display:block!important}
body.publicCompact.publicViewAdvanced>.layout{display:grid!important}
body.publicCompact.publicViewAdvanced>.learningMoment,
body.publicCompact.publicViewAdvanced>.understandBuild,
body.publicCompact.publicViewAdvanced>.domainLab,
body.publicCompact.publicViewAdvanced>.spaceBuilderWrap,
body.publicCompact.publicViewAdvanced>.sessionSandbox{display:block!important}
.publicCompactBar{position:sticky;top:0;z-index:80;background:#06131dcc;padding-top:7px;padding-bottom:7px;backdrop-filter:blur(10px)}
'''

_DETAILS_CSS = r'''
/* BUILD 82: Technical details must sit above the sticky public menu while open. */
header.publicTechnicalDetailsOpen{z-index:160!important}
header.publicTechnicalDetailsOpen .clarityDetails{z-index:170!important}
header.publicTechnicalDetailsOpen .clarityPanel{z-index:180!important}
@media(max-width:560px){header.publicTechnicalDetailsOpen .clarityPanel{max-height:calc(100vh - 110px);overflow:auto}}
'''

_STARTUP_CSS = r'''
/* BUILD 88: the build marker is diagnostic metadata, not part of the main menu. */
.publicBuildMark{position:fixed!important;top:5px!important;right:8px!important;z-index:95!important;order:initial!important;font-size:5.5px!important;letter-spacing:.12em!important;padding:3px 5px!important;opacity:.58!important;pointer-events:none!important;background:#06131de8!important;border-color:#29495d99!important}
@media(max-width:700px){.publicBuildMark{top:4px!important;right:5px!important;font-size:5px!important;padding:2px 4px!important}}
'''

_ROBOTICS_CONTROLS_CSS = r'''
/* BUILD 89: controls belong to the route grid, especially on touch screens. */
.publicRoboticsStage{grid-template-areas:"canvas panel" "tools panel"!important;grid-template-rows:auto auto;column-gap:13px!important;row-gap:4px!important}
.publicRobotCanvasWrap{grid-area:canvas}.publicRoboticsStage>.publicRoboticsTools{grid-area:tools;margin:0!important;padding:2px 1px 0;align-self:start}.publicRobotPanel{grid-area:panel;grid-row:1 / span 2}
@media(max-width:1050px){.publicRoboticsStage{grid-template-columns:1fr!important;grid-template-areas:"canvas" "tools" "panel"!important;grid-template-rows:auto auto auto;row-gap:5px!important}.publicRobotPanel{grid-area:panel;grid-row:auto}.publicRoboticsStage>.publicRoboticsTools{display:flex!important;flex-wrap:nowrap!important;overflow-x:auto;overscroll-behavior-x:contain;gap:6px!important;margin:0!important;padding:4px 1px 3px!important;scrollbar-width:none;-webkit-overflow-scrolling:touch}.publicRoboticsStage>.publicRoboticsTools::-webkit-scrollbar{display:none}.publicRoboticsStage>.publicRoboticsTools button{flex:0 0 auto;white-space:nowrap;padding:8px 11px!important}}
'''

_ROBOTICS_READY_CSS = r'''
/* BUILD 90: when the body is at B and a valid route world is ready, make the next action obvious. */
#q75Reset.q90ReadyCue{border-color:#9aefb7!important;background:#123b28!important;color:#effff4!important;box-shadow:0 0 0 0 #8ce3b255;animation:q90ReadyPulse 1.15s ease-in-out infinite}
@keyframes q90ReadyPulse{0%,100%{box-shadow:0 0 0 0 #8ce3b222;transform:translateY(0)}50%{box-shadow:0 0 0 7px #8ce3b21f;transform:translateY(-1px)}}
@media(prefers-reduced-motion:reduce){#q75Reset.q90ReadyCue{animation:none}}
'''

_ROUTER_SCRIPT = r'''
<script>
/* BUILD 88: one startup source. Visual Logical Robot is always the public front door. */
(function(){
  const VIEW_CLASS={
    qcds:'publicViewQcds',
    legal:'publicViewLegal',
    robotics:'publicViewRobotics',
    syntract:'publicViewSyntract',
    advanced:'publicViewAdvanced'
  };
  const ALL=Object.values(VIEW_CLASS);
  window.publicSelectView=function(requested){
    const view=Object.prototype.hasOwnProperty.call(VIEW_CLASS,requested)?requested:'robotics';
    ALL.forEach(name=>document.body.classList.remove(name));
    document.body.classList.add(VIEW_CLASS[view]);
    document.body.dataset.publicView=view;
    document.querySelectorAll('[data-public-view]').forEach(btn=>btn.classList.toggle('active',btn.dataset.publicView===view));
    if(view==='legal' && typeof window.publicSelectLegalMode==='function'){
      const hasLegalMode=document.body.classList.contains('publicLegalAsk')||document.body.classList.contains('publicLegalExamples')||document.body.classList.contains('publicLegalDetails');
      if(!hasLegalMode)window.publicSelectLegalMode('ask',false);
    }
    if(view==='robotics' && typeof window.q75Activate==='function')window.setTimeout(window.q75Activate,0);
  };
  window.publicSelectView('robotics');
})();
</script>
'''

_DETAILS_SCRIPT = r'''
<script>
/* BUILD 82: raise the header stacking context only while Technical details is open. */
(function(){
  const details=document.getElementById('clarityDetails');
  const header=details?.closest('header');
  if(!details||!header)return;
  const sync=()=>header.classList.toggle('publicTechnicalDetailsOpen',details.open);
  details.addEventListener('toggle',sync);
  sync();
})();
</script>
'''

_ROBOTICS_READY_SCRIPT = r'''
<script>
/* BUILD 90: READY means exactly one thing — QCDS is settled and the body can be reset from B to A for a new run. */
(function(){
  Q75.resetCueTimer=null;
  Q75.resetCuePhase=false;

  function q90ResetButton(){return document.getElementById('q75Reset')}
  function q90CanCue(){
    return !Q75.planning && !Q75.editing && !Q75.editSettleTimer && !!Q75.result?.reachable && q75Key(...Q75.robot)===q75Key(...Q75.goal);
  }
  function q90StopResetCue(){
    if(Q75.resetCueTimer){clearInterval(Q75.resetCueTimer);Q75.resetCueTimer=null}
    Q75.resetCuePhase=false;
    const button=q90ResetButton();
    if(!button)return;
    button.classList.remove('q90ReadyCue');
    button.dataset.ready='0';
    button.textContent='RESET A → B';
    button.removeAttribute('title');
  }
  function q90StartResetCue(){
    if(!q90CanCue()){q90StopResetCue();return}
    const button=q90ResetButton();
    if(!button)return;
    button.classList.add('q90ReadyCue');
    button.dataset.ready='1';
    button.title='Route world ready — reset the robot to A for another A → B run';
    if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
      button.textContent='READY · RESET A → B';
      return;
    }
    if(Q75.resetCueTimer)return;
    Q75.resetCuePhase=true;
    button.textContent='READY';
    Q75.resetCueTimer=setInterval(()=>{
      if(!q90CanCue()){q90StopResetCue();return}
      Q75.resetCuePhase=!Q75.resetCuePhase;
      button.textContent=Q75.resetCuePhase?'READY':'RESET A → B';
    },820);
  }
  window.q90SyncResetCue=function(){q90CanCue()?q90StartResetCue():q90StopResetCue()};

  const baseReset=q75ResetRobot;
  q75ResetRobot=function(){q90StopResetCue();return baseReset.apply(this,arguments)};

  const baseTick=q75Tick;
  q75Tick=function(){const value=baseTick.apply(this,arguments);q90SyncResetCue();return value};

  const baseEmulating=q79SetEmulating;
  q79SetEmulating=function(active){
    if(active)q90StopResetCue();
    const value=baseEmulating.apply(this,arguments);
    if(!active)setTimeout(q90SyncResetCue,0);
    return value;
  };

  const baseBeginEdit=q80BeginEdit;
  q80BeginEdit=function(){q90StopResetCue();return baseBeginEdit.apply(this,arguments)};

  setTimeout(q90SyncResetCue,0);
})();
</script>
'''

_OLD_QCDS_START = "window.addEventListener('DOMContentLoaded',()=>{publicSetLegalContext('jb_unauthorized_sublet_forfeiture_2026.json');publicSelectView('qcds')});"
_NEUTRAL_LEGAL_START = "window.addEventListener('DOMContentLoaded',()=>{publicSetLegalContext('jb_unauthorized_sublet_forfeiture_2026.json')});"


def _robotics_first_paint(match: re.Match[str]) -> str:
    classes = match.group(1).split()
    classes = [name for name in classes if not name.startswith("publicView")]
    if "publicCompact" not in classes:
        classes.insert(0, "publicCompact")
    classes.append("publicViewRobotics")
    return f'<body class="{" ".join(classes)}" data-public-view="robotics">'


def _dock_robotics_controls(html: str) -> str:
    tools_match = re.search(r'\n\s*(<div class="publicRoboticsTools">.*?</div>)\s*\n', html, flags=re.S)
    if tools_match is None:
        raise RuntimeError("Robotics controls changed; BUILD 89 cannot dock them safely")
    tools = tools_match.group(1)
    html = html[:tools_match.start()] + "\n" + html[tools_match.end():]
    panel_anchor = '<aside class="publicRobotPanel">'
    if html.count(panel_anchor) != 1:
        raise RuntimeError("Robotics stage changed; BUILD 89 cannot place controls beside the route grid safely")
    return html.replace(panel_anchor, tools + "\n      " + panel_anchor, 1)


def _mark_reset_control(html: str) -> str:
    old = '<button type="button" onclick="q75ResetRobot()">RESET A → B</button>'
    new = '<button type="button" id="q75Reset" data-ready="0" onclick="q75ResetRobot()">RESET A → B</button>'
    if html.count(old) != 1:
        raise RuntimeError("Robotics reset control changed; BUILD 90 cannot attach READY cue safely")
    return html.replace(old, new, 1)


def living_robot_public_html(*, static_mode: bool = False) -> str:
    """Single stable public exporter used by both Pages and regression tests.

    Presentation/routing only. The QCDS four phases, oracle semantics, Logical
    Space inference, parallel Syntract composition, Robotics Playground and
    Syntract binding remain defined by their existing Python modules and are
    deliberately not reimplemented in this stable exporter.
    """

    html = _base_html(static_mode=static_mode)

    # Historical compact UI used to force TRY QCDS on DOMContentLoaded. The
    # stable public artifact has one startup owner now: the final router below.
    if _OLD_QCDS_START not in html:
        raise RuntimeError("legacy QCDS startup hook changed; BUILD 88 cannot neutralize it safely")
    html = html.replace(_OLD_QCDS_START, _NEUTRAL_LEGAL_START, 1)

    # Normalize whichever historical publicView* class survived the wrapper
    # chain. Robotics must be correct before JS executes, avoiding a QCDS flash.
    html, body_count = re.subn(
        r'<body class="([^"]*)"(?:\s+data-public-view="[^"]*")?>',
        _robotics_first_paint,
        html,
        count=1,
    )
    if body_count != 1:
        raise RuntimeError("public body markup changed; BUILD 88 cannot establish Robotics first paint safely")

    # The route controls are part of the route stage, not the explanatory hero.
    # This keeps draw/erase/run/reset immediately adjacent to the canvas on mobile.
    html = _dock_robotics_controls(html)
    html = _mark_reset_control(html)

    html, count = re.subn(
        r'<span class="publicBuildMark">BUILD\s+\d+</span>',
        f'<span class="publicBuildMark">BUILD {PUBLIC_BUILD}</span>',
        html,
        count=1,
    )
    if count != 1:
        raise RuntimeError("public build marker changed; stable exporter cannot identify it safely")
    html = re.sub(
        r'<div class="publicAdvancedKicker">BUILD\s+\d+\s*·\s*ADVANCED</div>',
        '<div class="publicAdvancedKicker">ADVANCED</div>',
        html,
        count=1,
    )
    facts = {
        '<b>REAL CORE</b><span>Same qcds_fabric inference path.</span>': '<b>QCDS CORE</b><span>Real qcds_fabric inference path.</span>',
        '<b>SESSION ONLY</b><span>Close the tab and the room disappears.</span>': '<b>TEMPORARY SESSION</b><span>Nothing is stored after you leave.</span>',
        '<b>ADVANCED LAB BELOW</b><span>Every field and control is still there.</span>': '<b>FULL LAB AVAILABLE</b><span>The advanced controls remain below.</span>',
    }
    for old, new in facts.items():
        if old not in html:
            raise RuntimeError(f"playground fact changed; BUILD {PUBLIC_BUILD} cannot restyle it safely")
        html = html.replace(old, new, 1)
    if "</style>" not in html or "</body>" not in html:
        raise RuntimeError("public shell missing; stable router cannot attach")
    html = html.replace("</style>", _FACTS_CSS + "\n" + _ROUTER_CSS + "\n" + _DETAILS_CSS + "\n" + _STARTUP_CSS + "\n" + _ROBOTICS_CONTROLS_CSS + "\n" + _ROBOTICS_READY_CSS + "\n</style>", 1)
    html = html.replace("</body>", _ROBOTICS_READY_SCRIPT + "\n" + _ROUTER_SCRIPT + "\n" + _DETAILS_SCRIPT + "\n</body>", 1)
    return html


def export_static(path: str | Path) -> Path:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(living_robot_public_html(static_mode=True), encoding="utf-8")
    return target


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Export the stable public QCDS surface.")
    parser.add_argument("--export", required=True, help="Output HTML path")
    args = parser.parse_args(argv)
    export_static(args.export)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())