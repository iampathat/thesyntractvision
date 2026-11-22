/* © 2026 Patrik Sundblom. All Rights Reserved.
 * Read actual WebGL framebuffer pixels, not CPU-projected triangles.
 * Call immediately after rendering, before any canvas clear.
 */
export function probeForestFramebuffer(gl, {width, height, sampleStep=4, minGreenDominance=12}={}) {
  if(!gl || typeof gl.readPixels!=='function') throw Error('WebGL readPixels required');
  if(!Number.isInteger(width)||width<1||!Number.isInteger(height)||height<1) throw Error('Invalid framebuffer size');
  if(!Number.isInteger(sampleStep)||sampleStep<1) throw Error('Invalid sample step');
  const rgba=new Uint8Array(width*height*4);
  gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,rgba);
  const error=gl.getError();
  if(error!==gl.NO_ERROR) throw Error(`WebGL readPixels error ${error}`);
  let greenCandidates=0,sampled=0,opaque=0;
  for(let y=0;y<height;y+=sampleStep)for(let x=0;x<width;x+=sampleStep){
    const i=4*(y*width+x),r=rgba[i],g=rgba[i+1],b=rgba[i+2],a=rgba[i+3];
    sampled++;if(a>0)opaque++;
    if(a>0 && g-r>=minGreenDominance && g-b>=minGreenDominance)greenCandidates++;
  }
  return {width,height,sampled,opaque,greenCandidates,greenCandidateFraction:sampled?greenCandidates/sampled:0,
    warning:'Green pixel candidates are not proof of trees; validate against an object-ID/depth pass and camera screenshots.'};
}
