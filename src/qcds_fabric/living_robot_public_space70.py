from __future__ import annotations

from .living_robot_public_inspect69 import living_robot_public_inspect69_html as _base_html


_CSS = r'''
/* BUILD 70: show the Logical Space as grouped binary Conditions, not a mystery number. */
.q70Legend{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin:10px 0 4px}.q70LegendItem{border-top:2px solid #31584d;padding:8px 4px 0}.q70LegendItem strong{display:block;color:#d3f4dd;font-size:7.5px}.q70LegendItem span{display:block;margin-top:3px;color:#7f9caa;font-size:6.5px;line-height:1.4}.q70LegendItem:nth-child(1){border-color:#5da77c}.q70LegendItem:nth-child(2){border-color:#4b8caf}.q70LegendItem:nth-child(3){border-color:#af9657}.q70LegendItem:nth-child(4){border-color:#8c72ba}
.q70Lane{display:grid;grid-template-columns:110px 1fr 48px;gap:9px;align-items:start;border-top:1px solid #24443a;padding:9px 0}.q70Lane:first-child{border-top:0}.q70LaneName b{display:block;color:#d4f2dd;font-size:7.5px}.q70LaneName span{display:block;margin-top:3px;color:#7796a5;font-size:6.2px;line-height:1.35}.q70LaneBits{display:flex;gap:5px;flex-wrap:wrap}.q70LaneCount{text-align:right;color:#7fdca3;font-size:7px;font-weight:800}.q70Formula{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:12px;padding:10px;border:1px solid #355d4d;background:#082019;border-radius:10px;color:#9fc8ad;font-size:7.5px}.q70Formula strong{font-size:10px;color:#ddf8e5}.q70Arrow{color:#55876f}
@media(max-width:680px){.q70Legend{grid-template-columns:repeat(2,minmax(0,1fr))}.q70Lane{grid-template-columns:85px 1fr 38px}}
'''

_SCRIPT = r'''
<script>
/* BUILD 70: override only the Logical Space view; inference remains unchanged. */
q69Space=function(result,body){
  const legend=q69Text('div','','q70Legend');
  [
    ['CONDITION','One binary possibility represented in the space.'],
    ['GROUP','Mutually exclusive values for one question/property.'],
    ['ORACLE','Logic that constrains or pressures Conditions.'],
    ['SYNTRACT','The bound distribution after QCDS inference.']
  ].forEach(([a,b])=>{const x=q69Text('div','','q70LegendItem');x.appendChild(q69Text('strong',a));x.appendChild(q69Text('span',b));legend.appendChild(x)});body.appendChild(legend);

  const groups=result.dimension_groups||[];
  groups.forEach(group=>{
    const lane=q69Text('div','','q70Lane');const name=q69Text('div','','q70LaneName');name.appendChild(q69Text('b',group.group.toUpperCase()));name.appendChild(q69Text('span',group.meaning));lane.appendChild(name);
    const bits=q69Text('div','','q70LaneBits');(group.bits||[]).forEach(bit=>bits.appendChild(q69Chip(bit,group.group==='world')));lane.appendChild(bits);lane.appendChild(q69Text('div',group.bit_count+' bits','q70LaneCount'));body.appendChild(lane);
  });

  const worldBits=(groups.find(g=>g.group==='world')||{}).bit_count||0;
  const propertyBits=groups.filter(g=>g.group!=='world').reduce((n,g)=>n+Number(g.bit_count||0),0);
  const formula=q69Text('div','','q70Formula');formula.appendChild(q69Text('strong',worldBits+' world bits'));formula.appendChild(q69Text('span','+','q70Arrow'));formula.appendChild(q69Text('strong',propertyBits+' property bits'));formula.appendChild(q69Text('span','=','q70Arrow'));formula.appendChild(q69Text('strong',result.logical_width+' bits'));formula.appendChild(q69Text('span','→','q70Arrow'));formula.appendChild(q69Text('strong',result.candidate_binary_space+' = '+result.raw_state_count+' raw states'));body.appendChild(formula);

  const note=q69Text('div','','q69Equation');note.append('“Raw states” means every 0/1 combination before the logic has done its work. ');note.appendChild(q69Text('strong','OneHot + evidence + world rules'));note.append(' then shape that raw space into the TruthDistribution QCDS can bind.');body.appendChild(note);
};
</script>
'''


def living_robot_public_space70_html(*, static_mode: bool = False) -> str:
    html = _base_html(static_mode=static_mode)
    if "</style>" not in html or "</body>" not in html:
        raise RuntimeError("public surface changed; BUILD 70 Logical Space layer cannot attach safely")
    html = html.replace("</style>", _CSS + "\n</style>", 1)
    html = html.replace("</body>", _SCRIPT + "\n</body>", 1)
    return html


__all__ = ["living_robot_public_space70_html"]
