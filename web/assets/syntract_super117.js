/* BUILD 117 — Syntract recursion and higher-order re-entry. Presentation only. */
(function(){
  'use strict';
  const host=document.getElementById('s120-recursion'); if(!host)return;
  host.innerHTML=`
    <div class="s120ChapterHead"><div class="s120ChapterNo">07 · RECURSE</div><div><h3>A Syntract can become part of the next question.</h3><p class="s120ChapterIntro">A bound Syntract does not have to be flattened to one winning label. Its complete TruthDistribution can re-enter QCDS as structured evidence inside a larger Logical Space, where explicit cross-oracles test relationships between whole prior results.</p></div></div>
    <div class="s120Card">
      <div class="s120Meta">BUILD 117 · HIGHER-ORDER SYNTRACT</div>
      <div class="s120SyntractFlow">
        <div class="s120SyntractSources">
          <div class="s120Syntract"><b>SYNTRACT A · complete distribution</b><span>One coherent result with uncertainty preserved.</span></div>
          <div class="s120Syntract"><b>SYNTRACT B · complete distribution</b><span>A second branch keeps its own distribution and provenance.</span></div>
          <div class="s120Syntract"><b>SYNTRACT C · complete distribution</b><span>A third branch can represent another domain, body or level of analysis.</span></div>
        </div>
        <div class="s120FlowArrow">→</div>
        <div class="s120Higher"><b>JOINT LOGICAL SPACE → QCDS → HIGHER-ORDER SYNTRACT</b><p>The branch distributions re-enter through DistributionOracles. Only explicit cross-oracles add logic between branches. The resulting higher-order Syntract may itself re-enter another cycle.</p></div>
      </div>
      <div class="s120Uncertainty"><span class="s120Pill good">NO VOTING</span><span class="s120Pill good">NO HARD COLLAPSE</span><span class="s120Pill good">NO SEPARATE FUSION ENGINE</span><span class="s120Pill">PROVENANCE PRESERVED</span></div>
      <div class="s120Launch"><div><b>RUN THE EXISTING SYNTRACT COMPOSITION SURFACE</b><span>The public Syntracts demo uses the existing Central QCDS + DistributionOracle re-entry path.</span></div><div class="s120LaunchActions"><button type="button" id="s120OpenSyntracts">OPEN SYNTRACTS</button></div></div>
    </div>`;
  document.getElementById('s120OpenSyntracts')?.addEventListener('click',()=>window.SYNTRACT_SUPERBUILD?.selectExistingView('syntract'));
})();
