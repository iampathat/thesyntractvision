from __future__ import annotations

from .living_robot_public_visual86 import living_robot_public_visual86_html as _base_html


_BRIDGE = r'''
<div class="visualBodyBridge" id="visualBodyBridge">
  <div class="visualBodyBridgeHead"><b>WHAT YOU JUST SAW</b><strong>The body can change. The intelligence architecture does not.</strong><span>The playground is a Visual Logical Robot: a body manifested on a canvas. Replace the finger with sensors and the canvas movement with motors, and the QCDS/Syntract relationship remains the same.</span></div>
  <div class="visualBodyCompare">
    <div class="visualBodyCard"><b>VISUAL BODY</b><strong>Finger / mouse → canvas</strong><span>You provide the changing world. Drawn geometry becomes oracle logic. The on-screen robot manifests one bound route.</span></div>
    <div class="visualBodyCore"><b>SAME INTELLIGENCE</b><strong>Logical Space → Oracles → QCDS → TruthDistribution → Syntract</strong><span>Sense → infer → bind → act → sense again ↺</span></div>
    <div class="visualBodyCard"><b>PHYSICAL BODY</b><strong>Camera / lidar → motors</strong><span>Sensors provide the changing world. Observations become oracle logic. Wheels, arms or other actuators manifest action.</span></div>
  </div>
  <div class="visualNextSteps"><span>Now that you have seen it:</span><button type="button" data-qcds-top="1" onclick="publicSelectView('qcds')">UNDERSTAND QCDS →</button><button type="button" onclick="publicSelectView('syntract')">SEE SYNTRACTS →</button></div>
</div>
'''

_CSS = r'''
/* BUILD 87: connect the visual body to the full Syntract Vision. */
.visualBodyBridge{margin-top:12px;border:1px solid #355c62;background:linear-gradient(145deg,#071a20,#0b201a);border-radius:15px;padding:13px}.visualBodyBridgeHead b{display:block;font-size:6.5px;letter-spacing:.14em;color:#8de8af}.visualBodyBridgeHead strong{display:block;margin-top:4px;font-size:13px;color:#edf9f2}.visualBodyBridgeHead span{display:block;margin-top:5px;max-width:1100px;font-size:7.5px;line-height:1.55;color:#89a49d}.visualBodyCompare{display:grid;grid-template-columns:1fr 1.3fr 1fr;gap:7px;margin-top:10px}.visualBodyCard,.visualBodyCore{border:1px solid #294c55;background:#06161b;border-radius:11px;padding:10px}.visualBodyCard b,.visualBodyCore b{display:block;font-size:6px;letter-spacing:.12em;color:#7899a1}.visualBodyCard strong,.visualBodyCore strong{display:block;margin-top:4px;font-size:8.5px;color:#e0f1ea}.visualBodyCard span,.visualBodyCore span{display:block;margin-top:4px;font-size:6.7px;line-height:1.5;color:#79958d}.visualBodyCore{border-color:#427255;background:linear-gradient(145deg,#0a251c,#07191c);text-align:center}.visualBodyCore b{color:#8ee9b0}.visualBodyCore strong{color:#d9f8e4}.visualNextSteps{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:10px;border-top:1px solid #24443f;padding-top:9px}.visualNextSteps span{font-size:7px;color:#78948c;margin-right:4px}.visualNextSteps button{border-radius:999px;padding:7px 9px;font-size:6.8px}
/* Small build identifier: visible, but no longer part of the navigation hierarchy. */
.publicBuildMark{position:fixed!important;top:6px!important;right:8px!important;z-index:145!important;order:unset!important;font-size:5.5px!important;letter-spacing:.11em!important;padding:3px 5px!important;opacity:.62!important;pointer-events:none!important;box-shadow:none!important;background:#07131ed9!important}
/* READY / RESET must never resize or hop when the cue alternates. */
#q75Reset{inline-size:13.5em!important;min-inline-size:13.5em!important;max-inline-size:13.5em!important;box-sizing:border-box!important;text-align:center!important}
#q75Reset.q90ReadyCue{transform:none!important;animation:q91ReadyGlow 1.15s ease-in-out infinite!important}
@keyframes q91ReadyGlow{0%,100%{box-shadow:0 0 0 0 #8ce3b222}50%{box-shadow:0 0 0 7px #8ce3b226}}
@media(max-width:850px){.visualBodyCompare{grid-template-columns:1fr}.visualBodyCore{order:-1;text-align:left}}
@media(max-width:560px){.visualNextSteps button{flex:1}.publicBuildMark{top:4px!important;right:5px!important;font-size:5px!important;padding:2px 4px!important;opacity:.56!important}}
'''

