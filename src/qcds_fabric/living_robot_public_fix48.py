from __future__ import annotations

import argparse
from pathlib import Path
from typing import Sequence

from .living_robot_public_compact import living_robot_public_compact_html as _base_html


_BUILD = "48"

_CSS = r'''
/* BUILD 48: fix Pick a World feedback + make Advanced intentionally compact. */
.publicAdvancedCompact{display:none;max-width:1800px;margin:10px auto 0;padding:0 14px}
.publicAdvancedInner{border:1px solid #405b71;background:linear-gradient(150deg,#0a1b28,#07141d);border-radius:16px;padding:16px;box-shadow:0 14px 42px #0003}
.publicAdvancedKicker{font-size:7px;letter-spacing:.15em;text-transform:uppercase;color:#b8a8e8}
.publicAdvancedInner h2{font-size:21px;margin:4px 0 6px}
.publicAdvancedLead{font-size:8.5px;line-height:1.55;color:#8ea8b7;max-width:1100px;margin:0}
.publicAdvancedFlow{margin-top:10px;border:1px solid #29495d;background:#071722;border-radius:10px;padding:9px;font-size:7.5px;line-height:1.5;color:#809dac}
.publicAdvancedFlow strong{color:#dceef8}
.publicAdvancedNav{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
.publicAdvancedNav button{border:1px solid #40566e;background:#102131;color:#dceef8;border-radius:8px;padding:8px 10px;font-size:7px;font-weight:800;cursor:pointer}
.publicAdvancedNav button.active{border-color:#9d88d4;background:#261f39;color:#eee7ff}
.publicAdvancedCards{display:grid;grid-template-columns:1.35fr 1fr 1fr;gap:8px;margin-top:10px}
.publicAdvancedCard{border:1px solid #29495d;background:#06141d;border-radius:11px;padding:11px;min-height:108px}
.publicAdvancedCard b{display:block;font-size:7px;letter-spacing:.1em;text-transform:uppercase;color:#a997d5}
.publicAdvancedCard strong{display:block;font-size:12px;color:#e7f4fb;margin-top:5px}
.publicAdvancedCard p,.publicAdvancedCard div{font-size:7.5px;line-height:1.5;color:#7f9baa;margin:5px 0 0}
.publicAdvancedCard button{margin-top:8px;border:1px solid #40566e;background:#102131;color:#dceef8;border-radius:8px;padding:7px 9px;font-size:7px;font-weight:800;cursor:pointer}
#q48LastRun strong{display:inline;color:#d9f8e4;font-size:inherit}
body.publicCompact.publicViewAdvanced .publicAdvancedCompact{display:block}
body.publicCompact.publicViewAdvanced>.hero,
body.publicCompact.publicViewAdvanced>.layout,
body.publicCompact.publicViewAdvanced>.learningMoment,
body.publicCompact.publicViewAdvanced>.understandBuild,
body.publicCompact.publicViewAdvanced>.domainLab,
body.publicCompact.publicViewAdvanced>.spaceBuilderWrap,
body.publicCompact.publicViewAdvanced>.sessionSandbox{display:none!important}
body.publicCompact.publicViewAdvanced.publicAdvancedManual>.spaceBuilderWrap,
body.publicCompact.publicViewAdvanced.publicAdvancedManual>.sessionSandbox{display:block!important}
body.publicCompact.publicViewAdvanced.publicAdvancedRaw>.hero{display:block!important}
body.publicCompact.publicViewAdvanced.publicAdvancedRaw>.layout{display:grid!important}
body.publicCompact.publicViewAdvanced.publicAdvancedRaw>.learningMoment,
body.publicCompact.publicViewAdvanced.publicAdvancedRaw>.understandBuild,
body.publicCompact.publicViewAdvanced.publicAdvancedRaw>.domainLab{display:block!important}
#try-logical-robot .seed button:disabled{opacity:.5;cursor:wait}
@media(max-width:900px){.publicAdvancedCards{grid-template-columns:1fr}}
@media(max-width:700px){.publicAdvancedCompact{padding:0 8px}}
'''

