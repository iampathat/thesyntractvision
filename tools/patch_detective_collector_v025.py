from pathlib import Path
import re

p=Path('web/detective/index.html')
s=p.read_text(encoding='utf-8')

# Replace the whole setup area with a conventional folder -> series -> tags chooser.
pat=re.compile(r'<section class="card setupCard simpleSetup">[\s\S]*?</section>',re.M)
new='''<section class="card setupCard classicSetup">
  <div class="classicSummary">
    <div class="classicSummaryText">
      <div class="destinationLabel">Samla i</div>
      <div id="activeSeries" class="classicActive"><strong>Ingen serie vald</strong><span class="small">Välj mapp och serie.</span></div>
    </div>
    <button id="changeSeriesBtn" class="mini classicChange" type="button">Ändra</button>
  </div>

  <div id="seriesChooser" class="classicChooser hidden">
    <div class="classicField">
      <label for="folderSelect">Mapp</label>
      <div class="classicControlRow">
        <select id="folderSelect"><option value="Osorterat">Osorterat</option></select>
        <button id="newFolderBtn" class="mini" type="button">＋ Ny mapp</button>
      </div>
    </div>

    <div class="classicField">
      <label for="existingSeriesSelect">Serie</label>
      <div class="classicControlRow">
        <select id="existingSeriesSelect"><option value="">Välj serie…</option></select>
        <button id="toggleNewSeriesBtn" class="mini" type="button">＋ Ny serie</button>
      </div>
    </div>

    <div id="newSeriesFields" class="classicNew hidden">
      <input id="seriesName" placeholder="Namn på ny serie">
      <input id="folderName" type="hidden" value="Osorterat">
      <button id="startSeriesBtn" class="btn primary" type="button">Skapa serie</button>
    </div>

    <div class="classicField tagField">
      <label for="seriesTags">Taggar <span>valfritt</span></label>
      <input id="seriesTags" placeholder="t.ex. viktig, exteriör, 2026">
    </div>
  </div>
</section>'''
s,n=pat.subn(new,s,count=1)
if n!=1:
    raise SystemExit('setup section not found')

# Cleaner rendering of active location: folder first, then series, tags secondary.
old_no='<strong>Ingen serie vald</strong><span class="small">Tryck Byt serie för att välja eller skapa en serie.</span>'
if old_no not in s:
    raise SystemExit('no-active rendering not found')
s=s.replace(old_no,'<strong>Ingen serie vald</strong><span class="small">Tryck Ändra och välj mapp och serie.</span>',1)

old_active='el.active.innerHTML=`<strong>${esc(a.name)}</strong><span class="small">Mapp: ${esc(a.folder||\'Osorterat\')} · ${(a.itemIds||[]).length} objekt</span>`;'
new_active='el.active.innerHTML=`<strong>📁 ${esc(a.folder||\'Osorterat\')} <span class="pathSep">›</span> ${esc(a.name)}</strong><span class="small">${(a.itemIds||[]).length} objekt${(a.tags||[]).length?\' · \'+(a.tags||[]).map(t=>\'#\'+esc(t)).join(\' \'):\'\'}</span>`;'
if old_active not in s:
    raise SystemExit('active rendering not found')
s=s.replace(old_active,new_active,1)

