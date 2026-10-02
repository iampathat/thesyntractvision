const $ = id => document.getElementById(id);
const video=$('video'),canvas=$('canvas'),cameraButton=$('cameraButton'),stopButton=$('stopButton'),
      lookButton=$('lookButton'),clearButton=$('clearButton'),cameraHint=$('cameraHint'),
      historyEl=$('history'),countEl=$('count'),leftMask=$('leftMask'),rightMask=$('rightMask');

const LABELS=['bright','dark','red','green','blue','contrast','edge','change'];
const DB_NAME='qgen-first-sense';
const DB_VERSION=1;
const STORE='states';

let stream=null, states=[], previousEyes=null, db=null, emptyEl=null;

function renderMask(el, values){
  el.innerHTML=LABELS.map((label,i)=>{
    const v=values?.[i] ?? '?';
    const cls=v===1?'yes':v===0?'no':'unknown';
    return `<div class="bit ${cls}"><b>${v}</b><span>${label}</span></div>`;
  }).join('');
}

function showEmpty(){
  historyEl.innerHTML='<div id="empty" class="empty">Press LOOK. The first observed state will appear here.</div>';
  emptyEl=$('empty');
}
renderMask(leftMask);
renderMask(rightMask);

function openDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{
      const database=req.result;
      if(!database.objectStoreNames.contains(STORE)){
        database.createObjectStore(STORE,{keyPath:'id'});
      }
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}

function dbGetAll(){
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readonly');
    const req=tx.objectStore(STORE).getAll();
    req.onsuccess=()=>resolve(req.result.sort((a,b)=>a.id-b.id));
    req.onerror=()=>reject(req.error);
  });
}

function dbPut(record){
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).put(record);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
}

function dbClear(){
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
}

async function startCamera(){
  try{
    stopCamera(false);
    stream=await navigator.mediaDevices.getUserMedia({
      video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:960}},
      audio:false
    });
    video.srcObject=stream;
    await video.play();
    cameraHint.textContent='Ready. One press = one Sense State.';
    cameraButton.textContent='RESTART CAMERA';
    stopButton.disabled=false;
    lookButton.disabled=false;
  }catch(err){
    cameraHint.textContent='Camera permission is required.';
    stopButton.disabled=true;
    lookButton.disabled=true;
    console.error(err);
  }
}

