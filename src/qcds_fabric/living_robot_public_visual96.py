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

/* BUILD 99: Try QCDS stages are independent local accordions.
   Opening a later stage never collapses content above the clicked control. */
body.publicCompact.publicViewQcds #try-logical-robot .q69Trace{align-items:start!important}
body.publicCompact.publicViewQcds #try-logical-robot .q98Stage{min-width:0;display:flex;flex-direction:column}
body.publicCompact.publicViewQcds #try-logical-robot .q98Stage>button.q69Step,
body.publicCompact.publicViewQcds #try-logical-robot .q98Stage>button.q69Step:focus,
body.publicCompact.publicViewQcds #try-logical-robot .q98Stage>button.q69Step:hover{
  appearance:none!important;
  -webkit-appearance:none!important;
  background:#061923!important;
  color:#d6f6df!important;
  border-color:#294b5e!important;
  box-shadow:none!important;
  transform:none!important;
  -webkit-tap-highlight-color:transparent!important;
}
body.publicCompact.publicViewQcds #try-logical-robot .q98Stage>button.q69Step .q69StepNo,
body.publicCompact.publicViewQcds #try-logical-robot .q98Stage>button.q69Step .q69Open{color:#6fcf98!important}
body.publicCompact.publicViewQcds #try-logical-robot .q98Stage>button.q69Step .q69StepTitle{color:#d6f6df!important}
body.publicCompact.publicViewQcds #try-logical-robot .q98Stage>button.q69Step .q69StepSummary{color:#86a7b7!important}
body.publicCompact.publicViewQcds #try-logical-robot .q98Stage>button.q69Step:focus-visible{
  outline:2px solid #76dba2!important;
  outline-offset:2px!important;
}
body.publicCompact.publicViewQcds #try-logical-robot .q98Stage.open>button.q69Step,
body.publicCompact.publicViewQcds #try-logical-robot .q98Stage.open>button.q69Step:focus,
body.publicCompact.publicViewQcds #try-logical-robot .q98Stage.open>button.q69Step:hover{
  border-color:#69c893!important;
  border-bottom-color:#31584d!important;
  background:#09281f!important;
  color:#d6f6df!important;
  box-shadow:inset 3px 0 0 #82e5ac!important;
  border-radius:14px 14px 0 0!important;
}
body.publicCompact.publicViewQcds #try-logical-robot .q98Detail{
  display:none;
  border:1px solid #31584d;
  border-top:0;
  background:#071914;
  border-radius:0 0 14px 14px;
  padding:14px 15px;
  color:#d8f6df;
  min-width:0;
  overflow:hidden;
}
body.publicCompact.publicViewQcds #try-logical-robot .q98Stage.open>.q98Detail{display:block}
body.publicCompact.publicViewQcds #try-logical-robot .q98Detail .q69InspectHead{margin:0;padding-bottom:10px}
body.publicCompact.publicViewQcds #try-logical-robot .q98Detail .q69InspectBody{margin-top:11px}
body.publicCompact.publicViewQcds #try-logical-robot .q98SourcePanel{display:none!important}

