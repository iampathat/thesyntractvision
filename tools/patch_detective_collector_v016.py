from pathlib import Path

p=Path('web/detective/index.html')
s=p.read_text(encoding='utf-8')

def rep(old,new,label):
    global s
    if old not in s:
        raise SystemExit(f'missing pattern: {label}')
    s=s.replace(old,new,1)

rep('.controlPill{appearance:none;cursor:pointer;font:inherit}.controlPill:hover{border-color:#67e8f9}',
    '.controlPill{appearance:none;cursor:pointer;font:inherit}.controlPill:hover{border-color:#67e8f9}.controlPill:disabled,.settingsBtn:disabled{opacity:.32;cursor:not-allowed;filter:saturate(.15);border-color:#475569;color:#64748b}',
    'disabled voice styling')

rep("let db,stream=null,recorder=null,audioChunks=[],cameraMode='photo',videoRecorder=null,videoChunks=[],filmAudioStream=null,activeSeries=null,",
    "let db,stream=null,recorder=null,audioChunks=[],cameraMode='photo',videoRecorder=null,videoChunks=[],filmAudioStream=null,resumeVoiceAfterCapture=false,activeSeries=null,",
    'voice resume state')

old_voice="function voiceUI(){el.voicePill.classList.toggle('on',voiceOn);el.voicePill.setAttribute('aria-pressed',String(voiceOn));el.voicePill.textContent=voiceOn?(awaitingSeriesTitle?'Säg serienamn…':'Röststyrning på'):'Röststyrning av'}"
new_voice="function voiceUI(){const captureBusy=!!videoRecorder||!!(recorder&&recorder.state==='recording');el.voicePill.disabled=captureBusy;el.voiceSettings.disabled=captureBusy;el.voicePill.classList.toggle('on',voiceOn&&!captureBusy);el.voicePill.setAttribute('aria-pressed',String(voiceOn&&!captureBusy));el.voicePill.textContent=captureBusy?'Röst pausad':voiceOn?(awaitingSeriesTitle?'Säg serienamn…':'Röststyrning på'):'Röststyrning av'}function pauseVoiceForCapture(){if(voiceOn){resumeVoiceAfterCapture=true;stopVoice(false)}voiceUI()}function restoreVoiceAfterCapture(){const resume=resumeVoiceAfterCapture;resumeVoiceAfterCapture=false;voiceUI();if(resume)setTimeout(startVoice,250)}"
rep(old_voice,new_voice,'voice UI capture lock')

old_cam="function cameraUI(){const on=!!stream,audioRecording=!!(recorder&&recorder.state==='recording'),busy=!!videoRecorder||audioRecording;el.cameraPill.textContent=on?'Kamera på':'Kamera av';el.cameraPill.classList.toggle('on',on);el.cameraPill.setAttribute('aria-pressed',String(on));el.cameraBox.classList.toggle('off',!on);el.shutter.disabled=cameraMode==='audio'?false:!on;el.photoMode.classList.toggle('on',cameraMode==='photo');el.filmMode.classList.toggle('on',cameraMode==='film');el.audioMode.classList.toggle('on',cameraMode==='audio');el.photoMode.disabled=busy;el.filmMode.disabled=busy;el.audioMode.disabled=busy;if(cameraMode==='photo')el.shutter.title='Ta foto';else if(cameraMode==='film')el.shutter.title=videoRecorder?'Stoppa film':'Starta film';else el.shutter.title=audioRecording?'Stoppa ljud':'Starta ljud';el.shutter.setAttribute('aria-label',el.shutter.title);el.shutter.classList.toggle('recording',!!videoRecorder||audioRecording)}"
new_cam="function cameraUI(){const on=!!stream,audioRecording=!!(recorder&&recorder.state==='recording'),busy=!!videoRecorder||audioRecording;el.cameraPill.textContent=on?'Kamera på':'Kamera av';el.cameraPill.classList.toggle('on',on);el.cameraPill.setAttribute('aria-pressed',String(on));el.cameraBox.classList.toggle('off',!on);el.shutter.disabled=cameraMode==='audio'?false:!on;el.photoMode.classList.toggle('on',cameraMode==='photo');el.filmMode.classList.toggle('on',cameraMode==='film');el.audioMode.classList.toggle('on',cameraMode==='audio');el.photoMode.disabled=busy;el.filmMode.disabled=busy;el.audioMode.disabled=busy;if(cameraMode==='photo')el.shutter.title='Ta foto';else if(cameraMode==='film')el.shutter.title=videoRecorder?'Stoppa film':'Starta film';else el.shutter.title=audioRecording?'Stoppa ljud':'Starta ljud';el.shutter.setAttribute('aria-label',el.shutter.title);el.shutter.classList.toggle('recording',!!videoRecorder||audioRecording);voiceUI()}"
rep(old_cam,new_cam,'camera UI voice sync')

rep("async function startFilm(){if(!stream){el.filmInput.click();return}try{let tracks=[...stream.getVideoTracks()];",
    "async function startFilm(){if(!stream){el.filmInput.click();return}pauseVoiceForCapture();try{let tracks=[...stream.getVideoTracks()];",
    'pause voice before film')

rep("videoRecorder=null;videoChunks=[];cameraUI();if(blob.size)queueIngest(blob,`film-${new Date().toISOString().replace(/[:.]/g,'-')}.webm`,'camera-film')};",
    "videoRecorder=null;videoChunks=[];cameraUI();restoreVoiceAfterCapture();if(blob.size)queueIngest(blob,`film-${new Date().toISOString().replace(/[:.]/g,'-')}.webm`,'camera-film')};",
    'restore voice after film')

rep("}catch(e){videoRecorder=null;cameraUI();status(`Kunde inte starta film: ${e.message}`)}}",
    "}catch(e){videoRecorder=null;cameraUI();restoreVoiceAfterCapture();status(`Kunde inte starta film: ${e.message}`)}}",
    'restore voice on film error')

rep("async function audioToggle(){if(recorder&&recorder.state==='recording'){recorder.stop();status('Ljudspåret avslutas och sparas…');return}try{const s=await navigator.mediaDevices.getUserMedia({audio:true});",
    "async function audioToggle(){if(recorder&&recorder.state==='recording'){recorder.stop();status('Ljudspåret avslutas och sparas…');return}pauseVoiceForCapture();try{const s=await navigator.mediaDevices.getUserMedia({audio:true});",
    'pause voice before audio')

rep("recorder=null;audioChunks=[];cameraUI();if(b.size)queueIngest(b,`ljud-${new Date().toISOString().replace(/[:.]/g,'-')}.webm`,'audio')};",
    "recorder=null;audioChunks=[];cameraUI();restoreVoiceAfterCapture();if(b.size)queueIngest(b,`ljud-${new Date().toISOString().replace(/[:.]/g,'-')}.webm`,'audio')};",
    'restore voice after audio')

rep("}catch(e){recorder=null;cameraUI();status(`Kunde inte spela in ljud: ${e.message}`)}}",
    "}catch(e){recorder=null;cameraUI();restoreVoiceAfterCapture();status(`Kunde inte spela in ljud: ${e.message}`)}}",
    'restore voice on audio error')

rep('Detective Collector v0.15 · full preview · foto/film/ljud · tydlig kamerastatus',
    'Detective Collector v0.16 · full preview · foto/film/ljud · röst pausas vid inspelning',
    'footer version')

p.write_text(s,encoding='utf-8')
print('Detective Collector v0.16 patched')
