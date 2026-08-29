from __future__ import annotations

import argparse
from pathlib import Path
from typing import Sequence

from .living_robot_invite38 import living_robot_invite38_html


_CSS = r'''
/* Specialized Legal Logical Robot surface. Transport only; legal/QCDS semantics remain in Python. */
.legalLab{max-width:1800px;margin:12px auto 0;padding:0 14px}.legalInner{border:1px solid #536d87;background:radial-gradient(circle at 90% 0,#162c43 0,#0b1b29 38%,#07131d 76%);border-radius:18px;padding:18px;box-shadow:0 18px 55px #0004}.legalHead{display:flex;gap:18px;align-items:flex-start}.legalHead>div{flex:1}.legalKicker{font-size:7px;letter-spacing:.16em;color:#9cc9ff}.legalHead h3{font-size:23px;margin:4px 0 6px}.legalHead p{font-size:9px;line-height:1.58;color:#96adba;max-width:1100px;margin:0}.legalBadge{border:1px solid #4f6d87;background:#0c2133;color:#b8dbff;border-radius:999px;padding:7px 10px;font-size:7px;white-space:nowrap}.legalCases{display:flex;gap:7px;flex-wrap:wrap;margin-top:14px}.legalCases button{border:1px solid #42617a;background:#102638;color:#edf7ff;border-radius:9px;padding:9px 11px;font-size:8px;font-weight:760;cursor:pointer}.legalCases button:hover{border-color:#8bc3f3}.legalCases button.primary{background:#dceeff;color:#092135;border-color:#dceeff}.legalStatus{font-size:8px;color:#86a1b2;margin-top:10px;min-height:18px}.legalStatus.good{color:#b7ecc8}.legalStatus.warn{color:#efc986}.legalResult{display:none;margin-top:11px}.legalResult.visible{display:block}.legalMetrics{display:flex;gap:7px;flex-wrap:wrap}.legalMetric{border:1px solid #31536b;background:#081923;border-radius:999px;padding:6px 9px;font-size:7px;color:#89a5b4}.legalMetric strong{color:#dceeff}.legalGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:10px}.legalCard{border:1px solid #2c4b60;background:#071720;border-radius:12px;padding:11px;min-height:110px}.legalCard h4{font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:#9cc9ff;margin:0 0 7px}.legalCard ul{margin:0;padding-left:16px}.legalCard li{font-size:8px;line-height:1.5;color:#b7cad4;margin:3px 0}.legalEmpty{font-size:8px;color:#6f8998}.legalSources{margin-top:10px;border:1px solid #2c4b60;background:#071720;border-radius:12px;padding:11px}.legalSources h4{font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:#9cc9ff;margin:0 0 8px}.legalSource{padding:7px 0;border-top:1px solid #173044}.legalSource:first-of-type{border-top:0}.legalSource b{display:block;font-size:8px;color:#d9eaf4}.legalSource span{display:block;font-size:7px;color:#7e99a8;line-height:1.45;margin-top:2px}.legalSource a{font-size:7px;color:#9cc9ff;text-decoration:none}.praxisGrid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1.8fr);gap:9px;margin-top:10px}.praxisBars,.praxisMatches{border:1px solid #2c4b60;background:#071720;border-radius:12px;padding:11px}.praxisBars h4,.praxisMatches h4{font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:#9cc9ff;margin:0 0 8px}.praxisRow{display:grid;grid-template-columns:120px 1fr 48px;gap:7px;align-items:center;margin:6px 0;font-size:7px;color:#91aab8}.praxisTrack{height:7px;background:#142a38;border-radius:99px;overflow:hidden}.praxisFill{height:100%;background:linear-gradient(90deg,#78dca3,#8bc8ff);border-radius:99px}.praxisMatch{border-top:1px solid #173044;padding:7px 0}.praxisMatch:first-of-type{border-top:0}.praxisMatch b{display:block;font-size:8px;color:#dceeff}.praxisMatch span{display:block;font-size:7px;color:#7895a5;line-height:1.45;margin-top:2px}.legalBoundary{font-size:7px;line-height:1.5;color:#6d8999;margin-top:9px}@media(max-width:900px){.legalGrid{grid-template-columns:1fr}.praxisGrid{grid-template-columns:1fr}}@media(max-width:620px){.legalLab{padding:0 8px}.legalHead{display:block}.legalBadge{display:inline-block;margin-top:10px}.praxisRow{grid-template-columns:100px 1fr 45px}}
'''

