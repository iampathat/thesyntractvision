/* Regression suite: actual rotating QCDS 4→1→1 hierarchical probability synthesis.
 * All assertions independently check the numerical engine, not UI animation. */
const assert=require("node:assert/strict");
const Q=require("../qcds-core.js");
const D=require("../genome-discovery.js");
const F=require("../genome-funnel.js");
assert.equal(F.WIDTH,10);
assert.equal(F.STATES,1024);
assert.equal(F.LANE_WIDTH,4);
assert.equal(F.LANES,16);
assert.equal(F.GROUPS,4);
assert.equal(F.FAN_IN,4);
assert.equal(F.CHOICES.length,210);
function opts(seed=173,relation="cooccurrence",readoutNoise=0,maxPasses=6){
 return {dataset:D.generateProfiles(seed,"structure"),anchors:[],relation,minCases:3,maxControls:1,readoutNoise,maxPasses};
}
for(const round of [0,1,2,5]){
 const windows=Array.from({length:16},(_,j)=>F.schedule(round,j));
 assert.equal(new Set(windows.map(w=>w.slice().sort((a,b)=>a-b).join(","))).size,16,"all 16 windows must be different within a rotation");
 for(const w of windows){
   assert.equal(w.length,4);
   assert.equal(new Set(w).size,4);
   for(const pattern of [0,1,5,10,15]){
     assert.equal(F.projection(F.embedding(pattern,w),w),pattern,"joint projection must preserve local bit geometry");
   }
 }
}
assert.notDeepEqual(F.schedule(0,0),F.schedule(1,0),"rotations must change window mapping");
const twelvePassWindows=new Set();
for(let round=0;round<12;round++)for(let lane=0;lane<16;lane++)
 twelvePassWindows.add(F.schedule(round,lane).slice().sort((a,b)=>a-b).join(","));
assert.equal(twelvePassWindows.size,192,"12 passes must cover 192 different windows, with no redundant local searches");

const run=F.run(opts());
assert(run.rotations>=3&&run.rotations<=6);
assert.equal(run.domainCount,375);
assert.equal(run.evaluatedCount,375);
assert.equal(run.lanesPerPass,16);
assert.equal(run.groupsPerPass,4);
assert.equal(run.rounds.length,run.rotations);
assert(run.qualifiedCount>0);
assert(run.selected);
assert(run.parentGrover.iterations>0&&run.parentGrover.iterations<=40);
assert(run.parentGrover.markedMass>0);
assert(Math.abs(run.distribution.reduce((a,b)=>a+b,0)-1)<1e-10);
for(const round of run.rounds){
 assert.equal(round.lanes.length,16);
 assert.equal(round.groups.length,4);
 assert(Math.abs(round.bound.reduce((a,b)=>a+b,0)-1)<1e-10);
 for(const lane of round.lanes){
   assert.equal(lane.window.length,4);
   assert.equal(lane.likelihood.length,16);
   assert(Math.abs(lane.likelihood.reduce((a,b)=>a+b,0)-1)<1e-10);
   assert.equal(lane.iterations,Q.peakIterationCount(16,lane.marks,40,.999));
   assert(lane.likelihood.every(p=>Number.isFinite(p)&&p>=0),"probability entries are valid, including exact zeros");
   assert.deepEqual(lane.likelihood,lane.grover.probabilities,
    "noise=0 means the actual ideal Grover distribution, with no hidden 8% smoothing");
 }
 for(const group of round.groups){
   assert.deepEqual(group.memberIndices,[0,1,2,3].map(j=>4*group.index+j));
   assert.equal(group.posterior.length,1024);
   assert(Math.abs(group.posterior.reduce((a,b)=>a+b,0)-1)<1e-10);
   assert(group.entropyBits>0);
 }
}
assert(run.rounds.some((r,i)=>i>0&&F.tvd(r.bound,run.rounds[0].bound)>1e-6),
 "rotation must change actual probability distributions");
for(const row of run.ranked){
 assert(row.foldedProbability>0);
 assert(D.countBits(row.state)>=2&&D.countBits(row.state)<=4);
 const adjudicated=D.assess(row.state,run.dataset,"cooccurrence");
 assert(adjudicated.caseCount>=3&&adjudicated.controlCount<=1&&adjudicated.contrast>0,
  "truth gate must never propose an inadmissible highlight");
}
assert.equal(run.leaders.length,run.parentGrover.markedCount);
const replay=F.run(opts());
assert.deepEqual(replay.distribution,run.distribution,"same inputs and rotation schedule must replay bit-for-bit");
assert.deepEqual(replay.selected?.loci,run.selected?.loci);
const other=F.run(opts(42));
assert.notDeepEqual(other.distribution,run.distribution,"data determines the folded probabilities");
const parity=F.run(opts(173,"parity"));
assert.notDeepEqual(parity.distribution,run.distribution,"oracle family must affect actual fold");
const noisy=F.run(opts(173,"cooccurrence",.25));
assert(F.tvd(noisy.distribution,run.distribution)>1e-6,"classical noise proxy must alter the actual probabilities");
const constrained=F.run({...opts(),anchors:[2]});
for(const round of constrained.rounds){
 for(const lane of round.lanes){
  if(lane.window.includes(2)){
   for(const obs of lane.observations){
    if(!obs.passed)continue;
    assert.equal(obs.state&(1<<2),1<<2,"local oracle may mark only states respecting visible anchor");
   }
  }
 }
}
assert(constrained.ranked.every(r=>r.loci.includes(2)),"Condition must survive binding and truth gate");
const noSolution=F.run(opts(81));
assert.equal(noSolution.qualifiedCount,0);
assert.equal(noSolution.leaders.length,0);
assert.equal(noSolution.selected,null);
assert.equal(noSolution.parentGrover.iterations,0);
assert.equal(noSolution.stable,false,"empty candidate set is not verified success despite flat numerical distributions");
assert.throws(()=>F.run({...opts(),maxPasses:13}),/1 och 12/);
assert.throws(()=>F.run({...opts(),readoutNoise:.6}),/0 och 35/);
console.log("QCDS genome 16→4→1 rotating probability funnel numerical tests: PASS");
