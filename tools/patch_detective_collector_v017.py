from pathlib import Path

p=Path('web/detective/index.html')
s=p.read_text(encoding='utf-8')

def rep(old,new,label):
    global s
    if old not in s:
        raise SystemExit(f'missing pattern: {label}')
    s=s.replace(old,new,1)

rep('.controlPill:disabled,.settingsBtn:disabled{opacity:.32;cursor:not-allowed;filter:saturate(.15);border-color:#475569;color:#64748b}',
    '.controlPill:disabled,.settingsBtn:disabled{opacity:.32;cursor:not-allowed;filter:saturate(.15);border-color:#475569;color:#64748b}.voicePill.forcedOff:disabled{opacity:1;filter:none;border-color:#22d3ee;background:#083344;color:#cffafe;box-shadow:0 0 0 1px #22d3ee33 inset}',
    'forced off voice highlight')

rep("let db,stream=null,recorder=null,audioChunks=[],cameraMode='photo',videoRecorder=null,videoChunks=[],filmAudioStream=null,resumeVoiceAfterCapture=false,activeSeries=null,",
    "let db,stream=null,recorder=null,audioChunks=[],cameraMode='photo',videoRecorder=null,videoChunks=[],filmAudioStream=null,resumeVoiceAfterCapture=false,photoVoiceOn=false,activeSeries=null,",
    'photo voice state')

old_mode="function setCameraMode(mode){if(videoRecorder||(recorder&&recorder.state==='recording'))return;cameraMode=['photo','film','audio'].includes(mode)?mode:'photo';cameraUI();status(cameraMode==='photo'?'Fotoläge.':cameraMode==='film'?'Filmläge. Tryck på slutaren för start/stop.':'Ljudläge. Tryck på slutaren för start/stop. Kameran behöver inte vara på.')}"
new_mode="function setCameraMode(mode){if(videoRecorder||(recorder&&recorder.state==='recording'))return;const next=['photo','film','audio'].includes(mode)?mode:'photo';if(next===cameraMode){cameraUI();return}if(cameraMode==='photo')photoVoiceOn=voiceOn;cameraMode=next;if(cameraMode!=='photo'&&voiceOn)stopVoice(false);cameraUI();if(cameraMode==='photo'&&photoVoiceOn&&!voiceOn)startVoice();status(cameraMode==='photo'?'Fotoläge. Senaste röstläget för Foto är återställt.':cameraMode==='film'?'Filmläge. Röststyrning är av i detta läge.':'Ljudläge. Röststyrning är av i detta läge. Kameran behöver inte vara på.')}"
rep(old_mode,new_mode,'mode voice memory')

old_voice="function voiceUI(){const captureBusy=!!videoRecorder||!!(recorder&&recorder.state==='recording');el.voicePill.disabled=captureBusy;el.voiceSettings.disabled=captureBusy;el.voicePill.classList.toggle('on',voiceOn&&!captureBusy);el.voicePill.setAttribute('aria-pressed',String(voiceOn&&!captureBusy));el.voicePill.textContent=captureBusy?'Röst pausad':voiceOn?(awaitingSeriesTitle?'Säg serienamn…':'Röststyrning på'):'Röststyrning av'}function pauseVoiceForCapture(){if(voiceOn){resumeVoiceAfterCapture=true;stopVoice(false)}voiceUI()}function restoreVoiceAfterCapture(){const resume=resumeVoiceAfterCapture;resumeVoiceAfterCapture=false;voiceUI();if(resume)setTimeout(startVoice,250)}"
new_voice="function voiceUI(){const captureBusy=!!videoRecorder||!!(recorder&&recorder.state==='recording'),forcedOff=cameraMode!=='photo';el.voicePill.disabled=forcedOff||captureBusy;el.voiceSettings.disabled=captureBusy;el.voicePill.classList.toggle('on',voiceOn&&!forcedOff&&!captureBusy);el.voicePill.classList.toggle('forcedOff',forcedOff);el.voicePill.setAttribute('aria-pressed',String(voiceOn&&!forcedOff&&!captureBusy));el.voicePill.textContent=forcedOff?'Röststyrning av':voiceOn?(awaitingSeriesTitle?'Säg serienamn…':'Röststyrning på'):'Röststyrning av'}function pauseVoiceForCapture(){if(voiceOn){resumeVoiceAfterCapture=true;stopVoice(false)}voiceUI()}function restoreVoiceAfterCapture(){const resume=resumeVoiceAfterCapture;resumeVoiceAfterCapture=false;voiceUI();if(resume&&cameraMode==='photo')setTimeout(startVoice,250)}"
rep(old_voice,new_voice,'forced off voice UI')

rep("function startVoice(){if(!voiceSupported())", "function startVoice(){if(cameraMode!=='photo'){voiceUI();return}if(!voiceSupported())", 'voice only in photo')

old_stop="function stopVoice(show=true){voiceOn=false;awaitingSeriesTitle=false;voiceUI();try{recognition?.stop()}catch{}if(show)status('Röststyrning av.')}function toggleVoice(){voiceOn?stopVoice():startVoice()}"
new_stop="function stopVoice(show=true){voiceOn=false;if(cameraMode==='photo')photoVoiceOn=false;awaitingSeriesTitle=false;voiceUI();try{recognition?.stop()}catch{}if(show)status('Röststyrning av.')}function toggleVoice(){if(cameraMode!=='photo')return;voiceOn?stopVoice():startVoice()}"
rep(old_stop,new_stop,'photo voice toggle memory')

rep("voiceOn=true;voiceUI();try{recognition.start();", "voiceOn=true;if(cameraMode==='photo')photoVoiceOn=true;voiceUI();try{recognition.start();", 'remember photo voice on')

rep('Detective Collector v0.16 · full preview · foto/film/ljud · röst pausas vid inspelning',
    'Detective Collector v0.17 · foto/film/ljud · röstläge minns Foto · röst av i Film/Ljud',
    'footer version')

p.write_text(s,encoding='utf-8')
print('Detective Collector v0.17 patched')
