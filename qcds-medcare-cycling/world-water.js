/* © 2026 Patrik Sundblom. All Rights Reserved.
 * Deterministic water surface, subordinate to the SAME selected QCDS world.
 * Synthetic geometry only: never implies a mapped lake or real water body.
 */
export function buildWorldWater(field,{length=300,halfWidth=110,step=6,enabled=false}={}){
 const positions=[],normals=[],indices=[];
 const oracle=field.oracle;
 if(!enabled||!oracle||oracle.provenance!=='synthetic')return {positions:new Float32Array(),normals:new Float32Array(),indices:new Uint32Array(),count:0,synthetic:true};
 const spacing=Math.max(2,Math.min(16,step)),margin=field.width/2+oracle.shoulderWidth+12;
 const nx=Math.floor((halfWidth-margin)/spacing),nz=Math.floor(length/spacing);
 // Water level is a single horizontal datum for each coherent basin.
 // The selected relief and world seed determine where depressions are flooded.
 const seed=Number(field.seed)||1;
 const basinSide=seed%2?1:-1;
 const basinX=basinSide*(margin+Math.max(10,(halfWidth-margin)*.55));
 const basinZ=length*(.48+((seed%7)-3)*.015);
 const radiusX=Math.max(8,(halfWidth-margin)*.37),radiusZ=Math.max(20,length*.24);
 const datum=field.height(basinX,basinZ)+Math.max(.6,oracle.relief*.045);
 let count=0;
 for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){
  const x=basinSide*(margin+(ix+.5)*spacing),z=(iz+.5)*spacing;
  const radial=((x-basinX)/radiusX)**2+((z-basinZ)/radiusZ)**2;
  if(radial>=1)continue;
  // Exclude road, shoulder and any cell whose ground rises above water.
  if(Math.abs(x-field.center(z))<margin||field.height(x,z)>=datum-.08)continue;
  const base=positions.length/3,h=spacing*.49;
  positions.push(x-h,datum,z-h,x+h,datum,z-h,x-h,datum,z+h,x+h,datum,z+h);
  for(let i=0;i<4;i++)normals.push(0,1,0);
  indices.push(base,base+2,base+1,base+1,base+2,base+3);count++;
 }
 return {positions:new Float32Array(positions),normals:new Float32Array(normals),indices:new Uint32Array(indices),count,synthetic:true,waterLevel:datum,oracleIds:['QC-ROAD-CLEARANCE','QC-GEOMETRY-CONTINUITY','QC-WORLD-WATER']};
}
