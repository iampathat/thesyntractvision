from __future__ import annotations

from .living_robot_public_trace72 import living_robot_public_trace72_html as _base_html


_CSS = r'''
/* BUILD 75: live Robotics Playground — draw reality, create oracles, re-infer route space. */
body.publicCompact:not(.publicViewRobotics) #public-robotics{display:none!important}
.publicRobotics{max-width:1800px;margin:10px auto 0;padding:0 14px}.publicRoboticsInner{border:1px solid #385d72;background:linear-gradient(145deg,#061b25,#071a18);border-radius:16px;padding:15px;box-shadow:0 14px 40px #0003}.publicRoboticsHead{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.publicRoboticsKicker{font-size:7px;letter-spacing:.14em;text-transform:uppercase;color:#8ce3b2}.publicRoboticsHead h2{font-size:22px;margin:4px 0 6px}.publicRoboticsHead p{font-size:8px;line-height:1.55;color:#8ba8b4;max-width:1050px;margin:0}.publicRoboticsExplain{max-width:410px;border-left:3px solid #6ccf99;background:#082019;padding:9px 11px;font-size:7.2px;line-height:1.5;color:#91b6a0}.publicRoboticsExplain strong{color:#d7f5df}.publicRoboticsTools{display:flex;gap:6px;flex-wrap:wrap;margin:11px 0 9px}.publicRoboticsTools button{padding:7px 9px;font-size:7px}.publicRoboticsTools button.active{background:#d8f7e2;color:#082117;border-color:#d8f7e2}.publicRoboticsStage{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(280px,.65fr);gap:10px;align-items:start}.publicRobotCanvasWrap{position:relative;border:1px solid #31536b;background:#04131b;border-radius:13px;padding:8px;overflow:hidden}.publicRobotCanvasWrap canvas{display:block;width:100%;aspect-ratio:5/3;border-radius:8px;touch-action:none;cursor:crosshair;background:#061923}.publicRobotHint{position:absolute;left:17px;bottom:15px;border:1px solid #31536b;background:#06131de8;border-radius:999px;padding:5px 8px;font-size:6.5px;color:#9bb4bf;pointer-events:none}.publicRobotPanel{display:flex;flex-direction:column;gap:8px}.publicRobotStatus{border:1px solid #31536b;background:#06151d;border-radius:10px;padding:9px;font-size:7.3px;line-height:1.5;color:#8faab8}.publicRobotStatus.good{border-color:#36684c;background:#081d15;color:#b6eac6}.publicRobotStatus.warn{border-color:#755e35;background:#211a0d;color:#e9c98e}.publicRobotStats{display:grid;grid-template-columns:1fr 1fr;gap:6px}.publicRobotStat{border:1px solid #29495a;background:#06141c;border-radius:9px;padding:8px}.publicRobotStat b{display:block;font-size:5.8px;letter-spacing:.1em;text-transform:uppercase;color:#7399aa}.publicRobotStat strong{display:block;margin-top:3px;font-size:10px;color:#e1f1f6}.publicRobotFlow{border:1px solid #29495a;background:#06141c;border-radius:10px;padding:9px;font-size:6.8px;line-height:1.5;color:#7999a7}.publicRobotFlow strong{color:#ccebd7}.publicRobotOracleList{max-height:170px;overflow:auto;border:1px solid #29495a;background:#06141c;border-radius:10px;padding:8px}.publicRobotOracleList h4{font-size:6.5px;letter-spacing:.1em;text-transform:uppercase;color:#8fd2ac;margin:0 0 6px}.publicRobotOracle{border-top:1px solid #17323e;padding:5px 0;font:6.2px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;color:#87a6b2}.publicRobotOracle:first-of-type{border-top:0}.publicRobotQuantum{margin-top:10px;border:1px solid #54496e;background:linear-gradient(135deg,#100d1a,#071724);border-radius:11px;padding:10px;font-size:7.3px;line-height:1.55;color:#aaa0bf}.publicRobotQuantum strong{color:#ddd3f0}.publicRobotLegend{display:flex;gap:10px;flex-wrap:wrap;margin-top:7px;font-size:6.4px;color:#7896a3}.publicRobotLegend span:before{content:'';display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:4px;vertical-align:-1px}.publicRobotLegend .possible:before{background:#173c50}.publicRobotLegend .route:before{background:#77dba0}.publicRobotLegend .wall:before{background:#29353d}.publicRobotLegend .goal:before{background:#7da9ff}
@media(max-width:950px){.publicRoboticsHead{display:block}.publicRoboticsExplain{max-width:none;margin-top:9px}.publicRoboticsStage{grid-template-columns:1fr}.publicRobotOracleList{max-height:130px}}@media(max-width:700px){.publicRobotics{padding:0 8px}.publicRoboticsInner{padding:11px}.publicRoboticsHead h2{font-size:19px}.publicRobotStats{grid-template-columns:repeat(2,1fr)}}
'''

