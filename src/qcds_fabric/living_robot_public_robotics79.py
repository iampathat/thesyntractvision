from __future__ import annotations

from .living_robot_public_robotics77 import living_robot_public_robotics77_html as _base_html


_CSS = r'''
/* BUILD 79: world edits invalidate the current route binding until QCDS finishes. */
.publicRobotEmulating{position:absolute;inset:8px;z-index:8;display:none;align-items:center;justify-content:center;flex-direction:column;gap:7px;border-radius:8px;background:#04131bd9;backdrop-filter:blur(2px);pointer-events:none;text-align:center}.publicRobotEmulating.visible{display:flex}.publicRobotEmulating .pulse{width:9px;height:9px;border-radius:50%;background:#8ce3b2;box-shadow:0 0 0 0 #8ce3b277;animation:q79Pulse 1s ease-out infinite}.publicRobotEmulating strong{font-size:9px;letter-spacing:.14em;color:#d9f8e4}.publicRobotEmulating span{max-width:360px;font-size:6.8px;line-height:1.5;color:#8eb5a0}.publicRobotCanvasWrap.qcdsPlanning canvas{opacity:.72}.publicRobotCanvasWrap.qcdsPlanning .publicRobotHint{opacity:.35}@keyframes q79Pulse{0%{box-shadow:0 0 0 0 #8ce3b277}70%{box-shadow:0 0 0 11px #8ce3b200}100%{box-shadow:0 0 0 0 #8ce3b200}}
'''

_OVERLAY = r'''
<div class="publicRobotEmulating" id="q79Emulating" role="status" aria-live="polite">
  <span class="pulse"></span>
  <strong>QCDS EMULATING…</strong>
  <span>Oracle space changed. The previous route binding is invalid while the Logical Space is re-inferred.</span>
</div>
'''

_SCRIPT = r'''
<script>
/* BUILD 79: never let the robot body move on a stale route binding. */
Q75.planning=false;
function q79SetEmulating(active){
  Q75.planning=!!active;
  const wrap=document.querySelector('.publicRobotCanvasWrap');
  const overlay=document.getElementById('q79Emulating');
  const toggle=document.getElementById('q75RunToggle');
  wrap?.classList.toggle('qcdsPlanning',Q75.planning);
  overlay?.classList.toggle('visible',Q75.planning);
  if(toggle){
    toggle.disabled=Q75.planning;
    if(Q75.planning)toggle.textContent='QCDS EMULATING…';
    else if(q75Key(...Q75.robot)===q75Key(...Q75.goal))toggle.textContent='RUN AGAIN';
    else toggle.textContent=Q75.running?'PAUSE ROBOT':'RUN ROBOT';
  }
}
function q79InvalidateRoute(){
  Q75.result=null;
  Q75.path=[];
  Q75.pathIndex=0;
}
q75SchedulePlan=function(){
  clearTimeout(Q75.planTimer);
  const seq=++Q75.planSeq;
  q79InvalidateRoute();
  q79SetEmulating(true);
  q75Status('QCDS EMULATING · oracle space changed · re-inferring route space…');
  q75DrawWorld();
  Q75.planTimer=setTimeout(()=>q75Plan(seq),45);
};
q75Plan=async function(requestedSeq){
  const scheduled=Number.isInteger(requestedSeq);
  const seq=scheduled?requestedSeq:++Q75.planSeq;
  if(!scheduled){q79InvalidateRoute();q79SetEmulating(true);q75DrawWorld()}
  q75Status('QCDS EMULATING · representing the changed Logical Space and applying active oracles…');
  const payload=q75Payload();
  try{
    const result=await q75WorkerRun(payload);
    if(seq!==Q75.planSeq)return;
    Q75.result=result;
    Q75.path=result.representative_shortest_path||[];
    Q75.pathIndex=0;
    q75UpdatePanel();
    q79SetEmulating(false);
    q75DrawWorld();
    if(result.reachable)q75Status('QCDS aligned · new route binding ready · '+result.shortest_path_count+' shortest route'+(result.shortest_path_count===1?'':'s')+' survive at depth '+result.shortest_steps+'.','good');
    else q75Status('QCDS aligned · no coherent route reaches B. Erase an obstacle oracle to reopen the space.','warn');
  }catch(e){
    if(seq!==Q75.planSeq)return;
    q79SetEmulating(false);
    q79InvalidateRoute();
    q75DrawWorld();
    q75Status('QCDS emulation failed: '+(e.message||String(e)),'warn');
  }
};
q75ApplyCell=function(x,y){
  const key=q75Key(x,y);
  if(key===q75Key(...Q75.start)||key===q75Key(...Q75.goal)||key===q75Key(...Q75.robot))return;
  const before=Q75.blocked.has(key);
  if(Q75.tool==='draw')Q75.blocked.add(key);else Q75.blocked.delete(key);
  if(before!==Q75.blocked.has(key))q75SchedulePlan();
};
q75Tick=function(){
  if(Q75.planning||!Q75.running||!Q75.result?.reachable||Q75.path.length<2)return;
  const currentKey=q75Key(...Q75.robot);
  let idx=Q75.path.findIndex(c=>q75Key(...c)===currentKey);
  if(idx<0){q75SchedulePlan();return}
  if(idx+1<Q75.path.length){
    const next=Q75.path[idx+1];
    const nextKey=q75Key(...next);
    const manhattan=Math.abs(next[0]-Q75.robot[0])+Math.abs(next[1]-Q75.robot[1]);
    if(Q75.blocked.has(nextKey)||manhattan!==1){q75SchedulePlan();return}
    Q75.robot=[...next];
    q75DrawWorld();
  }else{
    Q75.running=false;
    document.getElementById('q75RunToggle').textContent='RUN AGAIN';
    q75Status('Robot reached B. The body followed one representative member of the bound shortest-route family.','good');
  }
};
</script>
'''


def living_robot_public_robotics79_html(*, static_mode: bool = False) -> str:
    html = _base_html(static_mode=static_mode)
    canvas = '<canvas id="q75Canvas" width="1000" height="600" aria-label="Interactive Robotics Playground"></canvas>'
    if "</style>" not in html or "</body>" not in html or canvas not in html:
        raise RuntimeError("Robotics public surface changed; BUILD 79 safety lock cannot attach")
    html = html.replace("</style>", _CSS + "\n</style>", 1)
    html = html.replace(canvas, canvas + "\n" + _OVERLAY, 1)
    html = html.replace("</body>", _SCRIPT + "\n</body>", 1)
    return html


__all__ = ["living_robot_public_robotics79_html"]
