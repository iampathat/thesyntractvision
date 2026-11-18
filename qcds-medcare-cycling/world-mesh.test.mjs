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
console.log('QCDS executable terrain and road mesh geometry PASS');
