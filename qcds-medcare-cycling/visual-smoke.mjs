/* © 2026 Patrik Sundblom. All Rights Reserved.
 * Real browser smoke evidence. Screenshot comparison requires human review;
 * a captured image is not proof of photorealism.
 */
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const out='qcds-medcare-cycling/visual-evidence';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
const errors=[],consoleErrors=[],steps=[];
page.on('pageerror',e=>errors.push(e.stack||String(e)));
page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
page.on('response',r=>{if(r.status()>=400&&new URL(r.url()).origin==='http://127.0.0.1:8765')errors.push('HTTP '+r.status()+' '+r.url());});
async function shot(name){await page.screenshot({path:out+'/'+name+'.png',fullPage:false});steps.push(name);}
try{
 await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForTimeout(3000);
 await shot('01-initial');
 const demo=page.locator('#raceDemo');
 if(await demo.isVisible()){await demo.click();steps.push('raceDemo clicked');}
 else if(await page.locator('#demoBtn').isVisible()){await page.locator('#demoBtn').click();steps.push('demoBtn clicked');}
 else throw Error('No visible demo launch control');
 await page.waitForTimeout(1800);
 await shot('02-demo');
 const ride=page.locator('#ride');
 await ride.evaluate(el=>{el.classList.add('active');el.style.display='block';});
 const button=page.locator('#qcdsWorldToggle');
 await button.scrollIntoViewIfNeeded();
 await button.click({timeout:8000});
 await page.waitForTimeout(2500);
 const result=await page.evaluate(()=>{
  const canvas=document.querySelector('#qcdsWorldCanvas');
  const gl=canvas?.getContext('webgl2');
  return {visible:!!canvas&&!canvas.hidden,width:canvas?.width,height:canvas?.height,
   webgl2:!!gl,webglError:gl?.getError(),ready:!!window.__cyclingReady,
   button:document.querySelector('#qcdsWorldToggle')?.textContent};
 });
 await shot('03-qcds-webgl');
 await fs.writeFile(out+'/results.json',JSON.stringify({steps,result,errors,consoleErrors},null,2));
 if(!result.visible||!result.webgl2||result.width<100||result.height<100)throw Error('QCDS world canvas failed visible WebGL smoke');
 if(errors.length)throw Error('Runtime errors: '+errors.join(' | '));
 console.log('QCDS browser smoke PASS; screenshots require visual quality review',result);
}catch(e){
 await shot('failure').catch(()=>{});
 await fs.writeFile(out+'/results.json',JSON.stringify({steps,errors,consoleErrors,failure:String(e)},null,2));
 throw e;
}finally{await browser.close();}
