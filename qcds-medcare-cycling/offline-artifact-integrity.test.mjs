/* © 2026 Patrik Sundblom. All Rights Reserved.
 * Fail-closed check: shipped standalone HTML embeds the EXACT compiled WASM.
 * Numeric-kernel delivery test, NOT a graphics-engine test.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const root='qcds-medcare-cycling/visual-evidence/';
const html=fs.readFileSync(root+'QCDS-CYCLING-WASM-OFFLINE.html','utf8');
const wasm=fs.readFileSync(root+'core.wasm');
const original=fs.readFileSync('qcds-medcare-cycling/core.wasm');
const manifest=JSON.parse(fs.readFileSync(root+'wasm-build-manifest.json','utf8'));
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const match=html.match(/const base64='([A-Za-z0-9+/=]+)',expected='([0-9a-f]{64})'/);
assert.ok(match,'Embedded WASM bytes and SHA-256 marker missing');
const embedded=Buffer.from(match[1],'base64');
assert.ok(embedded.length>0,'Empty embedded WASM');
assert.deepEqual(embedded,wasm,'HTML WASM differs from delivered binary');
assert.deepEqual(wasm,original,'Delivered WASM differs from checked-out core');
assert.equal(digest(wasm),match[2],'Embedded checksum mismatch');
assert.equal(digest(wasm),manifest.sha256,'Manifest checksum mismatch');
assert.equal(wasm.length,manifest.bytes,'Manifest size mismatch');
const mod=new WebAssembly.Module(embedded);
const exports=WebAssembly.Module.exports(mod).map(e=>e.name);
for(const name of ['qcds_chp','qcds_course_index','qcds_grade_percent','qcds_power_filter'])assert.ok(exports.includes(name),`Missing real export ${name}`);
const result=new WebAssembly.Instance(mod).exports.qcds_chp(...manifest.probe.args);
assert.ok(Number.isFinite(result),'WASM probe must be finite');
assert.equal(result,manifest.probe.result,'Manifest probe differs from real WASM');
assert.match(html,/WebAssembly\.instantiate\(bytes\)/,'HTML must instantiate WASM');
assert.match(html,/addEventListener\('click'/,'HTML must have executable button');
console.log('PASS offline WASM artifact integrity',digest(wasm),'probe',result);
