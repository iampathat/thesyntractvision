/* Cally.One language + account-access surface.
   Language and account roles are represented state. Browser UI is only an adapter;
   no QCDS inference is started here. */
(() => {
  if (window.__callyLocaleAccessUI) return;
  window.__callyLocaleAccessUI = true;

  const qs=(s,r=document)=>r.querySelector(s), qsa=(s,r=document)=>[...r.querySelectorAll(s)];
  const LOCALE_KEY='cally.one.interface-locale.v2';
  const LEGACY_LOCALE_KEY='cally.one.locale.v1';
  const LANGUAGES=[
    {code:'sv',labels:{sv:'Svenska',en:'Swedish'},native_label:'Svenska',locale:'sv-SE'},
    {code:'en',labels:{sv:'Engelska',en:'English'},native_label:'English',locale:'en-GB'},
  ];
  const ACCOUNT_ROLES=[
    {code:'member',labels:{sv:'Medlem',en:'Member'}},
    {code:'admin',labels:{sv:'Admin',en:'Admin'}},
    {code:'superadmin',labels:{sv:'Superadmin',en:'Superadmin'}},
  ];

  const activeSpace=()=>{try{return window.__callyActiveSpace?.()||'personal';}catch(_){return'personal';}};
  const stateKey=()=>{try{return window.__callySpaceStorageKey?.()||'cally.one.state.v1';}catch(_){return'cally.one.state.v1';}};
  const accessKey=()=>`cally.one.access.v1:${activeSpace()}`;

  function readState(){try{const s=JSON.parse(localStorage.getItem(stateKey())||'{}');if(!Array.isArray(s.people))s.people=[];if(!Array.isArray(s.entities))s.entities=[];if(!Array.isArray(s.dimension_states))s.dimension_states=[];if(!s.state_model||typeof s.state_model!=='object')s.state_model={};return s;}catch(_){return{people:[],entities:[],dimension_states:[],state_model:{}};}}
  function writeState(state){try{localStorage.setItem(stateKey(),JSON.stringify(state));}catch(_){}}
  function readLocale(){const stored=String(localStorage.getItem(LOCALE_KEY)||localStorage.getItem(LEGACY_LOCALE_KEY)||'').toLowerCase();if(LANGUAGES.some(x=>x.code===stored))return stored;return String(navigator.language||'sv').toLowerCase().startsWith('sv')?'sv':'en';}
  let locale=readLocale();
  window.__callyLocale=()=>locale;

  function flag(code){
    if(code==='sv')return `<svg class="callyLangFlag" viewBox="0 0 28 20" aria-hidden="true"><rect width="28" height="20" rx="2" fill="#1769aa"/><rect x="8" width="3" height="20" fill="#ffd447"/><rect y="8" width="28" height="3" fill="#ffd447"/></svg>`;
    return `<svg class="callyLangFlag" viewBox="0 0 28 20" aria-hidden="true"><rect width="28" height="20" rx="2" fill="#21468b"/><path d="M0 0l28 20M28 0L0 20" stroke="#fff" stroke-width="5"/><path d="M0 0l28 20M28 0L0 20" stroke="#cf142b" stroke-width="2"/><path d="M14 0v20M0 10h28" stroke="#fff" stroke-width="6"/><path d="M14 0v20M0 10h28" stroke="#cf142b" stroke-width="3"/></svg>`;
  }

  function dimensionSpec(key,current=null){
    if(key==='language')return {key:'language',label:'Språk',labels:{sv:'Språk',en:'Language'},value_kind:'language-state',preferred:true,rich_editor:true,system:true,origin:'system',status:'active',hidden:false,values:Array.isArray(current?.values)&&current.values.length?current.values:LANGUAGES.map(x=>({...x}))};
    return {key:'account_role',label:'Kontoroll',labels:{sv:'Kontoroll',en:'Account role'},value_kind:'access-role-state',preferred:false,rich_editor:true,system:true,origin:'system',status:'active',hidden:false,values:ACCOUNT_ROLES.map(x=>({code:x.code,labels:x.labels}))};
  }

  function ensureDomainState(){
    const state=readState();
    for(const key of ['language','account_role']){const current=state.dimension_states.find(item=>item&&item.key===key);const spec=dimensionSpec(key,current);const i=state.dimension_states.findIndex(item=>item&&item.key===key);if(i>=0)state.dimension_states[i]={...spec,...state.dimension_states[i],values:state.dimension_states[i].values||spec.values};else state.dimension_states.push(spec);}
    state.interface_language=locale;
    state.state_model.language_is_dimension = true;
    state.state_model.account_role_is_dimension = true;
    state.state_model.interface_language_is_independent_projection = true;
    state.state_model.native_clients_are_adapters = true;
    state.state_model.shared_domain_contract = true;
    if(activeSpace()==='demo-family-company'){
      const p=state.people.find(x=>String(x.person_id||x.entity_id)==='person:johan');if(p)p.dimensions={...(p.dimensions||{}),account_role:'superadmin',subscription_responsible:true};
      const e=state.entities.find(x=>x.entity_id==='person:johan');if(e)e.dimensions={...(e.dimensions||{}),account_role:'superadmin',subscription_responsible:true};
    }
    writeState(state);
  }

  function readAccessProfile(){try{const p=JSON.parse(localStorage.getItem(accessKey())||'{}');if(p&&ACCOUNT_ROLES.some(x=>x.code===p.role))return p;}catch(_){}const bootstrap={role:'superadmin',subscription_responsible:true,bootstrap_owner:true};try{localStorage.setItem(accessKey(),JSON.stringify(bootstrap));}catch(_){}return bootstrap;}
  let access=readAccessProfile();
  window.__callyAccessProfile=()=>({...access});
  window.__callyIsSuperadmin=()=>access.role==='superadmin';

  const TEXT={
    'Personer':{sv:'Personer',en:'People'},'People':{sv:'Personer',en:'People'},'Perspektiv':{sv:'Perspektiv',en:'Perspective'},'Perspective':{sv:'Perspektiv',en:'Perspective'},
    'Dimensioner':{sv:'Dimensioner',en:'Dimensions'},'Dimensions':{sv:'Dimensioner',en:'Dimensions'},'Organisationer':{sv:'Organisationer',en:'Organizations'},'Organizations':{sv:'Organisationer',en:'Organizations'},
    'Resurser':{sv:'Resurser',en:'Resources'},'Resources':{sv:'Resurser',en:'Resources'},'Saker/krav':{sv:'Saker/krav',en:'Things / requirements'},'Things / requirements':{sv:'Saker/krav',en:'Things / requirements'},
    'Händelse':{sv:'Händelse',en:'Event'},'Event':{sv:'Händelse',en:'Event'},'När':{sv:'När',en:'When'},'When':{sv:'När',en:'When'},'Var':{sv:'Var',en:'Where'},'Where':{sv:'Var',en:'Where'},
    'Kolla tider':{sv:'Kolla tider',en:'Check times'},'Check times':{sv:'Kolla tider',en:'Check times'},'Spara':{sv:'Spara',en:'Save'},'Save':{sv:'Spara',en:'Save'},'Återgå':{sv:'Återgå',en:'Back'},'Back':{sv:'Återgå',en:'Back'},'Today':{sv:'Idag',en:'Today'},'Idag':{sv:'Idag',en:'Today'}
  };
  function translateExact(root=document){qsa('button,h2,h3,.eyebrow,.stateKind,.callyEventSection h3',root).forEach(node=>{if(node.closest?.('.callyLocaleAccessSheet,.callyQcdsStateSheet'))return;const item=TEXT[node.textContent.trim()];if(item)node.textContent=item[locale];});document.documentElement.lang=locale;}

  function overlay(){let o=qs('#callyLocaleAccessOverlay');if(o)return o;o=document.createElement('div');o.id='callyLocaleAccessOverlay';o.className='callyLocaleAccessOverlay';o.innerHTML='<section class="callyLocaleAccessSheet" role="dialog" aria-modal="true"></section>';document.body.appendChild(o);o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('open');});return o;}
  function closeOverlay(){qs('#callyLocaleAccessOverlay')?.classList.remove('open');}

  function openLanguage(){
    const o=overlay(),sheet=qs('.callyLocaleAccessSheet',o);const state=readState();const dim=state.dimension_states.find(x=>x.key==='language');const values=Array.isArray(dim?.values)&&dim.values.length?dim.values:LANGUAGES;
    sheet.innerHTML=`<div class="callyLocaleAccessHead"><div><div class="eyebrow">${locale==='sv'?'GRÄNSSNITTSSPRÅK':'INTERFACE LANGUAGE'}</div><h2>${locale==='sv'?'Språk & konto':'Language & account'}</h2><p>${locale==='sv'?'Det här valet styr huvudmenyer och administration. Kalenderns eget visningsspråk, tideräkning och tidszon väljs separat.':'This controls main menus and administration. Calendar display language, calendar system and time zone are selected separately.'}</p></div><button type="button" data-cally-locale-close>×</button></div><div class="callyLanguageChoices">${values.filter(x=>['sv','en'].includes(x.code)).map(item=>`<button type="button" data-cally-locale="${item.code}" class="${item.code===locale?'active':''}">${flag(item.code)}<b>${item.labels?.[locale]||item.native_label||item.code}</b><small>${item.native_label||item.code.toUpperCase()}</small><span>${item.code===locale?'✓':''}</span></button>`).join('')}</div><button type="button" class="callyLocaleDimensionLink" data-cally-language-dimension>${locale==='sv'?'Konfigurera språkets betydelser i Dimensioner':'Configure language meanings in Dimensions'}</button>`;
    o.classList.add('open');
  }

  function openAdmin(){
    if(access.role!=='superadmin')return;const state=readState(),o=overlay(),sheet=qs('.callyLocaleAccessSheet',o),people=state.people||[];
    sheet.innerHTML=`<div class="callyLocaleAccessHead"><div><div class="eyebrow">SUPERADMIN</div><h2>${locale==='sv'?'Administration & abonnemang':'Administration & subscription'}</h2><p>${locale==='sv'?'Superadmin hanterar prenumerationsansvar och kontoroller. Delning av kalenderstate är en separat dimension.':'Superadmin handles subscription ownership and account roles. Calendar-state sharing is a separate dimension.'}</p></div><button type="button" data-cally-locale-close>×</button></div><div class="callyAdminSummary"><div><small>${locale==='sv'?'AKTIV ROLL':'ACTIVE ROLE'}</small><b>Superadmin</b></div><div><small>${locale==='sv'?'PRENUMERATIONSANSVAR':'SUBSCRIPTION OWNER'}</small><b>${access.subscription_responsible?(locale==='sv'?'Ja':'Yes'):(locale==='sv'?'Nej':'No')}</b></div></div><div class="callyAdminPeople"><div class="callyAdminPeopleHead"><b>${locale==='sv'?'Kontoroller':'Account roles'}</b><small>${locale==='sv'?'Rollerna är dimensionsstate och ersätter inte personens jobb-/familjeroll.':'These are dimension states and do not replace a person’s work/family role.'}</small></div>${people.map(person=>{const entity=state.entities.find(x=>x.entity_id===(person.entity_id||person.person_id));const dims={...(entity?.dimensions||{}),...(person.dimensions||{})};const role=dims.account_role||'member',resp=!!dims.subscription_responsible;return `<div class="callyAdminPerson" data-admin-person="${person.person_id||person.entity_id}"><div><b>${person.name||'Person'}</b><small>${person.role||''}</small></div><select data-admin-role>${ACCOUNT_ROLES.map(x=>`<option value="${x.code}" ${x.code===role?'selected':''}>${x.labels[locale]}</option>`).join('')}</select><label><input type="radio" name="subscription-owner" data-admin-responsible ${resp?'checked':''}> ${locale==='sv'?'Prenumerationsansvarig':'Subscription owner'}</label></div>`;}).join('')}</div>`;o.classList.add('open');
  }

  window.__callyOpenInterfaceLanguage=openLanguage;
  window.__callyOpenAccountAdmin=openAdmin;

  function setLocale(code){if(!LANGUAGES.some(x=>x.code===code))return;locale=code;try{localStorage.setItem(LOCALE_KEY,code);}catch(_){}ensureDomainState();closeOverlay();location.reload();}
  function updatePersonAccess(row){if(access.role!=='superadmin')return;const personId=row.dataset.adminPerson,role=qs('[data-admin-role]',row)?.value||'member',responsible=!!qs('[data-admin-responsible]',row)?.checked,state=readState();if(responsible){state.people.forEach(x=>x.dimensions={...(x.dimensions||{}),subscription_responsible:false});state.entities.filter(x=>x.kind==='person').forEach(x=>x.dimensions={...(x.dimensions||{}),subscription_responsible:false});}const person=state.people.find(x=>String(x.person_id||x.entity_id)===String(personId));if(person)person.dimensions={...(person.dimensions||{}),account_role:role,subscription_responsible:responsible};const entity=state.entities.find(x=>String(x.entity_id)===String(person?.entity_id||personId));if(entity)entity.dimensions={...(entity.dimensions||{}),account_role:role,subscription_responsible:responsible};writeState(state);window.dispatchEvent(new CustomEvent('cally-one-ui-refresh'));}

  function ensureMenu(){
    const menu=qs('#callyMobileMenu');if(!menu||qs('[data-cally-system-menu]',menu))return;
    let block=qs('.callyLocaleAccessMenu',menu);if(!block){block=document.createElement('section');block.className='callyLocaleAccessMenu';menu.appendChild(block);}const admin=access.role==='superadmin'?`<button type="button" data-cally-account-admin><span>⌘</span><b>Administration</b><small>Superadmin</small></button>`:'';block.innerHTML=`<div class="callyLocaleAccessKicker">${locale==='sv'?'SPRÅK & KONTO':'LANGUAGE & ACCOUNT'}</div><button type="button" data-cally-language>${flag(locale)}<b>${locale==='sv'?'Gränssnitt · Svenska':'Interface · English'}</b><small>${locale.toUpperCase()}</small></button>${admin}`;
  }

  function refresh(){ensureDomainState();access=readAccessProfile();ensureMenu();translateExact();}
  document.addEventListener('click',event=>{if(event.target.closest?.('[data-cally-language]')){event.preventDefault();openLanguage();return;}if(event.target.closest?.('[data-cally-account-admin]')){event.preventDefault();openAdmin();return;}const lang=event.target.closest?.('[data-cally-locale]');if(lang){event.preventDefault();setLocale(lang.dataset.callyLocale);return;}if(event.target.closest?.('[data-cally-locale-close]')){closeOverlay();return;}if(event.target.closest?.('[data-cally-language-dimension]')){closeOverlay();window.__callyOpenDimensionCenter?.('languages');return;}});
  document.addEventListener('change',event=>{const row=event.target.closest?.('[data-admin-person]');if(!row)return;if(event.target.matches('[data-admin-role],[data-admin-responsible]')){if(event.target.matches('[data-admin-responsible]')&&event.target.checked)qsa('[data-admin-responsible]').forEach(input=>{if(input!==event.target)input.checked=false;});updatePersonAccess(row);}});
  window.addEventListener('cally-one-ui-refresh',refresh);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
})();