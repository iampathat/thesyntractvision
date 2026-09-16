from pathlib import Path

p=Path('web/detective/index.html')
s=p.read_text(encoding='utf-8')

def rep(old,new,label):
    global s
    if old not in s:
        raise SystemExit(f'missing pattern: {label}')
    s=s.replace(old,new,1)

rep("@media(max-width:760px){.collectorHero{grid-template-columns:1fr;padding:16px;border-radius:22px}.collectorMark{min-height:190px}",
    "@media(max-width:760px){.collectorHero{grid-template-columns:1fr;padding:16px;border-radius:22px;gap:30px}.collectorMark{min-height:190px;margin-top:4px}",
    'mobile hero spacing')

rep("@media(max-width:540px){.collectorHero{margin-top:6px;padding:14px;gap:12px}",
    "@media(max-width:540px){.collectorHero{margin-top:6px;padding:14px;gap:28px}",
    'small mobile hero spacing')

rep('Samla in spår. Bevara original. Ordna materialet i serier och bygg färdiga batchar för vidare arbete i UOS.',
    'Samla in spår. Bevara original. Ordna materialet i serier och bygg färdiga batchar som kan delas vidare till valfria mål.',
    'generic hero lead')

rep('<span class="collectorStep"><b>4</b>UOS</span>',
    '<span class="collectorStep"><b>4</b>Dela till</span>',
    'step 4 share')

rep('aria-label="Spår samlas i serier och batchar för UOS"',
    'aria-label="Spår samlas i serier och batchar för vidare delning"',
    'generic illustration aria')

rep('<div class="collectorLegend"><span>SPÅR</span> → <span>SERIER</span> → <span>BATCH</span> → <span>UOS</span></div>',
    '<div class="collectorLegend"><span>SPÅR</span> → <span>SERIER</span> → <span>BATCH</span> → <span>DELA TILL</span></div>',
    'legend share')

rep('<span class="collectorBridgeKicker">Överlämning</span><strong>Collector samlar — UOS arbetar vidare</strong><small>Färdiga serier kan senare skickas vidare som batchar utan att Collector behöver vara själva analysmiljön.</small>',
    '<span class="collectorBridgeKicker">Överlämning</span><strong>Collector samlar — du väljer nästa mål</strong><small>Färdiga serier kan delas vidare som batchar till exempelvis UOS, export eller andra arbetsflöden.</small>',
    'generic bridge copy')

rep('<div class="collectorRoute"><span>Spår</span><i>→</i><span>Serie</span><i>→</i><span>Batch</span><i>→</i><span>UOS</span></div>',
    '<div class="collectorRoute"><span>Spår</span><i>→</i><span>Serie</span><i>→</i><span>Batch</span><i>→</i><span>Dela till</span></div>',
    'generic bridge route')

rep('Detective Collector v0.17 · foto/film/ljud · röstläge minns Foto · röst av i Film/Ljud',
    'Detective Collector v0.18 · foto/film/ljud · batch · dela till valfritt mål',
    'footer version')

p.write_text(s,encoding='utf-8')
print('Detective Collector v0.18 patched')
