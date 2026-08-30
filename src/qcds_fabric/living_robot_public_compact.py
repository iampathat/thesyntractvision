from __future__ import annotations

import argparse
import re
from pathlib import Path
from typing import Sequence

from .living_robot_legal_full_qcds import living_robot_legal_full_qcds_html as _full_html


_BUILD = "47"

_CSS = r'''
.publicBuildMark{font-size:7px;letter-spacing:.14em;text-transform:uppercase;color:#91aabb;border:1px solid #29495d;background:#091a27;border-radius:999px;padding:5px 7px;white-space:nowrap}.publicCompactBar{max-width:1800px;margin:10px auto 0;padding:0 14px}.publicCompactInner{display:flex;align-items:center;gap:9px;flex-wrap:wrap;border:1px solid #31536b;background:linear-gradient(135deg,#091925,#0a2025);border-radius:13px;padding:9px 10px;box-shadow:0 10px 35px #0003}.publicCompactLead{flex:1;min-width:260px}.publicCompactLead b{display:block;font-size:9px;color:#e6f5fc}.publicCompactLead span{display:block;font-size:7.5px;line-height:1.4;color:#809dad;margin-top:2px}.publicCompactActions,.publicLegalNav{display:flex;gap:6px;flex-wrap:wrap}.publicCompactActions button,.publicLegalNav button{padding:7px 9px;font-size:7px}.publicCompactActions button.active,.publicLegalNav button.active{border-color:#82e5ac;background:#143226;color:#d9f8e4}.publicCapabilityStrip{max-width:1800px;margin:7px auto 0;padding:0 14px;display:flex;gap:6px;flex-wrap:wrap}.publicCapability{border:1px solid #27485b;background:#071722;border-radius:999px;padding:5px 8px;font-size:7px;color:#86a4b5}.publicCapability strong{color:#d9edf8}.publicCapability.quantum{border-color:#5c4f78;background:#100c1b;color:#ae9fc7}.publicCapability.swarm{border-color:#38634b;background:#071b13;color:#8eb49a}
/* Main public navigation is real view switching. */
body.publicCompact:not(.publicViewAdvanced)>.hero,body.publicCompact:not(.publicViewAdvanced)>.layout,body.publicCompact:not(.publicViewAdvanced)>.learningMoment,body.publicCompact:not(.publicViewAdvanced)>.understandBuild,body.publicCompact:not(.publicViewAdvanced)>.domainLab,body.publicCompact:not(.publicViewAdvanced)>.spaceBuilderWrap,body.publicCompact:not(.publicViewAdvanced)>.sessionSandbox{display:none!important}
body.publicCompact:not(.publicViewQcds) #try-logical-robot{display:none!important}
body.publicCompact:not(.publicViewLegal) #public-legal-question,body.publicCompact:not(.publicViewLegal) #swedish-legal-robot{display:none!important}
body.publicCompact.publicViewAdvanced #try-logical-robot,body.publicCompact.publicViewAdvanced #public-legal-question,body.publicCompact.publicViewAdvanced #swedish-legal-robot{display:none!important}
body.publicCompact.publicViewAdvanced>.hero{display:block!important}body.publicCompact.publicViewAdvanced>.layout{display:grid!important}body.publicCompact.publicViewAdvanced>.learningMoment,body.publicCompact.publicViewAdvanced>.understandBuild,body.publicCompact.publicViewAdvanced>.domainLab,body.publicCompact.publicViewAdvanced>.spaceBuilderWrap,body.publicCompact.publicViewAdvanced>.sessionSandbox{display:block!important}
/* Question-first Legal Robot. */
.publicLegalQuestion{max-width:1800px;margin:10px auto 0;padding:0 14px}.publicLegalQuestionInner{border:1px solid #3b5d72;background:linear-gradient(150deg,#0a1c29,#07161f);border-radius:16px;padding:15px;box-shadow:0 14px 40px #0003}.publicLegalQuestionHead{display:flex;gap:12px;align-items:flex-start;justify-content:space-between}.publicLegalQuestionHead h2{font-size:20px;margin:3px 0 5px}.publicLegalQuestionHead p{font-size:8px;line-height:1.55;color:#8ca7b6;max-width:1050px;margin:0}.publicLegalKicker{font-size:7px;letter-spacing:.14em;color:#9cc9ff}.publicLegalNav{margin-top:10px}.publicLegalQuestionBody{margin-top:12px;display:grid;grid-template-columns:1.5fr .8fr;gap:9px}.publicLegalField{display:flex;flex-direction:column;gap:5px}.publicLegalField label{font-size:7px;text-transform:uppercase;letter-spacing:.11em;color:#8db0c2}.publicLegalField textarea,.publicLegalField select{width:100%;box-sizing:border-box;border:1px solid #31536b;background:#06131d;color:#e8f5fb;border-radius:9px;padding:10px;font:inherit;font-size:9px;outline:none}.publicLegalField textarea{min-height:86px;resize:vertical;line-height:1.45}.publicLegalRun{display:flex;gap:7px;flex-wrap:wrap;align-items:center;margin-top:9px}.publicLegalRun button{padding:9px 11px;font-size:8px}.publicLegalRun .primary{background:#d9f8e4;color:#082117;border-color:#d9f8e4}.publicLegalFlow{grid-column:1/-1;border-top:1px solid #1f3a4b;padding-top:9px;font-size:7.5px;color:#7494a5;line-height:1.55}.publicLegalFlow strong{color:#dbeef8}.publicLegalNote{font-size:7px;color:#6f8d9e;line-height:1.45;margin-top:5px}
body.publicCompact.publicLegalExamples #public-legal-question .publicLegalQuestionBody,body.publicCompact.publicLegalDetails #public-legal-question .publicLegalQuestionBody{display:none!important}
body.publicCompact.publicLegalAsk #swedish-legal-robot .legalExplain,body.publicCompact.publicLegalAsk #swedish-legal-robot .legalHow,body.publicCompact.publicLegalAsk #swedish-legal-robot .legalCaseTitle,body.publicCompact.publicLegalAsk #swedish-legal-robot .legalCaseGrid{display:none!important}
body.publicCompact.publicLegalExamples #swedish-legal-robot .legalExplain,body.publicCompact.publicLegalExamples #swedish-legal-robot .legalHow,body.publicCompact.publicLegalExamples #swedish-legal-robot .legalResult{display:none!important}
body.publicCompact.publicLegalDetails #swedish-legal-robot .legalCaseTitle,body.publicCompact.publicLegalDetails #swedish-legal-robot .legalCaseGrid,body.publicCompact.publicLegalDetails #swedish-legal-robot .legalStatus,body.publicCompact.publicLegalDetails #swedish-legal-robot .legalResult{display:none!important}
body.publicCompact.publicLegalAsk:not(.publicShowRunDetails) #swedish-legal-robot .legalResult .legalStage{display:none!important}
.publicCompact .legalLab{margin-top:10px}.publicCompact .legalHead h3{font-size:20px}.publicCompact .legalCaseGrid{grid-template-columns:repeat(4,minmax(0,1fr))}.publicCompact .legalCase{min-height:105px}.publicCompact .legalInner{padding:15px}.publicCompact .invite{margin-top:10px}.publicCompact .inviteInner{padding:18px}
@media(max-width:1100px){.publicCompact .legalCaseGrid{grid-template-columns:repeat(3,1fr)}}@media(max-width:800px){.publicLegalQuestionBody{grid-template-columns:1fr}.publicCompact .legalCaseGrid{grid-template-columns:repeat(2,1fr)}}@media(max-width:700px){.publicCompactBar,.publicCapabilityStrip,.publicLegalQuestion{padding:0 8px}.publicCompactInner,.publicLegalQuestionHead{align-items:flex-start}.publicCompactActions{width:100%}.publicCompactActions button{flex:1}.publicBuildMark{order:3}.publicCompact .legalHead h3{font-size:18px}}@media(max-width:520px){.publicCompact .legalCaseGrid{grid-template-columns:1fr}}
'''