_SECTION = r'''
<section class="publicRobotics" id="public-robotics">
  <div class="publicRoboticsInner">
    <div class="publicRoboticsHead">
      <div>
        <div class="publicRoboticsKicker">ROBOTICS PLAYGROUND · QCDS ROUTE SPACE</div>
        <h2>Draw reality. Watch the robot re-infer the route.</h2>
        <p>The robot moves from A to B. Draw walls with a finger or mouse. Every drawn cell becomes an explicit obstacle oracle in the represented route space, and the route distribution is recomputed from the robot's current position.</p>
      </div>
      <div class="publicRoboticsExplain"><strong>The quantum idea:</strong> do not test one route, fail, then try another. Represent route alternatives together, let oracle logic remove incoherent states, and bind the minimum-depth surviving route family.</div>
    </div>
    <div class="publicRoboticsTools">
      <button type="button" id="q75Draw" class="active" onclick="q75SetTool('draw')">DRAW WALL</button>
      <button type="button" id="q75Erase" onclick="q75SetTool('erase')">ERASE</button>
      <button type="button" onclick="q75Clear()">CLEAR WORLD</button>
      <button type="button" id="q75RunToggle" onclick="q75ToggleRun()">PAUSE ROBOT</button>
      <button type="button" onclick="q75ResetRobot()">RESET A → B</button>
    </div>
    <div class="publicRoboticsStage">
      <div class="publicRobotCanvasWrap">
        <canvas id="q75Canvas" width="1000" height="600" aria-label="Interactive Robotics Playground"></canvas>
        <div class="publicRobotHint">DRAW / ERASE DIRECTLY ON THE WORLD</div>
      </div>
      <aside class="publicRobotPanel">
        <div class="publicRobotStatus" id="q75Status">Open the playground to initialize the QCDS route space.</div>
        <div class="publicRobotStats">
          <div class="publicRobotStat"><b>Position Conditions</b><strong id="q75Conditions">240</strong></div>
          <div class="publicRobotStat"><b>Active oracles</b><strong id="q75Oracles">3</strong></div>
          <div class="publicRobotStat"><b>Shortest steps</b><strong id="q75Steps">—</strong></div>
          <div class="publicRobotStat"><b>Shortest routes alive</b><strong id="q75Routes">—</strong></div>
        </div>
        <div class="publicRobotFlow"><strong>1 Condition Formation</strong> · position space<br><strong>2 Conditional Evolution</strong> · your drawn obstacle oracles<br><strong>3 Recursive Inference</strong> · complete viable frontier evolves together<br><strong>4 Truth Alignment</strong> · minimum-depth route family binds</div>
        <div class="publicRobotOracleList" id="q75OracleList"><h4>Oracle space</h4><div class="publicRobotOracle">grid:bounds · stay inside world</div><div class="publicRobotOracle">motion:adjacent · one-cell motion</div><div class="publicRobotOracle">goal:reach · reach B at minimum depth</div></div>
      </aside>
    </div>
    <div class="publicRobotLegend"><span class="possible">simultaneously reachable states</span><span class="route">representative shortest route</span><span class="wall">drawn oracle / blocked</span><span class="goal">goal B</span></div>
    <div class="publicRobotQuantum"><strong>What is quantum here?</strong> A quantum implementation can represent alternatives in superposition and let oracle operations act over that represented space. This browser version classically emulates the same parallel-state logic so you can see it. It is not a quantum computer and makes no quantum-speedup claim.</div>
  </div>
</section>
'''

