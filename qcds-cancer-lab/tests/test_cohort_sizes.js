/* Cohort size is a USER INPUT, not a QCDS premise.
 * Variable, unbalanced case/control groups must preserve oracle semantics.
 * Theory and creation by Patrik Sundblom. R&D support: OpenAI / ChatGPT. */
const assert=require("node:assert/strict");
require("../qcds-core.js");
const D=require("../genome-discovery.js");
const F=require("../genome-funnel.js");
function config(nCase,nControl){
 const dataset=D.generateProfiles(173,"structure",nCase,nControl);
 const minCases=Math.ceil(.6*nCase),maxControls=Math.floor(.2*nControl);
 return {dataset,minCases,maxControls,anchors:[],relation:"cooccurrence",
   minSize:2,maxSize:4,readoutNoise:0,maxPasses:6};
}
for(const [cases,comparisons,expectedMode,assignments] of [
 [2,2,"exact",6],[3,7,"exact",120],[5,5,"exact",252],
 [8,8,"monte_carlo",399],[12,4,"monte_carlo",399],[20,25,"monte_carlo",399]
]){
 const options=config(cases,comparisons);
 assert.equal(options.dataset.cases.length,cases);
 assert.equal(options.dataset.controls.length,comparisons);
 const d=D.evaluate(options),f=F.run(options);
 assert.equal(d.markedCount,f.qualifiedCount);
 assert(f.ranked.every(x=>x.caseCount<=cases&&x.controlCount<=comparisons));
 assert(f.ranked.every(x=>x.caseRate===x.caseCount/cases&&x.controlRate===x.controlCount/comparisons));
 const calibration=D.permutationAudit({...options,selectedState:f.selected?.state});
 assert.equal(calibration.method,expectedMode);
 assert.equal(calibration.assignments,assignments);
 assert.equal(calibration.validCandidates,375);
 assert.equal(calibration.caseCount,cases);
 assert.equal(calibration.controlCount,comparisons);
 assert.equal(calibration.observedQualified,f.qualifiedCount);
 assert(calibration.familywiseFraction===null||
   (calibration.familywiseFraction>0&&calibration.familywiseFraction<=1));
 const sensitivity=D.stabilityAudit(d);
 assert.equal(sensitivity.leaveOneOut.length,cases);
 if(cases===2)assert(sensitivity.leaveOneOut.every(x=>x.skipped),
   "Do not pretend a one-person remainder is a valid repeat validation");
 else assert(sensitivity.leaveOneOut.every(x=>!x.skipped));
 if(cases===8)assert.deepEqual(
   calibration,D.permutationAudit({...options,selectedState:f.selected?.state}),
   "Monte Carlo regrouping must be reproducible");
}
assert.throws(()=>D.generateProfiles(173,"structure",1,2),/2–100/);
assert.throws(()=>D.generateProfiles(173,"structure",2,101),/2–100/);
assert.deepEqual(D.generateProfiles(173,"structure"),D.generateProfiles(173,"structure",5,5),
  "legacy five-and-five reference remains reproducible, but is just one configuration");
console.log("QCDS Oncology Lab variable 2–100 profile input and 252/exhaustive-versus-sampled permutation tests: PASS");
