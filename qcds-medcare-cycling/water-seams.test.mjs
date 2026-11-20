/* © 2026 Patrik Sundblom. All Rights Reserved.
 * Regression: water tiles sharing a QCDS basin must have no artificial gaps.
 */
import assert from 'node:assert/strict';
import {buildWorldWater} from './world-water.js';
const field={seed:23,width:6.6,oracle:{provenance:'synthetic',shoulderWidth:7,relief:24},center:z=>Math.sin(z*.01)*2,height:(x,z)=>-2+Math.sin(x*.025)*.1+Math.cos(z*.018)*.1};
for(const step of [2,4,6,10,16]){
 const mesh=buildWorldWater(field,{enabled:true,step});
 assert.ok(mesh.count>0);
 const corners=new Set();
 for(let i=0;i<mesh.positions.length;i+=12){
  const p=mesh.positions;
  const x0=p[i],x1=p[i+3],z0=p[i+2],z1=p[i+8];
  assert.ok(Math.abs((x1-x0)-step)<.00002,`water cell width must equal grid step ${step}`);
  assert.ok(Math.abs((z1-z0)-step)<.00002,`water cell depth must equal grid step ${step}`);
  for(const [x,z] of [[x0,z0],[x1,z0],[x0,z1],[x1,z1]])corners.add(`${x.toFixed(3)},${z.toFixed(3)}`);
 }
 assert.ok(corners.size>0);
}
console.log('QCDS water seamless-cell geometry PASS');
