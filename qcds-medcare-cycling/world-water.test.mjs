/* © 2026 Patrik Sundblom. All Rights Reserved. */
import assert from 'node:assert/strict';
import {buildWorldWater} from './world-water.js';
import {createWorldField} from './world-mesh.js';
const options={worldSeed:'qcds-baseline',scene:{biome:'alpine',state:{lighting:'late'}},route:{id:'alpine-demo',demo:true}};
const field=createWorldField(options);
const a=buildWorldWater(field,{enabled:true}),b=buildWorldWater(field,{enabled:true});
assert.deepEqual(a.positions,b.positions,'water must be deterministic');
assert.ok(a.count>0,'synthetic alpine demo should generate actual water triangles');
assert.equal(a.positions.length,a.count*12);
assert.equal(a.indices.length,a.count*6);
assert.ok(a.positions.every(Number.isFinite));
for(let i=0;i<a.positions.length;i+=3){
 assert.ok(Math.abs(a.positions[i]-field.center(a.positions[i+2]))>field.width/2+field.oracle.shoulderWidth,'water cannot occupy road/shoulder');
 assert.ok(Math.abs(a.positions[i+1]-a.waterLevel)<1e-5,'water must be level');
}
const off=buildWorldWater(field,{enabled:false});assert.equal(off.count,0);
const real=createWorldField({...options,route:{demo:false},routeGeometry:true});
assert.equal(buildWorldWater(real,{enabled:true}).count,0,'no invented water on real route');
console.log('QCDS joint synthetic water geometry PASS');
