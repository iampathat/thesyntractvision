from __future__ import annotations

import argparse
from pathlib import Path
from typing import Sequence

from .living_robot_ui import living_robot_html


_CSS = r'''
/* BUILD 30: pedagogical/extension overlay only. */
.understandBuild{max-width:1800px;margin:12px auto 0;padding:0 14px}.ubShell{border:1px solid #294d63;background:linear-gradient(135deg,#0a1925ed,#091520ed);border-radius:16px;overflow:hidden;box-shadow:0 14px 45px #0004}.ubHead{display:flex;gap:16px;align-items:flex-start;padding:16px 18px;border-bottom:1px solid #1e384b}.ubHead>div:first-child{flex:1}.ubHead h2{font-size:18px;margin:3px 0 5px}.ubHead p{margin:0;max-width:900px;color:#91aabb;font-size:10px;line-height:1.55}.ubTag{font-size:8px;letter-spacing:.16em;text-transform:uppercase;color:#8daabb}.ubGrid{display:grid;grid-template-columns:1.05fr .95fr}.ubExplain,.ubBuild{padding:15px 17px}.ubExplain{border-right:1px solid #1c3548}.plainFlow{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}.plainStep{border:1px solid #294a60;background:#0c2030;border-radius:11px;padding:11px;min-height:105px}.plainStep:nth-child(2){border-color:#725b37}.plainStep:nth-child(3){border-color:#367956;background:#0c241d}.plainStep b{display:block;font-size:11px;margin-bottom:5px}.plainStep p{font-size:9px;color:#8fa8b9;line-height:1.5;margin:0}.plainStep .num{display:inline-grid;place-items:center;width:20px;height:20px;border-radius:50%;background:#163247;color:#9fd8f8;margin-bottom:8px;font-size:9px}.plainStep:nth-child(2) .num{background:#3a3020;color:#f0c77f}.plainStep:nth-child(3) .num{background:#153c2b;color:#a9f3c3}.ubActions{display:flex;gap:7px;flex-wrap:wrap;margin-top:11px}.inspectBox{display:none;margin-top:10px;border:1px solid #2d5269;background:#071722;border-radius:11px;padding:11px}.inspectBox.open{display:block}.inspectBox h3{font-size:10px;margin:0 0 7px;color:#b8d2e2}.inspectBox pre{white-space:pre-wrap;word-break:break-word;font-size:8px;color:#91adbf;margin:0;max-height:230px;overflow:auto}.buildCards{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.buildCard{display:block;text-decoration:none;color:#edf8ff;border:1px solid #294a60;background:#0b1d2b;border-radius:11px;padding:11px;min-height:100px;transition:.15s}.buildCard:hover{transform:translateY(-1px);border-color:#5aa0c7;background:#0d2433}.buildCard b{display:block;font-size:10px;margin-bottom:5px}.buildCard span{font-size:8px;color:#8da8ba;line-height:1.45;display:block}.buildCard em{display:block;font-style:normal;font-size:8px;color:#7ee0a3;margin-top:8px}.starter{margin-top:10px;padding:10px;border-radius:10px;border:1px dashed #36576d;color:#98b0c0;font-size:9px;line-height:1.55}.starter strong{color:#dff8e8}.tryRow{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.tryChip{border-radius:999px;padding:7px 9px;font-size:8px;font-weight:700;background:#0c2332}.tryChip.good{border-color:#377657;color:#aef1c5}.lesson{margin-top:9px;color:#88a3b5;font-size:8px}.lesson strong{color:#b7ffd0}@media(max-width:1000px){.ubGrid{grid-template-columns:1fr}.ubExplain{border-right:0;border-bottom:1px solid #1c3548}}@media(max-width:700px){.plainFlow,.buildCards{grid-template-columns:1fr}.ubHead{flex-direction:column}.understandBuild{padding:0 8px;margin-top:8px}}
'''

