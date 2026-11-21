/* © 2026 Patrik Sundblom. All Rights Reserved.
 * Deterministic, executable terrain/road mesh generation for QCDS Cycling.
 * Coordinates are local metres; real-world elevation must come from a sourced route.
 */
import {selectWorldConfiguration} from './world-oracles.js';
import {buildWorldWater} from './world-water.js';
import {acceptForestFootprint} from './world-forest-footprint.mjs';
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
 const seed=Number.isFinite(options.seed)?options.seed:oracle.seedNumber;
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
/** Jointly constrained tree instances: the SAME height field, road clearance,
 * vegetation density and selected world oracle control every placement. */
export function buildWorldForest(field,{length=300,halfWidth=110,water=null}={}){
 // Water is selected from the same world field before vegetation is placed.
 // Reject trunks whose footprints intersect flooded cells, including shore edges.
 const flooded=[];
 if(water?.count)for(let i=0;i<water.positions.length;i+=12){
  const p=water.positions;flooded.push([Math.min(p[i],p[i+3]),Math.max(p[i],p[i+3]),Math.min(p[i+2],p[i+8]),Math.max(p[i+2],p[i+8])]);
 }
 const trunks={positions:[],normals:[],indices:[]},crowns={positions:[],normals:[],indices:[]};
 const density=field.oracle.forestDensity;
 const spacing=14+(1-density)*18;
 // Forest geometry is forbidden in biomes rejected by the joint world oracle.
 // For valid forest biomes, density controls actual instance count, not only metadata.
 const enabled=density>0;
 const ring=(mesh,cx,cy,cz,radius,height,sides=6)=>{
  const base=mesh.positions.length/3;
  for(let y=0;y<2;y++)for(let k=0;k<sides;k++){
   const angle=2*Math.PI*k/sides,x=Math.cos(angle),z=Math.sin(angle);
   mesh.positions.push(cx+x*radius*(y?.14:1),cy+y*height,cz+z*radius*(y?.14:1));
   const n=Math.hypot(x,.18,z);mesh.normals.push(x/n,.18/n,z/n);
  }
  for(let k=0;k<sides;k++){
   const a=base+k,b=base+(k+1)%sides,c=a+sides,d=b+sides;
   mesh.indices.push(a,c,b,b,c,d);
  }
 };
 const crown=(cx,cy,cz,radius,height,seed)=>{
  // Five continuous, non-billboard rings: the same world mesh survives any camera pose.
  // Shape variation is deterministic and never changes the shared placement oracle.
  const sides=10,levels=[0,.2,.46,.73,1],profile=[.62,1,.82,.46,.07];
  const base=crowns.positions.length/3;
  const phase=hash(cx*.13,cz*.13,seed)*Math.PI*2;
  for(let layer=0;layer<levels.length;layer++)for(let k=0;k<sides;k++){
   const angle=k*Math.PI*2/sides,dx=Math.cos(angle),dz=Math.sin(angle);
   const shape=1+.065*Math.sin(angle*3+phase+layer*.7);
   const rad=radius*profile[layer]*shape;
   crowns.positions.push(cx+dx*rad,cy+height*levels[layer],cz+dz*rad);
   // Normals are reconstructed from the final triangles below, not guessed from a cone.
   crowns.normals.push(0,0,0);
  }
  const indexStart=crowns.indices.length;
  for(let layer=0;layer<levels.length-1;layer++)for(let k=0;k<sides;k++){
   const a=base+layer*sides+k,b=base+layer*sides+(k+1)%sides,c=a+sides,d=b+sides;
   crowns.indices.push(a,c,b,b,c,d);
  }
  // Area-weighted normals follow the actual QCDS-selected, irregular 3D canopy.
  // This keeps lighting stable across camera perspectives and world seeds.
  for(let i=indexStart;i<crowns.indices.length;i+=3){
   const ids=[crowns.indices[i],crowns.indices[i+1],crowns.indices[i+2]];
   const a=ids[0]*3,b=ids[1]*3,c=ids[2]*3,p=crowns.positions;
   const ux=p[b]-p[a],uy=p[b+1]-p[a+1],uz=p[b+2]-p[a+2];
   const vx=p[c]-p[a],vy=p[c+1]-p[a+1],vz=p[c+2]-p[a+2];
   const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
   for(const id of ids){const j=id*3;crowns.normals[j]+=nx;crowns.normals[j+1]+=ny;crowns.normals[j+2]+=nz;}
  }
  for(let i=base*3;i<crowns.normals.length;i+=3){
   const nx=crowns.normals[i],ny=crowns.normals[i+1],nz=crowns.normals[i+2];
   const n=Math.hypot(nx,ny,nz);
   if(n>1e-9){crowns.normals[i]=nx/n;crowns.normals[i+1]=ny/n;crowns.normals[i+2]=nz/n;}
   else {crowns.normals[i]=0;crowns.normals[i+1]=1;crowns.normals[i+2]=0;}
  }
 };
 let count=0;
 for(let z=14;enabled&&z<length-12;z+=spacing){
  for(let side of [-1,1])for(let lane=0;lane<2;lane++){
   const jitter=noise(side*9+lane,z*.14,field.seed+103);
   if(jitter>density)continue;
   const zz=z+(jitter-.5)*spacing*.7;
   const road=field.road(zz),x=road.x+side*(field.width*.5+field.oracle.shoulderWidth+6+lane*15+jitter*7);
   if(Math.abs(x)>halfWidth-5)continue;
   // Trees cannot occupy the road or its QCDS-selected graded shoulder.
   if(Math.abs(x-field.center(zz))<field.width*.5+field.oracle.shoulderWidth+2)continue;
   const ground=field.height(x,zz),height=7+noise(x*.1,zz*.1,field.seed+55)*9;
   const crownRadius=1.4+height*.16;
   if(flooded.some(([x0,x1,z0,z1])=>x+crownRadius>x0&&x-crownRadius<x1&&zz+crownRadius>z0&&zz-crownRadius<z1))continue;
   // Whole-canopy disk uses the same QCDS terrain, road and water as the mesh.
   if(!acceptForestFootprint(field,{x,z:zz,radius:crownRadius,water}))continue;
   ring(trunks,x,ground,zz,.24+height*.012,height*.34);
   crown(x,ground+height*.24,zz,crownRadius,height*.76,field.seed);
   count++;
  }
 }
 const packed=m=>({positions:new Float32Array(m.positions),normals:new Float32Array(m.normals),indices:new Uint32Array(m.indices)});
 return {trunks:packed(trunks),crowns:packed(crowns),count,spacing,oracleIds:['QC-GEOMETRY-CONTINUITY','QC-ROAD-CLEARANCE','QC-FOREST-RELIEF']};
}
/** Rider frame derived from the exact road centerline and joint oracle winner.
 * This keeps heading, lean, cadence and wheel contact in one geometric frame. */
