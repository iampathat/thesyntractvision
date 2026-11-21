/* © 2026 Patrik Sundblom. All Rights Reserved. */
import assert from 'node:assert/strict';
import {forestCameraCoverage} from './forest-camera-coverage-v2.mjs';
const camera={eye:[0,0,0],target:[0,0,1]};
const mesh=p=>({positions:new Float32Array(p.flat()),indices:new Uint32Array([0,1,2])});
let n=0;const check=(name,fn)=>{fn();n++;console.log('PASS',name)};
check('all vertices visible',()=>assert.equal(forestCameraCoverage(mesh([[0,0,3],[1,0,3],[0,1,3]]),camera).visibleTriangles,1));
check('all vertices behind',()=>assert.equal(forestCameraCoverage(mesh([[0,0,-3],[1,0,-3],[0,1,-3]]),camera).visibleTriangles,0));
check('crossing triangle with zero inside vertices',()=>{const r=forestCameraCoverage(mesh([[-50,-50,10],[50,-50,10],[0,50,10]]),camera);assert.equal(r.visibleVertices,0);assert.equal(r.visibleTriangles,1)});
check('triangle crossing near plane',()=>assert.equal(forestCameraCoverage(mesh([[0,0,.01],[.1,0,1],[0,.1,1]]),camera).visibleTriangles,1));
check('triangle beyond far plane',()=>assert.equal(forestCameraCoverage(mesh([[0,0,600],[1,0,600],[0,1,600]]),camera).visibleTriangles,0));
check('degenerate camera rejected',()=>assert.throws(()=>forestCameraCoverage(mesh([[0,0,3],[1,0,3],[0,1,3]]),{eye:[0,0,0],target:[0,0,0]})));
check('invalid index rejected',()=>assert.throws(()=>forestCameraCoverage({positions:new Float32Array([0,0,3,1,0,3,0,1,3]),indices:new Uint32Array([0,1,8])},camera)));
check('invalid FOV rejected',()=>assert.throws(()=>forestCameraCoverage(mesh([[0,0,3],[1,0,3],[0,1,3]]),camera,{fovDegrees:180})));
check('repeat deterministic',()=>{const m=mesh([[-50,-50,10],[50,-50,10],[0,50,10]]);assert.deepEqual(forestCameraCoverage(m,camera),forestCameraCoverage(m,camera))});
console.log(n,'tests passed');
