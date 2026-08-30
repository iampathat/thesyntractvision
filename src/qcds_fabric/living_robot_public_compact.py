from __future__ import annotations

import argparse
import re
from pathlib import Path
from typing import Sequence

from .living_robot_legal_full_qcds import living_robot_legal_full_qcds_html as _full_html


_BUILD = "45"

_CSS = r'''
.publicBuildMark{font-size:7px;letter-spacing:.14em;text-transform:uppercase;color:#91aabb;border:1px solid #29495d;background:#091a27;border-radius:999px;padding:5px 7px;white-space:nowrap}.publicCompactBar{max-width:1800px;margin:10px auto 0;padding:0 14px}.publicCompactInner{display:flex;align-items:center;gap:9px;flex-wrap:wrap;border:1px solid #31536b;background:linear-gradient(135deg,#091925,#0a2025);border-radius:13px;padding:9px 10px;box-shadow:0 10px 35px #0003}.publicCompactLead{flex:1;min-width:260px}.publicCompactLead b{display:block;font-size:9px;color:#e6f5fc}.publicCompactLead span{display:block;font-size:7.5px;line-height:1.4;color:#809dad;margin-top:2px}.publicCompactActions{display:flex;gap:6px;flex-wrap:wrap}.publicCompactActions button{padding:7px 9px;font-size:7px}.publicCompactActions button.active{border-color:#82e5ac;background:#143226;color:#d9f8e4}.publicCapabilityStrip{max-width:1800px;margin:7px auto 0;padding:0 14px;display:flex;gap:6px;flex-wrap:wrap}.publicCapability{border:1px solid #27485b;background:#071722;border-radius:999px;padding:5px 8px;font-size:7px;color:#86a4b5}.publicCapability strong{color:#d9edf8}.publicCapability.quantum{border-color:#5c4f78;background:#100c1b;color:#ae9fc7}.publicCapability.swarm{border-color:#38634b;background:#071b13;color:#8eb49a}
/* Public navigation is view switching, not anchor navigation. Only one main surface participates in layout. */
body.publicCompact:not(.publicViewAdvanced)>.hero,body.publicCompact:not(.publicViewAdvanced)>.layout,body.publicCompact:not(.publicViewAdvanced)>.learningMoment,body.publicCompact:not(.publicViewAdvanced)>.understandBuild,body.publicCompact:not(.publicViewAdvanced)>.domainLab,body.publicCompact:not(.publicViewAdvanced)>.spaceBuilderWrap,body.publicCompact:not(.publicViewAdvanced)>.sessionSandbox{display:none!important}
body.publicCompact:not(.publicViewQcds) #try-logical-robot{display:none!important}body.publicCompact:not(.publicViewLegal) #swedish-legal-robot{display:none!important}
body.publicCompact.publicViewAdvanced #try-logical-robot,body.publicCompact.publicViewAdvanced #swedish-legal-robot{display:none!important}
body.publicCompact.publicViewAdvanced>.hero{display:block!important}body.publicCompact.publicViewAdvanced>.layout{display:grid!important}body.publicCompact.publicViewAdvanced>.learningMoment,body.publicCompact.publicViewAdvanced>.understandBuild,body.publicCompact.publicViewAdvanced>.domainLab,body.publicCompact.publicViewAdvanced>.spaceBuilderWrap,body.publicCompact.publicViewAdvanced>.sessionSandbox{display:block!important}
body.publicCompact:not(.publicLegalDetailsOpen) #swedish-legal-robot .legalExplain,body.publicCompact:not(.publicLegalDetailsOpen) #swedish-legal-robot .legalHow{display:none!important}body.publicCompact:not(.publicAllLegalCases) #swedish-legal-robot .legalCase:nth-child(n+7){display:none!important}.publicLegalControls{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.publicLegalControls button{padding:7px 9px;font-size:7px}.publicCompact .legalLab{margin-top:10px}.publicCompact .invite{margin-top:10px}.publicCompact .legalHead h3{font-size:22px}.publicCompact .legalCase{min-height:112px}.publicCompact .legalInner{padding:16px}.publicCompact .inviteInner{padding:18px}.publicCompact .seed{min-height:128px}
@media(max-width:700px){.publicCompactBar,.publicCapabilityStrip{padding:0 8px}.publicCompactInner{align-items:flex-start}.publicCompactActions{width:100%}.publicCompactActions button{flex:1}.publicBuildMark{order:3}.publicCompact .legalHead h3{font-size:19px}}
'''