function stopCamera(showStatus=true){
  if(stream){
    stream.getTracks().forEach(t=>t.stop());
    stream=null;
  }
  video.srcObject=null;
  cameraButton.textContent='START CAMERA';
  stopButton.disabled=true;
  lookButton.disabled=true;
  if(showStatus) cameraHint.textContent='Camera stopped. Stored Sense States remain.';
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
    for(let i=0;i<m;i+=step*4){
      change+=Math.abs(data[i]-prev[i])+Math.abs(data[i+1]-prev[i+1])+Math.abs(data[i+2]-prev[i+2]);
      changeN+=3;
    }
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

function analyzeRegion(ctx,x,w,h,prev){
  const img=ctx.getImageData(x,0,w,h);
  return {values:stats(img.data,w,h,prev?.data),data:new Uint8ClampedArray(img.data)};
}

function eyeRegions(width){
  const oneThird=Math.floor(width/3);
  const twoThird=Math.floor((width*2)/3);
  return {
    left:{x:0,w:twoThird},
    overlap:{x:oneThird,w:twoThird-oneThird},
    right:{x:oneThird,w:width-oneThird}
  };
}

function mini(values){
  return values.map((v,i)=>`
    <div class="miniBit ${v===1?'yes':v==='?'?'unknown':''}">
      <span class="miniValue">${v}</span>
      <span class="miniLabel">${LABELS[i]}</span>
    </div>`).join('');
}

function stateRow(record){
  const row=document.createElement('article');
  row.className='stateRow';
  const url=URL.createObjectURL(record.image);
  row.dataset.objectUrl=url;
  const time=new Date(record.time);
  row.innerHTML=`
    <div class="stateVision">
      <img class="stateImage" src="${url}" alt="Sense State ${record.id}">
      <div class="visionZones" aria-hidden="true">
        <div class="visionZone"><span>LEFT FIELD</span></div>
        <div class="visionZone both"><span>SHARED CENTER</span></div>
        <div class="visionZone"><span>RIGHT FIELD</span></div>
      </div>
    </div>
    <div class="stateMeta">
      <div class="stateTitle"><span>SENSE STATE ${String(record.id).padStart(3,'0')}</span><time>${time.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})}</time></div>
      <div class="stateEyes">
        <div class="eyePanel">
          <div class="eyeName">LEFT EYE</div>
          <div class="eyeExplain">sees <strong>LEFT FIELD</strong> + <strong>SHARED CENTER</strong></div>
          <div class="miniMask">${mini(record.left)}</div>
        </div>
        <div class="eyePanel">
          <div class="eyeName">RIGHT EYE</div>
          <div class="eyeExplain">sees <strong>SHARED CENTER</strong> + <strong>RIGHT FIELD</strong></div>
          <div class="miniMask">${mini(record.right)}</div>
        </div>
      </div>
    </div>`;
  return row;
}

function revokeRows(){
  historyEl.querySelectorAll('[data-object-url]').forEach(row=>{
    const url=row.dataset.objectUrl;
    if(url) URL.revokeObjectURL(url);
  });
}

function updateCount(){
  countEl.textContent=`${states.length} state${states.length===1?'':'s'}`;
}

function renderHistory(){
  revokeRows();
  historyEl.innerHTML='';
  if(!states.length){
    showEmpty();
    updateCount();
    return;
  }
  [...states].reverse().forEach(record=>historyEl.appendChild(stateRow(record)));
  updateCount();
}

function canvasBlob(type='image/jpeg',quality=.82){
  return new Promise(resolve=>canvas.toBlob(resolve,type,quality));
}

async function restorePreviousEyesFromLastState(){
  const last=states.at(-1);
  if(!last?.image){previousEyes=null;return}
  try{
    const bitmap=await createImageBitmap(last.image);
    const maxW=720,scale=Math.min(1,maxW/bitmap.width);
    const w=Math.round(bitmap.width*scale),h=Math.round(bitmap.height*scale);
    const c=document.createElement('canvas');
    c.width=w;c.height=h;
    const ctx=c.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(bitmap,0,0,w,h);
    bitmap.close?.();
    const regions=eyeRegions(w);
    const li=ctx.getImageData(regions.left.x,0,regions.left.w,h);
    const ri=ctx.getImageData(regions.right.x,0,regions.right.w,h);
    previousEyes={
      left:{data:new Uint8ClampedArray(li.data)},
      right:{data:new Uint8ClampedArray(ri.data)}
    };
    renderMask(leftMask,last.left);
    renderMask(rightMask,last.right);
  }catch(err){
    previousEyes=null;
    console.warn('Could not restore previous Sense State pixels',err);
  }
}

async function look(){
  if(!stream||!video.videoWidth) return;
  lookButton.disabled=true;
  try{
    const maxW=720, scale=Math.min(1,maxW/video.videoWidth);
    canvas.width=Math.round(video.videoWidth*scale);
    canvas.height=Math.round(video.videoHeight*scale);
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(video,0,0,canvas.width,canvas.height);
    const regions=eyeRegions(canvas.width);
    const left=analyzeRegion(ctx,regions.left.x,regions.left.w,canvas.height,previousEyes?.left);
    const right=analyzeRegion(ctx,regions.right.x,regions.right.w,canvas.height,previousEyes?.right);
    const image=await canvasBlob();
    if(!image) throw new Error('Could not create image');

    const id=(states.at(-1)?.id ?? 0)+1;
    const record={
      id,
      time:new Date().toISOString(),
      image,
      left:left.values,
      right:right.values,
      visionLayout:'LEFT | BOTH | RIGHT',
      overlap:'middle-third-shared'
    };
    await dbPut(record);
    states.push(record);
    previousEyes={left,right};
    renderMask(leftMask,left.values);
    renderMask(rightMask,right.values);
    renderHistory();
    cameraHint.textContent=`Sense State ${String(id).padStart(3,'0')} captured and stored locally.`;
  }catch(err){
    cameraHint.textContent='Could not store this Sense State.';
    console.error(err);
  }finally{
    lookButton.disabled=!stream;
  }
}

async function clearHistory(){
  try{
    await dbClear();
    states=[];
    previousEyes=null;
    renderMask(leftMask);
    renderMask(rightMask);
    renderHistory();
    cameraHint.textContent=stream?'Local history cleared. Camera is ready.':'Local history cleared. Camera is off.';
  }catch(err){
    cameraHint.textContent='Could not clear local history.';
    console.error(err);
  }
}

async function boot(){
  showEmpty();
  try{
    db=await openDB();
    states=await dbGetAll();
    renderHistory();
    await restorePreviousEyesFromLastState();
    if(states.length){
      cameraHint.textContent=`${states.length} stored Sense State${states.length===1?'':'s'} restored. Camera is off.`;
    }
  }catch(err){
    cameraHint.textContent='Local storage could not be opened. Camera is off.';
    console.error(err);
  }
}

cameraButton.addEventListener('click',startCamera);
stopButton.addEventListener('click',()=>stopCamera(true));
lookButton.addEventListener('click',look);
clearButton.addEventListener('click',clearHistory);
window.addEventListener('beforeunload',()=>stopCamera(false));
document.addEventListener('visibilitychange',()=>{
  if(document.hidden && stream) cameraHint.textContent='Camera paused by browser while hidden.';
});
boot();