_TOP = f'''
<section class="publicCompactBar" id="public-overview">
  <div class="publicCompactInner">
    <span class="publicBuildMark">BUILD {_BUILD}</span>
    <div class="publicCompactLead"><b>ONE QCDS · QUESTION → LOGICAL SPACE → ORACLE FILTERS</b><span>Choose a work surface. The canonical QCDS four-phase core stays unchanged underneath.</span></div>
    <div class="publicCompactActions">
      <button type="button" data-public-view="qcds" class="active" onclick="publicSelectView('qcds')">TRY QCDS</button>
      <button type="button" data-public-view="legal" onclick="publicSelectView('legal')">LEGAL ROBOT</button>
      <button type="button" data-public-view="advanced" onclick="publicSelectView('advanced')">ADVANCED</button>
    </div>
  </div>
</section>
<div class="publicCapabilityStrip">
  <span class="publicCapability"><strong>Browser</strong> · resource-bounded emulation</span>
  <span class="publicCapability"><strong>MacBook</strong> · larger local emulation</span>
  <span class="publicCapability"><strong>Central</strong> · high-capacity emulation</span>
  <span class="publicCapability quantum"><strong>Quantum Full Space</strong> · no semantic projection</span>
  <span class="publicCapability swarm"><strong>Oracle spaces</strong> · session / external / central transfer</span>
  <span class="publicCapability swarm"><strong>Swarm</strong> · QCDS uncertainty → oracle re-entry</span>
  <span class="publicCapability swarm"><strong>Central fabric</strong> · parallel / sequential / hybrid</span>
</div>
'''

