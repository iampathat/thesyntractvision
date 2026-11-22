/* © 2026 Patrik Sundblom. All Rights Reserved.
 * Joint QCDS forest footprint regression: straight and curved road, terrain, water.
 */
import assert from 'node:assert/strict';
import {acceptForestFootprint} from './world-forest-footprint.mjs';
const base={width:6,oracle:{forestDensity:1,roadWidth:6,shoulderWidth:2},center:()=>0,height:()=>0};
assert.equal(acceptForestFootprint(base,{x:14,z:20,radius:3}),true);
assert.equal(acceptForestFootprint(base,{x:7,z:20,radius:3}),false);
assert.equal(acceptForestFootprint({...base,height:x=>x>15?4:0},{x:14,z:20,radius:3}),false);
const water={positions:new Float32Array([13,0,20,15,0,20,15,0,22,13,0,22])};
assert.equal(acceptForestFootprint(base,{x:14,z:20,radius:3,water}),false);
assert.equal(acceptForestFootprint(base,{x:14,z:20,radius:3,maxSamples:4}),false);
assert.equal(acceptForestFootprint(base,{x:NaN,z:20,radius:3}),false);
const curved={...base,center:z=>6*Math.sin(z*.12)};
assert.equal(acceptForestFootprint(curved,{x:10,z:0,radius:3}),false,'curved road crosses crown despite clear center');
assert.equal(acceptForestFootprint(curved,{x:30,z:0,radius:3}),true,'distant crown remains accepted');
assert.equal(acceptForestFootprint(curved,{x:30,z:0,radius:3,water:{positions:new Float32Array([27,0,-3,33,0,-3,33,0,3,27,0,3])}}),false);
assert.equal(acceptForestFootprint({...base,height:(x,z)=>x*.9},{x:30,z:0,radius:3}),false);
assert.equal(acceptForestFootprint({...base,center:()=>NaN},{x:30,z:0,radius:3}),false);
console.log('11 joint forest footprint regression assertions PASS');
