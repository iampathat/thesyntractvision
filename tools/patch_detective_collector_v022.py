from pathlib import Path
import re

p=Path('web/detective/index.html')
s=p.read_text(encoding='utf-8')

# Storage: show used, percent, total in GB and MB.
old="async function storageInfo(){if(!navigator.storage?.estimate)return;const e=await navigator.storage.estimate();el.storage.textContent=`Lokal lagring: ${fmtBytes(e.usage||0)} av cirka ${fmtBytes(e.quota||0)}`}"
new="async function storageInfo(){if(!navigator.storage?.estimate)return;const e=await navigator.storage.estimate(),usage=e.usage||0,quota=e.quota||0,mb=quota/1048576,gb=quota/1073741824,pct=quota?usage/quota*100:0;const nf1=new Intl.NumberFormat('sv-SE',{minimumFractionDigits:1,maximumFractionDigits:1}),nf2=new Intl.NumberFormat('sv-SE',{minimumFractionDigits:2,maximumFractionDigits:2});const pctText=pct>0&&pct<0.01?'<0,01 %':`${nf2.format(pct)} %`;el.storage.textContent=`Lokal lagring: ${fmtBytes(usage)} · ${pctText} använt · ${nf1.format(gb)} GB totalt (${nf1.format(mb)} MB)`}"
if old not in s:
    raise SystemExit('storageInfo pattern missing')
s=s.replace(old,new,1)

# Make series the primary concept; folder is secondary organization.
for old,new,label in [
    ('<div class="destinationLabel">Samla till</div>','<div class="destinationLabel">Aktiv serie</div>','destination label'),
    ('id="changeSeriesBtn" class="mini destinationChange" type="button">Ändra</button>','id="changeSeriesBtn" class="mini destinationChange" type="button">Byt serie</button>','change button'),
    ('<label class="chooserExisting"><span>Välj befintlig serie</span><select id="existingSeriesSelect"><option value="">Välj serie…</option></select></label>','<div class="chooserTitle">Välj serie</div><label class="chooserExisting"><select id="existingSeriesSelect"><option value="">Välj en befintlig serie…</option></select></label>','chooser'),
    ('<summary>＋ Ny serie</summary>','<summary>＋ Skapa ny serie</summary>','new series summary'),
    ('<label><span>Serienamn</span><input id="seriesName" placeholder="T.ex. Plats A – foton"></label>','<label><span>Namn på serien</span><input id="seriesName" placeholder="T.ex. Plats A – foton"></label>','series name'),
    ('<label><span>Mapp <em>valfritt</em></span><input id="folderName" placeholder="Osorterat"></label>','<label><span>Mapp <em>valfritt, bara för ordning</em></span><input id="folderName" placeholder="Osorterat"></label>','folder hint'),
]:
    if old not in s:
        raise SystemExit(f'{label} pattern missing')
    s=s.replace(old,new,1)

# Series dropdown: series name first, folder second.
old="select.innerHTML='<option value=\"\">Välj serie…</option>'+archives.map(a=>`<option value=\"${a.id}\">${esc(a.folder||'Osorterat')} / ${esc(a.name)}</option>`).join('');"
new="select.innerHTML='<option value=\"\">Välj en befintlig serie…</option>'+archives.map(a=>`<option value=\"${a.id}\">${esc(a.name)} — ${esc(a.folder||'Osorterat')}</option>`).join('');"
if old not in s:
    raise SystemExit('series select pattern missing')
s=s.replace(old,new,1)

# Compact active series card: name first; folder and count are secondary.
old="el.active.innerHTML=`<strong>${esc(a.name)}</strong><span class=\"small\">📁 ${esc(a.folder||'Osorterat')} · ${esc(a.category||autoCategory(a.name))} · ${(a.itemIds||[]).length} objekt</span>`;"
new="el.active.innerHTML=`<strong>${esc(a.name)}</strong><span class=\"small\">Mapp: ${esc(a.folder||'Osorterat')} · ${(a.itemIds||[]).length} objekt</span>`;"
if old not in s:
    raise SystemExit('active series rendering pattern missing')
s=s.replace(old,new,1)

old='Välj en serie med Ändra.'
if old not in s:
    raise SystemExit('no active helper pattern missing')
s=s.replace(old,'Tryck Byt serie för att välja eller skapa en serie.',1)

css='''\n/* v0.22 clearer series hierarchy */\n.chooserTitle{font-size:.82rem;font-weight:900;color:#e6eef7;margin-bottom:-2px}.destinationActive .small{margin-top:2px}.destinationChange{white-space:nowrap}.newSeriesFields label:nth-child(2) span{color:#8fa5b9}.newSeriesFields label:nth-child(2) em{display:block;margin-top:1px}.captureFoot #storageText{font-variant-numeric:tabular-nums}@media(max-width:540px){.destinationLabel{font-size:.66rem}.chooserTitle{font-size:.78rem}.newSeriesFields label:nth-child(2) em{display:inline}}\n'''
s=s.replace('</style>',css+'</style>',1)

old='Detective Collector v0.21 · välj destination · samla · byt serie vid behov'
if old not in s:
    raise SystemExit('footer version pattern missing')
s=s.replace(old,'Detective Collector v0.22 · serie först · tydligare lagringsstatus · mapp som sekundär ordning',1)

p.write_text(s,encoding='utf-8')
print('Detective Collector v0.22 patched')
