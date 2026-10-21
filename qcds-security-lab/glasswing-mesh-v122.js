/* Project Glasswing — source-traced living eagle, WebGL triangular vector mesh.
   Theory and creation by Patrik Sundblom.
   with OpenAI / ChatGPT as research & development support.

   This is NOT a sprite animation: triangles are traced from the approved eagle.
   A continuous vertex-deformation field animates every shared boundary identically,
   so no wing cutlines, sliced bitmap sections, duplicate bodies, or backdrops.
*/
(() => {
  'use strict';
  const DATA_URL = './glasswing-original-traced-v122.svg?v=1.22.0';
  const VS = `
  attribute vec2 a_pos;
  attribute vec3 a_color;
  uniform float u_time;
  uniform float u_motion;
  varying vec3 v_color;
  varying float v_glow;
  vec2 turn(vec2 pos,vec2 pivot,float angle) {
    vec2 d=pos-pivot;
    float c=cos(angle),s=sin(angle);
    return vec2(c*d.x-s*d.y,s*d.x+c*d.y)+pivot;
  }
  void main(){
    vec2 initial=a_pos;
    vec2 p=initial;
    float phase=u_time*5.7;
    float breath=sin(phase);
    // Joint influence varies smoothly over the ORIGINAL connected mesh.
    // Both triangles sharing a vertex compute the same position: no seams.
    float left=(1.0-smoothstep(385.0,552.0,initial.x));
    float right=smoothstep(552.0,711.0,initial.x);
    float wingHeight=1.0-0.36*smoothstep(320.0,485.0,initial.y);
    float lInf=left*wingHeight*u_motion;
    float rInf=right*wingHeight*u_motion;
    float wingAngle=0.185*breath;
    p=mix(p,turn(initial,vec2(509.0,291.0), wingAngle),lInf);
    p=mix(p,turn(initial,vec2(581.0,308.0),-wingAngle),rInf);
    // Feathers ripple at the outer tips; central body does not shear.
    p.y+=(lInf+rInf)*sin(phase+initial.x*.014)*4.7;
    // An independent head / neck twist and subtle downward search movement.
    vec2 hd=(initial-vec2(524.0,314.0))/vec2(67.0,77.0);
    float hInf=exp(-dot(hd,hd)*2.3)*u_motion;
    vec2 head=turn(initial,vec2(524.0,330.0),sin(u_time*2.25)*.058);
    head+=vec2(sin(u_time*1.48)*2.4,cos(u_time*1.83)*3.0);
    p=mix(p,head,hInf);
    // Talons curl separately but remain continuously attached to chest.
    vec2 lf=(initial-vec2(435.0,412.0))/vec2(54.0,65.0);
    vec2 rf=(initial-vec2(552.0,440.0))/vec2(61.0,69.0);
    float lcl=exp(-dot(lf,lf)*2.1)*u_motion;
    float rcl=exp(-dot(rf,rf)*2.1)*u_motion;
    p=mix(p,turn(initial,vec2(435.0,372.0),sin(phase+.6)*.045),lcl);
    p=mix(p,turn(initial,vec2(552.0,406.0),sin(phase+2.4)*.05),rcl);
    gl_Position=vec4(p.x/480.0-1.0,1.0-p.y/251.0,0.0,1.0);
    v_color=a_color;
    // Light glints follow the existing source colors, not artificial HUD nodes.
    v_glow=u_motion*(.5+.5*sin(u_time*4.4+initial.x*.022));
  }`;
  const FS = `
  precision mediump float;
  varying vec3 v_color;
  varying float v_glow;
  void main(){
    vec3 col=v_color;
    float blueGlow=smoothstep(.45,.85,col.b)*smoothstep(.25,.75,col.g);
    float existingCircuit=smoothstep(.53,.86,col.g)*(1.0-smoothstep(.55,.9,col.r));
    col+=vec3(.015,.05,.075)*v_glow*blueGlow+vec3(.02,.12,.17)*v_glow*existingCircuit;
    gl_FragColor=vec4(min(col,vec3(1.0)),1.0);
  }`;
  const compile=(gl,type,text)=>{
    const shader=gl.createShader(type);
    gl.shaderSource(shader,text);gl.compileShader(shader);
    if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) {
      const message=gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error('Glasswing shader: '+message);
    }
    return shader;
  };
  const buildMesh = text => {
    const rx=/<path d="M(\d+) (\d+) (\d+) (\d+) (\d+) (\d+)Z" fill="#([a-fA-F0-9]{6})"\/>/g;
    const matches=text.matchAll(rx);
    const floats=[];
    let faces=0;
    for(const m of matches){
      const rgb=[parseInt(m[7].slice(0,2),16)/255,parseInt(m[7].slice(2,4),16)/255,parseInt(m[7].slice(4,6),16)/255];
      for(let i=0;i<3;i++)floats.push(Number(m[1+i*2]),Number(m[2+i*2]),...rgb);
      faces++;
    }
    if(faces<8000)throw new Error('Glasswing original vector trace is missing');
    return {buffer:new Float32Array(floats),triangles:faces};
  };
  const mount=async film=>{
    if (!film) return null;
    const image=film.querySelector('.gw-film-rig');
    if (!image) return null;
    let gl,canvas;
    try{
      canvas=document.createElement('canvas');
      gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:false});
      if(!gl) return null;
      const response=await fetch(DATA_URL,{cache:'force-cache'});
      if(!response.ok)throw new Error('Source-traced vector eagle unavailable');
      const mesh=buildMesh(await response.text());
      const prog=gl.createProgram();
      const vs=compile(gl,gl.VERTEX_SHADER,VS),fs=compile(gl,gl.FRAGMENT_SHADER,FS);
      gl.attachShader(prog,vs);gl.attachShader(prog,fs);gl.linkProgram(prog);
      if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,mesh.buffer,gl.STATIC_DRAW);
      const stride=5*4,position=gl.getAttribLocation(prog,'a_pos'),color=gl.getAttribLocation(prog,'a_color');
      gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,stride,0);
      gl.enableVertexAttribArray(color);gl.vertexAttribPointer(color,3,gl.FLOAT,false,stride,8);
      const time=gl.getUniformLocation(prog,'u_time'),motion=gl.getUniformLocation(prog,'u_motion');
      const density=Math.min(window.devicePixelRatio||1,1.7);
      canvas.width=Math.round(960*density);canvas.height=Math.round(502*density);
      canvas.className='gw-film-bird gw-film-rig gw-webgl-eagle';
      canvas.setAttribute('role','img');
      canvas.setAttribute('aria-label','Vectorized Glasswing eagle with genuinely flexing wings, neck and talons');
      image.replaceWith(canvas);
      gl.viewport(0,0,canvas.width,canvas.height);
      gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
      let playing=false,frame=0,started=0,raf=null;
      const draw=(now)=>{
        if(!playing)return;
        if(!started)started=now;
        gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform1f(time,(now-started)/1000);
        gl.uniform1f(motion,1.0);
        gl.drawArrays(gl.TRIANGLES,0,mesh.triangles*3);
        raf=requestAnimationFrame(draw);
      };
      const controller={
        start(){if(playing)return;playing=true;started=0;raf=requestAnimationFrame(draw);},
        stop(){playing=false;if(raf!==null)cancelAnimationFrame(raf);raf=null;started=0;},
        triangles:mesh.triangles
      };
      film.addEventListener('webglcontextlost',event=>{event.preventDefault();controller.stop();},{once:true});
      return controller;
    }catch(error){
      console.warn('Glasswing vector/WebGL fallback:',error.message);
      canvas?.remove();
      // The still source-traced SVG remains as a legitimate vector fallback.
      return null;
    }
  };
  window.GlasswingMeshRig={mount};
})();