_LEGAL_QUESTION = r'''
<section class="publicLegalQuestion" id="public-legal-question">
  <div class="publicLegalQuestionInner">
    <div class="publicLegalQuestionHead">
      <div>
        <div class="publicLegalKicker">LEGAL LOGICAL ROBOT · QUESTION INGRESS</div>
        <h2>Ask one question. Let the translator form the logical problem.</h2>
        <p>The human question does not contain the answer. The bounded translator forms issue/scope terms and the represented Logical Space. Statutory, praxis and evidence oracles then filter that space before the unchanged four-phase QCDS core produces a TruthDistribution and Syntract.</p>
      </div>
    </div>
    <div class="publicLegalNav">
      <button type="button" data-legal-mode="ask" class="active" onclick="publicSelectLegalMode('ask')">ASK</button>
      <button type="button" data-legal-mode="examples" onclick="publicSelectLegalMode('examples')">EXAMPLES</button>
      <button type="button" data-legal-mode="details" onclick="publicSelectLegalMode('details')">HOW IT WORKS</button>
    </div>
    <div class="publicLegalQuestionBody">
      <div class="publicLegalField">
        <label for="publicLegalQuestionText">Question</label>
        <textarea id="publicLegalQuestionText"></textarea>
      </div>
      <div class="publicLegalField">
        <label for="publicLegalContext">Example material / facts</label>
        <select id="publicLegalContext" onchange="publicSetLegalContext(this.value)">
          <option value="jb_unauthorized_sublet_forfeiture_2026.json">Unauthorized second-hand sublet</option>
          <option value="jb_late_rent_recovery_2026.json">Late rent + recovery</option>
          <option value="jb_extension_renovation_balance_2026.json">Major renovation + security of tenure</option>
          <option value="jb_second_hand_permission_2026.json">Permission to sublet</option>
          <option value="material_defect_praxis_2026.json">Material defect + praxis</option>
          <option value="jb_excess_second_hand_rent_2026.json">Excess second-hand rent</option>
          <option value="new_private_let_2026.json">New private letting · regime</option>
          <option value="legacy_private_let_2026.json">Legacy private letting · transition</option>
        </select>
        <div class="publicLegalNote">The browser demo uses bounded example facts so the question-to-oracle path is inspectable. Unknown language is preserved as unresolved; the translator is not allowed to invent an answer.</div>
      </div>
      <div class="publicLegalFlow"><strong>Execution:</strong> question + material/facts → translator → Logical Space → oracle filters / emulated oracle filters → 1 Condition Formation → 2 Conditional Evolution → 3 Recursive Inference → 4 Truth Alignment → TruthDistribution → Syntract.</div>
      <div class="publicLegalRun">
        <button type="button" class="primary" id="publicLegalRun" onclick="publicRunLegalQuestion()">RUN QUESTION →</button>
        <button type="button" onclick="publicToggleRunDetails()">SHOW / HIDE TECHNICAL RUN</button>
      </div>
    </div>
  </div>
</section>
'''

