/* © 2026 Patrik Sundblom. All Rights Reserved.
 * Instrument actual live indexed WebGL draw calls, bound VAOs and counts.
 */
export function auditLiveForestDraws(renderer){
 const gl=renderer?.gl,meshes=renderer?.meshes;
 if(!gl||!Array.isArray(meshes)||meshes.length<5)throw Error('Live forest renderer unavailable');
 const forest=meshes.slice(3,5).map(item=>item.mesh);
 if(forest.some(m=>!m?.vao||!(m.count>0)))throw Error('Forest GPU geometry missing');
 const original=gl.drawElements,calls=[];
 try{
  gl.drawElements=function(mode,count,type,offset){
   calls.push({mode,count,type,offset,vao:gl.getParameter(gl.VERTEX_ARRAY_BINDING)});
   return original.call(this,mode,count,type,offset);
  };
  renderer.render();
 }finally{gl.drawElements=original;}
 const expected=forest.map(m=>m.count);
 const actual=forest.map(m=>calls.filter(c=>c.vao===m.vao&&c.mode===gl.TRIANGLES&&c.type===gl.UNSIGNED_INT&&c.offset===0&&c.count===m.count).length);
 if(actual.some(n=>n<1))throw Error('Forest mesh was not submitted to live WebGL: '+JSON.stringify({expected,actual}));
 return {forestIndexCounts:expected,forestDrawCalls:actual,totalDrawCalls:calls.length};
}