/* Immediate local feedback while the real browser QCDS/Pyodide run is working. */
body.publicCompact.publicViewQcds #try-logical-robot .seed.q99BusyCard{
  border-color:#67cf92!important;
  box-shadow:0 0 0 1px #77dfa322,0 12px 30px #0003!important;
}
body.publicCompact.publicViewQcds #try-logical-robot .q99Busy{
  display:flex;
  align-items:center;
  gap:9px;
  width:100%;
  box-sizing:border-box;
  margin-top:9px;
  border:1px solid #3f745b;
  background:linear-gradient(135deg,#082019,#07171b);
  border-radius:10px;
  padding:9px 10px;
  color:#c9f3d6;
}
body.publicCompact.publicViewQcds #try-logical-robot .q99BusyDot{
  flex:0 0 auto;
  width:11px;
  height:11px;
  border:2px solid #315c49;
  border-top-color:#8ce3b2;
  border-radius:50%;
  animation:q99Spin .72s linear infinite;
}
body.publicCompact.publicViewQcds #try-logical-robot .q99BusyText{min-width:0}
body.publicCompact.publicViewQcds #try-logical-robot .q99BusyText b{
  display:block;
  font-size:7px;
  letter-spacing:.12em;
  color:#9aefb7;
}
body.publicCompact.publicViewQcds #try-logical-robot .q99BusyText span{
  display:block;
  margin-top:3px;
  font-size:7px;
  line-height:1.4;
  color:#86a99a;
}
body.publicCompact.publicViewQcds #try-logical-robot .q99Busy.q99Error{
  border-color:#7a5a37;
  background:#21180d;
}
body.publicCompact.publicViewQcds #try-logical-robot .q99Busy.q99Error .q99BusyDot{display:none}
body.publicCompact.publicViewQcds #try-logical-robot .q99Busy.q99Error .q99BusyText b{color:#efc98d}
@keyframes q99Spin{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){body.publicCompact.publicViewQcds #try-logical-robot .q99BusyDot{animation:none;border-color:#8ce3b2}}
@media(max-width:680px){
  body.publicCompact.publicViewQcds #try-logical-robot .q98Detail{padding:11px 10px}
  body.publicCompact.publicViewQcds #try-logical-robot .q98Stage>button.q69Step,
  body.publicCompact.publicViewQcds #try-logical-robot .q98Stage.open>button.q69Step{min-height:0!important}
  body.publicCompact.publicViewQcds #try-logical-robot .q99Busy{padding:8px 9px}
}
'''

_SCRIPT = r'''
<script>
/* BUILD 99: stable Try QCDS UX.
   - stages do not auto-open
   - stages expand independently, so content above never collapses unexpectedly
   - legacy quick-result auto-scroll is disabled
   - a local busy indicator appears immediately while the existing QCDS run executes */
(function(){
  if(typeof window.q69Open!=='function')return;
  const baseOpen=window.q69Open;
  let clickedButton=null;
  let busyCard=null;
  let busyBox=null;

  document.addEventListener('click',event=>{
    const step=event.target?.closest?.('#try-logical-robot .q69Step');
    if(step)clickedButton=step;
    const run=event.target?.closest?.('#try-logical-robot .seed button');
    const onclick=run?.getAttribute?.('onclick')||'';
    if(run && onclick.includes('trySeed('))q99StartBusy(run);
  },true);
  document.addEventListener('click',()=>{setTimeout(()=>{clickedButton=null},0)},false);

  function q98EnsureStages(){
    const trace=document.querySelector('#try-logical-robot .q69Trace');
    const source=document.getElementById('q69Inspect');
    if(!trace||!source)return null;

    const directButtons=Array.from(trace.children).filter(node=>node.classList?.contains('q69Step'));
    directButtons.forEach((button,index)=>{
      const stage=document.createElement('div');
      stage.className='q98Stage';
      stage.dataset.step=String(index+1);
      button.insertAdjacentElement('beforebegin',stage);
      stage.appendChild(button);
      const detail=document.createElement('div');
      detail.className='q98Detail';
      detail.setAttribute('role','region');
      detail.setAttribute('aria-label','QCDS step '+String(index+1)+' details');
      stage.appendChild(detail);
    });
    source.classList.add('q98SourcePanel');
    return {trace,source,stages:Array.from(trace.querySelectorAll(':scope > .q98Stage'))};
  }

  function q99SyncLabels(stages){
    stages.forEach(stage=>{
      const label=stage.querySelector('.q69Open');
      if(label)label.textContent=stage.classList.contains('open')?'CLOSE ↑':'OPEN ↓';
      const button=stage.querySelector('.q69Step');
      if(button)button.classList.toggle('active',stage.classList.contains('open'));
    });
  }

  window.q69Open=function(step,result){
    const state=q98EnsureStages();
    if(!state)return baseOpen(step,result);
    const index=Number(step)-1;
    const target=state.stages[index];
    const button=target?.querySelector('.q69Step');
    if(!target||!button)return baseOpen(step,result);

    /* q67Render historically auto-opened STEP 1. Do not do that anymore. */
    if(!clickedButton){
      state.stages.forEach(stage=>stage.querySelector('.q69Step')?.classList.remove('active'));
      state.source.replaceChildren();
      q99SyncLabels(state.stages);
      return;
    }

    if(target.classList.contains('open')){
      target.classList.remove('open');
      target.querySelector('.q98Detail')?.replaceChildren();
      q99SyncLabels(state.stages);
      return;
    }

    /* Render through the existing inspector, then move only this step's rendered
       nodes into its own detail area. Other open stages remain untouched. */
    const value=baseOpen(step,result);
    const detail=target.querySelector('.q98Detail');
    detail.replaceChildren();
    while(state.source.firstChild)detail.appendChild(state.source.firstChild);
    target.classList.add('open');
    q99SyncLabels(state.stages);
    return value;
  };

  function q99NoResultScroll(){
    const box=document.getElementById('quickResult');
    if(!box||box.dataset.q99NoScroll==='1')return;
    box.dataset.q99NoScroll='1';
    box.scrollIntoView=()=>{};
  }

  function q99StartBusy(button){
    q99StopBusy();
    const card=button.closest('.seed');
    if(!card)return;
    busyCard=card;
    card.classList.add('q99BusyCard');
    card.setAttribute('aria-busy','true');
    const box=document.createElement('div');
    box.className='q99Busy';
    box.setAttribute('role','status');
    box.setAttribute('aria-live','polite');
    const dot=document.createElement('span');dot.className='q99BusyDot';
    const text=document.createElement('span');text.className='q99BusyText';
    const title=document.createElement('b');title.textContent='QCDS EMULATING…';
    const detail=document.createElement('span');detail.textContent='Forming the Logical Space and oracle constraints…';
    text.append(title,detail);box.append(dot,text);
    button.insertAdjacentElement('afterend',box);
    busyBox=box;
  }

  function q99UpdateBusy(message,kind=''){
    if(!busyBox)return;
    const title=busyBox.querySelector('.q99BusyText b');
    const detail=busyBox.querySelector('.q99BusyText span');
    if(kind==='warn'){
      busyBox.classList.add('q99Error');
      if(title)title.textContent='QCDS STOPPED';
      if(detail)detail.textContent=String(message||'The run could not complete.');
      if(busyCard)busyCard.setAttribute('aria-busy','false');
      return;
    }
    if(title)title.textContent='QCDS EMULATING…';
    if(detail)detail.textContent=String(message||'Working through the represented Logical Space…');
  }

  function q99StopBusy(){
    if(busyCard){busyCard.classList.remove('q99BusyCard');busyCard.removeAttribute('aria-busy')}
    if(busyBox)busyBox.remove();
    busyCard=null;busyBox=null;
  }

  window.addEventListener('DOMContentLoaded',()=>{
    q99NoResultScroll();

    /* BUILD 95 installs its status/render wrappers earlier in DOMContentLoaded.
       Wrap those final functions so all status remains local and no legacy
       scrollIntoView can move the visitor away from the clicked example. */
    if(typeof window.q48QuickStatus==='function'){
      const baseStatus=window.q48QuickStatus;
      window.q48QuickStatus=function(message,kind=''){
        q99NoResultScroll();
        if(busyBox){
          q99UpdateBusy(message,kind);
          if(kind!=='warn')return;
        }
        return baseStatus(message,kind);
      };
    }
    if(typeof window.q67Render==='function'){
      const baseRender=window.q67Render;
      window.q67Render=function(result){
        q99NoResultScroll();
        const value=baseRender(result);
        q99StopBusy();
        return value;
      };
    }
  });

  const buildMark=document.querySelector('.publicBuildMark');
  if(buildMark)buildMark.textContent='BUILD 99';
})();
</script>
'''


def living_robot_public_visual96_html(*, static_mode: bool = False) -> str:
    """Presentation-fit layer only; QCDS/Robotics inference is unchanged."""
    html = _base_html(static_mode=static_mode)
    if "</style>" not in html or "</body>" not in html:
        raise RuntimeError("public shell changed; BUILD 99 cannot attach safely")
    html = html.replace("</style>", _CSS + "\n</style>", 1)
    return html.replace("</body>", _SCRIPT + "\n</body>", 1)


__all__ = ["living_robot_public_visual96_html"]