_SCRIPT = r'''
<script>
const PUBLIC_VIEW_CLASSES=['publicViewQcds','publicViewLegal','publicViewAdvanced'];
const PUBLIC_LEGAL_CLASSES=['publicLegalAsk','publicLegalExamples','publicLegalDetails'];
const PUBLIC_LEGAL_QUESTIONS={
 'new_private_let_2026.json':'Which legal regime governs this new private residential letting?',
 'legacy_private_let_2026.json':'Which legal regime governs this private residential letting contract made before the 2026 reform?',
 'jordabalk_12_fallback_2026.json':'Which law governs this tenancy when the special private-letting regime does not apply?',
 'material_defect_praxis_2026.json':'What legal consequences follow from the represented material defect?',
 'jb_unauthorized_sublet_forfeiture_2026.json':'Can the tenancy be forfeited because of this unauthorized second-hand sublet?',
 'jb_late_rent_recovery_2026.json':'Can late rent forfeit the tenancy, and can the represented recovery rule restore it?',
 'jb_extension_renovation_balance_2026.json':'Can the tenant retain or extend the tenancy despite the planned major renovation?',
 'jb_excess_second_hand_rent_2026.json':'Is the second-hand rent excessive and can repayment be required?',
 'jb_outsider_reasonableness_2026.json':'Can outsider use justify forfeiture in this represented case?',
 'jb_second_hand_permission_2026.json':'Can the tenant obtain permission for this second-hand sublet?',
 'jb_disturbance_after_warning_2026.json':'Can the tenancy be forfeited because of the represented disturbance after warning?',
 'jb_access_refusal_rectified_2026.json':'Can refusal of required access justify forfeiture after the breach was rectified?',
 'jb_transfer_unreasonable_refusal_2026.json':'Was the landlord entitled to refuse the requested transfer?',
 'jb_apartment_exchange_2026.json':'Can the tenant obtain permission for this apartment exchange?',
 'jb_damage_evidence_2026.json':'Does the represented damage establish a legal consequence without inventing negligence?',
 'jb_probabilistic_sublet_evidence_2026.json':'Does the evidence support treating the use as an unauthorized independent second-hand sublet?'
};
function publicSelectView(view){
 PUBLIC_VIEW_CLASSES.forEach(name=>document.body.classList.remove(name));
 if(view==='advanced')document.body.classList.add('publicViewAdvanced');
 else if(view==='legal'){document.body.classList.add('publicViewLegal');publicSelectLegalMode('ask',false)}
 else{view='qcds';document.body.classList.add('publicViewQcds')}
 document.querySelectorAll('[data-public-view]').forEach(btn=>btn.classList.toggle('active',btn.dataset.publicView===view));
 window.scrollTo({top:0,left:0,behavior:'auto'});
}
function publicSelectLegalMode(mode,ensureView=true){
 if(ensureView&&!document.body.classList.contains('publicViewLegal'))publicSelectView('legal');
 PUBLIC_LEGAL_CLASSES.forEach(name=>document.body.classList.remove(name));
 const cls=mode==='examples'?'publicLegalExamples':mode==='details'?'publicLegalDetails':'publicLegalAsk';
 document.body.classList.add(cls);
 document.querySelectorAll('[data-legal-mode]').forEach(btn=>btn.classList.toggle('active',btn.dataset.legalMode===mode));
}
function publicSetLegalContext(fileName){
 const input=document.getElementById('publicLegalQuestionText');
 if(input)input.value=PUBLIC_LEGAL_QUESTIONS[fileName]||'';
}
function publicToggleRunDetails(){document.body.classList.toggle('publicShowRunDetails')}
async function publicExecuteLegalCase(fileName,question){
 const title=(typeof LEGAL_CASE_TITLES!=='undefined'&&LEGAL_CASE_TITLES[fileName])||fileName;
 legalStatus('Loading example material and translating the question into the legal Logical Space…');
 try{
   const response=await fetch('./legal/cases/'+encodeURIComponent(fileName),{cache:'no-store'});
   if(!response.ok)throw new Error('Could not load legal case: HTTP '+response.status);
   const payload=await response.json();payload.question=String(question||'').trim();
   const result=await legalWorkerRun(payload);
   renderLegalResult(result,title);
   const ingress=result.question_ingress||{};
   const scope=(ingress.logical_scope_terms||[]).join(', ')||'bounded structured scope';
   legalStatus('Complete · translator scope: '+scope+' · oracle filters → QCDS → Syntract.','good');
   publicSelectLegalMode('ask');
   return result;
 }catch(e){legalStatus(e.message||String(e),'warn');throw e}
}
async function publicRunLegalQuestion(){
 const select=document.getElementById('publicLegalContext'),input=document.getElementById('publicLegalQuestionText');
 const fileName=select?select.value:'';const question=input?input.value.trim():'';
 if(!question){legalStatus('Write the question first. The translator cannot form a question it was not given.','warn');return}
 const button=document.getElementById('publicLegalRun');if(button)button.disabled=true;
 try{await publicExecuteLegalCase(fileName,question)}finally{if(button)button.disabled=false}
}
window.runLegalCase=async function(fileName){
 publicSelectView('legal');
 const question=PUBLIC_LEGAL_QUESTIONS[fileName]||'What follows from the represented legal facts?';
 const select=document.getElementById('publicLegalContext');if(select){const option=[...select.options].find(item=>item.value===fileName);if(option)select.value=fileName}
 const input=document.getElementById('publicLegalQuestionText');if(input)input.value=question;
 return publicExecuteLegalCase(fileName,question);
};
function openLegalRobot(){publicSelectView('legal')}
function openAdvancedLab(){publicSelectView('advanced');if(typeof openSpaceBuilder==='function')openSpaceBuilder()}
window.addEventListener('DOMContentLoaded',()=>{publicSetLegalContext('jb_unauthorized_sublet_forfeiture_2026.json');publicSelectView('qcds')});
</script>
'''