export function worldRiderPose(field,z,{lane=0,cadence=80,speedKmh=0}={}){
 const p=field.road(z),t=p.tangent;
 const heading=Math.atan2(t[0],t[2]);
 const prev=field.road(z-1.5).tangent,next=field.road(z+1.5).tangent;
 const curvature=Math.atan2(prev[2]*next[0]-prev[0]*next[2],prev[0]*next[0]+prev[2]*next[2])/3;
 const speed=clamp(Number(speedKmh)||0,0,150)/3.6;
 const leanLimit=field.oracle.riderLeanLimit*Math.PI/180;
 const lean=clamp(Math.atan(speed*speed*curvature/9.81),-leanLimit,leanLimit);
 const lateral=clamp(lane,-field.width*.35,field.width*.35);
 const x=p.x+Math.cos(heading)*lateral,worldZ=z-Math.sin(heading)*lateral;
 return {x,y:field.height(x,worldZ)+.05,z:worldZ,heading,lean,
  cadence:clamp(Number(cadence)||0,0,200),curvature,worldSeed:field.oracle.worldSeed};
}
export function buildWorldMesh(options={}){
 const field=createWorldField(options),step=clamp(options.step||6,1,24);
 const halfWidth=clamp(options.halfWidth||96,12,1000),length=clamp(options.length||240,24,4000);
 const cols=Math.ceil(2*halfWidth/step),rows=Math.ceil(length/step);
 const positions=[],normals=[],indices=[],roadPositions=[],roadNormals=[],roadIndices=[];
 const pathPositions=[],pathTangents=[],pathCurvatures=[];
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
  // Shared rider/camera/road frame: same QCDS-selected grade and geometry.
  pathPositions.push(p.x,p.y+.035,p.z);
  pathTangents.push(...p.tangent);
  const ds=.75,prev=field.road(p.z-ds).tangent,next=field.road(p.z+ds).tangent;
  const cross=prev[0]*next[2]-prev[2]*next[0];
  const dot=prev[0]*next[0]+prev[2]*next[2];
  pathCurvatures.push(Math.atan2(cross,dot)/(2*ds));
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
 const water=buildWorldWater(field,{length,halfWidth,enabled:options.route?.demo===true&&/alpine/i.test(String(options.route?.id||''))});
 return {field,water,forest:buildWorldForest(field,{length,halfWidth,water}),terrain:{positions:new Float32Array(positions),normals:new Float32Array(normals),indices:new Uint32Array(indices)},
  road:{positions:new Float32Array(roadPositions),normals:new Float32Array(roadNormals),indices:new Uint32Array(roadIndices),
   path:{positions:new Float32Array(pathPositions),tangents:new Float32Array(pathTangents),curvatures:new Float32Array(pathCurvatures)}},
  dimensions:{cols,rows,length,halfWidth},synthetic:true};
}
