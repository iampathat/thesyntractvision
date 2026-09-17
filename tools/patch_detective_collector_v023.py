from pathlib import Path
import re

p=Path('web/detective/index.html')
s=p.read_text(encoding='utf-8')

start=s.index('<section class="collectorHero">')
end=s.index('</section>', start)+len('</section>')
old=s[start:end]
mark_start=old.index('<div class="collectorMark"')
mark=old[mark_start:]
# Remove the repeated process legend from the illustration itself.
mark=re.sub(r'<div class="collectorLegend">.*?</div>', '', mark, count=1, flags=re.S)

new=f'''<section class="collectorHero simpleHero">
<div class="simpleHeroCopy">
  <h1>Detective <span>Collector</span></h1>
  <p class="collectorLead">Samla spår. Bevara original. Ordna i serier och dela vidare när du vill.</p>
  <div class="badge simpleArchiveBadge"><span class="dot"></span> Privat lokalt arkiv · original + arbetskopior</div>
</div>
{mark}
</section>'''
s=s[:start]+new+s[end:]

css='''
/* v0.23 less-is-more intro */
.collectorHero.simpleHero{grid-template-columns:minmax(0,1fr) 300px;gap:24px;align-items:center;padding:20px 22px;margin-bottom:16px}.simpleHeroCopy{min-width:0}.simpleHero h1{margin:0 0 10px;font-size:clamp(2.7rem,7vw,5rem)}.simpleHero .collectorLead{max-width:660px}.simpleArchiveBadge{margin-top:16px}.simpleHero .collectorMark{min-height:170px;height:170px;max-width:300px;width:100%;justify-self:end;border:0;background:transparent;overflow:visible}.simpleHero .collectorMark svg{position:absolute;inset:0;width:100%;height:100%;filter:drop-shadow(0 18px 34px #0008)}
@media(max-width:760px){.collectorHero.simpleHero{grid-template-columns:minmax(0,1fr) 210px;gap:16px;padding:16px}.simpleHero .collectorMark{height:145px;min-height:145px;max-width:210px}.simpleArchiveBadge{margin-top:13px}}
@media(max-width:540px){.collectorHero.simpleHero{grid-template-columns:minmax(0,1fr) 118px;gap:10px;padding:13px}.simpleHero h1{font-size:clamp(2.2rem,11vw,3.2rem);margin-bottom:8px}.simpleHero .collectorLead{font-size:.9rem;line-height:1.38}.simpleHero .collectorMark{height:108px;min-height:108px;max-width:118px}.simpleArchiveBadge{grid-column:1/-1;margin-top:12px;font-size:.72rem;padding:7px 9px}.simpleHeroCopy{display:contents}.simpleHeroCopy h1,.simpleHeroCopy .collectorLead{grid-column:1}.simpleHeroCopy .simpleArchiveBadge{grid-column:1/-1}}
'''
s=s.replace('</style>',css+'\n</style>',1)

s=s.replace('Detective Collector v0.22 · serie först · tydligare lagringsstatus · mapp som sekundär ordning','Detective Collector v0.23 · förenklad introduktion · privat lokalt arkiv · mindre illustration',1)

p.write_text(s,encoding='utf-8')
print('Detective Collector v0.23 patched')
