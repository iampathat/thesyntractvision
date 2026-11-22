/* © 2026 Patrik Sundblom. All Rights Reserved.
 * Shared QCDS road/forest geometry: physically clear shoulders, visible roadside canopy.
 */
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function forestLayout(oracle){
 const density=clamp(Number(oracle.forestDensity)||0,0,1);
 const shoulder=Math.max(0,Number(oracle.shoulderWidth)||0);
 const halfRoad=Math.max(0,Number(oracle.roadWidth)||0)/2;
 const spacing=9+(1-density)*11;
 const clearance=halfRoad+shoulder+2;
 const belts=[clearance+6.2,clearance+14,clearance+28];
 return Object.freeze({density,spacing,clearance,belts});
}
export function forestCandidate(field,z,side,lane,jitter){
 const layout=forestLayout(field.oracle);
 if(![-1,1].includes(side)||!Number.isInteger(lane)||lane<0||lane>=layout.belts.length)throw Error('Invalid forest belt');
 const zz=z+(jitter-.5)*layout.spacing*.55;
 const x=field.center(zz)+side*(layout.belts[lane]+jitter*2.5);
 return {x,z:zz,clearance:layout.clearance,spacing:layout.spacing};
}
/** Camera-independent, sampled whole-canopy clearance against curved road.
 * A conservative margin protects between samples for smooth centerlines;
 * arbitrary discontinuities cannot be certified by finite sampling.
 */
export function canopyClearsRoad(field,x,z,radius,{sampleStep=.5}={}){
 if(![x,z,radius].every(Number.isFinite)||radius<0||typeof field?.center!=='function')return false;
 const layout=forestLayout(field.oracle);
 const step=Math.max(.1,Math.min(1,Number(sampleStep)||.5));
 const segments=Math.max(8,Math.ceil(2*Math.max(radius,1)/step));
 for(let i=0;i<=segments;i++){
  const dz=-radius+2*radius*i/segments;
  const reach=Math.sqrt(Math.max(0,radius*radius-dz*dz));
  const roadX=field.center(z+dz);
  if(!Number.isFinite(roadX)||Math.abs(x-roadX)-reach<layout.clearance+step)return false;
 }
 return true;
}
