import {evaluateForestOracles} from './forest-oracles.js';
/* © 2026 Patrik Sundblom. All Rights Reserved. Proprietary QCDS Cycling integration.
   Third-party tree mesh and its two materials: Innerscene Norway Spruce, CC0 1.0 Universal.
   Model provenance: assets/CC0_SPRUCE_ASSET.txt. Not georeferenced imagery. */

const identity4=()=>new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
function multiply4(a,b){
 const o=new Float32Array(16);
 for(let col=0;col<4;col++)for(let row=0;row<4;row++){
  let sum=0;for(let k=0;k<4;k++)sum+=a[k*4+row]*b[col*4+k];
  o[col*4+row]=sum;
 }
 return o;
}
function localMatrix(n){
 if(n.matrix?.length===16)return new Float32Array(n.matrix);
 const q=n.rotation||[0,0,0,1],s=n.scale||[1,1,1],t=n.translation||[0,0,0];
 const [x,y,z,w]=q,xx=x*x,yy=y*y,zz=z*z,xy=x*y,xz=x*z,yz=y*z,wx=w*x,wy=w*y,wz=w*z;
 return new Float32Array([
 (1-2*(yy+zz))*s[0],(2*(xy+wz))*s[0],(2*(xz-wy))*s[0],0,
 (2*(xy-wz))*s[1],(1-2*(xx+zz))*s[1],(2*(yz+wx))*s[1],0,
 (2*(xz+wy))*s[2],(2*(yz-wx))*s[2],(1-2*(xx+yy))*s[2],0,
 t[0],t[1],t[2],1
 ]);
}
function transformPoint(m,p){
 return [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],
         m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],
         m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];
}
function transformNormal(m,n){
 // Inverse-transpose of upper 3x3: correct even for scaled glTF subnodes.
 const [a,b,c,d,e,f,g,h,i]=[m[0],m[4],m[8],m[1],m[5],m[9],m[2],m[6],m[10]];
 const A=e*i-f*h,B=f*g-d*i,C=d*h-e*g,D=c*h-b*i,E=a*i-c*g,F=b*g-a*h,G=b*f-c*e,H=c*d-a*f,I=a*e-b*d;
 const x=A*n[0]+B*n[1]+C*n[2],y=D*n[0]+E*n[1]+F*n[2],z=G*n[0]+H*n[1]+I*n[2];
 const inv=1/Math.max(1e-9,Math.hypot(x,y,z));return [x*inv,y*inv,z*inv];
}
function readGlb(data){
 const dv=new DataView(data);
 if(dv.getUint32(0,true)!==0x46546c67||dv.getUint32(4,true)!==2||dv.getUint32(8,true)!==data.byteLength)throw Error('Invalid CC0 GLB');
 let at=12,json=null,bin=null;
 while(at+8<=data.byteLength){
  const size=dv.getUint32(at,true),type=dv.getUint32(at+4,true);at+=8;
  if(size<0||at+size>data.byteLength)throw Error('Invalid glTF chunk length');
  if(type===0x4E4F534A)json=JSON.parse(new TextDecoder().decode(new Uint8Array(data,at,size)));
  else if(type===0x004E4942)bin=new Uint8Array(data,at,size);
  at+=size;
 }
 if(!json||!bin||json.extensionsRequired?.length)throw Error('Unsupported glTF asset');
 return {json,bin};
}
function unpackAccessor(json,bin,index){
 const a=json.accessors[index],view=json.bufferViews[a.bufferView];
 if(!a||!view)throw Error('Missing glTF accessor');
 const types={SCALAR:1,VEC2:2,VEC3:3,VEC4:4},n=types[a.type];
 const sizes={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4},size=sizes[a.componentType];
 if(!n||!size)throw Error('Unsupported glTF accessor type');
 const step=view.byteStride||size*n,offset=(view.byteOffset||0)+(a.byteOffset||0);
 const dv=new DataView(bin.buffer,bin.byteOffset,bin.byteLength);
 const out=new Float32Array(a.count*n);
 for(let i=0;i<a.count;i++)for(let j=0;j<n;j++){
  const p=offset+i*step+j*size;
  let val;
  switch(a.componentType){
   case 5126:val=dv.getFloat32(p,true);break;
   case 5125:val=dv.getUint32(p,true);break;
   case 5123:val=dv.getUint16(p,true);break;
   case 5122:val=dv.getInt16(p,true);break;
   case 5121:val=dv.getUint8(p);break;
   case 5120:val=dv.getInt8(p);break;
  }
  out[i*n+j]=val;
 }
 return out;
}
function compileShader(gl,type,src){
 const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);
 if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){
  const err=gl.getShaderInfoLog(sh);gl.deleteShader(sh);throw Error('Spruce shader: '+err);
 }
 return sh;
}
function makeProgram(gl,vs,fs){
 const v=compileShader(gl,gl.VERTEX_SHADER,vs),f=compileShader(gl,gl.FRAGMENT_SHADER,fs);
 const p=gl.createProgram();gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);
 gl.deleteShader(v);gl.deleteShader(f);
 if(!gl.getProgramParameter(p,gl.LINK_STATUS)){let e=gl.getProgramInfoLog(p);gl.deleteProgram(p);throw Error(e);}
 return p;
}
const TREE_VERT=`#version 300 es
precision highp float;
layout(location=0) in vec3 aP;
layout(location=1) in vec3 aN;
layout(location=2) in vec2 aUv;
layout(location=3) in vec4 aInstance;
layout(location=4) in vec2 aRotation;
uniform float uAspect;
uniform float uWindTime;
uniform float uWindStrength;
uniform vec3 uBase;
out vec2 vUv;out vec3 vN;out float vDepth;out vec3 vWorld;
void main(){
 vec3 p=(aP-uBase)*aInstance.w;
 vec2 xz=vec2(p.x*aRotation.y-p.z*aRotation.x,p.x*aRotation.x+p.z*aRotation.y);
 vec3 world=vec3(aInstance.x+xz.x,aInstance.y+p.y,aInstance.z+xz.y);
 // Low-amplitude crown sway: anchored trunk, coherent per-tree phase.
 float crown=clamp((p.y-1.4)/max(2.0,aInstance.w*9.0),0.0,1.0);
 float gust=sin(uWindTime*0.63+aInstance.x*0.17+aInstance.z*0.11);
 world.x+=crown*crown*uWindStrength*gust;
 world.z+=crown*crown*uWindStrength*.48*sin(uWindTime*0.48+aInstance.z*0.19);
 float z=max(.18,world.z+5.0),f=2.42;
 gl_Position=vec4(world.x*f/uAspect,(world.y-2.28+.11*z)*f,(1000.2/999.8)*z-(400.0/999.8),z);
 vN=normalize(vec3(aN.x*aRotation.y-aN.z*aRotation.x,aN.y,aN.x*aRotation.x+aN.z*aRotation.y));
 vUv=aUv;vDepth=z;vWorld=world;
}`;
const TREE_FRAG=`#version 300 es
precision highp float;
in vec2 vUv;in vec3 vN;in float vDepth;in vec3 vWorld;
uniform sampler2D uColor;
uniform vec3 uFog;
uniform float uLate;
uniform float uMaterial;
uniform vec3 uSunDirection;
uniform float uHaze;
out vec4 oColor;
void main(){
 vec4 base=texture(uColor,vUv);
 if(base.a<.30)discard;
 vec3 light=normalize(uSunDirection),n=normalize(vN);
 float lambert=max(0.,dot(n,light));
 // Foliage is thin: back-lit needles transmit a small amount of warm sunlight.
 // Bark remains opaque and receives only reflected sky and direct illumination.
 float backLight=pow(max(0.,dot(-n,light)),2.0);
 float hemi=clamp(n.y*.5+.5,0.,1.);
 vec3 skyLight=mix(vec3(.23,.24,.19),vec3(.48,.55,.62),hemi);
 vec3 direct=vec3(.72,.67,.57)*lambert;
 vec3 transmission=vec3(.20,.16,.065)*backLight;
 vec3 albedo=base.rgb*(skyLight+direct+(uMaterial>.5?transmission:vec3(0.)));
 // Stable world-space variation breaks up identical instanced silhouettes without
 // shimmering as the camera moves; retain the original photographic albedo.
 float grain=fract(sin(dot(floor(vWorld.xz*1.7),vec2(127.1,311.7)))*43758.5453);
 float dapple=0.90+0.16*smoothstep(.18,.86,grain);
 albedo*=dapple;
 if(uMaterial<.5)albedo*=vec3(.89,.97,.88);
 albedo=mix(albedo,albedo*vec3(1.13,.86,.73),uLate*.25);
 float fog=1.-exp(-pow(max(vDepth-22.,0.)/mix(310.,105.,clamp(uHaze,0.,1.)),1.5));
 albedo=mix(albedo,uFog,clamp(fog,0.,.74));
 oColor=vec4(albedo,1.);
}`;

