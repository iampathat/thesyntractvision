/* Public presentation identity only. No QCDS execution is touched. */
(function(){
  'use strict';

  function img(cls){
    const node=document.createElement('img');
    node.src='assets/syntract_art.svg';
    node.className=cls;
    node.alt='';
    node.setAttribute('aria-hidden','true');
    node.decoding='async';
    return node;
  }

  function promoteGlobalIdentity(){
    const title=document.querySelector('.brand h1');
    if(title){
      let mark=title.querySelector('.syntractArtHeader');
      if(!mark){
        const pulse=title.querySelector('.pulse');
        mark=img('syntractArtHeader');
        if(pulse)pulse.replaceWith(mark);else title.prepend(mark);
      }
      title.replaceChildren(mark,document.createTextNode('The Syntract Vision'));
    }

    const subtitle=document.querySelector('.brand small');
    if(subtitle){
      subtitle.textContent='The Living Superintelligence · one QCDS / Syntract core · many logical, simulated and physical bodies';
    }
  }

  function promoteVisualManifestation(){
    const kicker=document.querySelector('#public-robotics .publicRoboticsKicker');
    if(kicker)kicker.textContent='THE LOGICAL ROBOT · VISUAL MANIFESTATION · QCDS / SYNTRACT';
  }

  function decorateVisionDocs(){
    const docsTitle=document.getElementById('visionDocsTitle');
    if(docsTitle && !docsTitle.closest('.visionDocsTitleLine')){
      const parent=docsTitle.parentElement;
      if(parent){
        const line=document.createElement('div');
        line.className='visionDocsTitleLine';
        const copy=document.createElement('div');
        copy.className='visionDocsTitleCopy';
        parent.insertBefore(line,docsTitle);
        line.appendChild(img('visionDocsArt'));
        line.appendChild(copy);
        copy.appendChild(docsTitle);
        const p=line.nextElementSibling;
        if(p && p.tagName==='P')copy.appendChild(p);
      }
    }
  }

  function landOnVision(attempt){
    const api=window.SYNTRACT_SUPERBUILD;
    if(api?.publicShell && typeof window.publicSelectView==='function'){
      window.publicSelectView('overview');
      document.title='The Living Superintelligence — The Syntract Vision';
      return;
    }
    if(attempt<60)setTimeout(()=>landOnVision(attempt+1),40);
  }

  function mount(){
    promoteGlobalIdentity();
    promoteVisualManifestation();
    decorateVisionDocs();
    document.querySelectorAll('.publicBuildMark').forEach(node=>node.remove());
    landOnVision(0);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
