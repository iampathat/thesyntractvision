/* BUILD 116 — one QCDS core, many logical and physical bodies. Presentation only. */
(function(){
  'use strict';
  const host=document.getElementById('s120-bodies'); if(!host)return;
  host.innerHTML=`
    <div class="s120ChapterHead"><div class="s120ChapterNo">06 · MANY BODIES</div><div><h3>The robot is not the intelligence.</h3><p class="s120ChapterIntro">A body decides what the intelligence can observe and what it can do. Change a browser for a legal corpus, a scientific instrument, a simulation or a physical robot and the input/output boundary changes — the QCDS / Syntract inference architecture does not.</p></div></div>
    <div class="s120CoreBridge">SAME QCDS / SYNTRACT CORE</div>
    <div class="s120Bodies">
      <div class="s120Body"><div class="icon">▦</div><b>VISUAL / PHYSICAL ROBOTICS</b><span><strong>Demonstrated now:</strong> bounded visual route world through SyntractSystem. A future physical body can replace the screen with sensors and actuators under its own control policy.</span></div>
      <div class="s120Body"><div class="icon">§</div><b>LEGAL ROBOT</b><span><strong>Demonstrated now:</strong> source-attributed Swedish housing-law Logical Universe through the shared QCDS Fabric.</span></div>
      <div class="s120Body"><div class="icon">⌁</div><b>WEB / OBSERVATION BODY</b><span><strong>Demonstrated now:</strong> bounded public-web discovery can return evidence and create further frontier work without turning retrieved text into truth.</span></div>
      <div class="s120Body"><div class="icon">⌬</div><b>DNA / BIOLOGY RESEARCH</b><span><strong>Architecture pattern:</strong> sequence, phenotype, protein and experimental observations can become represented Conditions and evidence around the same QCDS core.</span></div>
      <div class="s120Body"><div class="icon">✚</div><b>BIOMEDICAL RESEARCH</b><span><strong>Architecture pattern:</strong> competing biological explanations can remain multiple until new experiments provide evidence that distinguishes them.</span></div>
      <div class="s120Body"><div class="icon">◎</div><b>TOKAMAK / CONTROL RESEARCH</b><span><strong>Architecture pattern:</strong> sensors describe represented plasma state possibilities while an authorized external controller owns real-world actuation.</span></div>
    </div>
    <div class="s120Launch"><div><b>THE BODY CAN CHANGE. THE INTELLIGENCE ARCHITECTURE DOES NOT.</b><span>Open existing implemented bodies below.</span></div><div class="s120LaunchActions"><button type="button" data-s120-open="robotics">ROBOTICS</button><button type="button" data-s120-open="legal">LEGAL ROBOT</button><button type="button" data-s120-open="advanced">ADVANCED / LIVE BOUNDARIES</button></div></div>`;
  host.querySelectorAll('[data-s120-open]').forEach(button=>button.addEventListener('click',()=>window.SYNTRACT_SUPERBUILD?.selectExistingView(button.dataset.s120Open)));
})();
