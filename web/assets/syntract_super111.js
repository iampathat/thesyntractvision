/* BUILD 111 — bias lens teaching view. No new stabilizer; explains canonical diagnostics only. */
(function(){
  'use strict';
  const host=document.getElementById('s120-bias'); if(!host)return;
  host.innerHTML=`
    <div class="s120ChapterHead"><div class="s120ChapterNo">02 · TEST THE VIEW</div><div><h3>Do not trust a bright result just because it is bright.</h3><p class="s120ChapterIntro">QCDS can ask closely related versions of the same logical question: what changes if one dimension is absent, if positions are rotated, or if oracle exposure changes? The purpose is to detect representation sensitivity before binding a higher-order result.</p></div></div>
    <div class="s120Grid2">
      <div class="s120Card s120Teaching">
        <div class="s120Meta">BUILD 111 · ROTATIONAL DIMENSION NULLING</div>
        <h4>Remove one dimension from the view — not from reality</h4>
        <p><strong>∅ is not 0 and it is not ?.</strong> It means that dimension is absent from this diagnostic view. QCDS compares the resulting distributions to see which dimensions carry information and which may be driving instability or bias.</p>
        <div id="s120ViewBank" class="s120ViewBank" style="margin-top:12px"></div>
      </div>
      <div class="s120Card">
        <div class="s120Meta">THE BIAS QUESTION</div>
        <h4>Would the conclusion survive another legitimate view?</h4>
        <div class="s120Callout">If a candidate is strong only because of one dimension, one slot position, or one oracle exposure, QCDS should make that sensitivity visible. If coherent structure persists across relevant views, the result is more stable.</div>
        <div class="s120Grid3" style="margin-top:10px">
          <div class="s120Card"><div class="s120Meta">NULL</div><h4>Dimension influence</h4><p>Compare what changes when b0, b1 … are absent in turn.</p></div>
          <div class="s120Card"><div class="s120Meta">POSITION</div><h4>Slot sensitivity</h4><p>Move the same dimensions through positions and inverse-map the return.</p></div>
          <div class="s120Card"><div class="s120Meta">ORACLE</div><h4>Oracle sensitivity</h4><p>Test whether one oracle placement or exposure dominates the result.</p></div>
        </div>
        <p style="margin-top:10px;font-size:9px;color:#78968b">The tiny counts at left are only a mask-combinatorics teaching aid. Real QCDS stabilization compares TruthDistributions, entropy/lift/agreement, peak persistence, contradiction behaviour and other diagnostics.</p>
      </div>
    </div>`;

  const bank=document.getElementById('s120ViewBank'), maskInput=document.getElementById('s120MaskA');
  function render(){
    const mask=(maskInput?.value||'1011011?').replace(/[^01?]/g,'').slice(0,8).padEnd(8,'?');
    const constrained=[...mask].filter(x=>x!=='?').length;
    bank.innerHTML=[...mask].map((bit,i)=>{
      const view=[...mask]; view[i]='∅';
      const activeConstrained=constrained-(bit==='?'?0:1);
      const projected=2**(7-activeConstrained);
      const note=bit==='?'?'mask already unconstrained here':'removing this constraint changes the projected support';
      return `<div class="s120View"><b>VIEW ${i+1} · null b${i}</b><code>${view.join('')}</code><span>${projected} projected exact states · ${note}</span></div>`;
    }).join('');
  }
  maskInput?.addEventListener('input',render); render();
})();
