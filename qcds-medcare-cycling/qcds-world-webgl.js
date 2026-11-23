/* © 2026 Patrik Sundblom. All Rights Reserved.
 * Opt-in QCDS world mesh renderer. No changes to the existing FTMS/game engine.
 */
import {buildWorldMesh,worldRiderPose} from './world-mesh.js';
import {buildRiderMesh} from './rider-mesh.js';
import {cameraPair} from './camera-rig.mjs';
import {worldSurface} from './world-surface.mjs';
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
uniform float uHaze;uniform float uRoughness;uniform float uRoad;uniform float uWetness;uniform float uShadowStrength;uniform float uForest;uniform float uGround;uniform float uForestVariation;uniform vec3 uCamera;
out vec4 color;
void main(){
 vec3 n=normalize(vNormal);
 float direct=max(0.,dot(n,normalize(uSun)));
 float ambient=.47+.25*clamp(n.y,0.,1.);
 // The same joint world oracle controls sunlight contrast and surface wetness.
 direct*=mix(.68,1.0,clamp(uShadowStrength,0.,1.));
 float detail=.94+.06*sin(vPosition.x*1.7)*sin(vPosition.z*1.3);
 vec3 surface=uAlbedo*(ambient+.6*direct)*detail;
 // Stable world-space crown shading, driven by the same joint forest oracle.
 if(uForest>.5){
  float broad=sin(vPosition.x*.31+vPosition.z*.19)*sin(vPosition.y*.43-vPosition.z*.27);
  float fine=sin(vPosition.x*2.7+vPosition.y*1.9)*sin(vPosition.z*2.1-vPosition.y*1.3);
  float leaf=clamp(.82+.13*broad+.10*fine, .58,1.06);
  surface*=mix(1.,leaf,clamp(uForestVariation,0.,1.));
  // Joint QCDS sun/forest decision: canopy self-shading uses actual 3D normals,
  // not a camera-facing sprite or independently chosen material layer.
  float sunFacing=max(dot(n,normalize(uSun)),0.);
  float canopyOcclusion=mix(.72,1.,sunFacing);
  surface*=mix(1.,canopyOcclusion,clamp(uForestVariation,0.,1.));
  surface*=.84+.16*clamp(n.y,0.,1.);
 }
 // Terrain and forest floor are evaluated in the same world-space coordinates.
 // This creates continuous ground cover across camera poses without billboards.
 if(uGround>.5){
  float cover=clamp(uForestVariation,0.,1.);
  float groundPatch=sin(vPosition.x*.37+sin(vPosition.z*.13))*cos(vPosition.z*.41-vPosition.x*.11);
  float blades=sin(vPosition.x*5.7+vPosition.z*1.9)*cos(vPosition.z*6.3-vPosition.x*2.1);
  float slope=clamp(n.y,0.,1.);
  float moss=clamp(.5+.34*groundPatch+.16*blades,0.,1.)*slope*cover;
  vec3 woodland=vec3(.19,.32,.13)*(ambient+.48*direct);
  surface=mix(surface,woodland,moss*.48);
  surface*=.92+.08*groundPatch;
 }
 if(uRoad>.5){
  float wet=clamp(uWetness,0.,1.);
  vec3 viewDir=normalize(uCamera-vPosition);
  vec3 reflected=reflect(-normalize(uSun),n);
  float spec=pow(max(dot(viewDir,reflected),0.),mix(32.,90.,wet));
  // Camera-independent multi-scale road aggregate, evaluated in world coordinates.
  // Roughness and wetness are selected by the SAME joint QCDS world oracle.
  float coarse=sin(vPosition.x*8.1+sin(vPosition.z*3.7))*sin(vPosition.z*9.3);
  float fine=sin(vPosition.x*37.7+vPosition.z*13.1)*sin(vPosition.z*41.9-vPosition.x*11.7);
  float aggregate=mix(.965,1.035,.5+.5*coarse)*mix(.97,1.03,.5+.5*fine);
  float rough=clamp(uRoughness,0.,1.);
  surface*=mix(1.,aggregate,.35+.65*rough);
  surface*=mix(.96,.67,wet);
  surface+=vec3(.26,.29,.32)*spec*wet*(1.-.65*rough);
 }
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

// True 3D forest-floor tufts. Each accepted trunk anchors a cluster in the
// same terrain/water/road-constrained world, independent of camera orientation.
function understoryMesh(field,forest){
 const positions=[],normals=[],indices=[],p=forest.trunks.positions;
 const density=Math.max(0,Math.min(1,Number(field.oracle.forestDensity)||0));
 // No QCDS forest permission means no vegetation triangles, not zero-height triangles.
 if(density===0||p.length===0)return {positions:new Float32Array(0),normals:new Float32Array(0),indices:new Uint32Array(0)};
 for(let i=0;i<p.length;i+=36){
  // The first ring of each accepted tree supplies its footprint centre.
  // Branches are appended after trunks; use only ground-adjacent ring vertices.
  const x=p[i],z=p[i+2];
  if(!Number.isFinite(x)||!Number.isFinite(z))continue;
  const ground=field.height(x,z);
  if(Math.abs(p[i+1]-ground)>1.5)continue;
  for(let clump=0;clump<Math.round(5+5*density);clump++){
   const angle=clump*2.399963229728653;
   const cx=x+Math.cos(angle)*(.5+clump*.17),cz=z+Math.sin(angle)*(.5+clump*.17);
   // Enforce the SAME road/shoulder exclusion as the joint world field.
   const roadClearance=field.width*.5+field.oracle.shoulderWidth+.25;
   if(Math.abs(cx-field.center(cz))<=roadClearance+.25)continue;
   const cy=field.height(cx,cz)+.035;
   const height=(.55+.16*((clump*7)%5))*density;
   for(let blade=0;blade<4;blade++){
    const a=angle+blade*Math.PI/4,dx=Math.cos(a),dz=Math.sin(a),base=positions.length/3;
    positions.push(cx-dx*.19,cy,cz-dz*.19,cx+dx*.19,cy,cz+dz*.19,cx+dx*.035,cy+height,cz+dz*.035);
    normals.push(-dz,.35,dx,-dz,.35,dx,-dz,.35,dx);
    indices.push(base,base+1,base+2);
    indices.push(base+2,base+1,base);
   }
  }
 }
 return {positions:new Float32Array(positions),normals:new Float32Array(normals),indices:new Uint32Array(indices)};
}

export class QcdsWorldWebGL{
 constructor(canvas){this.canvas=canvas;this.gl=canvas.getContext('webgl2',{antialias:true,alpha:false});if(!this.gl)throw Error('WebGL2 unavailable');this.program=program(this.gl);this.meshes=[];this.active=false;this.frame=0;this.cameraMode='fixed';this.cameraSeed='camera-001';this.worldSeed='qcds-baseline';}
 rebuild(options){const gl=this.gl;for(const m of this.meshes)for(const b of m.mesh.buffers)gl.deleteBuffer(b);for(const m of this.meshes)gl.deleteVertexArray(m.mesh.vao);this.meshes=[];const world=buildWorldMesh({...options,step:5,halfWidth:110,length:300});this.field=world.field;this.worldDecision=world.field.oracle;const add=(data,color,road=0,forest=0,ground=0)=>this.meshes.push({mesh:mesh(gl,data.positions,data.normals||roadNormals(data.positions),data.indices),color,road,forest,ground});const surface=worldSurface(world.field.oracle);this.surface=surface;add(world.terrain,surface.terrain,0,0,1);add(ridgeMesh(world.field,world.field.seed),surface.terrain.map((v,i)=>v*(i===2?1.08:.86)));add(world.road,surface.road,1);add(world.forest.trunks,surface.trunks);add(world.forest.crowns,surface.crowns,0,1);const undergrowth=understoryMesh(world.field,world.forest);if(undergrowth.indices.length)add(undergrowth,[.19,.37,.13],0,0,1);if(world.water.count)add(world.water,surface.water);this.options=options;this.worldSeed=String(options.worldSeed||'qcds-baseline');this.render();}
 setCamera(mode='fixed',cameraSeed='camera-001'){if(mode!=='fixed'&&mode!=='random')throw Error('Unknown QCDS camera mode');this.cameraMode=mode;this.cameraSeed=String(cameraSeed);this.render();}
 cameraEvidence(){const pair=cameraPair({worldSeed:this.worldSeed,cameraSeed:this.cameraSeed,field:this.field});const p=this.field.road(0),t=this.field.road(90);return {...pair,fixed:{position:[p.x,p.y+3.4,-14],target:[t.x,t.y+1,t.z],fov:65},mode:this.cameraMode};}
 render(){const gl=this.gl,canvas=this.canvas;const w=Math.max(2,Math.round(canvas.clientWidth*devicePixelRatio)),h=Math.max(2,Math.round(canvas.clientHeight*devicePixelRatio));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}gl.viewport(0,0,w,h);gl.enable(gl.DEPTH_TEST);gl.clearColor(.63,.73,.81,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);const pair=this.cameraEvidence(),camera=pair[this.cameraMode];const vp=multiply(perspective(camera.fov*Math.PI/180,w/h,.1,900),lookAt(camera.position,camera.target));const loc=n=>gl.getUniformLocation(this.program,n);gl.uniformMatrix4fv(loc('uViewProjection'),false,vp);const decision=this.worldDecision;const late=this.surface.late;gl.uniform3fv(loc('uSun'),new Float32Array(decision.sunDirection));gl.uniform3fv(loc('uFog'),new Float32Array(late?[.79,.65,.54]:[.65,.74,.82]));gl.uniform1f(loc('uHaze'),decision.fogDensity);gl.uniform1f(loc('uWetness'),decision.roadWetness);gl.uniform1f(loc('uRoughness'),this.surface.roughness);gl.uniform1f(loc('uShadowStrength'),decision.shadowStrength);gl.uniform1f(loc('uForestVariation'),Math.max(0,Math.min(1,Number(decision.forestDensity)||0)));gl.uniform3fv(loc('uCamera'),new Float32Array(camera.position));for(const item of this.meshes){gl.uniform3fv(loc('uAlbedo'),new Float32Array(item.color));gl.uniform1f(loc('uRoad'),item.road);gl.uniform1f(loc('uForest'),item.forest);gl.uniform1f(loc('uGround'),item.ground);gl.bindVertexArray(item.mesh.vao);gl.drawElements(gl.TRIANGLES,item.mesh.count,gl.UNSIGNED_INT,0);}
 // Riders and road share the same terrain field, sun, fog and depth buffer.
 // Update only the small articulated meshes; the terrain stays GPU resident.
 const time=performance.now()/1000,cadence=Number(this.options.cadence)||80;
 for(let rider=0;rider<3;rider++){
  const z=18+rider*7,pose=worldRiderPose(this.field,z,{lane:(rider-1)*.72,cadence,speedKmh:Number(this.options.speedKmh)||28});
  const body=buildRiderMesh({cadence:pose.cadence,time,offset:rider*1.1,roadHeight:0,lean:pose.lean});
  const c=Math.cos(pose.heading),s=Math.sin(pose.heading);
  for(let i=0;i<body.positions.length;i+=3){const x=body.positions[i],zz=body.positions[i+2];body.positions[i]=pose.x+c*x+s*zz;body.positions[i+1]+=pose.y;body.positions[i+2]=pose.z-s*x+c*zz;}
  for(let i=0;i<body.normals.length;i+=3){const x=body.normals[i],zz=body.normals[i+2];body.normals[i]=c*x+s*zz;body.normals[i+2]=-s*x+c*zz;}
  const riderMesh=mesh(gl,body.positions,body.normals,body.indices);
  gl.uniform3fv(loc('uAlbedo'),new Float32Array(rider===0?[.12,.34,.66]:rider===1?[.77,.22,.13]:[.16,.22,.27]));
  gl.uniform1f(loc('uRoad'),0);gl.uniform1f(loc('uForest'),0);gl.uniform1f(loc('uGround'),0);
  gl.bindVertexArray(riderMesh.vao);gl.drawElements(gl.TRIANGLES,riderMesh.count,gl.UNSIGNED_INT,0);
  for(const b of riderMesh.buffers)gl.deleteBuffer(b);
  gl.deleteVertexArray(riderMesh.vao);
 }
 gl.bindVertexArray(null);}
 dispose(){const gl=this.gl;for(const item of this.meshes){for(const b of item.mesh.buffers)gl.deleteBuffer(b);gl.deleteVertexArray(item.mesh.vao);}gl.deleteProgram(this.program);}
}
