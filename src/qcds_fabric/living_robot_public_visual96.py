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

/* BUILD 97: QCDS stage details belong beside the selected stage, not at the
   bottom of all six cards. The selected button must remain visually anchored. */
body.publicViewQcds #try-logical-robot .q69Trace>.q69Inspect.q97Inline{
  grid-column:1 / -1!important;
  width:100%!important;
  box-sizing:border-box!important;
  margin:0 0 2px!important;
}
body.publicViewQcds #try-logical-robot .q69Step.active{
  position:relative;
  z-index:1;
}
@media(max-width:680px){
  body.publicViewQcds #try-logical-robot .q69Trace>.q69Inspect.q97Inline{
    grid-column:1!important;
  }
}
'''

_SCRIPT = r'''
<script>
/* BUILD 97: keep QCDS stage inspection local to the clicked stage.
   q69Open still renders the exact same real QCDS inspection data. */
(function(){
  if(typeof window.q69Open!=='function')return;
  const baseOpen=window.q69Open;

  function q97PlaceInspect(step, preserveViewport){
    const trace=document.querySelector('#try-logical-robot .q69Trace');
    const panel=document.getElementById('q69Inspect');
    if(!trace||!panel)return;
    const steps=Array.from(trace.querySelectorAll(':scope > .q69Step'));
    const button=steps[step-1];
    if(!button)return;

    const beforeTop=preserveViewport?button.getBoundingClientRect().top:null;
    const mobile=window.matchMedia('(max-width:680px)').matches;
    const anchorIndex=mobile ? step-1 : Math.min(steps.length-1, Math.ceil(step/2)*2-1);
    const anchor=steps[anchorIndex];
    anchor.insertAdjacentElement('afterend',panel);
    panel.classList.add('q97Inline');

    if(beforeTop!==null){
      requestAnimationFrame(()=>{
        const delta=button.getBoundingClientRect().top-beforeTop;
        if(Math.abs(delta)>.5)window.scrollBy({top:delta,left:0,behavior:'auto'});
      });
    }
  }

  window.q69Open=function(step,result){
    const active=document.activeElement;
    const preserve=!!active?.classList?.contains('q69Step');
    const value=baseOpen(step,result);
    q97PlaceInspect(step,preserve);
    return value;
  };

  window.addEventListener('resize',()=>{
    const active=Array.from(document.querySelectorAll('#try-logical-robot .q69Step')).findIndex(b=>b.classList.contains('active'));
    if(active>=0)q97PlaceInspect(active+1,false);
  });
})();
</script>
'''


def living_robot_public_visual96_html(*, static_mode: bool = False) -> str:
    """Presentation-fit layer only; QCDS/Robotics inference is unchanged."""
    html = _base_html(static_mode=static_mode)
    if "</style>" not in html or "</body>" not in html:
        raise RuntimeError("public shell changed; BUILD 97 cannot attach safely")
    html = html.replace("</style>", _CSS + "\n</style>", 1)
    return html.replace("</body>", _SCRIPT + "\n</body>", 1)


__all__ = ["living_robot_public_visual96_html"]
