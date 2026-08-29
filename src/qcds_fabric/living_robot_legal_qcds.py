from __future__ import annotations

import argparse
from pathlib import Path
from typing import Sequence

from .living_robot_legal import living_robot_legal_html as _base_legal_html


_QCDS_CSS = r'''
/* Direct legal QCDS execution panel. Presentation only; inference remains in Python. */
.qcdsReality{margin-top:10px;border:1px solid #557c66;background:linear-gradient(160deg,#09251a,#071a18 55%,#081923);border-radius:13px;padding:12px}.qcdsRealityTitle{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}.qcdsRealityTitle b{font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:#bce7c8}.qcdsRealityTitle span{font-size:7px;color:#739c82}.qcdsFlow{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px;margin-top:9px}.qcdsFlow>div{border:1px solid #28513c;background:#071a12;border-radius:9px;padding:8px;min-height:68px}.qcdsFlow b{display:block;font-size:6.5px;color:#c8ead1}.qcdsFlow span{display:block;font-size:7px;line-height:1.4;color:#72947e;margin-top:4px}.qcdsStats{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.qcdsStat{border:1px solid #38634b;background:#071b13;border-radius:999px;padding:6px 9px;font-size:7px;color:#84a891}.qcdsStat strong{color:#d6f0dc}.qcdsGrid{display:grid;grid-template-columns:1.2fr 1fr;gap:8px;margin-top:9px}.qcdsPanel{border:1px solid #294f3b;background:#06150f;border-radius:10px;padding:10px}.qcdsPanel h4{font-size:7px;letter-spacing:.1em;text-transform:uppercase;color:#bce7c8;margin:0 0 8px}.qcdsMarginal{display:grid;grid-template-columns:minmax(150px,1fr) 1fr 48px;gap:7px;align-items:center;margin:6px 0}.qcdsMarginal span{font-size:7px;color:#8dad96;line-height:1.3}.qcdsTrack{height:7px;background:#163326;border-radius:99px;overflow:hidden}.qcdsFill{height:100%;background:linear-gradient(90deg,#83dba0,#8ac8d9);border-radius:99px}.qcdsSyntractChain{display:grid;grid-template-columns:1fr 34px 1fr;gap:7px;align-items:center}.qcdsSyntract{border:1px solid #345b45;background:#081c14;border-radius:9px;padding:9px;min-height:92px}.qcdsSyntract b{display:block;font-size:6.5px;text-transform:uppercase;letter-spacing:.09em;color:#91bfa0}.qcdsSyntract strong{display:block;font-size:9px;line-height:1.35;color:#d9eee0;margin-top:5px;word-break:break-word}.qcdsSyntract span{display:block;font-size:7px;color:#779481;line-height:1.45;margin-top:4px}.qcdsArrow{text-align:center;font-size:18px;color:#6fa786}.qcdsBoundary{font-size:7px;line-height:1.55;color:#779481;margin-top:8px}.qcdsBoundary strong{color:#bce7c8}@media(max-width:1000px){.qcdsFlow{grid-template-columns:repeat(3,1fr)}.qcdsGrid{grid-template-columns:1fr}}@media(max-width:620px){.qcdsFlow{grid-template-columns:1fr}.qcdsMarginal{grid-template-columns:1fr 1fr 42px}.qcdsSyntractChain{grid-template-columns:1fr}.qcdsArrow{transform:rotate(90deg)}}
'''


