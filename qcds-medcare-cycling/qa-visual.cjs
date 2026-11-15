/* © 2026 Patrik Sundblom. All Rights Reserved. QA harness for public browser runtime. */
'use strict';
const { chromium } = require('playwright-core');
const { PNG } = require('pngjs');
const fs = require('node:fs');
const URL = process.env.QCDS_CYCLING_URL || 'http://127.0.0.1:8123/qcds-medcare-cycling/';
const wait = ms => new Promise(r => setTimeout(r,ms));
(async function run() {
 const errors = [];
 const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox']
 });
 try {
  const page = await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(URL,{waitUntil:'load',timeout:30000});
  await page.locator('#startFullDemo').click({timeout:15000});
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
    visible:!can.hidden && r.width>100 && r.height>100};
  });
  if(status.context!=='webgl2')throw Error('No live WebGL2 context: '+JSON.stringify(status));
  if(!status.visible)throw Error('WebGL canvas is hidden or collapsed');
  if(status.warning.includes('3D-rendering pausad'))throw Error('Renderer exception: '+status.warning);
  await page.locator('#cinematicArena').scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  const shot=await page.locator('#cinematicArena').screenshot({type:'png',animations:'disabled'});
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
  const path='/tmp/cycling-qa-v2.3.0.png';
  fs.writeFileSync(path,shot);console.log('QCDS_CYCLING_PNG_SAVED '+path+' bytes='+shot.length);
  if(counts.size<100||deviation<18||nonBlack/n<.18)throw Error('Renderer output failed pixel diversity / blank-screen checks');
  if(errors.some(e=>/SyntaxError|ReferenceError|WebGL program|shader|INVALID_OPERATION/i.test(e)))throw Error('Browser JS errors: '+errors.join(' | '));
  // Retain the screenshot in GitHub Actions artifacts and logs for actual human review.
  if(process.env.QCDS_EMIT_SCREENSHOT_BASE64==='1')console.log('QCDS_VISUAL_PNG_B64:'+shot.toString('base64')+':QCDS_VISUAL_PNG_END');
 }finally{await browser.close();}
})().catch(e=>{console.error('QCDS_CYCLING_VISUAL_FAIL',e.stack||String(e));process.exitCode=1});
