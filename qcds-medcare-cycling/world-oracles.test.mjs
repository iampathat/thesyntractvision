/* © 2026 Patrik Sundblom. All Rights Reserved. */
import assert from 'node:assert/strict';
import {evaluateWorldOracles,selectWorldConfiguration} from './world-oracles.js';
const demo=evaluateWorldOracles({scene:{biome:'alpine',state:{surface:'asphalt',lighting:'late',vegetation:'dense'}},route:{id:'alpine-demo',demo:true},routeGeometry:true,quality:'ultra',snapshot:{player:{km:3.5,speedKmh:28,watts:220,cadence:90}}});
assert.equal(demo.geometryQuality,'ultra');
assert.equal(demo.waterIllustration,true);
assert.equal(demo.sourceReal,false);
assert.equal(demo.riderMotionHz,1.5);
assert.equal(demo.progressKm,3.5);
assert.equal(demo.shadowStrength,.74);
assert.ok(demo.checks.some(x=>x.id==='QC-WORLD-RIDER'&&x.met));
const real=evaluateWorldOracles({route:{demo:false,points:[{lat:1,lon:2}]},routeGeometry:true,scene:{biome:'forest',state:{surface:'gravel'}}});
assert.equal(real.sourceReal,true);
assert.equal(real.waterIllustration,false);
assert.equal(real.renderingIsSynthetic,false);
const unknown=evaluateWorldOracles({});
assert.equal(unknown.checks.find(x=>x.id==='QC-WORLD-MATERIAL').met,false);
assert.equal(unknown.checks.find(x=>x.id==='QC-WORLD-RIDER').met,false);
assert.equal(unknown.renderingIsSynthetic,true);
console.log('QCDS world oracle contract PASS');

const joint=selectWorldConfiguration({scene:{biome:'alpine',state:{lighting:'late',weather:'rain'}},route:{demo:true},quality:'high'});
assert.ok(joint.evaluated>=12);
assert.ok(joint.accepted>0);
assert.ok(joint.checks.every(x=>x.met));
assert.ok(joint.shoulderWidth>=joint.relief/7);
assert.equal(joint.roadWetness,1);
assert.ok(joint.sunDirection.every(Number.isFinite));
assert.deepEqual(joint,selectWorldConfiguration({scene:{biome:'alpine',state:{lighting:'late',weather:'rain'}},route:{demo:true},quality:'high'}));
const fogWorld=selectWorldConfiguration({scene:{state:{weather:'fog'}}});
assert.ok(fogWorld.fogDensity>=.45);
console.log('QCDS joint world configuration PASS');

// Shared material/lighting contract: road appearance derives from the same winner.
const rainy=selectWorldConfiguration({scene:{state:{weather:'rain',lighting:'late'}}});
const dry=selectWorldConfiguration({scene:{state:{weather:'clear',lighting:'day'}}});
assert.equal(rainy.roadWetness,1);
assert.equal(dry.roadWetness,0);
assert.ok(rainy.shadowStrength>dry.shadowStrength);
