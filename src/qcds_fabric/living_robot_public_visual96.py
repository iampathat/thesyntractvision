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

/* BUILD 100: Try QCDS is a stable sales/demo surface.
   Equal actions, immediate run feedback, and six independent native accordions. */
body.publicCompact.publicViewQcds #try-logical-robot .seedGrid .seed>button{
  inline-size:190px!important;
  min-inline-size:190px!important;
  max-inline-size:190px!important;
  box-sizing:border-box!important;
  text-align:center!important;
  justify-self:end!important;
  white-space:nowrap!important;
}
body.publicCompact.publicViewQcds #try-logical-robot .seedGrid .seed>button.q100Running{
  border-color:#7ce1a5!important;
  background:#103528!important;
  color:#edfff3!important;
  cursor:wait!important;
  box-shadow:0 0 0 1px #7ce1a522,0 0 18px #7ce1a51c!important;
}
body.publicCompact.publicViewQcds #try-logical-robot .seedGrid .seed>button.q100Running::before{
  content:"";
  display:inline-block;
  width:9px;
  height:9px;
  margin-right:7px;
  vertical-align:-1px;
  border:2px solid #4f7e66;
  border-top-color:#a4f0bf;
  border-radius:50%;
  animation:q100Spin .7s linear infinite;
}
@keyframes q100Spin{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){
  body.publicCompact.publicViewQcds #try-logical-robot .seedGrid .seed>button.q100Running::before{animation:none;border-color:#a4f0bf}
}

/* Native details: every QCDS stage owns its detail tree. Nothing is moved later. */
body.publicCompact.publicViewQcds #try-logical-robot .q100Trace{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:10px;
  margin-top:12px;
  align-items:start;
}
body.publicCompact.publicViewQcds #try-logical-robot details.q100Stage{
  min-width:0;
  border:1px solid #294b5e;
  background:#061923;
  border-radius:14px;
  overflow:hidden;
}
body.publicCompact.publicViewQcds #try-logical-robot details.q100Stage[open]{
  border-color:#5fab83;
  background:#071b18;
  box-shadow:inset 3px 0 0 #82e5ac;
}
body.publicCompact.publicViewQcds #try-logical-robot .q100Stage>summary{
  list-style:none;
  cursor:pointer;
  padding:14px 16px;
  color:#d6f6df;
  -webkit-tap-highlight-color:transparent;
  user-select:none;
}
body.publicCompact.publicViewQcds #try-logical-robot .q100Stage>summary::-webkit-details-marker{display:none}
body.publicCompact.publicViewQcds #try-logical-robot .q100Stage>summary::marker{content:""}
body.publicCompact.publicViewQcds #try-logical-robot .q100Stage>summary:focus{outline:none}
body.publicCompact.publicViewQcds #try-logical-robot .q100Stage>summary:focus-visible{
  outline:2px solid #76dba2;
  outline-offset:-3px;
  border-radius:12px;
}
body.publicCompact.publicViewQcds #try-logical-robot .q100Stage[open]>summary{
  background:#09281f;
  border-bottom:1px solid #31584d;
}
body.publicCompact.publicViewQcds #try-logical-robot .q100StageNo{
  display:block;
  font-size:7px;
  letter-spacing:.13em;
  color:#76dba2;
  text-transform:uppercase;
}
body.publicCompact.publicViewQcds #try-logical-robot .q100StageTitle{
  display:block;
  margin-top:4px;
  font-size:12px;
  line-height:1.2;
  color:#d6f6df;
  font-weight:800;
}
body.publicCompact.publicViewQcds #try-logical-robot .q100StageSummary{
  display:block;
  margin-top:6px;
  font-size:8px;
  line-height:1.45;
  color:#86a7b7;
}
body.publicCompact.publicViewQcds #try-logical-robot .q100StageToggle{
  display:block;
  margin-top:9px;
  font-size:6.5px;
  letter-spacing:.12em;
  color:#6fcf98;
  text-transform:uppercase;
}
body.publicCompact.publicViewQcds #try-logical-robot .q100StageToggle::after{content:"OPEN ↓"}
body.publicCompact.publicViewQcds #try-logical-robot .q100Stage[open] .q100StageToggle::after{content:"CLOSE ↑"}
body.publicCompact.publicViewQcds #try-logical-robot .q100StageBody{
  padding:14px 15px 15px;
  color:#d8f6df;
  min-width:0;
  overflow:hidden;
}
body.publicCompact.publicViewQcds #try-logical-robot .q100StageBody .q69InspectHead{margin:0;padding-bottom:10px}
body.publicCompact.publicViewQcds #try-logical-robot .q100StageBody .q69InspectBody{margin-top:11px}

