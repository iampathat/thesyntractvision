/* © 2026 Patrik Sundblom. All Rights Reserved.
 * Offline diagnostic of EXISTING compiled numeric WASM kernel, not graphics engine.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
const wasm=fs.readFileSync('qcds-medcare-cycling/core.wasm');
const hash=crypto.createHash('sha256').update(wasm).digest('hex');
const mod=new WebAssembly.Module(wasm);
const names=WebAssembly.Module.exports(mod).map(x=>x.name);
for(const name of ['qcds_chp','qcds_course_index','qcds_grade_percent','qcds_power_filter'])if(!names.includes(name))throw Error('Missing WASM export '+name);
const probe=new WebAssembly.Instance(mod).exports.qcds_chp(150,80,0);
if(!Number.isFinite(probe))throw Error('WASM execution failed');
const html=`<!doctype html><html lang="sv"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QCDS Cycling WASM offline diagnostic</title><style>body{font:16px system-ui;background:#081726;color:#eaf5ff;max-width:720px;margin:6vh auto;padding:20px}button{padding:14px;background:#1c8b85;color:white;border:0;border-radius:8px}pre{white-space:pre-wrap;background:#142c3d;padding:16px;border-radius:8px}</style><h1>QCDS Cycling — WASM diagnostic</h1><p>Verklig kompilerad cykelberäkningskärna. <strong>Inte den fullständiga WebGL-världen.</strong> Fullständig app och källkod ingår separat i artefakten.</p><button id="run">Kör verklig WASM</button><pre id="output">Väntar på test.</pre><script>
const base64='${wasm.toString('base64')}',expected='${hash}',names=${JSON.stringify(names)};
async function run(){const out=document.querySelector('#output');try{const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');if(digest!==expected)throw Error('SHA-256 mismatch');const {instance}=await WebAssembly.instantiate(bytes);for(const name of names)if(!(name in instance.exports))throw Error('Missing export '+name);const value=instance.exports.qcds_chp(150,80,0);if(!Number.isFinite(value))throw Error('Invalid result');out.textContent='PASS — real WebAssembly executed\\nSHA-256: '+digest+'\\nqcds_chp(150,80,0) = '+value+'\\nExports: '+names.join(', ');}catch(e){out.textContent='FAIL: '+e.message;throw e}}
document.querySelector('#run').addEventListener('click',()=>run().catch(console.error));
</script><footer>© 2026 Patrik Sundblom. All Rights Reserved.</footer></html>`;
const out='qcds-medcare-cycling/visual-evidence';fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(out+'/QCDS-CYCLING-WASM-OFFLINE.html',html);
fs.writeFileSync(out+'/core.wasm',wasm);
fs.writeFileSync(out+'/wasm-build-manifest.json',JSON.stringify({sha256:hash,bytes:wasm.length,exports:names,probe:{name:'qcds_chp',args:[150,80,0],result:probe},scope:'numeric cycling kernel only; NOT WebGL graphics engine'},null,2));
console.log('PASS compiled WASM embedded and probed',hash,probe);
