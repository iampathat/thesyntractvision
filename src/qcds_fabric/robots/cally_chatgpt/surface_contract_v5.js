/* Cally.One surface contract v5
   Final presentation normalizer: one top-control component, one drawer family,
   one interface language. No Calendar Space semantics or inference changes. */
(() => {
  'use strict';
  if (window.__callySurfaceContractV5) return;
  window.__callySurfaceContractV5 = true;

  const qs=(s,r=document)=>r.querySelector(s);
  const qsa=(s,r=document)=>[...r.querySelectorAll(s)];
  const locale=()=>{try{return window.__callyLocale?.()||'sv';}catch(_){return'sv';}};
  const terminology=()=>{try{return window.__callyTerminologyMode?.()||'simple';}catch(_){return'simple';}};
  const sv=()=>locale()==='sv';
  const text=(node,value)=>{if(node&&value!=null&&node.textContent!==value)node.textContent=value;};
  const ph=(node,value)=>{if(node&&value!=null&&node.placeholder!==value)node.placeholder=value;};

  function icon(name){
    try { return window.__callyIcons?.icon?.(name) || ''; }
    catch (_) { return ''; }
  }

  function topControl(selector,name,svLabel,enLabel){
    const el=qs(selector); if(!el) return;
    const label=sv()?svLabel:enLabel;
    const svg=icon(name);
    if(svg){
      const wanted=`<span class="callyTopActionIcon">${svg}</span><span class="callyTopActionLabel">${label}</span>`;
      if(el.innerHTML!==wanted) el.innerHTML=wanted;
    }
    el.setAttribute('aria-label',label);
    el.title=label;
  }

  function polishTop(){
    topControl('#callyHomeTile','layers','Innehåll','Calendar Space');
    topControl('#perspectiveBtn','layout','Perspektiv','Perspectives');
    topControl('#personBtn','userPlus','Person','Person');
    topControl('#eventBtn','calendarPlus','Händelse','Event');
    topControl('#callyMenuButton','menu','Meny','Menu');
  }

  function visible(el){
    if(!el) return false;
    if(el.id==='rightSide') return el.classList.contains('open');
    if(el.id==='modalBack'){
      const inline=String(el.style.display||'').toLowerCase();
      if(inline==='none') return false;
      try{return getComputedStyle(el).display!=='none';}catch(_){return inline!=='none';}
    }
    if(el.classList.contains('callyMobileMenu')) return el.classList.contains('open');
    return el.classList.contains('open');
  }

  function syncDrawers(){
    const modal=qs('#modalBack');
    if(modal){
      if(visible(modal)) modal.classList.add('callySurfaceOpen');
      else modal.classList.remove('callySurfaceOpen');
    }
    const roots=[
      qs('#rightSide'), modal, qs('.stateOverlay'), qs('#callyCalendarSettings'),
      qs('#callyThemeSettings'), qs('.callyTerminologyOverlay'), qs('.callyQcdsStateCenter'),
      qs('.callyLocaleAccess'), qs('.manageOverlay'), qs('.callyMobileMenu')
    ];
    document.body.classList.toggle('callyDrawerActive',roots.some(visible));
  }

  function translateDimensionToken(raw){
    const value=String(raw||'');
    if(!sv()) return value;
    return value
      .replace(/^family_role\s*:/i,'Familjeroll:')
      .replace(/^domain\s*:/i,'Domän:')
      .replace(/^language\s*:/i,'Språk:')
      .replace(/^role\s*:/i,'Roll:')
      .replace(/^team\s*:/i,'Team:')
      .replace(/^location\s*:/i,'Plats:')
      .replace(/^type\s*:/i,'Typ:')
      .replace(/^member of\s*·/i,'medlem i ·')
      .replace(/^owned by\s*·/i,'ägs av ·')
      .replace(/^uses\s*·/i,'använder ·')
      .replace(/^requires\s*·/i,'behöver ·');
  }

  function polishStateDirectory(){
    const overlay=qs('.stateOverlay.open,#callyStateOverlay.open');
    if(!overlay) return;
    const sheet=qs('.stateSheet',overlay); if(!sheet) return;
    if(!qs('#spaceDirectoryList',sheet)) return;

    text(qs('.sheetHead .eyebrow',sheet),'CALENDAR SPACE');
    const title=terminology()==='technical' ? (sv()?'Tillstånd':'States') : (sv()?'Innehåll':'Contents');
    text(qs('.sheetHead h2',sheet),title);
    const intro=qs('.sheetHead p',sheet); if(intro) intro.hidden=true;
    ph(qs('#spaceDirectorySearch',sheet),sv()?'Sök i Calendar Space…':'Search Calendar Space…');

    const tabLabels={
      all:['Alla','All'],person:['Personer','People'],organization:['Organisationer','Organizations'],
      resource:['Resurser','Resources'],thing:['Saker','Things']
    };
    qsa('.kindTabs [data-kind]',sheet).forEach(b=>{
      const pair=tabLabels[b.dataset.kind]; if(pair) text(b,sv()?pair[0]:pair[1]);
    });
    const addLabels={
      person:['+ Person','+ Person'],organization:['+ Organisation','+ Organization'],
      resource:['+ Resurs','+ Resource'],thing:['+ Sak','+ Thing']
    };
    qsa('.stateActions [data-add-state]',sheet).forEach(b=>{
      const pair=addLabels[b.dataset.addState]; if(pair) text(b,sv()?pair[0]:pair[1]);
    });

    qsa('.stateCard .stateKind',sheet).forEach(node=>{
      const key=String(node.textContent||'').trim().toLowerCase();
      const labels={person:['PERSON','PERSON'],organization:['ORGANISATION','ORGANIZATION'],resource:['RESURS','RESOURCE'],thing:['SAK','THING']};
      if(labels[key]) text(node,sv()?labels[key][0]:labels[key][1]);
    });
    if(sv()){
      qsa('.stateCard .stateMeta span,.stateCard .stateRelations span',sheet).forEach(node=>text(node,translateDimensionToken(node.textContent)));
    }
  }

  function polishEvent(){
    const back=qs('#modalBack'); if(!back || !visible(back)) return;
    const h=qs('.callyEventHead h2',back) || qs('#modalTitle',back);
    if(h){
      h.dataset.callyKicker=sv()?'HÄNDELSE':'EVENT';
      const editing=String(h.textContent||'').toLowerCase().includes('redig') || String(h.textContent||'').toLowerCase().includes('edit');
      text(h,sv()?(editing?'Redigera händelse':'Ny händelse'):(editing?'Edit event':'New event'));
    }
    const fields=[
      ['#fTitle','Titel','Title','Fotboll, middag, möte …','Football, dinner, meeting …'],
      ['#fStart','Start','Start',null,null],['#fEnd','Slut','End',null,null],
      ['#fLocation','Plats','Location','Valfritt','Optional']
    ];
    fields.forEach(([sel,s,e,sp,ep])=>{
      const input=qs(sel,back); if(!input) return;
      const field=input.closest('.field');
      const label=field?.querySelector(':scope > label'); if(label) text(label,sv()?s:e);
      if(sp) ph(input,sv()?sp:ep);
    });
    const people=qs('#fPeople',back); if(people){const label=people.closest('.field')?.querySelector(':scope > label');text(label,sv()?'Personer':'People');}
    ph(qs('#eventPeopleSearch',back),sv()?'Sök personer…':'Search people…');
    text(qs('#saveEvent',back),sv()?'Lägg till':'Add');
    const cancel=qsa('button',back).find(b=>/^(Avbryt|Cancel)$/i.test(String(b.textContent||'').trim()));
    text(cancel,sv()?'Avbryt':'Cancel');

    if(sv()){
      qsa('#callyLinkedStates label,#callyLinkedStates .stateLabel,#callyLinkedStates .linkedHint,#callyLinkedStates .linkedEmpty',back).forEach(node=>{
        const raw=String(node.textContent||'').trim();
        if(/^Linked states$/i.test(raw)) text(node,'Kopplade resurser och saker');
        else if(/^Resources/i.test(raw)) text(node,'Resurser');
        else if(/^Things/i.test(raw)) text(node,'Saker / behov');
        else if(/^No resources/i.test(raw)) text(node,'Inga resurser ännu.');
        else if(/^No things/i.test(raw)) text(node,'Inga saker eller behov ännu.');
        else if(/^Room, car/i.test(raw)) text(node,'Händelsen kan kopplas till resurser och saker i Calendar Space.');
      });
    }
  }

  function polishPerson(){
    const overlay=qs('.stateOverlay.open,#callyStateOverlay.open'); if(!overlay) return;
    const sheet=qs('.stateSheet',overlay); if(!sheet || !qs('#personStateName',sheet)) return;
    text(qs('.sheetHead .eyebrow',sheet),'PERSON');
    text(qs('.sheetHead h2',sheet),sv()?'Ny person':'New person');
    const intro=qs('.sheetHead p',sheet); if(intro) intro.hidden=true;
    const defs=[
      ['#personStateName','Namn','Name','Namn','Name'],
      ['#personOrganization','Organisation','Organization','Befintlig eller ny organisation','Existing or new organization'],
      ['#personRole','Roll','Role','Valfritt','Optional'],
      ['#personTeam','Team / grupp','Team / group','Valfritt','Optional']
    ];
    defs.forEach(([sel,s,e,sp,ep])=>{
      const input=qs(sel,sheet); if(!input) return;
      const label=input.closest('label');
      if(label){const textNode=[...label.childNodes].find(n=>n.nodeType===Node.TEXT_NODE && n.textContent.trim());if(textNode)textNode.textContent=(sv()?s:e);}
      ph(input,sv()?sp:ep);
    });
    text(qs('.stateLabel',sheet),sv()?'Fler dimensioner':'Additional dimensions');
    text(qs('#addPersonDimension',sheet),sv()?'+ Dimension':'+ Dimension');
    text(qs('#savePersonState',sheet),sv()?'Lägg till':'Add');
  }

  function polishPerspective(){
    const panel=qs('#rightSide'); if(!panel) return;
    text(qs('.rightTop h3',panel),sv()?'KALENDERPERSPEKTIV':'CALENDAR PERSPECTIVES');
    ph(qs('#dimensionSearch',panel),sv()?'Sök dimension…':'Search dimension…');
    text(qs('#addPerspective',panel),sv()?'+ Perspektiv':'+ Perspective');
    text(qs('#addFilter',panel),sv()?'+ Filter':'+ Filter');
    const headings=qsa(':scope > h3',panel);
    const names=sv()?['PERSPEKTIVSTACK','FILTER','SPARADE VYER',terminology()==='technical'?'SPRÅKSTATE':'SPRÅK']:['PERSPECTIVE STACK','FILTERS','SAVED VIEWS',terminology()==='technical'?'LANGUAGE STATE':'LANGUAGE'];
    headings.forEach((h,i)=>{if(names[i])text(h,names[i]);});
    const filterList=qs('#filterList',panel);
    if(filterList && /^(No filters|Inga filter)/i.test(String(filterList.textContent||'').trim())) filterList.replaceChildren();
    qsa('.tiny',panel).forEach(node=>{
      const raw=String(node.textContent||'').trim();
      if(sv() && /^No filters/i.test(raw)) text(node,'Inga filter. Lägg till valfri dimension — även egna dimensioner — och välj ett värde.');
      if(sv() && /^Star a perspective/i.test(raw)) text(node,'Fäst en perspektivkombination för att visa den som en egen vy i huvudmenyn.');
      if(!sv() && /^Inga filter/i.test(raw)) text(node,'No filters. Add any dimension — including custom dimensions — and choose a value.');
    });
  }

  function polishMenuCredit(){
    const credit=qs('.callyMenuAboutCredit');
    if(credit && /Patrik Sundblom/i.test(credit.textContent||'')){
      credit.style.marginTop='12px';
      credit.style.display='block';
    }
  }

  function apply(){
    polishTop();
    polishPerspective();
    polishEvent();
    polishPerson();
    polishStateDirectory();
    polishMenuCredit();
    syncDrawers();
  }

  let scheduled=false;
  function schedule(){
    if(scheduled) return; scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;apply();setTimeout(apply,0);setTimeout(apply,80);});
  }

  document.addEventListener('click',schedule,true);
  document.addEventListener('input',event=>{if(event.target.closest?.('#spaceDirectorySearch,#dimensionSearch,#filterList,#modalBack,.stateOverlay'))setTimeout(apply,0);},true);
  document.addEventListener('change',schedule,true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape')setTimeout(apply,0);},true);
  window.addEventListener('cally-one-ui-refresh',schedule);
  window.addEventListener('cally-locale-change',schedule);
  window.addEventListener('cally-terminology-change',schedule);
  window.addEventListener('cally-theme-change',schedule);
  window.addEventListener('resize',schedule);

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',schedule,{once:true}); else schedule();
})();
