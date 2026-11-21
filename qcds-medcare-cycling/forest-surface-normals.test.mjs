/* © 2026 Patrik Sundblom. All Rights Reserved.
 * The same joint QCDS canopy mesh must produce deterministic, finite, geometry-derived light normals.
 */
import assert from 'node:assert/strict';
import {buildWorldMesh} from './world-mesh.js';
const options={worldSeed:'qcds-baseline',scene:{biome:'forest',state:{vegetation:'dense'}},length:240,halfWidth:96};
const first=buildWorldMesh(options).forest;
const second=buildWorldMesh(options).forest;
assert.ok(first.count>0);
assert.deepEqual(first.crowns.normals,second.crowns.normals);
let tilted=0;
for(let i=0;i<first.crowns.normals.length;i+=3){
 const [x,y,z]=first.crowns.normals.slice(i,i+3);
 const len=Math.hypot(x,y,z);
 assert.ok(Number.isFinite(len)&&Math.abs(len-1)<0.00001,`invalid normal ${i/3}: ${len}`);
 if(Math.abs(y)>.15&&Math.abs(y)<.95)tilted++;
}
assert.ok(tilted>first.count*10,`expected geometry-sensitive slopes, got ${tilted}`);
console.log(`PASS ${first.count} trees, ${first.crowns.normals.length/3} finite unit normals, ${tilted} inclined`);
