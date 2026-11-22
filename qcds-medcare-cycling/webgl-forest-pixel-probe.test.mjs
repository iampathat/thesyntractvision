import assert from 'node:assert/strict';
import {probeForestFramebuffer} from './webgl-forest-pixel-probe.mjs';
function glFor(data,code=0){return {RGBA:6408,UNSIGNED_BYTE:5121,NO_ERROR:0,readPixels(x,y,w,h,f,t,out){assert.equal(w*h*4,data.length);out.set(data)},getError(){return code}}}
const image=new Uint8Array([20,90,20,255,90,90,90,255,20,80,20,255,100,110,100,255]);
const result=probeForestFramebuffer(glFor(image),{width:2,height:2,sampleStep:1});
assert.equal(result.greenCandidates,2);assert.equal(result.sampled,4);assert.equal(result.greenCandidateFraction,.5);
assert.equal(probeForestFramebuffer(glFor(image),{width:2,height:2,sampleStep:2}).sampled,1);
assert.throws(()=>probeForestFramebuffer(glFor(image,1280),{width:2,height:2}),/error/);
assert.throws(()=>probeForestFramebuffer(glFor(image),{width:0,height:2}),/size/);
assert.throws(()=>probeForestFramebuffer(glFor(image),{width:2,height:2,sampleStep:0}),/step/);
assert.throws(()=>probeForestFramebuffer(null,{width:2,height:2}),/readPixels/);
console.log('6 framebuffer probe checks PASS');