_PANEL = r'''
<section class="understandBuild" id="understand-build">
  <div class="ubShell">
    <div class="ubHead">
      <div><div class="ubTag">Understand → inspect → build</div><h2>See the difference between finding information and building logic.</h2><p>Evidence can arrive from a human, the web or another body. It does not become truth. The Logical Robot forms candidate logic, tries to falsify it, and only governed surviving logic changes what Reality can resolve.</p></div>
      <div class="ubActions"><button onclick="document.getElementById('growthHeroAnchor').scrollIntoView({behavior:'smooth'})">SEE INTELLIGENCE CHANGE</button><button class="primary" onclick="openLogicInspector()">WHY THIS LOGIC?</button></div>
    </div>
    <div class="ubGrid">
      <div class="ubExplain">
        <div class="ubTag">What you are looking at</div>
        <div class="plainFlow">
          <div class="plainStep"><span class="num">1</span><b>OBSERVATION</b><p>Something was seen, read or supplied. It is source-attributed evidence — not automatic truth.</p></div>
          <div class="plainStep"><span class="num">2</span><b>CANDIDATE LOGIC</b><p>The system proposes competing explanations/rules and looks for evidence that can distinguish them.</p></div>
          <div class="plainStep"><span class="num">3</span><b>PROMOTED LOGIC</b><p>A surviving governed rule becomes reusable logic. The resolved Reality view can now derive something it could not derive before.</p></div>
        </div>
        <div class="tryRow"><button class="tryChip" onclick="quickTry('dialogue','What are you uncertain about right now?',9)">ASK WHAT IT DOESN'T KNOW</button><button class="tryChip" onclick="quickTry('explore_domain','quantum biology',20)">EXPLORE A DOMAIN</button><button class="tryChip" onclick="quickTry('build_frontier','photosynthesis',18)">BUILD A FRONTIER</button><button class="tryChip good" onclick="runNextStep()">RUN ONE LOGICAL STEP</button></div>
        <div id="logicInspector" class="inspectBox"><h3>WHY THIS LOGIC?</h3><pre id="logicInspectorText">No growth snapshot loaded yet.</pre></div>
        <div class="lesson"><strong>The key test:</strong> after a successful cycle, can Reality resolve something it could not resolve before — without the missing answer having been supplied as the rule?</div>
      </div>
      <div class="ubBuild">
        <div class="ubTag">Build on this</div>
        <div class="buildCards">
          <a class="buildCard" target="_blank" rel="noopener" href="https://github.com/iampathat/thesyntractvision/blob/main/CONTRIBUTING.md#build-a-new-logical-robot-body--observer"><b>ADD A ROBOT BODY / OBSERVER</b><span>Connect a public API, paper/file reader, simulation, scientific instrument or physical sensor.</span><em>observe → evidence → same intelligence</em></a>
          <a class="buildCard" target="_blank" rel="noopener" href="https://github.com/iampathat/thesyntractvision/blob/main/CONTRIBUTING.md#falsify-an-oracle-or-inference-behavior"><b>FALSIFY / BUILD AN ORACLE</b><span>Create a test that can kill a weak hypothesis, expose source bias, contradiction or oracle dominance.</span><em>strong failures are useful contributions</em></a>
          <a class="buildCard" target="_blank" rel="noopener" href="https://github.com/iampathat/thesyntractvision/blob/main/LOGICAL_UNIVERSE_TEMPLATE.md"><b>BUILD A LOGICAL UNIVERSE</b><span>Start with a bounded science, engineering, game, rulebook or simulation world with explicit falsifiers.</span><em>small universe → deep logic</em></a>
          <a class="buildCard" target="_blank" rel="noopener" href="https://github.com/iampathat/thesyntractvision/blob/main/CONTRIBUTING.md#improve-the-living-logical-robot"><b>MAKE THE LOGIC VISIBLE</b><span>Improve large-space projection, Syntract highlighting, provenance, null/rotation views or another robot manifestation.</span><em>UI is a body, never the intelligence</em></a>
          <a class="buildCard" target="_blank" rel="noopener" href="https://github.com/iampathat/thesyntractvision/blob/main/CONTRIBUTING.md#add-a-benchmark"><b>BREAK OR BENCHMARK IT</b><span>Publish a falsifiable workload with exact commit, raw result, assertions and explicit claim boundaries.</span><em>prove what changes — and what doesn't</em></a>
          <a class="buildCard" target="_blank" rel="noopener" href="https://github.com/iampathat/thesyntractvision"><b>OPEN THE REPOSITORY</b><span>Read the architecture, inspect the implementation or fork it. The project is deliberately layered for extension.</span><em>GitHub → code → tests → PR</em></a>
        </div>
        <div class="starter"><strong>Good first build:</strong> choose one bounded domain you know well, add one observation source, define a falsifier that can reject a wrong logical candidate, then watch whether the resolved logical space genuinely gains capability.</div>
      </div>
    </div>
  </div>
</section>
'''

