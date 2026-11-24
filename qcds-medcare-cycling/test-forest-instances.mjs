/* © 2026 Patrik Sundblom. All Rights Reserved. */
import assert from 'node:assert/strict';
import {createWorldField,buildWorldForest} from './world-mesh.js';
const options={worldSeed:'qcds-baseline',scene:{biome:'forest'},step:5};
const field=createWorldField(options);
const a=buildWorldForest(field),b=buildWorldForest(field);
assert.equal(a.instances.length,a.count,'accepted instance count must match forest count');
assert.deepEqual(a.instances,b.instances,'QCDS accepted forest footprints must be deterministic');
for(const tree of a.instances){
 assert.ok(Number.isFinite(tree.x)&&Number.isFinite(tree.z)&&Number.isFinite(tree.ground));
 assert.ok(tree.crownRadius>0&&tree.height>0);
 assert.ok(Math.abs(tree.ground-field.height(tree.x,tree.z))<1e-5);
 assert.ok(Math.abs(tree.x-field.center(tree.z))>=tree.clearance,'road clearance');
}
const zero={...field,oracle:{...field.oracle,forestDensity:0}};
const none=buildWorldForest(zero);
assert.equal(none.count,0);
assert.equal(none.instances.length,0);
assert.equal(none.trunks.indices.length,0);
assert.equal(none.crowns.indices.length,0);
console.log('QCDS forest instance invariants PASS:',a.count);
