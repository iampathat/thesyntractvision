#!/usr/bin/env node
"use strict";
/*
QCDS Oncology Lab — architecture-first measurement harness.
Theory and creation: Patrik Sundblom.
R&D support: OpenAI / ChatGPT.

Measures ACTUAL published source modules without replacing their algorithms.
Does not claim classical simulation time == quantum hardware performance.
Never converts unlike mathematical tasks into a misleading "speedup".
*/
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { performance } = require("node:perf_hooks");
const Q = require("./qcds-core.js");
const D = require("./genome-discovery.js");
const F = require("./genome-funnel.js");

const ROOT = __dirname;
const SHOTS = 4096;
const repetitionsArg = process.argv.find(s => s.startsWith("--repeats="));
const repeats = repetitionsArg ? Number(repetitionsArg.slice(10)) : 7;
if (!Number.isInteger(repeats) || repeats < 1 || repeats > 100)
  throw Error("Use --repeats=N with N between 1 and 100.");

function sha(name) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, name))).digest("hex");
}
function median(a) {
  const s = [...a].sort((x,y) => x-y);
  return s[Math.floor(s.length/2)];
}
function p95(a) {
  const s = [...a].sort((x,y) => x-y);
  return s[Math.ceil(.95*s.length)-1];
}
function time(fn) {
  const cpu0 = process.cpuUsage(), t0 = performance.now();
  const result = fn();
  const elapsed = performance.now()-t0, cpu = process.cpuUsage(cpu0);
  return {result,ms:elapsed,cpuMs:(cpu.user+cpu.system)/1000};
}
function measure(label,fn,summarize) {
  fn(); // warmup excluded, same deterministic inputs
  const elapsed = [], cpu = [];
  let summary = null;
  for(let i=0;i<repeats;i++) {
    const r=time(fn);
    elapsed.push(r.ms);cpu.push(r.cpuMs);
    const s=summarize(r.result);
    if(summary!==null && JSON.stringify(s)!==JSON.stringify(summary))
      throw Error("Non-deterministic result at " + label);
    summary=s;
  }
  return {label,medianWallMs:median(elapsed),p95WallMs:p95(elapsed),
    medianProcessCpuMs:median(cpu),repetitions:repeats,summary};
}
function setEqual(a,b) {
  return a.length===b.length && a.every((v,i)=>v===b[i]);
}
function enumerateQualified(settings) {
  const required = D.mask(settings.anchors);
  const states=[];
  let checked=0;
  for(let state=1;state<D.N;state++) {
    const count=D.countBits(state);
    if(count<2 || count>4 || (state&required)!==required) continue;
    checked++;
    const a=D.assess(state,settings.dataset,settings.relation);
    if(a.caseCount>=settings.minCases && a.controlCount<=settings.maxControls && a.contrast>0)
      states.push(state);
  }
  return {checked,states};
}
function funnelSummary(r) {
  const local = r.rounds.flatMap(round=>round.lanes);
  if(local.length!==r.rotations*16) throw Error("Wrong 16-lane funnel shape");
  const classical=enumerateQualified({
    dataset:r.dataset,...r.settings
  });
  const expected=classical.states.slice().sort((a,b)=>a-b);
  const found=r.ranked.map(v=>v.state).sort((a,b)=>a-b);
  if(!setEqual(expected,found)) throw Error("Full-cohort admissibility mismatch");
  if(r.selected && !classical.states.includes(r.selected.state)) throw Error("Inadmissible highlighted state");
  if(!classical.states.length && r.stable) throw Error("Null result must not be verified");
  const localGroverIterations=local.reduce((a,b)=>a+b.iterations,0);
  const parentGroverIterations=r.parentGrover.iterations;
  return {
    datasetSeed:r.dataset.seed,mode:r.dataset.mode,cohortCases:r.dataset.cases.length,
    cohortControls:r.dataset.controls.length,domainCount:r.domainCount,
    fullCohortStatesChecked:classical.checked,qualifiedStates:classical.states.length,
    passes:r.rotations,localLanes:local.length,localStateCount:16,
    localGroverIterations,parentGroverIterations,
    totalIdealGroverQueriesPerShot:localGroverIterations+parentGroverIterations,
    illustrativeCircuitExecutionsAt4096Shots:(local.length+1)*SHOTS,
    illustrativeIdealOracleCallsAt4096Shots:(localGroverIterations+parentGroverIterations)*SHOTS,
    parentMarkedMass:r.parentGrover.markedMass,
    numericallyStable:r.numericallyStable,verifiedNonempty:r.stable,
    highlightedLoci:r.selected ? r.selected.loci : null,
    fullCohortRulesCheckedClassically:true
  };
}
function qcds8Summary(r) {
  const observations=r.cycles.flatMap(c=>c.laneObservations);
  if(r.cycles.some(c=>c.laneCount!==128 || c.familyCount!==8))
    throw Error("Wrong 128->8->1 topology");
  const localQueries=observations.reduce((a,c)=>a+c.groverIterations,0);
  const parentQueries=r.cycles.reduce((a,c)=>a+c.parent.grover.iterations,0);
  for(const bits of Object.keys(r.finalDistribution)) {
    const state=Array.from(bits).reduce((a,b,i)=>a+(Number(b)<<i),0);
    if(!Q.stateMatchesMask(state,r.inputMask)) throw Error("Condition was lost");
  }
  const mass=Object.values(r.finalDistribution).reduce((a,b)=>a+b,0);
  if(Math.abs(mass-1)>1e-8)throw Error("Non-normalized final distribution");
  return {inputMask:r.inputMask,cycles:r.cycles.length,
    localLanes:observations.length,exclusionFamiliesPerCycle:8,
    rotationBanksPerCycle:16,localStateCount:128,
    localGroverIterations:localQueries,
    parentGroverIterations:parentQueries,
    totalIdealGroverQueriesPerShot:localQueries+parentQueries,
    illustrativeCircuitExecutionsAt4096Shots:(observations.length+r.cycles.length)*SHOTS,
    illustrativeIdealOracleCallsAt4096Shots:(localQueries+parentQueries)*SHOTS,
    finalState:r.finalState,finalResolved:r.finalResolved,
    numericallyStable:r.cycles[r.cycles.length-1].stability.stable,
    parentMarkedMass:r.cycles[r.cycles.length-1].parent.grover.markedMass,
    classicalOracleCompilationIsCurrentlyExplicit:true,
    probabilityPoolingIsCurrentlyClassical:true
  };
}

