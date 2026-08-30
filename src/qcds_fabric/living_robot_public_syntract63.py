from __future__ import annotations

from .living_robot_public_fix49 import living_robot_public_fix49_html as _base_html


_CSS = r'''
/* Parallel Syntract capability surface. */
body.publicCompact:not(.publicViewSyntract) #public-syntracts{display:none!important}
.publicSyntracts{max-width:1800px;margin:10px auto 0;padding:0 14px}.publicSyntractInner{border:1px solid #3b5d72;background:linear-gradient(145deg,#081a25,#071820);border-radius:16px;padding:15px;box-shadow:0 14px 40px #0003}.publicSyntractHead{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.publicSyntractKicker{font-size:7px;letter-spacing:.14em;text-transform:uppercase;color:#9cc9ff}.publicSyntractHead h2{font-size:21px;margin:4px 0 6px}.publicSyntractHead p{font-size:8px;line-height:1.55;color:#8ca7b6;max-width:1100px;margin:0}.publicSyntractFlow{margin-top:10px;border:1px solid #29495d;background:#06141d;border-radius:10px;padding:9px;font-size:7.5px;line-height:1.55;color:#7896a6}.publicSyntractFlow strong{color:#dceef8}.publicSyntractGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:11px}.publicSyntractCard{border:1px solid #29495d;background:#06131c;border-radius:12px;padding:11px;display:flex;flex-direction:column;min-height:220px}.publicSyntractCard .k{font-size:6.5px;letter-spacing:.12em;text-transform:uppercase;color:#88b9d8}.publicSyntractCard h3{font-size:14px;line-height:1.28;margin:5px 0 6px}.publicSyntractCard p{font-size:7.5px;line-height:1.5;color:#819eae;margin:0}.publicSyntractInputs{display:flex;flex-wrap:wrap;gap:5px;margin:10px 0}.publicSyntractChip{border:1px solid #31536b;background:#0a1c28;border-radius:999px;padding:5px 7px;font-size:6.5px;color:#b9d9e9}.publicSyntractCard button{margin-top:auto;padding:9px 10px;font-size:8px;background:#d9f8e4;color:#082117;border-color:#d9f8e4}.publicSyntractCard button:disabled{opacity:.55;cursor:wait}.publicSyntractStatus{margin-top:10px;border:1px solid #29495d;background:#071722;border-radius:10px;padding:9px 10px;font-size:8px;line-height:1.5;color:#8faab8}.publicSyntractStatus.good{border-color:#35694b;color:#b7ecc8;background:#081d15}.publicSyntractStatus.warn{border-color:#765f32;color:#efc986;background:#211b0d}.publicSyntractResult{display:none;margin-top:10px;border:1px solid #3c6078;background:linear-gradient(150deg,#0b2130,#071720);border-radius:13px;padding:12px}.publicSyntractResult.visible{display:block}.publicSyntractResultHead{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.publicSyntractResultHead h3{font-size:18px;margin:3px 0 4px}.publicSyntractResultHead p{font-size:7.5px;color:#84a0af;line-height:1.5;margin:0}.publicSyntractBadge{border:1px solid #3c6750;background:#0b2118;color:#b7ecc8;border-radius:999px;padding:6px 8px;font-size:6.5px;white-space:nowrap}.publicSyntractMetrics{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:10px}.publicSyntractMetric{border:1px solid #29495d;background:#06141d;border-radius:9px;padding:8px}.publicSyntractMetric b{display:block;font-size:6px;letter-spacing:.1em;text-transform:uppercase;color:#7fa5ba}.publicSyntractMetric strong{display:block;font-size:11px;color:#e4f4fb;margin-top:4px}.publicSyntractStages{display:grid;grid-template-columns:1fr auto 1fr auto 1.15fr;gap:7px;align-items:stretch;margin-top:10px}.publicSyntractStage{border:1px solid #29495d;background:#06131c;border-radius:10px;padding:9px}.publicSyntractStage b{font-size:6.5px;letter-spacing:.1em;text-transform:uppercase;color:#8fc5e8}.publicSyntractStage .rows{margin-top:6px;font-size:7px;line-height:1.5;color:#90a9b7}.publicSyntractStage .rows div{border-top:1px solid #183142;padding:4px 0}.publicSyntractStage .rows div:first-child{border-top:0}.publicSyntractArrow{display:flex;align-items:center;justify-content:center;color:#7fa6bb;font-size:16px}.publicSyntractHigher{border-color:#42694f;background:#071b13}.publicSyntractHigher b{color:#9fdbb4}.publicSyntractLinks{margin-top:9px;border-top:1px solid #214052;padding-top:8px;font-size:7px;line-height:1.5;color:#7896a6}.publicSyntractLinks strong{color:#dceef8}.publicSyntractNotice{margin-top:7px;font-size:6.8px;line-height:1.45;color:#6f8d9e}
@media(max-width:1000px){.publicSyntractGrid{grid-template-columns:1fr}.publicSyntractStages{grid-template-columns:1fr}.publicSyntractArrow{transform:rotate(90deg)}.publicSyntractMetrics{grid-template-columns:repeat(2,1fr)}}@media(max-width:700px){.publicSyntracts{padding:0 8px}.publicSyntractResultHead{display:block}.publicSyntractBadge{display:inline-block;margin-top:7px}}
'''

