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

/* BUILD 98: Try QCDS stages are true local accordions.
   No shared detail panel is moved around the DOM and no scroll correction runs. */
body.publicViewQcds #try-logical-robot .q69Trace{align-items:start!important}
body.publicViewQcds #try-logical-robot .q98Stage{min-width:0;display:flex;flex-direction:column}
body.publicViewQcds #try-logical-robot .q98Stage>.q69Step,
body.publicViewQcds #try-logical-robot .q98Stage>.q69Step:focus,
body.publicViewQcds #try-logical-robot .q98Stage>.q69Step:hover{
  background:#061923!important;
  color:inherit!important;
  border-color:#294b5e!important;
  box-shadow:none!important;
  transform:none!important;
}
body.publicViewQcds #try-logical-robot .q98Stage>.q69Step:focus-visible{
  outline:2px solid #76dba2!important;
  outline-offset:2px!important;
}
body.publicViewQcds #try-logical-robot .q98Stage.open>.q69Step,
body.publicViewQcds #try-logical-robot .q98Stage.open>.q69Step:focus,
body.publicViewQcds #try-logical-robot .q98Stage.open>.q69Step:hover{
  border-color:#69c893!important;
  border-bottom-color:#31584d!important;
  background:#09281f!important;
  color:#d6f6df!important;
  box-shadow:inset 3px 0 0 #82e5ac!important;
  border-radius:14px 14px 0 0!important;
}
body.publicViewQcds #try-logical-robot .q98Detail{
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
body.publicViewQcds #try-logical-robot .q98Stage.open>.q98Detail{display:block}
body.publicViewQcds #try-logical-robot .q98Detail .q69InspectHead{margin:0;padding-bottom:10px}
body.publicViewQcds #try-logical-robot .q98Detail .q69InspectBody{margin-top:11px}
body.publicViewQcds #try-logical-robot .q98SourcePanel{display:none!important}
@media(max-width:680px){
  body.publicViewQcds #try-logical-robot .q98Detail{padding:11px 10px}
  body.publicViewQcds #try-logical-robot .q98Stage>.q69Step,
  body.publicViewQcds #try-logical-robot .q98Stage.open>.q69Step{min-height:0!important}
}
'''

_SCRIPT = r'''
<script>
/* BUILD 98: each QCDS stage owns its own detail area.
   The existing q69Open still renders the exact inspection data from the real run;
   this layer only moves the rendered child nodes into the selected accordion. */
(function(){
  if(typeof window.q69Open!=='function')return;
  const baseOpen=window.q69Open;
  let clickedButton=null;

  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('#try-logical-robot .q69Step');
    if(button)clickedButton=button;
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

  function q98SetLabels(stages,openIndex){
    stages.forEach((stage,index)=>{
      const label=stage.querySelector('.q69Open');
      if(label)label.textContent=index===openIndex?'CLOSE ↑':'OPEN ↓';
    });
  }

  window.q69Open=function(step,result){
    const state=q98EnsureStages();
    if(!state)return baseOpen(step,result);
    const index=Number(step)-1;
    const target=state.stages[index];
    const button=target?.querySelector('.q69Step');
    if(!target||!button)return baseOpen(step,result);

    /* A second click on the already-open stage simply closes it. */
    if(clickedButton===button && target.classList.contains('open')){
      target.classList.remove('open');
      button.classList.remove('active');
      target.querySelector('.q98Detail')?.replaceChildren();
      q98SetLabels(state.stages,-1);
      return;
    }

    const value=baseOpen(step,result);
    const detail=target.querySelector('.q98Detail');
    state.stages.forEach(stage=>{
      stage.classList.remove('open');
      stage.querySelector('.q98Detail')?.replaceChildren();
    });
    while(state.source.firstChild)detail.appendChild(state.source.firstChild);
    target.classList.add('open');
    q98SetLabels(state.stages,index);
    return value;
  };

  const buildMark=document.querySelector('.publicBuildMark');
  if(buildMark)buildMark.textContent='BUILD 98';
})();
</script>
'''


def living_robot_public_visual96_html(*, static_mode: bool = False) -> str:
    """Presentation-fit layer only; QCDS/Robotics inference is unchanged."""
    html = _base_html(static_mode=static_mode)
    if "</style>" not in html or "</body>" not in html:
        raise RuntimeError("public shell changed; BUILD 98 cannot attach safely")
    html = html.replace("</style>", _CSS + "\n</style>", 1)
    return html.replace("</body>", _SCRIPT + "\n</body>", 1)


__all__ = ["living_robot_public_visual96_html"]
