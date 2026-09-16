from pathlib import Path

p = Path('web/detective/index.html')
s = p.read_text()

def rep(old, new, label):
    global s
    if old not in s:
        raise SystemExit(f'Missing patch target: {label}')
    s = s.replace(old, new, 1)

rep(
    '.cameraStatus{margin-left:auto;display:flex;gap:6px;min-width:0;pointer-events:auto}.pill{',
    '.cameraStatus{margin-left:auto;display:flex;gap:6px;min-width:0;pointer-events:auto;align-items:center}.controlPill{appearance:none;cursor:pointer;font:inherit}.controlPill:hover{border-color:#67e8f9}.pill{',
    'clickable top controls css'
)
rep(
    '.cameraDock{position:absolute;left:10px;right:10px;bottom:10px;z-index:6;display:grid;grid-template-columns:1fr 84px 1fr;gap:8px;align-items:center;padding:8px;border:1px solid #94a3b838;border-radius:22px;background:#020812e2;backdrop-filter:blur(10px)}',
    '.cameraDock{position:absolute;left:50%;right:auto;bottom:14px;transform:translateX(-50%);z-index:6;display:flex;align-items:center;justify-content:center;padding:8px;border:1px solid #94a3b838;border-radius:999px;background:#020812e2;backdrop-filter:blur(10px)}',
    'single shutter dock css'
)
rep(
    '.settingsBtn{position:absolute;right:9px;top:-39px;width:34px;height:34px;border:1px solid #36516c;border-radius:50%;background:#020812e6;color:#dbeafe;cursor:pointer}',
    '.settingsBtn{position:static;flex:0 0 auto;width:30px;height:30px;border:1px solid #36516c;border-radius:50%;background:#020812e6;color:#dbeafe;cursor:pointer;padding:0;display:grid;place-items:center;font-size:.78rem}',
    'voice settings css'
)
rep(
    '@media(max-width:540px){.wrap{padding-left:8px;padding-right:8px}.card{border-radius:18px;padding:10px}.camera{height:min(58vh,560px);min-height:0;max-height:58vh;aspect-ratio:auto}.cameraDock{grid-template-columns:1fr 86px 1fr}',
    '@media(max-width:540px){.wrap{padding-left:8px;padding-right:8px}.card{border-radius:18px;padding:10px}.camera{height:min(58vh,560px);min-height:0;max-height:58vh;aspect-ratio:auto}.cameraDock{left:50%;right:auto;display:flex}',
    'mobile dock css'
)

old = '<div class="cameraTop"><span id="cameraSeriesPill" class="pill">Ingen aktiv serie</span><div class="cameraStatus"><span id="cameraPill" class="pill cameraPill">Kamera av</span><span id="voicePill" class="pill voicePill">Röst av</span><div class="modeSwitch"><button id="photoModeBtn" class="modeBtn on" type="button">Foto</button><button id="filmModeBtn" class="modeBtn" type="button">Film</button></div></div></div><div class="cameraDock"><button id="cameraBtn" class="camBtn">Kamera</button><button id="shutterBtn" class="shutter" aria-label="Fota" title="Fota" disabled></button><button id="voiceBtn" class="camBtn">🎙 Röst</button><button id="voiceSettingsBtn" class="settingsBtn" aria-label="Röstinställningar" title="Röstinställningar">⚙</button></div>'
new = '<div class="cameraTop"><span id="cameraSeriesPill" class="pill">Ingen aktiv serie</span><div class="cameraStatus"><button id="cameraPill" class="pill cameraPill controlPill" type="button" title="Slå kameran av eller på">Kamera av</button><button id="voicePill" class="pill voicePill controlPill" type="button" title="Slå röststyrning av eller på">Röststyrning av</button><button id="voiceSettingsBtn" class="settingsBtn" type="button" aria-label="Röstkommandon" title="Röstkommandon">⚙</button><div class="modeSwitch"><button id="photoModeBtn" class="modeBtn on" type="button">Foto</button><button id="filmModeBtn" class="modeBtn" type="button">Film</button></div></div></div><div class="cameraDock"><button id="shutterBtn" class="shutter" aria-label="Fota" title="Fota" disabled></button></div>'
rep(old, new, 'camera controls html')
rep('<button id="audioBtn" class="btn">Spela in ljud</button>', '<button id="audioBtn" class="btn">🎙 Spela in ljudspår</button>', 'audio label')