_SECTION = r'''
<section class="publicSyntracts" id="public-syntracts">
  <div class="publicSyntractInner">
    <div class="publicSyntractHead">
      <div>
        <div class="publicSyntractKicker">SYNTRACT COMPOSITION · PARALLEL QCDS</div>
        <h2>Run complete Syntracts together.</h2>
        <p>Each component is first inferred and bound as its own Syntract. Those complete TruthDistributions then enter QCDS as parallel branches. The branches re-enter one joint Logical Space, where only explicit cross-oracles may connect them, and QCDS binds a new higher-order Syntract.</p>
      </div>
    </div>
    <div class="publicSyntractFlow"><strong>Execution:</strong> component material → component QCDS → component Syntracts → parallel QCDS → complete branch TruthDistributions → joint 2^n Logical Space + explicit cross-oracles → QCDS → higher-order Syntract. <strong>No voting. No hard collapse. No separate fusion engine.</strong></div>
    <div class="publicSyntractGrid">
      <article class="publicSyntractCard">
        <div class="k">BIOMEDICINE · SYNTHETIC</div><h3>DNA + protein + cell + patient + drug</h3><p>Five independently bound structures become one cross-domain logical problem.</p>
        <div class="publicSyntractInputs"><span class="publicSyntractChip">DNA</span><span class="publicSyntractChip">PROTEIN</span><span class="publicSyntractChip">CELL</span><span class="publicSyntractChip">PATIENT</span><span class="publicSyntractChip">DRUG</span></div>
        <button type="button" data-syntract-demo="biomedicine" onclick="publicRunSyntractDemo('biomedicine')">RUN 5 SYNTRACTS →</button>
      </article>
      <article class="publicSyntractCard">
        <div class="k">INVESTIGATION · SYNTHETIC</div><h3>person + phone data + car + camera + timeline + witness</h3><p>Six evidence domains retain their own uncertainty before QCDS composes the represented links.</p>
        <div class="publicSyntractInputs"><span class="publicSyntractChip">PERSON</span><span class="publicSyntractChip">PHONE</span><span class="publicSyntractChip">CAR</span><span class="publicSyntractChip">CAMERA</span><span class="publicSyntractChip">TIMELINE</span><span class="publicSyntractChip">WITNESS</span></div>
        <button type="button" data-syntract-demo="investigation" onclick="publicRunSyntractDemo('investigation')">RUN 6 SYNTRACTS →</button>
      </article>
      <article class="publicSyntractCard">
        <div class="k">ROBOTICS · SYNTHETIC</div><h3>robot + environment + mission + safety rules + people</h3><p>Machine, world, mission, safety and human state enter the same inference architecture.</p>
        <div class="publicSyntractInputs"><span class="publicSyntractChip">ROBOT</span><span class="publicSyntractChip">ENVIRONMENT</span><span class="publicSyntractChip">MISSION</span><span class="publicSyntractChip">SAFETY</span><span class="publicSyntractChip">PEOPLE</span></div>
        <button type="button" data-syntract-demo="robotics" onclick="publicRunSyntractDemo('robotics')">RUN 5 SYNTRACTS →</button>
      </article>
    </div>
    <div class="publicSyntractStatus" id="publicSyntractStatus">Ready. Choose a parallel Syntract composition.</div>
    <section class="publicSyntractResult" id="publicSyntractResult" aria-live="polite"></section>
  </div>
</section>
'''

