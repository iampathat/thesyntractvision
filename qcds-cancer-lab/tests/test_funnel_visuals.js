/* Reproducible probability bar audit; theory Patrik Sundblom,
   software R&D support OpenAI/ChatGPT.
   Check plotted values against the numerical engine; NEVER edit engine to fit chart.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const Q=require("../qcds-core.js");
const D=require("../genome-discovery.js");
const F=require("../genome-funnel.js");
const P=require("../genome-perspective.js");
const dir=path.resolve(__dirname,"..");
const code=fs.readFileSync(path.join(dir,"genome-perspective.js"),"utf8");
const css=fs.readFileSync(path.join(dir,"clinical.css"),"utf8");
const html=fs.readFileSync(path.join(dir,"index.html"),"utf8");
const result=F.run({
 dataset:D.generateProfiles(42,"structure",8,12),
 anchors:[],minCases:5,maxControls:2,
 relation:"cooccurrence",readoutNoise:0,maxPasses:6
});
assert.equal(result.rotations,4);
assert.equal(result.domainCount,375);
assert.equal(result.qualifiedCount,1);
assert.deepEqual(result.selected.loci,[5,7]);
assert(Math.abs(result.selected.foldedProbability-0.008021614049363747)<1e-12,
 "Final fused 0.8022% is NOT parent Grover 99.9461%.");
assert(Math.abs(result.parentGrover.markedMass-0.9994612447443719)<1e-10);
assert(result.parentGrover.markedMass>result.selected.foldedProbability);
const pass=result.rounds.at(-1);
assert.equal(pass.lanes.length,16);
assert.equal(pass.lanes.filter(l=>l.marks===0).length,13);
assert.equal(pass.lanes.filter(l=>l.marks===1).length,3);
for(const lane of pass.lanes){
 assert.equal(lane.likelihood.length,16);
 assert(Math.abs(lane.likelihood.reduce((a,b)=>a+b,0)-1)<1e-10);
 if(lane.marks===0){
   assert.equal(lane.iterations,0);
   assert(lane.likelihood.every(x=>x===1/16),"No hit = UNIFORM 6.25%, not zero");
 }else{
   assert.equal(lane.iterations,3);
   assert(Math.abs(lane.markedMass-0.9613189697265625)<1e-12);
   assert(Math.abs(Math.max(...lane.likelihood)-0.9613189697265625)<1e-12);
 }
}
const bins=pass.groups.map(g=>P.rankedDistributionBins(g.posterior));
assert.equal(bins.length,4);
for(const v of bins){
 assert.equal(v.length,15);
 assert(v.every(b=>b.count===25),"15 equal groups must represent all 375 states");
 assert.equal(v[0].start,1);
 assert.equal(v.at(-1).end,375);
 assert(Math.abs(v.reduce((a,b)=>a+b.mass,0)-1)<1e-10,
 "Rank bins retain all probability mass");
}
const log375=Math.log2(375);
assert(Math.abs(pass.groups[0].entropyBits-log375)<1e-12);
assert(Math.abs(pass.groups[1].entropyBits-log375)<1e-12);
assert(Math.abs(pass.groups[2].entropyBits-8.35362259008941)<1e-9);
assert(Math.abs(pass.groups[3].entropyBits-7.448127414346702)<1e-9);
assert(Math.abs(bins[0][0].mean-bins[0].at(-1).mean)<1e-15);
assert(Math.abs(bins[1][0].mean-bins[1].at(-1).mean)<1e-15);
assert(bins[2][0].mean>2*bins[2].at(-1).mean,
 "Fold F3 MUST show a varying distribution, though its top 12 all tie");
assert(bins[3][0].mean>10*bins[3].at(-1).mean,
 "Fold F4 MUST show a peaked distribution, though its top 12 all tie");
for(const i of [2,3]){
 const originalTop12=pass.groups[i].posterior.filter(p=>p>0).sort((a,b)=>b-a).slice(0,12);
 assert(originalTop12.every(v=>v===originalTop12[0]),
  "Old graph showed the same 12 bars and hid the long tail");
}
assert(code.includes("rankedDistributionBins(g.posterior)"));
assert(code.includes("const sharedScale=Math.max"));
assert(code.includes("bar.style.height=Math.max(0,Math.min(100,100*p/scale))"));
assert(code.includes("bar.style.width=(100*item.foldedProbability).toFixed(4)"));
assert(!code.includes("item.foldedProbability/(top[0].foldedProbability"),"No misleading relative 100% candidate bars");
assert(code.includes("Ingen lokal träff"));
assert(code.includes("samtliga ")||code.includes("result.evaluatedCount"));
assert(css.includes(".funnel-lane-nohit"));
assert(css.includes(".funnel-reading-note"));
assert(html.includes("15 ranggrupper"));
console.log("Oncology Lab audited Grover/local/fold/final chart fidelity: PASS");
