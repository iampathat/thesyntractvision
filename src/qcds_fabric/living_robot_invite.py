from __future__ import annotations

import argparse
from pathlib import Path
from typing import Sequence

from .living_robot_session import living_robot_session_html


_CSS = r'''
/* BUILD 37: fast invitation layer. The full advanced Logical Robot remains below. */
.invite{max-width:1800px;margin:14px auto 0;padding:0 14px}.inviteInner{position:relative;overflow:hidden;border:1px solid #3b6a60;background:radial-gradient(circle at 82% 5%,#183c35 0,#0b2426 30%,#081722 68%,#07111a 100%);border-radius:20px;padding:22px;box-shadow:0 22px 70px #0006}.inviteInner:after{content:"";position:absolute;width:330px;height:330px;right:-120px;top:-170px;border:1px solid #78dca744;border-radius:50%;box-shadow:0 0 80px #65d69a18;pointer-events:none}.inviteTop{display:flex;gap:18px;align-items:flex-start;position:relative;z-index:1}.inviteCopy{flex:1}.inviteKicker{font-size:8px;letter-spacing:.18em;text-transform:uppercase;color:#82e5ac}.invite h2{font-size:31px;line-height:1.08;margin:5px 0 8px;max-width:900px}.inviteLead{font-size:11px;line-height:1.6;color:#a5bdc9;max-width:920px;margin:0}.invitePromise{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;min-width:360px}.invitePromise div{border:1px solid #31584d;background:#0a211caa;border-radius:10px;padding:9px}.invitePromise b{display:block;color:#c7f8d9;font-size:9px}.invitePromise span{display:block;color:#789c8d;font-size:7px;line-height:1.4;margin-top:3px}.seedGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-top:18px;position:relative;z-index:1}.seed{display:flex;flex-direction:column;min-height:145px;border:1px solid #2a4d5e;background:#081923e6;border-radius:13px;padding:13px;transition:transform .15s,border-color .15s,background .15s}.seed:hover{transform:translateY(-2px);border-color:#67b890;background:#0a2025}.seedTag{font-size:7px;letter-spacing:.13em;text-transform:uppercase;color:#79dba4}.seed h3{font-size:15px;margin:6px 0 5px}.seed p{font-size:8px;line-height:1.5;color:#8fa8b6;margin:0 0 11px;flex:1}.seed button{align-self:flex-start;border:1px solid #d9f8e4;background:#d9f8e4;color:#082117;border-radius:8px;padding:8px 10px;font-size:8px;font-weight:800;cursor:pointer}.inviteBottom{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-top:12px;position:relative;z-index:1}.inviteBottom button{border:1px solid #31536b;background:#102638;color:#eef8ff;border-radius:9px;padding:9px 11px;font-size:8px;font-weight:760;cursor:pointer}.inviteBottom button.advanced{border-color:#7967a2;color:#dfd3ff;background:#211b31}.inviteBottom span{font-size:8px;color:#7391a1}.quickResult{margin-top:12px;border:1px solid #31536b;background:#06131c;border-radius:12px;padding:12px;display:none;position:relative;z-index:1}.quickResult.visible{display:block}.quickResultTitle{font-size:8px;letter-spacing:.13em;color:#82e5ac;text-transform:uppercase}.quickResultText{font-size:10px;line-height:1.5;color:#b8cfda;margin-top:5px}.quickResultBars{display:flex;flex-direction:column;gap:6px;margin-top:9px}.quickBarRow{display:grid;grid-template-columns:110px 1fr 56px;gap:8px;align-items:center;font-size:8px;color:#91aab7}.quickTrack{height:8px;background:#132937;border-radius:99px;overflow:hidden}.quickFill{height:100%;background:linear-gradient(90deg,#77dca3,#8bd3ff);border-radius:99px}.inviteFoot{font-size:7px;color:#668391;margin-top:10px;position:relative;z-index:1}@media(max-width:1050px){.inviteTop{display:block}.invitePromise{margin-top:13px;min-width:0}.seedGrid{grid-template-columns:1fr 1fr}}@media(max-width:620px){.invite{padding:0 8px}.inviteInner{padding:17px}.invite h2{font-size:25px}.invitePromise{grid-template-columns:1fr}.seedGrid{grid-template-columns:1fr}.quickBarRow{grid-template-columns:80px 1fr 50px}}
'''

