from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Sequence

from .learning_moment import recorded_verified_learning_moment
from .living_robot_experience import living_robot_experience_html


_CSS = r'''
/* BUILD 31: experience-only learning moment. No inference or truth authority. */
.learningMoment{max-width:1800px;margin:12px auto 0;padding:0 14px}.learnShell{position:relative;overflow:hidden;border:1px solid #39745a;background:radial-gradient(circle at 8% 0,#17392d 0,#0b1c21 36%,#08141f 78%);border-radius:18px;box-shadow:0 18px 60px #0005}.learnShell.fresh{animation:learnPulse 1.7s ease-out}.learnShell.fresh:before{content:"";position:absolute;inset:-40%;background:radial-gradient(circle,#79e5a72b 0,transparent 58%);animation:learnSweep 1.7s ease-out;pointer-events:none}.learnTop{display:flex;align-items:flex-start;gap:16px;padding:17px 19px;border-bottom:1px solid #28503e}.learnTitle{flex:1}.learnKicker{font-size:8px;letter-spacing:.18em;text-transform:uppercase;color:#91c7a6}.learnTitle h2{font-size:25px;line-height:1.05;margin:5px 0 6px;color:#ecfff3}.learnTitle p{font-size:10px;line-height:1.55;color:#a5bdb1;margin:0;max-width:900px}.learnBadge{font-size:8px;letter-spacing:.12em;text-transform:uppercase;border:1px solid #3f765b;background:#102a20;color:#b9f6ce;border-radius:999px;padding:7px 10px;white-space:nowrap}.learnBadge.recorded{border-color:#675280;background:#211a2d;color:#dbc9ff}.learnCore{display:grid;grid-template-columns:.85fr 1.15fr;gap:1px;background:#234638}.learnRule,.learnCapability{background:#091923;padding:15px 18px;min-height:168px}.learnRule{background:linear-gradient(145deg,#0d241d,#091923 72%)}.learnLabel{font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:#83a99a}.learnRuleText{font-size:27px;font-weight:820;margin:8px 0 7px;word-break:break-word;color:#f2fff6}.learnRuleText .arrow{color:#79e5a7}.learnMeta{font-size:9px;color:#8da99e;line-height:1.55}.learnGain{margin-top:11px;display:inline-flex;align-items:center;gap:7px;border:1px solid #367956;background:#0c271d;color:#baffd0;border-radius:10px;padding:8px 10px;font-size:9px;font-weight:760}.learnCapability h3{margin:0 0 9px;font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#87a79b}.capGrid{display:grid;grid-template-columns:1fr 34px 1fr;gap:7px}.capSide{border:1px solid #294b5e;background:#0b1e2b;border-radius:11px;padding:10px;min-height:90px}.capSide.after{border-color:#397a59;background:#0b251c}.capSide label{display:block;font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:#839eae}.capSide b{display:block;font-size:14px;margin:6px 0 3px;word-break:break-word}.capSide p{font-size:8px;color:#819bad;line-height:1.45;margin:0}.capArrow{display:grid;place-items:center;color:#79e5a7;font-size:22px}.learnMetrics{display:grid;grid-template-columns:repeat(6,1fr);gap:1px;background:#1d3d32;border-top:1px solid #28503e}.learnMetric{background:#091923;padding:11px 12px;min-height:77px}.learnMetric b{display:block;font-size:21px;color:#effff4}.learnMetric span{display:block;font-size:7px;text-transform:uppercase;letter-spacing:.1em;color:#83a395;margin-top:3px;line-height:1.35}.learnMetric.truth b{color:#8ff0b1}.learnJourney{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;padding:12px 17px;border-top:1px solid #19372d;background:#081722}.journeyStep{position:relative;border:1px solid #284759;background:#0a1d29;border-radius:10px;padding:9px;min-height:69px}.journeyStep:not(:last-child):after{content:"→";position:absolute;right:-9px;top:24px;color:#4f7868;z-index:3}.journeyStep.done{border-color:#376f54;background:#0b211a}.journeyStep b{display:block;font-size:9px}.journeyStep span{display:block;font-size:7px;color:#829dad;margin-top:5px;line-height:1.35}.learnWhy{padding:10px 17px;border-top:1px solid #19372d;background:#091923;color:#99b3a8;font-size:9px;line-height:1.55}.learnWhy strong{color:#c6f9d7}.learnActions{display:flex;gap:7px;flex-wrap:wrap;padding:0 17px 15px;background:#091923}.learnActions button{font-size:9px}.learnActions .primary{box-shadow:0 0 22px #79e5a71e}.learnNoLogic{padding:20px;font-size:13px;color:#b2c5ce}.learnNoLogic b{display:block;color:#f0f7fa;font-size:20px;margin-bottom:7px}.learnNoLogic p{font-size:9px;line-height:1.55;color:#849eae;max-width:760px}.learnProgress{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}.learnProgress div{border:1px solid #29495d;background:#0a1d29;border-radius:9px;padding:9px}.learnProgress b{font-size:17px;margin:0}.learnProgress span{font-size:7px;color:#809aab;text-transform:uppercase;display:block;margin-top:2px}@keyframes learnPulse{0%{box-shadow:0 0 0 #79e5a700,0 18px 60px #0005}25%{box-shadow:0 0 45px #79e5a755,0 18px 60px #0005}100%{box-shadow:0 18px 60px #0005}}@keyframes learnSweep{0%{transform:translateX(-35%);opacity:0}25%{opacity:1}100%{transform:translateX(35%);opacity:0}}@media(max-width:1050px){.learnCore{grid-template-columns:1fr}.learnMetrics{grid-template-columns:repeat(3,1fr)}.learnJourney{grid-template-columns:repeat(3,1fr)}.journeyStep:after{display:none}}@media(max-width:700px){.learningMoment{padding:0 8px;margin-top:8px}.learnTop{flex-direction:column}.learnTitle h2{font-size:21px}.learnMetrics{grid-template-columns:1fr 1fr}.learnJourney{grid-template-columns:1fr 1fr}.capGrid{grid-template-columns:1fr}.capArrow{height:24px;transform:rotate(90deg)}.learnRuleText{font-size:22px}}
'''

