/* © 2026 Patrik Sundblom. All Rights Reserved.
 * Fail-closed downloadable artifact gate; does not claim graphics WASM.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const base = process.argv[2] || 'qcds-medcare-cycling/visual-evidence';
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const required = [
  'QCDS-CYCLING-WASM-OFFLINE.html','core.wasm','wasm-build-manifest.json',
  '07-wasm-offline.png','04-fixed-camera.png','05-random-camera.png',
  '06-two-camera-checkpoint.png','qcds-source.tar.gz','qcds-source.sha256',
  'source-commit.txt','results.json','run-metadata.json'
];
const read = name => fs.readFileSync(path.join(base,name));
for(const name of required){
  const file = path.join(base,name);
  assert.ok(fs.existsSync(file) && fs.statSync(file).size > 0,`Missing/empty delivery file: ${name}`);
}
const wasm=read('core.wasm');
const manifest=JSON.parse(read('wasm-build-manifest.json'));
const html=read('QCDS-CYCLING-WASM-OFFLINE.html').toString('utf8');
const match=html.match(/const base64='([A-Za-z0-9+/=]+)',expected='([0-9a-f]{64})'/);
assert.ok(match,'Offline HTML does not embed verified WASM');
assert.deepEqual(Buffer.from(match[1],'base64'),wasm,'Embedded WASM differs from artifact WASM');
assert.equal(sha(wasm),manifest.sha256,'WASM manifest mismatch');
assert.equal(sha(wasm),match[2],'WASM HTML hash mismatch');
const m=new WebAssembly.Module(wasm);
const instance=new WebAssembly.Instance(m);
assert.equal(instance.exports.qcds_chp(...manifest.probe.args),manifest.probe.result,'Real WASM probe mismatch');
for(const name of required.filter(x=>x.endsWith('.png'))){
  const png=read(name);
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a',`Invalid PNG ${name}`);
  assert.ok(png.length>1000,`Tiny PNG ${name}`);
}
assert.notEqual(sha(read('04-fixed-camera.png')),sha(read('05-random-camera.png')),'Identical camera screenshots');
const commit=read('source-commit.txt').toString('utf8').trim();
assert.match(commit,/^[0-9a-f]{40}$/,'Missing full commit SHA');
if(process.env.GITHUB_SHA)assert.equal(commit,process.env.GITHUB_SHA,'Artifact commit differs from CI checkout');
const meta=JSON.parse(read('run-metadata.json'));
assert.equal(meta.commit,commit,'Browser evidence and source commits differ');
assert.equal(meta.browserEvidenceComplete,true,'Browser evidence incomplete');
assert.equal(meta.twoCameraEvidenceComplete,true,'Two camera evidence incomplete');
console.log('PASS deliverable gate:',commit,'WASM',sha(wasm),'PNG',4);
