from pathlib import Path
import re

p=Path('web/detective/index.html')
s=p.read_text(encoding='utf-8')

start=s.index('<section class="card setupCard">')
end=s.index('<section class="card captureCard">', start)
new_setup='''<section class="card setupCard simpleSetup">
  <div class="destinationLabel">Samla till</div>
  <div class="destinationRow">
    <div id="activeSeries" class="active destinationActive"><span class="small">Ingen serie vald.</span></div>
    <button id="changeSeriesBtn" class="mini destinationChange" type="button">Ändra</button>
  </div>
  <div id="seriesChooser" class="chooserPanel hidden">
    <label class="chooserExisting"><span>Välj befintlig serie</span><select id="existingSeriesSelect"><option value="">Välj serie…</option></select></label>
    <details class="newSeriesBox">
      <summary>＋ Ny serie</summary>
      <div class="newSeriesFields">
        <label><span>Serienamn</span><input id="seriesName" placeholder="T.ex. Plats A – foton"></label>
        <label><span>Mapp <em>valfritt</em></span><input id="folderName" placeholder="Osorterat"></label>
        <button id="startSeriesBtn" class="btn primary" type="button">Skapa och använd</button>
      </div>
    </details>
  </div>
  <button id="setFolderBtn" class="hidden" type="button" aria-hidden="true" tabindex="-1"></button>
  <button id="newSeriesBtn" class="hidden" type="button" aria-hidden="true" tabindex="-1"></button>
  <button id="endSeriesBtn" class="hidden" type="button" aria-hidden="true" tabindex="-1"></button>
</section>
'''
s=s[:start]+new_setup+s[end:]

# Move file import into the capture area and keep inputs there.
needle='<div class="captureFoot">\n    <div id="status" class="status compactStatus">Redo. Inget material lämnar enheten.</div>'
replacement='''<div class="captureFoot">
    <div class="captureUtility"><button id="fileBtn" class="mini captureFile" type="button">＋ Lägg till filer</button><span class="small">Importera bilder, dokument, ljud eller video</span></div>
    <div id="status" class="status compactStatus">Redo. Inget material lämnar enheten.</div>'''
if needle not in s: raise SystemExit('captureFoot pattern missing')
s=s.replace(needle,replacement,1)

# Insert the hidden file inputs into the capture card before the canvas.
needle='  <canvas id="captureCanvas" class="hidden"></canvas>'
replacement='''  <input id="fileInput" class="hidden" type="file" multiple accept="image/*,application/pdf,audio/*,video/*,.txt,.md,.csv,.json,.doc,.docx,.odt,.epub,.mobi,.rtf">
  <input id="cameraInput" class="hidden" type="file" accept="image/*" capture="environment">
  <input id="filmInput" class="hidden" type="file" accept="video/*" capture="environment">
  <canvas id="captureCanvas" class="hidden"></canvas>'''
if needle not in s: raise SystemExit('canvas pattern missing')
s=s.replace(needle,replacement,1)

# Remove the old duplicated hidden inputs left by v0.20 if they are immediately before the setup card.
s=s.replace('''  <input id="fileInput" class="hidden" type="file" multiple accept="image/*,application/pdf,audio/*,video/*,.txt,.md,.csv,.json,.doc,.docx,.odt,.epub,.mobi,.rtf">\n  <input id="cameraInput" class="hidden" type="file" accept="image/*" capture="environment">\n  <input id="filmInput" class="hidden" type="file" accept="video/*" capture="environment">\n</section>\n<section class="card captureCard">''','''</section>\n<section class="card captureCard">''',1)