_TOP = f'''
<section class="publicCompactBar" id="public-overview">
  <div class="publicCompactInner">
    <span class="publicBuildMark">BUILD {_BUILD}</span>
    <div class="publicCompactLead"><b>ONE QCDS · MULTIPLE ORACLE MANIFESTATIONS</b><span>Choose one view. QCDS and the oracle architecture stay the same underneath.</span></div>
    <div class="publicCompactActions">
      <button type="button" data-public-view="qcds" class="active" onclick="publicSelectView('qcds')">TRY QCDS</button>
      <button type="button" data-public-view="legal" onclick="publicSelectView('legal')">LEGAL ROBOT</button>
      <button type="button" onclick="publicToggleLegalDetails()">LEGAL DETAILS</button>
      <button type="button" onclick="publicToggleCases()">ALL CASES</button>
      <button type="button" data-public-view="advanced" onclick="publicSelectView('advanced')">ADVANCED</button>
    </div>
  </div>
</section>
<div class="publicCapabilityStrip">
  <span class="publicCapability"><strong>Browser</strong> · 18 live emulation dimensions</span>
  <span class="publicCapability"><strong>MacBook</strong> · 20</span>
  <span class="publicCapability"><strong>Central</strong> · 22</span>
  <span class="publicCapability quantum"><strong>Quantum Full Space</strong> · no semantic projection</span>
  <span class="publicCapability swarm"><strong>Oracle spaces</strong> · session / external / central transfer</span>
  <span class="publicCapability swarm"><strong>Swarm</strong> · QCDS uncertainty → oracle re-entry</span>
  <span class="publicCapability swarm"><strong>Central fabric</strong> · parallel / sequential / hybrid</span>
</div>
'''

_SCRIPT = r'''
<script>
const PUBLIC_VIEW_CLASSES=['publicViewQcds','publicViewLegal','publicViewAdvanced'];
function publicSelectView(view){
  const cls=view==='legal'?'publicViewLegal':view==='advanced'?'publicViewAdvanced':'publicViewQcds';
  PUBLIC_VIEW_CLASSES.forEach(name=>document.body.classList.remove(name));
  document.body.classList.add(cls);
  document.querySelectorAll('[data-public-view]').forEach(btn=>btn.classList.toggle('active',btn.dataset.publicView===view));
  window.scrollTo({top:0,left:0,behavior:'auto'});
}
function publicToggleLegalDetails(){document.body.classList.toggle('publicLegalDetailsOpen');publicSelectView('legal')}
function publicToggleCases(){document.body.classList.toggle('publicAllLegalCases');publicSelectView('legal')}
window.addEventListener('DOMContentLoaded',()=>{
 const head=document.querySelector('#swedish-legal-robot .legalHead>div');
 if(head&&!head.querySelector('.publicLegalControls')){
   const controls=document.createElement('div');controls.className='publicLegalControls';
   controls.innerHTML='<button type="button" onclick="publicToggleLegalDetails()">HOW IT WORKS</button><button type="button" onclick="publicToggleCases()">SHOW / HIDE ALL CASES</button>';
   head.appendChild(controls);
 }
 publicSelectView('qcds');
});
/* The old quick-start button now opens an explicit Advanced view instead of navigating down a long page. */
function openAdvancedLab(){
 publicSelectView('advanced');
 if(typeof openSpaceBuilder==='function')openSpaceBuilder();
}
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
    if '<body>' not in html or '</style>' not in html or '</header>' not in html or '</body>' not in html:
        raise RuntimeError('public Logical Robot markup changed; compact surface cannot attach safely')
    html = html.replace('<body>', '<body class="publicCompact publicViewQcds">', 1)
    html = html.replace('</style>', _CSS + '\n</style>', 1)
    html = html.replace('</header>', '</header>\n' + _TOP, 1)
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
