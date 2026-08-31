from __future__ import annotations

from .living_robot_public_robotics75 import living_robot_public_robotics75_html as _base_html


_SCRIPT = r'''
<script>
/* BUILD 77: panel reads the actual QCDS/SyntractSystem route contract. */
q75UpdatePanel=function(){
  const r=Q75.result;if(!r)return;
  const conditions=document.getElementById('q75Conditions');
  const oracles=document.getElementById('q75Oracles');
  if(conditions)conditions.textContent=r.logical_width+' · '+r.candidate_binary_space;
  if(oracles)oracles.textContent=r.oracle_summary.active_last_recursive_pass;
  document.getElementById('q75Steps').textContent=r.reachable?r.shortest_steps:'—';
  document.getElementById('q75Routes').textContent=r.reachable?Number(r.shortest_path_count).toLocaleString():'0';
  const list=document.getElementById('q75OracleList');
  list.innerHTML='<h4>Oracle space · core execution</h4>';
  (r.oracles||[]).slice(0,18).forEach(o=>{const d=document.createElement('div');d.className='publicRobotOracle';d.textContent=o.oracle_id+' · '+o.logic;list.appendChild(d)});
  if((r.oracles||[]).length>18){const d=document.createElement('div');d.className='publicRobotOracle';d.textContent='… '+(r.oracles.length-18)+' more explicit oracle constraints';list.appendChild(d)}
};
</script>
'''


def living_robot_public_robotics77_html(*, static_mode: bool = False) -> str:
    html = _base_html(static_mode=static_mode)
    replacements = {
        '<b>Position Conditions</b><strong id="q75Conditions">240</strong>': '<b>QCDS position bits</b><strong id="q75Conditions">8 · 2^8</strong>',
        '<b>Active oracles</b><strong id="q75Oracles">3</strong>': '<b>Active core oracles</b><strong id="q75Oracles">2</strong>',
        '<div class="publicRobotQuantum"><strong>What is quantum here?</strong> A quantum implementation can represent alternatives in superposition and let oracle operations act over that represented space. This browser version classically emulates the same parallel-state logic so you can see it. It is not a quantum computer and makes no quantum-speedup claim.</div>': '<div class="publicRobotQuantum"><strong>What is quantum here?</strong> The 240 grid cells are encoded inside 8 binary QCDS Conditions: 2^8 = 256 candidate position states. Each world edit is sent through SyntractSystem into the same QCDS Fabric core; the complete TruthDistribution re-enters the next recursive pass. This browser uses the classical reference substrate. A quantum substrate can preserve the same logical contract, but this demo makes no quantum-speedup claim.</div>',
    }
    for old, new in replacements.items():
        if old not in html:
            raise RuntimeError("Robotics public contract changed; BUILD 77 cannot expose core semantics safely")
        html = html.replace(old, new, 1)
    if "</body>" not in html:
        raise RuntimeError("Robotics public body missing; BUILD 77 cannot attach core panel")
    html = html.replace("</body>", _SCRIPT + "\n</body>", 1)
    return html


__all__ = ["living_robot_public_robotics77_html"]
