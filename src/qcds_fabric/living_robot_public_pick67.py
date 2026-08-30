from __future__ import annotations

from .living_robot_public_casefix66 import living_robot_public_casefix66_html as _base_html


_CSS = r'''
/* BUILD 67: Pick a World is a real joint Logical Space executed in Python/QCDS. */
.q67TruthNote{margin-top:10px;border:1px solid #31584d;background:#071b16;border-radius:9px;padding:9px;font-size:7.5px;line-height:1.5;color:#91b9a1}.q67TruthNote strong{color:#c9f5d8}
.q67Obs{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}.q67Obs span{border:1px solid #294657;background:#06141d;border-radius:999px;padding:5px 7px;font-size:6.5px;color:#89a8b7}
'''

_SCRIPT = r'''
<script>
/* BUILD 67: browser selects/render only. Logical Space construction happens in qcds_fabric.pick_a_world_core. */
function q67RunCore(caseId){
  return new Promise((resolve,reject)=>{
    const worker=build35Worker(),id=++BUILD35_REQUEST;
    BUILD35_PENDING.set(id,{resolve:resolve,reject:reject});
    worker.postMessage({type:'pick_world_run',id:id,payload:{case_id:caseId}});
  });
}

function q67Render(result){
  const box=document.getElementById('quickResult');
  if(!box)return;
  box.textContent='';

  const title=document.createElement('div');title.className='quickResultTitle';title.textContent='QCDS CORE · REAL LOGICAL SPACE';
  const trace=document.createElement('div');trace.className='q38Trace';
  [
    ['1 · WORLD CONDITIONS',result.represented_worlds.length+' explicit worlds'],
    ['2 · PROPERTY SPACE',result.property_dimensions.length+' property dimensions'],
    ['3 · LOGICAL SPACE',result.logical_width+' bits · '+result.candidate_binary_space+' states'],
    ['4 · ORACLE LOGIC',result.rule_count+' world→property rules'],
    ['5 · QCDS','Canonical four phases'],
    ['6 · SYNTRACT','Full TruthDistribution bound']
  ].forEach(item=>{const d=document.createElement('div'),b=document.createElement('b'),s=document.createElement('span');b.textContent=item[0];s.textContent=item[1];d.append(b,s);trace.appendChild(d)});

  const leaders=result.leading_candidates||[];
  const summary=document.createElement('div');summary.className='q38Summary';
  if(result.binding_status==='unresolved_tie'){
    summary.textContent='QCDS leaves '+leaders.join(' + ')+' tied. No single world is selected. The Syntract binds the unresolved TruthDistribution itself.';
  }else if(result.world_binding){
    summary.textContent='QCDS currently binds '+result.world_binding+' as the single leading represented world. This is coherence inside this Logical Space, not an external-world probability.';
  }else{
    summary.textContent='No single represented world is bound.';
  }

  const core=document.createElement('div');core.className='q38Core';
  core.innerHTML='<strong>No browser pre-scoring:</strong> the browser sends only the case id. Python constructs world Conditions, property dimensions, one-hot groups, world→property rule oracles and observation evidence, then runs <strong>problem_to_syntract</strong> through the canonical QCDS phases.';

  const metrics=document.createElement('div');metrics.className='q38Metrics';
  [['worlds',result.represented_worlds.length],['properties',result.property_dimensions.length],['logical width',result.logical_width],['candidate space',result.candidate_binary_space],['rules',result.rule_count],['binding',result.binding_status]].forEach(item=>{const m=document.createElement('span');m.className='q38Metric';const strong=document.createElement('strong');strong.textContent=item[0]+':';m.append(strong,document.createTextNode(' '+item[1]));metrics.appendChild(m)});

  const obs=document.createElement('div');obs.className='q67Obs';
  (result.observations||[]).forEach(item=>{const s=document.createElement('span');s.textContent=item.predicate+'='+item.value+' · '+(100*Number(item.confidence)).toFixed(0)+'% evidence';obs.appendChild(s)});

  const grid=document.createElement('div');grid.className='q38Candidates';
  (result.stabilized||[]).forEach((row,index)=>{
    const props=(result.world_definitions||{})[row.value]||{};
    const card=document.createElement('div');card.className='q38Candidate'+(leaders.includes(row.value)?' leading':'');
    const tag=document.createElement('div');tag.className='q38Lead';tag.textContent=leaders.includes(row.value)?(leaders.length>1?'TIED LEADER':'BOUND LEADER'):'';
    const n=document.createElement('div');n.className='q38Name';n.textContent=row.value;
    const stage=document.createElement('div');stage.className='q38Stage';stage.innerHTML='<span>TruthDistribution mass</span><strong>'+q38Pct(row.probability)+'</strong>';
    const params=document.createElement('div');params.className='q38Params';Object.entries(props).forEach(([key,value])=>{const p=document.createElement('span');p.className='q38Param';p.textContent=key+'='+value;params.appendChild(p)});
    card.append(tag,n,stage,params);grid.appendChild(card);
  });

  const note=document.createElement('div');note.className='q67TruthNote';
  note.innerHTML='<strong>Binding rule:</strong> a tie never forces the alphabetically first world. The Syntract can still bind the complete unresolved distribution; only the single-world projection remains unbound.';

  box.append(title,trace,summary,core,metrics,obs,grid,note);
  box.classList.add('visible');
  box.scrollIntoView({behavior:'smooth',block:'nearest'});

  const advancedTitle=document.getElementById('q48LastRunTitle'),advanced=document.getElementById('q48LastRun');
  if(advancedTitle)advancedTitle.textContent=result.binding_status==='unresolved_tie'?'UNRESOLVED TIE':(result.world_binding||'UNRESOLVED');
  if(advanced)advanced.textContent='real joint space · '+result.logical_width+' bits · '+result.candidate_binary_space+' candidate states · '+result.rule_count+' explicit logical rules · browser pre-scoring: no';
}

runSeed38=async function(seed){
  q48SeedButtons(true);
  q48QuickStatus('Building the real Logical Space in the Python QCDS core…');
  try{
    const result=BUILD35_STATIC_MODE?await q67RunCore(seed.id==='cell-response'?'biology':seed.id==='robot-navigation'?'robotics':seed.id==='material-stability'?'materials':'software'):null;
    if(!BUILD35_STATIC_MODE)throw new Error('BUILD 67 public Pick a World is currently wired to the packaged browser core.');
    window.Q67_LAST_RESULT=result;
    q67Render(result);
    sessionStatus('QCDS run complete · '+(result.binding_status==='unresolved_tie'?'tie preserved; no single world forced':result.world_binding)+' · real '+result.candidate_binary_space+' Logical Space.','good');
  }catch(e){
    q48QuickStatus('QCDS run failed: '+e.message,'warn');
    sessionStatus(e.message,'warn');
  }finally{
    q48SeedButtons(false);
  }
};
</script>
'''


def living_robot_public_pick67_html(*, static_mode: bool = False) -> str:
    html = _base_html(static_mode=static_mode)
    if "</style>" not in html or "</body>" not in html:
        raise RuntimeError("public surface changed; BUILD 67 Pick a World layer cannot attach safely")
    html = html.replace("</style>", _CSS + "\n</style>", 1)
    html = html.replace("</body>", _SCRIPT + "\n</body>", 1)
    return html


__all__ = ["living_robot_public_pick67_html"]
