/* Oncology Lab readability regression — mobile visual contract in source.
 * Theory and creation: Patrik Sundblom · OpenAI/ChatGPT R&D support.
 * Tests that result values have separate block elements, cache keys advance,
 * technical areas really collapse, and the calculations stay unchanged.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const base=path.resolve(__dirname,"..");
const html=fs.readFileSync(path.join(base,"index.html"),"utf8");
const css=fs.readFileSync(path.join(base,"clinical.css"),"utf8");
const ui=fs.readFileSync(path.join(base,"genome-perspective.js"),"utf8");
const matches=(src,s)=>src.split(s).length-1;
assert(html.includes('<html lang="sv">'));
assert(html.includes('clinical.css?v=20261024-oncology-readable-v3'),
 "CSS must be cache-busted after a real style change, especially on mobile.");
assert(html.includes('genome-perspective.js?v=20261024-oncology-readable-v3'),
 "Fresh JS is required to match the new DOM.");
assert.equal(matches(html,'id="funnelHeadlineSummary"'),1);
assert.equal(matches(html,'id="funnelDistribution"'),1);
assert.equal(matches(html,'id="funnelReconciliation"'),1);
assert.equal(matches(html,'class="funnel-inspection-details"'),2);
assert.equal(matches(html,'class="funnel-reconciliation-details"'),1);
assert.equal(matches(html,'class="funnel-candidate-details"'),1);
assert(!/<details class="funnel-(?:inspection|candidate|reconciliation)-details"[^>]*open/.test(html),
 "All four method panels should be closed initially.");
assert(css.includes("details:not([open]) > :not(summary)"),
 "Author-level grid styles must not override browser's closed-details hiding.");
assert(css.includes("display:none !important"),"Closed detail children must really be hidden.");
assert(css.includes("font-family:Inter,-apple-system"),"One UI font stack.");
assert(css.includes("#qcdsFunnel .funnel-main-measure-label"));
assert(css.includes("#qcdsFunnel .funnel-main-value"));
assert(css.includes("#qcdsFunnel .funnel-main-measures"));
assert(css.includes("@media(max-width:780px)"));
assert(ui.includes('e("p","funnel-main-measure-label",n+" · "+label)'),
 "Label must be a separate block even if CSS has not loaded yet.");
assert(ui.includes('e("p","funnel-main-value",pct(value))'),
 "Number must be a separate block even if CSS has not loaded yet.");
assert(ui.includes('e("p","funnel-main-explain",description)'),
 "Explanation must be a separate block even if CSS has not loaded yet.");
assert(ui.includes('.toLocaleString("sv-SE"'),"Use Swedish decimal format.");
assert(ui.includes('+" %";}')||ui.includes('+" %";'),
 "Percentage symbol must not stick directly to the value.");
assert(ui.includes("panel.append(more)"),"Full method explanation remains accessible.");
assert(ui.includes("result.parentGrover.markedMass"),"Parent Grover must remain prominent.");
const Q=require("../qcds-core.js");
const D=require("../genome-discovery.js");
const F=require("../genome-funnel.js");
const res=F.run({dataset:D.generateProfiles(173,"structure",5,5),
 anchors:[],relation:"cooccurrence",minCases:3,maxControls:1,maxPasses:6,readoutNoise:0});
assert(Math.abs(res.selected.foldedProbability-.06337976067539265)<1e-12);
assert(Math.abs(res.parentGrover.markedMass-.9994612447443931)<1e-12);
assert.equal(res.leaders.length,1);
console.log("Oncology Lab Swedish mobile readable result and true closed details: PASS");