_ADVANCED = f'''
<section class="publicAdvancedCompact" id="public-advanced">
  <div class="publicAdvancedInner">
    <div class="publicAdvancedKicker">BUILD {_BUILD} · ADVANCED</div>
    <h2>More depth without the wall of controls.</h2>
    <p class="publicAdvancedLead">The normal path stays simple: question/material → translator → Logical Space → oracle filters → QCDS four phases → TruthDistribution → Syntract. Advanced starts as a one-screen expert summary. The old detailed surfaces are opened only when you explicitly ask for them.</p>
    <div class="publicAdvancedNav">
      <button type="button" data-advanced-mode="summary" class="active" onclick="publicAdvancedMode('summary')">SUMMARY</button>
      <button type="button" data-advanced-mode="manual" onclick="publicAdvancedMode('manual')">MANUAL SPACE + PROBE</button>
      <button type="button" data-advanced-mode="raw" onclick="publicAdvancedMode('raw')">RAW RESEARCH LAB</button>
    </div>
    <div class="publicAdvancedFlow"><strong>Canonical core:</strong> 1 Condition Formation → 2 Conditional Evolution → 3 Recursive Inference → 4 Truth-Alignment / Syntract Binding. Advanced changes visibility only; it does not change QCDS semantics.</div>
    <div class="publicAdvancedCards">
      <article class="publicAdvancedCard">
        <b>Last Pick a World run</b>
        <strong id="q48LastRunTitle">No run yet</strong>
        <div id="q48LastRun">Run one Pick a World example and the useful diagnostics appear here.</div>
      </article>
      <article class="publicAdvancedCard">
        <b>Manual Logical Space</b>
        <strong>Build only when needed</strong>
        <p>Open the detailed Logical Space builder and explicit QCDS probe. Hidden by default so Advanced stays readable.</p>
        <button type="button" onclick="publicAdvancedMode('manual')">OPEN MANUAL TOOLS →</button>
      </article>
      <article class="publicAdvancedCard">
        <b>Raw research surface</b>
        <strong>Legacy depth on demand</strong>
        <p>Open the older full technical lab only when you actually need every low-level research control.</p>
        <button type="button" onclick="publicAdvancedMode('raw')">OPEN RAW LAB →</button>
      </article>
    </div>
  </div>
</section>
'''

