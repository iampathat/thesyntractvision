const assert = require("node:assert/strict");
require("../qcds-core.js");
const G = require("../genome-perspective.js");
assert.equal(G.LOCI.length,10);
assert.equal(G.CASES.length,5);
assert.equal(G.CONTROLS.length,5);
assert.equal(G.N,1024);
assert.equal(G.CHOOSE_THREE,120);
assert.equal(G.choose3(3000000000n),4499999995500000001000000000n);
const trial = G.evaluateOracle({anchors:[1],minCases:5,maxControls:0});
assert.equal(trial.states,1024);
assert.equal(trial.evaluatedTriples,120);
assert.equal(trial.markedCount,1);
assert.deepEqual(trial.selected.loci,[1,4,7],
  "selected pattern comes from evidence-based case/control oracle, not hardcoded winner");
assert.equal(trial.selected.caseCount,5);
assert.equal(trial.selected.controlCount,0);
assert(trial.grover.iterations > 0 && trial.grover.iterations <= 40);
assert(trial.grover.markedMass > 0.99);
assert(trial.selected.probability > 0.99);
assert(trial.leaveOneOut.every(x=>x.remaining===4));
const unconstrained=G.evaluateOracle({anchors:[],minCases:5,maxControls:0});
assert.deepEqual(unconstrained.selected.loci,[1,4,7],
  "oracle may discover pattern with no anchor");
for(const anchor of [[1,4],[1,4,7]]){
 const x=G.evaluateOracle({anchors:anchor,minCases:5,maxControls:0});
 assert.deepEqual(x.selected.loci,[1,4,7]);
}
const incompatible=G.evaluateOracle({anchors:[0],minCases:5,maxControls:0});
assert.equal(incompatible.markedCount,0);
assert.equal(incompatible.grover.iterations,0);
assert.equal(incompatible.selected,null);
const relaxed=G.evaluateOracle({anchors:[],minCases:3,maxControls:2});
assert(relaxed.markedCount >= 1);
assert(relaxed.ranked.every(x=>x.caseCount>=3&&x.controlCount<=2));
assert.throws(()=>G.evaluateOracle({anchors:[0,1,2,3]}),/three/);
assert.throws(()=>G.evaluateOracle({anchors:[9,9]}),/distinct/);
assert.throws(()=>G.evaluateOracle({anchors:[10]}),/valid/);
assert.throws(()=>G.evaluateOracle({minCases:0}),/threshold/);
assert.equal(G.countBits(G.mask([1,4,7])),3);
assert.deepEqual(G.bits(G.mask([1,4,7])),[1,4,7]);
console.log("Cancer Lab cross-genome QCDS cohort tests: PASS");
