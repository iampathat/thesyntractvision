const assert = require("node:assert/strict");
const G = require("../genome-perspective.js");
assert.equal(G.CHROMOSOMES.length, 24);
assert.equal(G.DEMO_LENGTH, 196608);
assert.equal(G.FRAGMENT_LENGTH, 8192);
const fragments = G.fragments();
assert.equal(fragments.length,24);
assert.equal(fragments.reduce((n,f)=>n+f.sequence.length,0),G.DEMO_LENGTH);
const results = G.findMatches(fragments,G.MOTIF);
assert.deepEqual(results.map(m=>[m.chr,m.offset]), [
  ["3",1845],["13",4103],["17",6552]
], "seeded synthetic demo must have exactly three verifiable sequence hits");
for(const match of results) {
  const chr=fragments.find(f=>f.chr===match.chr);
  assert.equal(chr.sequence.slice(match.offset,match.offset+G.MOTIF.length),G.MOTIF);
}
assert.equal(G.findMatches(fragments,"GATTACAGTCGA").length,3);
assert.throws(()=>G.findMatches(fragments,"NNNNNN"), /A\/C\/G\/T/);
assert.throws(()=>G.findMatches(fragments,"AT"), /6–18/);
assert.throws(()=>G.findMatches(fragments,"A".repeat(19)), /6–18/);
assert.equal(G.choose3(3),1n);
assert.equal(G.choose3(4),4n);
assert.equal(G.choose3(G.GENOME_BASES),4499999995500000001000000000n);
const overlap=G.findMatches([{chr:"test",sequence:"AAAAAAA"}],"AAAAAA");
assert.deepEqual(overlap.map(m=>m.offset),[0,1],"overlapping exact motif matches must be counted");
console.log("Cancer Lab genome perspective tests: PASS");
