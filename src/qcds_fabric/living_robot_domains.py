from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Sequence

from .domain_lab import builtin_domain_packs
from .living_robot_clarity import living_robot_clarity_html


_CSS = r'''
/* BUILD 33: Domain Lab is a manifestation/entry layer. It does not create truth rules. */
.domainLab{max-width:1800px;margin:12px auto 0;padding:0 14px}.domainShell{border:1px solid #294e63;background:linear-gradient(145deg,#091b28,#08141f 72%);border-radius:18px;overflow:hidden;box-shadow:0 18px 55px #0004}.domainTop{display:flex;gap:18px;align-items:flex-start;padding:18px 19px;border-bottom:1px solid #1f3a4c}.domainTopText{flex:1}.domainKicker{font-size:8px;letter-spacing:.18em;text-transform:uppercase;color:#83aabd}.domainTop h2{font-size:25px;margin:5px 0 6px}.domainTop p{font-size:10px;line-height:1.55;color:#93adbd;margin:0;max-width:980px}.domainTruth{flex:0 0 260px;border:1px solid #32634a;background:#0b251c;border-radius:11px;padding:10px}.domainTruth b{display:block;color:#b8f6cd;font-size:9px}.domainTruth span{display:block;color:#88a89a;font-size:8px;line-height:1.45;margin-top:4px}.domainGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#1b3546}.domainCard{background:#091925;padding:15px;min-height:285px;display:flex;flex-direction:column}.domainCard:hover{background:#0b1e2c}.domainMeta{display:flex;justify-content:space-between;gap:8px;align-items:center}.domainMode{font-size:7px;text-transform:uppercase;letter-spacing:.12em;color:#9aafbd;border:1px solid #29485c;border-radius:999px;padding:5px 7px}.domainCard h3{font-size:18px;margin:9px 0 4px}.domainTag{font-size:9px;color:#7fc8eb;line-height:1.4}.domainAudience{font-size:8px;color:#7895a8;margin-top:6px}.domainCard p{font-size:9px;color:#8fa9b9;line-height:1.5;margin:10px 0}.domainChallenge{border-left:3px solid #c7a9ff;background:#151a2b;border-radius:8px;padding:8px 9px;margin-top:auto}.domainChallenge label,.domainLearning label{display:block;font-size:7px;text-transform:uppercase;letter-spacing:.12em;color:#9886bc}.domainChallenge span,.domainLearning span{display:block;font-size:8px;line-height:1.45;color:#c5b9db;margin-top:4px}.domainLearning{border-left:3px solid #79e5a7;background:#0c221b;border-radius:8px;padding:8px 9px;margin-top:7px}.domainLearning label{color:#79aa8b}.domainLearning span{color:#a8c8b4}.domainStats{display:flex;gap:12px;margin:10px 0 8px;color:#86a0b0;font-size:8px}.domainStats strong{color:#e7f5fd;font-size:13px;margin-right:3px}.domainActions{display:flex;gap:6px;flex-wrap:wrap}.domainActions button,.domainActions a{font-size:8px;padding:8px 9px;text-decoration:none;border:1px solid #31536b;background:#102638;color:#edf8ff;border-radius:9px;font-weight:720}.domainActions button.primary{background:#d9f8e4;color:#082117;border-color:#d9f8e4}.domainActions button:disabled{opacity:.5}.domainResult{margin-top:8px;min-height:28px;font-size:8px;line-height:1.45;color:#849ead}.domainResult.good{color:#a9edc0}.domainResult.warn{color:#efc986}.domainBottom{display:flex;gap:14px;align-items:center;padding:14px 18px;border-top:1px solid #1c3547;background:#081722}.domainBottom div{flex:1}.domainBottom b{font-size:11px}.domainBottom p{font-size:8px;line-height:1.45;color:#839dad;margin:3px 0 0}.domainBottom a{display:inline-block;text-decoration:none;border:1px solid #4a6e84;background:#10283a;color:#eef8ff;border-radius:9px;padding:9px 11px;font-size:9px;font-weight:750}@media(max-width:1150px){.domainGrid{grid-template-columns:repeat(2,1fr)}}@media(max-width:740px){.domainLab{padding:0 8px;margin-top:8px}.domainTop{flex-direction:column}.domainTruth{flex:auto;width:100%}.domainGrid{grid-template-columns:1fr}.domainBottom{align-items:flex-start;flex-direction:column}}
'''

_SECTION = r'''
<section class="domainLab" id="domain-lab">
  <div class="domainShell">
    <div class="domainTop">
      <div class="domainTopText"><div class="domainKicker">Same Logical Robot · different expert spaces</div><h2>EXPLORE A LOGICAL SPACE</h2><p>Bring a domain, not a belief in the vision. Each starter lab is a small isolated logical universe with observations but zero solution rules. The question is whether the same Logical Robot can leave that space able to resolve something it could not resolve when it entered.</p></div>
      <div class="domainTruth"><b>THE EXPERIMENTAL CONTRACT</b><span>Starter observations are synthetic or explicitly declared. Starting a lab does not modify Reality. A domain expert should attack the challenge, the observations and the falsification criteria.</span></div>
    </div>
    <div class="domainGrid" id="domainGrid"></div>
    <div class="domainBottom"><div><b>YOUR DOMAIN IS THE INTERESTING ONE.</b><p>A useful contribution can be a better challenge, a new observation body, stronger falsification, a new domain pack or evidence that one of these labs is misleading.</p></div><a href="https://github.com/iampathat/thesyntractvision/blob/main/DOMAIN_LABS.md" target="_blank" rel="noopener">BUILD YOUR OWN LOGICAL SPACE ↗</a></div>
  </div>
</section>
'''