_QCDS_SCRIPT = r'''
<script>
/* The old legal renderer is kept for the explanatory rule/praxis panels. This
   wrapper replaces its final QCDS panel with the direct BaseBundle/OracleStack
   execution now returned by the Python robot. */
const _renderLegalResultBeforeDirectQCDS = renderLegalResult;

function qcdsPct(value){const p=Number(value||0);return (p*100).toFixed(1)+'%'}
function qcdsStat(label,value){return '<span class="qcdsStat"><strong>'+escapeLegal(label)+':</strong> '+escapeLegal(value??'—')+'</span>'}
function qcdsPhase(label,text){return '<div><b>'+escapeLegal(label)+'</b><span>'+escapeLegal(text||'')+'</span></div>'}

function directQCDSPanel(core){
 const statutory=core.statutory_pass||{};
 const phases=core.phases||{};
 const marginals=(core.marginals||[]).filter(row=>row.kind!=='condition').slice(0,12);
 const reentry=core.reentered_statutory_syntract===true;
 const wrap=document.createElement('div');wrap.className='qcdsReality';
 wrap.innerHTML='<div class="qcdsRealityTitle"><b>6 · DIRECT QCDS → LEGAL SYNTRACT</b><span>The active legal space itself is executed by QCDS</span></div>'+
 '<p class="legalStageIntro">Hard law is no longer a precomputed answer here. Relevant case facts enter Condition Formation as fixed conditions; legal regimes, consequences and open assessment states remain live <code>?</code> dimensions. Source-attributed rules become oracles over the exact active binary state space. The stabilized TruthDistribution is bound as the Syntract.</p>'+
 '<div class="qcdsFlow">'+
 qcdsPhase('1 · CONDITION FORMATION','Relevant Jordabalk / statute dimensions + case facts; active table loaded from CSV in memory.')+
 qcdsPhase('2 · CONDITIONAL EVOLUTION','Hard statutory rules are OracleStack constraints; praxis adds separate evidence oracles.')+
 qcdsPhase('3 · 2^N INFERENCE','Exact classical candidate states are enumerated and challenged across QCDS rotation banks.')+
 qcdsPhase('NULL ROTATIONS','Each active dimension is removed in turn without becoming logical 0.')+
 qcdsPhase('POSITION + ORACLE','Position and oracle-exposure rotations test representation sensitivity.')+
 qcdsPhase('4 · TRUTH ALIGNMENT','Rotated distributions stabilize; that distribution is bound directly as Legal Syntract.')+
 '</div>'+
 '<div class="qcdsStats">'+
 qcdsStat('active QCDS space',core.candidate_binary_space)+
 qcdsStat('actual states',core.candidate_state_count)+
 qcdsStat('live ? dimensions',core.unknown_dimension_count)+
 qcdsStat('logical width',core.logical_width)+
 qcdsStat('oracles',core.oracle_count)+
 qcdsStat('CSV in RAM',core.csv_in_memory===true?'yes':'no')+
 qcdsStat('entropy',Number(core.entropy||0).toFixed(3))+
 qcdsStat('retained uncertainty',Number(core.retained_uncertainty||0).toFixed(3))+
 '</div>';

 const grid=document.createElement('div');grid.className='qcdsGrid';
 const left=document.createElement('div');left.className='qcdsPanel';left.innerHTML='<h4>Stabilized legal marginals</h4>';
 if(!marginals.length){left.innerHTML+='<div class="legalEmpty">No live legal marginal was returned for this case.</div>'}
 marginals.forEach(row=>{const p=Number(row.probability_true||0);const d=document.createElement('div');d.className='qcdsMarginal';d.innerHTML='<span title="'+escapeLegal(row.term)+'">'+escapeLegal(legalHuman(row.term))+'</span><div class="qcdsTrack"><div class="qcdsFill" style="width:'+Math.max(1,Math.min(100,p*100))+'%"></div></div><span>'+qcdsPct(p)+'</span>';left.appendChild(d)});

 const right=document.createElement('div');right.className='qcdsPanel';right.innerHTML='<h4>Syntract re-entry chain</h4>';
 const chain=document.createElement('div');chain.className='qcdsSyntractChain';
 chain.innerHTML='<div class="qcdsSyntract"><b>Statutory Syntract</b><strong>'+escapeLegal(core.statutory_syntract_id||statutory.syntract_id||core.syntract_id||'—')+'</strong><span>'+escapeLegal(statutory.candidate_binary_space||core.candidate_binary_space||'—')+' · '+escapeLegal(statutory.candidate_state_count??core.candidate_state_count??'—')+' exact states · '+escapeLegal(statutory.oracle_count??core.oracle_count??'—')+' oracles</span></div>'+
 '<div class="qcdsArrow">→</div>'+
 '<div class="qcdsSyntract"><b>'+escapeLegal(reentry?'Final Legal Syntract':'Legal Syntract')+'</b><strong>'+escapeLegal(core.syntract_id||'—')+'</strong><span>'+(reentry?'Statutory TruthDistribution re-entered through DistributionOracle; active praxis dimensions expanded the room before QCDS ran again.':'No praxis dimension activated; the statutory QCDS distribution is the final Legal Syntract for this bounded case.')+'</span></div>';
 right.appendChild(chain);
 right.innerHTML+='<div class="qcdsBoundary"><strong>Execution:</strong> '+escapeLegal(core.core_execution||'—')+'<br><strong>Candidate-space check:</strong> '+escapeLegal(core.candidate_state_count??'—')+' = '+escapeLegal(core.candidate_binary_space||'—')+'. The runner raises instead of silently pruning if the exact classical room exceeds its configured bound.<br><strong>CSV:</strong> storage only; inference is BaseBundle + OracleStack + FabricLayer. <strong>Canonical core modified:</strong> '+escapeLegal(core.canonical_spec_modified===false?'no':'unknown')+'.</div>';
 grid.append(left,right);wrap.appendChild(grid);
 return wrap;
}

renderLegalResult=function(result,title){
 _renderLegalResultBeforeDirectQCDS(result,title);
 const root=document.getElementById('legalResult');if(!root)return;
 const oldStages=root.querySelectorAll('.legalStage');
 const oldFinal=oldStages.length?oldStages[oldStages.length-1]:null;
 const panel=directQCDSPanel(result.qcds_core||{});
 if(oldFinal&&oldFinal.textContent.includes('QCDS / Syntract'))oldFinal.replaceWith(panel);else root.appendChild(panel);
 const head=root.querySelector('.legalResultHead');
 if(head){
   const p=head.querySelector('p');if(p)p.innerHTML='The source-attributed legal resolver forms the active problem. <strong>The final legal result is then produced by direct QCDS execution over the active binary room</strong>: rules become oracle constraints, rotations challenge the space, praxis can re-enter the statutory Syntract, and the stabilized TruthDistribution is bound as the final Syntract.';
   const metrics=head.querySelector('.legalMetrics');if(metrics){
     metrics.insertAdjacentHTML('beforeend',qcdsStat('QCDS space',(result.qcds_core||{}).candidate_binary_space||'—')+qcdsStat('states',(result.qcds_core||{}).candidate_state_count??'—')+qcdsStat('oracles',(result.qcds_core||{}).oracle_count??'—'));
   }
 }
};
</script>
'''


