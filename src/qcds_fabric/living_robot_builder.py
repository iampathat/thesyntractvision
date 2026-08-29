from __future__ import annotations

import argparse
from pathlib import Path
from typing import Sequence

from .living_robot_domains import living_robot_domains_html


_CSS = r'''
/* BUILD 34: functional custom Logical Space builder. */
.domainBuilderOpen{display:inline-block;border:1px solid #d9f8e4;background:#d9f8e4;color:#082117;border-radius:9px;padding:9px 11px;font-size:9px;font-weight:750;cursor:pointer}.domainGuide{margin-left:6px}.spaceBuilderWrap{max-width:1800px;margin:12px auto 0;padding:0 14px}.spaceBuilder{border:1px solid #31536b;background:linear-gradient(160deg,#07131d,#0b1c28 70%);border-radius:18px;padding:18px;box-shadow:0 18px 55px #0004}.spaceBuilder[hidden]{display:none}.spaceBuilderHead{display:flex;align-items:flex-start;gap:14px;margin-bottom:14px}.spaceBuilderHead>div{flex:1}.spaceBuilderHead h3{margin:3px 0 4px;font-size:22px}.spaceBuilderHead p{margin:0;color:#8fa9b9;font-size:9px;line-height:1.5;max-width:1000px}.spaceBuilderClose{border:1px solid #36566a;background:#102638;color:#dceef8;border-radius:8px;padding:7px 10px;cursor:pointer}.spaceBuilderGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.spaceBuilderField{display:flex;flex-direction:column;gap:5px}.spaceBuilderField.full{grid-column:1/-1}.spaceBuilderField label{font-size:7px;text-transform:uppercase;letter-spacing:.12em;color:#83aabd}.spaceBuilderField input,.spaceBuilderField select,.spaceBuilderField textarea{width:100%;box-sizing:border-box;border:1px solid #31536b;background:#07131d;color:#e8f5fb;border-radius:9px;padding:9px 10px;font:inherit;font-size:9px;outline:none}.spaceBuilderField textarea{min-height:68px;resize:vertical;line-height:1.45}.spaceBuilderField textarea.tall{min-height:105px}.spaceBuilderHint{font-size:7px;line-height:1.45;color:#6f8d9f}.spaceBuilderBoundary{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:12px 0}.spaceBuilderBoundary div{border:1px solid #28513e;background:#0a2119;border-radius:9px;padding:8px}.spaceBuilderBoundary b{display:block;color:#a9edc0;font-size:8px}.spaceBuilderBoundary span{display:block;color:#78998a;font-size:7px;margin-top:2px}.spaceBuilderActions{display:flex;gap:7px;flex-wrap:wrap;align-items:center}.spaceBuilderActions button{border:1px solid #31536b;background:#102638;color:#eef8ff;border-radius:9px;padding:9px 11px;font-size:8px;font-weight:750;cursor:pointer}.spaceBuilderActions button.primary{background:#d9f8e4;color:#082117;border-color:#d9f8e4}.spaceBuilderActions button:disabled{opacity:.45;cursor:not-allowed}.spaceBuilderStatus{font-size:8px;line-height:1.45;color:#86a0b0;min-height:20px;margin-top:9px}.spaceBuilderStatus.good{color:#a9edc0}.spaceBuilderStatus.warn{color:#efc986}.spaceBuilderPreview{margin-top:10px;border:1px solid #27485b;background:#06111a;border-radius:10px;padding:10px;max-height:260px;overflow:auto;font-size:8px;line-height:1.45;color:#a9bfcc;white-space:pre-wrap}.spaceBuilderMode{font-size:8px;color:#7999aa;margin:0 0 12px}.spaceBuilderMode strong{color:#d9f8e4}@media(max-width:740px){.spaceBuilderWrap{padding:0 8px}.spaceBuilderGrid{grid-template-columns:1fr}.spaceBuilderField.full{grid-column:auto}.spaceBuilderBoundary{grid-template-columns:1fr}}
'''

