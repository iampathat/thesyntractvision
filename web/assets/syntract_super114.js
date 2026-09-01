/* BUILD 114 — continuous re-entry story + honest browser round-trip timing from the existing Robotics QCDS surface. */
(function(){
  'use strict';
  const host=document.getElementById('s120-next'); if(!host)return;
  const block=document.createElement('div'); block.className='s120Card'; block.style.marginTop='13px';
  block.innerHTML=`
    <div class="s120Meta">BUILD 114 · THE LIVING LOOP</div>
    <h4>Reality changes. The same QCDS core runs again.</h4>
    <div class="s120Loop" style="margin-top:10px"><div class="s120LoopStep"><strong>OBSERVE</strong>new evidence / changed world</div><div class="s120LoopStep"><strong>REPRESENT</strong>Logical Space</div><div class="s120LoopStep"><strong>CONSTRAIN</strong>oracles / evidence</div><div class="s120LoopStep"><strong>INFER</strong>QCDS + diagnostics</div><div class="s120LoopStep"><strong>BIND</strong>TruthDistribution → Syntract</div><div class="s120LoopStep"><strong>ACT / ASK</strong>body or evidence plan</div></div>
    <div id="s120Timing" class="s120Timing" data-measured="0">No timing claim yet. Change the world in the existing Visual Logical Robot and this panel will report the <strong>measured browser round-trip</strong> from QCDS planning start until the returned route result is bound for the body.</div>
    <div class="s120Launch"><div><b>SEE THE LOOP IN THE EXISTING ROBOT BODY</b><span>The superbuild does not create another pathfinder or QCDS engine.</span></div><div class="s120LaunchActions"><button type="button" id="s120OpenRobot">OPEN VISUAL LOGICAL ROBOT</button></div></div>`;
  host.appendChild(block);
  document.getElementById('s120OpenRobot')?.addEventListener('click',()=>window.SYNTRACT_SUPERBUILD?.selectExistingView('robotics'));

  let started=null, runs=0;
  const install=()=>{
    const current=window.q79SetEmulating;
    if(typeof current!=='function'||current.__s120TimingWrapped)return false;
    function wrapped(active){
      if(active)started=performance.now();
      const result=current.apply(this,arguments);
      if(!active && started!==null){
        const elapsed=performance.now()-started; started=null; runs+=1;
        const out=document.getElementById('s120Timing');
        if(out){out.dataset.measured='1';out.innerHTML=`Latest measured <strong>browser QCDS route round-trip: ${elapsed.toFixed(1)} ms</strong> · run ${runs}. This is end-to-end timing in this browser for this bounded demo, not a universal QCDS speed claim.`}
      }
      return result;
    }
    wrapped.__s120TimingWrapped=true; wrapped.__s120Base=current; window.q79SetEmulating=wrapped; return true;
  };
  if(!install())setTimeout(install,0);
})();
