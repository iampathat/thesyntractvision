from __future__ import annotations

import argparse
from pathlib import Path
from typing import Sequence

from .living_robot_legal_qcds import living_robot_legal_qcds_html as _direct_html


_CSS = r'''
.fullQCDS{margin-top:10px;border:1px solid #5a6691;background:linear-gradient(160deg,#0a1025,#0a1725 55%,#07171a);border-radius:13px;padding:12px}.fullQCDSTitle{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}.fullQCDSTitle b{font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:#c5d1ff}.fullQCDSTitle span{font-size:7px;color:#8690b5}.substrateGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:9px}.substrateCard{border:1px solid #39466f;background:#080f20;border-radius:10px;padding:10px}.substrateCard h4{font-size:8px;letter-spacing:.09em;text-transform:uppercase;color:#cbd6ff;margin:0 0 7px}.substrateCard strong{display:block;font-size:10px;color:#e1e7ff;word-break:break-word}.substrateCard span{display:block;font-size:7px;color:#8d98bd;line-height:1.45;margin-top:4px}.substrateCard.grover{border-color:#3f6f68;background:#071a18}.substrateCard.grover h4{color:#bde9d8}.substrateCard.quantum{border-color:#6d5f8f;background:#120d20}.substrateCard.quantum h4{color:#dbc8ff}.fullStats{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.fullPill{border:1px solid #3b486f;border-radius:99px;padding:5px 8px;font-size:7px;color:#9ba6c8}.fullPill strong{color:#e1e7ff}.evidenceList,.scaleList{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px}.fullMini{border:1px solid #2e395b;background:#070d1a;border-radius:9px;padding:9px}.fullMini b{display:block;font-size:7px;color:#c6d0f0;text-transform:uppercase;letter-spacing:.08em}.fullMini span{display:block;font-size:7px;color:#8490ae;line-height:1.45;margin-top:4px}.fullBoundary{font-size:7px;color:#7885a4;line-height:1.5;margin-top:8px}@media(max-width:980px){.substrateGrid{grid-template-columns:1fr}.evidenceList,.scaleList{grid-template-columns:1fr}}
'''


