/* © 2026 Patrik Sundblom. All Rights Reserved.
 * Opt-in QCDS world mesh renderer. No changes to the existing FTMS/game engine.
 */
import {buildWorldMesh} from './world-mesh.js';
import {buildRiderMesh} from './rider-mesh.js';
const VERT=`#version 300 es
precision highp float;
layout(location=0) in vec3 position;
layout(location=1) in vec3 normal;
uniform mat4 uViewProjection;
out vec3 vNormal;out vec3 vPosition;out float vDepth;
void main(){vNormal=normal;vPosition=position;vec4 p=uViewProjection*vec4(position,1.);vDepth=p.w;gl_Position=p;}`;
const FRAG=`#version 300 es
precision highp float;
in vec3 vNormal;in vec3 vPosition;in float vDepth;
uniform vec3 uSun;uniform vec3 uFog;uniform vec3 uAlbedo;
uniform float uHaze;uniform float uRoad;
out vec4 color;
void main(){
 vec3 n=normalize(vNormal);
 float direct=max(0.,dot(n,normalize(uSun)));
 float ambient=.35+.23*clamp(n.y,0.,1.);
 float detail=.94+.06*sin(vPosition.x*1.7)*sin(vPosition.z*1.3);
 vec3 surface=uAlbedo*(ambient+.6*direct)*detail;
 if(uRoad>.5){float edge=0.015*sin(vPosition.z*.12);surface*=.96+edge;}
 float fog=1.-exp(-pow(max(vDepth-15.,0.)/mix(360.,125.,uHaze),1.45));
 color=vec4(mix(surface,uFog,clamp(fog,0.,.86)),1.);
}`;
function shader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
function program(gl){const p=gl.createProgram(),v=shader(gl,gl.VERTEX_SHADER,VERT),f=shader(gl,gl.FRAGMENT_SHADER,FRAG);gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),o=new Float32Array(16);o[0]=f/aspect;o[5]=f;o[10]=(far+near)/(near-far);o[11]=-1;o[14]=2*far*near/(near-far);return o;}
function lookAt(eye,target){let z=eye.map((v,i)=>v-target[i]);let n=Math.hypot(...z);z=z.map(v=>v/n);let x=[z[2],0,-z[0]];n=Math.hypot(...x);x=x.map(v=>v/n);const y=[z[1]*x[2]-z[2]*x[1],z[2]*x[0]-z[0]*x[2],z[0]*x[1]-z[1]*x[0]];return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-x.reduce((s,v,i)=>s+v*eye[i],0),-y.reduce((s,v,i)=>s+v*eye[i],0),-z.reduce((s,v,i)=>s+v*eye[i],0),1]);}
function multiply(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
function mesh(gl,positions,normals,indices){const vao=gl.createVertexArray();gl.bindVertexArray(vao);const buffers=[];for(const [data,loc] of [[positions,0],[normals,1]]){const b=gl.createBuffer();buffers.push(b);gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,0,0);}const ib=gl.createBuffer();buffers.push(ib);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);gl.bindVertexArray(null);return {vao,buffers,count:indices.length};}
function roadNormals(positions){const normals=new Float32Array(positions.length);for(let i=0;i<normals.length;i+=3)normals[i+1]=1;return normals;}
function ridgeMesh(field,seed){
 // A distant mountain is a connected 2D heightfield, not a vertical billboard.
 // Ridge heights rise from the same deterministic world field as the foreground.
 const positions=[],normals=[],indices=[],cols=100,rows=16;
 for(let z=0;z<=rows;z++)for(let x=0;x<=cols;x++){
  const px=-320+x*640/cols,pz=270+z*320/rows;
  const envelope=Math.pow(Math.sin(Math.PI*x/cols),1.6);
  const ridge=22+48*envelope*(.65+.35*Math.sin(x*.14+seed*.1));
  const depthFade=Math.sin(Math.PI*z/rows);
  const py=field.height(px,pz)+ridge*depthFade;
  positions.push(px,py,pz);
 }
 for(let z=0;z<=rows;z++)for(let x=0;x<=cols;x++){
  const i=(z*(cols+1)+x)*3;
  const l=(z*(cols+1)+Math.max(0,x-1))*3,r=(z*(cols+1)+Math.min(cols,x+1))*3;
  const b=(Math.max(0,z-1)*(cols+1)+x)*3,t=(Math.min(rows,z+1)*(cols+1)+x)*3;
  const dx=(positions[r+1]-positions[l+1])/Math.max(.01,positions[r]-positions[l]);
  const dz=(positions[t+1]-positions[b+1])/Math.max(.01,positions[t+2]-positions[b+2]);
  const m=Math.hypot(dx,1,dz);normals.push(-dx/m,1/m,-dz/m);
 }
 for(let z=0;z<rows;z++)for(let x=0;x<cols;x++){
  const i=z*(cols+1)+x,j=i+cols+1;indices.push(i,j,i+1,i+1,j,j+1);
 }
 return {positions:new Float32Array(positions),normals:new Float32Array(normals),indices:new Uint32Array(indices)};
}
export class QcdsWorldWebGL{
 constructor(canvas){this.canvas=canvas;this.gl=canvas.getContext('webgl2',{antialias:true,alpha:false});if(!this.gl)throw Error('WebGL2 unavailable');this.program=program(this.gl);this.meshes=[];this.active=false;this.frame=0;}
 rebuild(options){const gl=this.gl;for(const m of this.meshes)for(const b of m.mesh.buffers)gl.deleteBuffer(b);for(const m of this.meshes)gl.deleteVertexArray(m.mesh.vao);this.meshes=[];const world=buildWorldMesh({...options,step:5,halfWidth:110,length:300});this.field=world.field;this.worldDecision=world.field.oracle;const add=(data,color,road=0)=>this.meshes.push({mesh:mesh(gl,data.positions,data.normals||roadNormals(data.positions),data.indices),color,road});add(world.terrain,[.28,.38,.23]);add(ridgeMesh(world.field,world.field.seed),[.35,.39,.39]);add(world.road,[.19,.2,.21],1);this.options=options;this.render();}
 render(){const gl=this.gl,canvas=this.canvas;const w=Math.max(2,Math.round(canvas.clientWidth*devicePixelRatio)),h=Math.max(2,Math.round(canvas.clientHeight*devicePixelRatio));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}gl.viewport(0,0,w,h);gl.enable(gl.DEPTH_TEST);gl.clearColor(.63,.73,.81,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);const start=this.field.road(0),look=this.field.road(90);const camera=[start.x,start.y+3.4,-14];const target=[look.x,look.y+1,look.z];const vp=multiply(perspective(Math.PI/3,w/h,.1,900),lookAt(camera,target));const loc=n=>gl.getUniformLocation(this.program,n);gl.uniformMatrix4fv(loc('uViewProjection'),false,vp);const decision=this.worldDecision;const late=this.options.scene?.state?.lighting==='late';gl.uniform3fv(loc('uSun'),new Float32Array(decision.sunDirection));gl.uniform3fv(loc('uFog'),new Float32Array(late?[.79,.65,.54]:[.65,.74,.82]));gl.uniform1f(loc('uHaze'),decision.fogDensity);for(const item of this.meshes){gl.uniform3fv(loc('uAlbedo'),new Float32Array(item.color));gl.uniform1f(loc('uRoad'),item.road);gl.bindVertexArray(item.mesh.vao);gl.drawElements(gl.TRIANGLES,item.mesh.count,gl.UNSIGNED_INT,0);}
 // Riders and road share the same terrain field, sun, fog and depth buffer.
 // Update only the small articulated meshes; the terrain stays GPU resident.
 const time=performance.now()/1000,cadence=Number(this.options.cadence)||80;
 for(let rider=0;rider<3;rider++){
  const z=18+rider*7,point=this.field.road(z),body=buildRiderMesh({cadence,time,offset:rider*1.1,roadHeight:point.y+.05});
  const dx=(rider-1)*.72;
  for(let i=0;i<body.positions.length;i+=3){body.positions[i]+=point.x+dx;body.positions[i+2]+=z;}
  const riderMesh=mesh(gl,body.positions,body.normals,body.indices);
  gl.uniform3fv(loc('uAlbedo'),new Float32Array(rider===0?[.12,.34,.66]:rider===1?[.77,.22,.13]:[.16,.22,.27]));
  gl.uniform1f(loc('uRoad'),0);
  gl.bindVertexArray(riderMesh.vao);gl.drawElements(gl.TRIANGLES,riderMesh.count,gl.UNSIGNED_INT,0);
  for(const b of riderMesh.buffers)gl.deleteBuffer(b);
  gl.deleteVertexArray(riderMesh.vao);
 }
 gl.bindVertexArray(null);}
 dispose(){const gl=this.gl;for(const item of this.meshes){for(const b of item.mesh.buffers)gl.deleteBuffer(b);gl.deleteVertexArray(item.mesh.vao);}gl.deleteProgram(this.program);}
}
