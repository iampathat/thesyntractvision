/* © 2026 Patrik Sundblom. All Rights Reserved. */
import fs from 'node:fs';
import path from 'node:path';
const dir = process.env.QCDS_EVIDENCE_DIR || 'qcds-medcare-cycling/visual-evidence';
fs.mkdirSync(dir,{recursive:true});
const file=path.join(dir,'results.json');
let evidence=null, parseError=null;
try { evidence=JSON.parse(fs.readFileSync(file,'utf8')); }
catch(error) { parseError=error.message; }
const id=process.env.GITHUB_RUN_ID||null;
const repo=process.env.GITHUB_REPOSITORY||null;
const meta={
 schemaVersion:1,
 commit:process.env.GITHUB_SHA||null,
 event:process.env.GITHUB_EVENT_NAME||null,
 runId:id,
 runAttempt:process.env.GITHUB_RUN_ATTEMPT||null,
 runUrl:repo&&id?`https://github.com/${repo}/actions/runs/${id}`:null,
 jobStatus:process.env.QCDS_JOB_STATUS||null,
 evidencePresent:!!evidence,
 evidenceError:parseError,
 // Distinguish a completed browser smoke from a partial or corrupted artifact.
 // A job status of "success" alone does not prove visual evidence exists.
 browserEvidenceComplete:!!evidence &&
  Array.isArray(evidence.steps) &&
  evidence.steps.includes('03-qcds-webgl') &&
  evidence.result?.webgl2===true &&
  evidence.result?.visible===true &&
  evidence.result?.webglError===0 &&
  !evidence.failure &&
  Array.isArray(evidence.errors) && evidence.errors.length===0 &&
  Array.isArray(evidence.consoleErrors) && evidence.consoleErrors.length===0,

 webgl2:evidence?.result?.webgl2===true,
 canvasVisible:evidence?.result?.visible===true,
 glNoError:evidence?.result?.webglError===0,
 runtimeErrorCount:Array.isArray(evidence?.errors)?evidence.errors.length:null,
 consoleErrorCount:Array.isArray(evidence?.consoleErrors)?evidence.consoleErrors.length:null,
 failure:evidence?.failure||null,
 screenshots:['01-initial.png','02-demo.png','03-qcds-webgl.png'].map(name=>{
  const p=path.join(dir,name);
  return {name,bytes:fs.existsSync(p)?fs.statSync(p).size:null};
 })
};
// Verify PNG magic bytes, not just sizes. Report this separately from browser
// evidence so incomplete artifacts cannot be mistaken for a green render.
meta.screenshots=meta.screenshots.map(shot=>{
 const filename=path.join(dir,shot.name);
 let validPng=false;
 try {
  const fd=fs.openSync(filename,'r');
  try {
   const magic=Buffer.alloc(8);
   validPng=fs.readSync(fd,magic,0,8,0)===8 &&
    magic.equals(Buffer.from('89504e470d0a1a0a','hex')) &&
    shot.bytes>=1024;
  } finally { fs.closeSync(fd); }
 } catch {}
 return {...shot,validPng};
});
meta.browserEvidenceComplete=meta.browserEvidenceComplete &&
 meta.screenshots.every(shot=>shot.validPng);
fs.writeFileSync(path.join(dir,'run-metadata.json'),JSON.stringify(meta,null,2)+'\n');
console.log('QCDS CI metadata:',meta.runUrl||'local run',meta.jobStatus||'unknown');