_SCRIPT_TEMPLATE = r'''
<script>
const BUILD33_STATIC_MODE=__STATIC_MODE__;
const BUILD33_DOMAINS=__DOMAIN_JSON__;
function dEsc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function domainCard(pack){
 const live=!BUILD33_STATIC_MODE;
 return '<article class="domainCard" data-domain="'+dEsc(pack.domain_id)+'"><div class="domainMeta"><span class="domainMode">'+dEsc(pack.universe_mode)+' starter universe</span><span class="domainMode">0 solution rules</span></div><h3>'+dEsc(pack.title)+'</h3><div class="domainTag">'+dEsc(pack.tagline)+'</div><div class="domainAudience">FOR '+dEsc(pack.audience)+'</div><p>'+dEsc(pack.description)+'</p><div class="domainChallenge"><label>Challenge</label><span>'+dEsc(pack.challenge)+'</span></div><div class="domainLearning"><label>What would count as learning?</label><span>'+dEsc(pack.learning_target)+'</span></div><div class="domainStats"><span><strong>'+dEsc(pack.starter_observation_count)+'</strong> starter observations</span><span><strong>0</strong> supplied rules</span></div><div class="domainActions"><button class="primary" '+(live?'':'disabled')+' onclick="startDomainLab(\''+dEsc(pack.domain_id)+'\')">START ISOLATED SPACE</button><button '+(live?'':'disabled')+' onclick="exploreDomain(\''+dEsc(pack.domain_id)+'\')">EXPLORE WITH ROBOT</button></div><div class="domainResult" id="domain-result-'+dEsc(pack.domain_id)+'">'+(live?'Ready.':'Open a live Codespace to run this lab. The public page remains a recorded proof.')+'</div></article>'
}
function renderDomainLab(){const grid=document.getElementById('domainGrid');if(grid)grid.innerHTML=(BUILD33_DOMAINS.packs||[]).map(domainCard).join('')}
function domainById(id){return (BUILD33_DOMAINS.packs||[]).find(p=>p.domain_id===id)}
function domainResult(id,text,kind=''){const el=document.getElementById('domain-result-'+id);if(el){el.className='domainResult '+kind;el.textContent=text}}
async function startDomainLab(id){
 if(BUILD33_STATIC_MODE||typeof API==='undefined'||!API){domainResult(id,'Open a live Codespace to start an isolated domain space.','warn');return}
 domainResult(id,'Creating isolated starter Logical Space…');
 try{const r=await postJson('/api/domain/start',{domain_id:id});domainResult(id,'Started '+r.universe_id+' · '+r.base_binding_count+' bindings · '+r.active_rule_count+' active rules · Reality truth effect 0.','good')}catch(e){domainResult(id,e.message,'warn')}
}
async function exploreDomain(id){
 if(BUILD33_STATIC_MODE||typeof API==='undefined'||!API){domainResult(id,'Open a live Codespace to let the Logical Robot explore this domain.','warn');return}
 const p=domainById(id);if(!p)return;domainResult(id,'Added to the Logical Robot frontier…');
 try{const r=await postJson('/api/input',{kind:'explore_domain',payload:{text:p.explore_prompt,priority:8}});domainResult(id,'Frontier #'+(r.frontier_id||'—')+' created. This is an investigation request, not truth.','good');if(typeof refresh==='function')await refresh()}catch(e){domainResult(id,e.message,'warn')}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',renderDomainLab);else renderDomainLab();
</script>
'''


def _catalog() -> dict[str, object]:
    return {
        "same_logical_robot": True,
        "packs": [item.as_dict() for item in builtin_domain_packs()],
    }


def living_robot_domains_html(*, static_mode: bool = False) -> str:
    """BUILD 33: layer expert-domain starter spaces over the clarity-first manifestation."""
    html = living_robot_clarity_html(static_mode=static_mode)
    if "</style>" not in html or '<section class="understandBuild"' not in html or "</body>" not in html:
        raise RuntimeError("Living Logical Robot markup changed; BUILD 33 Domain Lab cannot attach safely")
    html = html.replace("</style>", _CSS + "\n</style>", 1)
    html = html.replace('<section class="understandBuild"', _SECTION + '\n<section class="understandBuild"', 1)
    script = _SCRIPT_TEMPLATE.replace("__STATIC_MODE__", "true" if static_mode else "false").replace(
        "__DOMAIN_JSON__", json.dumps(_catalog(), ensure_ascii=False, sort_keys=True)
    )
    html = html.replace("</body>", script + "\n</body>", 1)
    return html


def export_static(path: str | Path) -> Path:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(living_robot_domains_html(static_mode=True), encoding="utf-8")
    return target


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Export BUILD 33: Logical Robot Domain Lab.")
    parser.add_argument("--export", required=True, help="Output HTML path")
    args = parser.parse_args(argv)
    export_static(args.export)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
