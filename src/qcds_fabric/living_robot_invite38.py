from __future__ import annotations

import argparse
from pathlib import Path
from typing import Sequence

from .living_robot_invite import living_robot_invite_html


_CSS = r'''
/* Pick a World quick result. QCDS core semantics are unchanged. */
.quickResult{padding:15px}.quickResultTitle{font-size:8px}.q38Trace{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:7px;margin-top:11px}.q38Trace div{border:1px solid #29485a;background:#081923;border-radius:9px;padding:8px}.q38Trace b{display:block;font-size:8px;color:#d9f8e4}.q38Trace span{display:block;font-size:7px;color:#7893a1;margin-top:3px;line-height:1.4}.q38Summary{font-size:11px;line-height:1.55;color:#c6dbe4;margin-top:10px;max-width:1100px}.q38Core{margin-top:8px;border:1px solid #29485a;background:#07131d;border-radius:9px;padding:8px;font-size:7px;line-height:1.55;color:#7893a1}.q38Core strong{color:#d9f8e4}.q38Metrics{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.q38Metric{border:1px solid #31536b;background:#0a1b26;border-radius:999px;padding:6px 9px;font-size:7px;color:#8ea9b7}.q38Metric strong{color:#d9f8e4}.q38Candidates{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:11px}.q38Candidate{border:1px solid #2d5160;background:linear-gradient(165deg,#0a1d27,#07151e);border-radius:12px;padding:11px;min-height:190px}.q38Candidate.leading{border-color:#6fc79b;box-shadow:inset 0 0 28px #4bc8890d}.q38Name{font-size:9px;font-weight:800;color:#e8f5fb;word-break:break-word}.q38Lead{font-size:6px;color:#82e5ac;letter-spacing:.13em;text-transform:uppercase;min-height:12px;margin-bottom:5px}.q38Stage{border:1px solid #294657;background:#06141d;border-radius:9px;padding:8px;margin-top:9px}.q38Stage span{display:block;font-size:6px;color:#698797;text-transform:uppercase;letter-spacing:.11em}.q38Stage strong{display:block;font-size:19px;color:#c9f5d8;margin-top:2px}.q38Match{font-size:6.5px;color:#86a8b7;margin-top:6px}.q38Params{display:flex;gap:4px;flex-wrap:wrap;margin-top:8px}.q38Param{border:1px solid #213d4d;background:#07141d;border-radius:999px;padding:4px 6px;font-size:6px;color:#7898a8}.q38Conflict{margin-top:10px;border:1px solid #66552e;background:#211c0d;border-radius:9px;padding:8px;font-size:7px;color:#e6ca86;line-height:1.45}.q38Why{margin-top:10px;font-size:8px;line-height:1.55;color:#8fa8b6}.q38Why strong{color:#c9f5d8}@media(max-width:1250px){.q38Trace{grid-template-columns:repeat(3,1fr)}}@media(max-width:900px){.q38Candidates{grid-template-columns:1fr 1fr}.q38Trace{grid-template-columns:1fr 1fr}}@media(max-width:520px){.q38Candidates,.q38Trace{grid-template-columns:1fr}}
'''