_SCRIPT = r'''
<script>
const Q75={w:20,h:12,start:[1,6],goal:[18,6],robot:[1,6],blocked:new Set(),tool:'draw',running:true,result:null,path:[],pathIndex:0,timer:null,planSeq:0,planTimer:null,ready:false};
function q75Key(x,y){return x+','+y}
function q75CellFromEvent(e){const c=document.getElementById('q75Canvas'),r=c.getBoundingClientRect();return [Math.max(0,Math.min(Q75.w-1,Math.floor((e.clientX-r.left)/r.width*Q75.w))),Math.max(0,Math.min(Q75.h-1,Math.floor((e.clientY-r.top)/r.height*Q75.h)))]}
function q75Status(text,kind=''){const e=document.getElementById('q75Status');if(e){e.className='publicRobotStatus '+kind;e.textContent=text}}
function q75SetTool(tool){Q75.tool=tool;document.getElementById('q75Draw')?.classList.toggle('active',tool==='draw');document.getElementById('q75Erase')?.classList.toggle('active',tool==='erase')}
function q75Payload(){return {width:Q75.w,height:Q75.h,start:Q75.robot,goal:Q75.goal,blocked:Array.from(Q75.blocked,v=>v.split(',').map(Number))}}
function q75WorkerRun(payload){return new Promise((resolve,reject)=>{const worker=build35Worker(),id=++BUILD35_REQUEST;BUILD35_PENDING.set(id,{resolve,reject});worker.postMessage({type:'robotics_playground_run',id,payload})})}
function q75SchedulePlan(){clearTimeout(Q75.planTimer);Q75.planTimer=setTimeout(q75Plan,45)}
async function q75Plan(){const seq=++Q75.planSeq;q75Status('Oracle space changed · re-inferring all viable route states…');try{const result=await q75WorkerRun(q75Payload());if(seq!==Q75.planSeq)return;Q75.result=result;Q75.path=result.representative_shortest_path||[];Q75.pathIndex=0;q75UpdatePanel();q75DrawWorld();if(result.reachable)q75Status('QCDS route space aligned · '+result.shortest_path_count+' shortest route'+(result.shortest_path_count===1?'':'s')+' survive at depth '+result.shortest_steps+'.','good');else q75Status('No coherent route reaches B. Erase an obstacle oracle to reopen the space.','warn')}catch(e){if(seq===Q75.planSeq)q75Status('Route inference failed: '+(e.message||String(e)),'warn')}}
function q75UpdatePanel(){const r=Q75.result;if(!r)return;document.getElementById('q75Conditions').textContent=r.cell_condition_count;document.getElementById('q75Oracles').textContent=r.oracle_summary.total;document.getElementById('q75Steps').textContent=r.reachable?r.shortest_steps:'—';document.getElementById('q75Routes').textContent=r.reachable?Number(r.shortest_path_count).toLocaleString():'0';const list=document.getElementById('q75OracleList');list.innerHTML='<h4>Oracle space · '+r.oracle_summary.total+' active</h4>';r.oracles.slice(0,16).forEach(o=>{const d=document.createElement('div');d.className='publicRobotOracle';d.textContent=o.oracle_id+' · '+o.logic;list.appendChild(d)});if(r.oracles.length>16){const d=document.createElement('div');d.className='publicRobotOracle';d.textContent='… '+(r.oracles.length-16)+' more drawn obstacle oracles';list.appendChild(d)}}
function q75DrawRobot(ctx,cw,ch){const x=(Q75.robot[0]+.5)*cw,y=(Q75.robot[1]+.5)*ch,s=Math.min(cw,ch)*.55;ctx.save();ctx.translate(x,y);ctx.fillStyle='#d9f8e4';ctx.strokeStyle='#61b988';ctx.lineWidth=Math.max(1,s*.08);ctx.beginPath();ctx.roundRect(-s*.5,-s*.42,s,s*.78,s*.18);ctx.fill();ctx.stroke();ctx.fillStyle='#082117';ctx.beginPath();ctx.arc(-s*.18,-s*.1,s*.07,0,Math.PI*2);ctx.arc(s*.18,-s*.1,s*.07,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#8ce3b2';ctx.beginPath();ctx.moveTo(0,-s*.42);ctx.lineTo(0,-s*.62);ctx.stroke();ctx.beginPath();ctx.arc(0,-s*.68,s*.06,0,Math.PI*2);ctx.fillStyle='#8ce3b2';ctx.fill();ctx.restore()}
function q75DrawWorld(){const canvas=document.getElementById('q75Canvas');if(!canvas)return;const ctx=canvas.getContext('2d'),cw=canvas.width/Q75.w,ch=canvas.height/Q75.h;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#061923';ctx.fillRect(0,0,canvas.width,canvas.height);
 const layers=Q75.result?.frontier_layers||[];layers.forEach((layer,depth)=>{const a=.05+.12*(1-depth/Math.max(1,layers.length));ctx.fillStyle='rgba(72,162,205,'+Math.max(.025,a)+')';layer.forEach(([x,y])=>ctx.fillRect(x*cw+1,y*ch+1,cw-2,ch-2))});
 ctx.strokeStyle='#12303d';ctx.lineWidth=1;for(let x=0;x<=Q75.w;x++){ctx.beginPath();ctx.moveTo(x*cw,0);ctx.lineTo(x*cw,canvas.height);ctx.stroke()}for(let y=0;y<=Q75.h;y++){ctx.beginPath();ctx.moveTo(0,y*ch);ctx.lineTo(canvas.width,y*ch);ctx.stroke()}
 Q75.blocked.forEach(k=>{const [x,y]=k.split(',').map(Number);ctx.fillStyle='#2d3940';ctx.fillRect(x*cw+1,y*ch+1,cw-2,ch-2);ctx.strokeStyle='#59636a';ctx.strokeRect(x*cw+3,y*ch+3,cw-6,ch-6)});
 const p=Q75.result?.representative_shortest_path||[];if(p.length){ctx.strokeStyle='#77dba0';ctx.lineWidth=Math.max(3,Math.min(cw,ch)*.18);ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();p.forEach(([x,y],i)=>{const px=(x+.5)*cw,py=(y+.5)*ch;i?ctx.lineTo(px,py):ctx.moveTo(px,py)});ctx.stroke()}
 const [sx,sy]=Q75.start,[gx,gy]=Q75.goal;ctx.fillStyle='#72d59a';ctx.beginPath();ctx.arc((sx+.5)*cw,(sy+.5)*ch,Math.min(cw,ch)*.29,0,Math.PI*2);ctx.fill();ctx.fillStyle='#061923';ctx.font='bold '+Math.max(14,Math.min(cw,ch)*.35)+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('A',(sx+.5)*cw,(sy+.5)*ch);ctx.fillStyle='#7da9ff';ctx.beginPath();ctx.arc((gx+.5)*cw,(gy+.5)*ch,Math.min(cw,ch)*.31,0,Math.PI*2);ctx.fill();ctx.fillStyle='#061923';ctx.fillText('B',(gx+.5)*cw,(gy+.5)*ch);q75DrawRobot(ctx,cw,ch)}
function q75ApplyCell(x,y){const key=q75Key(x,y);if(key===q75Key(...Q75.start)||key===q75Key(...Q75.goal)||key===q75Key(...Q75.robot))return;const before=Q75.blocked.has(key);if(Q75.tool==='draw')Q75.blocked.add(key);else Q75.blocked.delete(key);if(before!==Q75.blocked.has(key)){q75DrawWorld();q75SchedulePlan()}}
function q75BindCanvas(){const c=document.getElementById('q75Canvas');if(!c||c.dataset.bound)return;c.dataset.bound='1';let down=false;c.addEventListener('pointerdown',e=>{down=true;c.setPointerCapture?.(e.pointerId);const [x,y]=q75CellFromEvent(e);q75ApplyCell(x,y)});c.addEventListener('pointermove',e=>{if(!down)return;const [x,y]=q75CellFromEvent(e);q75ApplyCell(x,y)});const up=()=>down=false;c.addEventListener('pointerup',up);c.addEventListener('pointercancel',up);c.addEventListener('pointerleave',e=>{if(e.buttons===0)down=false})}
function q75Tick(){if(!Q75.running||!Q75.result?.reachable||Q75.path.length<2)return;const currentKey=q75Key(...Q75.robot);let idx=Q75.path.findIndex(c=>q75Key(...c)===currentKey);if(idx<0)idx=0;if(idx+1<Q75.path.length){Q75.robot=[...Q75.path[idx+1]];q75DrawWorld()}else{Q75.running=false;document.getElementById('q75RunToggle').textContent='RUN AGAIN';q75Status('Robot reached B. The body followed one representative member of the bound shortest-route family.','good')}}
function q75ToggleRun(){if(q75Key(...Q75.robot)===q75Key(...Q75.goal)){Q75.robot=[...Q75.start];Q75.running=true;document.getElementById('q75RunToggle').textContent='PAUSE ROBOT';q75Plan();return}Q75.running=!Q75.running;document.getElementById('q75RunToggle').textContent=Q75.running?'PAUSE ROBOT':'RUN ROBOT';q75DrawWorld()}
function q75Clear(){Q75.blocked.clear();q75Plan()}
function q75ResetRobot(){Q75.robot=[...Q75.start];Q75.running=true;document.getElementById('q75RunToggle').textContent='PAUSE ROBOT';q75Plan()}
function q75Activate(){q75BindCanvas();q75DrawWorld();if(!Q75.ready){Q75.ready=true;q75Plan();Q75.timer=setInterval(q75Tick,230)}}
</script>
'''


