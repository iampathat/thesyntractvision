from pathlib import Path

p = Path('web/detective/index.html')
s = p.read_text()

def rep(old, new, label):
    global s
    if old not in s:
        raise SystemExit(f'Missing patch target: {label}')
    s = s.replace(old, new, 1)

# Keep the SVG visual-only. The single legend below already explains the flow.
rep(
'''<g><rect x="343" y="96" width="72" height="68" rx="20" fill="url(#bg)" opacity=".95"/><path d="M360 115h38M360 128h38M360 141h25" stroke="#fff" stroke-width="3" stroke-linecap="round"/><text x="379" y="182" text-anchor="middle" fill="#b6c8d8" font-size="12" font-weight="800">UOS</text></g>
<g fill="#8fa5b9" font-size="10" font-weight="800"><text x="66" y="92" text-anchor="middle">BILD</text><text x="66" y="164" text-anchor="middle">LJUD</text><text x="66" y="236" text-anchor="middle">DOKUMENT</text><text x="218" y="207" text-anchor="middle">SERIER</text><text x="379" y="83" text-anchor="middle">BATCH</text></g>''',
'''<g><rect x="343" y="96" width="72" height="68" rx="20" fill="url(#bg)" opacity=".95"/><path d="M360 115h38M360 128h38M360 141h25" stroke="#fff" stroke-width="3" stroke-linecap="round"/></g>''',
'clean svg labels'
)

# Allow one immutable original to be referenced from multiple working series.
old_add = '''async function addOriginalToActive(itemId){if(!activeSeries)return status('Gör först en serie aktiv.');const a=await one('archives',activeSeries.id),item=await one('items',itemId);if(!a||!item)return;if((a.itemIds||[]).includes(itemId))return status('Objektet finns redan i den aktiva serien.');if(item.archiveId&&item.archiveId!==a.id)return status('Objektet ligger redan i en annan serie. Flytta det från den seriens redigering.');a.itemIds=[...(a.itemIds||[]),itemId];a.modifiedAt=new Date().toISOString();item.archiveId=a.id;item.pageNo=a.itemIds.length;await Promise.all([put('archives',a),put('items',item)]);await render();status(`Tillagt i ${a.name}.`)}'''
new_add = '''async function addOriginalToActive(itemId){if(!activeSeries)return status('Gör först en serie aktiv.');const a=await one('archives',activeSeries.id),item=await one('items',itemId);if(!a||!item)return;if((a.itemIds||[]).includes(itemId))return status('Objektet finns redan i den aktiva serien.');a.itemIds=[...(a.itemIds||[]),itemId];a.modifiedAt=new Date().toISOString();if(!item.archiveId){item.archiveId=a.id;item.pageNo=a.itemIds.length;await Promise.all([put('archives',a),put('items',item)])}else await put('archives',a);await render();status(`Originalet refereras nu även i ${a.name}.`)}'''
rep(old_add, new_add, 'multi-series original reuse')

old_render = '''${!i.archiveId?`<button class="mini" data-add-original="${i.id}">+ aktiv serie</button>`:''}'''
new_render = '''<button class="mini" data-add-original="${i.id}">+ till aktiv serie</button>'''
rep(old_render, new_render, 'restore add-to-series button')

rep('Detective Collector v0.13 ·', 'Detective Collector v0.14 ·', 'version')
p.write_text(s)
