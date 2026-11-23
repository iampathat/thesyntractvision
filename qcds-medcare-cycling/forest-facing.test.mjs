/* © 2026 Patrik Sundblom. All Rights Reserved.
 * Verify outward-facing GPU triangles for all trunk, branch and crown segments.
 * The same QCDS world configuration determines every segment and camera pose.
 */
import assert from 'node:assert/strict';
import {buildWorldMesh} from './world-mesh.js';
const world=buildWorldMesh({worldSeed:'qcds-baseline',scene:{biome:'forest',state:{vegetation:'dense'}},length:240,halfWidth:96});
assert.ok(world.forest.count>0,'forest is empty');
for(const [name,mesh,verticesPerTree] of [
 ['trunks and branches',world.forest.trunks,12+2*16],
 ['crowns',world.forest.crowns,3*14*7]
]){
 assert.equal(mesh.positions.length/3,world.forest.count*verticesPerTree,name+' vertex count');
 let outward=0,inward=0,degenerate=0;
 for(let i=0;i<mesh.indices.length;i+=3){
  const ids=[mesh.indices[i],mesh.indices[i+1],mesh.indices[i+2]];
  assert.ok(ids.every(id=>id>=0&&id<mesh.positions.length/3),name+' invalid vertex index');
  const p=ids.map(id=>Array.from(mesh.positions.slice(id*3,id*3+3)));
  const normals=ids.map(id=>Array.from(mesh.normals.slice(id*3,id*3+3)));
  const a=p[1].map((v,j)=>v-p[0][j]),b=p[2].map((v,j)=>v-p[0][j]);
  const cross=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const normal=normals[0].map((v,j)=>v+normals[1][j]+normals[2][j]);
  const dot=cross.reduce((sum,v,j)=>sum+v*normal[j],0);
  if(dot>1e-8)outward++;else if(dot< -1e-8)inward++;else degenerate++;
 }
 assert.equal(inward,0,name+' inward-facing triangles');
 assert.equal(degenerate,0,name+' degenerate triangles');
 assert.ok(outward>0,name+' has no outward faces');
 console.log(name+': '+outward+' outward-facing triangles PASS');
}