_PANEL = r'''
<section class="learningMoment" id="learning-moment" aria-live="polite">
  <div id="learnShell" class="learnShell">
    <div class="learnTop">
      <div class="learnTitle"><div class="learnKicker">Latest logical capability change</div><h2 id="learnHeadline">WAITING FOR GOVERNED LOGIC</h2><p id="learnMessage">The robot can collect evidence and form candidate logic without having learned anything yet. This panel changes only when governed logic actually changes what Reality can resolve.</p></div>
      <div id="learnBadge" class="learnBadge">LIVE RUNTIME</div>
    </div>
    <div id="learnBody"><div class="learnNoLogic"><b>NO PROMOTED LOGIC YET</b><p>Run one frontier step or continuous intelligence. A learning event appears only after observation → competing logic → challenge → governance produces a reusable Reality rule.</p><div class="learnProgress"><div><b>0</b><span>new governed rule</span></div><div><b>0</b><span>capability gain shown</span></div><div><b>0</b><span>UI truth authority</span></div></div></div></div>
  </div>
</section>
'''

_SCRIPT_TEMPLATE = r'''
<script>
const BUILD31_STATIC_LEARNING=__STATIC_LEARNING__;
let build31LastLearningId=null,build31Initialized=false,build31Data=null;
function lEsc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function lNum(v){return v===null||v===undefined?'—':String(v)}
function lPct(v){return v===null||v===undefined?'—':Math.round(Number(v)*1000)/10+'%'}
function lTerms(v){return Array.isArray(v)&&v.length?v.join(' · '):'unresolved'}
function lMetric(value,label,cls=''){return '<div class="learnMetric '+cls+'"><b>'+lEsc(lNum(value))+'</b><span>'+lEsc(label)+'</span></div>'}
function lJourney(title,detail,done=true){return '<div class="journeyStep '+(done?'done':'')+'"><b>'+lEsc(title)+'</b><span>'+lEsc(detail)+'</span></div>'}
function renderLearningMoment(data,{recorded=false}={}){
  build31Data=data||{};const shell=document.getElementById('learnShell'),body=document.getElementById('learnBody'),headline=document.getElementById('learnHeadline'),message=document.getElementById('learnMessage'),badge=document.getElementById('learnBadge');if(!shell||!body)return;
  const id=data?.learning_id||null;
  if(build31Initialized&&id&&build31LastLearningId&&id!==build31LastLearningId&&!recorded){shell.classList.remove('fresh');void shell.offsetWidth;shell.classList.add('fresh');setTimeout(()=>shell.classList.remove('fresh'),1900)}
  build31Initialized=true;if(id)build31LastLearningId=id;
  badge.textContent=recorded?'RECORDED VERIFIED PROOF':'LIVE RUNTIME';badge.className='learnBadge '+(recorded?'recorded':'');
  if(!data||data.status!=='learned'||!data.promotion){headline.textContent='NO PROMOTED LOGIC YET';message.textContent=data?.message||'No governed logical capability gain has been recorded yet.';body.innerHTML='<div class="learnNoLogic"><b>OBSERVING / TESTING ≠ LEARNING</b><p>Evidence and candidate rules may exist, but this panel will not announce learning until a governed rule changes the resolved Reality space.</p><div class="learnProgress"><div><b>0</b><span>promoted capability shown</span></div><div><b>—</b><span>still testing / waiting</span></div><div><b>0</b><span>UI truth authority</span></div></div></div>';return}
  const p=data.promotion||{},c=data.capability_change||{},d=data.discovery||{},g=d.governance||{},t=data.truth_boundary||{};
  headline.textContent=data.headline||'THE LOGICAL ROBOT LEARNED SOMETHING';message.textContent=data.message||'';
  const rule=(p.rule_text||p.rule_id||'governed rule').replace('=>','⇒');
  const added=(c.added_terms||[]).join(', ')||((p.emit_terms||[]).join(', '))||'new resolved logic';
  const linked=d.linked===true;
  const baseUnchanged=d.base_space_unchanged_by_derived_logic===true;
  body.innerHTML='<div class="learnCore"><div class="learnRule"><div class="learnLabel">New reusable logic</div><div class="learnRuleText">'+lEsc(rule)+'</div><div class="learnMeta">rule '+lEsc(p.rule_id||'—')+' · version '+lEsc(p.version||'—')+' · confidence '+lEsc(p.confidence??'—')+'</div><div class="learnGain">+ CAPABILITY: '+lEsc(added)+'</div></div><div class="learnCapability"><h3>What changed in intelligence?</h3><div class="capGrid"><div class="capSide"><label>Before this rule</label><b>'+lEsc(lTerms(c.before))+'</b><p>This resolved view did not yet contain the newly derived term.</p></div><div class="capArrow">→</div><div class="capSide after"><label>After this rule</label><b>'+lEsc(lTerms(c.after))+'</b><p>'+lEsc(c.resolved_bindings_changed||0)+' Reality binding(s) changed resolved state; +'+lEsc(c.new_resolved_term_instances||0)+' derived term instance(s).</p></div></div></div></div>'+
    '<div class="learnMetrics">'+lMetric(linked?d.rival_hypotheses:null,'rival hypotheses evaluated')+lMetric(linked?d.hypotheses_rejected:null,'rejected by challenge')+lMetric(linked?d.robot_observations:null,'evidence observations')+lMetric(linked?d.independent_sources:null,'distinct source references')+lMetric(linked?d.oracles_promoted:null,'oracle promotion(s)')+lMetric(t.browser_direct_truth_authority??0,'UI direct truth authority','truth')+'</div>'+
    '<div class="learnJourney">'+lJourney('1 · GAP',linked?lNum(d.oracle_gaps)+' oracle gap(s)':'gap identified',true)+lJourney('2 · RIVALS',linked?lNum(d.rival_hypotheses)+' evaluated':'candidate logic',true)+lJourney('3 · OBSERVE',linked?lNum(d.robot_observations)+' observation(s)':'evidence acquired',true)+lJourney('4 · FALSIFY',linked?lNum(d.hypotheses_rejected)+' rejected':'challenge / holdout',true)+lJourney('5 · GOVERN',g.status?String(g.status).replaceAll('_',' '):'governed Reality rule',true)+lJourney('6 · LEARN','Reality resolves more',true)+'</div>'+
    '<div class="learnWhy"><strong>This counts as learning here because:</strong> the active governed rule changes the resolved logical space. '+(linked?'The discovery audit links this rule to its gap, rival hypotheses, observations and challenge. ':'Detailed discovery counts are unavailable for this promotion, so the UI does not invent them. ')+(baseUnchanged?'Derived logic changed the resolved view without rewriting the base logical-space rows. ':'')+(g.changed_fraction!==null&&g.changed_fraction!==undefined?' Logical blast radius: '+lPct(g.changed_fraction)+'.':'')+'</div>'+
    '<div class="learnActions"><button class="primary" onclick="openLogicInspector()">WHY THIS LOGIC?</button><button onclick="focusLearnedLogic()">SHOW IT IN LOGICAL SPACE</button><button id="learnNextButton" onclick="runNextStep()">TRY NEXT UNKNOWN</button><button onclick="document.getElementById(\'understand-build\').scrollIntoView({behavior:\'smooth\'})">BUILD ON THIS</button></div>';
  const next=document.getElementById('learnNextButton');if(next&&recorded){next.disabled=true;next.title='Recorded proof is read-only; open Codespaces for a live runtime.'}
}
function focusLearnedLogic(){const p=build31Data?.promotion||{},terms=p.emit_terms||build31Data?.capability_change?.added_terms||[];const term=terms[0];if(!term)return;const q=document.getElementById('search');if(q){q.value=term;if(typeof renderGraph==='function')renderGraph()}const a=document.querySelector('.graphWrap');if(a)a.scrollIntoView({behavior:'smooth',block:'center'})}
async function refreshLearningMoment(){
  try{
    if(typeof API==='undefined'||!API){renderLearningMoment(BUILD31_STATIC_LEARNING,{recorded:true});return}
    if(typeof getJson!=='function')return;
    const data=await getJson('/api/learning');renderLearningMoment(data,{recorded:false});
  }catch(e){const msg=document.getElementById('learnMessage');if(msg)msg.textContent='Learning view temporarily unavailable; runtime health is handled separately.'}
}
setTimeout(refreshLearningMoment,250);setInterval(refreshLearningMoment,1800);
</script>
'''


def living_robot_learning_html(*, static_mode: bool = False) -> str:
    """Layer a truthful BUILD 31 learning moment over the BUILD 30 experience."""
    html = living_robot_experience_html(static_mode=static_mode)
    if "</style>" not in html or '<section class="understandBuild"' not in html or "</body>" not in html:
        raise RuntimeError("BUILD 30 markup changed; BUILD 31 overlay cannot attach safely")
    html = html.replace("</style>", _CSS + "\n</style>", 1)
    html = html.replace('<section class="understandBuild"', _PANEL + '\n<section class="understandBuild"', 1)
    static_payload = recorded_verified_learning_moment() if static_mode else {
        "status": "no_promoted_logic",
        "learning_id": None,
    }
    script = _SCRIPT_TEMPLATE.replace("__STATIC_LEARNING__", json.dumps(static_payload, ensure_ascii=False))
    html = html.replace("</body>", script + "\n</body>", 1)
    return html


def export_static(path: str | Path) -> Path:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(living_robot_learning_html(static_mode=True), encoding="utf-8")
    return target


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Export the BUILD 31 Logical Robot learning-moment page.")
    parser.add_argument("--export", required=True, help="Output HTML path")
    args = parser.parse_args(argv)
    export_static(args.export)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
