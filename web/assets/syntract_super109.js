/* BUILD 109 — eight-switch teaching view. Pure combinatorics, not QCDS inference. */
(function(){
  'use strict';
  const host=document.getElementById('s120-space'); if(!host)return;
  host.innerHTML=`
    <div class="s120ChapterHead"><div class="s120ChapterNo">01 · REPRESENT</div><div><h3>Eight switches. 256 exact settings.</h3><p class="s120ChapterIntro">Start with something ordinary: eight yes/no switches. Each can be 0 or 1, so together they have 2⁸ = 256 exact settings. The teaching grid below gives every exact setting its own lamp in the logical room.</p></div></div>
    <div class="s120Grid2">
      <div class="s120Card s120Teaching">
        <div class="s120Meta">BUILD 109 · THE SIMPLE DOOR</div>
        <h4>A rule can leave a switch free</h4>
        <p>Try a mask. <strong>0</strong> and <strong>1</strong> constrain a switch. <strong>?</strong> means that switch is present but this rule does not care whether it is 0 or 1.</p>
        <div class="s120MaskLine"><input id="s120MaskA" class="s120MaskInput" value="1011011?" maxlength="8" aria-label="Eight-bit mask"><span class="s120Count"><span id="s120MaskCount">2</span> <small>of 256 match</small></span></div>
        <div id="s120Switches" class="s120SwitchRow" aria-label="Eight logical switches"></div>
        <div id="s120MatchesText" class="s120Callout"></div>
      </div>
      <div class="s120Card s120Teaching">
        <div class="s120Meta">THE LOGICAL ROOM</div>
        <h4>One lamp for every exact setting</h4>
        <p>The lamps are not eight bits. The <strong>eight switches define which of the 256 exact settings are compatible with the mask.</strong></p>
        <div id="s120LampFieldA" class="s120LampField" aria-label="256 exact eight-bit settings"></div>
        <div class="s120Legend"><span><i></i>not matched</span><span><i class="a"></i>matched by this mask</span></div>
      </div>
    </div>`;

  const input=document.getElementById('s120MaskA'), switches=document.getElementById('s120Switches'), field=document.getElementById('s120LampFieldA');
  const count=document.getElementById('s120MaskCount'), text=document.getElementById('s120MatchesText');
  const states=Array.from({length:256},(_,i)=>i.toString(2).padStart(8,'0'));
  field.innerHTML=states.map(s=>`<span class="s120Lamp" data-state="${s}" title="${s}"></span>`).join('');
  const normalize=raw=>{
    let v=String(raw||'').toUpperCase().replace(/[^01?]/g,'').slice(0,8);
    return v.padEnd(8,'?');
  };
  const matches=(state,mask)=>[...mask].every((m,i)=>m==='?'||m===state[i]);
  function render(){
    const mask=normalize(input.value); input.value=mask;
    switches.innerHTML=[...mask].map((bit,i)=>`<div class="s120Bit ${bit==='?'?'free':''}"><b>${bit}</b><small>switch ${i+1}</small></div>`).join('');
    const hit=states.filter(s=>matches(s,mask)); count.textContent=String(hit.length);
    field.querySelectorAll('.s120Lamp').forEach(lamp=>lamp.classList.toggle('on',matches(lamp.dataset.state,mask)));
    const free=[...mask].filter(x=>x==='?').length;
    text.innerHTML=`<strong>${mask}</strong> leaves ${free} switch${free===1?'':'es'} free, so it describes <strong>2${free?'^'+free:''} = ${hit.length}</strong> exact setting${hit.length===1?'':'s'}${hit.length<=8?': <strong>'+hit.join(' · ')+'</strong>':'.'}`;
    window.dispatchEvent(new CustomEvent('s120-mask-a',{detail:{mask,hit}}));
  }
  input.addEventListener('input',render); render();
})();
