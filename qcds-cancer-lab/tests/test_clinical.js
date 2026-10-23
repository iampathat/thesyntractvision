const assert = require("node:assert/strict");
const Q = require("../qcds-core.js");
require("../clinical-knowledge.js");
require("../clinical-ui.js");

const K = globalThis.CancerLabKnowledge;
const UI = globalThis.CancerLabClinicalUI;
assert(K && UI, "clinical reference layer should load");
assert.equal(K.oracles.length, 5);
assert.equal(K.dimensions.length, 8);
assert(K.methods.length >= 10);
assert.equal(K.oracles[0].mask, "11??0???");
assert.equal(K.oracles[1].mask, "??1?1???");
assert.equal(K.oracles[2].mask, "???111??");
assert.equal(K.oracles[3].mask, "1??1????");
assert.equal(K.oracles[4].mask, "??11????");

for (const [index, oracle] of K.oracles.entries()) {
  assert(/^[01?]{8}$/.test(oracle.mask), "mask must be valid");
  assert(oracle.biology.length > 120, "pathway needs meaningful scientific context");
  assert(oracle.genes.length > 20, "pathway needs explicit gene examples");
  assert(oracle.evidence.length > 80, "pathway needs assay interpretation");
  assert(oracle.limitations.length > 90, "pathway needs specific known caveat");
  assert(oracle.sourceKeys.length >= 2, "at least two references per oracle");
  for (const key of oracle.sourceKeys) {
    assert(K.sources[key], "unresolved scientific source key " + key);
    assert(K.sources[key].url.startsWith("https://"), "science links must be HTTPS");
  }
  assert(!oracle.mask.includes("X"), "mask must not encode a fictitious gene symbol");
  assert(UI.maskDescription(oracle.mask).includes("P"), "live mask position description");
}
for (const dimension of K.dimensions) {
  for (const field of ["name","type","summary","biology","genes","evidence","caution"])
    assert(dimension[field], "missing dimension definition " + field);
}
for (const concept of K.methods) {
  assert(concept.summary && concept.biology && concept.limitations);
}
assert(UI.maskDescription("??11????").includes("Tillväxtsignalering"));
assert(UI.maskDescription("??11????").includes("Undvikande av apoptos"));
assert(!UI.maskDescription("111").startsWith("P"), "invalid mask cannot be explained as if it were valid");
assert.equal(Q.DIMENSIONS.length, K.dimensions.length, "feature dictionary must cover core dimensions");
for (let i=0;i<K.dimensions.length;i++)
  assert(K.dimensions[i].name.length>3 && K.dimensions[i].biology.length>60, "Swedish definitions must remain aligned in semantic order");
console.log("QCDS Cancer Lab clinical reference tests: PASS");
