/* BUILD 108 — one public story around the existing QCDS/Syntract surfaces.
   Presentation only. This file never performs QCDS inference. */
(function(){
  'use strict';
  const existing=document.getElementById('superintelligenceStory');
  if(existing)return;
  const root=document.createElement('section');
  root.id='superintelligenceStory';
  root.setAttribute('aria-label','The Living Superintelligence — QCDS / Syntract overview');
  root.innerHTML=`
    <div class="s120Wrap">
      <div class="s120Hero">
        <div>
          <div class="s120Kicker">THE SYNTRACT VISION · ONE QCDS · MANY BODIES</div>
          <h2>THE LIVING<br>SUPERINTELLIGENCE</h2>
          <p><strong>One QCDS / Syntract core.</strong> Many logical, simulated and physical bodies. The system keeps uncertainty explicit, tests what holds from more than one logical view, decides what evidence or action matters next, and can re-enter the result as reality changes.</p>
        </div>
        <aside class="s120CoreCard">
          <div class="s120CoreMark"><span class="s120CoreDot"></span> ONE INTELLIGENCE ARCHITECTURE</div>
          <h3>QCDS / SYNTRACT</h3>
          <p>The browser, legal robot, scientific robot, web observer, simulation or future physical robot changes the body and the available evidence — not the intelligence core.</p>
          <div class="s120BodiesMini"><span>LOGICAL ROBOT</span><span>LEGAL</span><span>SCIENCE</span><span>ROBOTICS</span><span>SENSORS</span><span>PHYSICAL BODY</span></div>
        </aside>
      </div>
      <nav class="s120Journey" aria-label="Superintelligence story chapters">
        <button type="button" data-s120-target="s120-space">1 · POSSIBILITY SPACE</button>
        <button type="button" data-s120-target="s120-bias">2 · TEST THE VIEW</button>
        <button type="button" data-s120-target="s120-holds">3 · WHAT HOLDS</button>
        <button type="button" data-s120-target="s120-next">4 · WHAT NEXT</button>
        <button type="button" data-s120-target="s120-growth">5 · GROW</button>
        <button type="button" data-s120-target="s120-bodies">6 · MANY BODIES</button>
        <button type="button" data-s120-target="s120-scale">7 · SCALE</button>
        <button type="button" data-s120-target="s120-claims">NOW / NEXT / HORIZON</button>
      </nav>
      <div id="s120-space" class="s120Chapter" data-s120-build="109-110"></div>
      <div id="s120-bias" class="s120Chapter" data-s120-build="111"></div>
      <div id="s120-holds" class="s120Chapter" data-s120-build="112"></div>
      <div id="s120-next" class="s120Chapter" data-s120-build="113-114"></div>
      <div id="s120-growth" class="s120Chapter" data-s120-build="115"></div>
      <div id="s120-bodies" class="s120Chapter" data-s120-build="116"></div>
      <div id="s120-recursion" class="s120Chapter" data-s120-build="117"></div>
      <div id="s120-scale" class="s120Chapter" data-s120-build="118"></div>
      <div id="s120-claims" class="s120Chapter" data-s120-build="119"></div>
      <div id="s120-release" data-s120-build="120"></div>
    </div>`;
  const header=document.querySelector('body > header, header');
  if(header && header.parentNode){header.insertAdjacentElement('afterend',root)}else{document.body.prepend(root)}

  root.querySelectorAll('[data-s120-target]').forEach(button=>{
    button.addEventListener('click',()=>{
      const target=document.getElementById(button.dataset.s120Target);
      if(!target)return;
      target.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
    });
  });

  const chapters=[...root.querySelectorAll('.s120Chapter')];
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{
      const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(!visible)return;
      root.querySelectorAll('[data-s120-target]').forEach(btn=>btn.classList.toggle('active',btn.dataset.s120Target===visible.target.id));
    },{rootMargin:'-15% 0px -65% 0px',threshold:[0,.2,.5]});
    chapters.forEach(ch=>observer.observe(ch));
  }

  window.SYNTRACT_SUPERBUILD=Object.assign(window.SYNTRACT_SUPERBUILD||{}, {
    release:'107-120',
    presentationOnly:true,
    qcdsCoreReimplemented:false,
    root,
    selectExistingView(view){
      if(typeof window.publicSelectView==='function')window.publicSelectView(view);
      const bar=document.querySelector('.publicCompactBar');
      if(bar)bar.scrollIntoView({behavior:'smooth',block:'start'});
    }
  });
})();