_SECTION = r'''
<section class="invite" id="try-logical-robot">
  <div class="inviteInner">
    <div class="inviteTop">
      <div class="inviteCopy">
        <div class="inviteKicker">THE LOGICAL ROBOT · TRY THE BLUEPRINT</div>
        <h2>Pick a world. Ask a question. See what the logical space does.</h2>
        <p class="inviteLead">This is the easy door into The Syntract Vision: a public playground for an experimental superintelligence architecture. No setup and no account. Choose a seed experiment below, run the same QCDS core used by the advanced lab, then change anything you want.</p>
      </div>
      <div class="invitePromise">
        <div><b>REAL CORE</b><span>Same qcds_fabric inference path.</span></div>
        <div><b>SESSION ONLY</b><span>Close the tab and the room disappears.</span></div>
        <div><b>ADVANCED LAB BELOW</b><span>Every field and control is still there.</span></div>
      </div>
    </div>
    <div class="seedGrid">
      <article class="seed"><span class="seedTag">Biology</span><h3>Which signal matters?</h3><p>Start with conflicting cell-state observations and inspect what the represented evidence actually supports.</p><button type="button" onclick="trySeed('biology')">TRY BIOLOGY →</button></article>
      <article class="seed"><span class="seedTag">Robotics</span><h3>Which route remains coherent?</h3><p>Give a robot competing route states and let the logical space preserve uncertainty instead of hiding it.</p><button type="button" onclick="trySeed('robotics')">TRY ROBOTICS →</button></article>
      <article class="seed"><span class="seedTag">Materials</span><h3>Which material state survives?</h3><p>Explore a tiny materials space where thermal-state candidates are challenged by explicit evidence.</p><button type="button" onclick="trySeed('materials')">TRY MATERIALS →</button></article>
      <article class="seed"><span class="seedTag">Software</span><h3>Where is the failure state?</h3><p>Represent competing system states and see the result as a distribution rather than a confident guess.</p><button type="button" onclick="trySeed('software')">TRY SOFTWARE →</button></article>
    </div>
    <div class="inviteBottom">
      <button type="button" onclick="trySeed('surprise')">SURPRISE ME</button>
      <button type="button" class="advanced" onclick="openAdvancedLab()">OPEN ADVANCED LOGICAL SPACE LAB →</button>
      <span>The quick experiments simply prefill the full lab and call the same core.</span>
    </div>
    <div class="quickResult" id="quickResult"><div class="quickResultTitle">QCDS CORE · RESULT</div><div class="quickResultText" id="quickResultText"></div><div class="quickResultBars" id="quickResultBars"></div></div>
    <div class="inviteFoot">Research playground, not a claim that the current reference implementation has achieved AGI or ASI. The long-range architecture targets increasingly general and superintelligent capability.</div>
  </div>
</section>
'''