_SCRIPT = r'''
<script>
function q63Status(message,kind=''){
 const el=document.getElementById('publicSyntractStatus');if(!el)return;
 el.className='publicSyntractStatus '+kind;el.textContent=message;
}
function q63WorkerRun(payload){
 return new Promise((resolve,reject)=>{
   const worker=build35Worker(),id=++BUILD35_REQUEST;
   BUILD35_PENDING.set(id,{resolve:resolve,reject:reject});
   worker.postMessage({type:'syntract_demo_run',id:id,payload:payload});
 });
}
function q63Rows(values,formatter){
 const root=document.createElement('div');root.className='rows';
 (values||[]).forEach(value=>{const row=document.createElement('div');row.textContent=formatter(value);root.appendChild(row)});
 return root;
}
function q63Metric(label,value){
 const box=document.createElement('div');box.className='publicSyntractMetric';
 const b=document.createElement('b');b.textContent=label;const s=document.createElement('strong');s.textContent=String(value);box.append(b,s);return box;
}
function q63Render(result){
 const root=document.getElementById('publicSyntractResult');if(!root)return;root.textContent='';
 const head=document.createElement('div');head.className='publicSyntractResultHead';
 const copy=document.createElement('div');const k=document.createElement('div');k.className='publicSyntractKicker';k.textContent='PARALLEL QCDS → HIGHER-ORDER SYNTRACT';
 const h=document.createElement('h3');h.textContent=result.title;const p=document.createElement('p');p.textContent=result.subtitle;copy.append(k,h,p);
 const badge=document.createElement('span');badge.className='publicSyntractBadge';badge.textContent='ONE QCDS ARCHITECTURE';head.append(copy,badge);root.appendChild(head);
 const metrics=document.createElement('div');metrics.className='publicSyntractMetrics';
 metrics.append(q63Metric('Parallel branches',result.parallel_branch_count),q63Metric('Joint width',result.joint_logical_width),q63Metric('Logical space',result.candidate_binary_space),q63Metric('Joint oracles',result.joint_oracle_count));root.appendChild(metrics);
 const stages=document.createElement('div');stages.className='publicSyntractStages';
 const sources=document.createElement('div');sources.className='publicSyntractStage';sources.innerHTML='<b>Bound source Syntracts</b>';
 sources.appendChild(q63Rows(result.components||[],v=>v.label+' · '+(v.leading_candidates||[]).join('/')+' · '+v.syntract_id));
 const a1=document.createElement('div');a1.className='publicSyntractArrow';a1.textContent='→';
 const parallel=document.createElement('div');parallel.className='publicSyntractStage';parallel.innerHTML='<b>Parallel QCDS branches</b>';
 parallel.appendChild(q63Rows(result.components||[],v=>v.branch_id+' · full TruthDistribution'));
 const a2=document.createElement('div');a2.className='publicSyntractArrow';a2.textContent='→';
 const higher=document.createElement('div');higher.className='publicSyntractStage publicSyntractHigher';higher.innerHTML='<b>Higher-order Syntract</b>';
 const rows=document.createElement('div');rows.className='rows';
 Object.entries(result.top_world||{}).forEach(([label,value])=>{const d=document.createElement('div');d.textContent=label+' → '+value;rows.appendChild(d)});
 const id=document.createElement('div');id.textContent='Bound as '+result.higher_order_syntract_id;rows.appendChild(id);higher.appendChild(rows);
 stages.append(sources,a1,parallel,a2,higher);root.appendChild(stages);
 const links=document.createElement('div');links.className='publicSyntractLinks';const strong=document.createElement('strong');strong.textContent='Explicit cross-oracles: ';links.appendChild(strong);
 links.appendChild(document.createTextNode((result.links||[]).map(v=>v.description).join(' · ')||'none'));root.appendChild(links);
 const path=document.createElement('div');path.className='publicSyntractLinks';const ps=document.createElement('strong');ps.textContent='Execution path: ';path.append(ps,document.createTextNode(result.execution_path||''));root.appendChild(path);
 const notice=document.createElement('div');notice.className='publicSyntractNotice';notice.textContent=result.synthetic_notice||'';root.appendChild(notice);
 root.classList.add('visible');
}
window.publicRunSyntractDemo=async function(demoId){
 document.querySelectorAll('[data-syntract-demo]').forEach(btn=>btn.disabled=true);
 q63Status('Binding component Syntracts and entering them into parallel QCDS…');
 try{
   const result=await q63WorkerRun({demo_id:demoId});
   q63Status('Complete · '+result.parallel_branch_count+' Syntracts → parallel QCDS → '+result.candidate_binary_space+' joint space → higher-order Syntract.','good');
   q63Render(result);
 }catch(e){q63Status('Syntract composition failed: '+(e.message||String(e)),'warn')}
 finally{document.querySelectorAll('[data-syntract-demo]').forEach(btn=>btn.disabled=false)}
};
</script>
'''