_BUILDER = r'''
<section class="spaceBuilderWrap" id="custom-space-builder">
  <div class="spaceBuilder" id="spaceBuilder" hidden>
    <div class="spaceBuilderHead">
      <div><div class="domainKicker">BUILD 34 · CUSTOM LOGICAL SPACE</div><h3>Build the experiment, not the answer.</h3><p>Create an isolated Logical Space from observations and an unresolved challenge. This form cannot supply a solution rule or write into Reality.</p></div>
      <button type="button" class="spaceBuilderClose" onclick="closeSpaceBuilder()" aria-label="Close builder">CLOSE</button>
    </div>
    <p class="spaceBuilderMode" id="spaceBuilderMode"></p>
    <div class="spaceBuilderGrid">
      <div class="spaceBuilderField"><label for="builder-id">Domain ID</label><input id="builder-id" maxlength="64" placeholder="battery-aging"></div>
      <div class="spaceBuilderField"><label for="builder-title">Title</label><input id="builder-title" maxlength="120" placeholder="Battery Aging"></div>
      <div class="spaceBuilderField"><label for="builder-audience">Expert audience</label><input id="builder-audience" maxlength="240" placeholder="Battery researchers · electrochemists"></div>
      <div class="spaceBuilderField"><label for="builder-mode">Epistemic universe mode</label><select id="builder-mode"><option value="simulation">simulation</option><option value="declared">declared</option></select></div>
      <div class="spaceBuilderField"><label for="builder-authority">Authority (required for declared)</label><input id="builder-authority" maxlength="300" placeholder="Fictional rulebook / named declared source"></div>
      <div class="spaceBuilderField full"><label for="builder-tagline">One-line description</label><input id="builder-tagline" maxlength="240" placeholder="Cycles, chemistry, temperature and capacity in one open logical space."></div>
      <div class="spaceBuilderField full"><label for="builder-description">Logical space</label><textarea id="builder-description" placeholder="Describe what can coexist as terms/dimensions. Do not force a hierarchy unless the domain actually requires one."></textarea></div>
      <div class="spaceBuilderField full"><label for="builder-challenge">Unresolved challenge</label><textarea id="builder-challenge" placeholder="What is genuinely unresolved, with more than one plausible explanation?"></textarea></div>
      <div class="spaceBuilderField full"><label for="builder-learning">What would count as learning?</label><textarea id="builder-learning" placeholder="State a held-out capability or falsifiable result that the robot cannot resolve before entering this space."></textarea></div>
      <div class="spaceBuilderField full"><label for="builder-prompt">Exploration prompt</label><textarea id="builder-prompt" placeholder="Tell the Logical Robot what distinctions to investigate, not which answer to produce."></textarea></div>
      <div class="spaceBuilderField full"><label for="builder-observations">Starter observations</label><textarea class="tall" id="builder-observations" placeholder="sample-001 | chemistry-a | temperature-high | cycles-500 | capacity-low&#10;sample-002 | chemistry-a | temperature-low | cycles-500 | capacity-high"></textarea><div class="spaceBuilderHint">One observation per line. Separate terms with |. Binding IDs and user-source provenance are created automatically.</div></div>
    </div>
    <div class="spaceBuilderBoundary">
      <div><b>0 SUPPLIED SOLUTION RULES</b><span>Answers cannot be hidden in the starter pack.</span></div>
      <div><b>ISOLATED UNIVERSE</b><span>Custom IDs use domain-lab-custom-*.</span></div>
      <div><b>REALITY EFFECT = 0</b><span>Starting the space does not modify observed Reality.</span></div>
    </div>
    <div class="spaceBuilderActions">
      <button type="button" onclick="previewCustomSpace()">PREVIEW PACK</button>
      <button type="button" onclick="downloadCustomSpace()">DOWNLOAD JSON</button>
      <button type="button" class="primary" id="builder-start" onclick="startCustomSpace()">START ISOLATED SPACE</button>
      <button type="button" id="builder-explore" onclick="exploreCustomSpace()">EXPLORE WITH ROBOT</button>
    </div>
    <div class="spaceBuilderStatus" id="spaceBuilderStatus"></div>
    <pre class="spaceBuilderPreview" id="spaceBuilderPreview" hidden></pre>
  </div>
</section>
'''