_SCRIPT = r'''
<script>
const BUILD37_SEEDS={
 biology:{id:'cell-signal',title:'Cell Signal',audience:'Biology researchers',tagline:'A tiny cell-state Logical Space.',description:'Signals, cells and candidate response states coexist as explicit represented terms.',challenge:'Which response state is better supported for cell-001?',learning:'See whether explicit evidence changes the candidate distribution without supplying a solution rule.',prompt:'Inspect uncertainty and distinguish the represented response states.',observations:['cell-001 | signal-high | pathway-a','cell-002 | signal-low | pathway-a'],subject:'cell-001',predicate:'response',candidates:'adaptive | stressed',evidence:['cell-001 | response | adaptive | 0.92','cell-001 | response | stressed | 0.62']},
 robotics:{id:'robot-route',title:'Robot Route',audience:'Robotics researchers',tagline:'Competing route states in an isolated Logical Space.',description:'Route observations, obstacle states and candidate navigation outcomes are represented without a supplied policy.',challenge:'Which route state remains better supported for robot-001?',learning:'Preserve uncertainty while comparing explicit route evidence.',prompt:'Challenge the route candidates and expose what remains unresolved.',observations:['robot-001 | corridor-a | obstacle-low','robot-001 | corridor-b | obstacle-high'],subject:'robot-001',predicate:'route-state',candidates:'route-a | route-b',evidence:['robot-001 | route-state | route-a | 0.88','robot-001 | route-state | route-b | 0.68']},
 materials:{id:'thermal-material',title:'Thermal Material',audience:'Materials researchers',tagline:'A tiny thermal-state Logical Space.',description:'Materials, heat exposure and candidate stability states coexist as represented terms.',challenge:'Which thermal stability state is better supported for material-alpha?',learning:'Inspect whether the core preserves and reshapes a bounded candidate distribution.',prompt:'Compare the candidate thermal states and identify remaining uncertainty.',observations:['material-alpha | heat-high | coating-x','material-beta | heat-low | coating-x'],subject:'material-alpha',predicate:'thermal-stability',candidates:'stable | unstable',evidence:['material-alpha | thermal-stability | stable | 0.90','material-alpha | thermal-stability | unstable | 0.60']},
 software:{id:'service-failure',title:'Service Failure',audience:'Software engineers',tagline:'Competing service states in one Logical Space.',description:'Service observations and candidate failure states are represented explicitly rather than collapsed into a single guess.',challenge:'Which state is better supported for service-api?',learning:'See a software diagnosis remain inspectable as a distribution.',prompt:'Challenge competing service states and show what evidence would discriminate them.',observations:['service-api | latency-high | dependency-db','service-worker | latency-low | dependency-db'],subject:'service-api',predicate:'state',candidates:'healthy | degraded',evidence:['service-api | state | degraded | 0.91','service-api | state | healthy | 0.58']}
};
function set37(id,value){const el=document.getElementById(id);if(el)el.value=value}
function seed37(seed){
 set37('builder-id',seed.id);set37('builder-title',seed.title);set37('builder-audience',seed.audience);set37('builder-mode','simulation');set37('builder-authority','');set37('builder-tagline',seed.tagline);set37('builder-description',seed.description);set37('builder-challenge',seed.challenge);set37('builder-learning',seed.learning);set37('builder-prompt',seed.prompt);set37('builder-observations',seed.observations.join('\n'));set37('session-subject',seed.subject);set37('session-predicate',seed.predicate);set37('session-candidates',seed.candidates);set37('session-evidence',seed.evidence.join('\n'));
}
function openAdvancedLab(){if(typeof openSpaceBuilder==='function')openSpaceBuilder();const panel=document.getElementById('custom-space-builder');if(panel)panel.scrollIntoView({behavior:'smooth',block:'start'})}
function quick37(result){const box=document.getElementById('quickResult'),text=document.getElementById('quickResultText'),bars=document.getElementById('quickResultBars');if(!box||!text||!bars)return;const lead=(result.leading_candidates||[]).join(', ')||'unresolved';text.textContent=result.probe.subject+' · '+result.probe.predicate+' → leading: '+lead+' · logical width '+result.logical_width+' · Reality effect '+result.truth_effect_on_reality;bars.textContent='';(result.stabilized||[]).forEach(row=>{const r=document.createElement('div');r.className='quickBarRow';const label=document.createElement('span');label.textContent=row.value;const track=document.createElement('div');track.className='quickTrack';const fill=document.createElement('div');fill.className='quickFill';fill.style.width=Math.max(1,Math.min(100,row.probability*100))+'%';track.appendChild(fill);const pct=document.createElement('span');pct.textContent=(row.probability*100).toFixed(2)+'%';r.append(label,track,pct);bars.appendChild(r)});box.classList.add('visible');box.scrollIntoView({behavior:'smooth',block:'nearest'})}
async function runSeed37(){let payload;try{payload=sessionRequest();saveSessionNow()}catch(e){sessionStatus(e.message,'warn');return}sessionStatus(BUILD35_STATIC_MODE?'Loading the QCDS core for this experiment…':'Running this experiment through the local QCDS core…');try{const result=BUILD35_STATIC_MODE?await runWasmCore(payload):await postJson('/api/session/run',payload);renderSessionResult(result);quick37(result);sessionStatus('Experiment complete · change one thing or open the advanced lab.','good')}catch(e){sessionStatus(e.message,'warn')}}
function trySeed(name){let seed=BUILD37_SEEDS[name];if(name==='surprise'){const keys=Object.keys(BUILD37_SEEDS);seed=BUILD37_SEEDS[keys[Math.floor(Math.random()*keys.length)]]}if(!seed)return;seed37(seed);runSeed37()}
</script>
'''


def living_robot_invite_html(*, static_mode: bool = False) -> str:
    html = living_robot_session_html(static_mode=static_mode)
    if "</header>" not in html or "</style>" not in html or "</body>" not in html:
        raise RuntimeError("Living Logical Robot markup changed; BUILD 37 invitation cannot attach safely")
    html = html.replace("</style>", _CSS + "\n</style>", 1)
    html = html.replace("</header>", "</header>\n" + _SECTION, 1)
    html = html.replace("</body>", _SCRIPT + "\n</body>", 1)
    return html


def export_static(path: str | Path) -> Path:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(living_robot_invite_html(static_mode=True), encoding="utf-8")
    return target


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Export BUILD 37: quick-start plus advanced Logical Robot lab.")
    parser.add_argument("--export", required=True, help="Output HTML path")
    args = parser.parse_args(argv)
    export_static(args.export)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
