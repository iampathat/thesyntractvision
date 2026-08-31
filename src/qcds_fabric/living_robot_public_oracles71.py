from __future__ import annotations

from .living_robot_public_space70 import living_robot_public_space70_html as _base_html


_CSS = r'''
/* BUILD 71: make Oracle Space explain the logic of the actual run. */
.q71Why{margin:10px 0 12px;border:1px solid #5f805f;background:#102018;border-radius:11px;padding:11px}.q71WhyKicker{font-size:6.3px;letter-spacing:.13em;text-transform:uppercase;color:#8ed9a7}.q71Why strong{display:block;margin-top:5px;color:#e0f6e5;font-size:8.5px;line-height:1.4}.q71Why p{margin:5px 0 0;color:#98b6a0;font-size:7px;line-height:1.5}
.q71OracleMap{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:9px 0 12px}.q71OracleType{border:1px solid #284b56;border-radius:10px;padding:10px;background:#06151c}.q71OracleType b{display:block;font-size:9px;color:#d1f0da}.q71OracleType span{display:block;margin-top:4px;color:#789aa7;font-size:6.5px;line-height:1.45}.q71OracleType em{display:inline-block;margin-top:7px;font-size:12px;font-style:normal;color:#7cdda2;font-weight:800}
.q71WorldRule{border-top:1px solid #24443a;padding:8px 0}.q71WorldRule:first-child{border-top:0}.q71WorldRule b{display:block;color:#ccefd6;font-size:7.5px}.q71WorldRule .q69Chips{margin-top:6px}
@media(max-width:680px){.q71OracleMap{grid-template-columns:1fr}}
'''

_SCRIPT = r'''
<script>
/* BUILD 71: Oracle Space is derived from the Python result, including missing evidence. */
function q71MissingEvidence(result){
  const observed=new Set((result.observations||[]).map(o=>o.predicate));
  return (result.property_dimensions||[]).filter(p=>!observed.has(p));
}
function q71TieReason(result){
  const leaders=result.leading_candidates||[];if(leaders.length<2)return null;
  const defs=result.world_definitions||{},missing=q71MissingEvidence(result),differences=[];
  missing.forEach(predicate=>{const values=[...new Set(leaders.map(name=>(defs[name]||{})[predicate]))];if(values.length>1)differences.push({predicate:predicate,values:values})});
  return differences.length?differences:null;
}
function q71WorldRules(items){
  const byWorld={};(items||[]).forEach(item=>{const world=String(item.antecedent||'').replace(/^world=/,'');(byWorld[world]||(byWorld[world]=[])).push(item)});
  const wrap=q69Text('div','');Object.entries(byWorld).forEach(([world,rules])=>{const row=q69Text('div','','q71WorldRule');row.appendChild(q69Text('b','IF WORLD = '+world.toUpperCase()));const chips=q69Text('div','','q69Chips');rules.forEach(rule=>chips.appendChild(q69Chip('→ '+String(rule.consequent||''),false)));row.appendChild(chips);wrap.appendChild(row)});return wrap;
}
q69Oracles=function(result,body){
  const sum=result.oracle_summary||{},groups=result.oracle_groups||{};
  const map=q69Text('div','','q71OracleMap');
  [
    ['STRUCTURAL','Keeps each value group internally valid: exactly one world, one obstacle value, etc.',sum.structural],
    ['EVIDENCE','Represents observations. These are the facts currently pressing on the space.',sum.evidence],
    ['LOGICAL','Defines what each complete world implies about its properties.',sum.logical]
  ].forEach(([name,text,count])=>{const card=q69Text('div','','q71OracleType');card.appendChild(q69Text('b',name));card.appendChild(q69Text('span',text));card.appendChild(q69Text('em',String(count||0)));map.appendChild(card)});body.appendChild(map);

  const why=q69Text('div','','q71Why');why.appendChild(q69Text('div','WHY THIS RUN ENDS WHERE IT DOES','q71WhyKicker'));
  const tie=q71TieReason(result),missing=q71MissingEvidence(result);
  if(tie){
    why.appendChild(q69Text('strong','No evidence oracle resolves '+tie.map(x=>x.predicate).join(', ')+'.'));
    why.appendChild(q69Text('p','The tied worlds differ there: '+tie.map(x=>x.predicate+' = '+x.values.join(' vs ')).join(' · ')+'. QCDS therefore preserves the tie instead of inventing a winner.'));
  }else if(missing.length){
    why.appendChild(q69Text('strong','Unobserved properties remain explicit: '+missing.join(', ')+'.'));
    why.appendChild(q69Text('p','They are still represented in Logical Space, but there is no evidence oracle for them in this run. Other logic may still constrain them.'));
  }else{
    why.appendChild(q69Text('strong','Every represented property has an evidence oracle in this run.'));
    why.appendChild(q69Text('p','The leading world emerges from the combined structural, evidence and world-definition logic — not from browser scoring.'));
  }
  body.appendChild(why);

  const totals=q69Text('div','','q69OracleStats');[['ALL ACTIVE',sum.total],['STRUCTURAL',sum.structural],['EVIDENCE',sum.evidence],['WORLD RULES',sum.logical]].forEach(([k,v])=>{const x=q69Text('div','','q69Stat');x.appendChild(q69Text('strong',String(v||0)));x.appendChild(q69Text('span',k));totals.appendChild(x)});body.appendChild(totals);

  const structural=document.createElement('details');structural.className='q69Details';structural.open=true;structural.appendChild(q69Text('summary','STRUCTURAL ORACLES · '+sum.structural));structural.appendChild(q69OracleRows(groups.structural||[]));body.appendChild(structural);
  const evidence=document.createElement('details');evidence.className='q69Details';evidence.open=true;evidence.appendChild(q69Text('summary','EVIDENCE ORACLES · '+sum.evidence));evidence.appendChild(q69OracleRows(groups.evidence||[]));body.appendChild(evidence);
  const logical=document.createElement('details');logical.className='q69Details';logical.open=false;logical.appendChild(q69Text('summary','WORLD → PROPERTY ORACLES · '+sum.logical));logical.appendChild(q71WorldRules(groups.logical||[]));body.appendChild(logical);
};
</script>
'''


def living_robot_public_oracles71_html(*, static_mode: bool = False) -> str:
    html = _base_html(static_mode=static_mode)
    if "</style>" not in html or "</body>" not in html:
        raise RuntimeError("public surface changed; BUILD 71 Oracle Space layer cannot attach safely")
    html = html.replace("</style>", _CSS + "\n</style>", 1)
    html = html.replace("</body>", _SCRIPT + "\n</body>", 1)
    return html


__all__ = ["living_robot_public_oracles71_html"]
