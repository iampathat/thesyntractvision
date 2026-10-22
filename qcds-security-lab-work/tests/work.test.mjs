import test from 'node:test';
import assert from 'node:assert/strict';
import {newProject,analyze,validateProject,fingerprint} from '../dist/core/engine.mjs';
import {runDimensionExperiment} from '../dist/core/logical-space.mjs';
import {compareExecution} from '../dist/core/quantum-compare.mjs';
import {reportShell,reportFilename} from '../dist/report-view.js';

test('new custom cases start unknown and observations never cross scope',()=>{
 const p=newProject('custom');
 assert.ok(Object.values(p.input.flags).every(v=>v===null));
 p.input.flags.external_input=true;p.input.flags.untrusted_content=true;
 const m=analyze(p.input,[],[]);
 p.evidence=[{id:'qa',findingId:'F1',source:'Synthetic QA only',observation:'Marker rejected',outcome:'refutes',fingerprint:m.fingerprint,createdAt:'2026-10-21T00:00:00Z'}];
 assert.equal(analyze(p.input,p.evidence,[]).findings.find(r=>r.id==='F1').status,'REFUTED · REPORTED');
 p.input.name='Changed scope';
 const changed=analyze(p.input,p.evidence,[]);
 assert.equal(changed.archivedEvidence,1);
 assert.equal(changed.findings.find(r=>r.id==='F1').status,'HYPOTHESIS');
});
test('Work project remains round-trippable through the original format',()=>{
 const p=newProject('coding');p.evidence=[];p.actions={};
 p.research={focus:'AV001',walk:[{key:'external_input',value:'?'}],maxIterations:40};
 const result=validateProject(JSON.parse(JSON.stringify(p)));
 assert.equal(fingerprint(result.input),fingerprint(p.input));
 assert.equal(result.research.walk[0].value,'?');
});
test('actual dimensional and gate calculations agree on a quarter-space oracle',()=>{
 const p=newProject('coding'),m=analyze(p.input,[],[]);
 const run=runDimensionExperiment(m,{focus:'AV001',maxIterations:40,walk:[{key:'external_input',value:'?'},{key:'untrusted_content',value:'?'}]});
 assert.equal(run.final.markedStates,'2');assert.equal(run.final.totalStates,'8');
 assert.equal(run.final.amplification.iterations,1);assert.ok(run.final.amplification.probability>0.999999);
 const q=compareExecution(run,{shots:4096,seed:173});
 assert.ok(q.ideal.maxReferenceError<1e-10);assert.ok(q.noisy.probability<q.ideal.probability);
 assert.equal(q.noise.shots,4096);assert.equal(run.binding.status,'AWAITING TESTS');
});
test('report controls escape supplied text and produce safe download filenames',()=>{
 const p=newProject('coding');p.input.name='<img src=x onerror=alert(1)>';
 const m=analyze(p.input,p.evidence,[]),html=reportShell(m);
 assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img src=x'));
 assert.equal(reportFilename('Åtgärder / Översikt'), 'QCDS-atgarder-oversikt-security-report.pdf');
 assert.ok(!reportFilename(p.input.name).includes('<'));
});