_SCRIPT = r'''
<script>
const BUILD34_STATIC_MODE=__STATIC_MODE__;
function openSpaceBuilder(){
 const panel=document.getElementById('spaceBuilder');if(!panel)return;panel.hidden=false;
 const opener=document.getElementById('domainBuilderOpen');if(opener)opener.setAttribute('aria-expanded','true');
 const mode=document.getElementById('spaceBuilderMode');
 if(mode)mode.innerHTML=BUILD34_STATIC_MODE?'<strong>PUBLIC BUILDER:</strong> create, validate, preview and download a complete pack here. Start it in a live Codespace.':'<strong>LIVE BUILDER:</strong> create the pack and start its isolated universe directly in this runtime.';
 const start=document.getElementById('builder-start'),explore=document.getElementById('builder-explore');if(start)start.disabled=BUILD34_STATIC_MODE;if(explore)explore.disabled=BUILD34_STATIC_MODE;
 panel.scrollIntoView({behavior:'smooth',block:'start'});
}
function closeSpaceBuilder(){const panel=document.getElementById('spaceBuilder');if(panel)panel.hidden=true;const opener=document.getElementById('domainBuilderOpen');if(opener)opener.setAttribute('aria-expanded','false')}
function bValue(id){const el=document.getElementById(id);return el?String(el.value||'').trim():''}
function bSlug(v){return String(v||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,64)}
function builderObservations(domainId){
 const lines=bValue('builder-observations').split(/\r?\n/).map(v=>v.trim()).filter(Boolean);
 if(!lines.length)throw new Error('Add at least one starter observation.');if(lines.length>500)throw new Error('Maximum 500 starter observations.');
 return lines.map((line,index)=>{const terms=line.split('|').map(v=>v.trim()).filter(Boolean);if(terms.length<2)throw new Error('Observation '+(index+1)+' needs at least two terms separated with |.');return {binding_id:domainId+'-'+String(index+1).padStart(3,'0'),terms:terms,source_id:'user:'+domainId+':'+String(index+1).padStart(3,'0'),confidence:1.0};});
}
function buildCustomPack(){
 const domainId=bSlug(bValue('builder-id')||bValue('builder-title'));if(!domainId)throw new Error('Domain ID or title is required.');
 const title=bValue('builder-title');if(!title)throw new Error('Title is required.');
 const description=bValue('builder-description');if(!description)throw new Error('Describe the Logical Space.');
 const challenge=bValue('builder-challenge');if(!challenge)throw new Error('An unresolved challenge is required.');
 const learning=bValue('builder-learning');if(!learning)throw new Error('Define what would count as learning.');
 const prompt=bValue('builder-prompt');if(!prompt)throw new Error('An exploration prompt is required.');
 const universeMode=bValue('builder-mode')||'simulation',authority=bValue('builder-authority');if(universeMode==='declared'&&!authority)throw new Error('Authority is required for a declared universe.');
 return {domain_id:domainId,title:title,tagline:bValue('builder-tagline')||'Custom open Logical Space.',audience:bValue('builder-audience')||'Domain experts',universe_mode:universeMode,authority:authority,description:description,challenge:challenge,learning_target:learning,explore_prompt:prompt,observations:builderObservations(domainId),starter_rules:[],truth_boundary:{external_truth_claim:false,solution_rule_supplied:false,starting_lab_modifies_reality:false},notes:'Built with The Syntract Vision Logical Space Builder.'};
}
function builderStatus(text,kind=''){const el=document.getElementById('spaceBuilderStatus');if(el){el.className='spaceBuilderStatus '+kind;el.textContent=text}}
function previewCustomSpace(){try{const pack=buildCustomPack(),pre=document.getElementById('spaceBuilderPreview');if(pre){pre.hidden=false;pre.textContent=JSON.stringify(pack,null,2)}builderStatus('Valid pack · '+pack.observations.length+' observations · 0 supplied solution rules.','good');return pack}catch(e){builderStatus(e.message,'warn');return null}}
function downloadCustomSpace(){const pack=previewCustomSpace();if(!pack)return;const blob=new Blob([JSON.stringify(pack,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=pack.domain_id+'.logical-space.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),0);builderStatus('Downloaded '+a.download+'.','good')}
async function startCustomSpace(){const pack=previewCustomSpace();if(!pack)return;if(BUILD34_STATIC_MODE||typeof API==='undefined'||!API){builderStatus('This public page cannot persist a universe. Download the pack and open the live Codespace/runtime to start it.','warn');return}builderStatus('Creating isolated custom Logical Space…');try{const r=await postJson('/api/domain/custom-start',pack);builderStatus('Started '+r.universe_id+' · '+r.base_binding_count+' bindings · '+r.active_rule_count+' active rules · Reality truth effect 0.','good');if(typeof refresh==='function')await refresh()}catch(e){builderStatus(e.message,'warn')}}
async function exploreCustomSpace(){let pack;try{pack=buildCustomPack()}catch(e){builderStatus(e.message,'warn');return}if(BUILD34_STATIC_MODE||typeof API==='undefined'||!API){builderStatus('Exploration requires the live Logical Robot runtime.','warn');return}builderStatus('Adding this custom domain to the Logical Robot frontier…');try{const r=await postJson('/api/input',{kind:'explore_domain',payload:{text:pack.explore_prompt,priority:8,domain_id:pack.domain_id}});builderStatus('Frontier #'+(r.frontier_id||'—')+' created. This remains an investigation request, not truth.','good');if(typeof refresh==='function')await refresh()}catch(e){builderStatus(e.message,'warn')}}
</script>
'''

