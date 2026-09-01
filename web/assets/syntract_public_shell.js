/* Public navigation shell. Presentation/router only: the existing QCDS core remains the only inference engine. */
(function(){
  'use strict';

  const root=document.getElementById('superintelligenceStory');
  if(!root || document.getElementById('publicSurfaceNav'))return;

  const body=document.body;
  const baseSelectView=typeof window.publicSelectView==='function' ? window.publicSelectView.bind(window) : null;
  const legacyViews=new Set(['robotics','qcds','syntract','legal','advanced']);

  /* One physical navigation stack. Keeping both menu levels in the same DOM wrapper
     prevents Vision content from ever appearing between the primary and topic rows. */
  const navStack=document.createElement('div');
  navStack.id='publicNavStack';

  const nav=document.createElement('nav');
  nav.id='publicSurfaceNav';
  nav.setAttribute('aria-label','The Syntract Vision public surfaces');
  nav.innerHTML=`
    <div class="publicSurfaceNavInner">
      <div class="publicSurfaceBrand">
        <b>THE SYNTRACT VISION</b>
        <span>One QCDS core · many logical, simulated and physical bodies</span>
      </div>
      <div class="publicSurfaceActions">
        <button type="button" data-public-surface="overview">VISION</button>
        <button type="button" data-public-surface="robotics">VISUAL ROBOT</button>
        <button type="button" data-public-surface="qcds">QCDS</button>
        <button type="button" data-public-surface="syntract">SYNTRACTS</button>
        <button type="button" data-public-surface="legal">LEGAL</button>
        <button type="button" data-public-surface="advanced">ADVANCED</button>
      </div>
    </div>`;
  navStack.appendChild(nav);

  const header=document.querySelector('body > header, header');
  if(header && header.parentNode)header.insertAdjacentElement('afterend',navStack);
  else document.body.prepend(navStack);

  const chapterDefinitions=[
    ['s120-space','POSSIBILITY SPACE'],
    ['s120-bias','TEST THE VIEW'],
    ['s120-holds','WHAT HOLDS'],
    ['s120-next','WHAT NEXT'],
    ['s120-growth','GROW'],
    ['s120-bodies','MANY BODIES'],
    ['s120-recursion','RECURSIVE SYNTRACTS'],
    ['s120-scale','SCALE'],
    ['s120-claims','NOW / NEXT / HORIZON']
  ];

  const journey=root.querySelector('.s120Journey');
  if(journey){
    journey.id='visionTopicNav';
    journey.setAttribute('aria-label','Vision topics');
    journey.innerHTML=chapterDefinitions.map(([id,label])=>`<button type="button" data-s120-page="${id}">${label}</button>`).join('');
    navStack.appendChild(journey);
  }

  /* The old release/launch card repeated navigation that now lives permanently above.
     Remove it from the public Vision surface; this is presentation-only. */
  const release=root.querySelector('#s120-release');
  if(release)release.remove();

  function syncNavStackHeight(){
    const height=Math.ceil(navStack.getBoundingClientRect().height || 0);
    if(height>0)document.documentElement.style.setProperty('--public-nav-stack-height',`${height}px`);
  }
  syncNavStackHeight();
  if('ResizeObserver' in window)new ResizeObserver(syncNavStackHeight).observe(navStack);
  else window.addEventListener('resize',syncNavStackHeight,{passive:true});

  function stripInternalBuildLabels(scope){
    if(!scope)return;
    const walker=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT);
    const nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    const pattern=/\b(?:SUPER)?BUILD\s+\d+(?:\s*[–-]\s*\d+)?\s*(?:·|:)?\s*/gi;
    nodes.forEach(node=>{
      const original=node.nodeValue||'';
      const cleaned=original.replace(pattern,'');
      if(cleaned!==original)node.nodeValue=cleaned;
      pattern.lastIndex=0;
    });
  }

  document.querySelectorAll('.publicBuildMark').forEach(node=>node.remove());
  stripInternalBuildLabels(document.body);

  function setPrimaryActive(surface){
    nav.querySelectorAll('[data-public-surface]').forEach(button=>{
      const active=button.dataset.publicSurface===surface;
      button.classList.toggle('active',active);
      if(active)button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
    });
  }

  function selectChapter(id,scroll){
    let selected=id;
    if(!chapterDefinitions.some(([candidate])=>candidate===selected))selected='s120-space';
    root.querySelectorAll('.s120Chapter').forEach(chapter=>chapter.classList.toggle('s120ActiveChapter',chapter.id===selected));
    if(journey){
      journey.querySelectorAll('[data-s120-page]').forEach(button=>{
        const active=button.dataset.s120Page===selected;
        button.classList.toggle('active',active);
        if(active)button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
      });
    }
    if(scroll){
      const target=document.getElementById(selected);
      if(target)target.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
    }
  }

  /* Old public surfaces contain historical !important display rules. Vision therefore
     parks them explicitly instead of hoping selector precedence hides every wrapper. */
  const parked=new Map();
  const legacySelectors=[
    '#public-syntract-teaser','.publicCapabilityStrip','#try-logical-robot',
    '#public-legal-question','#swedish-legal-robot','#public-robotics','#public-syntracts',
    '.hero','.layout','.learningMoment','.understandBuild','.domainLab','.spaceBuilderWrap','.sessionSandbox'
  ];

  function parkElement(element){
    if(!element || element===navStack || element===root || navStack.contains(element) || parked.has(element))return;
    parked.set(element,{
      display:element.style.getPropertyValue('display'),
      priority:element.style.getPropertyPriority('display'),
      ariaHidden:element.getAttribute('aria-hidden')
    });
    element.style.setProperty('display','none','important');
    element.setAttribute('aria-hidden','true');
  }

  function restoreParked(){
    parked.forEach((state,element)=>{
      if(!element || !element.style)return;
      if(state.display)element.style.setProperty('display',state.display,state.priority||'');
      else element.style.removeProperty('display');
      if(state.ariaHidden===null)element.removeAttribute('aria-hidden');
      else element.setAttribute('aria-hidden',state.ariaHidden);
    });
    parked.clear();
  }

  function isolateVision(active){
    if(!active){restoreParked();return}

    Array.from(body.children).forEach(element=>{
      if(element===navStack || element===root || element.tagName==='SCRIPT' || element.tagName==='STYLE')return;
      parkElement(element);
    });

    document.querySelectorAll(legacySelectors.join(',')).forEach(element=>{
      if(!root.contains(element))parkElement(element);
      else if(element.id==='public-robotics' || element.id==='try-logical-robot' || element.id==='public-syntracts' || element.id==='public-legal-question' || element.id==='swedish-legal-robot')parkElement(element);
    });
  }

  function scrollToSurface(){
    navStack.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  }

  function selectSurface(requested,scroll){
    const surface=requested==='overview' || legacyViews.has(requested) ? requested : 'robotics';
    if(surface==='overview'){
      body.classList.add('publicShellOverview');
      body.dataset.publicSurface='overview';
      isolateVision(true);
      setPrimaryActive('overview');
      selectChapter(root.querySelector('.s120Chapter.s120ActiveChapter')?.id || 's120-space',false);
    }else{
      isolateVision(false);
      body.classList.remove('publicShellOverview');
      body.dataset.publicSurface=surface;
      if(baseSelectView)baseSelectView(surface);
      setPrimaryActive(surface);
    }
    syncNavStackHeight();
    if(scroll)scrollToSurface();
  }

  nav.querySelectorAll('[data-public-surface]').forEach(button=>button.addEventListener('click',()=>selectSurface(button.dataset.publicSurface,true)));
  if(journey)journey.querySelectorAll('[data-s120-page]').forEach(button=>button.addEventListener('click',()=>selectChapter(button.dataset.s120Page,true)));

  window.publicSelectView=function(requested){
    if(legacyViews.has(requested))return selectSurface(requested,false);
    if(requested==='overview')return selectSurface('overview',false);
    if(baseSelectView)return baseSelectView(requested);
  };

  window.SYNTRACT_SUPERBUILD=Object.assign(window.SYNTRACT_SUPERBUILD||{}, {
    publicShell:true,
    qcdsCoreReimplemented:false,
    selectExistingView(view){selectSurface(view,true)},
    selectOverview(){selectSurface('overview',true)},
    selectOverviewChapter(id){selectSurface('overview',false);selectChapter(id,true)}
  });

  selectChapter('s120-space',false);
  body.classList.add('publicShellReady');
  const initial=legacyViews.has(body.dataset.publicView) ? body.dataset.publicView : 'robotics';
  selectSurface(initial,false);
})();
