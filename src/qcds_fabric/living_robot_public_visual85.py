from __future__ import annotations

from .living_robot_public_visual84 import living_robot_public_visual84_html as _base_html


_LIVE = r'''
<div class="visualLiveNarrator" id="visualLiveNarrator">
  <div class="visualLivePulse" id="visualLivePulse"></div>
  <div class="visualLiveWords"><b id="visualLivePhase">VISUAL LOGICAL ROBOT</b><strong id="visualLiveTitle">Change the world with your finger.</strong><span id="visualLiveText">Draw a wall. The page will show where reality ends and QCDS/Syntract begins.</span></div>
  <div class="visualLiveMetric" id="visualLiveMetric">2^8 position space</div>
</div>
'''

_CSS = r'''
/* BUILD 85: the explanation follows the live QCDS cycle. */
.visualLiveNarrator{display:grid;grid-template-columns:10px minmax(0,1fr) auto;gap:10px;align-items:center;margin:10px 0 8px;padding:10px 12px;border:1px solid #31576a;background:linear-gradient(90deg,#071a24,#081e1a);border-radius:12px}.visualLivePulse{width:9px;height:9px;border-radius:50%;background:#77dba0;box-shadow:0 0 18px #77dba055}.visualLiveWords b{display:block;font-size:6px;letter-spacing:.13em;color:#7594a4}.visualLiveWords strong{display:block;margin-top:2px;font-size:10px;color:#e9f8f0}.visualLiveWords span{display:block;margin-top:3px;font-size:7px;line-height:1.4;color:#829da6}.visualLiveMetric{border:1px solid #31576a;background:#06141c;border-radius:999px;padding:6px 8px;font:6.5px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;color:#9bc4d4;white-space:nowrap}.visualLiveNarrator.qcds .visualLivePulse{background:#83cfff;box-shadow:0 0 20px #83cfff66}.visualLiveNarrator.syntract .visualLivePulse{background:#91efb4;box-shadow:0 0 20px #91efb466}.visualLiveNarrator.body .visualLivePulse{background:#e5d07d;box-shadow:0 0 20px #e5d07d55}@media(max-width:650px){.visualLiveNarrator{grid-template-columns:10px 1fr}.visualLiveMetric{grid-column:2;justify-self:start}}
'''

_SCRIPT = r'''
<script>
/* BUILD 85: narrate the same route run; never infer anything in the presentation layer. */
(function(){
  function activate(step,phase,title,text,mode=''){
    document.querySelectorAll('.visualLogicStep').forEach(node=>node.classList.toggle('active',node.dataset.visualStep===step));
    const card=document.getElementById('visualLiveNarrator');
    if(card)card.className='visualLiveNarrator '+mode;
    const p=document.getElementById('visualLivePhase'),t=document.getElementById('visualLiveTitle'),d=document.getElementById('visualLiveText');
    if(p)p.textContent=phase;if(t)t.textContent=title;if(d)d.textContent=text;
  }
  function metric(){
    const m=document.getElementById('visualLiveMetric'),r=Q75.result;
    if(!m)return;
    if(!r){m.textContent='2^8 position space';return}
    const oracles=r.oracle_summary?.total ?? r.oracle_summary?.active_last_recursive_pass ?? '—';
    const routes=r.reachable?Number(r.shortest_path_count||0).toLocaleString():'0';
    m.textContent='2^'+r.logical_width+' · '+oracles+' oracles · '+routes+' shortest routes';
  }

  const baseStatus=q75Status;
  q75Status=function(text,kind=''){
    baseStatus(text,kind);
    const value=String(text||'');
    if(value.includes('EDITING WORLD'))activate('reality','REALITY CHANGING','You are changing the represented world.','The robot freezes while your drawing becomes new explicit constraints.');
    else if(value.includes('WORLD EDIT READY'))activate('oracle','ORACLE SPACE CHANGED','Your drawing is now logic.','The previous route binding is invalid. QCDS waits for the edit to settle.');
    else if(value.includes('QCDS EMULATING')||value.includes('re-inferring'))activate('qcds','QCDS · RECURSIVE INFERENCE','The represented alternatives are being re-inferred.','The same QCDS core is running over the bounded position space under the active oracle logic.','qcds');
    else if(value.includes('route space aligned')||value.includes('shortest route'))activate('syntract','SYNTRACT · BOUND STRUCTURE','A minimum-depth route family survived.','The coherent route family is retained; the robot body will manifest one member of it.','syntract');
    else if(value.includes('reached B'))activate('body','BODY · MANIFESTATION','The visual body reached B.','The body moved. The intelligence remained the QCDS/Syntract system behind the body.','body');
    else if(value.includes('No coherent route'))activate('syntract','NO COHERENT BINDING','The oracle space currently blocks every route.','QCDS does not invent a path through the wall. Change reality and infer again.','syntract');
    metric();
  };

  const basePanel=q75UpdatePanel;
  q75UpdatePanel=function(){basePanel();metric()};
  metric();
})();
</script>
'''


def living_robot_public_visual85_html(*, static_mode: bool = False) -> str:
    html = _base_html(static_mode=static_mode)
    anchor = '<div class="visualLogicRail" id="visualLogicRail"'
    if html.count(anchor) != 1:
        raise RuntimeError("BUILD 84 concept rail changed; BUILD 85 live narration cannot attach")
    html = html.replace(anchor, _LIVE + "\n" + anchor, 1)
    html = html.replace("</style>", _CSS + "\n</style>", 1)
    html = html.replace("</body>", _SCRIPT + "\n</body>", 1)
    return html


__all__ = ["living_robot_public_visual85_html"]
