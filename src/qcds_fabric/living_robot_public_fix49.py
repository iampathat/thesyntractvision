from __future__ import annotations

import argparse
from pathlib import Path
from typing import Sequence

from .living_robot_public_fix48 import living_robot_public_fix48_html as _base_html


_BUILD = "49"

_CSS = r'''
/* BUILD 49: fast, visible Legal RUN QUESTION path. */
.publicLegalInlineStatus{grid-column:1/-1;border:1px solid #29495d;background:#071722;border-radius:10px;padding:9px 10px;font-size:8px;line-height:1.5;color:#8faab8;min-height:18px}
.publicLegalInlineStatus.good{border-color:#35694b;color:#b7ecc8;background:#081d15}.publicLegalInlineStatus.warn{border-color:#765f32;color:#efc986;background:#211b0d}
.publicLegalQuickResult{display:none;grid-column:1/-1;border:1px solid #3c6078;background:linear-gradient(150deg,#0b2130,#071720);border-radius:13px;padding:12px}.publicLegalQuickResult.visible{display:block}
.publicLegalQuickHead{display:flex;gap:10px;align-items:flex-start;justify-content:space-between}.publicLegalQuickHead>div{flex:1}.publicLegalQuickKicker{font-size:7px;letter-spacing:.13em;text-transform:uppercase;color:#9cc9ff}.publicLegalQuickHead h3{font-size:18px;margin:4px 0 5px}.publicLegalQuickHead p{font-size:8px;line-height:1.5;color:#8aa5b4;margin:0}.publicLegalQuickBadge{border:1px solid #3c6750;background:#0b2118;color:#b7ecc8;border-radius:999px;padding:6px 8px;font-size:6.5px;white-space:nowrap}
.publicLegalQuickGrid{display:grid;grid-template-columns:1.1fr 1.4fr 1.4fr;gap:7px;margin-top:10px}.publicLegalQuickCard{border:1px solid #29495d;background:#06141d;border-radius:10px;padding:9px;min-height:90px}.publicLegalQuickCard b{display:block;font-size:6.5px;text-transform:uppercase;letter-spacing:.11em;color:#8fc5e8}.publicLegalQuickCard strong{display:block;font-size:10px;line-height:1.4;color:#e2f1f8;margin-top:5px}.publicLegalQuickList{margin-top:5px;font-size:7.5px;line-height:1.5;color:#8da7b5}.publicLegalQuickList div{border-top:1px solid #183142;padding:5px 0}.publicLegalQuickList div:first-child{border-top:0}.publicLegalQuickPath{margin-top:9px;border-top:1px solid #214052;padding-top:8px;font-size:7.5px;line-height:1.5;color:#7896a6}.publicLegalQuickPath strong{color:#dceef8}
.publicLegalQuickDetails{display:none;margin-top:9px;border:1px solid #29495d;background:#06131c;border-radius:10px;padding:9px}.publicLegalQuickDetails.visible{display:block}.publicLegalQuickDetails pre{margin:0;white-space:pre-wrap;font-size:7px;line-height:1.45;color:#83a0af}
#publicLegalRun:disabled{opacity:.55;cursor:wait}
@media(max-width:850px){.publicLegalQuickGrid{grid-template-columns:1fr}.publicLegalQuickHead{display:block}.publicLegalQuickBadge{display:inline-block;margin-top:7px}}
'''

_INLINE = r'''
      <div class="publicLegalInlineStatus" id="publicLegalInlineStatus">Ready. Ask the represented legal material one bounded question.</div>
      <section class="publicLegalQuickResult" id="publicLegalQuickResult" aria-live="polite"></section>
'''

