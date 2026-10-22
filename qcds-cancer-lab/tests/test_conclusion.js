const assert = require("node:assert/strict");
const CORE = require("../qcds-core.js");
const SUMMARY = require("../qcds-conclusion.js");

const templates = [
  { name: "DNA repair", mask: "11??0???" },
  { name: "PI3K axis", mask: "??1?1???" },
  { name: "Receptor axis", mask: "???111??" },
  { name: "HR + broad", mask: "1??1????" },
  { name: "PI3K + HR", mask: "??11????" }
];

function run(inputMask) {
  return CORE.runCancerQCDS({ inputMask, hypotheses: templates, maxCycles: 2 });
}

const open = SUMMARY.summarize(run("????????"), CORE.DIMENSIONS);
assert.equal(open.category, "unresolved");
assert(open.title.includes("No discriminating solution"));
assert(open.lead.includes("256 compatible model states remain"));
assert(open.detail.includes("????????"));
assert(!open.lead.includes("one identified solution"));
assert(open.scope.includes("not a validated finding"));

const partial = SUMMARY.summarize(run("1?11????"), CORE.DIMENSIONS);
assert.equal(partial.category, "unresolved");
assert(partial.lead.includes("32 compatible model states remain"));
assert(partial.detail.includes("1?11????"));
assert(partial.detail.includes("DNA repair"));
assert(partial.detail.includes("did not fix any additional dimensions"));

const preset = SUMMARY.summarize(run("01101001"), CORE.DIMENSIONS);
assert.equal(preset.category, "condition_only");
assert(preset.lead.includes("01101001"));
assert(preset.lead.includes("not discovered a new state"));

const synthetic = {
  inputMask: "1???????", finalLogic: "1010????",
  finalState: "10100101", finalProbability: 0.82, finalResolved: true,
  cycles: [{parent: {candidateCount: 5, markedCanonical: [173]}, stability: {stable: true}}]
};
const chosen = SUMMARY.summarize(synthetic, CORE.DIMENSIONS);
assert.equal(chosen.category, "candidate");
assert(chosen.title.includes("one amplified model candidate"));
assert(chosen.lead.includes("10100101"));
assert(chosen.lead.includes("82.00%"));
assert(chosen.detail.includes("DNA repair = 0"));
assert(chosen.detail.includes("Growth signal = 1"));
assert(chosen.detail.includes("The internal numerical stability criteria were met"));

synthetic.cycles[0].parent.markedCanonical = [173,174];
const group = SUMMARY.summarize(synthetic, CORE.DIMENSIONS);
assert.equal(group.category, "multiple");
assert(group.title.includes("not a unique solution"));

console.log("Cancer Lab QCDS result-conclusion tests: PASS");
