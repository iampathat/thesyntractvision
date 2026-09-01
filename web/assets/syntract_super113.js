/* BUILD 113 — connect uncertainty to existing evidence planning semantics. Presentation only. */
(function(){
  'use strict';
  const host=document.getElementById('s120-next'); if(!host)return;
  host.innerHTML=`
    <div class="s120ChapterHead"><div class="s120ChapterNo">04 · WHAT NEXT</div><div><h3>Intelligence is not finished when it has ranked possibilities.</h3><p class="s120ChapterIntro">When several candidates still hold, the next useful question is often: <strong>what observation, measurement or experiment would distinguish them best?</strong> QCDS already has a bounded evidence-planning loop for exactly that boundary.</p></div></div>
    <div class="s120Card">
      <div class="s120Meta">BUILD 113 · FROM UNCERTAINTY TO INFORMATION NEED</div>
      <div class="s120NextFlow">
        <div class="s120Action"><b>1 · TWO OR MORE STATES HOLD</b><p id="s120ScenarioUncertain">A and B remain coherent.</p></div><div class="s120FlowArrow">→</div>
        <div class="s120Action active"><b>2 · FIND THE BEST DISCRIMINATOR</b><p id="s120ScenarioPlan">Measure the variable where A and B predict different outcomes.</p></div><div class="s120FlowArrow">→</div>
        <div class="s120Action"><b>3 · OBSERVE REALITY</b><p id="s120ScenarioReturn">An authorized body/lab/controller obtains the result and returns source-attributed evidence.</p></div>
      </div>
      <div class="s120Journey" style="padding-bottom:0;margin-top:10px"><button type="button" data-s120-scenario="dna" class="active">DNA</button><button type="button" data-s120-scenario="cancer">CANCER</button><button type="button" data-s120-scenario="tokamak">TOKAMAK</button></div>
      <div class="s120Callout" style="margin-top:10px"><strong>Important boundary:</strong> QCDS can plan what evidence or experiment would be useful. A laboratory, medical system, robot or physical controller executes under its own authorization and safety policy. The result comes back through the same QCDS / Syntract intelligence.</div>
    </div>`;
  const scenarios={
    dna:{u:'Two genetic explanations still fit the represented DNA / phenotype evidence.',p:'Choose the measurement or validation that most separates those explanations.',r:'A sequencing, protein or phenotype observation returns as source-attributed evidence.'},
    cancer:{u:'Several tumour-driving mechanisms remain coherent with the represented evidence.',p:'Choose a discriminating experiment or treatment candidate to test — not a pretend final cure.',r:'A governed lab/clinical research executor returns the observed response for re-inference.'},
    tokamak:{u:'More than one plasma-state explanation still fits the current represented sensor data.',p:'Choose the sensor probe, simulation or control test that best separates the surviving states.',r:'The authorized controller/sensor body returns the observed plasma response for re-inference.'}
  };
  function select(key){
    const s=scenarios[key]||scenarios.dna;
    document.getElementById('s120ScenarioUncertain').textContent=s.u;
    document.getElementById('s120ScenarioPlan').textContent=s.p;
    document.getElementById('s120ScenarioReturn').textContent=s.r;
    host.querySelectorAll('[data-s120-scenario]').forEach(b=>b.classList.toggle('active',b.dataset.s120Scenario===key));
  }
  host.querySelectorAll('[data-s120-scenario]').forEach(b=>b.addEventListener('click',()=>select(b.dataset.s120Scenario))); select('dna');
})();