export class Cc0SpruceForest {
 constructor(gl){
  this.gl=gl;this.ready=false;this.disposed=false;this.error=null;this.meshes=[];this.textures=[];
  this.instanceBuffer=gl.createBuffer();this.program=makeProgram(gl,TREE_VERT,TREE_FRAG);
  this.uniforms={
   aspect:gl.getUniformLocation(this.program,'uAspect'),
   windTime:gl.getUniformLocation(this.program,'uWindTime'),
   windStrength:gl.getUniformLocation(this.program,'uWindStrength'),
   base:gl.getUniformLocation(this.program,'uBase'),
   fog:gl.getUniformLocation(this.program,'uFog'),
   late:gl.getUniformLocation(this.program,'uLate'),
   sunDirection:gl.getUniformLocation(this.program,'uSunDirection'),
   haze:gl.getUniformLocation(this.program,'uHaze'),
   color:gl.getUniformLocation(this.program,'uColor'),
   material:gl.getUniformLocation(this.program,'uMaterial')
  };
  this.bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
  this.status={ready:false,instances:0,triangles:0,error:null,asset:'Innerscene spruce CC0'};
  if(typeof window!=='undefined')window.__qcdsSpruceStatus=this.status;
  this.promise=this.load().catch(e=>{this.error=String(e);this.status.error=this.error;console.warn('CC0 spruce fallback:',e);});
 }
 async load(){
  const resp=await fetch(new URL('./assets/norway-spruce-cc0.glb',import.meta.url),{cache:'force-cache'});
  if(!resp.ok)throw Error('CC0 spruce GLB HTTP '+resp.status);
  const raw=await resp.arrayBuffer();
  if(this.disposed)return;
  const {json,bin}=readGlb(raw);
  if(json.meshes.length>256||raw.byteLength>8_000_000)throw Error('Unexpected GLB');
  const groups=[[],[]],cache=new Map();
  const accessor=i=>{
   if(!cache.has(i))cache.set(i,unpackAccessor(json,bin,i));
   return cache.get(i);
  };
  const visit=(index,parent)=>{
   const node=json.nodes[index],matrix=multiply4(parent,localMatrix(node));
   if(node.mesh!==undefined){
    for(const prim of json.meshes[node.mesh].primitives){
     if(prim.mode!==undefined&&prim.mode!==4)continue;
     const pos=accessor(prim.attributes.POSITION),nor=accessor(prim.attributes.NORMAL),uv=accessor(prim.attributes.TEXCOORD_0);
     const count=pos.length/3;
     if(nor.length!==pos.length||uv.length!==count*2)continue;
     const indices=prim.indices===undefined?Array.from({length:count},(_,j)=>j):accessor(prim.indices);
     const bucket=groups[prim.material===1?1:0];
     for(const i of indices){
      const index=Number(i);if(index<0||index>=count)continue;
      const p=transformPoint(matrix,[pos[index*3],pos[index*3+1],pos[index*3+2]]);
      const n=transformNormal(matrix,[nor[index*3],nor[index*3+1],nor[index*3+2]]);
      for(let v=0;v<3;v++){this.bounds.min[v]=Math.min(this.bounds.min[v],p[v]);this.bounds.max[v]=Math.max(this.bounds.max[v],p[v]);}
      bucket.push(...p,...n,uv[index*2],uv[index*2+1]);
     }
    }
   }
   for(const child of node.children||[])visit(child,matrix);
  };
  const scene=json.scenes[json.scene||0];
  for(const root of scene.nodes)visit(root,identity4());
  if(this.disposed)return;
  const gl=this.gl;
  for(let material=0;material<groups.length;material++){
   const vertices=new Float32Array(groups[material]);
   if(!vertices.length)continue;
   const vao=gl.createVertexArray(),buffer=gl.createBuffer();
   gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
   gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);
   gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,32,0);
   gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,32,12);
   gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,2,gl.FLOAT,false,32,24);
   gl.bindBuffer(gl.ARRAY_BUFFER,this.instanceBuffer);
   gl.enableVertexAttribArray(3);gl.vertexAttribPointer(3,4,gl.FLOAT,false,24,0);gl.vertexAttribDivisor(3,1);
   gl.enableVertexAttribArray(4);gl.vertexAttribPointer(4,2,gl.FLOAT,false,24,16);gl.vertexAttribDivisor(4,1);
   this.meshes.push({vao,buffer,count:vertices.length/8,material});
  }
  // Materials are texture-backed PBR albedo. Keep alpha cutouts, fog and light in native WebGL.
  for(let material=0;material<2;material++){
   const textureIndex=json.materials[material]?.pbrMetallicRoughness?.baseColorTexture?.index;
   const imageIndex=json.textures[textureIndex]?.source;
   const spec=json.images[imageIndex];
   const glTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,glTex);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([115,133,89,255]));
   if(spec&&spec.bufferView!==undefined){
    const bv=json.bufferViews[spec.bufferView],offset=bv.byteOffset||0;
    const bytes=new Uint8Array(bin.buffer,bin.byteOffset+offset,bv.byteLength);
    const bitmap=await createImageBitmap(new Blob([bytes],{type:spec.mimeType||'image/png'}));
    if(this.disposed){bitmap.close();gl.deleteTexture(glTex);return;}
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,bitmap);
    bitmap.close();
   }
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
   gl.generateMipmap(gl.TEXTURE_2D);
   this.textures[material]=glTex;
  }
  gl.bindVertexArray(null);
  this.height=Math.max(1,this.bounds.max[1]-this.bounds.min[1]);
  this.center=[(this.bounds.min[0]+this.bounds.max[0])/2,this.bounds.min[1],(this.bounds.min[2]+this.bounds.max[2])/2];
  this.triangles=this.meshes.reduce((s,m)=>s+m.count/3,0);
  this.status.triangles=this.triangles;
  this.status.height=this.height;
  this.status.ready=true;this.ready=true;
 }
 render(instances,canvas,scene){
  if(!this.ready||!instances.length||this.disposed)return 0;
  // Keep the nearest visible trees rather than arbitrarily truncating the first 18.
  // Far-away meshes are both expensive and too small to contribute useful detail.
  const decision=evaluateForestOracles(scene,instances,'ultra');
  const visible=decision.trees;
  this.status.oracles={ids:decision.oracleIds,accepted:decision.accepted,rejected:decision.rejected};
  const gl=this.gl,amount=visible.length;
  if(!amount){this.status.instances=0;return 0;}
  const data=new Float32Array(amount*6);
  for(let i=0;i<amount;i++){
   const o=visible[i],a=6*i,ang=o.rotation||0;
   data[a]=o.x;data[a+1]=o.y;data[a+2]=o.z;data[a+3]=o.height/this.height;
   data[a+4]=Math.sin(ang);data[a+5]=Math.cos(ang);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER,this.instanceBuffer);
  gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);
  gl.useProgram(this.program);
  gl.uniform1f(this.uniforms.aspect,canvas.width/Math.max(1,canvas.height));
  gl.uniform1f(this.uniforms.windTime,performance.now()*0.001);
  // QCDS scene-state oracle: wind is a bounded physical driver, not random camera bobbing.
  gl.uniform1f(this.uniforms.windStrength,decision.windStrength);
  gl.uniform3fv(this.uniforms.base,this.center);
  gl.uniform3fv(this.uniforms.fog,new Float32Array(scene.palette.fog));
  const lighting=String(scene.state?.lighting||'day').toLowerCase();
  const sun=lighting==='late'||lighting==='sunset'?[.78,.27,-.56]:lighting==='dawn'?[.62,.24,-.74]:lighting==='night'?[.1,.5,-.86]:[-.35,.86,-.43];
  gl.uniform3fv(this.uniforms.sunDirection,new Float32Array(sun));
  gl.uniform1f(this.uniforms.haze,decision.fogDensity);
  gl.uniform1f(this.uniforms.late,decision.late?1:0);
  gl.uniform1i(this.uniforms.color,4);
  gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.disable(gl.BLEND);
  for(const mesh of this.meshes){
   gl.bindVertexArray(mesh.vao);
   gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,this.textures[mesh.material]);
   gl.uniform1f(this.uniforms.material,mesh.material);
   gl.drawArraysInstanced(gl.TRIANGLES,0,mesh.count,amount);
  }
  gl.bindVertexArray(null);
  this.status.instances=amount;
  return amount;
 }
 dispose(){
  this.disposed=true;const gl=this.gl;
  for(const m of this.meshes){gl.deleteBuffer(m.buffer);gl.deleteVertexArray(m.vao);}
  for(const t of this.textures)if(t)gl.deleteTexture(t);
  gl.deleteBuffer(this.instanceBuffer);gl.deleteProgram(this.program);
 }
}
