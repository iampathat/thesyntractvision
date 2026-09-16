from pathlib import Path

p = Path('web/detective/index.html')
s = p.read_text(encoding='utf-8')

def rep(old, new, label):
    global s
    if old not in s:
        raise SystemExit(f'missing pattern: {label}')
    s = s.replace(old, new, 1)

rep('<div class="modeSwitch"><button id="photoModeBtn" class="modeBtn on" type="button">Foto</button><button id="filmModeBtn" class="modeBtn" type="button">Film</button></div>',
    '<div class="modeSwitch"><button id="photoModeBtn" class="modeBtn on" type="button">Foto</button><button id="filmModeBtn" class="modeBtn" type="button">Film</button><button id="audioModeBtn" class="modeBtn" type="button">Ljud</button></div>',
    'three capture modes')

rep('<div class="row"><button id="fileBtn" class="btn">Lägg till filer</button><button id="audioBtn" class="btn">🎙 Spela in ljudspår</button></div>',
    '<div class="row"><button id="fileBtn" class="btn">Lägg till filer</button></div>',
    'remove duplicate audio button')

rep("photoMode:$('photoModeBtn'),filmMode:$('filmModeBtn'),voicePill:",
    "photoMode:$('photoModeBtn'),filmMode:$('filmModeBtn'),audioMode:$('audioModeBtn'),voicePill:",
    'audio mode element')
rep("filmInput:$('filmInput'),audio:$('audioBtn'),status:",
    "filmInput:$('filmInput'),status:",
    'remove audio button element')

rep("if(source==='camera-film')name=`${a.name} · film ${pageNo}`", 
    "if(source==='camera-film')name=`${a.name} · film ${pageNo}`;if(source==='audio')name=`${a.name} · ljud ${pageNo}`",
    'series audio naming')

old_camera = "function cameraUI(){const on=!!stream;el.cameraPill.textContent=on?'Kamera på':'Kamera av';el.cameraPill.classList.toggle('on',on);el.cameraPill.setAttribute('aria-pressed',String(on));el.cameraBox.classList.toggle('off',!on);el.shutter.disabled=!on;el.photoMode.classList.toggle('on',cameraMode==='photo');el.filmMode.classList.toggle('on',cameraMode==='film');el.photoMode.disabled=!!videoRecorder;el.filmMode.disabled=!!videoRecorder;el.shutter.title=cameraMode==='photo'?'Ta foto':videoRecorder?'Stoppa film':'Starta film';el.shutter.setAttribute('aria-label',el.shutter.title);el.shutter.classList.toggle('recording',!!videoRecorder)}"
new_camera = "function cameraUI(){const on=!!stream,audioRecording=!!(recorder&&recorder.state==='recording'),busy=!!videoRecorder||audioRecording;el.cameraPill.textContent=on?'Kamera på':'Kamera av';el.cameraPill.classList.toggle('on',on);el.cameraPill.setAttribute('aria-pressed',String(on));el.cameraBox.classList.toggle('off',!on);el.shutter.disabled=cameraMode==='audio'?false:!on;el.photoMode.classList.toggle('on',cameraMode==='photo');el.filmMode.classList.toggle('on',cameraMode==='film');el.audioMode.classList.toggle('on',cameraMode==='audio');el.photoMode.disabled=busy;el.filmMode.disabled=busy;el.audioMode.disabled=busy;if(cameraMode==='photo')el.shutter.title='Ta foto';else if(cameraMode==='film')el.shutter.title=videoRecorder?'Stoppa film':'Starta film';else el.shutter.title=audioRecording?'Stoppa ljud':'Starta ljud';el.shutter.setAttribute('aria-label',el.shutter.title);el.shutter.classList.toggle('recording',!!videoRecorder||audioRecording)}"
rep(old_camera, new_camera, 'cameraUI')

