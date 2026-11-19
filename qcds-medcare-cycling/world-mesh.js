/* © 2026 Patrik Sundblom. All Rights Reserved.
 * Deterministic, executable terrain/road mesh generation for QCDS Cycling.
 * Coordinates are local metres; real-world elevation must come from a sourced route.
 */
import {selectWorldConfiguration} from './world-oracles.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);
function hash(x,z,seed){const n=Math.sin(x*127.1+z*311.7+seed*53.7)*43758.5453;return n-Math.floor(n);}
function noise(x,z,seed){
 const i=Math.floor(x),j=Math.floor(z),u=smooth(x-i),v=smooth(z-j);
 return lerp(lerp(hash(i,j,seed),hash(i+1,j,seed),u),lerp(hash(i,j+1,seed),hash(i+1,j+1,seed),u),v);
}
export function createWorldField(options={}){
 const oracle=selectWorldConfiguration(options);
 const seed=Number.isFinite(options.seed)?options.seed:17;
 const alpine=String(options.scene?.biome||'').includes('alpine');
 const amplitude=oracle.relief;
 const center=z=>Math.sin(z*.007+seed*.1)*8+Math.sin(z*.019+seed*.03)*2.4;
 const raw=(x,z)=>amplitude*((noise(x/160,z/160,seed)-.5)*1.6+(noise(x/47,z/47,seed+9)-.5)*.48)
   +(noise(x/12,z/12,seed+27)-.5)*1.4;
 const roadHeight=z=>{
  const x=center(z),radius=oracle.roadGradeSmoothing;
  // The jointly selected grade-smoothing radius changes the actual road and
  // the terrain carved beneath it, rather than remaining unused metadata.
  return .5*raw(x,z)+.25*(raw(center(z-radius),z-radius)+raw(center(z+radius),z+radius));
 };
 const width=oracle.roadWidth;
 const height=(x,z)=>{
  const distance=Math.abs(x-center(z));
  const t=smooth(clamp((distance-width/2)/oracle.shoulderWidth,0,1));
  return lerp(roadHeight(z),raw(x,z),t);
 };
 const road=z=>{
  const d=1.5,x=center(z),y=roadHeight(z);
  const tangent=[(center(z+d)-center(z-d))/(2*d),(roadHeight(z+d)-roadHeight(z-d))/(2*d),1];
  const len=Math.hypot(...tangent);
  return {x,y,z,tangent:tangent.map(v=>v/len),width};
 };
 return {oracle,seed,width,height,road,center,roadHeight};
}
export function buildWorldMesh(options={}){
 const field=createWorldField(options),step=clamp(options.step||6,1,24);
 const halfWidth=clamp(options.halfWidth||96,12,1000),length=clamp(options.length||240,24,4000);
 const cols=Math.ceil(2*halfWidth/step),rows=Math.ceil(length/step);
 const positions=[],normals=[],indices=[],roadPositions=[],roadNormals=[],roadIndices=[];
 for(let z=0;z<=rows;z++)for(let x=0;x<=cols;x++){
  const px=-halfWidth+2*halfWidth*x/cols,pz=length*z/rows,py=field.height(px,pz);
  const dx=(field.height(px+.5,pz)-field.height(px-.5,pz));
  const dz=(field.height(px,pz+.5)-field.height(px,pz-.5));
  const len=Math.hypot(dx,2,dz);
  positions.push(px,py,pz);normals.push(-dx/len,2/len,-dz/len);
 }
 for(let z=0;z<rows;z++)for(let x=0;x<cols;x++){
  const a=z*(cols+1)+x,b=a+cols+1;
  indices.push(a,b,a+1,a+1,b,b+1);
 }
 for(let z=0;z<=rows;z++){
  const p=field.road(length*z/rows),tx=p.tangent[0],tz=p.tangent[2],m=Math.hypot(tx,tz);
  const side=[tz/m,-tx/m];
  for(const edge of [-1,1]){
   const ex=p.x+side[0]*field.width*.5*edge,ez=p.z+side[1]*field.width*.5*edge;
   // Sample the SAME continuous world height field at each road edge.
   // A constant centerline Y makes curved, sloping roads float above or cut through terrain.
   const roadY=field.height(ex,ez)+.035;
   roadPositions.push(ex,roadY,ez);
   // Match road lighting to the shared terrain field, including slopes and bends.
   const gx=field.height(ex+.5,ez)-field.height(ex-.5,ez);
   const gz=field.height(ex,ez+.5)-field.height(ex,ez-.5);
   const norm=Math.hypot(gx,2,gz);
   roadNormals.push(-gx/norm,2/norm,-gz/norm);
  }
  if(z<rows){const a=z*2;roadIndices.push(a,a+2,a+1,a+1,a+2,a+3);}
 }
 return {field,terrain:{positions:new Float32Array(positions),normals:new Float32Array(normals),indices:new Uint32Array(indices)},
  road:{positions:new Float32Array(roadPositions),normals:new Float32Array(roadNormals),indices:new Uint32Array(roadIndices)},
  dimensions:{cols,rows,length,halfWidth},synthetic:true};
}
