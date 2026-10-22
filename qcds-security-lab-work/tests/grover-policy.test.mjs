import test from 'node:test';
import assert from 'node:assert/strict';
import {groverPlan} from '../dist/core/grover-policy.mjs';
import {newProject,analyze,validateProject} from '../dist/core/engine.mjs';
import {runDimensionExperiment} from '../dist/core/logical-space.mjs';
import {compareExecution} from '../dist/core/quantum-compare.mjs';
import {EXAMPLES,loadExample,guideView} from '../dist/guided-work.js';

test('adaptive Grover stops at the target instead of drawing forty steps',()=>{
 const quarter=groverPlan(1n,4n), rare=groverPlan(1n,256n);
 assert.equal(quarter.selected.iteration,1);assert.equal(quarter.trace.length,2);
 assert.equal(rare.selected.iteration,11);assert.equal(rare.evaluatedIterations,11);
 assert.equal(rare.reason,'threshold_reached');assert.equal(rare.cap,40);
});
test('a repeating half-space stops and retains the earliest equal result',()=>{
 const p=groverPlan(1n,2n);assert.equal(p.reason,'gain_stalled');
 assert.equal(p.evaluatedIterations,3);assert.equal(p.selected.iteration,0);
 assert.ok(Math.abs(p.selected.probability-0.5)<1e-12);assert.equal(p.reached,false);
});
test('adaptive stop preserves budget limits and tiny improving probabilities',()=>{
 assert.equal(groverPlan(0n,4n).trace.length,1);assert.equal(groverPlan(4n,4n).trace.length,1);
 assert.equal(groverPlan(1n,256n,{maxIterations:0}).selected.iteration,0);
 assert.equal(groverPlan(1n,256n,{maxIterations:2}).evaluatedIterations,2);
 const tiny=groverPlan(1n,1n<<100n,{maxIterations:999});
 assert.equal(tiny.cap,40);assert.equal(tiny.evaluatedIterations,40);assert.equal(tiny.reason,'iteration_limit');
 assert.ok(tiny.selected.probability>tiny.initialProbability*6000);
});
test('noisy gate selection also stops on lack of improvement; manual runs stay explicit',()=>{
 const p=newProject('coding'),m=analyze(p.input,[],[]);
 const run=runDimensionExperiment(m,{focus:'AV001',walk:[{key:'external_input',value:'?'}]});
 const q=compareExecution(run,{selection:'noisy',noise:{single:0,two:0,readout:0}});
 assert.equal(q.alignment.reason,'gain_stalled');assert.equal(q.alignment.executedIterations,3);
 assert.equal(q.circuit.iterations,0);assert.ok(q.ideal.maxReferenceError<1e-10);
 const manual=compareExecution(run,{iterations:7});assert.equal(manual.alignment.executedIterations,7);assert.equal(manual.circuit.iterations,7);
});
test('all worked examples load the same scoped data through every step and export',()=>{
 for(const [id,g] of Object.entries(EXAMPLES)){
   const p=validateProject(JSON.parse(JSON.stringify(loadExample(id))));
   const m=analyze(p.input,p.evidence,p.excludedLenses);
   assert.ok(m.routes.some(r=>r.id===g.focus),id);assert.equal(m.archivedEvidence,0,id);
   assert.equal(p.evidence.length,g.observation?1:0,id);
   for(let step=1;step<=5;step++){const html=guideView(p,m,step,g.focus);assert.ok(html.includes('STEG '+step+' AV 5'));assert.ok(html.includes('syntetiska'));}
 }
 const invoice=loadExample('invoice');assert.equal(invoice.input.flags.rag,null);
 assert.ok(analyze(invoice.input,[],[]).routes.find(r=>r.id==='F4').conditional);
});
