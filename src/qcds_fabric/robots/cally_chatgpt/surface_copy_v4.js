/* Cally.One surface copy v4
   One language per interface surface. Presentation only. */
(() => {
  'use strict';
  if (window.__callySurfaceCopyV4) return;
  window.__callySurfaceCopyV4 = true;

  const qs=(s,r=document)=>r.querySelector(s);
  const qsa=(s,r=document)=>[...r.querySelectorAll(s)];
  const locale=()=>{try{return window.__callyLocale?.()||'sv';}catch(_){return'sv';}};
  const isSv=()=>locale()==='sv';
  const txt=(node,value)=>{if(node&&value!=null&&node.textContent!==value)node.textContent=value;};
  const placeholder=(node,value)=>{if(node&&value!=null&&node.placeholder!==value)node.placeholder=value;};

  function setLabelText(label,value){
    if(!label||label.tagName!=='LABEL'||value==null)return;
    const textNode=[...label.childNodes].find(node=>node.nodeType===Node.TEXT_NODE && node.nodeValue.trim());
    if(textNode){ textNode.nodeValue=value; return; }
    label.insertBefore(document.createTextNode(value),label.firstChild||null);
  }

  function labelFor(field,sv,en){
    if(!field)return;
    const value=isSv()?sv:en;
    if(field.tagName==='LABEL'){setLabelText(field,value);return;}
    const label=field.querySelector?.(':scope > label');
    if(label)setLabelText(label,value);
  }

  function polishTop(){
    txt(qs('#personBtn .actionText'), 'Person');
    txt(qs('#eventBtn .actionText'), isSv()?'Händelse':'Event');
    qs('#personBtn')?.setAttribute('aria-label',isSv()?'Ny person':'New person');
    qs('#eventBtn')?.setAttribute('aria-label',isSv()?'Ny händelse':'New event');
    qs('#perspectiveBtn')?.setAttribute('aria-label',isSv()?'Kalenderperspektiv':'Calendar perspectives');
    qs('#callyMenuButton')?.setAttribute('aria-label',isSv()?'Meny':'Menu');
  }

  function polishEvent(){
    const back=qs('#modalBack');
    if(!back || back.style.display==='none') return;

    const title=qs('#modalTitle',back) || qs('.callyEventHead h2',back);
    let editing=false;
    if(title){
      const raw=title.textContent||'';
      editing=/state|redigera|edit/i.test(raw) && !/new|ny/i.test(raw);
      title.dataset.callyKicker=isSv()?'HÄNDELSE':'EVENT';
      txt(title,isSv()?(editing?'Händelse':'Ny händelse'):(editing?'Event':'New event'));
    }

    const titleInput=qs('#fTitle',back);
    placeholder(titleInput,isSv()?'Fotboll, middag, möte …':'Football, dinner, meeting …');
    labelFor(titleInput?.closest('.field'),'Titel','Title');

    const start=qs('#fStart',back), end=qs('#fEnd',back), loc=qs('#fLocation',back), people=qs('#fPeople',back);
    labelFor(start?.closest('.field'),'Start','Start');
    labelFor(end?.closest('.field'),'Slut','End');
    labelFor(loc?.closest('.field'),'Plats','Location');
    placeholder(loc,isSv()?'Valfritt':'Optional');
    labelFor(people?.closest('.field'),'Personer','People');

    const search=qs('#eventPeopleSearch',back);
    placeholder(search,isSv()?'Sök personer…':'Search people…');

    txt(qs('#closeModal',back), '×');
    txt(qs('#saveEvent',back), isSv()?(editing?'Spara':'Lägg till'):(editing?'Save':'Add'));
    const cancel=qs('#cancelEvent',back) || qsa('button',back).find(b=>/^(Avbryt|Cancel)$/i.test((b.textContent||'').trim()));
    txt(cancel,isSv()?'Avbryt':'Cancel');

    qsa('#callyLinkedStates label,#callyLinkedStates .stateLabel,#callyLinkedStates .linkedHint,#callyLinkedStates .linkedEmpty',back).forEach(node=>{
      const raw=(node.textContent||'').trim();
      if(isSv()){
        if(/^Linked states$/i.test(raw)) txt(node,'Kopplade resurser och saker');
        else if(/^Resources/i.test(raw)) txt(node,'Resurser');
        else if(/^Things/i.test(raw)) txt(node,'Saker / behov');
        else if(/^No resources/i.test(raw)) txt(node,'Inga resurser ännu. Lägg till t.ex. rum, bil eller utrustning från Calendar Space.');
        else if(/^No things/i.test(raw)) txt(node,'Inga saker eller behov ännu. Lägg till t.ex. matsäck, badkläder eller utrustning från Calendar Space.');
        else if(/^Room, car/i.test(raw)) txt(node,'Händelsen kan kopplas till resurser och saker som egna state-relationer.');
      }
    });
  }

  function polishPerson(){
    const overlay=qs('.stateOverlay.open,#callyStateOverlay.open');
    if(!overlay) return;
    const sheet=qs('.stateSheet',overlay);
    if(!sheet) return;
    const name=qs('#personStateName',sheet);
    if(!name) return;

    txt(qs('.sheetHead .eyebrow',sheet), 'PERSON');
    txt(qs('.sheetHead h2',sheet), isSv()?'Ny person':'New person');
    const intro=qs('.sheetHead p',sheet); if(intro) intro.hidden=true;

    const org=qs('#personOrganization',sheet), role=qs('#personRole',sheet), team=qs('#personTeam',sheet);
    labelFor(name.closest('label'),'Namn','Name');
    labelFor(org?.closest('label'),'Organisation','Organization');
    labelFor(role?.closest('label'),'Roll','Role');
    labelFor(team?.closest('label'),'Team / grupp','Team / group');

    placeholder(name,isSv()?'Namn':'Name');
    placeholder(org,isSv()?'Befintlig eller ny organisation':'Existing or new organization');
    placeholder(role,isSv()?'Valfritt':'Optional');
    placeholder(team,isSv()?'Valfritt':'Optional');

    txt(qs('.stateLabel',sheet), isSv()?'Fler dimensioner':'Additional dimensions');
    txt(qs('#addPersonDimension',sheet), '+ Dimension');
    txt(qs('#savePersonState',sheet), isSv()?'Lägg till':'Add');
  }

  function polishPerspective(){
    const panel=qs('#rightSide');
    if(!panel) return;
    const filters=qs('#filterList',panel);
    const filterSummary=qs('#filterSummary',panel);
    if(filters && filterSummary){
      const raw=(filters.textContent||'').trim();
      if(/^(No filters|Inga filter)/i.test(raw)) filters.textContent='';
    }
    qsa('.tiny',panel).forEach(node=>{
      const raw=(node.textContent||'').trim();
      if(isSv() && /^No filters\. Add any dimension/i.test(raw)) txt(node,'Inga filter. Lägg till valfri dimension — även egna dimensioner — och välj ett värde.');
      if(!isSv() && /^Inga filter\./i.test(raw)) txt(node,'No filters. Add any dimension — including custom dimensions — and choose a value.');
    });
  }

  function polishCredit(){
    const credit=qs('.callyMenuAboutCredit');
    if(credit && /Patrik Sundblom/i.test(credit.textContent||'')) credit.dataset.callyAuthorCredit='1';
  }

  function apply(){polishTop();polishEvent();polishPerson();polishPerspective();polishCredit();}
  const schedule=()=>{requestAnimationFrame(apply);setTimeout(apply,0);setTimeout(apply,60);};

  document.addEventListener('click',event=>{
    if(event.target.closest?.('#eventBtn,#personBtn,#perspectiveBtn,#callyMenuButton,[data-edit-event],.eventEdit')) schedule();
  });
  window.addEventListener('cally-one-ui-refresh',schedule);
  window.addEventListener('cally-locale-change',schedule);
  window.addEventListener('cally-terminology-change',schedule);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',schedule,{once:true}); else schedule();
})();
