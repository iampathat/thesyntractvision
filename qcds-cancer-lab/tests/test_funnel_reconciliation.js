/* Reconcile exact October 24 screenshot: F1–F4 from R6 and 6.34% bound across R1–R6.
   This is a regression for numerical provenance, not a synthetic story.
   Theory/creation Patrik Sundblom; R&D support OpenAI/ChatGPT.
 */
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const Q=require("../qcds-core.js"),D=require("../genome-discovery.js"),F=require("../genome-funnel.js");
const base=path.join(__dirname,"..");
const html=fs.readFileSync(path.join(base,"index.html"),"utf8");
const ui=fs.readFileSync(path.join(base,"genome-perspective.js"),"utf8");
const s={dataset:D.generateProfiles(173,"structure",5,5),anchors:[],minCases:3,maxControls:1,
 relation:"cooccurrence",maxPasses:6,readoutNoise:0};
const r=F.run(s);
assert.equal(r.rotations,6);
assert.equal(r.domainCount,375);
assert.equal(r.qualifiedCount,148);
assert.deepEqual(r.selected.loci,[2,3,7,9]); // L03 + L04 + L08 + L10
assert.equal(r.selected.caseCount,5);
assert.equal(r.selected.controlCount,1);
const ref=r.selected.state;
const roundValues=[
 0.004620373826682777,0.04026972120408881,0.06393924726645184,
 0.0951190594862388,0.038478685351892486,0.006048223714306847
];
for(let i=0;i<6;i++)assert(Math.abs(r.rounds[i].bound[ref]-roundValues[i])<1e-12,
  "Pass "+(i+1)+" contribution must be from THAT pass's four groups");
const pass=r.rounds[5];
const expectedEntropy=[5.656,8.542,3.782,8.551];
for(let i=0;i<4;i++)assert(Math.abs(pass.groups[i].entropyBits-expectedEntropy[i])<.002,
  "Visible F"+(i+1)+" entropy reproduces screenshot");
assert(Math.abs(pass.groups[0].posterior[ref]-0.000010356263720646617)<1e-12);
assert(Math.abs(pass.groups[2].posterior[ref]-0.018638154395694675)<1e-12);
const rank=(dist,state)=>1+dist.filter(p=>p>dist[state]+1e-14).length;
assert.equal(rank(pass.bound,ref),40,"Winner after six passes is only rank 40 in visible R6");
assert.equal(rank(pass.groups[0].posterior,ref),126,
  "Winner was only rank 126 in screenshot's F1");
const raw=r.rounds.map(rnd=>rnd.bound);
const scores=F.VALID.map(st=>{
 // Independent reimplementation of bindRotations: geometric pooling over
 // COMPLETE normalized rotation distributions, followed by global renormalization.
 return Math.exp(raw.reduce((a,dist)=>a+Math.log(Math.max(1e-12,dist[st])),0)/raw.length);
});
const denominator=scores.reduce((a,b)=>a+b,0);
const expected=scores[F.VALID.indexOf(ref)]/denominator;
assert(Math.abs(expected-r.distribution[ref])<1e-12);
assert(Math.abs(expected-0.06337976067539265)<1e-12,
 "6.34% is the normalised six-pass geometric pool, NOT visible R6");
const arithmetic=roundValues.reduce((a,b)=>a+b,0)/6;
assert(Math.abs(arithmetic-expected)>.01,
 "Do not mistakenly report the ordinary mean of six per-pass percentages");
assert(ui.includes('const referenceState=selectedState!==null?selectedState:result.selected?.state'));
assert(ui.includes('const currentProbability=pass.bound[reference.state]'));
assert(ui.includes('result.distribution[reference.state]'));
assert(ui.includes('rounds.map(r=>r.bound[reference.state])'));
assert(ui.includes("NORMALISERAT GEOMETRISKT MEDEL"));
assert(ui.includes('Rum "+String(lane.index+1)'),'Local room names distinct from L01–L10 DNA locus labels');
assert(ui.includes('F"+(g.index+1)+" · rum "'),'Fold labels identify four rooms');
assert(html.includes('id="funnelReconciliation"'));
assert(html.includes('Diagrammet nedan visar hur samma kandidat bidrar i varje rotation'));
assert(html.includes('Fördjupning 4 · Visa de 12 högst rankade kandidaterna') && ui.includes('klassiska grupporaklet'));
console.log("QCDS Oncology Lab six-pass / one-pass reconciliation against screenshots: PASS");
