from pathlib import Path
import re

p=Path('web/detective/index.html')
s=p.read_text(encoding='utf-8')

pat=re.compile(r'<section class="collectorHero simpleHero">[\s\S]*?</section>',re.M)
new='''<section class="titleOnlyHero">
  <h1>Detective <span>Collector</span></h1>
</section>'''
s,n=pat.subn(new,s,count=1)
if n!=1:
    raise SystemExit('simple hero section not found')

css='''
/* v0.24 title-only intro */
.titleOnlyHero{margin:8px 0 14px;padding:14px 4px 6px}.titleOnlyHero h1{font-size:clamp(2.8rem,8vw,5.2rem);letter-spacing:-.065em;line-height:.86;margin:0}.titleOnlyHero h1 span{display:block;background:linear-gradient(90deg,#67e8f9,#a5b4fc 58%,#c4b5fd);-webkit-background-clip:text;background-clip:text;color:transparent}@media(max-width:540px){.titleOnlyHero{margin-top:4px;padding:10px 2px 4px}.titleOnlyHero h1{font-size:clamp(2.6rem,14vw,4rem)}}
'''
s=s.replace('</style>',css+'\n</style>',1)

s=s.replace('Detective Collector v0.23 · förenklad introduktion · privat lokalt arkiv · mindre illustration','Detective Collector v0.24 · title only · less is more',1)

p.write_text(s,encoding='utf-8')
print('Detective Collector v0.24 patched')
