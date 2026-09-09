/* Cally.One surface-language copy pass.
   Presentation only: aligns the Perspective composer and menu with interface
   language without changing Calendar Space state or starting inference. */
(() => {
  'use strict';
  if (window.__callySurfaceLanguage) return;
  window.__callySurfaceLanguage = true;

  const qs=(s,r=document)=>r.querySelector(s);
  const qsa=(s,r=document)=>[...r.querySelectorAll(s)];
  const locale=()=>{try{return window.__callyLocale?.()||'sv';}catch(_){return'sv';}};
  const mode=()=>{try{return window.__callyTerminologyMode?.()||'simple';}catch(_){return'simple';}};
  const sv=()=>locale()==='sv';

  const copy={
    sv:{
      title:'Kalenderperspektiv',search:'Sök dimension…',addPerspective:'+ Perspektiv',addFilter:'+ Filter',
      stack:'Perspektivstack',stackNote:'Ordningen spelar roll: t.ex. Plats → Person → Aktivitet. Det här är projektioner av samma Calendar Space, aldrig separata kalendrar.',
      filters:'Filter',noFilters:'Inga filter. Lägg till valfri dimension — även egna dimensioner — och välj ett värde.',
      saved:'Sparade vyer',savedEmpty:'Fäst en perspektivkombination för att visa den som en egen vy i huvudmenyn.',
      languageSimple:'Språk',languageTechnical:'Språkstate',
      languageNote:'En semantisk dimension har en kanonisk identitet även när ordet visas på olika språk. Till exempel pekar Location och Plats på samma dimension.',
      visible:(shown,total)=>`${shown} av ${total} händelser synliga`,
      menuAbout:'Om Cally.One och licens',commercial:'Personal/family free · Commercial terms to be announced.'
    },
    en:{
      title:'Calendar perspectives',search:'Search dimension…',addPerspective:'+ Perspective',addFilter:'+ Filter',
      stack:'Perspective stack',stackNote:'Order matters: e.g. Location → Person → Activity. These are projections of one Calendar Space, never separate calendars.',
      filters:'Filters',noFilters:'No filters. Add any dimension — including custom dimensions — and choose a value.',
      saved:'Saved views',savedEmpty:'Pin a perspective composition to show it as a dedicated view in the main menu.',
      languageSimple:'Language',languageTechnical:'Language state',
      languageNote:'A semantic dimension keeps one canonical identity while its wording can be represented in different language states. For example Location and Plats resolve to the same dimension.',
      visible:(shown,total)=>`${shown} of ${total} events visible`,
      menuAbout:'About Cally.One and license',commercial:'Personal/family free · Commercial terms to be announced.'
    }
  };

  function text(node,value){if(node&&value!=null&&node.textContent!==value)node.textContent=value;}

  function polishPerspective(){
    const panel=qs('#rightSide');
    if(!panel)return;
    const c=copy[locale()]||copy.en;
    text(qs('.rightTop h3',panel),c.title);
    const search=qs('#dimensionSearch',panel);if(search)search.placeholder=c.search;
    text(qs('#addPerspective',panel),c.addPerspective);
    text(qs('#addFilter',panel),c.addFilter);

    const headings=qsa(':scope > h3',panel);
    if(headings[0])text(headings[0],c.stack);
    if(headings[1])text(headings[1],c.filters);
    if(headings[2])text(headings[2],c.saved);
    if(headings[3])text(headings[3],mode()==='technical'?c.languageTechnical:c.languageSimple);

    const stack=qs('#perspectiveStack',panel);
    const stackNote=stack?.nextElementSibling;
    if(stackNote?.classList.contains('tiny'))text(stackNote,c.stackNote);

    const filters=qs('#filterList',panel);
    const filterNote=filters?.nextElementSibling;
    if(filterNote?.classList.contains('tiny')||filterNote?.id==='filterSummary'){
      const raw=String(filterNote.textContent||'').trim();
      if(!raw||/^(No filters|Inga filter)/i.test(raw))text(filterNote,c.noFilters);
    }

    const visible=qs('#visibleCount',panel);
    if(visible){
      const numbers=(visible.textContent||'').match(/\d+/g);
      if(numbers?.length>=2)text(visible,c.visible(numbers[0],numbers[1]));
    }

    const saved=qs('#savedPanel',panel);
    const savedTiny=saved&&qs('.tiny',saved);
    if(savedTiny&&(/Star a perspective|Fäst en perspektiv/i.test(savedTiny.textContent||'')))text(savedTiny,c.savedEmpty);

    if(headings[3]){
      const languageNote=headings[3].nextElementSibling;
      if(languageNote?.classList.contains('tiny'))text(languageNote,c.languageNote);
    }
  }

  function polishMenu(){
    const menu=qs('#callyMobileMenu');
    if(!menu)return;
    const c=copy[locale()]||copy.en;
    const about=qs('.callyMenuAbout',menu);
    if(about)about.setAttribute('aria-label',c.menuAbout);
    text(qs('.callyMenuAboutLicense',menu),c.commercial);
  }

  function apply(){polishPerspective();polishMenu();}
  const schedule=()=>{requestAnimationFrame(apply);setTimeout(apply,0);setTimeout(apply,80);};

  document.addEventListener('click',event=>{
    if(event.target.closest?.('#perspectiveBtn,#callyMenuButton,#addPerspective,#addFilter,[data-saved-view],[data-filter-remove],[data-stack-up],[data-stack-down],[data-stack-remove]'))setTimeout(apply,0);
  });
  window.addEventListener('cally-one-ui-refresh',schedule);
  window.addEventListener('cally-locale-change',schedule);
  window.addEventListener('cally-terminology-change',schedule);
  window.addEventListener('cally-demo-space-changed',schedule);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
