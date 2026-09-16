from pathlib import Path
import re

p=Path('web/detective/index.html')
s=p.read_text(encoding='utf-8')

# Replace the old camera/settings two-column block with a collection-first flow.
start=s.index('<section class="grid">')
end=s.index('<div class="collectorBridge">', start)
new_block='''<section class="card setupCard">
  <div class="setupHead">
    <div><span class="setupKicker">Samla till</span><strong>Välj mapp och serie</strong><small>Foto, film, ljud och filer läggs i den aktiva serien.</small></div>
    <div id="activeSeries" class="active activeCompact"><span class="small">Ingen aktiv serie.</span></div>
  </div>
  <div class="setupFields">
    <label><span>Mapp</span><input id="folderName" placeholder="T.ex. Utredning Hamngatan"></label>
    <label><span>Serie</span><input id="seriesName" placeholder="T.ex. Plats A – foton"></label>
  </div>
  <div class="setupActions">
    <button id="startSeriesBtn" class="btn primary">Starta serie</button>
    <button id="fileBtn" class="mini setupFile">＋ Lägg till filer</button>
    <button id="endSeriesBtn" class="mini setupEnd">Avsluta aktiv serie</button>
    <button id="setFolderBtn" class="hidden" type="button" aria-hidden="true" tabindex="-1"></button>
    <button id="newSeriesBtn" class="hidden" type="button" aria-hidden="true" tabindex="-1"></button>
  </div>
  <input id="fileInput" class="hidden" type="file" multiple accept="image/*,application/pdf,audio/*,video/*,.txt,.md,.csv,.json,.doc,.docx,.odt,.epub,.mobi,.rtf">
  <input id="cameraInput" class="hidden" type="file" accept="image/*" capture="environment">
  <input id="filmInput" class="hidden" type="file" accept="video/*" capture="environment">
</section>
<section class="card captureCard">
  <div id="cameraBox" class="camera off"><video id="video" playsinline autoplay muted></video><div class="cameraTop"><span id="cameraSeriesPill" class="pill">Ingen aktiv serie</span><div class="cameraStatus"><button id="cameraPill" class="pill cameraPill controlPill" type="button" title="Slå kameran av eller på">Kamera av</button><button id="voicePill" class="pill voicePill controlPill" type="button" title="Slå röststyrning av eller på">Röststyrning av</button><button id="voiceSettingsBtn" class="settingsBtn" type="button" aria-label="Röstkommandon" title="Röstkommandon">⚙</button><div class="modeSwitch"><button id="photoModeBtn" class="modeBtn on" type="button">Foto</button><button id="filmModeBtn" class="modeBtn" type="button">Film</button><button id="audioModeBtn" class="modeBtn" type="button">Ljud</button></div></div></div><div class="cameraDock"><button id="shutterBtn" class="shutter" aria-label="Fota" title="Fota" disabled></button></div></div>
  <canvas id="captureCanvas" class="hidden"></canvas>
  <div class="captureFoot">
    <div id="status" class="status compactStatus">Redo. Inget material lämnar enheten.</div>
    <div class="small" id="storageText">Lagring: kontrollerar…</div>
    <details class="setupHelp"><summary>Röstkommandon</summary><div id="voiceGuide" class="voiceGuide"></div></details>
  </div>
</section>
'''
s=s[:start]+new_block+s[end:]

css='''
/* v0.20 collection-first workspace */
.setupCard{border-color:#2d526d;background:linear-gradient(180deg,#0b1a2b,#081522);padding:16px;display:grid;gap:14px}.setupHead{display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,.75fr);gap:14px;align-items:end}.setupKicker{display:block;color:#67e8f9;font-size:.68rem;font-weight:950;letter-spacing:.14em;text-transform:uppercase;margin-bottom:4px}.setupHead strong{display:block;font-size:1.15rem}.setupHead small{display:block;color:#8fa5b9;margin-top:4px}.activeCompact{margin:0;min-height:0;padding:9px 11px}.setupFields{display:grid;grid-template-columns:minmax(0,.75fr) minmax(0,1.25fr);gap:10px}.setupFields label{display:grid;gap:5px;color:#9fb4c8;font-size:.72rem;font-weight:800}.setupFields input{width:100%;min-width:0;background:#06101d;border:1px solid #314a65;border-radius:13px;color:#f8fafc;padding:12px}.setupActions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.setupActions .btn.primary{padding:11px 16px}.setupFile,.setupEnd{background:#0b1c2d}.setupEnd{margin-left:auto;color:#9fb4c8}.captureCard{padding:12px}.captureFoot{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px 12px;align-items:center;margin-top:10px}.compactStatus{min-height:0;padding:8px 10px;font-size:.78rem}.setupHelp{grid-column:1/-1;border-top:1px solid #1d3449;padding-top:7px}.setupHelp>summary{cursor:pointer;color:#8fa5b9;font-size:.74rem;font-weight:800}.setupHelp .voiceGuide{margin-top:7px;padding:8px;border-radius:10px}.archiveCard{margin-top:42px}@media(max-width:760px){.setupHead{grid-template-columns:1fr}.setupFields{grid-template-columns:1fr}.setupEnd{margin-left:0}.captureFoot{grid-template-columns:1fr}.setupHelp{grid-column:1}.archiveCard{margin-top:54px}}@media(max-width:540px){.setupCard{padding:12px;gap:12px}.setupActions{gap:7px}.setupActions .btn.primary{flex:1 1 48%;min-width:130px}.setupFile{flex:1 1 42%;text-align:center}.setupEnd{width:auto}.activeCompact{font-size:.9rem}}
'''
s=s.replace('</style>',css+'\n</style>',1)

# Creating a series should always use the folder currently shown in the setup field.
old="async function startSeries(name){name=cleanTitle(name);if(!name)return status('Säg eller skriv ett namn på serien.');const a={id:uuid(),name,folder:currentFolder||'Osorterat'"
new="async function startSeries(name){name=cleanTitle(name);if(!name)return status('Säg eller skriv ett namn på serien.');currentFolder=cleanTitle(el.folder.value)||currentFolder||'Osorterat';localStorage.setItem('detective-folder',currentFolder);const a={id:uuid(),name,folder:currentFolder"
if old not in s: raise SystemExit('startSeries pattern missing')
s=s.replace(old,new,1)

s=s.replace('<section class="card"><div class="sectionHead"><h2>Aktiv serie</h2>', '<section class="card"><div class="sectionHead"><h2>Innehåll i aktiv serie</h2>',1)
s=s.replace('<section class="card"><div class="sectionHead"><h2>Arkiv</h2>', '<section class="card archiveCard"><div class="sectionHead"><h2>Arkiv</h2>',1)
s=s.replace('Detective Collector v0.19 · luftig Collector-illustration · batch · dela till valfritt mål','Detective Collector v0.20 · collection-first · mapp och serie före kamera · förenklad arbetsyta',1)

p.write_text(s,encoding='utf-8')
print('Detective Collector v0.20 patched')