rep("function setCameraMode(mode){if(videoRecorder)return;cameraMode=mode==='film'?'film':'photo';cameraUI();status(cameraMode==='photo'?'Fotoläge.':'Filmläge. Tryck på slutaren för start/stop.')}",
    "function setCameraMode(mode){if(videoRecorder||(recorder&&recorder.state==='recording'))return;cameraMode=['photo','film','audio'].includes(mode)?mode:'photo';cameraUI();status(cameraMode==='photo'?'Fotoläge.':cameraMode==='film'?'Filmläge. Tryck på slutaren för start/stop.':'Ljudläge. Tryck på slutaren för start/stop. Kameran behöver inte vara på.')}",
    'set capture mode')

rep("function shutterAction(){cameraMode==='film'?(videoRecorder?stopFilm():startFilm()):capturePhoto()}",
    "function shutterAction(){if(cameraMode==='film')return videoRecorder?stopFilm():startFilm();if(cameraMode==='audio')return audioToggle();capturePhoto()}",
    'shutter action')

old_audio = "async function audioToggle(){if(recorder&&recorder.state==='recording'){recorder.stop();return}try{const s=await navigator.mediaDevices.getUserMedia({audio:true});audioChunks=[];recorder=new MediaRecorder(s);recorder.ondataavailable=e=>{if(e.data.size)audioChunks.push(e.data)};recorder.onstop=()=>{const b=new Blob(audioChunks,{type:recorder.mimeType||'audio/webm'});queueIngest(b,`ljud-${new Date().toISOString().replace(/[:.]/g,'-')}.webm`,'audio');s.getTracks().forEach(t=>t.stop());el.audio.textContent='🎙 Spela in ljudspår'};recorder.start();el.audio.textContent='■ Stoppa ljudspår';status('Ljudinspelning pågår…')}catch(e){status(`Kunde inte spela in ljud: ${e.message}`)}}"
new_audio = "async function audioToggle(){if(recorder&&recorder.state==='recording'){recorder.stop();status('Ljudspåret avslutas och sparas…');return}try{const s=await navigator.mediaDevices.getUserMedia({audio:true});audioChunks=[];recorder=new MediaRecorder(s);recorder.ondataavailable=e=>{if(e.data.size)audioChunks.push(e.data)};recorder.onstop=()=>{const type=recorder?.mimeType||'audio/webm',b=new Blob(audioChunks,{type});s.getTracks().forEach(t=>t.stop());recorder=null;audioChunks=[];cameraUI();if(b.size)queueIngest(b,`ljud-${new Date().toISOString().replace(/[:.]/g,'-')}.webm`,'audio')};recorder.start();cameraUI();status('Ljudinspelning pågår… Tryck på avtryckaren igen för att stoppa.')}catch(e){recorder=null;cameraUI();status(`Kunde inte spela in ljud: ${e.message}`)}}"
rep(old_audio, new_audio, 'audio toggle')

rep("el.cameraPill.onclick=toggleCamera;el.shutter.onclick=shutterAction;el.photoMode.onclick=()=>setCameraMode('photo');el.filmMode.onclick=()=>setCameraMode('film');el.voicePill.onclick=toggleVoice;",
    "el.cameraPill.onclick=toggleCamera;el.shutter.onclick=shutterAction;el.photoMode.onclick=()=>setCameraMode('photo');el.filmMode.onclick=()=>setCameraMode('film');el.audioMode.onclick=()=>setCameraMode('audio');el.voicePill.onclick=toggleVoice;",
    'audio mode binding')
rep(";el.audio.onclick=audioToggle;el.series.onkeydown", ";el.series.onkeydown", 'remove old audio button binding')

rep('Detective Collector v0.14 · full preview · foto/film · tydlig kamerastatus',
    'Detective Collector v0.15 · full preview · foto/film/ljud · tydlig kamerastatus',
    'footer version')
rep("status('Redo. Kamera och röststyrning slås av/på uppe till höger. Avtryckaren används bara för Foto/Film.')",
    "status('Redo. Välj Foto, Film eller Ljud uppe till höger. Samma avtryckare används för valt läge.')",
    'ready message')

p.write_text(s, encoding='utf-8')
print('Detective Collector v0.15 patched')