_OLD_LINK = '<a href="https://github.com/iampathat/thesyntractvision/blob/main/DOMAIN_LABS.md" target="_blank" rel="noopener">BUILD YOUR OWN LOGICAL SPACE ↗</a>'
_NEW_CONTROL = '<button type="button" class="domainBuilderOpen" id="domainBuilderOpen" aria-expanded="false" onclick="openSpaceBuilder()">BUILD YOUR OWN LOGICAL SPACE →</button><a class="domainGuide" href="https://github.com/iampathat/thesyntractvision/blob/main/DOMAIN_LABS.md" target="_blank" rel="noopener">GUIDE ↗</a>'


def living_robot_builder_html(*, static_mode: bool = False) -> str:
    html = living_robot_domains_html(static_mode=static_mode)
    if _OLD_LINK not in html or "</style>" not in html or '<section class="understandBuild"' not in html or "</body>" not in html:
        raise RuntimeError("Living Logical Robot markup changed; BUILD 34 builder cannot attach safely")
    html = html.replace(_OLD_LINK, _NEW_CONTROL, 1)
    html = html.replace("</style>", _CSS + "\n</style>", 1)
    html = html.replace('<section class="understandBuild"', _BUILDER + '\n<section class="understandBuild"', 1)
    html = html.replace("</body>", _SCRIPT.replace("__STATIC_MODE__", "true" if static_mode else "false") + "\n</body>", 1)
    return html


def export_static(path: str | Path) -> Path:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(living_robot_builder_html(static_mode=True), encoding="utf-8")
    return target


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Export BUILD 34: functional custom Logical Space builder.")
    parser.add_argument("--export", required=True, help="Output HTML path")
    args = parser.parse_args(argv)
    export_static(args.export)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
