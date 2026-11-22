/* © 2026 Patrik Sundblom. All Rights Reserved.
 * Real browser smoke evidence. Screenshot comparison requires human review;
 * a captured image is not proof of photorealism.
 */
import {chromium} from 'playwright';
import {auditLiveForestDraws} from './forest-draw-audit.mjs';
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
 // Evidence is taken from the live renderer, not from a separate scene generator.
 // A green CI run must not silently report "forest" when the actual GPU meshes
 // contain zero crown or trunk triangles.
 const forestGeometry=await page.evaluate(()=>{
  const renderer=window.__qcdsWorldRenderer;
  if(!renderer?.field?.oracle||!Array.isArray(renderer.meshes))
   throw Error('Live QCDS world renderer/mesh inventory unavailable');
  const forestDensity=Number(renderer.field.oracle.forestDensity)||0;
  // rebuild() inserts terrain, ridge, road, trunks, crowns, then optional water.
  const trunks=renderer.meshes[3]?.mesh?.count||0;
  const crowns=renderer.meshes[4]?.mesh?.count||0;
  return {forestDensity,trunkTriangles:trunks/3,crownTriangles:crowns/3,
   meshCount:renderer.meshes.length,worldSeed:renderer.worldSeed};
 });
 if(forestGeometry.forestDensity>0&&
    (!forestGeometry.trunkTriangles||!forestGeometry.crownTriangles))
  throw Error('QCDS forest oracle selected vegetation but live WebGL forest meshes are empty: '+JSON.stringify(forestGeometry));
 steps.push('live WebGL forest geometry inventory: '+JSON.stringify(forestGeometry));
 // Fail closed unless the actual live renderer submits both forest meshes.
 // Mesh existence alone cannot prove GPU drawcalls; compare bound VAO and index count.
 const forestDrawEvidence=await page.evaluate(async()=>{
  const {auditLiveForestDraws}=await import('./forest-draw-audit.mjs');
  return auditLiveForestDraws(window.__qcdsWorldRenderer);
 });
 steps.push('live WebGL forest drawcalls: '+JSON.stringify(forestDrawEvidence));
 // Prove that the *rendered forest* changes pixels in the fixed camera,
 // not merely that non-empty triangle buffers exist. Keep the same world,
 // camera, sun, road and riders for both captures.
 const forestPixelEvidence=await page.evaluate(async()=>{
  const renderer=window.__qcdsWorldRenderer;
  const canvas=renderer?.canvas;
  if(!renderer||!canvas)throw Error('Forest visibility: live renderer unavailable');
  renderer.setCamera('fixed','camera-001');
  const all=renderer.meshes;
  const trunks=all[3],crowns=all[4];
  if(!trunks||!crowns)throw Error('Forest visibility: expected GPU meshes missing');
  const capture=()=>{
   renderer.render();
   const gl=renderer.gl,w=canvas.width,h=canvas.height;
   const pixels=new Uint8Array(w*h*4);
   gl.finish();gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
   if(gl.getError()!==gl.NO_ERROR)throw Error('Forest visibility: WebGL readPixels failed');
   return pixels;
  };
  let bare,bareRepeat,forested;
  try{
   renderer.meshes=all.filter((_,i)=>i!==3&&i!==4);
   bare=capture();
   bareRepeat=capture();
  }finally{renderer.meshes=all;}
  forested=capture();
  const difference=(a,b)=>{
   let changed=0;
   for(let i=0;i<a.length;i+=4)
    if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>35)changed++;
   return changed;
  };
  const changed=difference(bareRepeat,forested),baselineNoise=difference(bare,bareRepeat);
  return {changedPixels:changed,baselineNoise,forestOnlyPixels:Math.max(0,changed-baselineNoise),totalPixels:canvas.width*canvas.height,
   ratio:changed/(canvas.width*canvas.height),trunkTriangles:trunks.mesh.count/3,crownTriangles:crowns.mesh.count/3};
 });
 if(forestGeometry.forestDensity>0&&forestPixelEvidence.forestOnlyPixels<100)
  throw Error('QCDS forest meshes exist but are not visible in fixed-camera pixels: '+JSON.stringify(forestPixelEvidence));
 steps.push('forest ON/OFF WebGL pixel comparison: '+JSON.stringify(forestPixelEvidence));
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
 const randomClearance=await page.evaluate(()=>{
  const renderer=window.__qcdsWorldRenderer;
  const evidence=renderer?.cameraEvidence();
  const position=evidence?.random?.position;
  if(!position||position.length!==3||!renderer?.field?.height)
   throw Error('Random-camera clearance: missing live QCDS camera or terrain field');
  const ground=renderer.field.height(position[0],position[2]);
  const clearance=position[1]-ground;
  if(!Number.isFinite(clearance))
   throw Error('Random-camera clearance: non-finite camera or terrain elevation');
  return {clearance,position,ground};
 });
 if(randomClearance.clearance<20)
  throw Error('Seeded random camera intersects the QCDS forest canopy: '+JSON.stringify(randomClearance));
 steps.push('seeded random camera terrain clearance: '+JSON.stringify(randomClearance));
 if(JSON.stringify(cameraMetadata.fixed)===JSON.stringify(randomEvidence.random))
  throw Error('Two camera positions are identical');
 // Compose the two *actual* WebGL screenshots into a single labeled image.
 const fixedPng=await fs.readFile(out+'/04-fixed-camera.png');
 const randomPng=await fs.readFile(out+'/05-random-camera.png');
 const composite=await browser.newPage({viewport:{width:1600,height:570},deviceScaleFactor:1});
 // Keep each real WebGL checkpoint auditable without changing world geometry.
 const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const checkpointLabel=`QCDS Cycling | Visual checkpoint #001 | ${new Date().toISOString()} | commit ${process.env.GITHUB_SHA||'LOCAL-UNVERIFIED'} | run ${process.env.GITHUB_RUN_ID||'LOCAL'} | world ${worldSeed} | camera ${cameraSeed}`;
 await composite.setContent('<html><body style="margin:0;background:#0b1522;color:white;font:17px sans-serif"><header style="padding:12px">'+escapeHTML(checkpointLabel)+'</header><main style="display:flex;gap:8px;padding:8px"><section style="width:50%"><div>FIXED CAMERA</div><img id="fixed" style="width:100%" /></section><section style="width:50%"><div>RANDOM CAMERA | seed camera-001</div><img id="random" style="width:100%" /></section></main></body></html>');
 await composite.evaluate(([a,b])=>{document.querySelector('#fixed').src='data:image/png;base64,'+a;document.querySelector('#random').src='data:image/png;base64,'+b;},[fixedPng.toString('base64'),randomPng.toString('base64')]);
 await composite.locator('#fixed').evaluate(img=>img.decode());
 await composite.locator('#random').evaluate(img=>img.decode());
 await composite.screenshot({path:out+'/06-two-camera-checkpoint.png'});
 await composite.close();
 steps.push('fixed and seeded random QCDS WebGL cameras captured');

 await fs.writeFile(out+'/results.json',JSON.stringify({steps,result,forestGeometry,forestDrawEvidence,forestPixelEvidence,cameraMetadata,randomEvidence,errors,consoleErrors},null,2));
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
