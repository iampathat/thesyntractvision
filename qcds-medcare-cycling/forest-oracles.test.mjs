/* © 2026 Patrik Sundblom. All Rights Reserved. */
import assert from 'node:assert/strict';
import {evaluateForestOracles} from './forest-oracles.js';
const trees=Array.from({length:80},(_,i)=>({x:(i%8-4)*2,y:0,z:5+i*2,height:12,rotation:0}));
trees.push({x:NaN,y:0,z:10,height:12},{x:0,y:0,z:-10,height:12},{x:0,y:0,z:10,height:-1});
const a=evaluateForestOracles({state:{windSpeed:7,weather:'clear'}},trees,'ultra');
assert.equal(a.trees.length,48);
assert.equal(a.accepted,80);
assert.equal(a.rejected['valid-transform'],2);
assert.equal(a.rejected['forward-depth'],1);
assert.ok(a.trees.every((t,i)=>i===0||t.z>=a.trees[i-1].z));
assert.equal(evaluateForestOracles({},trees,'low').trees.length,12);
assert.equal(evaluateForestOracles({state:{windSpeed:999}},trees).windSpeed,25);
assert.equal(evaluateForestOracles({state:{weather:'fog'}},trees).fogDensity,0.6);
console.log('QCDS forest oracle contract PASS');