css='''
/* v0.21 destination-first setup */
.simpleSetup{display:grid;gap:10px;padding:13px 14px}.destinationLabel{color:#67e8f9;font-size:.7rem;font-weight:950;letter-spacing:.15em;text-transform:uppercase}.destinationRow{display:flex;align-items:stretch;gap:9px}.destinationActive{flex:1;min-width:0;margin:0;padding:10px 12px;display:flex;flex-direction:column;justify-content:center}.destinationActive strong{font-size:1rem}.destinationChange{flex:0 0 auto;padding-inline:14px;background:#0b1c2d}.chooserPanel{border-top:1px solid #1d3449;padding-top:11px;display:grid;gap:10px}.chooserExisting{display:grid;gap:5px;color:#9fb4c8;font-size:.72rem;font-weight:800}.chooserExisting select{width:100%;background:#06101d;border:1px solid #314a65;border-radius:12px;color:#f8fafc;padding:11px}.newSeriesBox{border:1px solid #29415a;border-radius:13px;background:#071523}.newSeriesBox>summary{cursor:pointer;list-style:none;padding:10px 12px;color:#dbeafe;font-size:.8rem;font-weight:850}.newSeriesBox>summary::-webkit-details-marker{display:none}.newSeriesFields{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr) auto;gap:8px;padding:0 10px 10px;align-items:end}.newSeriesFields label{display:grid;gap:4px;color:#9fb4c8;font-size:.7rem;font-weight:800}.newSeriesFields em{font-style:normal;color:#64748b;font-weight:600}.newSeriesFields input{width:100%;min-width:0;background:#06101d;border:1px solid #314a65;border-radius:11px;color:#f8fafc;padding:10px}.newSeriesFields .btn{padding:10px 13px;white-space:nowrap}.captureUtility{grid-column:1/-1;display:flex;gap:8px;align-items:center;flex-wrap:wrap}.captureFile{background:#0b1c2d}.captureUtility .small{font-size:.72rem}.captureFoot{grid-template-columns:minmax(0,1fr) auto}.setupCard+ .captureCard{margin-top:8px}@media(max-width:760px){.newSeriesFields{grid-template-columns:1fr}.destinationRow{align-items:center}.destinationChange{min-height:44px}.captureFoot{grid-template-columns:1fr}}@media(max-width:540px){.simpleSetup{padding:11px}.destinationActive{padding:9px 10px}.destinationChange{padding-inline:11px}.chooserPanel{padding-top:9px}.captureUtility .small{display:none}}
'''
s=s.replace('</style>',css+'\n</style>',1)

# Cleaner no-active copy in the compact destination card.
old="if(!a){el.active.innerHTML=`<span class=\"small\">Mapp: <strong>${esc(currentFolder)}</strong><br>Ingen aktiv serie.</span>`;el.cameraSeries.textContent='Ingen aktiv serie';"
new="if(!a){el.active.innerHTML=`<strong>Ingen serie vald</strong><span class=\"small\">Välj en serie med Ändra.</span>`;el.cameraSeries.textContent='Ingen aktiv serie';"
if old not in s: raise SystemExit('renderActive no-active pattern missing')
s=s.replace(old,new,1)

# Add chooser logic before activateSeries.
marker='async function activateSeries(id){'
if marker not in s: raise SystemExit('activateSeries marker missing')
helper='''async function openSeriesChooser(){const panel=document.getElementById('seriesChooser'),select=document.getElementById('existingSeriesSelect');if(!panel||!select)return;const opening=panel.classList.contains('hidden');panel.classList.toggle('hidden',!opening);if(!opening)return;const archives=(await all('archives')).sort((a,b)=>String(b.modifiedAt||b.createdAt||'').localeCompare(String(a.modifiedAt||a.createdAt||'')));select.innerHTML='<option value="">Välj serie…</option>'+archives.map(a=>`<option value="${a.id}">${esc(a.folder||'Osorterat')} / ${esc(a.name)}</option>`).join('');select.value=activeSeries?.id||''}
'''
s=s.replace(marker,helper+marker,1)

# Close chooser after creating a new series.
old="el.startSeries.onclick=()=>queueMutation(()=>startSeries(el.series.value));"
new="el.startSeries.onclick=()=>queueMutation(()=>startSeries(el.series.value)).then(()=>document.getElementById('seriesChooser')?.classList.add('hidden'));"
if old not in s: raise SystemExit('startSeries click pattern missing')
s=s.replace(old,new,1)

# Add chooser events before camera bindings.
marker='el.cameraPill.onclick=toggleCamera;'
if marker not in s: raise SystemExit('camera binding marker missing')
events="""document.getElementById('changeSeriesBtn').onclick=openSeriesChooser;document.getElementById('existingSeriesSelect').onchange=e=>{const id=e.target.value;if(id)queueMutation(()=>activateSeries(id)).then(()=>document.getElementById('seriesChooser')?.classList.add('hidden'))};"""
s=s.replace(marker,events+marker,1)

s=s.replace('Detective Collector v0.20 · collection-first · mapp och serie före kamera · förenklad arbetsyta','Detective Collector v0.21 · välj destination · samla · byt serie vid behov',1)

p.write_text(s,encoding='utf-8')
print('Detective Collector v0.21 patched')