rep("camera:$('cameraBtn'),cameraPill:$('cameraPill'),", "cameraPill:$('cameraPill'),", 'camera element map')
rep("voice:$('voiceBtn'),voicePill:$('voicePill'),", "voicePill:$('voicePill'),", 'voice element map')

old_camera_ui = "function cameraUI(){const on=!!stream;el.cameraPill.textContent=on?'Kamera på':'Kamera av';el.cameraPill.classList.toggle('on',on);el.camera.classList.toggle('on',on);el.camera.textContent='Kamera';el.cameraBox.classList.toggle('off',!on);el.shutter.disabled=!on;el.photoMode.classList.toggle('on',cameraMode==='photo');el.filmMode.classList.toggle('on',cameraMode==='film');el.photoMode.disabled=!!videoRecorder;el.filmMode.disabled=!!videoRecorder;el.shutter.title=cameraMode==='photo'?'Ta foto':videoRecorder?'Stoppa film':'Starta film';el.shutter.setAttribute('aria-label',el.shutter.title);el.shutter.classList.toggle('recording',!!videoRecorder)}"
new_camera_ui = "function cameraUI(){const on=!!stream;el.cameraPill.textContent=on?'Kamera på':'Kamera av';el.cameraPill.classList.toggle('on',on);el.cameraPill.setAttribute('aria-pressed',String(on));el.cameraBox.classList.toggle('off',!on);el.shutter.disabled=!on;el.photoMode.classList.toggle('on',cameraMode==='photo');el.filmMode.classList.toggle('on',cameraMode==='film');el.photoMode.disabled=!!videoRecorder;el.filmMode.disabled=!!videoRecorder;el.shutter.title=cameraMode==='photo'?'Ta foto':videoRecorder?'Stoppa film':'Starta film';el.shutter.setAttribute('aria-label',el.shutter.title);el.shutter.classList.toggle('recording',!!videoRecorder)}"
rep(old_camera_ui, new_camera_ui, 'camera ui')

old_voice_ui = "function voiceUI(){el.voice.classList.toggle('on',voiceOn);el.voicePill.classList.toggle('on',voiceOn);el.voice.textContent=voiceOn?'🎙 Röst på':'🎙 Röst';el.voicePill.textContent=voiceOn?(awaitingSeriesTitle?'Säg serienamn…':'Röst på'):'Röst av'}"
new_voice_ui = "function voiceUI(){el.voicePill.classList.toggle('on',voiceOn);el.voicePill.setAttribute('aria-pressed',String(voiceOn));el.voicePill.textContent=voiceOn?(awaitingSeriesTitle?'Säg serienamn…':'Röststyrning på'):'Röststyrning av'}"
rep(old_voice_ui, new_voice_ui, 'voice ui')

rep(
    "el.camera.onclick=toggleCamera;el.shutter.onclick=shutterAction;el.photoMode.onclick=()=>setCameraMode('photo');el.filmMode.onclick=()=>setCameraMode('film');el.voice.onclick=toggleVoice;",
    "el.cameraPill.onclick=toggleCamera;el.shutter.onclick=shutterAction;el.photoMode.onclick=()=>setCameraMode('photo');el.filmMode.onclick=()=>setCameraMode('film');el.voicePill.onclick=toggleVoice;",
    'control bindings'
)
rep("el.audio.textContent='Spela in ljud'", "el.audio.textContent='🎙 Spela in ljudspår'", 'audio stop label')
rep("el.audio.textContent='Stoppa ljud'", "el.audio.textContent='■ Stoppa ljudspår'", 'audio recording label')
rep("status('Redo. Kamera, röst och Foto/Film visas uppe till höger.')", "status('Redo. Kamera och röststyrning slås av/på uppe till höger. Avtryckaren används bara för Foto/Film.')", 'ready status')
rep('Detective Collector v0.12 ·', 'Detective Collector v0.13 ·', 'footer version')

p.write_text(s)
