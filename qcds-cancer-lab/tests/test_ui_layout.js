/* Structural regression: one plain-language path, distinct technical engines, no duplicated controls.
 * Copyright (c) 2026 Patrik Sundblom. R&D support OpenAI / ChatGPT. */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const base=path.resolve(__dirname,"..");
const html=fs.readFileSync(path.join(base,"index.html"),"utf8");
const app=fs.readFileSync(path.join(base,"genome-perspective.js"),"utf8");
const css=fs.readFileSync(path.join(base,"clinical.css"),"utf8");
function once(piece){
  const count=html.split(piece).length-1;
  assert.equal(count,1,JSON.stringify(piece)+" must appear exactly once, not "+count+" times");
}
for(const id of [
 "genomePerspective","cohortCombinatorial","cohortRun","cohortOutcome","cohortQuality","cohortEvidence","cohortAlternatives",
 "cohortGroverStats","cohortAudit","cohortGenomeTracks","cohortDataMatrix","cohortAdvancedSettings",
 "cohortChecks","funnelDeepDive","qcdsFunnel","funnelLaneGrid","funnelGroupGrid","funnelDistribution",
 "legacyWorkbenchDetails","workbench","maskInput","runButton","referenceHub","methods"
])once('id="'+id+'"');
const allIds=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(allIds.length,new Set(allIds).size,"all HTML IDs must be globally unique");
const at=(x)=>html.indexOf(x);
assert(at('id="cohortOutcome"')>at('id="cohortRun"'),"result comes after main entry point");
assert(at('id="cohortOutcome"')<at('id="cohortGenomeTracks"'),"result comes before its graphical highlights");
assert(at('id="cohortGenomeTracks"')<at('id="qcdsFunnel"'),"numerical funnel should be a further step, not obscure result");
assert(at('id="qcdsFunnel"')<at('id="workbench"'),"the older symbolic lab is a separate follow-on");
assert(at('id="cohortGroverStats"')>at('id="cohortChecks"'),"full numerical statistics live in one optional panel");
assert(/<details[^>]*id="funnelDeepDive"/.test(html),"funnel must remain accessible in the collapsed technical view");
assert(/<details[^>]*id="cohortAdvancedSettings"/.test(html),"input options remain accessible");
assert(/<details[^>]*id="legacyWorkbenchDetails"/.test(html),"legacy 8-bit engine remains accessible");
assert(html.includes("invented data")&&html.includes("not</strong> ten sequenced human genomes")&&html.includes("medical test"),"prominent synthetic-data guardrail");
assert(!html.includes("8 symbolic dimensions</strong></div>"),"top summary must not mislabel main genomics tool");
assert(html.includes('genome-funnel.js?v='),"the numerical funnel remains loaded");
assert(at('src="./genome-discovery.js')<at('src="./genome-funnel.js'),"correct engine loading order");
assert(at('src="./genome-funnel.js')<at('src="./genome-perspective.js'),"render only after engine");
assert(!html.includes('id="funnelInputCount"'),"duplicated funnel summary counters removed");
assert(!app.includes('getElementById("funnelInputCount")'),"no stale references to duplicate counters");
assert(!app.includes('e("button","funnel-prob-row")'),"candidate chooser should not be duplicated inside probability chart");
assert(css.includes(".genome-funnel-panel")&&css.includes(".legacy-lab-details"),"independent styles for both method branches");
assert(html.includes('id="cohortAlternativeTitle"'),"alternatives intro is a single reusable affordance");
console.log("Oncology Lab layperson-first UI and de-duplication checks: PASS");