_SECTION = r'''
<section class="legalLab" id="swedish-legal-robot">
  <div class="legalInner">
    <div class="legalHead">
      <div>
        <div class="legalKicker">SPECIALIZED LOGICAL ROBOT · SWEDISH HOUSING LAW</div>
        <h3>Put a real legal universe through QCDS.</h3>
        <p>This is not the four-state quick demo. The Legal Logical Robot combines a declared Swedish housing-law universe, temporal rules, explicit exceptions, case facts and a separate precedent/praxis assessment. The web surface is only the body: the legal reasoning and QCDS inference execute in the packaged Python core.</p>
      </div>
      <span class="legalBadge">SFS + PRAXIS + QCDS</span>
    </div>
    <div class="legalCases">
      <button type="button" class="primary" onclick="runLegalCase('new_private_let_2026.json')">NEW PRIVATE LET 2026</button>
      <button type="button" onclick="runLegalCase('legacy_private_let_2026.json')">LEGACY CONTRACT</button>
      <button type="button" onclick="runLegalCase('jordabalk_12_fallback_2026.json')">12 KAP. JB FALLBACK</button>
      <button type="button" onclick="runLegalCase('material_defect_praxis_2026.json')">DEFECT + PRAXIS</button>
    </div>
    <div class="legalStatus" id="legalStatus">Choose a case. The first WebAssembly load can take a moment; after that the robot stays in this tab session.</div>
    <div class="legalResult" id="legalResult"></div>
    <div class="legalBoundary">Research demonstration, not legal advice. The corpus is a bounded legal snapshot dated 2026-08-29. Source authority, factual similarity and legal outcome remain distinct.</div>
  </div>
</section>
'''

