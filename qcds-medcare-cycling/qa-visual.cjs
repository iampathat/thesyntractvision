/* © 2026 Patrik Sundblom. All Rights Reserved. QA harness for public browser runtime. */
'use strict';
const { chromium } = require('playwright-core');
const { PNG } = require('pngjs');
const fs = require('node:fs');
const URL = process.env.QCDS_CYCLING_URL || 'http://127.0.0.1:8123/qcds-medcare-cycling/';
(async function run() {
 const errors = [];
 const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox']
 });
 try {
  const page = await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  page.on('pageerror',error=>{errors.push(String(error));console.error('QCDS_BROWSER_PAGEERROR',String(error),error.stack||'');});
  page.on('console',msg=>{if(msg.type()==='error')console.error('QCDS_BROWSER_CONSOLE',msg.text());});
  await page.goto(URL,{waitUntil:'load',timeout:30000});
  // UI smoke gate: distinguish a Playwright click from a working application.
  const before=await page.evaluate(()=>({
   tab:document.querySelector('.view.visible')?.id||'none',
   demo:document.querySelector('#demoBtn')?.textContent,
   startupError:document.querySelector('#cyclingStartupDetails')?.textContent||''
  }));
  if(errors.length)throw Error('Startup JS errors before interaction: '+JSON.stringify(errors));
  await page.locator('#startFullDemo').click({timeout:15000});
  await page.waitForTimeout(700);
  const after=await page.evaluate(()=>({
   tab:document.querySelector('.view.visible')?.id||'none',
   route:document.querySelector('#rideRouteName')?.textContent,
   source:document.querySelector('#deviceText')?.textContent,
   startupError:document.querySelector('#cyclingStartupDetails')?.textContent||'',
   presentation:document.querySelector('#cinematicArena')?.dataset.presentation
  }));
  console.log('QCDS_CYCLING_UI_SMOKE '+JSON.stringify({before,after,pageErrors:errors}));
  if(errors.length||after.startupError)throw Error('Startup runtime failure: '+JSON.stringify({errors,after}));
  if(before.tab===after.tab && !/demo/i.test(after.source||''))throw Error('Demo click did not change tab or source: '+JSON.stringify({before,after}));
  await page.evaluate(() => {
   const q=document.querySelector('#sceneQuality');q.value='ultra';q.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await page.waitForTimeout(3500);
  const status=await page.evaluate(()=>{
   const can=document.querySelector('#raceCanvas'),r=can.getBoundingClientRect();
   const gl=can.getContext('webgl2');
   return {canvasWidth:can.width,canvasHeight:can.height,displayWidth:r.width,displayHeight:r.height,
    context:gl?'webgl2':'none',rendererText:document.querySelector('#graphicsStatus')?.textContent||'',
    warning:document.querySelector('#graphicsMessage')?.textContent||'',
    scene:document.querySelector('#sceneInfo')?.textContent||'',
    route:document.querySelector('#rideLabel')?.textContent||'',
    visible:!can.hidden && r.width>100 && r.height>100 && getComputedStyle(can).visibility==='visible',
    cssVisibility:getComputedStyle(can).visibility,
    presentation:document.querySelector('#cinematicArena').dataset.presentation,
    photoCanvasVisible:!document.querySelector('#photoLiveCanvas').hidden,
    spruceStatus:window.__qcdsSpruceStatus ? {...window.__qcdsSpruceStatus} : null};
  });
  if(status.context!=='webgl2')throw Error('No live WebGL2 context: '+JSON.stringify(status));
  if(!status.visible||status.presentation!=='realtime'||status.photoCanvasVisible)
    throw Error('Refusing static or Photo Live pass: 3D WebGL canvas is hidden: '+JSON.stringify(status));
  if(status.warning.includes('3D-rendering pausad'))throw Error('Renderer exception: '+status.warning);
  // WebGL redraws every frame; Playwright's stability-based locator scrolling
  // can time out indefinitely even while the canvas is healthy and animating.
  await page.evaluate(() => document.querySelector('#cinematicArena').scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));
  await page.waitForTimeout(700);
  const arena=await page.locator('#cinematicArena').boundingBox();
  if(!arena || arena.width<200 || arena.height<100)throw Error('No stable arena geometry: '+JSON.stringify(arena));
  const shot=await page.screenshot({type:'png',clip:{x:Math.max(0,arena.x),y:Math.max(0,arena.y),width:Math.min(arena.width,1440-Math.max(0,arena.x)),height:Math.min(arena.height,900-Math.max(0,arena.y))},animations:'disabled'});
  const png=PNG.sync.read(shot);
  const counts=new Map(), samples=[];
  let mean=0,squares=0,n=0,nonBlack=0;
  for(let y=0;y<png.height;y+=6)for(let x=0;x<png.width;x+=6){
   const k=4*(y*png.width+x),r=png.data[k],g=png.data[k+1],b=png.data[k+2];
   const light=(r+g+b)/3;mean+=light;squares+=light*light;n++;
   if(light>25)nonBlack++;
   counts.set(((r>>4)<<8)|((g>>4)<<4)|(b>>4),true);
  }
  mean/=n;const deviation=Math.sqrt(squares/n-mean*mean);
  const analysis={...status,shotWidth:png.width,shotHeight:png.height,colors:counts.size,mean,standardDeviation:deviation,nonBlackFraction:nonBlack/n,pageErrors:errors};
  console.log('QCDS_CYCLING_VISUAL_DIAGNOSTICS '+JSON.stringify(analysis));
  // A passing pixel-diversity check is not proof of photorealism.
  // Report whether the textured 3D spruce asset actually loaded and rendered.
  if(status.spruceStatus)console.log('QCDS_CYCLING_TREE_DIAGNOSTICS '+JSON.stringify(status.spruceStatus));
  if(status.spruceStatus?.error)throw Error('3D spruce asset failed: '+status.spruceStatus.error);
  if(status.spruceStatus?.ready && status.spruceStatus.instances===0)throw Error('3D spruce asset loaded but no tree instances were drawn');
  if(!status.spruceStatus)console.warn('QCDS_CYCLING_TREE_DIAGNOSTICS unavailable: tree renderer not initialized');
  const path='/tmp/cycling-qa-v2.4.0.png';
  fs.writeFileSync(path,shot);console.log('QCDS_CYCLING_PNG_SAVED '+path+' bytes='+shot.length);
  if(counts.size<100||deviation<18||nonBlack/n<.18)throw Error('Renderer output failed pixel diversity / blank-screen checks');
  // The road and landscape must animate, not just the overlaid counters.
  const sceneCanvas=page.locator('#raceCanvas');
  // A continuously animated WebGL canvas may never satisfy locator stability.
  // Screenshot a fixed viewport clip instead of scrolling/waiting for a stable element.
  const sceneBox=await sceneCanvas.boundingBox();
  if(!sceneBox||sceneBox.width<100||sceneBox.height<100)throw Error('3D canvas geometry missing');
  const viewport=page.viewportSize();
  const x=Math.max(0,sceneBox.x),y=Math.max(0,sceneBox.y);
  const clip={x,y,width:Math.min(sceneBox.width,viewport.width-x),height:Math.min(sceneBox.height,viewport.height-y)};
  if(clip.width<100||clip.height<100)throw Error('3D canvas outside viewport: '+JSON.stringify(clip));
  const before=PNG.sync.read(await page.screenshot({type:'png',clip,animations:'disabled',timeout:15000}));
  await page.waitForTimeout(1650);
  const moving=await page.screenshot({type:'png',clip,animations:'disabled',timeout:15000});
  const after=PNG.sync.read(moving);
  if(before.width!==after.width||before.height!==after.height)throw Error('3D frame resized during motion');
  let changed=0,delta=0,total=0;
  for(let y=20;y<before.height-20;y+=8)for(let x=20;x<before.width-20;x+=8){
   const k=4*(y*before.width+x);
   const d=Math.abs(before.data[k]-after.data[k])+
      Math.abs(before.data[k+1]-after.data[k+1])+
      Math.abs(before.data[k+2]-after.data[k+2]);
   if(d>32)changed++;
   delta+=d/3;total++;
  }
  const motion={changedFraction:changed/total,meanAbsoluteChannelChange:delta/total,dimensions:[before.width,before.height]};
  console.log('QCDS_CYCLING_MOTION_DIAGNOSTICS '+JSON.stringify(motion));
  fs.writeFileSync('/tmp/cycling-qa-motion.png',moving);
  if(motion.changedFraction<.04)throw Error('3D road/cyclists are not visibly moving: '+JSON.stringify(motion));
  if(errors.some(e=>/SyntaxError|ReferenceError|WebGL program|shader|INVALID_OPERATION/i.test(e)))throw Error('Browser JS errors: '+errors.join(' | '));
  // Retain the screenshot in GitHub Actions artifacts and logs for actual human review.
  if(process.env.QCDS_EMIT_SCREENSHOT_BASE64==='1')console.log('QCDS_VISUAL_PNG_B64:'+shot.toString('base64')+':QCDS_VISUAL_PNG_END');
 }finally{await browser.close();}
})().catch(e=>{console.error('QCDS_CYCLING_VISUAL_FAIL',e.stack||String(e));process.exitCode=1});
