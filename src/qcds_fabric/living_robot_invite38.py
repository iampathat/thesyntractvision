from __future__ import annotations

import argparse
from pathlib import Path
from typing import Sequence

from .living_robot_invite import living_robot_invite_html


_CSS = r'''
/* BUILD 38: richer quick-run result. Core semantics are unchanged. */
.quickResult{padding:15px}.quickResultTitle{font-size:8px}.q38Trace{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:11px}.q38Trace div{border:1px solid #29485a;background:#081923;border-radius:9px;padding:8px}.q38Trace b{display:block;font-size:8px;color:#d9f8e4}.q38Trace span{display:block;font-size:7px;color:#7893a1;margin-top:3px;line-height:1.4}.q38Summary{font-size:11px;line-height:1.55;color:#c6dbe4;margin-top:10px;max-width:1100px}.q38Metrics{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.q38Metric{border:1px solid #31536b;background:#0a1b26;border-radius:999px;padding:6px 9px;font-size:7px;color:#8ea9b7}.q38Metric strong{color:#d9f8e4}.q38Candidates{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:11px}.q38Candidate{border:1px solid #2d5160;background:linear-gradient(165deg,#0a1d27,#07151e);border-radius:12px;padding:11px;min-height:132px}.q38Candidate.leading{border-color:#6fc79b;box-shadow:inset 0 0 28px #4bc8890d}.q38Name{font-size:9px;font-weight:800;color:#e8f5fb;word-break:break-word}.q38Lead{font-size:6px;color:#82e5ac;letter-spacing:.13em;text-transform:uppercase;min-height:12px;margin-bottom:5px}.q38Journey{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:7px;margin-top:9px}.q38Stage{border:1px solid #294657;background:#06141d;border-radius:9px;padding:8px}.q38Stage span{display:block;font-size:6px;color:#698797;text-transform:uppercase;letter-spacing:.11em}.q38Stage strong{display:block;font-size:19px;color:#dceff8;margin-top:2px}.q38Stage.final strong{color:#c9f5d8}.q38Arrow{font-size:16px;color:#64869a}.q38Delta{font-size:7px;color:#7794a3;margin-top:7px}.q38Conflict{margin-top:10px;border:1px solid #66552e;background:#211c0d;border-radius:9px;padding:8px;font-size:7px;color:#e6ca86;line-height:1.45}.q38Why{margin-top:10px;font-size:8px;line-height:1.55;color:#8fa8b6}.q38Why strong{color:#c9f5d8}@media(max-width:900px){.q38Candidates{grid-template-columns:1fr 1fr}.q38Trace{grid-template-columns:1fr 1fr}}@media(max-width:520px){.q38Candidates,.q38Trace{grid-template-columns:1fr}}
'''

