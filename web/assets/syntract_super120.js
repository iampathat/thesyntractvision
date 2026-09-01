/* BUILD 120 — conference release finish. Presentation/router only. */
(function(){
  'use strict';
  const host=document.getElementById('s120-release'); if(!host)return;
  host.innerHTML=`
    <div class="s120Launch">
      <div><b>BUILD 120 · THE LIVING SUPERINTELLIGENCE</b><span>One QCDS / Syntract core · explicit uncertainty · bias diagnostics · evidence planning · governed growth · recursive Syntracts · many bodies.</span></div>
      <div class="s120LaunchActions"><button type="button" data-s120-final="robotics">VISUAL ROBOT</button><button type="button" data-s120-final="qcds">TRY QCDS</button><button type="button" data-s120-final="syntract">SYNTRACTS</button><button type="button" data-s120-final="legal">LEGAL</button><button type="button" data-s120-final="advanced">ADVANCED</button></div>
    </div>`;
  host.querySelectorAll('[data-s120-final]').forEach(button=>button.addEventListener('click',()=>window.SYNTRACT_SUPERBUILD?.selectExistingView(button.dataset.s120Final)));
  const build=document.querySelector('.publicBuildMark'); if(build)build.textContent='BUILD 120';
  document.documentElement.dataset.syntractPublicRelease='120';
  window.SYNTRACT_SUPERBUILD=Object.assign(window.SYNTRACT_SUPERBUILD||{}, {
    build:120,
    oneQCDS:true,
    manyBodies:true,
    secondInferenceEngine:false,
    claimBoundary:'research-software'
  });
})();
