/* © 2026 Patrik Sundblom. All Rights Reserved. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

// Black-box regression tests for ci-evidence.mjs. No application files are mutated.
const source = new URL('./ci-evidence.mjs', import.meta.url);
const names=['01-initial.png','02-demo.png','03-qcds-webgl.png','04-fixed-camera.png','05-random-camera.png','06-two-camera-checkpoint.png'];
const pngMagic=Buffer.from('89504e470d0a1a0a','hex');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'qcds-ci-evidence-'));
const baseline={steps:['03-qcds-webgl'],result:{webgl2:true,visible:true,webglError:0},errors:[],consoleErrors:[],cameraMetadata:{worldSeed:'qcds-baseline',cameraSeed:'camera-001',fixed:{position:[0,2,5]}},randomEvidence:{worldSeed:'qcds-baseline',cameraSeed:'camera-001',random:{position:[3,4,7]}}};
function run(modify=()=>{},missing=null,identical=false){
 const dir=fs.mkdtempSync(path.join(root,'case-'));
 const evidence=structuredClone(baseline);modify(evidence);
 fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify(evidence));
 names.forEach((name,i)=>{if(name!==missing){const bytes=Buffer.alloc(1200,identical && (i===3||i===4)?4:i+1);pngMagic.copy(bytes);fs.writeFileSync(path.join(dir,name),bytes);}});
 const p=spawnSync(process.execPath,[source.pathname],{env:{...process.env,QCDS_EVIDENCE_DIR:dir,GITHUB_SHA:'a'.repeat(40),GITHUB_EVENT_NAME:'push',GITHUB_RUN_ID:'123',GITHUB_REPOSITORY:'iampathat/thesyntractvision'},encoding:'utf8'});
 assert.equal(p.status,0,p.stderr);
 return JSON.parse(fs.readFileSync(path.join(dir,'run-metadata.json'),'utf8'));
}
try{
 let count=0;
 function check(label,fn,expected){const m=fn();assert.equal(m.browserEvidenceComplete,expected,label);count++;console.log('PASS',label);}
 check('complete evidence',()=>run(),true);
 check('identical camera positions',()=>run(x=>x.randomEvidence.random.position=[0,2,5]),false);
 check('different world seeds',()=>run(x=>x.randomEvidence.worldSeed='other'),false);
 check('different camera seeds',()=>run(x=>x.randomEvidence.cameraSeed='other'),false);
 check('WebGL2 absent',()=>run(x=>x.result.webgl2=false),false);
 check('runtime error',()=>run(x=>x.errors.push('renderer failed')),false);
 check('missing PNG',()=>run(()=>{},'05-random-camera.png'),false);
 check('identical camera PNG bytes',()=>run(()=>{},null,true),false);
 console.log(`CI evidence regression: ${count} scenarios passed`);
}finally{fs.rmSync(root,{recursive:true,force:true});}