def living_robot_legal_qcds_html(*, static_mode: bool = False) -> str:
    html = _base_legal_html(static_mode=static_mode)
    html = html.replace(
        "a green/clear legal conclusion means the represented statutory conditions are met.",
        "the displayed statutory rule path is Condition Formation/provenance, not the final QCDS answer.",
    )
    html = html.replace(
        "Hard / declared consequences",
        "Resolver consequences · QCDS candidates",
    )
    html = html.replace(
        "The statutory regime pass and the active praxis relevance pass both call the existing <code>qcds_fabric.problem.problem_to_syntract</code> path. Praxis never silently rewrites the statutory result.",
        "The active Jordabalk/legal room is executed directly by the shared QCDS Fabric. The preliminary resolver only forms the source-attributed constraint set; final truth alignment comes from the stabilized QCDS distribution.",
    )
    if "</style>" not in html or "</body>" not in html:
        raise RuntimeError("Living Legal Robot markup changed; direct-QCDS surface cannot attach safely")
    html = html.replace("</style>", _QCDS_CSS + "\n</style>", 1)
    html = html.replace("</body>", _QCDS_SCRIPT + "\n</body>", 1)
    return html


def export_static(path: str | Path) -> Path:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(living_robot_legal_qcds_html(static_mode=True), encoding="utf-8")
    return target


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Export Living Logical Robot with direct Swedish legal QCDS execution UI.")
    parser.add_argument("--export", required=True, help="Output HTML path")
    args = parser.parse_args(argv)
    export_static(args.export)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
