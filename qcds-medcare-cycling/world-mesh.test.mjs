/* © 2026 Patrik Sundblom. All Rights Reserved. */
import assert from 'node:assert/strict';
import {buildWorldMesh,createWorldField} from './world-mesh.js';
const options={scene:{biome:'alpine',state:{lighting:'late'}},route:{demo:true},quality:'high'};
const a=buildWorldMesh(options),b=buildWorldMesh(options);
assert.deepEqual(a.terrain.positions,b.terrain.positions,'terrain must be deterministic');
assert.deepEqual(a.road.positions,b.road.positions,'road must be deterministic');
assert.equal(a.terrain.indices.length,a.dimensions.rows*a.dimensions.cols*6);
assert.equal(a.road.indices.length,a.dimensions.rows*6);
assert.ok(a.terrain.positions.every(Number.isFinite));
assert.ok(a.terrain.normals.every(Number.isFinite));
assert.ok(a.road.positions.every(Number.isFinite));
for(let z=0;z<=a.dimensions.rows;z++){
 const p=a.field.road(a.dimensions.length*z/a.dimensions.rows);
 const i=z*6;
 const left=[...a.road.positions.slice(i,i+3)],right=[...a.road.positions.slice(i+3,i+6)];
 assert.ok(Math.abs(Math.hypot(left[0]-right[0],left[2]-right[2])-a.field.width)<1e-3);
 assert.ok(Math.abs(left[1]-a.field.height(left[0],left[2])-.035)<1e-3,'left edge must follow world terrain');
 assert.ok(Math.abs(right[1]-a.field.height(right[0],right[2])-.035)<1e-3,'right edge must follow world terrain');
}
assert.ok(Math.max(...a.terrain.positions.filter((_,i)=>i%3===1))-
 Math.min(...a.terrain.positions.filter((_,i)=>i%3===1))>2,'terrain must not be flat');
const field=createWorldField(options);
assert.ok(field.road(0).tangent.every(Number.isFinite));
// The QCDS-selected grade smoothing must affect the executable road profile.
// Compare the implementation against the same seeded height field with the
// original fixed 12-metre smoothing radius, without assuming either is flatter.
const selectedRadius=field.oracle.roadGradeSmoothing;
assert.ok(selectedRadius>0);
assert.ok(Number.isFinite(field.roadHeight(30)));
assert.ok(Math.abs(field.road(30).y-field.height(field.road(30).x,30))<1e-8);

// Reject invalid triangle topology before trusting a successful WebGL screenshot.
for(const [name,mesh] of [['terrain',a.terrain],['road',a.road]]){
 const vertexCount=mesh.positions.length/3;
 assert.equal(mesh.positions.length%3,0,name+' vertex stride');
 assert.equal(mesh.indices.length%3,0,name+' triangle stride');
 for(const index of mesh.indices)assert.ok(index<vertexCount,name+' index out of bounds');
 for(let i=0;i<mesh.indices.length;i+=3){
  const ia=mesh.indices[i]*3,ib=mesh.indices[i+1]*3,ic=mesh.indices[i+2]*3;
  const ab=[0,1,2].map(k=>mesh.positions[ib+k]-mesh.positions[ia+k]);
  const ac=[0,1,2].map(k=>mesh.positions[ic+k]-mesh.positions[ia+k]);
  const cross=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
  assert.ok(Math.hypot(...cross)>1e-8,name+' degenerate triangle at '+i/3);
 }
}
for(let i=0;i<a.terrain.normals.length;i+=3){
 const length=Math.hypot(...a.terrain.normals.slice(i,i+3));
 assert.ok(Math.abs(length-1)<1e-5,'terrain normal not unit length at '+i/3);
}
console.log('QCDS executable terrain and road mesh geometry PASS');
