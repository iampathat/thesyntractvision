/* © 2026 Patrik Sundblom. All Rights Reserved.
 * Joint terrain, road and water oracle for 3D forest placement.
 */
import {canopyClearsRoad} from './forest-layout.mjs';
export function acceptForestFootprint(field,{x,z,radius,water=null,gradeLimit=1.8,maxSamples=256}={}) {
 if(!Number.isFinite(x)||!Number.isFinite(z)||!Number.isFinite(radius)||radius<=0)return false;
 // Reject the whole crown footprint when it intersects a curved road.
 if(!canopyClearsRoad(field,x,z,radius))return false;
 const step=Math.max(.65,radius/3),n=Math.ceil(radius/step);
 if((2*n+1)**2>maxSamples)return false;
 const ground=field.height(x,z);
 if(!Number.isFinite(ground))return false;
 const boxes=[];
 if(water?.positions?.length){const p=water.positions;for(let i=0;i+11<p.length;i+=12){
  boxes.push([Math.min(p[i],p[i+3],p[i+6],p[i+9]),Math.max(p[i],p[i+3],p[i+6],p[i+9]),Math.min(p[i+2],p[i+5],p[i+8],p[i+11]),Math.max(p[i+2],p[i+5],p[i+8],p[i+11])]);
 }}
 for(let ix=-n;ix<=n;ix++)for(let iz=-n;iz<=n;iz++){
  const dx=ix*radius/n,dz=iz*radius/n;
  if(dx*dx+dz*dz>radius*radius+1e-8)continue;
  const px=x+dx,pz=z+dz;
  if(Math.abs(px-field.center(pz))<=field.width/2+field.oracle.shoulderWidth+1)return false;
  const y=field.height(px,pz);
  if(!Number.isFinite(y)||Math.abs(y-ground)>gradeLimit)return false;
  if(boxes.some(([x0,x1,z0,z1])=>px>=x0&&px<=x1&&pz>=z0&&pz<=z1))return false;
 }
 return true;
}
