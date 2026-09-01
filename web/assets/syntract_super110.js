/* BUILD 110 — oracle-mask overlap teaching view. Intersections, never additive lamp counts. */
(function(){
  'use strict';
  const host=document.getElementById('s120-space'); if(!host)return;
  const block=document.createElement('div');
  block.className='s120Card s120Teaching'; block.style.marginTop='13px';
  block.innerHTML=`
    <div class="s120Meta">BUILD 110 · MULTIPLE RULES, SAME ROOM</div>
    <h4>Rules do not add lamps. They constrain the same 256 settings.</h4>
    <p>If one rule matches 2 settings and another matches 8, that does <strong>not</strong> mean 10 settings survive. What matters is the overlap: the exact settings that satisfy both rules.</p>
    <div class="s120Grid2" style="margin-top:12px">
      <div>
        <div class="s120MaskLine"><label for="s120MaskB" class="s120Meta" style="margin:0">RULE B</label><input id="s120MaskB" class="s120MaskInput" value="10110???" maxlength="8"></div>
        <div class="s120OverlapStats"><div class="s120Stat"><b id="s120CountA2">2</b><span>Rule A matches</span></div><div class="s120Stat"><b id="s120CountB">8</b><span>Rule B matches</span></div><div class="s120Stat"><b id="s120CountOverlap">2</b><span>Both rules match</span></div></div>
        <div id="s120OverlapExplain" class="s120Callout" style="margin-top:10px"></div>
      </div>
      <div><div id="s120LampFieldOverlap" class="s120LampField"></div><div class="s120Legend"><span><i class="a"></i>A only</span><span><i class="b"></i>B only</span><span><i class="o"></i>A ∩ B</span></div></div>
    </div>`;
  host.appendChild(block);

  const states=Array.from({length:256},(_,i)=>i.toString(2).padStart(8,'0'));
  const inputA=document.getElementById('s120MaskA'), inputB=document.getElementById('s120MaskB');
  const field=document.getElementById('s120LampFieldOverlap');
  field.innerHTML=states.map(s=>`<span class="s120Lamp" data-state="${s}" title="${s}"></span>`).join('');
  const normalize=raw=>String(raw||'').replace(/[^01?]/g,'').slice(0,8).padEnd(8,'?');
  const match=(s,m)=>[...m].every((x,i)=>x==='?'||x===s[i]);
  function render(){
    const a=normalize(inputA?.value||'1011011?'), b=normalize(inputB.value); inputB.value=b;
    const A=states.filter(s=>match(s,a)), B=states.filter(s=>match(s,b));
    const setA=new Set(A), setB=new Set(B), overlap=A.filter(s=>setB.has(s));
    document.getElementById('s120CountA2').textContent=A.length;
    document.getElementById('s120CountB').textContent=B.length;
    document.getElementById('s120CountOverlap').textContent=overlap.length;
    field.querySelectorAll('.s120Lamp').forEach(l=>{
      const aa=setA.has(l.dataset.state), bb=setB.has(l.dataset.state);
      l.className='s120Lamp'+(aa&&bb?' overlap':aa?' on':bb?' secondary':'');
    });
    document.getElementById('s120OverlapExplain').innerHTML=`Rule A matches <strong>${A.length}</strong>. Rule B matches <strong>${B.length}</strong>. Together they leave <strong>${overlap.length}</strong> setting${overlap.length===1?'':'s'} that satisfy both${overlap.length<=10?': <strong>'+overlap.join(' · ')+'</strong>':'.'}`;
  }
  inputB.addEventListener('input',render); inputA?.addEventListener('input',render); window.addEventListener('s120-mask-a',render); render();
})();
