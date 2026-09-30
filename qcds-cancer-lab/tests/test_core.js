const assert = require("assert");
const Q = require("../qcds-core.js");

function bitsToState(bits) {
  let s = 0;
  for (let i = 0; i < bits.length; i++) s |= Number(bits[i]) << i;
  return s;
}

assert.strictEqual(Q.peakIterationCount(256, 1, 40), 12, "256/1 first Grover tangent must be m=12");
assert.strictEqual(Q.peakIterationCount(128, 1, 40), 8, "128/1 must stop at first tangent m=8, not a later recurrence");
assert.strictEqual(Q.peakIterationCount(256, 2, 40), 8, "256/2 proves m is dynamic, not fixed at 12");
const g = Q.runGrover(256, [173], 40);
assert.strictEqual(g.iterations, 12);
assert(g.markedMass > 0.9999);


const rotations = Array.from({ length: 16 }, (_, i) => Q.rotationOrder(i).join(","));
assert.strictEqual(new Set(rotations).size, 16, "all 16 bandwidth rotations must be unique");
for (let semantic = 0; semantic < 8; semantic++) {
  const counts = Array(8).fill(0);
  for (let bank = 0; bank < 16; bank++) {
    const order = Q.rotationOrder(bank);
    counts[order.indexOf(semantic)] += 1;
  }
  assert.deepStrictEqual(counts, Array(8).fill(2), "each dimension must visit every fixed oracle position twice");
}

const fixedOracle = [{ name: "position-zero", mask: "1???????", provenance: "rotation-test" }];
const viewA = Q.buildView(7, 0);
const viewB = Q.buildView(7, 1);
assert.notStrictEqual(viewA.orderedIndices[0], viewB.orderedIndices[0], "input semantics must rotate across fixed oracle positions");
assert.strictEqual(Q.compileCancerOracle(viewA, "????????", fixedOracle, null).length, 64);
assert.strictEqual(Q.compileCancerOracle(viewB, "????????", fixedOracle, null).length, 64);
const nullAtOraclePosition = Q.buildView(0, 0);
assert.strictEqual(Q.compileCancerOracle(nullAtOraclePosition, "????????", fixedOracle, null).length, 128,
  "same oracle remains present; its constraint on the true-null position is simply unobserved");

const hypotheses = [
  { name: "exact", mask: "11111111", provenance: "test" }
];

const partial = Q.runCancerQCDS({
  inputMask: "1111????",
  hypotheses,
  maxCycles: 2
});
assert.strictEqual(partial.cycles[0].laneCount, 128);
assert.strictEqual(partial.cycles[0].familyCount, 8);
assert(partial.finalState.startsWith("1111"), "hard input prefix must survive");
for (const bits of Object.keys(partial.finalDistribution)) {
  assert(bits.startsWith("1111"), "final distribution must obey hard input Condition");
  assert(Q.stateMatchesMask(bitsToState(bits), "1111????"));
}

const fullParent = Q.runCancerQCDS({
  inputMask: "1111????",
  hypotheses: [],
  maxCycles: 1
});
assert.strictEqual(Object.keys(fullParent.finalDistribution).length, 16, "1111???? must preserve the full sixteen-state Parent space");
const fullMass = Object.values(fullParent.finalDistribution).reduce((a, b) => a + b, 0);
assert(Math.abs(fullMass - 1) < 1e-12, "Parent distribution must normalize to 1");
assert.strictEqual(fullParent.finalResolved, false, "flat sixteen-state Parent space must remain explicitly unresolved");
for (const p of Object.values(fullParent.finalDistribution)) {
  assert(Math.abs(p - 1 / 16) < 1e-12, "unresolved sixteen-state Parent distribution must stay uniform");
}

const complete = Q.runCancerQCDS({
  inputMask: "01101001",
  hypotheses: [],
  maxCycles: 1
});
assert.strictEqual(complete.finalState, "01101001");
assert.deepStrictEqual(Object.keys(complete.finalDistribution), ["01101001"]);

console.log("QCDS Cancer browser core tests: PASS");