_SCRIPT = r'''
<script>
const BUILD38_SEEDS={
 biology:{id:'cell-response',title:'Cell Response',audience:'Biology researchers',tagline:'Competing cellular worlds under one translated question.',description:'Each candidate world is a multi-parameter cell state. The question and observations become oracle constraints over those worlds.',challenge:'Given the represented signalling, stress, nutrient, damage and energy conditions, which cellular world remains most coherent?',learning:'See question/material translated into oracle logic before QCDS operates on the candidate worlds.',prompt:'Translate the represented observations into constraints; do not assign candidate probabilities directly.',subject:'cell-001',predicate:'response-world',observations:['signal=high','stress=low','nutrient=rich','dna_damage=low','energy=high','oxygen=normal','growth_factor=present','mitochondria=stable'],constraints:{signal:'high',stress:'low',nutrient:'rich',dna_damage:'low',energy:'high',oxygen:'normal',growth_factor:'present',mitochondria:'stable'},worlds:[{name:'adaptive',params:{signal:'high',stress:'low',nutrient:'rich',dna_damage:'low',energy:'high',oxygen:'normal',growth_factor:'present',mitochondria:'stable'}},{name:'stressed',params:{signal:'high',stress:'high',nutrient:'limited',dna_damage:'medium',energy:'medium',oxygen:'low',growth_factor:'present',mitochondria:'strained'}},{name:'dormant',params:{signal:'low',stress:'medium',nutrient:'limited',dna_damage:'low',energy:'low',oxygen:'normal',growth_factor:'absent',mitochondria:'stable'}},{name:'apoptotic',params:{signal:'low',stress:'high',nutrient:'poor',dna_damage:'high',energy:'low',oxygen:'low',growth_factor:'absent',mitochondria:'failing'}}]},
 robotics:{id:'robot-navigation',title:'Robot Navigation',audience:'Robotics researchers',tagline:'Competing navigation worlds under several simultaneous constraints.',description:'A route world is not one label plus one score; it contains terrain, obstacle, battery, traction, visibility, deadline, localization and safety conditions.',challenge:'Given the represented environment and mission constraints, which navigation world remains most coherent?',learning:'See the translator form emulated oracle constraints across a real multi-parameter route state.',prompt:'Translate mission and sensor material into route constraints; do not pre-score route candidates.',subject:'robot-001',predicate:'navigation-world',observations:['obstacle=low','battery=high','traction=good','visibility=good','deadline=tight','localization=strong','surface=dry','human_zone=clear'],constraints:{obstacle:'low',battery:'high',traction:'good',visibility:'good',deadline:'tight',localization:'strong',surface:'dry',human_zone:'clear'},worlds:[{name:'direct',params:{obstacle:'low',battery:'high',traction:'good',visibility:'good',deadline:'tight',localization:'strong',surface:'dry',human_zone:'clear'}},{name:'cautious',params:{obstacle:'medium',battery:'high',traction:'good',visibility:'medium',deadline:'loose',localization:'strong',surface:'dry',human_zone:'possible'}},{name:'reroute',params:{obstacle:'high',battery:'medium',traction:'good',visibility:'good',deadline:'loose',localization:'strong',surface:'mixed',human_zone:'clear'}},{name:'stop',params:{obstacle:'high',battery:'low',traction:'poor',visibility:'poor',deadline:'irrelevant',localization:'weak',surface:'wet',human_zone:'occupied'}}]},
 materials:{id:'material-stability',title:'Material Stability',audience:'Materials researchers',tagline:'Competing material worlds across a coupled condition set.',description:'Thermal behaviour is represented together with oxidation, lattice order, coating integrity, load, fatigue, moisture and defect density.',challenge:'Given the represented exposure and structural conditions, which material world remains most coherent?',learning:'Inspect how multiple translated material constraints jointly filter the candidate worlds.',prompt:'Translate the material observations into oracle constraints; never collapse them into a single supplied score.',subject:'material-alpha',predicate:'stability-world',observations:['temperature=high','oxidation=low','lattice=dense','coating=intact','load=medium','fatigue=low','moisture=low','defects=low'],constraints:{temperature:'high',oxidation:'low',lattice:'dense',coating:'intact',load:'medium',fatigue:'low',moisture:'low',defects:'low'},worlds:[{name:'stable',params:{temperature:'high',oxidation:'low',lattice:'dense',coating:'intact',load:'medium',fatigue:'low',moisture:'low',defects:'low'}},{name:'metastable',params:{temperature:'high',oxidation:'medium',lattice:'dense',coating:'worn',load:'medium',fatigue:'medium',moisture:'low',defects:'medium'}},{name:'degrading',params:{temperature:'high',oxidation:'high',lattice:'distorted',coating:'failed',load:'high',fatigue:'high',moisture:'medium',defects:'high'}},{name:'failed',params:{temperature:'extreme',oxidation:'high',lattice:'broken',coating:'failed',load:'high',fatigue:'high',moisture:'high',defects:'critical'}}]},
 software:{id:'service-state',title:'Service State',audience:'Software engineers',tagline:'Competing operational worlds across system conditions.',description:'Each service world contains latency, queue, CPU, memory, dependency, error, saturation and retry behaviour rather than a one-number diagnosis.',challenge:'Given the represented telemetry, which operational world remains most coherent?',learning:'See telemetry translated into oracle constraints before QCDS returns a TruthDistribution.',prompt:'Translate telemetry into constraints over candidate operational worlds; do not provide a diagnosis score directly.',subject:'service-api',predicate:'operational-world',observations:['latency=high','queue=growing','cpu=medium','memory=stable','database=slow','errors=medium','connections=high','retries=growing'],constraints:{latency:'high',queue:'growing',cpu:'medium',memory:'stable',database:'slow',errors:'medium',connections:'high',retries:'growing'},worlds:[{name:'degraded',params:{latency:'high',queue:'growing',cpu:'medium',memory:'stable',database:'slow',errors:'medium',connections:'high',retries:'growing'}},{name:'healthy',params:{latency:'low',queue:'stable',cpu:'low',memory:'stable',database:'fast',errors:'low',connections:'medium',retries:'low'}},{name:'saturated',params:{latency:'high',queue:'growing',cpu:'high',memory:'high',database:'slow',errors:'medium',connections:'max',retries:'high'}},{name:'failing',params:{latency:'extreme',queue:'blocked',cpu:'high',memory:'unstable',database:'unavailable',errors:'high',connections:'dropping',retries:'storm'}}]}
};
function q38Set(id,value){const el=document.getElementById(id);if(el)el.value=value}
function q38Pct(value){return (100*Number(value||0)).toFixed(1)+'%'}
function q38Compile(seed){
 const entries=Object.entries(seed.constraints||{});if(entries.length<4)throw new Error('Pick a World needs multiple translated oracle constraints.');
 const worldNames=(seed.worlds||[]).map(world=>world.name);if(worldNames.length<2)throw new Error('Pick a World needs competing worlds.');
 const evidence=[],explain={};
 (seed.worlds||[]).forEach((world,worldIndex)=>{
   const params=world.params||{},keys=Object.keys(params);if(keys.length<6)throw new Error('Pick a World seeds require at least six logical parameters per world.');
   let weighted=0,total=0,matched=0;
   entries.forEach(([dimension,expected],oracleIndex)=>{
     const actual=params[dimension],match=actual===expected,weight=1+(oracleIndex%3)*0.12;total+=weight;if(match){weighted+=weight;matched+=1}
   });
   const ratio=total?weighted/total:0,confidence=Math.max(.5,Math.min(.99,.50+.49*ratio));
   evidence.push({subject:seed.subject,predicate:seed.predicate,value:world.name,confidence:confidence,polarity:true,source_id:'translator:emulated-oracles:'+String(worldIndex+1).padStart(3,'0')});
   explain[world.name]={matched:matched,total:entries.length,params:params,confidence:confidence};
 });
 return {request:{space:buildCustomPack(),probe:{subject:seed.subject,predicate:seed.predicate,candidate_values:worldNames},evidence:evidence,max_width:20},explain:explain,constraintCount:entries.length};
}
function q38Seed(seed){
 q38Set('builder-id',seed.id);q38Set('builder-title',seed.title);q38Set('builder-audience',seed.audience);q38Set('builder-mode','simulation');q38Set('builder-authority','');q38Set('builder-tagline',seed.tagline);q38Set('builder-description',seed.description);q38Set('builder-challenge',seed.challenge);q38Set('builder-learning',seed.learning);q38Set('builder-prompt',seed.prompt);q38Set('builder-observations',seed.observations.join('\n'));
 q38Set('session-subject',seed.subject);q38Set('session-predicate',seed.predicate);q38Set('session-candidates',seed.worlds.map(world=>world.name).join(' | '));q38Set('session-evidence','');
}
function quick38(result,compiled){
 const box=document.getElementById('quickResult'),text=document.getElementById('quickResultText'),bars=document.getElementById('quickResultBars');if(!box||!text||!bars)return;
 const rows=result.baseline||[],lead=rows.length?rows[0]:null;
 text.textContent='';bars.textContent='';
 const trace=document.createElement('div');trace.className='q38Trace';[['1 · QUESTION / MATERIAL','Human problem + represented facts'],['2 · TRANSLATOR','Forms explicit logical constraints'],['3 · LOGICAL SPACE',String(rows.length)+' multi-parameter worlds'],['4 · ORACLE FILTERS',String(compiled.constraintCount)+' translated constraints'],['5 · QCDS','Canonical four phases'],['6 · TRUTH → SYNTRACT','TruthDistribution bound']].forEach(item=>{const d=document.createElement('div'),b=document.createElement('b'),s=document.createElement('span');b.textContent=item[0];s.textContent=item[1];d.append(b,s);trace.appendChild(d)});
 const summary=document.createElement('div');summary.className='q38Summary';summary.textContent=lead?('The translated oracle logic currently leaves '+lead.value+' with the largest probability mass at '+q38Pct(lead.probability)+' inside this represented Logical Space. This is not an external-world probability.'):'No candidate distribution was returned.';
 const core=document.createElement('div');core.className='q38Core';core.innerHTML='<strong>Execution:</strong> question/material → translator → Logical Space → emulated oracle filters → QCDS four phases → TruthDistribution → Syntract. <strong>QCDS four phases remain unchanged:</strong> Condition Formation → Conditional Evolution → Recursive Inference → Truth-Alignment / Syntract Binding.';
 const metrics=document.createElement('div');metrics.className='q38Metrics';[['worlds',rows.length],['parameters / world',Object.keys((compiled.explain[rows[0]?.value]||{}).params||{}).length],['oracle constraints',compiled.constraintCount],['candidate space',result.candidate_binary_space],['Reality effect',result.truth_effect_on_reality]].forEach(item=>{const m=document.createElement('span');m.className='q38Metric';m.innerHTML='<strong>'+item[0]+':</strong> '+item[1];metrics.appendChild(m)});
 const grid=document.createElement('div');grid.className='q38Candidates';rows.forEach((row,index)=>{const detail=compiled.explain[row.value]||{matched:0,total:0,params:{}};const card=document.createElement('div');card.className='q38Candidate'+(index===0?' leading':'');const tag=document.createElement('div');tag.className='q38Lead';tag.textContent=index===0?'CURRENT LEADER':'';const n=document.createElement('div');n.className='q38Name';n.textContent=row.value;const stage=document.createElement('div');stage.className='q38Stage';stage.innerHTML='<span>TruthDistribution mass</span><strong>'+q38Pct(row.probability)+'</strong>';const match=document.createElement('div');match.className='q38Match';match.textContent='oracle constraints matched: '+detail.matched+' / '+detail.total;const params=document.createElement('div');params.className='q38Params';Object.entries(detail.params).forEach(([key,value])=>{const p=document.createElement('span');p.className='q38Param';p.textContent=key+'='+value;params.appendChild(p)});card.append(tag,n,stage,match,params);grid.appendChild(card)});
 const why=document.createElement('div');why.className='q38Why';why.innerHTML='<strong>What the percentages mean:</strong> the worlds were not given probability scores. The translator converted the represented question/material into emulated oracle constraints, applied them to every multi-parameter world, and QCDS returned one TruthDistribution. Null/rotation diagnostics remain in Advanced and are not shown as a second answer.';
 box.append(trace,summary,core,metrics,grid,why);
 if((result.conflict_markers||[]).length){const c=document.createElement('div');c.className='q38Conflict';c.textContent='Conflict preserved · '+result.conflict_markers.join(' · ');box.appendChild(c)}
 box.classList.add('visible');box.scrollIntoView({behavior:'smooth',block:'nearest'});
}
async function runSeed38(seed){let compiled;try{compiled=q38Compile(seed);saveSessionNow()}catch(e){sessionStatus(e.message,'warn');return}sessionStatus(BUILD35_STATIC_MODE?'Loading QCDS for the translated Logical Space…':'Running translated oracle logic through the local QCDS core…');try{const result=BUILD35_STATIC_MODE?await runWasmCore(compiled.request):await postJson('/api/session/run',compiled.request);quick38(result,compiled);sessionStatus('Run complete · one Pick a World TruthDistribution is shown. Advanced retains raw diagnostics.','good')}catch(e){sessionStatus(e.message,'warn')}}
window.trySeed=function(name){let seed=BUILD38_SEEDS[name];if(name==='surprise'){const keys=Object.keys(BUILD38_SEEDS);seed=BUILD38_SEEDS[keys[Math.floor(Math.random()*keys.length)]]}if(!seed)return;q38Seed(seed);runSeed38(seed)};
</script>
'''


def living_robot_invite38_html(*, static_mode: bool = False) -> str:
    html = living_robot_invite_html(static_mode=static_mode)
    if "</style>" not in html or "</body>" not in html:
        raise RuntimeError("Living Logical Robot markup changed; Pick a World invitation cannot attach safely")
    html = html.replace("The quick experiments simply prefill the full lab and call the same core.", "Quick experiments translate question/material into multi-parameter Logical Space worlds and emulated oracle filters before calling the same QCDS core. Raw diagnostics remain available in Advanced.", 1)
    html = html.replace("</style>", _CSS + "\n</style>", 1)
    html = html.replace("</body>", _SCRIPT + "\n</body>", 1)
    return html


def export_static(path: str | Path) -> Path:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(living_robot_invite38_html(static_mode=True), encoding="utf-8")
    return target


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Export Pick a World quick experiments plus the unchanged advanced lab.")
    parser.add_argument("--export", required=True, help="Output HTML path")
    args = parser.parse_args(argv)
    export_static(args.export)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