_STARTUP_SCRIPT = r'''
<script>
/* Public front door: normalize legacy wrapper state before the final stable router reads it. */
(function(){
  document.body.classList.remove('publicViewQcds','publicViewLegal','publicViewSyntract','publicViewAdvanced');
  document.body.classList.add('publicViewRobotics');
  document.body.dataset.publicView='robotics';
  document.querySelectorAll('[data-public-view]').forEach(btn=>btn.classList.toggle('active',btn.dataset.publicView==='robotics'));
})();

/* BUILD 92: TRY QCDS and UNDERSTAND QCDS are true view ingress points.
   Never preserve a deep scroll position from the previous public view. */
document.addEventListener('click',event=>{
  const trigger=event.target?.closest?.('[data-public-view="qcds"],[data-qcds-top="1"]');
  if(!trigger)return;
  requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'auto'}));
});

/* READY cue semantics: a changed obstacle world is ready to replay from A.
   This listener runs after the stable BUILD 90 scripts have been parsed, so it
   corrects only the UI cue; QCDS inference and route binding are untouched. */
window.addEventListener('DOMContentLoaded',()=>{
  if(typeof Q75==='undefined' || typeof q80MarkWorldDirty!=='function' || typeof q75ResetRobot!=='function')return;

  Q75.worldChangedSinceReset=false;

  const resetButton=()=>document.getElementById('q75Reset');
  const stopCue=()=>{
    if(Q75.resetCueTimer){clearInterval(Q75.resetCueTimer);Q75.resetCueTimer=null}
    Q75.resetCuePhase=false;
    const button=resetButton();
    if(!button)return;
    button.classList.remove('q90ReadyCue');
    button.dataset.ready='0';
    button.textContent='RESET A → B';
    button.removeAttribute('title');
  };
  const canCue=()=>{
    return !!Q75.worldChangedSinceReset && !Q75.planning && !Q75.editing && !Q75.editSettleTimer && !!Q75.result?.reachable;
  };
  const startCue=()=>{
    if(!canCue()){stopCue();return}
    const button=resetButton();
    if(!button)return;
    button.classList.add('q90ReadyCue');
    button.dataset.ready='1';
    button.title='World changed and QCDS is ready — reset to A to run the new route';
    if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){button.textContent='RESET A → B';return}
    if(Q75.resetCueTimer)return;
    Q75.resetCuePhase=true;
    button.textContent='READY';
    Q75.resetCueTimer=setInterval(()=>{
      if(!canCue()){stopCue();return}
      Q75.resetCuePhase=!Q75.resetCuePhase;
      button.textContent=Q75.resetCuePhase?'READY':'RESET A → B';
    },820);
  };

  /* BUILD 90 wrappers call this global function after ticks and after QCDS
     finishes. Replace its old "robot at B" meaning with "world changed". */
  window.q90SyncResetCue=()=>canCue()?startCue():stopCue();

  const baseMarkWorldDirty=q80MarkWorldDirty;
  q80MarkWorldDirty=function(){
    Q75.worldChangedSinceReset=true;
    stopCue();
    return baseMarkWorldDirty.apply(this,arguments);
  };

  if(typeof q75Clear==='function'){
    const baseClear=q75Clear;
    q75Clear=function(){
      if(Q75.blocked?.size)Q75.worldChangedSinceReset=true;
      stopCue();
      const value=baseClear.apply(this,arguments);
      return value;
    };
  }

  const baseReset=q75ResetRobot;
  q75ResetRobot=function(){
    Q75.worldChangedSinceReset=false;
    stopCue();
    return baseReset.apply(this,arguments);
  };

  /* Re-evaluate once after all startup work. Reaching B alone must not cue. */
  setTimeout(window.q90SyncResetCue,0);
});
</script>
'''


def living_robot_public_visual87_html(*, static_mode: bool = False) -> str:
    html = _base_html(static_mode=static_mode)
    anchor = '<div class="publicRobotQuantum"><strong>What is quantum here?</strong>'
    start = html.find(anchor)
    if start < 0:
        raise RuntimeError("Robotics quantum explanation changed; BUILD 87 body bridge cannot attach")
    end = html.find('</div>', start)
    if end < 0:
        raise RuntimeError("Robotics quantum explanation is malformed")
    end += len('</div>')
    html = html[:end] + "\n" + _BRIDGE + html[end:]

    initial_body = '<body class="publicCompact publicViewQcds publicLegalAsk">'
    if initial_body not in html:
        raise RuntimeError("public initial view changed; Visual Logical Robot front door cannot be guaranteed")
    html = html.replace(initial_body, '<body class="publicCompact publicViewRobotics publicLegalAsk">', 1)

    html = html.replace("</style>", _CSS + "\n</style>", 1)
    html = html.replace("</body>", _STARTUP_SCRIPT + "\n</body>", 1)
    return html


__all__ = ["living_robot_public_visual87_html"]
