from __future__ import annotations

from .living_robot_public_pick67 import living_robot_public_pick67_html as _base_html


_CSS = r'''
/* BUILD 69: the six QCDS stages are real inspectable controls, not dead summary cards. */
.q69Trace{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px}
.q69Step{appearance:none;-webkit-appearance:none;text-align:left;width:100%;border:1px solid #294b5e;background:#061923;border-radius:14px;padding:15px 16px;cursor:pointer;color:inherit;transition:border-color .16s ease,background .16s ease,transform .16s ease}
.q69Step:hover{border-color:#63b58d;background:#08231e;transform:translateY(-1px)}
.q69Step.active{border-color:#82e5ac;background:#09281f;box-shadow:inset 3px 0 0 #82e5ac}
.q69StepNo{font-size:7px;letter-spacing:.13em;color:#76dba2;text-transform:uppercase}.q69StepTitle{display:block;margin-top:4px;font-size:12px;line-height:1.2;color:#d6f6df;font-weight:800}.q69StepSummary{display:block;margin-top:6px;font-size:8px;line-height:1.45;color:#86a7b7}.q69Open{display:block;margin-top:9px;font-size:6.5px;letter-spacing:.12em;color:#6fcf98;text-transform:uppercase}
.q69Inspect{margin-top:12px;border:1px solid #31584d;background:#071914;border-radius:14px;padding:16px}.q69InspectHead{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding-bottom:12px;border-bottom:1px solid #25473d}.q69InspectKicker{font-size:6.5px;letter-spacing:.15em;text-transform:uppercase;color:#70d9a0}.q69InspectTitle{margin-top:5px;font-size:14px;line-height:1.2;font-weight:800;color:#daf8e3}.q69InspectPlain{max-width:620px;font-size:8px;line-height:1.55;color:#91b0a3}.q69InspectBody{margin-top:13px}
.q69MiniGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.q69Mini{border:1px solid #234357;background:#06151e;border-radius:10px;padding:10px}.q69Mini b{display:block;color:#c8f2d6;font-size:8px}.q69Mini p{margin:5px 0 0;color:#829dac;font-size:7px;line-height:1.45}
.q69Chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}.q69Chip{display:inline-flex;border:1px solid #2b5262;background:#06131b;border-radius:999px;padding:5px 7px;font-size:6.5px;color:#9fc1cf}.q69Chip.hot{border-color:#4f996f;color:#c9f5d8;background:#092018}
.q69Equation{margin:10px 0;border-left:3px solid #77dfa3;padding:8px 11px;background:#081e18;color:#badfca;font-size:8px;line-height:1.55}.q69Equation strong{color:#e1fae8}
.q69OracleStats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-bottom:10px}.q69Stat{border:1px solid #29495b;background:#06151e;border-radius:9px;padding:9px}.q69Stat strong{display:block;font-size:13px;color:#d8f7e1}.q69Stat span{font-size:6.5px;color:#84a5b4;text-transform:uppercase;letter-spacing:.08em}
.q69Details{border-top:1px solid #26463d;padding:9px 0}.q69Details:first-of-type{border-top:0}.q69Details summary{cursor:pointer;color:#c9f3d6;font-size:8px;font-weight:800}.q69Rows{display:grid;gap:5px;margin-top:8px}.q69Row{border:1px solid #213c49;background:#06131a;border-radius:8px;padding:8px}.q69Row b{display:block;color:#a9d9bc;font-size:7px}.q69Row span{display:block;margin-top:3px;color:#809caa;font-size:6.5px;line-height:1.45}
.q69Phase{display:grid;grid-template-columns:38px 1fr;gap:9px;border-top:1px solid #26463d;padding:10px 0}.q69Phase:first-child{border-top:0}.q69PhaseNum{width:31px;height:31px;border:1px solid #4b9870;border-radius:50%;display:grid;place-items:center;color:#bff0ce;font-size:9px;font-weight:800}.q69Phase b{display:block;color:#d3f3dc;font-size:8px}.q69Phase p{margin:4px 0 0;color:#8eaa9e;font-size:7px;line-height:1.5}.q69Phase em{display:block;margin-top:4px;color:#6fcf98;font-size:6.5px;font-style:normal}
.q69Distribution{display:grid;gap:7px}.q69DistRow{display:grid;grid-template-columns:90px 1fr 52px;align-items:center;gap:8px;font-size:7px}.q69DistName{color:#caead3}.q69Bar{height:8px;border-radius:999px;background:#102a31;overflow:hidden}.q69Bar i{display:block;height:100%;background:linear-gradient(90deg,#4b9f73,#8be5ad);border-radius:999px}.q69DistPct{text-align:right;color:#9dc2ad}.q69Binding{margin-top:12px;border:1px solid #426a58;border-radius:10px;padding:10px;background:#092018;color:#9fc8ad;font-size:7.5px;line-height:1.5}.q69Binding strong{color:#d8f6df}
@media(max-width:680px){.q69Trace,.q69MiniGrid{grid-template-columns:1fr}.q69OracleStats{grid-template-columns:repeat(2,minmax(0,1fr))}.q69InspectHead{flex-direction:column}.q69DistRow{grid-template-columns:72px 1fr 44px}}
'''

