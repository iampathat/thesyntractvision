/* © 2026 Patrik Sundblom. All Rights Reserved.
 * QCDS Cycling: explicit, deterministic scene-rendering oracles.
 * Classical oracle evaluation; no claims of quantum hardware or photorealism.
 */
const finite=(v,fallback)=>Number.isFinite(Number(v))?Number(v):fallback;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export function evaluateForestOracles(scene={},instances=[],quality='ultra'){
 const state=scene.state||{};
 const wind=clamp(finite(state.windSpeed??state.wind??scene.windSpeed,4),0,25);
 const weather=String(state.weather??state.conditions??'clear').toLowerCase();
 const lighting=String(state.lighting??'day').toLowerCase();
 const fog=weather.includes('fog')||weather.includes('mist')?0.6:weather.includes('rain')?0.35:0.12;
 const maxTrees=quality==='low'?12:quality==='medium'?24:quality==='high'?36:48;
 const maxDepth=fog>.5?145:260;
 const oracles=[
  {id:'valid-transform',test:t=>[t.x,t.y,t.z,t.height].every(Number.isFinite)&&t.height>0},
  {id:'forward-depth',test:t=>t.z>-4&&t.z<maxDepth},
  {id:'horizontal-view',test:t=>Math.abs(t.x)<Math.max(35,t.z*1.25)},
  {id:'physical-scale',test:t=>t.height>=.5&&t.height<=45}
 ];
 const accepted=[],rejected={};
 for(const t of instances){
  const failed=oracles.find(o=>!o.test(t));
  if(failed){rejected[failed.id]=(rejected[failed.id]||0)+1;continue;}
  accepted.push(t);
 }
 accepted.sort((a,b)=>a.z-b.z);
 return {trees:accepted.slice(0,maxTrees),windStrength:.025+.012*wind,windSpeed:wind,
  fogDensity:fog,late:lighting==='late'||lighting==='sunset',
  oracleIds:oracles.map(o=>o.id),accepted:accepted.length,rejected,capacity:maxTrees};
}
