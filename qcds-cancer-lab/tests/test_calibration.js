/* Audit regression: Oncology Lab should never equate oracle hits with cancer evidence.
   Permutation null corrects for selection among 375 symbolic combinations.
   Theory/creation: Patrik Sundblom. OpenAI/ChatGPT R&D support.
*/
const assert=require("node:assert/strict");
require("../qcds-core.js");
const D=require("../genome-discovery.js");
const F=require("../genome-funnel.js");
function settings(seed=173,mode="structure"){
 return {dataset:D.generateProfiles(seed,mode),anchors:[],minCases:3,maxControls:1,
         minSize:2,maxSize:4,relation:"cooccurrence"};
}
const datasetSettings=settings();
const fold=F.run({...datasetSettings,readoutNoise:0,maxPasses:6});
assert(fold.selected,"reference synthetic dataset has an admissible symbolic candidate");
const p=D.permutationAudit({...datasetSettings,selectedState:fold.selected.state});
assert.equal(p.assignments,252,"exactly C(10,5) assignments");
assert.equal(p.validCandidates,375,"all C(10,2)+C(10,3)+C(10,4) candidates");
assert.equal(p.observedQualified,fold.qualifiedCount,"permutation audit must use same oracle as rotating funnel");
assert.equal(p.familywiseFraction,p.tailAssignments/252);
assert(p.tailAssignments>0&&p.tailAssignments<=252);
assert(p.familywiseFraction>0.05,"reference synthetic hit is not statistical evidence");
const p2=D.permutationAudit({...datasetSettings,selectedState:fold.selected.state});
assert.deepEqual(p2,p,"calibration deterministic with same matrix");
const negative=settings(81);
const noCandidate=D.permutationAudit({...negative,selectedState:null});
assert.equal(noCandidate.tailAssignments,null);
assert.equal(noCandidate.familywiseFraction,null);
assert.equal(noCandidate.observedQualified,0);
assert.throws(()=>D.permutationAudit({...datasetSettings,anchors:[-1]}),/Ogiltigt startvillkor/);
assert.throws(()=>D.permutationAudit({...datasetSettings,selectedState:999}),/valda tillståndet/);
const modes=["cooccurrence","parity"];
for(const relation of modes){
 const opts={...settings(42),relation};
 const f=F.run({...opts,maxPasses:6,readoutNoise:0});
 const calibration=D.permutationAudit({...opts,selectedState:f.selected?.state});
 assert.equal(calibration.observedQualified,f.qualifiedCount,"same oracle semantics in all relationship families");
}
let nullHits=0;
for(let seed=1;seed<=100;seed++){
 const output=D.evaluate(settings(seed,"null"));
 if(output.markedCount>0)nullHits++;
}
assert.equal(nullHits,57,"null calibration: 57 of 100 synthetic datasets produce apparent positive patterns at default thresholds");
console.log("Oncology Lab exact familywise permutation and false-positive calibration: PASS");