_SCRIPT = r'''
<script>
const _renderLegalResultBeforeFullQCDS = renderLegalResult;
function fqPill(label,value){return '<span class="fullPill"><strong>'+escapeLegal(label)+':</strong> '+escapeLegal(value??'—')+'</span>'}
function fqBool(v){return v===true?'yes':v===false?'no':'—'}
function fullQCDSPanel(core){
 const modes=core.execution_modes||{};
 const dual=core.dual_substrate||{},exact=modes.classical_exact||dual.classical_exact||{},grover=modes.grover_emulated||dual.grover_emulated||{},quantum=modes.quantum_full_space||{};
 const qmanifest=quantum.full_universe_manifest||{};
 const cmp=grover.comparison_to_classical_exact||{};
 const evidence=core.probabilistic_evidence||{};
 const scaling=core.scaling||grover.scaling?.plan||{};
 const depths=grover.selected_grover_iterations||{};
 const depthText=Object.keys(depths).length?Object.entries(depths).slice(0,10).map(([k,v])=>k+'='+v).join(' · '):'none / not run';
 const wrap=document.createElement('div');wrap.className='fullQCDS';
 wrap.innerHTML='<div class="fullQCDSTitle"><b>7 · SAME QCDS · THREE EXECUTION MODES</b><span>classical reference · Grover emulation · full-space quantum target</span></div>'+
 '<p class="legalStageIntro">Classical Exact and Grover Emulated are resource-bounded software modes. They may receive a classically projected active room, but execute that room without silently deleting candidate states. Quantum Full Space is a separate native-QPU target contract: represented logical dimensions may not be removed merely to satisfy classical memory limits. No physical QPU is connected in this build.</p>'+
 '<div class="substrateGrid">'+
 '<div class="substrateCard"><h4>CLASSICAL EXACT</h4><strong>'+escapeLegal(exact.syntract_id||core.canonical_final_syntract||core.syntract_id||'—')+'</strong><span>'+escapeLegal(exact.state_count??core.candidate_state_count??'—')+' exact candidate states · resource-bounded Condition Formation allowed · active room itself remains exact.</span></div>'+
 '<div class="substrateCard grover"><h4>GROVER · STATEVECTOR EMULATED</h4><strong>'+escapeLegal(grover.syntract_id||grover.status||'—')+'</strong><span>Status: '+escapeLegal(grover.status||'—')+' · selected m*: '+escapeLegal(depthText)+' · software statevector bound may require exact separable decomposition.</span></div>'+
 '<div class="substrateCard quantum"><h4>QUANTUM FULL SPACE · TARGET</h4><strong>'+escapeLegal(quantum.status||'target_contract_only')+'</strong><span>Full target manifest: '+escapeLegal(quantum.full_universe_dimension_count??qmanifest.represented_dimension_count??'—')+' logical terms · '+escapeLegal(qmanifest.represented_rule_count??'—')+' rules · '+escapeLegal(qmanifest.represented_section_count??'—')+' sections · '+escapeLegal(qmanifest.represented_precedent_count??'—')+' precedents.</span><span>Semantic prefiltering allowed: '+escapeLegal(fqBool(quantum.semantic_projection_allowed))+'. Full represented universe required: '+escapeLegal(fqBool(quantum.requires_full_logical_universe))+'. Native QPU connected: '+escapeLegal(fqBool(quantum.native_qpu_connected))+'.</span></div>'+
 '</div>'+
 '<div class="fullStats">'+fqPill('same active bundle exact↔Grover',fqBool(dual.same_base_bundle))+fqPill('same OracleStack',fqBool(dual.same_oracle_stack))+fqPill('TV distance',cmp.total_variation_distance!==undefined?Number(cmp.total_variation_distance).toFixed(4):'—')+fqPill('same top state',fqBool(cmp.same_top_state))+fqPill('quantum full terms',quantum.full_universe_dimension_count??'—')+fqPill('active emulation width',quantum.active_emulation_dimension_count??core.logical_width??'—')+fqPill('quantum prefilter forbidden',fqBool(core.quantum_full_space_semantic_prefiltering_forbidden))+fqPill('native QPU',fqBool(core.native_qpu))+fqPill('quantum advantage claim',fqBool(core.quantum_advantage_claim))+'</div>';

 const evidenceBlock=document.createElement('div');evidenceBlock.className='evidenceList';
 let evidenceText='No probabilistic case evidence supplied.';
 if((evidence.attached||[]).length){evidenceText=(evidence.attached||[]).map(row=>row.term+' @ '+Number(row.confidence).toFixed(2)+(row.polarity===false?' against':' for')).join(' · ')}
 evidenceBlock.innerHTML='<div class="fullMini"><b>Probabilistic evidence</b><span>'+escapeLegal(evidenceText)+'</span><span>Input '+escapeLegal(evidence.input_count??0)+' · attached '+escapeLegal(evidence.attached_count??0)+' · inactive '+escapeLegal(evidence.inactive_count??0)+'. These values are oracle pressure, not calibrated court-outcome probabilities.</span></div>'+
 '<div class="fullMini"><b>Scaling / decomposition</b><span>Full active emulation room '+escapeLegal(scaling.full_state_count??core.candidate_state_count??'—')+' states · max partition '+escapeLegal(scaling.max_states_per_partition??grover.max_states??'—')+' · components '+escapeLegal((scaling.components||[]).length||'—')+'.</span><span>Emulation may use exact separable partitions. Quantum Full Space may only decompose through a semantics-preserving QCDS/Syntract operation over the complete represented universe; it may not discard dimensions for memory convenience.</span></div>';
 wrap.appendChild(evidenceBlock);
 wrap.innerHTML+='<div class="fullBoundary"><strong>Boundary:</strong> Classical projection is an emulator concession, not a QCDS quantum principle. In native quantum target mode the full represented logical universe remains represented and relevance is intended to emerge through Conditions, oracle interaction, amplitude evolution, recursive inference and Syntract binding. <strong>Interpretation:</strong> near-100% mass still describes concentration inside the represented QCDS universe, not automatically a calibrated court-outcome probability.</div>';
 return wrap;
}
renderLegalResult=function(result,title){
 _renderLegalResultBeforeFullQCDS(result,title);
 const root=document.getElementById('legalResult');if(!root)return;
 root.appendChild(fullQCDSPanel(result.qcds_core||{}));
};

window.addEventListener('DOMContentLoaded',()=>{
 const file='jb_probabilistic_sublet_evidence_2026.json';
 LEGAL_CASE_TITLES[file]='Disputed second-hand use · probabilistic evidence';
 const grid=document.querySelector('.legalCaseGrid');
 if(!grid||document.getElementById('probabilistic-legal-case'))return;
 const article=document.createElement('article');article.className='legalCase';article.id='probabilistic-legal-case';
 article.innerHTML='<span class="tag">12 KAP · PROBABILISTIC EVIDENCE</span><h4>Disputed independent use</h4><p>The statutory setting is known, but whether the use is truly independent and whether a valid excuse exists are represented as 0.74 / 0.85 evidence pressures. Watch QCDS keep them live instead of silently turning them into facts.</p><button onclick="runLegalCase(\''+file+'\')">RUN CASE →</button>';
 grid.appendChild(article);
});
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
    parser = argparse.ArgumentParser(description="Export Living Logical Robot with classical, Grover-emulated and full-space quantum-target Swedish legal QCDS modes.")
    parser.add_argument("--export", required=True, help="Output HTML path")
    args = parser.parse_args(argv)
    export_static(args.export)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
