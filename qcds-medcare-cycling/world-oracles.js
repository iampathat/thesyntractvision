/* © 2026 Patrik Sundblom. All Rights Reserved.
 * Unified scene decisions for the existing QCDS Cycling WebGL renderer.
 * Explicit classical oracles: unknown provenance is never invented.
 */
const number=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function evaluateWorldOracles({scene={},route=null,routeGeometry=false,quality='high',snapshot=null,time=0}={}){
 const st=scene.state||{},q=['low','medium','high','ultra'].indexOf(quality);
 const level=Math.max(0,q),demo=route?.demo===true,real=!!route&&!demo;
 const biome=String(scene.biome||'countryside');
 const vegetation=String(st.vegetation||'medium');
 const surface=String(st.surface||'unknown');
 const light=String(st.lighting||'day');
 const foggy=st.atmosphere==='hazy'||/fog|mist/i.test(String(st.weather||''));
 const progressKm=clamp(number(snapshot?.player?.km),0,1e6);
 const speedKmh=clamp(number(snapshot?.player?.speedKmh),0,150);
 const watts=clamp(number(snapshot?.player?.watts),0,3000);
 const grade=clamp(number(snapshot?.player?.grade??st.grade),-35,35);
 const forest=['forest','alpine','countryside'].includes(biome);
 const decisions=[
  {id:'QC-WORLD-ROAD',met:routeGeometry,reason:'Road curvature follows available route coordinates'},
  {id:'QC-WORLD-PROVENANCE',met:real&&routeGeometry,reason:'Only sourced coordinates are treated as real route geometry'},
  {id:'QC-WORLD-TERRAIN',met:routeGeometry,reason:'Terrain uses route geometry when available; otherwise synthetic'},
  {id:'QC-WORLD-MATERIAL',met:surface!=='unknown',reason:'Material follows explicit surface state'},
  {id:'QC-WORLD-LIGHT',met:light!=='unknown',reason:'Light follows explicit scene lighting'},
  {id:'QC-WORLD-SHADOW',met:light!=='unknown',reason:'World-space shadow contrast follows scene lighting'},
  {id:'QC-WORLD-RIDER',met:!!snapshot?.player,reason:'Rider animation follows the same race snapshot'},
  {id:'QC-WORLD-FOREST',met:forest,reason:'Biome supports vegetation'},
  {id:'QC-WORLD-WATER',met:demo&&/alpine/i.test(String(route?.id||'')),reason:'Water is synthetic unless geographic evidence is available'}
 ];
 const stride=(level===3?18:level===2?23:level===1?35:55)*(vegetation==='dense'?.65:vegetation==='sparse'?1.65:1);
 const range=foggy?165:[135,205,300,380][level];
 return Object.freeze({
  geometryQuality:['low','medium','high','ultra'][level],
  routeGeometry:!!routeGeometry,sourceReal:real,renderingIsSynthetic:!real||!routeGeometry,
  foliageCount:forest?Math.round(range/stride)*(biome==='forest'?6:4):0,
  vegetationRange:range,treeStride:stride,
  meadowCount:forest?Math.min([12,32,98,136][level],Math.floor(range/3)):0,
  cinematicBlend:demo,waterIllustration:demo&&/alpine/i.test(String(route?.id||'')),
  surface,light,foggy,grade,progressKm,speedKmh,watts,
  riderMotionHz:clamp(number(snapshot?.player?.cadence,0)/60,0,3),
  shadowStrength:light==='late'?.74:light==='night'?.12:.48,
  checks:decisions,topK:decisions.filter(d=>d.met).slice(0,5),
  scope:'EXPLICIT CLASSICAL WORLD ORACLES, NOT VERIFIED QUANTUM QCDS'
 });
}
