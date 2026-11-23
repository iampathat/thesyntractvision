/* © 2026 Patrik Sundblom. All Rights Reserved.
 * Regression: GPU forest faces must face outward, independently of camera.
 */
import assert from 'node:assert/strict';
import {buildWorldMesh} from './world-mesh.js';
const world=buildWorldMesh({worldSeed:'qcds-baseline',scene:{biome:'forest',state:{vegetation:'dense'}},length:240,halfWidth:96});
assert.ok(world.forest.count>0,'forest is empty');
for(const [name,mesh,sides,levels] of [['trunks',world.forest.trunks,6,2],['crowns',world.forest.crowns,14,7]]){
 const verticesPerTree=sides*levels;
 assert.equal(mesh.positions.length/3,world.forest.count*verticesPerTree*(name==='crowns'?3:1));
 let outward=0,inward=0,degenerate=0;
 for(let i=0;i<mesh.indices.length;i+=3){
  const tree=Math.floor(mesh.indices[i]/verticesPerTree);
  const start=tree*verticesPerTree*3;
  let cx=0,cz=0;
  for(let j=0;j<sides;j++){cx+=mesh.positions[start+j*3];cz+=mesh.positions[start+j*3+2];}
  cx/=sides;cz/=sides;
  const points=[0,1,2].map(j=>Array.from(mesh.positions.slice(mesh.indices[i+j]*3,mesh.indices[i+j]*3+3)));
  const a=points[1].map((v,j)=>v-points[0][j]),b=points[2].map((v,j)=>v-points[0][j]);
  const nx=a[1]*b[2]-a[2]*b[1],nz=a[0]*b[1]-a[1]*b[0];
  const mx=(points[0][0]+points[1][0]+points[2][0])/3,mz=(points[0][2]+points[1][2]+points[2][2])/3;
  const dot=nx*(mx-cx)+nz*(mz-cz);
  if(dot>1e-8)outward++;else if(dot< -1e-8)inward++;else degenerate++;
 }
 assert.equal(inward,0,`${name}: ${inward} inward-facing triangles`);
 assert.equal(degenerate,0,`${name}: ${degenerate} degenerate or radial-neutral triangles`);
 assert.ok(outward>0,`${name}: no outward triangles`);
 console.log(`${name}: ${outward} outward-facing triangles PASS`);
}
