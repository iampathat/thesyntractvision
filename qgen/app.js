const $ = id => document.getElementById(id);
const video=$('video'),canvas=$('canvas'),cameraButton=$('cameraButton'),lookButton=$('lookButton'),
      cameraHint=$('cameraHint'),historyEl=$('history'),empty=$('empty'),countEl=$('count'),
      leftMask=$('leftMask'),rightMask=$('rightMask');

const LABELS=['bright','dark','red','green','blue','contrast','edge','change'];
let stream=null, states=[], previousEyes=null;

function renderMask(el, values){
  el.innerHTML=LABELS.map((label,i)=>{
    const v=values?.[i] ?? '?';
    const cls=v===1?'yes':v===0?'no':'unknown';
    return `<div class="bit ${cls}"><b>${v}</b><span>${label}</span></div>`;
  }).join('');
}
renderMask(leftMask); renderMask(rightMask);

async function startCamera(){
  try{
    if(stream) stream.getTracks().forEach(t=>t.stop());
    stream=await navigator.mediaDevices.getUserMedia({
      video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:960}},
      audio:false
    });
    video.srcObject=stream;
    await video.play();
    cameraHint.textContent='Ready. One press = one Sense State.';
    cameraButton.textContent='RESTART CAMERA';
    lookButton.disabled=false;
  }catch(err){
    cameraHint.textContent='Camera permission is required.';
    lookButton.disabled=true;
    console.error(err);
  }
}

function stats(data,w,h,prev){
  let r=0,g=0,b=0,l=0,l2=0,edges=0,n=0,change=0,changeN=0;
  const step=4;
  for(let y=0;y<h;y+=step){
    for(let x=0;x<w;x+=step){
      const i=(y*w+x)*4, R=data[i],G=data[i+1],B=data[i+2];
      const Y=(R+G+B)/3;
      r+=R;g+=G;b+=B;l+=Y;l2+=Y*Y;n++;
      if(x+step<w){
        const j=(y*w+x+step)*4;
        edges+=Math.abs(Y-(data[j]+data[j+1]+data[j+2])/3);
      }
    }
  }
  r/=n;g/=n;b/=n;l/=n;
  const variance=Math.max(0,l2/n-l*l), sd=Math.sqrt(variance), edge=edges/n;
  if(prev){
    const m=Math.min(prev.length,data.length);
    for(let i=0;i<m;i+=step*4){change+=Math.abs(data[i]-prev[i])+Math.abs(data[i+1]-prev[i+1])+Math.abs(data[i+2]-prev[i+2]);changeN+=3}
    change=changeN?change/changeN:0;
  }
  return [
    l>135?1:0,
    l<80?1:0,
    r>g*1.08&&r>b*1.08?1:0,
    g>r*1.08&&g>b*1.08?1:0,
    b>r*1.08&&b>g*1.08?1:0,
    sd>52?1:0,
    edge>22?1:0,
    prev?(change>18?1:0):'?'
  ];
}

function analyzeHalf(ctx,x,w,h,prev){
  const img=ctx.getImageData(x,0,w,h);
  return {values:stats(img.data,w,h,prev?.data),data:new Uint8ClampedArray(img.data)};
}

function mini(values){
  return values.map(v=>`<div class="miniBit ${v===1?'yes':v==='?'?'unknown':''}">${v}</div>`).join('');
}

function addState(imageUrl,left,right){
  const id=states.length+1, now=new Date();
  const row=document.createElement('article');
  row.className='stateRow';
  row.innerHTML=`
    <img class="stateImage" src="${imageUrl}" alt="Sense State ${id}">
    <div class="stateMeta">
      <div class="stateTitle"><span>SENSE STATE ${String(id).padStart(3,'0')}</span><time>${now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})}</time></div>
      <div class="stateEyes">
        <div><div class="eyeName">LEFT EYE · 8</div><div class="miniMask">${mini(left)}</div></div>
        <div><div class="eyeName">RIGHT EYE · 8</div><div class="miniMask">${mini(right)}</div></div>
      </div>
    </div>`;
  if(empty?.isConnected) empty.remove();
  historyEl.prepend(row);
  states.push({id,time:now.toISOString(),left,right});
  countEl.textContent=`${states.length} state${states.length===1?'':'s'}`;
}

function look(){
  if(!stream||!video.videoWidth) return;
  const maxW=720, scale=Math.min(1,maxW/video.videoWidth);
  canvas.width=Math.round(video.videoWidth*scale);
  canvas.height=Math.round(video.videoHeight*scale);
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(video,0,0,canvas.width,canvas.height);
  const half=Math.floor(canvas.width/2);
  const left=analyzeHalf(ctx,0,half,canvas.height,previousEyes?.left);
  const right=analyzeHalf(ctx,half,canvas.width-half,canvas.height,previousEyes?.right);
  const url=canvas.toDataURL('image/jpeg',0.82);
  renderMask(leftMask,left.values); renderMask(rightMask,right.values);
  addState(url,left.values,right.values);
  previousEyes={left,right};
  cameraHint.textContent=`Sense State ${String(states.length).padStart(3,'0')} captured.`;
}

cameraButton.addEventListener('click',startCamera);
lookButton.addEventListener('click',look);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden && stream) cameraHint.textContent='Camera paused by browser while hidden.';
});