# Replace chooser logic so folders are first-class and series are filtered by folder.
pat_fun=re.compile(r'async function openSeriesChooser\(\)\{[\s\S]*?\}\s*async function activateSeries',re.M)
new_fun=r'''async function saveActiveTags(){const input=document.getElementById('seriesTags');if(!input||!activeSeries)return;const a=await one('archives',activeSeries.id);if(!a)return;a.tags=[...new Set(input.value.split(',').map(x=>cleanTitle(x)).filter(Boolean))];a.modifiedAt=new Date().toISOString();await put('archives',a);await render()}
async function createSeriesFromChooser(){const name=document.getElementById('seriesName')?.value||'';const tags=(document.getElementById('seriesTags')?.value||'').split(',').map(x=>cleanTitle(x)).filter(Boolean);await startSeries(name);if(activeSeries&&tags.length){const a=await one('archives',activeSeries.id);if(a){a.tags=[...new Set(tags)];a.modifiedAt=new Date().toISOString();await put('archives',a)}}document.getElementById('newSeriesFields')?.classList.add('hidden');document.getElementById('seriesChooser')?.classList.add('hidden');await render()}
async function openSeriesChooser(){const panel=document.getElementById('seriesChooser'),seriesSelect=document.getElementById('existingSeriesSelect'),folderSelect=document.getElementById('folderSelect'),folderInput=document.getElementById('folderName'),tagInput=document.getElementById('seriesTags');if(!panel||!seriesSelect||!folderSelect)return;const opening=panel.classList.contains('hidden');panel.classList.toggle('hidden',!opening);if(!opening)return;const archives=(await all('archives')).sort((a,b)=>String(b.modifiedAt||b.createdAt||'').localeCompare(String(a.modifiedAt||a.createdAt||''))),folders=[...new Set(['Osorterat',...archives.map(a=>a.folder||'Osorterat')])].sort((a,b)=>a.localeCompare(b,'sv'));folderSelect.innerHTML=folders.map(f=>`<option value="${esc(f)}">${esc(f)}</option>`).join('');folderSelect.value=activeSeries?.folder||currentFolder||'Osorterat';const fillSeries=()=>{const folder=folderSelect.value||'Osorterat';if(folderInput)folderInput.value=folder;const list=archives.filter(a=>(a.folder||'Osorterat')===folder);seriesSelect.innerHTML='<option value="">Välj serie…</option>'+list.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('');seriesSelect.value=activeSeries?.folder===folder?activeSeries.id:''};folderSelect.onchange=()=>{fillSeries();if(tagInput)tagInput.value=''};fillSeries();if(tagInput&&activeSeries){const a=await one('archives',activeSeries.id);tagInput.value=(a?.tags||[]).join(', ')}const newFolderBtn=document.getElementById('newFolderBtn');if(newFolderBtn)newFolderBtn.onclick=()=>{const name=cleanTitle(prompt('Namn på ny mapp:','')||'');if(!name)return;if(![...folderSelect.options].some(o=>o.value===name)){const o=document.createElement('option');o.value=o.textContent=name;folderSelect.appendChild(o)}folderSelect.value=name;fillSeries()};const toggleNew=document.getElementById('toggleNewSeriesBtn'),newFields=document.getElementById('newSeriesFields');if(toggleNew&&newFields)toggleNew.onclick=()=>newFields.classList.toggle('hidden');if(tagInput)tagInput.onchange=()=>queueMutation(saveActiveTags)}
async function activateSeries'''
s,n=pat_fun.subn(new_fun,s,count=1)
if n!=1:
    raise SystemExit('openSeriesChooser function not found')

# Existing create button now also saves optional tags and closes the chooser.
pat_bind=re.compile(r'el\.startSeries\.onclick=\(\)=>queueMutation\(\(\)=>startSeries\(el\.series\.value\)\);')
s,n=pat_bind.subn("el.startSeries.onclick=()=>queueMutation(createSeriesFromChooser);",s,count=1)
if n!=1:
    raise SystemExit('startSeries binding not found')

css='''
/* v0.25 classic folder / series / tags hierarchy */
.classicSetup{padding:14px 16px;border-color:#29475f;background:#091625}.classicSummary{display:flex;align-items:center;justify-content:space-between;gap:12px}.classicSummaryText{min-width:0;flex:1}.classicActive{padding:0;background:transparent;border:0}.classicActive strong{display:block;font-size:1.04rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.classicActive .small{display:block;margin-top:3px}.pathSep{color:#64748b;padding:0 3px}.classicChange{flex:0 0 auto}.classicChooser{margin-top:12px;padding-top:12px;border-top:1px solid #22384d;display:grid;gap:12px}.classicField{display:grid;gap:6px}.classicField>label{font-size:.76rem;color:#9fb4c8;font-weight:850}.classicField>label span{font-weight:600;color:#647d93;margin-left:4px}.classicControlRow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}.classicControlRow select,.classicField input,.classicNew input{width:100%;min-width:0;background:#06101d;border:1px solid #314a65;border-radius:12px;color:#f8fafc;padding:11px 12px}.classicNew{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;padding:10px;border:1px solid #263f56;border-radius:13px;background:#07121f}.tagField{padding-top:2px}.classicSetup .destinationLabel{margin-bottom:5px}.classicSetup .btn.primary{padding:10px 13px}.classicSetup .mini{min-height:42px}@media(max-width:540px){.classicSetup{padding:12px}.classicSummary{align-items:flex-start}.classicControlRow{grid-template-columns:1fr}.classicControlRow .mini{justify-self:start}.classicNew{grid-template-columns:1fr}.classicNew .btn{width:100%}.classicActive strong{white-space:normal}.tagField input{font-size:.92rem}}
'''
s=s.replace('</style>',css+'\n</style>',1)

s=s.replace('Detective Collector v0.24 · title only · less is more','Detective Collector v0.25 · classic folders · series · optional tags',1)

p.write_text(s,encoding='utf-8')
print('Detective Collector v0.25 patched')
