/* © 2026 Patrik Sundblom. All Rights Reserved.
 * Joint world regression: forest, road and water must share a selected field.
 */
import assert from 'node:assert/strict';
import {buildWorldMesh} from './world-mesh.js';
const input={worldSeed:'qcds-baseline',scene:{biome:'alpine',state:{lighting:'late'}},route:{id:'alpine-demo',demo:true},step:6,halfWidth:110,length:300};
const a=buildWorldMesh(input),b=buildWorldMesh(input);
assert.ok(a.water.count>0,'alpine demo must contain water');
assert.deepEqual(a.water.positions,b.water.positions,'same world seed produces same water');
assert.deepEqual(a.forest.trunks.positions,b.forest.trunks.positions,'same world seed produces same forest');
const tiles=[];for(let i=0;i<a.water.positions.length;i+=12){const p=a.water.positions;tiles.push([Math.min(p[i],p[i+3]),Math.max(p[i],p[i+3]),Math.min(p[i+2],p[i+8]),Math.max(p[i+2],p[i+8])]);}
for(let i=0;i<a.forest.trunks.positions.length;i+=36){
 const x=a.forest.trunks.positions[i],z=a.forest.trunks.positions[i+2];
 assert.ok(!tiles.some(([x0,x1,z0,z1])=>x>=x0&&x<=x1&&z>=z0&&z<=z1),'tree trunk cannot occupy a water tile');
}
const real=buildWorldMesh({...input,route:{id:'real',demo:false},routeGeometry:true});
assert.equal(real.water.count,0,'real route must not invent water');
console.log('QCDS coherent forest-water-road world PASS');
