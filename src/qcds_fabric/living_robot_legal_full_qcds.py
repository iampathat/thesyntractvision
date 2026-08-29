from __future__ import annotations

import argparse
from pathlib import Path
from typing import Sequence

from .living_robot_legal_qcds import living_robot_legal_qcds_html as _direct_html


_CSS = r'''
.fullQCDS{margin-top:10px;border:1px solid #5a6691;background:linear-gradient(160deg,#0a1025,#0a1725 55%,#07171a);border-radius:13px;padding:12px}.fullQCDSTitle{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}.fullQCDSTitle b{font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:#c5d1ff}.fullQCDSTitle span{font-size:7px;color:#8690b5}.substrateGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}.substrateCard{border:1px solid #39466f;background:#080f20;border-radius:10px;padding:10px}.substrateCard h4{font-size:8px;letter-spacing:.09em;text-transform:uppercase;color:#cbd6ff;margin:0 0 7px}.substrateCard strong{display:block;font-size:10px;color:#e1e7ff;word-break:break-word}.substrateCard span{display:block;font-size:7px;color:#8d98bd;line-height:1.45;margin-top:4px}.substrateCard.grover{border-color:#3f6f68;background:#071a18}.substrateCard.grover h4{color:#bde9d8}.fullStats{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.fullPill{border:1px solid #3b486f;border-radius:99px;padding:5px 8px;font-size:7px;color:#9ba6c8}.fullPill strong{color:#e1e7ff}.evidenceList,.scaleList{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px}.fullMini{border:1px solid #2e395b;background:#070d1a;border-radius:9px;padding:9px}.fullMini b{display:block;font-size:7px;color:#c6d0f0;text-transform:uppercase;letter-spacing:.08em}.fullMini span{display:block;font-size:7px;color:#8490ae;line-height:1.45;margin-top:4px}.fullBoundary{font-size:7px;color:#7885a4;line-height:1.5;margin-top:8px}@media(max-width:800px){.substrateGrid,.evidenceList,.scaleList{grid-template-columns:1fr}}
'''