def _strip_visible_build_labels(html: str) -> str:
    """Remove historical build labels from rendered copy, never from JS/CSS identifiers."""
    pieces = re.split(r'(<(?:script|style)\b[^>]*>.*?</(?:script|style)>)', html, flags=re.IGNORECASE | re.DOTALL)
    for index in range(0, len(pieces), 2):
        pieces[index] = re.sub(r'\bBUILD\s+\d+(?:\s*[–-]\s*\d+)?\s*·\s*', '', pieces[index], flags=re.IGNORECASE)
        pieces[index] = pieces[index].replace('No physical QPU is connected in this build.', 'No physical QPU is connected.')
    return ''.join(pieces)


def living_robot_public_compact_html(*, static_mode: bool = False) -> str:
    html = _strip_visible_build_labels(_full_html(static_mode=static_mode))
    legal_marker = '<section class="legalLab" id="swedish-legal-robot">'
    if '<body>' not in html or '</style>' not in html or '</header>' not in html or '</body>' not in html or legal_marker not in html:
        raise RuntimeError('public Logical Robot markup changed; compact surface cannot attach safely')
    html = html.replace('<body>', '<body class="publicCompact publicViewQcds publicLegalAsk">', 1)
    html = html.replace('</style>', _CSS + '\n</style>', 1)
    html = html.replace('</header>', '</header>\n' + _TOP, 1)
    html = html.replace(legal_marker, _LEGAL_QUESTION + '\n' + legal_marker, 1)
    html = html.replace('</body>', _SCRIPT + '\n</body>', 1)
    return html


def export_static(path: str | Path) -> Path:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(living_robot_public_compact_html(static_mode=True), encoding='utf-8')
    return target


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description='Export the compact public Logical Robot / full-QCDS surface.')
    parser.add_argument('--export', required=True, help='Output HTML path')
    args = parser.parse_args(argv)
    export_static(args.export)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
