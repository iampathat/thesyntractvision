/* © 2026 Patrik Sundblom. All Rights Reserved.
 * Frustum clipping of actual QCDS forest triangles; geometry verification,
 * not proof of rendered pixels or photorealism.
 */
export function forestCameraCoverage(mesh,camera,{fovDegrees=70,aspect=16/9,near=.1,far=500}={}) {
 const {eye,target,up=[0,1,0]}=camera;
 const finite3=a=>Array.isArray(a)&&a.length===3&&a.every(Number.isFinite);
 if(![eye,target,up].every(finite3)||!Number.isFinite(fovDegrees)||fovDegrees<=0||fovDegrees>=179||!Number.isFinite(aspect)||aspect<=0||!Number.isFinite(near)||!Number.isFinite(far)||near<=0||far<=near)throw Error('invalid camera');
 const sub=(a,b)=>a.map((v,i)=>v-b[i]);
 const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const norm=a=>{const l=Math.hypot(...a);if(l<1e-9)throw Error('degenerate camera');return a.map(v=>v/l)};
 const forward=norm(sub(target,eye)),right=norm(cross(forward,up)),vertical=cross(right,forward);
 const tanY=Math.tan(fovDegrees*Math.PI/360),tanX=tanY*aspect;
 const planes=[p=>p[2]-near,p=>far-p[2],p=>p[2]*tanX+p[0],p=>p[2]*tanX-p[0],p=>p[2]*tanY+p[1],p=>p[2]*tanY-p[1]];
 const positions=mesh.positions,indices=mesh.indices;
 if(!positions||!indices||positions.length%3||indices.length%3)throw Error('invalid mesh');
 let visibleTriangles=0,visibleVertices=0;
 const projected=[];
 for(let i=0;i<positions.length;i+=3){
  const p=sub([positions[i],positions[i+1],positions[i+2]],eye);
  if(!p.every(Number.isFinite))throw Error('nonfinite mesh');
  const v=[dot(p,right),dot(p,vertical),dot(p,forward)];projected.push(v);
  if(planes.every(fn=>fn(v)>=0))visibleVertices++;
 }
 for(let i=0;i<indices.length;i+=3){
  let polygon=[projected[indices[i]],projected[indices[i+1]],projected[indices[i+2]]];
  if(polygon.some(v=>!v))throw Error('invalid index');
  for(const distance of planes){
   if(!polygon.length)break;
   const next=[];
   for(let j=0;j<polygon.length;j++){
    const a=polygon[j],b=polygon[(j+1)%polygon.length],da=distance(a),db=distance(b);
    if(da>=0)next.push(a);
    if((da<0&&db>0)||(da>0&&db<0)){
     const t=da/(da-db);next.push(a.map((x,k)=>x+(b[k]-x)*t));
    }
   }
   polygon=next;
  }
  if(polygon.length>=3)visibleTriangles++;
 }
 return {visibleVertices,visibleTriangles,totalTriangles:indices.length/3,coverage:indices.length?visibleTriangles/(indices.length/3):0};
}