_SCRIPT = r'''
<script>
const _renderLegalResultBeforeFullQCDS = renderLegalResult;
function fqPill(label,value){return '<span class="fullPill"><strong>'+escapeLegal(label)+':</strong> '+escapeLegal(value??'—')+'</span>'}
function fqBool(v){return v===true?'yes':v===false?'no':'—'}
function fullQCDSPanel(core){
 const dual=core.dual_substrate||{},exact=dual.classical_exact||{},grover=dual.grover_emulated||{};
 const cmp=grover.comparison_to_classical_exact||{};
 const evidence=core.probabilistic_evidence||{};
 const scaling=core.scaling||grover.scaling?.plan||{};
 const depths=grover.selected_grover_iterations||{};
 const depthText=Object.keys(depths).length?Object.entries(depths).slice(0,10).map(([k,v])=>k+'='+v).join(' · '):'none / not run';
 const wrap=document.createElement('div');wrap.className='fullQCDS';
 wrap.innerHTML='<div class="fullQCDSTitle"><b>7 · SAME QCDS · TWO EXECUTION SUBSTRATES</b><span>reference exact vs quantum-emulated Grover</span></div>'+
 '<p class="legalStageIntro">Both variants consume the same active legal BaseBundle and OracleStack. Classical Exact is the reproducible reference emulator. Grover Emulated uses software statevector evolution, weighted phase marking, adaptive Grover depth and the same rotation/stabilization boundary. It is not a native-QPU or quantum-advantage claim.</p>'+
 '<div class="substrateGrid">'+
 '<div class="substrateCard"><h4>CLASSICAL EXACT</h4><strong>'+escapeLegal(exact.syntract_id||core.canonical_final_syntract||core.syntract_id||'—')+'</strong><span>'+escapeLegal(exact.state_count??core.candidate_state_count??'—')+' exact candidate states · entropy '+escapeLegal(Number(exact.entropy??core.entropy??0).toFixed(3))+' · oracle agreement '+escapeLegal(Number(exact.oracle_agreement??core.oracle_agreement??0).toFixed(3))+'</span></div>'+
 '<div class="substrateCard grover"><h4>GROVER · STATEVECTOR EMULATED</h4><strong>'+escapeLegal(grover.syntract_id||grover.status||'—')+'</strong><span>Status: '+escapeLegal(grover.status||'—')+' · selected m*: '+escapeLegal(depthText)+'</span></div>'+
 '</div>'+
 '<div class="fullStats">'+fqPill('same bundle',fqBool(dual.same_base_bundle))+fqPill('same OracleStack',fqBool(dual.same_oracle_stack))+fqPill('TV distance',cmp.total_variation_distance!==undefined?Number(cmp.total_variation_distance).toFixed(4):'—')+fqPill('same top state',fqBool(cmp.same_top_state))+fqPill('native QPU',fqBool(core.native_qpu))+fqPill('quantum advantage claim',fqBool(core.quantum_advantage_claim))+'</div>';

 const evidenceBlock=document.createElement('div');evidenceBlock.className='evidenceList';
 let evidenceText='No probabilistic case evidence supplied.';
 if((evidence.attached||[]).length){evidenceText=(evidence.attached||[]).map(row=>row.term+' @ '+Number(row.confidence).toFixed(2)+(row.polarity===false?' against':' for')).join(' · ')}
 evidenceBlock.innerHTML='<div class="fullMini"><b>Probabilistic evidence</b><span>'+escapeLegal(evidenceText)+'</span><span>Input '+escapeLegal(evidence.input_count??0)+' · attached '+escapeLegal(evidence.attached_count??0)+' · inactive '+escapeLegal(evidence.inactive_count??0)+'. These values are oracle pressure, not calibrated court-outcome probabilities.</span></div>'+
 '<div class="fullMini"><b>Scaling / decomposition</b><span>Full room '+escapeLegal(scaling.full_state_count??core.candidate_state_count??'—')+' states · max partition '+escapeLegal(scaling.max_states_per_partition??grover.max_states??'—')+' · components '+escapeLegal((scaling.components||[]).length||'—')+'.</span><span>Monolithic Grover available: '+escapeLegal(fqBool(scaling.monolithic_grover_available))+'. Exact separable parallel partitioning: '+escapeLegal(fqBool(scaling.exact_parallel_partitioning_available))+'. Coupled oversized components are not fake-chunked.</span></div>';
 wrap.appendChild(evidenceBlock);
 wrap.innerHTML+='<div class="fullBoundary"><strong>Interpretation:</strong> a near-100% marginal means the represented QCDS room has concentrated strongly on that proposition under the supplied law, facts, evidence and oracle semantics. It is not automatically a calibrated probability of how a court will rule. Classical Exact and Grover Emulated are intentionally shown side by side so substrate effects stay inspectable.</div>';
 return wrap;
}
renderLegalResult=function(result,title){
 _renderLegalResultBeforeFullQCDS(result,title);
 const root=document.getElementById('legalResult');if(!root)return;
 root.appendChild(fullQCDSPanel(result.qcds_core||{}));
};
</script>
'''


def living_robot_legal_full_qcds_html(*, static_mode: bool = False) -> str:
    html = _direct_html(static_mode=static_mode)
    if "</style>" not in html or "</body>" not in html:
        raise RuntimeError("direct legal QCDS markup changed; full-QCDS surface cannot attach safely")
    html = html.replace("</style>", _CSS + "\n</style>", 1)
    html = html.replace("</body>", _SCRIPT + "\n</body>", 1)
    return html


def export_static(path: str | Path) -> Path:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(living_robot_legal_full_qcds_html(static_mode=True), encoding="utf-8")
    return target


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Export Living Logical Robot with full dual-substrate Swedish legal QCDS UI.")
    parser.add_argument("--export", required=True, help="Output HTML path")
    args = parser.parse_args(argv)
    export_static(args.export)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
