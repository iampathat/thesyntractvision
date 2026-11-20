/* © 2026 Patrik Sundblom. All Rights Reserved. */
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1000,height:700}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:8765/visual-evidence/QCDS-CYCLING-WASM-OFFLINE.html',{waitUntil:'load'});
 await page.locator('#run').click();
 await page.waitForFunction(()=>document.querySelector('#output').textContent.startsWith('PASS —'),null,{timeout:10000});
 const output=await page.locator('#output').innerText();
 const manifest=JSON.parse(await fs.readFile('qcds-medcare-cycling/visual-evidence/wasm-build-manifest.json','utf8'));
 if(!output.includes(manifest.sha256)||!output.includes(String(manifest.probe.result)))throw Error('WASM output/manifest mismatch: '+output);
 if(errors.length)throw Error('Browser errors: '+errors.join(' | '));
 await page.screenshot({path:'qcds-medcare-cycling/visual-evidence/07-wasm-offline.png'});
 console.log('PASS compiled WASM executed in standalone HTML',manifest.sha256,manifest.probe.result);
}finally{await browser.close();}
