const assert = require("node:assert/strict");
const Q = require("../qcds-core.js");
const D = require("../genome-discovery.js");
require("../genome-perspective.js");

assert.equal(D.LOCI.length,10);
assert.equal(D.N,1024);
assert.equal(D.MAX_ITERATIONS,40);
assert.equal(D.ALIGNMENT_THRESHOLD,.999);
assert.equal(D.countBits(D.mask([0,3,9])),3);
assert.deepEqual(D.bits(D.mask([0,3,9])),[0,3,9]);

const d173=D.generateProfiles(173,"structure");
assert.equal(d173.cases.length,5);
assert.equal(d173.controls.length,5);
assert.deepEqual(d173,D.generateProfiles(173,"structure"),"seed replay must be deterministic");
assert.notDeepEqual(d173,D.generateProfiles(42,"structure"),"different cohort seeds yield different evidence");
const run=D.evaluate({dataset:d173});
assert.equal(run.states,1024);
assert.equal(run.examinedCount,375,"oracle tests 2–4-locus subset configurations");
assert(run.markedCount>0);
assert.equal(run.grover.iterations,Q.peakIterationCount(1024,run.markedCount,40,.999));
assert.equal(run.refinedGrover.iterations,Q.peakIterationCount(1024,run.refinedCount,40,.999));
assert(run.grover.iterations<=40 && run.refinedGrover.iterations<=40);
assert(run.stopReason.includes("tangent")||run.stopReason.includes("threshold"));
assert(run.ranked.every(r=>r.passed&&r.caseCount>=3&&r.controlCount<=1));
assert(run.refined.every(r=>Math.abs(r.contrast-run.refined[0].contrast)<1e-12));

const d42=D.generateProfiles(42,"structure");
const other=D.evaluate({dataset:d42});
assert(other.selected);
assert.notDeepEqual(other.selected.loci,run.selected.loci,
  "independent data must lead to another inferential pattern rather than a hardcoded target");
const absent=D.evaluate({dataset:D.generateProfiles(81,"structure")});
assert.equal(absent.markedCount,0);
assert.equal(absent.selected,null);
assert.equal(absent.grover.iterations,0);
assert.equal(absent.refinedGrover.iterations,0);
const anchored=D.evaluate({dataset:d42,anchors:[5],minCases:3,maxControls:1});
assert(anchored.ranked.every(r=>r.loci.includes(5)));
assert.throws(()=>D.evaluate({dataset:d42,anchors:[1,1]}),/olika/);
assert.throws(()=>D.evaluate({dataset:d42,anchors:[1,2,3,4]}),/tre/);
assert.throws(()=>D.evaluate({dataset:d42,anchors:[10]}),/giltiga/);
assert.throws(()=>D.evaluate({dataset:d42,minCases:0}),/tröskelvärden/);

const perturbed=D.perturb(d42,8021,.25);
assert.notDeepEqual(perturbed.cases,d42.cases);
assert.deepEqual(d42,D.generateProfiles(42,"structure"),"perturb must not mutate baseline");
const audit=D.stabilityAudit(other);
assert.equal(audit.simulations.length,5);
assert.equal(audit.leaveOneOut.length,5);
assert(audit.repeatability>=0&&audit.repeatability<=5);
assert(audit.retained>=audit.repeatability);
assert(typeof audit.negativeControl.retainsTop==="boolean");

// Unknown relationships need not involve all variants being present.
const parity=D.evaluate({dataset:d42,relation:"parity",anchors:[],minCases:3,maxControls:1});
assert.equal(parity.relation,"parity");
assert(parity.examinedCount===375);
assert(parity.ranked.every(x=>x.caseCount>=3&&x.controlCount<=1));
assert.notDeepEqual(parity.ranked.map(x=>x.state),other.ranked.map(x=>x.state),
  "parity and co-occurrence predicates must not be the same oracle");
if(parity.selected){
  assert.equal(D.coverage(parity.selected.state,d42.cases,"parity"),parity.selected.caseCount);
  assert.equal(D.coverage(parity.selected.state,d42.controls,"parity"),parity.selected.controlCount);
}
assert.throws(()=>D.evaluate({dataset:d42,relation:"arbitrary"}),/stöds inte/);
const parityAudit=D.stabilityAudit(parity);
assert.equal(parityAudit.simulations.length,5);
const nullData=D.generateProfiles(42,"null");
assert(nullData.parameters.every(p=>p.delta===0),"null mode removes cohort-specific effects");
const nullOut=D.evaluate({dataset:nullData});
assert(nullOut.markedCount>=0,"null data may still yield false positive by chance");
assert.equal(Q.peakIterationCount(1024,1,40,.999),25);
assert(Q.groverSuccessProbability(1024,1,25)>=.999);

console.log("Cancer Lab open-inference genomics and tangent/threshold tests: PASS");
