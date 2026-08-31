/* BUILD 106: presentation only. No QCDS execution is touched. */
(function(){
  function img(cls){
    const node=document.createElement('img');
    node.src='assets/syntract_art.svg';
    node.className=cls;
    node.alt='';
    node.setAttribute('aria-hidden','true');
    node.decoding='async';
    return node;
  }

  function mount(){
    const title=document.querySelector('.brand h1');
    if(title && !title.querySelector('.syntractArtHeader')){
      const pulse=title.querySelector('.pulse');
      const mark=img('syntractArtHeader');
      if(pulse)pulse.replaceWith(mark);else title.prepend(mark);
    }

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

    const build=document.querySelector('.publicBuildMark');
    if(build)build.textContent='BUILD 106';
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