const hypotheses=[
  {name:"dna_repair",mask:"11??0???"},
  {name:"pi3k_axis",mask:"??1?1???"},
  {name:"receptor_axis",mask:"???111??"},
  {name:"hr_plus_broad",mask:"1??1????"},
  {name:"pi3k_hr_combo",mask:"??11????"}
];
const configs=[
  {inputMask:"????????",hypotheses,maxCycles:3},
  {inputMask:"1111????",hypotheses,maxCycles:3}
];
const results=[];
for(const config of configs)
  results.push(measure("8D 128->8->1 " + config.inputMask,
    ()=>Q.runCancerQCDS(config),qcds8Summary));

for(const {seed,mode} of [{seed:173,mode:"structure"},{seed:42,mode:"structure"},{seed:81,mode:"null"}]) {
  const dataset=D.generateProfiles(seed,mode,5,5);
  const settings={dataset,anchors:[],relation:"cooccurrence",
    minCases:3,maxControls:1,readoutNoise:0,maxPasses:6};
  const classic=measure("10D exhaustive eligibility " + seed,
    ()=>enumerateQualified(settings),
    x=>({seed,checked:x.checked,qualified:x.states.length}));
  const funnel=measure("10D full 16->4->1 QCDS funnel " + seed,
    ()=>F.run(settings),funnelSummary);
  results.push(classic,funnel);
}

const payload={
  title:"QCDS Oncology Lab: original-architecture reference benchmarking",
  author:"Patrik Sundblom",support:"OpenAI / ChatGPT (research and development)",
  generatedUTC:new Date().toISOString(),
  environment:{platform:process.platform,arch:process.arch,node:process.version,
    cpu:os.cpus()[0]?.model||"unknown",logicalCores:os.cpus().length,
    memoryBytes:os.totalmem()},
  sources:Object.fromEntries(["qcds-core.js","genome-discovery.js","genome-funnel.js"]
    .map(name=>[name,sha(name)])),
  repeats,warmupRunsPerScenario:1,assumedShotsForResourceIllustration:SHOTS,
  interpretations:{
    time:"Measured reference-model execution time in Node.js, not hardware QCDS quantum runtime.",
    baselines:"Exact classical enumeration measures admissibility only; QCDS also produces probability synthesis and recursion. No speedup ratio is valid between these unlike outputs.",
    oracles:"Grover iteration totals count ideal phase-oracle queries, not actual gates, depth, state preparation or quantum hardware cost.",
    shots:"The shots figures are illustrative, NOT actually sampled. Node models ideal amplitudes.",
    quantumAdvantage:"UNMEASURED — needs the same oracle, equal output criteria, gate/depth/readout/accounting and a physical or calibrated quantum backend.",
    noTraining:"Neither these demonstrators nor the eligibility baseline trains ML weights; this does not benchmark an LLM training workload.",
    truth:"Numerical stability and Grover marked mass are NOT independent truth or clinical validation."
  },
  scenarios:results
};
const outDir=path.join(ROOT,"results");
fs.mkdirSync(outDir,{recursive:true});
const out=path.join(outDir,"qcds-oncology-architecture-"+new Date().toISOString().replace(/[:.]/g,"-")+".json");
fs.writeFileSync(out,JSON.stringify(payload,null,2)+"\n");
console.log("QCDS ORIGINAL ARCHITECTURE — reference benchmark");
for(const r of results) console.log(r.label + ": " + r.medianWallMs.toFixed(3) + " ms median; " +
 r.p95WallMs.toFixed(3) + " ms p95; "+JSON.stringify(r.summary));
console.log("WARNING: NO quantum speedup or LLM cost ratio inferred from these numbers.");
console.log("Result: "+out);
