/* © 2026 Patrik Sundblom. All Rights Reserved.
 * Unified scene decisions for the existing QCDS Cycling WebGL renderer.
 * Explicit classical oracles: unknown provenance is never invented.
 */
function worldSeedNumber(value){const text=String(value??'qcds-baseline');let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0)%1000000+1;}
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

/**
 * Joint QCDS world selection. Every candidate is a COMPLETE configuration:
 * road grade, terrain relief, shoulder blend, vegetation density, sunlight,
 * fog, surface wetness and rider lean are evaluated in one shared state.
 * Hard constraints reject inconsistent candidates before weighted ranking.
 * This is deterministic classical oracle evaluation, not quantum execution.
 */
export function selectWorldConfiguration(input={}){
 const scene=input.scene||{},st=scene.state||{};
 const base=evaluateWorldOracles(input);
 const biome=String(scene.biome||'countryside').toLowerCase();
 const alpine=/alpine|mountain/.test(biome);
 const supportsForest=/alpine|mountain|forest|countryside|woodland/.test(biome);
 const wet=/rain|storm/i.test(String(st.weather||''));
 const foggy=base.foggy;
 const late=/late|sunset|dawn/i.test(String(st.lighting||''));
 const speed=base.speedKmh,grade=base.grade;
 const worldSeed=String(input.worldSeed??'qcds-baseline');
 const seedNumber=worldSeedNumber(worldSeed);
 const choices=[];
 const reliefs=alpine?[24,36,48]:[8,14,22];
 const shoulderWidths=[4,7,11];
 const hazeLevels=foggy?[.48,.7]:[.1,.22];
 const densities=st.vegetation==='sparse'?[.2,.35]:st.vegetation==='dense'?[.85,1]:[.5,.7,.85];
 const wetnessLevels=wet?[.65,1]:[0];
 const sun=late?[.78,.3,-.54]:[-.35,.86,-.43];
 const sunLength=Math.hypot(...sun);
 for(const relief of reliefs)for(const shoulder of shoulderWidths)for(const haze of hazeLevels)for(const density of densities)for(const roadWetness of wetnessLevels){
  const forestDensity=supportsForest?density:0;
  const candidate={
   relief,shoulderWidth:shoulder,roadWidth:6.6,roadGradeSmoothing:shoulder>=7?14:8,
   forestDensity,vegetationRange:base.vegetationRange,
   sunDirection:sun.map(x=>x/sunLength),fogDensity:haze,
   surfaceRoughness:wet?.48:.83,roadWetness,
   riderLeanLimit:Math.max(3,14-speed*.08),
   shadowStrength:base.shadowStrength,
   cadenceHz:base.riderMotionHz,
   provenance:base.renderingIsSynthetic?'synthetic':'route-derived'
  };
  const constraints=[
   {id:'QC-GEOMETRY-CONTINUITY',met:shoulder>=relief/7},
   {id:'QC-ROAD-CLEARANCE',met:shoulder>=candidate.roadWidth*.5},
   {id:'QC-WEATHER-MATERIAL',met:(!wet||candidate.surfaceRoughness<=.55)&&(!wet||roadWetness>=.65)},
   {id:'QC-FOREST-RELIEF',met:!alpine||forestDensity<=Math.max(.35,1-relief/200)},
   {id:'QC-BIOME-FOREST',met:supportsForest||forestDensity===0},
   {id:'QC-VEGETATION-STATE',met:!supportsForest||st.vegetation!=='dense'||forestDensity>=.85},
   {id:'QC-ATMOSPHERE-VISIBILITY',met:!foggy||haze>=.45},
   {id:'QC-RIDER-SAFETY',met:candidate.riderLeanLimit>=3},
   {id:'QC-PROVENANCE',met:!base.renderingIsSynthetic||candidate.provenance==='synthetic'}
  ];
  const valid=constraints.every(x=>x.met);
  const targetRelief=reliefs[seedNumber%reliefs.length];
  const score=100-Math.abs(relief-targetRelief)*.75-Math.abs(shoulder-7)*1.5-
   Math.abs(haze-(foggy?.6:.1))*16-
   Math.abs(forestDensity-(alpine?.65:.85))*12-Math.abs(roadWetness-(wet?1:0))*3;
  choices.push({candidate,valid,score,constraints});
 }
 const ranked=choices.filter(x=>x.valid).sort((a,b)=>b.score-a.score||
  a.candidate.relief-b.candidate.relief||a.candidate.shoulderWidth-b.candidate.shoulderWidth);
 if(!ranked.length)throw Error('No QCDS world configuration satisfies joint constraints');
 const winner=ranked[0];
 return Object.freeze({...winner.candidate,
  worldSeed,seedNumber,
  score:winner.score,checks:winner.constraints,
  evaluated:choices.length,accepted:ranked.length,
  rejected:choices.length-ranked.length,
  topK:ranked.slice(0,3).map(x=>({score:x.score,relief:x.candidate.relief,shoulderWidth:x.candidate.shoulderWidth,fogDensity:x.candidate.fogDensity})),
  oracleIds:winner.constraints.map(x=>x.id),
  scope:'DETERMINISTIC JOINT QCDS ORACLE SELECTION'
 });
}
