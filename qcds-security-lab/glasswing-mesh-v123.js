/* Project Glasswing v1.23 — a single original eagle with continuously attached anatomically moving geometry.
   Theory and creation by Patrik Sundblom.
   with OpenAI / ChatGPT as research & development support.

   This is NOT a sprite animation: triangles are traced from the approved eagle.
   A continuous vertex-deformation field animates every shared boundary identically,
   so no wing cutlines, sliced bitmap sections, duplicate bodies, or backdrops.
*/
(() => {
  'use strict';
  const DATA_URL = './glasswing-original-traced-v122.svg?v=1.23.0';
  const VS = `
  attribute vec2 a_pos;
  attribute vec3 a_color;
  uniform float u_time;
  uniform float u_motion;
  varying vec3 v_color;
  varying float v_glow;
  void main() {
    vec2 source = a_pos;
    vec2 pos = source;
    float phase = u_time * 5.65;
    float beat = sin(phase);
    // Smooth skeletal influence anchored at each shoulder: no separate sprites,
    // no abrupt rotation fields, and zero motion at the wing attachment.
    float wingMask = 1.0 - smoothstep(325.0,415.0,source.y);
    float leftTip = 1.0 - smoothstep(84.0,492.0,source.x);
    float rightTip = smoothstep(584.0,933.0,source.x);
    float left = wingMask * leftTip * u_motion;
    float right = wingMask * rightTip * u_motion;
    // Visible actual wingbeats while the original geometry stays connected.
    float lPhase = sin(phase - leftTip * .55);
    float rPhase = sin(phase - rightTip * .51 + .10);
    pos.y -= 44.0*lPhase*left + 43.0*rPhase*right;
    pos.x += 7.0*beat*(left-right);
    // Head/neck nod: gaussian influence cannot break its connection to body.
    vec2 hd=(source-vec2(523.0,311.0))/vec2(91.0,109.0);
    float headWeight=exp(-dot(hd,hd)*2.55)*u_motion;
    pos += headWeight*vec2(2.0*sin(u_time*2.35),2.7*cos(u_time*2.02));
    // Independent small talon curls, smoothly blended into each leg.
    vec2 dl=(source-vec2(435.0,413.0))/vec2(51.0,67.0);
    vec2 dr=(source-vec2(558.0,435.0))/vec2(56.0,70.0);
    float wl=exp(-dot(dl,dl)*2.6)*u_motion;
    float wr=exp(-dot(dr,dr)*2.6)*u_motion;
    pos.x += 2.0*sin(phase+.6)*wl - 2.2*sin(phase+2.4)*wr;
    pos.y += 1.6*cos(phase+.6)*wl + 1.5*cos(phase+2.4)*wr;
    gl_Position=vec4(pos.x/480.0-1.0,1.0-pos.y/251.0,0.0,1.0);
    v_color=a_color;
    v_glow=u_motion*(.5+.5*sin(u_time*4.1+source.x*.02));
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
      const density=Math.min(window.devicePixelRatio||1,1.6);
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
      console.warn('Glasswing articulated-vector fallback:',error.message);
      canvas?.remove();
      // The still source-traced SVG remains as a legitimate vector fallback.
      return null;
    }
  };
  window.GlasswingMeshRig={mount};
})();