_SCRIPT = r'''
<script>
const BUILD38_SEEDS={
 biology:{id:'cell-response',title:'Cell Response',audience:'Biology researchers',tagline:'Competing response states in one cell Logical Space.',description:'Cell signals and four plausible response states coexist without a supplied solution rule.',challenge:'Which response state remains best supported for cell-001 after robustness testing?',learning:'Watch evidence create a preference, then see how null-stabilization challenges that preference.',prompt:'Compare all candidate cell responses, preserve contradictions, and expose what survives robustness testing.',observations:['cell-001 | signal-high | pathway-a','cell-001 | stress-marker-low | nutrient-rich','cell-002 | signal-low | pathway-a'],subject:'cell-001',predicate:'response',candidates:'adaptive | stressed | dormant | apoptotic',evidence:['cell-001 | response | adaptive | 0.95','cell-001 | response | stressed | 0.70','cell-001 | response | dormant | 0.60','cell-001 | response | apoptotic | 0.52']},
 robotics:{id:'robot-navigation',title:'Robot Navigation',audience:'Robotics researchers',tagline:'Four competing navigation states under uncertainty.',description:'Obstacle observations and four candidate navigation states are represented without embedding a route policy in the starter space.',challenge:'Which navigation state survives the strongest robustness challenge for robot-001?',learning:'See a strong route preference weaken or survive when each logical dimension is challenged in turn.',prompt:'Compare route states, preserve uncertainty, and identify the robust leading candidate.',observations:['robot-001 | corridor-a | obstacle-low','robot-001 | corridor-b | obstacle-medium','robot-001 | battery-high | traction-good'],subject:'robot-001',predicate:'navigation-state',candidates:'direct | cautious | reroute | stop',evidence:['robot-001 | navigation-state | direct | 0.90','robot-001 | navigation-state | cautious | 0.70','robot-001 | navigation-state | reroute | 0.60','robot-001 | navigation-state | stop | 0.55']},
 materials:{id:'material-stability',title:'Material Stability',audience:'Materials researchers',tagline:'Four thermal states competing in one Logical Space.',description:'Heat exposure, coating observations and four possible stability states are represented together.',challenge:'Which material state remains most coherent for material-alpha?',learning:'See whether a strong material-state signal remains dominant after dimension-null robustness testing.',prompt:'Challenge all four candidate stability states and expose the stabilized distribution.',observations:['material-alpha | heat-high | coating-x','material-alpha | oxidation-low | lattice-dense','material-beta | heat-low | coating-x'],subject:'material-alpha',predicate:'stability-state',candidates:'stable | metastable | degrading | failed',evidence:['material-alpha | stability-state | stable | 0.94','material-alpha | stability-state | metastable | 0.73','material-alpha | stability-state | degrading | 0.59','material-alpha | stability-state | failed | 0.51']},
 software:{id:'service-state',title:'Service State',audience:'Software engineers',tagline:'Competing operational states for one service.',description:'Latency, dependency and load observations coexist with four candidate operational states.',challenge:'Which service state remains best supported for service-api?',learning:'Watch an evidence-driven diagnosis become a robustness-tested truth distribution rather than a one-shot label.',prompt:'Compare the four service states and show how much of the initial preference survives.',observations:['service-api | latency-high | dependency-db','service-api | queue-growing | cpu-medium','service-worker | latency-low | dependency-db'],subject:'service-api',predicate:'operational-state',candidates:'healthy | degraded | saturated | failing',evidence:['service-api | operational-state | healthy | 0.55','service-api | operational-state | degraded | 0.93','service-api | operational-state | saturated | 0.68','service-api | operational-state | failing | 0.52']}
};
function q38Set(id,value){const el=document.getElementById(id);if(el)el.value=value}
function q38Seed(seed){q38Set('builder-id',seed.id);q38Set('builder-title',seed.title);q38Set('builder-audience',seed.audience);q38Set('builder-mode','simulation');q38Set('builder-authority','');q38Set('builder-tagline',seed.tagline);q38Set('builder-description',seed.description);q38Set('builder-challenge',seed.challenge);q38Set('builder-learning',seed.learning);q38Set('builder-prompt',seed.prompt);q38Set('builder-observations',seed.observations.join('\n'));q38Set('session-subject',seed.subject);q38Set('session-predicate',seed.predicate);q38Set('session-candidates',seed.candidates);q38Set('session-evidence',seed.evidence.join('\n'))}
function q38Map(rows){const out={};(rows||[]).forEach(row=>out[row.value]=Number(row.probability||0));return out}
function q38Pct(value){return (100*Number(value||0)).toFixed(1)+'%'}
function quick38(result){
 const box=document.getElementById('quickResult'),text=document.getElementById('quickResultText'),bars=document.getElementById('quickResultBars');if(!box||!text||!bars)return;
 const base=q38Map(result.baseline),final=q38Map(result.stabilized),ordered=(result.stabilized||[]).map(row=>row.value),leaders=new Set(result.leading_candidates||[]),lead=(result.leading_candidates||[]).join(', ')||'unresolved';
 text.textContent='';bars.textContent='';
 const trace=document.createElement('div');trace.className='q38Trace';[['1 · CONDITIONS','4 explicit candidates'],['2 · ORACLES',String(result.explicit_evidence_count)+' evidence assertions'],['3 · NULL CHALLENGE','Each dimension removed in turn'],['4 · SYNTRACT','Robust distribution returned']].forEach(item=>{const d=document.createElement('div'),b=document.createElement('b'),s=document.createElement('span');b.textContent=item[0];s.textContent=item[1];d.append(b,s);trace.appendChild(d)});
 const summary=document.createElement('div');summary.className='q38Summary';const first=(result.baseline||[])[0];summary.textContent=(first?('Evidence initially pulled toward '+first.value+' at '+q38Pct(first.probability)+'. '):'')+'After robustness testing the leading state is '+lead+' at '+q38Pct((result.stabilized||[])[0]?.probability||0)+'.';
 const metrics=document.createElement('div');metrics.className='q38Metrics';[['candidate space',result.candidate_binary_space],['logical width',result.logical_width],['entropy',Number(result.entropy||0).toFixed(3)],['Reality effect',result.truth_effect_on_reality]].forEach(item=>{const m=document.createElement('span');m.className='q38Metric';m.innerHTML='<strong>'+item[0]+':</strong> '+item[1];metrics.appendChild(m)});
 const grid=document.createElement('div');grid.className='q38Candidates';ordered.forEach(name=>{const card=document.createElement('div');card.className='q38Candidate'+(leaders.has(name)?' leading':'');const tag=document.createElement('div');tag.className='q38Lead';tag.textContent=leaders.has(name)?'STABILIZED LEADER':'';const n=document.createElement('div');n.className='q38Name';n.textContent=name;const journey=document.createElement('div');journey.className='q38Journey';const a=document.createElement('div');a.className='q38Stage';a.innerHTML='<span>evidence pull</span><strong>'+q38Pct(base[name])+'</strong>';const arrow=document.createElement('div');arrow.className='q38Arrow';arrow.textContent='→';const f=document.createElement('div');f.className='q38Stage final';f.innerHTML='<span>stabilized</span><strong>'+q38Pct(final[name])+'</strong>';journey.append(a,arrow,f);const delta=document.createElement('div');delta.className='q38Delta';const dp=100*((final[name]||0)-(base[name]||0));delta.textContent='robustness shift '+(dp>=0?'+':'')+dp.toFixed(1)+' percentage points';card.append(tag,n,journey,delta);grid.appendChild(card)});
 const why=document.createElement('div');why.className='q38Why';why.innerHTML='<strong>What happened?</strong> The first distribution reflects the explicit evidence under the compiled oracle stack. QCDS then nulls each logical dimension and re-evaluates the space. The stabilized return shows what survives that challenge; it is not a forced winner.';
 box.append(trace,summary,metrics,grid,why);
 if((result.conflict_markers||[]).length){const c=document.createElement('div');c.className='q38Conflict';c.textContent='Conflict preserved · '+result.conflict_markers.join(' · ');box.appendChild(c)}
 box.classList.add('visible');box.scrollIntoView({behavior:'smooth',block:'nearest'});
}
async function runSeed38(){let payload;try{payload=sessionRequest();saveSessionNow()}catch(e){sessionStatus(e.message,'warn');return}sessionStatus(BUILD35_STATIC_MODE?'Loading the QCDS core and challenging this logical space…':'Running the logical space through the local QCDS core…');try{const result=BUILD35_STATIC_MODE?await runWasmCore(payload):await postJson('/api/session/run',payload);renderSessionResult(result);quick38(result);sessionStatus('Run complete · inspect the evidence pull, robustness shift and stabilized return.','good')}catch(e){sessionStatus(e.message,'warn')}}
window.trySeed=function(name){let seed=BUILD38_SEEDS[name];if(name==='surprise'){const keys=Object.keys(BUILD38_SEEDS);seed=BUILD38_SEEDS[keys[Math.floor(Math.random()*keys.length)]]}if(!seed)return;q38Seed(seed);runSeed38()};
</script>
'''


def living_robot_invite38_html(*, static_mode: bool = False) -> str:
    html = living_robot_invite_html(static_mode=static_mode)
    if "</style>" not in html or "</body>" not in html:
        raise RuntimeError("Living Logical Robot markup changed; BUILD 38 invitation cannot attach safely")
    html = html.replace("The quick experiments simply prefill the full lab and call the same core.", "Quick experiments use four competing candidates so you can see evidence pull, robustness challenge and stabilized return — through the same core.", 1)
    html = html.replace("</style>", _CSS + "\n</style>", 1)
    html = html.replace("</body>", _SCRIPT + "\n</body>", 1)
    return html


def export_static(path: str | Path) -> Path:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(living_robot_invite38_html(static_mode=True), encoding="utf-8")
    return target


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Export BUILD 38: richer quick experiments plus the unchanged advanced lab.")
    parser.add_argument("--export", required=True, help="Output HTML path")
    args = parser.parse_args(argv)
    export_static(args.export)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