_SCRIPT = r'''
<script>
/* BUILD 48 public-surface repair. The QCDS core is not changed. */
const Q48_ADVANCED_CLASSES=['publicAdvancedManual','publicAdvancedRaw'];

function q48WorldObservations(seed){
  return Object.entries(seed.constraints||{}).map(([dimension,expected],index)=>({
    binding_id:seed.id+'-translated-'+String(index+1).padStart(3,'0'),
    terms:[seed.subject,dimension,String(expected)],
    source_id:'translator:'+seed.id+':'+String(index+1).padStart(3,'0'),
    confidence:1.0
  }));
}

function q48Space(seed){
  return {
    domain_id:seed.id,
    title:seed.title,
    tagline:seed.tagline,
    audience:seed.audience,
    universe_mode:'simulation',
    authority:'',
    description:seed.description,
    challenge:seed.challenge,
    learning_target:seed.learning,
    explore_prompt:seed.prompt,
    observations:q48WorldObservations(seed),
    starter_rules:[],
    truth_boundary:{external_truth_claim:false,solution_rule_supplied:false,starting_lab_modifies_reality:false},
    notes:'Pick a World · question/material translated into explicit emulated oracle constraints.'
  };
}

function q48Compile(seed){
  const entries=Object.entries(seed.constraints||{});
  if(entries.length<4)throw new Error('Pick a World needs multiple translated oracle constraints.');
  const worlds=seed.worlds||[],worldNames=worlds.map(world=>world.name);
  if(worldNames.length<2)throw new Error('Pick a World needs competing worlds.');
  const evidence=[],explain={};
  worlds.forEach((world,worldIndex)=>{
    const params=world.params||{},keys=Object.keys(params);
    if(keys.length<6)throw new Error('Pick a World seeds require at least six logical parameters per world.');
    let weighted=0,total=0,matched=0;
    entries.forEach(([dimension,expected],oracleIndex)=>{
      const actual=params[dimension],match=actual===expected,weight=1+(oracleIndex%3)*0.12;
      total+=weight;
      if(match){weighted+=weight;matched+=1}
    });
    const ratio=total?weighted/total:0,confidence=Math.max(.5,Math.min(.99,.50+.49*ratio));
    evidence.push({
      subject:seed.subject,
      predicate:seed.predicate,
      value:world.name,
      confidence:confidence,
      polarity:true,
      source_id:'translator:emulated-oracles:'+String(worldIndex+1).padStart(3,'0')
    });
    explain[world.name]={matched:matched,total:entries.length,params:params,confidence:confidence};
  });
  return {
    request:{
      space:q48Space(seed),
      probe:{subject:seed.subject,predicate:seed.predicate,candidate_values:worldNames},
      evidence:evidence,
      max_width:20
    },
    explain:explain,
    constraintCount:entries.length
  };
}

/* Keep the hidden manual builder valid too: its observation parser expects | separated terms. */
const Q48_BASE_SEED=q38Seed;
q38Seed=function(seed){
  Q48_BASE_SEED(seed);
  const lines=Object.entries(seed.constraints||{}).map(([dimension,expected])=>seed.subject+' | '+dimension+' | '+expected);
  q38Set('builder-observations',lines.join('\n'));
};

/* Replace the faulty compiler that routed the quick example through the manual form parser. */
q38Compile=q48Compile;

function q48QuickStatus(message,kind=''){
  const box=document.getElementById('quickResult'),text=document.getElementById('quickResultText'),bars=document.getElementById('quickResultBars');
  if(!box||!text||!bars)return;
  text.textContent=message;
  bars.textContent='';
  box.classList.add('visible');
  if(kind==='warn')box.setAttribute('data-status','warn');else box.removeAttribute('data-status');
  box.scrollIntoView({behavior:'smooth',block:'nearest'});
}

function q48SeedButtons(disabled){
  document.querySelectorAll('#try-logical-robot .seed button,#try-logical-robot .inviteBottom button').forEach(button=>button.disabled=disabled);
}

function q48RenderAdvanced(result,compiled){
  const title=document.getElementById('q48LastRunTitle'),body=document.getElementById('q48LastRun');
  if(!title||!body)return;
  const rows=result.baseline||[],lead=rows.length?rows[0]:null;
  title.textContent=lead?lead.value+' · '+q38Pct(lead.probability):'Run complete';
  body.textContent='';
  const parts=[
    ['worlds',rows.length],
    ['parameters/world',lead?Object.keys((compiled.explain[lead.value]||{}).params||{}).length:'—'],
    ['oracle constraints',compiled.constraintCount],
    ['logical width',result.logical_width],
    ['entropy',Number(result.entropy||0).toFixed(4)],
    ['conflicts',(result.conflict_markers||[]).length]
  ];
  parts.forEach(([label,value],index)=>{
    if(index)body.appendChild(document.createTextNode(' · '));
    const strong=document.createElement('strong');
    strong.textContent=label+': ';
    body.append(strong,document.createTextNode(String(value)));
  });
}

runSeed38=async function(seed){
  q48SeedButtons(true);
  q48QuickStatus('Translating question/material into oracle constraints…');
  let compiled;
  try{
    compiled=q38Compile(seed);
    saveSessionNow();
  }catch(e){
    q48QuickStatus('Could not form the Logical Space: '+e.message,'warn');
    sessionStatus(e.message,'warn');
    q48SeedButtons(false);
    return;
  }
  q48QuickStatus('Oracle constraints formed. Running the represented Logical Space through QCDS…');
  try{
    const result=BUILD35_STATIC_MODE?await runWasmCore(compiled.request):await postJson('/api/session/run',compiled.request);
    window.Q48_LAST_RESULT=result;
    window.Q48_LAST_COMPILED=compiled;
    quick38(result,compiled);
    q48RenderAdvanced(result,compiled);
    sessionStatus('Run complete · one Pick a World TruthDistribution is shown.','good');
  }catch(e){
    q48QuickStatus('QCDS run failed: '+e.message,'warn');
    sessionStatus(e.message,'warn');
  }finally{
    q48SeedButtons(false);
  }
};

window.trySeed=function(name){
  let seed=BUILD38_SEEDS[name];
  if(name==='surprise'){
    const keys=Object.keys(BUILD38_SEEDS);
    seed=BUILD38_SEEDS[keys[Math.floor(Math.random()*keys.length)]];
  }
  if(!seed){
    q48QuickStatus('Unknown Pick a World example.','warn');
    return;
  }
  q38Seed(seed);
  runSeed38(seed);
};

function publicAdvancedMode(mode){
  Q48_ADVANCED_CLASSES.forEach(name=>document.body.classList.remove(name));
  if(mode==='manual')document.body.classList.add('publicAdvancedManual');
  if(mode==='raw')document.body.classList.add('publicAdvancedRaw');
  document.querySelectorAll('[data-advanced-mode]').forEach(button=>button.classList.toggle('active',button.dataset.advancedMode===mode));
  if(mode==='manual'){
    if(typeof openSpaceBuilder==='function')openSpaceBuilder();
    const target=document.getElementById('custom-space-builder');
    if(target)setTimeout(()=>target.scrollIntoView({behavior:'smooth',block:'start'}),0);
  }else if(mode==='raw'){
    const target=document.querySelector('body>.hero');
    if(target)setTimeout(()=>target.scrollIntoView({behavior:'smooth',block:'start'}),0);
  }else{
    const target=document.getElementById('public-advanced');
    if(target)setTimeout(()=>target.scrollIntoView({behavior:'smooth',block:'start'}),0);
  }
}

publicSelectView=function(view){
  PUBLIC_VIEW_CLASSES.forEach(name=>document.body.classList.remove(name));
  Q48_ADVANCED_CLASSES.forEach(name=>document.body.classList.remove(name));
  let target=null;
  if(view==='advanced'){
    document.body.classList.add('publicViewAdvanced');
    publicAdvancedMode('summary');
    target=document.getElementById('public-advanced');
  }else if(view==='legal'){
    document.body.classList.add('publicViewLegal');
    publicSelectLegalMode('ask',false);
    target=document.getElementById('public-legal-question');
  }else{
    view='qcds';
    document.body.classList.add('publicViewQcds');
    target=document.getElementById('try-logical-robot');
  }
  document.querySelectorAll('[data-public-view]').forEach(button=>button.classList.toggle('active',button.dataset.publicView===view));
  if(target)setTimeout(()=>target.scrollIntoView({behavior:'smooth',block:'start'}),0);
};

window.publicAdvancedMode=publicAdvancedMode;
</script>
'''


def living_robot_public_fix48_html(*, static_mode: bool = False) -> str:
    html = _base_html(static_mode=static_mode)
    legal_marker = '<section class="publicLegalQuestion" id="public-legal-question">'
    if "</style>" not in html or "</body>" not in html or legal_marker not in html:
        raise RuntimeError("public compact markup changed; BUILD 48 repair cannot attach safely")
    html = html.replace("</style>", _CSS + "\n</style>", 1)
    html = html.replace(legal_marker, _ADVANCED + "\n" + legal_marker, 1)
    html = html.replace("</body>", _SCRIPT + "\n</body>", 1)
    return html


def export_static(path: str | Path) -> Path:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(living_robot_public_fix48_html(static_mode=True), encoding="utf-8")
    return target


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Export BUILD 48: working Pick a World + compact Advanced surface.")
    parser.add_argument("--export", required=True, help="Output HTML path")
    args = parser.parse_args(argv)
    export_static(args.export)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
