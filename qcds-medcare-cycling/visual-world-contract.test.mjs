/* © 2026 Patrik Sundblom. All Rights Reserved. */
import assert from 'node:assert/strict';
import {validateVisualWorld} from './visual-world-contract.mjs';
const good={result:{webgl2:true,visible:true,webglError:0},errors:[],consoleErrors:[],forestGeometry:{forestDensity:0.6,trunkTriangles:576,crownTriangles:576},forestPixelEvidence:{forestOnlyPixels:250,totalPixels:100000},cameraMetadata:{fixed:{position:[0,4,0]}},randomEvidence:{random:{position:[12,25,16]}}};
assert.ok(validateVisualWorld(good).cameraSeparation>2);
for(const edit of [
 x=>x.forestGeometry.crownTriangles=0,
 x=>x.forestPixelEvidence.forestOnlyPixels=0,
 x=>x.randomEvidence.random.position=[0,4,0],
 x=>x.result.webgl2=false,
 x=>x.failure='failed',
 x=>x.randomEvidence.random.position=[NaN,4,0]
]) {const bad=structuredClone(good);edit(bad);assert.throws(()=>validateVisualWorld(bad));}
console.log('visual world contract regression PASS (6 negative cases)');
