/* © 2026 Patrik Sundblom. All Rights Reserved.
 * Independent geometry invariants for the joint QCDS water mesh.
 */
import assert from 'node:assert/strict';
import {buildWorldWater} from './world-water.js';
const field={seed:23,width:6.6,oracle:{provenance:'synthetic',shoulderWidth:7,relief:24},center:z=>Math.sin(z*.01)*2,height:(x,z)=>-2+Math.sin(x*.025)*.1+Math.cos(z*.018)*.1};
for(const step of [2,4,6,10,16]){
 const water=buildWorldWater(field,{enabled:true,step});
 assert.ok(water.count>0,`step ${step} should generate water`);
 assert.equal(water.positions.length,water.count*12);
 assert.equal(water.normals.length,water.positions.length);
 assert.equal(water.indices.length,water.count*6);
 for(let i=0;i<water.indices.length;i+=3){
  const [a,b,c]=Array.from(water.indices.slice(i,i+3));
  assert.ok(a<water.positions.length/3&&b<water.positions.length/3&&c<water.positions.length/3);
  const p=water.positions;
  const ax=p[a*3],az=p[a*3+2],bx=p[b*3],bz=p[b*3+2],cx=p[c*3],cz=p[c*3+2];
  const upward=(bz-az)*(cx-ax)-(bx-ax)*(cz-az);
  assert.ok(upward>0,`step ${step}: triangle must face up`);
 }
 for(let i=0;i<water.positions.length;i+=3){
  const [x,y,z]=water.positions.slice(i,i+3);
  assert.ok(Number.isFinite(x)&&Number.isFinite(y)&&Number.isFinite(z));
  assert.ok(field.height(x,z)<y-.079,'water vertex must clear terrain');
  assert.ok(Math.abs(x-field.center(z))>=field.width/2+field.oracle.shoulderWidth+12-1e-4,'road corridor');
 }
}
assert.equal(buildWorldWater({...field,oracle:{...field.oracle,provenance:'route-derived'}},{enabled:true}).count,0);
console.log('QCDS water topology and winding PASS');