_SCRIPT = r'''
<script>
/* BUILD 69: inspect the real result returned by pick_a_world_core. */
function q69Text(tag,text,cls){const e=document.createElement(tag);if(cls)e.className=cls;e.textContent=text;return e}
function q69Chip(text,hot){const e=q69Text('span',text,'q69Chip'+(hot?' hot':''));return e}
function q69Clear(node){while(node.firstChild)node.removeChild(node.firstChild)}
function q69Pct(value){return (100*Number(value||0)).toFixed(1)+'%'}

function q69Worlds(result,body){
  const grid=q69Text('div','','q69MiniGrid');
  (result.represented_worlds||[]).forEach(name=>{
    const card=q69Text('div','','q69Mini');card.appendChild(q69Text('b',name.toUpperCase()));
    const chips=q69Text('div','','q69Chips');Object.entries((result.world_definitions||{})[name]||{}).forEach(([k,v])=>chips.appendChild(q69Chip(k+' = '+v,false)));card.appendChild(chips);grid.appendChild(card);
  });
  body.appendChild(grid);
  body.appendChild(q69Text('div','These are complete represented worlds. QCDS does not receive their final score; it receives their logical definitions.','q69Equation'));
}

function q69Properties(result,body){
  const groups=(result.dimension_groups||[]).filter(g=>g.group!=='world');
  const grid=q69Text('div','','q69MiniGrid');
  groups.forEach(group=>{const card=q69Text('div','','q69Mini');card.appendChild(q69Text('b',group.group.toUpperCase()));card.appendChild(q69Text('p',group.meaning));const chips=q69Text('div','','q69Chips');(group.values||[]).forEach(v=>chips.appendChild(q69Chip(v,false)));card.appendChild(chips);grid.appendChild(card)});
  body.appendChild(grid);
  const bits=groups.reduce((n,g)=>n+Number(g.bit_count||0),0);
  const eq=q69Text('div','','q69Equation');eq.append('The four named properties expand to ');eq.appendChild(q69Text('strong',bits+' binary Conditions'));eq.append('. Each possible value has its own bit.');body.appendChild(eq);
}

function q69Space(result,body){
  const eq=q69Text('div','','q69Equation');eq.appendChild(q69Text('strong',result.logical_width+' bits → '+result.candidate_binary_space+' = '+result.raw_state_count+' raw states'));eq.append('. Oracle logic then removes or suppresses incoherent combinations.');body.appendChild(eq);
  const chips=q69Text('div','','q69Chips');(result.logical_dimensions||[]).forEach(bit=>chips.appendChild(q69Chip(bit,bit.startsWith('world='))));body.appendChild(chips);
  body.appendChild(q69Text('div','Green Conditions describe the world choice. Blue Conditions describe the property values. Together they form the joint Logical Space.','q69Equation'));
}

function q69OracleRows(items){const rows=q69Text('div','','q69Rows');(items||[]).forEach(item=>{const row=q69Text('div','','q69Row');row.appendChild(q69Text('b',item.oracle_id));let text=item.logic||'';if(item.confidence!==undefined)text+=' · confidence '+q69Pct(item.confidence);row.appendChild(q69Text('span',text));rows.appendChild(row)});return rows}
function q69OracleDetails(label,count,items,open){const d=document.createElement('details');d.className='q69Details';d.open=!!open;const s=document.createElement('summary');s.textContent=label+' · '+count;d.appendChild(s);d.appendChild(q69OracleRows(items));return d}
function q69Oracles(result,body){
  const sum=result.oracle_summary||{};const stats=q69Text('div','','q69OracleStats');[['TOTAL',sum.total],['STRUCTURAL',sum.structural],['EVIDENCE',sum.evidence],['LOGICAL',sum.logical]].forEach(([k,v])=>{const x=q69Text('div','','q69Stat');x.appendChild(q69Text('strong',String(v)));x.appendChild(q69Text('span',k));stats.appendChild(x)});body.appendChild(stats);
  const groups=result.oracle_groups||{};
  body.appendChild(q69OracleDetails('Structural · keep each group logically valid',sum.structural,groups.structural,true));
  body.appendChild(q69OracleDetails('Evidence · what was actually observed',sum.evidence,groups.evidence,true));
  body.appendChild(q69OracleDetails('Logical · world → property implications',sum.logical,groups.logical,false));
}

function q69Phases(result,body){
  (result.qcds_phases||[]).forEach(phase=>{const row=q69Text('div','','q69Phase');row.appendChild(q69Text('div',String(phase.number),'q69PhaseNum'));const text=q69Text('div','');text.appendChild(q69Text('b',phase.name));text.appendChild(q69Text('p',phase.plain));text.appendChild(q69Text('em',phase.detail));row.appendChild(text);body.appendChild(row)});
}

function q69Syntract(result,body){
  const dist=q69Text('div','','q69Distribution');(result.stabilized_world_distribution||[]).forEach(row=>{const r=q69Text('div','','q69DistRow');r.appendChild(q69Text('div',row.value,'q69DistName'));const bar=q69Text('div','','q69Bar'),fill=document.createElement('i');fill.style.width=Math.max(1,100*Number(row.probability||0))+'%';bar.appendChild(fill);r.appendChild(bar);r.appendChild(q69Text('div',q69Pct(row.probability),'q69DistPct'));dist.appendChild(r)});body.appendChild(dist);
  const bind=q69Text('div','','q69Binding');if(result.binding_status==='unresolved_tie'){bind.appendChild(q69Text('strong','SINGLE WORLD · NOT BOUND'));bind.append(' — the leaders remain tied. The Syntract binds the complete unresolved TruthDistribution instead of inventing certainty.');}else{bind.appendChild(q69Text('strong','SINGLE WORLD · '+String(result.world_binding||'UNRESOLVED').toUpperCase()));bind.append(' — the world projection has one leader, while the Syntract still retains the complete distribution.');}body.appendChild(bind);
  body.appendChild(q69Text('div','Syntract '+result.syntract_id+' · entropy '+Number(result.entropy||0).toFixed(4),'q69Equation'));
}

function q69Open(step,result){
  document.querySelectorAll('.q69Step').forEach((b,i)=>b.classList.toggle('active',i===step-1));
  const panel=document.getElementById('q69Inspect');if(!panel)return;q69Clear(panel);
  const head=q69Text('div','','q69InspectHead'),left=q69Text('div',''),plain=q69Text('div','','q69InspectPlain');
  const meta={1:['WORLD CONDITIONS','The complete candidate worlds represented in this run.'],2:['PROPERTY SPACE','How named properties expand into binary Conditions.'],3:['LOGICAL SPACE','The actual 12-bit joint possibility space before oracle constraints.'],4:['ORACLE SPACE','The active logic that shapes this run — structural, evidence and implications.'],5:['QCDS','What the canonical four phases did to this exact space.'],6:['SYNTRACT','What survived inference and what was, or was not, bound.']}[step];
  left.appendChild(q69Text('div','INSIDE STEP '+step,'q69InspectKicker'));left.appendChild(q69Text('div',meta[0],'q69InspectTitle'));plain.textContent=meta[1];head.append(left,plain);panel.appendChild(head);const body=q69Text('div','','q69InspectBody');panel.appendChild(body);
  if(step===1)q69Worlds(result,body);else if(step===2)q69Properties(result,body);else if(step===3)q69Space(result,body);else if(step===4)q69Oracles(result,body);else if(step===5)q69Phases(result,body);else q69Syntract(result,body);
}

q67Render=function(result){
  const box=document.getElementById('quickResult');if(!box)return;q69Clear(box);
  box.appendChild(q69Text('div','QCDS CORE · OPEN THE LOGICAL SPACE','quickResultTitle'));
  box.appendChild(q69Text('div','This is the machine that just ran. Open any stage to see the actual Conditions, oracles and distribution behind the result.','q38Summary'));
  const trace=q69Text('div','','q69Trace');
  const sum=result.oracle_summary||{};
  const stages=[
    ['WORLD CONDITIONS',(result.represented_worlds||[]).length+' complete worlds'],
    ['PROPERTY SPACE',(result.property_dimensions||[]).length+' named properties · '+((result.logical_dimensions||[]).length-(result.represented_worlds||[]).length)+' property bits'],
    ['LOGICAL SPACE',result.logical_width+' bits · '+result.candidate_binary_space+' = '+result.raw_state_count+' raw states'],
    ['ORACLE SPACE',(sum.total||0)+' active · '+(sum.structural||0)+' structural · '+(sum.evidence||0)+' evidence · '+(sum.logical||0)+' logical'],
    ['QCDS','Four canonical phases · this exact run'],
    ['SYNTRACT',result.binding_status==='unresolved_tie'?'TruthDistribution bound · single world unbound':'TruthDistribution bound · '+result.world_binding+' leads']
  ];
  stages.forEach((item,index)=>{const b=document.createElement('button');b.type='button';b.className='q69Step';b.appendChild(q69Text('span','STEP '+(index+1),'q69StepNo'));b.appendChild(q69Text('span',item[0],'q69StepTitle'));b.appendChild(q69Text('span',item[1],'q69StepSummary'));b.appendChild(q69Text('span','OPEN ↓','q69Open'));b.addEventListener('click',()=>q69Open(index+1,result));trace.appendChild(b)});box.appendChild(trace);
  const inspect=q69Text('div','','q69Inspect');inspect.id='q69Inspect';box.appendChild(inspect);
  const leaders=result.leading_candidates||[];const summary=q69Text('div','', 'q38Summary');summary.textContent=result.binding_status==='unresolved_tie'?'Result: '+leaders.join(' + ')+' remain tied. That uncertainty is preserved, not hidden.':'Result: '+String(result.world_binding||'unresolved')+' is the single leading represented world. The complete distribution is still retained.';box.appendChild(summary);
  const obs=q69Text('div','','q67Obs');(result.observations||[]).forEach(item=>{const s=q69Text('span',item.predicate+'='+item.value+' · '+Math.round(100*Number(item.confidence))+'% evidence');obs.appendChild(s)});box.appendChild(obs);
  box.classList.add('visible');q69Open(1,result);box.scrollIntoView({behavior:'smooth',block:'nearest'});
  const advancedTitle=document.getElementById('q48LastRunTitle'),advanced=document.getElementById('q48LastRun');if(advancedTitle)advancedTitle.textContent=result.binding_status==='unresolved_tie'?'UNRESOLVED TIE':(result.world_binding||'UNRESOLVED');if(advanced)advanced.textContent='real joint space · '+result.logical_width+' bits · '+result.raw_state_count+' raw states · '+sum.total+' active oracles · browser pre-scoring: no';
};
</script>
'''


def living_robot_public_inspect69_html(*, static_mode: bool = False) -> str:
    html = _base_html(static_mode=static_mode)
    if "</style>" not in html or "</body>" not in html:
        raise RuntimeError("public surface changed; BUILD 69 inspection layer cannot attach safely")
    html = html.replace("</style>", _CSS + "\n</style>", 1)
    html = html.replace("</body>", _SCRIPT + "\n</body>", 1)
    return html


__all__ = ["living_robot_public_inspect69_html"]
