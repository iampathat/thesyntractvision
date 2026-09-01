/* BUILD 112 — distribution-first public explanation. Presentation only. */
(function(){
  'use strict';
  const host=document.getElementById('s120-holds'); if(!host)return;
  const values=[46,44,7,3];
  host.innerHTML=`
    <div class="s120ChapterHead"><div class="s120ChapterNo">03 · WHAT HOLDS</div><div><h3>The result can be a pattern, not one forced answer.</h3><p class="s120ChapterIntro">QCDS is distribution-first. If evidence still supports more than one coherent state, that uncertainty remains part of the result. Stabilization is not allowed to manufacture certainty simply because a user would prefer one answer.</p></div></div>
    <div class="s120Grid2">
      <div class="s120Card s120Teaching">
        <div class="s120Meta">BUILD 112 · OUTPUT SEMANTICS</div>
        <h4>An illustrative stabilized distribution</h4>
        <div class="s120Distribution">${values.map((v,i)=>`<div class="s120BarWrap"><div class="s120Bar ${i===1?'alt':''}" style="height:${v*2.35}px"></div><small>${['A','B','C','D'][i]} · ${v}%</small></div>`).join('')}</div>
        <div class="s120Uncertainty"><span class="s120Pill good">A remains strong</span><span class="s120Pill good">B remains strong</span><span class="s120Pill warn">NO FALSE COLLAPSE</span></div>
        <p style="margin-top:10px;font-size:9px;color:#78968b">Illustration only — these percentages are not claimed to come from a live QCDS run. The existing QCDS surfaces expose actual run distributions.</p>
      </div>
      <div class="s120Card">
        <div class="s120Meta">WHY THIS MATTERS</div>
        <h4>A tie is not a failure.</h4>
        <div class="s120Callout">If A and B both survive the evidence and the bias checks, the honest result may be: <strong>“A and B still hold; current evidence cannot distinguish them.”</strong></div>
        <div class="s120Grid2" style="margin-top:10px"><div class="s120Card"><h4>Keep the structure</h4><p>The full TruthDistribution can be bound into a Syntract and carried forward without throwing away uncertainty.</p></div><div class="s120Card"><h4>Use the uncertainty</h4><p>The remaining disagreement tells the system where new evidence can be most valuable.</p></div></div>
      </div>
    </div>`;
})();
