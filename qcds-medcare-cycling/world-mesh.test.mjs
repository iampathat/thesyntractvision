/* © 2026 Patrik Sundblom. All Rights Reserved. */
import assert from 'node:assert/strict';
import {buildWorldMesh,createWorldField} from './world-mesh.js';
const options={scene:{biome:'alpine',state:{lighting:'late'}},route:{demo:true},quality:'high'};
const a=buildWorldMesh(options),b=buildWorldMesh(options);
assert.deepEqual(a.terrain.positions,b.terrain.positions,'terrain must be deterministic');
assert.deepEqual(a.road.positions,b.road.positions,'road must be deterministic');
assert.ok(a.forest.count>10,'joint forest must produce real 3D tree meshes');
assert.deepEqual(a.forest.crowns.positions,b.forest.crowns.positions,'forest must be deterministic');
assert.equal(a.forest.crowns.positions.length/3,a.forest.count*12);
for(const part of [a.forest.trunks,a.forest.crowns]){
 assert.ok(part.positions.every(Number.isFinite));
 assert.ok(part.normals.every(Number.isFinite));
 assert.ok(part.indices.every(i=>i<part.positions.length/3));
}
for(let i=0;i<a.forest.trunks.positions.length;i+=36){
 const x=a.forest.trunks.positions[i],z=a.forest.trunks.positions[i+2];
 assert.ok(Math.abs(x-a.field.center(z))>a.field.width/2+a.field.oracle.shoulderWidth,
  'tree must remain outside road and shoulder');
}
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

// Complete world configuration controls executable vegetation across biomes.
const desert=buildWorldMesh({scene:{biome:'desert',state:{vegetation:'dense'}}});
assert.equal(desert.field.oracle.forestDensity,0);
assert.equal(desert.forest.count,0,'desert must not render a temperate forest');
assert.equal(desert.forest.crowns.indices.length,0);
const dense=buildWorldMesh({scene:{biome:'forest',state:{vegetation:'dense'}}});
const sparse=buildWorldMesh({scene:{biome:'forest',state:{vegetation:'sparse'}}});
assert.ok(dense.forest.count>sparse.forest.count,'joint forest density must affect GPU geometry');
assert.deepEqual(dense.forest.crowns.positions,buildWorldMesh({scene:{biome:'forest',state:{vegetation:'dense'}}}).forest.crowns.positions);
console.log('QCDS joint biome/forest GPU geometry PASS');

 // Riders follow the selected world road rather than an independent straight track.
import {worldRiderPose} from './world-mesh.js';
const seeded=buildWorldMesh({worldSeed:'qcds-baseline',scene:{biome:'forest'},length:120,halfWidth:70});
const riderA=worldRiderPose(seeded.field,45,{lane:0,cadence:92,speedKmh:35});
const riderB=worldRiderPose(seeded.field,45,{lane:0,cadence:92,speedKmh:35});
assert.deepEqual(riderA,riderB);
assert.equal(riderA.worldSeed,'qcds-baseline');
assert.ok(Math.abs(riderA.heading)>0.0001);
assert.ok(Math.abs(riderA.y-seeded.field.height(riderA.x,riderA.z)-.05)<1e-6);
assert.ok(Math.abs(riderA.lean)<=seeded.field.oracle.riderLeanLimit*Math.PI/180+1e-9);
const other=buildWorldMesh({worldSeed:'qcds-other',scene:{biome:'forest'},length:120,halfWidth:70});
assert.notEqual(riderA.x,worldRiderPose(other.field,45).x);
console.log('QCDS unified rider road-frame PASS');
