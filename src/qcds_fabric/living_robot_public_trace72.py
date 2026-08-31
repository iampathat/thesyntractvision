from __future__ import annotations

from .living_robot_public_oracles71 import living_robot_public_oracles71_html as _base_html


_CSS = r'''
/* BUILD 72: QCDS stage shows this run's movement, not only phase names. */
.q72RunPath{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin:0 0 12px}.q72RunPath div{position:relative;border:1px solid #284958;background:#06151d;border-radius:10px;padding:9px}.q72RunPath div:not(:last-child):after{content:'→';position:absolute;right:-9px;top:50%;transform:translateY(-50%);z-index:2;color:#68b88b}.q72RunPath b{display:block;color:#d3f1dc;font-size:7.5px}.q72RunPath span{display:block;margin-top:4px;color:#7898a7;font-size:6.3px;line-height:1.4}
.q72Compare{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:8px 0 12px}.q72Dist{border:1px solid #254451;background:#06141b;border-radius:10px;padding:10px}.q72Dist h4{margin:0 0 8px;color:#bee8cb;font-size:7px;letter-spacing:.08em;text-transform:uppercase}.q72Dist .q69DistRow{grid-template-columns:80px 1fr 48px}.q72ArrowBox{border-left:3px solid #77dca0;background:#081d17;padding:9px 11px;margin:9px 0;color:#97bba4;font-size:7px;line-height:1.5}.q72ArrowBox strong{color:#d7f4df}
@media(max-width:680px){.q72RunPath{grid-template-columns:1fr 1fr}.q72RunPath div:nth-child(2):after{display:none}.q72Compare{grid-template-columns:1fr}}
'''

_SCRIPT = r'''
<script>
/* BUILD 72: show baseline and stabilized world projections inside phase 3. */
function q72Distribution(rows,title){
  const card=q69Text('div','','q72Dist');card.appendChild(q69Text('h4',title));const dist=q69Text('div','','q69Distribution');
  (rows||[]).forEach(row=>{const r=q69Text('div','','q69DistRow');r.appendChild(q69Text('div',row.value,'q69DistName'));const bar=q69Text('div','','q69Bar'),fill=document.createElement('i');fill.style.width=Math.max(1,100*Number(row.probability||0))+'%';bar.appendChild(fill);r.appendChild(bar);r.appendChild(q69Text('div',q69Pct(row.probability),'q69DistPct'));dist.appendChild(r)});card.appendChild(dist);return card;
}
q69Phases=function(result,body){
  const sum=result.oracle_summary||{};
  const path=q69Text('div','','q72RunPath');[
    ['REPRESENT','Build '+result.logical_width+' Conditions'],
    ['CONSTRAIN',sum.total+' active oracles'],
    ['INFER','Stabilize TruthDistribution'],
    ['BIND',result.binding_status==='unresolved_tie'?'Preserve unresolved tie':'Bind '+result.world_binding]
  ].forEach(([a,b])=>{const x=q69Text('div','');x.appendChild(q69Text('b',a));x.appendChild(q69Text('span',b));path.appendChild(x)});body.appendChild(path);

  (result.qcds_phases||[]).forEach(phase=>{
    const row=q69Text('div','','q69Phase');row.appendChild(q69Text('div',String(phase.number),'q69PhaseNum'));const text=q69Text('div','');text.appendChild(q69Text('b',phase.name));text.appendChild(q69Text('p',phase.plain));text.appendChild(q69Text('em',phase.detail));
    if(phase.number===3){const compare=q69Text('div','','q72Compare');compare.appendChild(q72Distribution(result.baseline_world_distribution||[],'Before recursive inference'));compare.appendChild(q72Distribution(result.stabilized_world_distribution||[],'After stabilization'));text.appendChild(compare);}
    if(phase.number===4){const callout=q69Text('div','','q72ArrowBox');if(result.binding_status==='unresolved_tie'){callout.appendChild(q69Text('strong','Truth alignment refuses a fake winner. '));callout.append('The tied leaders remain in the TruthDistribution, so the single-world projection stays unbound.');}else{callout.appendChild(q69Text('strong','Truth alignment has one leading world. '));callout.append('That projection can be bound without discarding the rest of the TruthDistribution.');}text.appendChild(callout);}
    row.appendChild(text);body.appendChild(row);
  });
};
</script>
'''


def living_robot_public_trace72_html(*, static_mode: bool = False) -> str:
    html = _base_html(static_mode=static_mode)
    if "</style>" not in html or "</body>" not in html:
        raise RuntimeError("public surface changed; BUILD 72 QCDS trace layer cannot attach safely")
    html = html.replace("</style>", _CSS + "\n</style>", 1)
    html = html.replace("</body>", _SCRIPT + "\n</body>", 1)
    return html


__all__ = ["living_robot_public_trace72_html"]