def living_robot_public_robotics75_html(*, static_mode: bool = False) -> str:
    html = _base_html(static_mode=static_mode)
    class_anchor = "const PUBLIC_VIEW_CLASSES=['publicViewQcds','publicViewLegal','publicViewSyntract','publicViewAdvanced'];"
    nav_anchor = '<button type="button" data-public-view="syntract" onclick="publicSelectView(\'syntract\')">SYNTRACTS · NEW</button>'
    branch_anchor = " else if(view==='syntract')document.body.classList.add('publicViewSyntract');\n else{view='qcds';document.body.classList.add('publicViewQcds')}"
    if any(anchor not in html for anchor in ("</style>", "</body>", class_anchor, nav_anchor, branch_anchor)):
        raise RuntimeError("public surface changed; BUILD 75 Robotics Playground cannot attach safely")
    html = html.replace("</style>", _CSS + "\n</style>", 1)
    html = html.replace(
        nav_anchor,
        '<button type="button" data-public-view="robotics" onclick="publicSelectView(\'robotics\')">ROBOTICS PLAYGROUND</button>\n      ' + nav_anchor,
        1,
    )
    html = html.replace(
        class_anchor,
        "const PUBLIC_VIEW_CLASSES=['publicViewQcds','publicViewLegal','publicViewRobotics','publicViewSyntract','publicViewAdvanced'];",
        1,
    )
    html = html.replace(
        branch_anchor,
        " else if(view==='robotics'){document.body.classList.add('publicViewRobotics');setTimeout(q75Activate,0)}\n else if(view==='syntract')document.body.classList.add('publicViewSyntract');\n else{view='qcds';document.body.classList.add('publicViewQcds')}",
        1,
    )
    html = html.replace("</body>", _SECTION + "\n" + _SCRIPT + "\n</body>", 1)
    return html


__all__ = ["living_robot_public_robotics75_html"]