def living_robot_public_syntract63_html(*, static_mode: bool = False) -> str:
    html = _base_html(static_mode=static_mode)
    anchors = (
        "</style>",
        "</body>",
        "const PUBLIC_VIEW_CLASSES=['publicViewQcds','publicViewLegal','publicViewAdvanced'];",
        '<button type="button" data-public-view="advanced" onclick="publicSelectView(\'advanced\')">ADVANCED</button>',
    )
    if any(anchor not in html for anchor in anchors):
        raise RuntimeError("public surface changed; Syntract composition UI cannot attach safely")
    html = html.replace("</style>", _CSS + "\n</style>", 1)
    html = html.replace(
        '<button type="button" data-public-view="advanced" onclick="publicSelectView(\'advanced\')">ADVANCED</button>',
        '<button type="button" data-public-view="syntract" onclick="publicSelectView(\'syntract\')">SYNTRACTS</button>\n      <button type="button" data-public-view="advanced" onclick="publicSelectView(\'advanced\')">ADVANCED</button>',
        1,
    )
    html = html.replace(
        "const PUBLIC_VIEW_CLASSES=['publicViewQcds','publicViewLegal','publicViewAdvanced'];",
        "const PUBLIC_VIEW_CLASSES=['publicViewQcds','publicViewLegal','publicViewSyntract','publicViewAdvanced'];",
        1,
    )
    old = " if(view==='advanced')document.body.classList.add('publicViewAdvanced');\n else if(view==='legal'){document.body.classList.add('publicViewLegal');publicSelectLegalMode('ask',false)}\n else{view='qcds';document.body.classList.add('publicViewQcds')}"
    new = " if(view==='advanced')document.body.classList.add('publicViewAdvanced');\n else if(view==='legal'){document.body.classList.add('publicViewLegal');publicSelectLegalMode('ask',false)}\n else if(view==='syntract')document.body.classList.add('publicViewSyntract');\n else{view='qcds';document.body.classList.add('publicViewQcds')}"
    if old not in html:
        raise RuntimeError("publicSelectView contract changed; Syntract view cannot attach safely")
    html = html.replace(old, new, 1)
    html = html.replace("</body>", _SECTION + "\n" + _SCRIPT + "\n</body>", 1)
    return html


__all__ = ["living_robot_public_syntract63_html"]
