import test from 'node:test';
import assert from 'node:assert/strict';
import {newProject,validateProject} from '../engine.mjs';
import {restoreWorkspace,writeWorkspace,mergeWorkspace,copyAsOwnProject,WORKSPACE_KEY} from '../workspace.mjs';

test('legacy and personal cases round-trip with independent places and archives',()=>{
  const original={caseId:'case-a',cases:{portal:newProject('portal'),'case-a':newProject('custom'),'case-b':newProject('custom')},places:{'case-a':{question:4,findingId:'F3'},'case-b':{question:2,findingId:null}},archived:['case-b']};
  let saved;
  writeWorkspace({setItem:(key,value)=>{assert.equal(key,WORKSPACE_KEY);saved=value;}},original);
  const restored=restoreWorkspace(JSON.parse(saved),validateProject);
  assert.equal(restored.caseId,'case-a');
  assert.deepEqual(restored.places['case-a'],{question:4,findingId:'F3'});
  assert.deepEqual(restored.archived,['case-b']);
  assert.equal(restored.cases.portal.evidence.length,1);
  assert.equal(restored.cases['case-a'].updatedAt,original.cases['case-a'].updatedAt);
});

test('bad saved cases do not destroy valid cases and original data stays in recovery backup',()=>{
  const saved={caseId:'case-bad',cases:{'case-bad':{valuable:'unread data'},'case-ok':newProject('custom')}};
  const result=restoreWorkspace(saved,validateProject);
  assert.equal(result.caseId,'case-ok');
  assert.deepEqual(result.rejected,['case-bad']);
  assert.equal(JSON.parse(result.recovery).cases['case-bad'].valuable,'unread data');
  let roundtrip;
  writeWorkspace({setItem:(_,s)=>roundtrip=JSON.parse(s)},result);
  assert.equal(restoreWorkspace(roundtrip,validateProject).recovery,result.recovery);
});

test('copying a worked example removes synthetic evidence but preserves explicit system facts',()=>{
  const p=newProject('portal');
  const copy=copyAsOwnProject(p);
  assert.equal(copy.example,false);
  assert.deepEqual(copy.evidence,[]);
  assert.deepEqual(copy.input.flags,p.input.flags);
  copy.input.name='Independent';
  assert.notEqual(copy.input.name,p.input.name);
  assert.equal(p.evidence.length,1);
});

test('storage quota errors are propagated without deleting the prior saved workspace',()=>{
  const previous='keep existing work';let disk=previous;
  const storage={setItem:()=>{throw new Error('Quota exceeded');},removeItem:()=>{disk=null;}};
  assert.throws(()=>writeWorkspace(storage,{caseId:'custom',cases:{custom:newProject('custom')},places:{},archived:[]}),/Quota exceeded/);
  assert.equal(disk,previous);
});

test('backup import preserves progress, archives and evidence without overwriting existing cases',()=>{
  const current={caseId:'portal',cases:{portal:newProject('portal')},places:{portal:{question:2,findingId:'F3'}},archived:[]};
  const incoming=restoreWorkspace({caseId:'case-a',cases:{'case-a':newProject('custom'),'case-b':newProject('portal')},places:{'case-a':{question:4,findingId:'F2'}},archived:['case-b']},validateProject);
  let n=0;
  const merged=mergeWorkspace(current,incoming,()=>`case-import-${++n}`);
  assert.equal(merged.caseId,'case-import-1');
  assert.deepEqual(merged.places['case-import-1'],{question:4,findingId:'F2'});
  assert.deepEqual(merged.archived,['case-import-2']);
  assert.equal(merged.cases['case-import-2'].evidence.length,1);
  assert.equal(merged.cases['case-import-2'].example,true);
  assert.equal(merged.cases.portal,current.cases.portal);
  assert.equal(Object.keys(current.cases).length,1);
  assert.throws(()=>mergeWorkspace(current,incoming,()=> 'portal'),/independent case ID/);
});
