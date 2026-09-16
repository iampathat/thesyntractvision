from pathlib import Path

p=Path('web/detective/index.html')
s=p.read_text(encoding='utf-8')

def rep(old,new,label):
    global s
    if old not in s:
        raise SystemExit(f'missing pattern: {label}')
    s=s.replace(old,new,1)

rep('.collectorMark svg{position:absolute;inset:0;width:100%;height:100%}.collectorLegend{position:absolute;left:12px;right:12px;bottom:10px;',
    '.collectorMark svg{position:absolute;left:0;right:0;top:0;width:100%;height:calc(100% - 44px)}.collectorLegend{position:absolute;left:12px;right:12px;bottom:12px;',
    'reserve legend zone')

rep('@media(max-width:540px){.collectorHero{margin-top:6px;padding:14px;gap:28px}.collectorHero h1{font-size:clamp(2.55rem,14vw,4rem)}.collectorLead{font-size:.97rem}.collectorMark{min-height:168px}',
    '@media(max-width:540px){.collectorHero{margin-top:6px;padding:14px;gap:28px}.collectorHero h1{font-size:clamp(2.55rem,14vw,4rem)}.collectorLead{font-size:.97rem}.collectorMark{min-height:190px}',
    'mobile illustration height')

rep('Detective Collector v0.18 · foto/film/ljud · batch · dela till valfritt mål',
    'Detective Collector v0.19 · luftig Collector-illustration · batch · dela till valfritt mål',
    'footer version')

p.write_text(s,encoding='utf-8')
print('Detective Collector v0.19 patched')
