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
let lastResult=null;
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
  const rect=canvas?.getBoundingClientRect();
  const style=canvas?getComputedStyle(canvas):null;
  const viewportVisible=!!rect&&rect.width>=100&&rect.height>=100&&rect.right>0&&rect.bottom>0&&rect.left<innerWidth&&rect.top<innerHeight;
  const painted=!!style&&style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)>0;
  return {visible:!!canvas&&!canvas.hidden&&viewportVisible&&painted,viewportVisible,painted,
   cssWidth:rect?.width,cssHeight:rect?.height,width:canvas?.width,height:canvas?.height,
   webgl2:!!gl,webglError:gl?.getError(),ready:!!window.__cyclingReady,
   button:document.querySelector('#qcdsWorldToggle')?.textContent};
 });
 lastResult=result;
 await shot('03-qcds-webgl');
 // Both frames are captured from the same live WebGL canvas and the same QCDS field.
 // The random camera is reproducible from the recorded seed, never an image substitute.
 const worldSeed='qcds-baseline',cameraSeed='camera-001';
 const cameraMetadata=await page.evaluate(({worldSeed,cameraSeed})=>{
  const renderer=window.__qcdsWorldRenderer;
  if(!renderer?.setCamera||!renderer?.cameraEvidence)throw Error('Live WebGL camera control unavailable');
  renderer.worldSeed=worldSeed;
  renderer.setCamera('fixed',cameraSeed);
  return renderer.cameraEvidence();
 },{worldSeed,cameraSeed});
 const worldCanvas=page.locator('#qcdsWorldCanvas');
 await worldCanvas.screenshot({path:out+'/04-fixed-camera.png'});
 await page.evaluate(seed=>window.__qcdsWorldRenderer.setCamera('random',seed),cameraSeed);
 await page.waitForTimeout(250);
 await worldCanvas.screenshot({path:out+'/05-random-camera.png'});
 const randomEvidence=await page.evaluate(()=>window.__qcdsWorldRenderer.cameraEvidence());
 if(JSON.stringify(cameraMetadata.fixed)===JSON.stringify(randomEvidence.random))
  throw Error('Two camera positions are identical');
 // Compose the two *actual* WebGL screenshots into a single labeled image.
 const fixedPng=await fs.readFile(out+'/04-fixed-camera.png');
 const randomPng=await fs.readFile(out+'/05-random-camera.png');
 const composite=await browser.newPage({viewport:{width:1600,height:570},deviceScaleFactor:1});
 await composite.setContent('<html><body style="margin:0;background:#0b1522;color:white;font:17px sans-serif"><header style="padding:12px">QCDS Cycling | Visual checkpoint #001 | fixed vs seeded random camera</header><main style="display:flex;gap:8px;padding:8px"><section style="width:50%"><div>FIXED CAMERA</div><img id="fixed" style="width:100%" /></section><section style="width:50%"><div>RANDOM CAMERA | seed camera-001</div><img id="random" style="width:100%" /></section></main></body></html>');
 await composite.evaluate(([a,b])=>{document.querySelector('#fixed').src='data:image/png;base64,'+a;document.querySelector('#random').src='data:image/png;base64,'+b;},[fixedPng.toString('base64'),randomPng.toString('base64')]);
 await composite.locator('#fixed').evaluate(img=>img.decode());
 await composite.locator('#random').evaluate(img=>img.decode());
 await composite.screenshot({path:out+'/06-two-camera-checkpoint.png'});
 await composite.close();
 steps.push('fixed and seeded random QCDS WebGL cameras captured');

 await fs.writeFile(out+'/results.json',JSON.stringify({steps,result,cameraMetadata,randomEvidence,errors,consoleErrors},null,2));
 if(!result.visible||!result.webgl2||result.width<100||result.height<100)throw Error('QCDS world canvas failed viewport-visible WebGL smoke: '+JSON.stringify(result));
 if(result.webglError!==0)throw Error('WebGL reported GL error '+result.webglError);
 if(errors.length)throw Error('Runtime errors: '+errors.join(' | '));
 if(consoleErrors.length)throw Error('Browser console errors: '+consoleErrors.join(' | '));
 for(const name of ['01-initial','02-demo','03-qcds-webgl','04-fixed-camera','05-random-camera','06-two-camera-checkpoint']){
  const png=await fs.readFile(out+'/'+name+'.png');
  if(png.length<1024||png.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')
   throw Error('Missing, truncated or invalid PNG evidence: '+name);
 }
 console.log('QCDS browser smoke PASS; screenshots require visual quality review',result);
}catch(e){
 await shot('failure').catch(()=>{});
 await fs.writeFile(out+'/results.json',JSON.stringify({steps,result:lastResult,errors,consoleErrors,failure:String(e),stack:e?.stack||null},null,2));
 throw e;
}finally{await browser.close();}