@media(max-width:700px){
  body.publicCompact.publicViewQcds #try-logical-robot .seedGrid .seed>button{
    inline-size:146px!important;
    min-inline-size:146px!important;
    max-inline-size:146px!important;
  }
  body.publicCompact.publicViewQcds #try-logical-robot .seed.q95Active>button{align-self:flex-start!important}
  body.publicCompact.publicViewQcds #try-logical-robot .q100Trace{grid-template-columns:1fr;gap:7px;margin-top:9px}
  body.publicCompact.publicViewQcds #try-logical-robot .q100Stage>summary{padding:11px 12px}
  body.publicCompact.publicViewQcds #try-logical-robot .q100StageBody{padding:11px 10px 12px}
}
'''

_SCRIPT = r'''
<script>
/* BUILD 100: clean Try QCDS presentation.
   q67Render is presentation only and consumes the exact result returned by the
   existing QCDS run. It does not score, infer, vote, collapse, or re-run data. */
(function(){
  let runningButton=null;
  let runningLabel='';

  function q100Text(tag,text,cls){
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    node.textContent=text;
    return node;
  }

  function q100StopRunning(){
    if(!runningButton)return;
    runningButton.classList.remove('q100Running');
    runningButton.textContent=runningLabel||runningButton.dataset.q100Label||'TRY →';
    runningButton=null;
    runningLabel='';
  }

  function q100StartRunning(button){
    q100StopRunning();
    runningButton=button;
    runningLabel=button.textContent;
    button.dataset.q100Label=runningLabel;
    button.classList.add('q100Running');
    button.textContent='QCDS EMULATING…';
  }

  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('#try-logical-robot .seed button');
    const onclick=button?.getAttribute?.('onclick')||'';
    if(button && onclick.includes('trySeed('))q100StartRunning(button);
  },true);

  function q100StageMeta(result){
    const sum=result.oracle_summary||{};
    return [
      ['WORLD CONDITIONS',(result.represented_worlds||[]).length+' complete worlds','The complete candidate worlds represented in this run.'],
      ['PROPERTY SPACE',(result.property_dimensions||[]).length+' named properties · '+((result.logical_dimensions||[]).length-(result.represented_worlds||[]).length)+' property bits','How named properties expand into binary Conditions.'],
      ['LOGICAL SPACE',result.logical_width+' bits · '+result.candidate_binary_space+' = '+result.raw_state_count+' raw states','The actual joint possibility space before oracle constraints.'],
      ['ORACLE SPACE',(sum.total||0)+' active · '+(sum.structural||0)+' structural · '+(sum.evidence||0)+' evidence · '+(sum.logical||0)+' logical','The active structural, evidence and implication logic shaping this run.'],
      ['QCDS','Four canonical phases · this exact run','What the canonical four QCDS phases did to this exact Logical Space.'],
      ['SYNTRACT',result.binding_status==='unresolved_tie'?'TruthDistribution bound · single world unbound':'TruthDistribution bound · '+result.world_binding+' leads','What survived inference and what was, or was not, bound.']
    ];
  }

  function q100PopulateStage(index,result,body,plain){
    const content=q100Text('div','','q69InspectBody');
    body.appendChild(content);
    if(index===0)q69Worlds(result,content);
    else if(index===1)q69Properties(result,content);
    else if(index===2)q69Space(result,content);
    else if(index===3)q69Oracles(result,content);
    else if(index===4)q69Phases(result,content);
    else q69Syntract(result,content);
  }

  function q100BuildStage(index,item,result){
    const details=document.createElement('details');
    details.className='q100Stage';
    details.dataset.step=String(index+1);

    const summary=document.createElement('summary');
    summary.appendChild(q100Text('span','STEP '+String(index+1),'q100StageNo'));
    summary.appendChild(q100Text('span',item[0],'q100StageTitle'));
    summary.appendChild(q100Text('span',item[1],'q100StageSummary'));
    summary.appendChild(q100Text('span','', 'q100StageToggle'));
    details.appendChild(summary);

    const body=q100Text('div','','q100StageBody');
    body.hidden=true;
    details.appendChild(body);

    let populated=false;
    details.addEventListener('toggle',()=>{
      body.hidden=!details.open;
      if(!details.open || populated)return;
      const head=q100Text('div','','q69InspectHead');
      const left=q100Text('div','');
      left.appendChild(q100Text('div','INSIDE STEP '+String(index+1),'q69InspectKicker'));
      left.appendChild(q100Text('div',item[0],'q69InspectTitle'));
      head.append(left,q100Text('div',item[2],'q69InspectPlain'));
      body.appendChild(head);
      q100PopulateStage(index,result,body,item[2]);
      populated=true;
    });
    return details;
  }

  window.q67Render=function(result){
    const box=document.getElementById('quickResult');
    if(!box)return;
    q69Clear(box);
    box.appendChild(q100Text('div','QCDS CORE · OPEN THE LOGICAL SPACE','quickResultTitle'));
    box.appendChild(q100Text('div','This is the machine that just ran. Open any stage below. Each stage expands here and stays open until you close it.','q38Summary'));

    const trace=q100Text('div','','q100Trace');
    q100StageMeta(result).forEach((item,index)=>trace.appendChild(q100BuildStage(index,item,result)));
    box.appendChild(trace);

    const leaders=result.leading_candidates||[];
    const resultSummary=result.binding_status==='unresolved_tie'
      ? 'Result: '+leaders.join(' + ')+' remain tied. That uncertainty is preserved, not hidden.'
      : 'Result: '+String(result.world_binding||'unresolved')+' is the single leading represented world. The complete distribution is still retained.';
    box.appendChild(q100Text('div',resultSummary,'q38Summary'));

    const obs=q100Text('div','','q67Obs');
    (result.observations||[]).forEach(item=>obs.appendChild(q100Text('span',item.predicate+'='+item.value+' · '+Math.round(100*Number(item.confidence))+'% evidence')));
    box.appendChild(obs);
    box.classList.add('visible');
    q100StopRunning();
  };

  /* Keep error/status feedback immediate and local, but never scroll the page. */
  window.addEventListener('DOMContentLoaded',()=>{
    const box=document.getElementById('quickResult');
    if(box)box.scrollIntoView=()=>{};

    if(typeof window.q48QuickStatus==='function'){
      const status=window.q48QuickStatus;
      window.q48QuickStatus=function(message,kind=''){
        if(kind==='warn')q100StopRunning();
        if(box)box.scrollIntoView=()=>{};
        return status(message,kind);
      };
    }
  });

  const buildMark=document.querySelector('.publicBuildMark');
  if(buildMark)buildMark.textContent='BUILD 100';
})();
</script>
'''


def living_robot_public_visual96_html(*, static_mode: bool = False) -> str:
    """Presentation-fit layer only; QCDS/Robotics inference is unchanged."""
    html = _base_html(static_mode=static_mode)
    if "</style>" not in html or "</body>" not in html:
        raise RuntimeError("public shell changed; BUILD 100 cannot attach safely")
    html = html.replace("</style>", _CSS + "\n</style>", 1)
    return html.replace("</body>", _SCRIPT + "\n</body>", 1)


__all__ = ["living_robot_public_visual96_html"]