_SCRIPT = r'''
<script>
const LEGAL_CASE_TITLES={
 'new_private_let_2026.json':'New private letting · August 2026',
 'legacy_private_let_2026.json':'Legacy private letting · May 2026 contract',
 'jordabalk_12_fallback_2026.json':'General Chapter 12 fallback',
 'material_defect_praxis_2026.json':'Material defect + competing precedent relevance'
};
function legalStatus(text,kind=''){const el=document.getElementById('legalStatus');if(el){el.className='legalStatus '+kind;el.textContent=text}}
function legalWorkerRun(payload){return new Promise((resolve,reject)=>{const worker=build35Worker(),id=++BUILD35_REQUEST;BUILD35_PENDING.set(id,{resolve:resolve,reject:reject});worker.postMessage({type:'legal_run',id:id,payload:payload})})}
function legalList(values,empty='None represented'){if(!values||!values.length)return '<div class="legalEmpty">'+empty+'</div>';return '<ul>'+values.map(v=>'<li>'+escapeLegal(v)+'</li>').join('')+'</ul>'}
function escapeLegal(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderLegalResult(result,title){
 const root=document.getElementById('legalResult');if(!root)return;root.textContent='';
 const metrics=document.createElement('div');metrics.className='legalMetrics';
 const core=result.qcds_core||{},praxis=result.praxis_assessment||{};
 [['case',title||result.case_id],['legal snapshot',result.snapshot_date],['bindings',result.base_binding_count],['active rules',result.active_rule_count],['Syntract',core.syntract_id||'—']].forEach(item=>{const m=document.createElement('span');m.className='legalMetric';m.innerHTML='<strong>'+escapeLegal(item[0])+':</strong> '+escapeLegal(item[1]);metrics.appendChild(m)});
 const grid=document.createElement('div');grid.className='legalGrid';
 const cards=[['Applicable regime',result.primary_regimes,'No regime resolved'],['Legal conclusions',result.conclusions,'No deterministic conclusion represented'],['Unresolved discriminators',result.unresolved_questions,'No unresolved case discriminator']];
 cards.forEach(row=>{const c=document.createElement('div');c.className='legalCard';c.innerHTML='<h4>'+escapeLegal(row[0])+'</h4>'+legalList(row[1],row[2]);grid.appendChild(c)});
 const sources=document.createElement('div');sources.className='legalSources';sources.innerHTML='<h4>Applied statutory path</h4>';
 (result.sources||[]).forEach(row=>{const d=document.createElement('div');d.className='legalSource';d.innerHTML='<b>'+escapeLegal(row.section_id)+' · '+escapeLegal(row.rule_id)+'</b><span>'+escapeLegal(row.explanation||'')+'</span>'+(row.uri?'<a target="_blank" rel="noopener" href="'+escapeLegal(row.uri)+'">official source ↗</a>':'');sources.appendChild(d)});
 if(!(result.sources||[]).length){const e=document.createElement('div');e.className='legalEmpty';e.textContent='No statutory rule path applied.';sources.appendChild(e)}
 const praxisGrid=document.createElement('div');praxisGrid.className='praxisGrid';
 const bars=document.createElement('div');bars.className='praxisBars';bars.innerHTML='<h4>QCDS precedent relevance</h4>';
 (praxis.stabilized_relevance||[]).forEach(row=>{const p=Number(row.probability||0);const d=document.createElement('div');d.className='praxisRow';d.innerHTML='<span>'+escapeLegal(row.precedent_id)+'</span><div class="praxisTrack"><div class="praxisFill" style="width:'+Math.max(1,Math.min(100,p*100))+'%"></div></div><span>'+(p*100).toFixed(1)+'%</span>';bars.appendChild(d)});
 if(!(praxis.stabilized_relevance||[]).length){const e=document.createElement('div');e.className='legalEmpty';e.textContent='No represented precedent factor matched this case.';bars.appendChild(e)}
 const matches=document.createElement('div');matches.className='praxisMatches';matches.innerHTML='<h4>Matched precedent factors</h4>';
 (praxis.matched_precedents||[]).forEach(row=>{const d=document.createElement('div');d.className='praxisMatch';const plus=(row.matched_similarity_factors||[]).join(' · ')||'—';const minus=(row.matched_counter_factors||[]).join(' · ')||'—';d.innerHTML='<b>'+escapeLegal(row.precedent_id)+' · '+escapeLegal(row.name||'')+'</b><span>supports relevance: '+escapeLegal(plus)+'</span><span>counter-factors: '+escapeLegal(minus)+'</span>'+(row.source_uri?'<a target="_blank" rel="noopener" href="'+escapeLegal(row.source_uri)+'" style="font-size:7px;color:#9cc9ff;text-decoration:none">precedent source ↗</a>':'');matches.appendChild(d)});
 if(!(praxis.matched_precedents||[]).length){const e=document.createElement('div');e.className='legalEmpty';e.textContent='No represented precedent factor matched this case.';matches.appendChild(e)}
 praxisGrid.append(bars,matches);root.append(metrics,grid,sources,praxisGrid);root.classList.add('visible');
}
async function runLegalCase(fileName){
 const title=LEGAL_CASE_TITLES[fileName]||fileName;legalStatus('Loading '+title+' and running the specialized Legal Logical Robot…');
 try{const response=await fetch('./legal/cases/'+encodeURIComponent(fileName),{cache:'no-store'});if(!response.ok)throw new Error('Could not load legal case: HTTP '+response.status);const payload=await response.json();const result=await legalWorkerRun(payload);renderLegalResult(result,title);legalStatus('Legal run complete · statutory path + praxis assessment returned through QCDS.','good');document.getElementById('swedish-legal-robot')?.scrollIntoView({behavior:'smooth',block:'start'})}catch(e){legalStatus(e.message||String(e),'warn')}
}
function openLegalRobot(){const el=document.getElementById('swedish-legal-robot');if(el)el.scrollIntoView({behavior:'smooth',block:'start'});const result=document.getElementById('legalResult');if(result&&!result.classList.contains('visible'))runLegalCase('new_private_let_2026.json')}
window.addEventListener('DOMContentLoaded',()=>{const grid=document.querySelector('.seedGrid');if(!grid||document.getElementById('legal-world-card'))return;const article=document.createElement('article');article.className='seed';article.id='legal-world-card';article.innerHTML='<span class="seedTag">Swedish Law</span><h3>Which legal regime survives?</h3><p>Run a real Swedish housing-law universe with statutes, transition rules, exceptions and precedent assessment.</p><button type="button" onclick="openLegalRobot()">TRY SWEDISH LAW →</button>';grid.appendChild(article)});
</script>
'''


def living_robot_legal_html(*, static_mode: bool = False) -> str:
    html = living_robot_invite38_html(static_mode=static_mode)
    if "</style>" not in html or '<section class="sessionSandbox"' not in html or "</body>" not in html:
        raise RuntimeError("Living Logical Robot markup changed; legal surface cannot attach safely")
    html = html.replace("</style>", _CSS + "\n</style>", 1)
    html = html.replace('<section class="sessionSandbox"', _SECTION + '\n<section class="sessionSandbox"', 1)
    html = html.replace("</body>", _SCRIPT + "\n</body>", 1)
    return html


def export_static(path: str | Path) -> Path:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(living_robot_legal_html(static_mode=True), encoding="utf-8")
    return target


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Export the Living Logical Robot with Swedish Housing Legal Robot.")
    parser.add_argument("--export", required=True, help="Output HTML path")
    args = parser.parse_args(argv)
    export_static(args.export)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