_SCRIPT = r'''
<script>
function openLogicInspector(){
  const box=document.getElementById('logicInspector'),out=document.getElementById('logicInspectorText');
  if(!box||!out)return;
  box.classList.add('open');
  const g=(typeof growthData==='object'&&growthData)||{};
  const p=g.latest_promotion||null;
  if(!p){out.textContent='No promoted logic in the current live Reality yet.\n\nRun a frontier step or continuous intelligence. Observation and candidate logic can exist without a promotion.';return;}
  const view={
    rule:p.rule_text||p.rule_id,
    version:p.version,
    confidence:p.confidence,
    direct_base_matches:p.direct_matches,
    resolved_bindings_changed:p.resolved_bindings_changed,
    new_resolved_term_instances:p.new_resolved_term_instances,
    governed_source:p.source_id,
    provenance:p.provenance||{},
    example_before_after:(p.examples||[])[0]||null
  };
  out.textContent=JSON.stringify(view,null,2);
  box.scrollIntoView({behavior:'smooth',block:'nearest'});
}
async function quickTry(kind,value,prio){
  if(typeof API==='undefined'||!API){const n=document.getElementById('ioHint');if(n)n.textContent='Recorded proof is read-only. Open Codespaces or connect a live runtime to try this.';return;}
  try{
    if(typeof postJson!=='function')return;
    const payload={text:value,priority:prio};
    await postJson('/api/input',{kind:kind,payload:payload});
    const n=document.getElementById('ioHint');if(n){n.className='notice good';n.textContent='Added to the Logical Robot: '+value+' · no automatic truth effect.';}
    if(typeof refresh==='function')await refresh();
  }catch(e){const n=document.getElementById('ioHint');if(n){n.className='notice warn';n.textContent=String(e.message||e);}}
}
</script>
'''


def living_robot_experience_html(*, static_mode: bool = False) -> str:
    """Layer BUILD 30 pedagogy/build paths over the BUILD 29 manifestation.

    This function only transforms HTML. It has no access to QCDS, oracle,
    governance or Logical Space mutation APIs.
    """
    html = living_robot_html(static_mode=static_mode)
    if "</style>" not in html or '<div class="layout">' not in html or "</body>" not in html:
        raise RuntimeError("Living Logical Robot base markup changed; BUILD 30 overlay cannot attach safely")
    html = html.replace("</style>", _CSS + "\n</style>", 1)
    html = html.replace('<section class="hero">', '<section class="hero" id="growthHeroAnchor">', 1)
    html = html.replace('<div class="layout">', _PANEL + '\n<div class="layout">', 1)
    html = html.replace("</body>", _SCRIPT + "\n</body>", 1)
    return html


def export_static(path: str | Path) -> Path:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(living_robot_experience_html(static_mode=True), encoding="utf-8")
    return target


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Export the BUILD 30 Understand → Inspect → Build Logical Robot page.")
    parser.add_argument("--export", required=True, help="Output HTML path")
    args = parser.parse_args(argv)
    export_static(args.export)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