_SCRIPT = r'''
<script>
/* BUILD 49: public legal question path. Full research robot remains available outside the default question run. */
function q49LegalStatus(message,kind=''){
  const el=document.getElementById('publicLegalInlineStatus');
  if(el){el.className='publicLegalInlineStatus '+kind;el.textContent=message}
}

function q49LegalWorkerRun(payload){
  return new Promise((resolve,reject)=>{
    const worker=build35Worker(),id=++BUILD35_REQUEST;
    BUILD35_PENDING.set(id,{resolve:resolve,reject:reject});
    worker.postMessage({type:'legal_question_run',id:id,payload:payload});
  });
}

function q49TextList(root,values,empty){
  root.textContent='';
  const rows=(values||[]).filter(Boolean);
  if(!rows.length){const d=document.createElement('div');d.textContent=empty;root.appendChild(d);return}
  rows.forEach(value=>{const d=document.createElement('div');d.textContent=typeof legalHuman==='function'?legalHuman(value):String(value);root.appendChild(d)});
}

function q49RenderLegalQuestion(result,title){
  const root=document.getElementById('publicLegalQuickResult');if(!root)return;
  root.textContent='';
  const ingress=result.question_ingress||{},core=result.qcds_core||{};
  const head=document.createElement('div');head.className='publicLegalQuickHead';
  const copy=document.createElement('div');const kicker=document.createElement('div');kicker.className='publicLegalQuickKicker';kicker.textContent='LEGAL QUESTION · QCDS RESULT';
  const h=document.createElement('h3');h.textContent=title||result.case_id||'Represented legal result';
  const p=document.createElement('p');p.textContent=ingress.recognized?'The translator formed the issue scope without supplying the answer. Legal constraints then filtered the represented space before the QCDS core bound the result.':(ingress.unresolved_reason||'The question wording was not classified; no issue scope was invented. The explicit case material was still evaluated.');
  copy.append(kicker,h,p);const badge=document.createElement('span');badge.className='publicLegalQuickBadge';badge.textContent='BOUNDED PUBLIC RUN';head.append(copy,badge);root.appendChild(head);

  const grid=document.createElement('div');grid.className='publicLegalQuickGrid';
  const scope=document.createElement('article');scope.className='publicLegalQuickCard';scope.innerHTML='<b>Translator scope</b>';
  const scopeStrong=document.createElement('strong');scopeStrong.textContent=(ingress.logical_scope_terms||[]).join(' · ')||'No scope invented';scope.appendChild(scopeStrong);
  const regime=document.createElement('article');regime.className='publicLegalQuickCard';regime.innerHTML='<b>Represented legal regime</b>';
  const regimeStrong=document.createElement('strong');regimeStrong.textContent=(result.primary_regimes||[]).map(v=>typeof legalHuman==='function'?legalHuman(v):v).join(', ')||'Unresolved';regime.appendChild(regimeStrong);
  const regimeList=document.createElement('div');regimeList.className='publicLegalQuickList';q49TextList(regimeList,result.conclusions,'No represented conclusion was activated.');regime.appendChild(regimeList);
  const open=document.createElement('article');open.className='publicLegalQuickCard';open.innerHTML='<b>Still open / must be checked</b>';
  const openStrong=document.createElement('strong');openStrong.textContent=(result.unresolved_questions||[]).length?'The model refuses to collapse these conditions':'No unresolved represented condition';open.appendChild(openStrong);
  const openList=document.createElement('div');openList.className='publicLegalQuickList';q49TextList(openList,result.unresolved_questions,'Nothing additional is unresolved inside this bounded case.');open.appendChild(openList);
  grid.append(scope,regime,open);root.appendChild(grid);

  const path=document.createElement('div');path.className='publicLegalQuickPath';path.innerHTML='<strong>Execution:</strong> question/material → translator → Logical Space → legal/oracle filters → QCDS four phases → TruthDistribution → Syntract. <strong>No second null percentage is presented as another answer.</strong>';
  const meta=document.createElement('div');meta.className='publicLegalQuickPath';meta.textContent='Activated legal filters: '+String((result.applied_rules||[]).length)+' · source references: '+String((result.sources||[]).length)+' · Syntract: '+String(core.syntract_id||'—')+' · full praxis/dual-substrate research pass: not run by this button.';
  root.append(path,meta);

  const details=document.createElement('div');details.className='publicLegalQuickDetails';details.id='publicLegalQuickDetails';
  const pre=document.createElement('pre');pre.textContent=JSON.stringify({question_ingress:ingress,applied_rules:result.applied_rules||[],sources:result.sources||[],qcds_core:{core_execution:core.core_execution,syntract_id:core.syntract_id,leading_candidates:core.leading_candidates,baseline:core.baseline,conflict_markers:core.conflict_markers}},null,2);details.appendChild(pre);root.appendChild(details);
  root.classList.add('visible');
}

async function q49ExecuteLegalQuestion(fileName,question){
  const title=(typeof LEGAL_CASE_TITLES!=='undefined'&&LEGAL_CASE_TITLES[fileName])||fileName;
  q49LegalStatus('Loading the represented material…');
  const response=await fetch('./legal/cases/'+encodeURIComponent(fileName),{cache:'no-store'});
  if(!response.ok)throw new Error('Could not load legal case: HTTP '+response.status);
  const payload=await response.json();payload.question=String(question||'').trim();
  q49LegalStatus('Translating the question into legal scope and oracle-relevant constraints…');
  await new Promise(resolve=>setTimeout(resolve,0));
  q49LegalStatus('Running the bounded legal Logical Space through QCDS…');
  const result=await q49LegalWorkerRun(payload);
  q49RenderLegalQuestion(result,title);
  const ingress=result.question_ingress||{},scope=(ingress.logical_scope_terms||[]).join(', ')||'bounded explicit case scope';
  q49LegalStatus('Complete · '+scope+' → legal filters → QCDS → Syntract.','good');
  return result;
}

window.publicRunLegalQuestion=async function(){
  const select=document.getElementById('publicLegalContext'),input=document.getElementById('publicLegalQuestionText'),button=document.getElementById('publicLegalRun');
  const fileName=select?select.value:'',question=input?input.value.trim():'';
  if(!question){q49LegalStatus('Write a question first. The translator cannot invent one.','warn');return}
  if(button)button.disabled=true;
  try{await q49ExecuteLegalQuestion(fileName,question)}catch(e){q49LegalStatus('Legal run failed: '+(e.message||String(e)),'warn')}finally{if(button)button.disabled=false}
};

window.runLegalCase=async function(fileName){
  publicSelectView('legal');
  const question=PUBLIC_LEGAL_QUESTIONS[fileName]||'What follows from the represented legal facts?';
  const select=document.getElementById('publicLegalContext');if(select){const option=[...select.options].find(item=>item.value===fileName);if(option)select.value=fileName}
  const input=document.getElementById('publicLegalQuestionText');if(input)input.value=question;
  const button=document.getElementById('publicLegalRun');if(button)button.disabled=true;
  try{return await q49ExecuteLegalQuestion(fileName,question)}catch(e){q49LegalStatus('Legal run failed: '+(e.message||String(e)),'warn')}finally{if(button)button.disabled=false}
};

window.publicToggleRunDetails=function(){
  const el=document.getElementById('publicLegalQuickDetails');
  if(!el){q49LegalStatus('Run a legal question first, then open the QCDS details.','warn');return}
  el.classList.toggle('visible');
};
</script>
'''


def living_robot_public_fix49_html(*, static_mode: bool = False) -> str:
    html = _base_html(static_mode=static_mode)
    run_marker = '<button type="button" onclick="publicToggleRunDetails()">SHOW / HIDE TECHNICAL RUN</button>\n      </div>'
    if "</style>" not in html or "</body>" not in html or run_marker not in html:
        raise RuntimeError("public BUILD 48 markup changed; BUILD 49 legal repair cannot attach safely")
    html = html.replace("</style>", _CSS + "\n</style>", 1)
    html = html.replace(run_marker, '<button type="button" onclick="publicToggleRunDetails()">SHOW / HIDE QCDS DETAILS</button>\n      </div>\n' + _INLINE, 1)
    html = html.replace("</body>", _SCRIPT + "\n</body>", 1)
    return html


def export_static(path: str | Path) -> Path:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(living_robot_public_fix49_html(static_mode=True), encoding="utf-8")
    return target


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Export BUILD 49: responsive bounded Legal RUN QUESTION path.")
    parser.add_argument("--export", required=True, help="Output HTML path")
    args = parser.parse_args(argv)
    export_static(args.export)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
