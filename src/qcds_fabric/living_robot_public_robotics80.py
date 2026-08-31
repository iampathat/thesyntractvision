from __future__ import annotations

from .living_robot_public_robotics79 import living_robot_public_robotics79_html as _base_html


_CSS = r'''
/* BUILD 80: let the human finish a gesture before showing the emulation overlay. */
.publicRobotCanvasWrap.qcdsEditing canvas{opacity:1}.publicRobotCanvasWrap.qcdsEditing .publicRobotHint{opacity:1}.publicRobotCanvasWrap.qcdsPlanning .publicRobotEmulating{pointer-events:auto}
'''

_SCRIPT = r'''
<script>
/* BUILD 80: one drawing gesture = one world edit = one QCDS re-inference. */
Q75.editing=false;
Q75.editDirty=false;

function q80SetEditing(active){
  Q75.editing=!!active;
  document.querySelector('.publicRobotCanvasWrap')?.classList.toggle('qcdsEditing',Q75.editing);
}
function q80BeginEdit(){
  if(Q75.planning)return false;
  Q75.editDirty=false;
  q80SetEditing(true);
  return true;
}
function q80MarkWorldDirty(){
  if(!Q75.editDirty){
    Q75.editDirty=true;
    /* Any older in-flight route is no longer allowed to bind after the world changed. */
    ++Q75.planSeq;
    clearTimeout(Q75.planTimer);
    q79InvalidateRoute();
  }
  q75Status('EDITING WORLD · release to run QCDS on the new oracle space…');
  q75DrawWorld();
}
function q80EndEdit(){
  const changed=Q75.editDirty;
  q80SetEditing(false);
  Q75.editDirty=false;
  if(changed)q75SchedulePlan();
}

q75ApplyCell=function(x,y){
  if(Q75.planning)return;
  const key=q75Key(x,y);
  if(key===q75Key(...Q75.start)||key===q75Key(...Q75.goal)||key===q75Key(...Q75.robot))return;
  const before=Q75.blocked.has(key);
  if(Q75.tool==='draw')Q75.blocked.add(key);else Q75.blocked.delete(key);
  if(before!==Q75.blocked.has(key))q80MarkWorldDirty();
};

q75BindCanvas=function(){
  const c=document.getElementById('q75Canvas');
  if(!c||c.dataset.bound)return;
  c.dataset.bound='1';
  let down=false;
  c.addEventListener('pointerdown',e=>{
    if(!q80BeginEdit())return;
    down=true;
    c.setPointerCapture?.(e.pointerId);
    const [x,y]=q75CellFromEvent(e);
    q75ApplyCell(x,y);
  });
  c.addEventListener('pointermove',e=>{
    if(!down||Q75.planning)return;
    const [x,y]=q75CellFromEvent(e);
    q75ApplyCell(x,y);
  });
  const finish=e=>{
    if(!down)return;
    down=false;
    try{c.releasePointerCapture?.(e?.pointerId)}catch(_err){}
    q80EndEdit();
  };
  c.addEventListener('pointerup',finish);
  c.addEventListener('pointercancel',finish);
  c.addEventListener('lostpointercapture',()=>{if(down){down=false;q80EndEdit()}});
};

q75Tick=function(){
  if(Q75.editing||Q75.planning||!Q75.running||!Q75.result?.reachable||Q75.path.length<2)return;
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


def living_robot_public_robotics80_html(*, static_mode: bool = False) -> str:
    html = _base_html(static_mode=static_mode)
    if "</style>" not in html or "</body>" not in html:
        raise RuntimeError("Robotics public surface changed; BUILD 80 gesture batching cannot attach")
    html = html.replace("</style>", _CSS + "\n</style>", 1)
    html = html.replace("</body>", _SCRIPT + "\n</body>", 1)
    return html


__all__ = ["living_robot_public_robotics80_html"]
