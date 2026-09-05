/* Cally.One language + account-access surface.
   Language and account roles are represented state. Browser UI is only an adapter;
   no QCDS inference is started here. */
(() => {
  if (window.__callyLocaleAccessUI) return;
  window.__callyLocaleAccessUI = true;

  const qs = (s, root=document) => root.querySelector(s);
  const qsa = (s, root=document) => [...root.querySelectorAll(s)];
  const LOCALE_KEY = 'cally.one.locale.v1';
  const LANGUAGES = [
    {code:'sv', labels:{sv:'Svenska', en:'Swedish'}},
    {code:'en', labels:{sv:'Engelska', en:'English'}},
  ];
  const ACCOUNT_ROLES = [
    {code:'member', labels:{sv:'Medlem', en:'Member'}},
    {code:'admin', labels:{sv:'Admin', en:'Admin'}},
    {code:'superadmin', labels:{sv:'Superadmin', en:'Superadmin'}},
  ];

  const activeSpace = () => {
    try { return window.__callyActiveSpace?.() || 'personal'; }
    catch (_) { return 'personal'; }
  };
  const stateKey = () => {
    try { return window.__callySpaceStorageKey?.() || 'cally.one.state.v1'; }
    catch (_) { return 'cally.one.state.v1'; }
  };
  const accessKey = () => `cally.one.access.v1:${activeSpace()}`;

  function readLocale() {
    const stored = String(localStorage.getItem(LOCALE_KEY) || '').toLowerCase();
    if (LANGUAGES.some(item => item.code === stored)) return stored;
    return String(navigator.language || 'sv').toLowerCase().startsWith('sv') ? 'sv' : 'en';
  }
  let locale = readLocale();
  window.__callyLocale = () => locale;

  function readState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(stateKey()) || '{}');
      if (!Array.isArray(parsed.people)) parsed.people = [];
      if (!Array.isArray(parsed.entities)) parsed.entities = [];
      if (!Array.isArray(parsed.dimension_states)) parsed.dimension_states = [];
      if (!parsed.state_model || typeof parsed.state_model !== 'object') parsed.state_model = {};
      return parsed;
    } catch (_) { return {people:[],entities:[],dimension_states:[],state_model:{}}; }
  }
  function writeState(state) {
    try { localStorage.setItem(stateKey(), JSON.stringify(state)); }
    catch (_) {}
  }

  function dimensionSpec(key) {
    if (key === 'language') return {
      key:'language', label:'Språk', labels:{sv:'Språk',en:'Language'}, value_kind:'language-state',
      preferred:true, rich_editor:false, system:true, origin:'system', status:'active', hidden:false,
      values:LANGUAGES.map(item => ({code:item.code,labels:item.labels})),
    };
    return {
      key:'account_role', label:'Kontoroll', labels:{sv:'Kontoroll',en:'Account role'}, value_kind:'access-role-state',
      preferred:false, rich_editor:true, system:true, origin:'system', status:'active', hidden:false,
      values:ACCOUNT_ROLES.map(item => ({code:item.code,labels:item.labels})),
    };
  }

  function ensureDomainState() {
    const state = readState();
    for (const key of ['language','account_role']) {
      const spec = dimensionSpec(key);
      const index = state.dimension_states.findIndex(item => item && item.key === key);
      if (index >= 0) state.dimension_states[index] = {...state.dimension_states[index], ...spec};
      else state.dimension_states.push(spec);
    }
    state.interface_language = locale;
    state.state_model.language_is_dimension = true;
    state.state_model.account_role_is_dimension = true;
    state.state_model.native_clients_are_adapters = true;
    state.state_model.shared_domain_contract = true;

    /* Demo/bootstrap owner: represented explicitly as state, not as hidden UI magic. */
    if (activeSpace() === 'demo-family-company') {
      const person = state.people.find(item => String(item.person_id || item.entity_id) === 'person:johan');
      if (person) person.dimensions = {...(person.dimensions || {}), account_role:'superadmin', subscription_responsible:true};
      const entity = state.entities.find(item => item.entity_id === 'person:johan');
      if (entity) entity.dimensions = {...(entity.dimensions || {}), account_role:'superadmin', subscription_responsible:true};
    }
    writeState(state);
  }

  function readAccessProfile() {
    try {
      const parsed = JSON.parse(localStorage.getItem(accessKey()) || '{}');
      if (parsed && ACCOUNT_ROLES.some(item => item.code === parsed.role)) return parsed;
    } catch (_) {}
    const bootstrap = {role:'superadmin', subscription_responsible:true, bootstrap_owner:true};
    try { localStorage.setItem(accessKey(), JSON.stringify(bootstrap)); } catch (_) {}
    return bootstrap;
  }
  let access = readAccessProfile();
  window.__callyAccessProfile = () => ({...access});
  window.__callyIsSuperadmin = () => access.role === 'superadmin';

  const TEXT = {
    'Calendar Space':{sv:'Calendar Space',en:'Calendar Space'},
    'Personer':{sv:'Personer',en:'People'}, 'People':{sv:'Personer',en:'People'},
    'Perspektiv':{sv:'Perspektiv',en:'Perspective'}, 'Perspective':{sv:'Perspektiv',en:'Perspective'},
    'Dimensioner':{sv:'Dimensioner',en:'Dimensions'}, 'Dimensions':{sv:'Dimensioner',en:'Dimensions'},
    'Organisationer':{sv:'Organisationer',en:'Organizations'}, 'Organizations':{sv:'Organisationer',en:'Organizations'},
    'Resurser':{sv:'Resurser',en:'Resources'}, 'Resources':{sv:'Resurser',en:'Resources'},
    'Saker/krav':{sv:'Saker/krav',en:'Things / requirements'}, 'Things / requirements':{sv:'Saker/krav',en:'Things / requirements'},
    'Kalender & tid':{sv:'Kalender & tid',en:'Calendar & time'}, 'Calendar & time':{sv:'Kalender & tid',en:'Calendar & time'},
    'Dag':{sv:'Dag',en:'Day'}, 'Day':{sv:'Dag',en:'Day'},
    'Vecka':{sv:'Vecka',en:'Week'}, 'Week':{sv:'Vecka',en:'Week'},
    'Månad':{sv:'Månad',en:'Month'}, 'Month':{sv:'Månad',en:'Month'},
    'År':{sv:'År',en:'Year'}, 'Year':{sv:'År',en:'Year'},
    'Händelse':{sv:'Händelse',en:'Event'}, 'Event':{sv:'Händelse',en:'Event'},
    'När':{sv:'När',en:'When'}, 'When':{sv:'När',en:'When'},
    'Var':{sv:'Var',en:'Where'}, 'Where':{sv:'Var',en:'Where'},
    'Kopplade tillstånd':{sv:'Kopplade tillstånd',en:'Linked states'}, 'Linked states':{sv:'Kopplade tillstånd',en:'Linked states'},
    'Mer':{sv:'Mer',en:'More'}, 'More':{sv:'Mer',en:'More'},
    'Kolla tider':{sv:'Kolla tider',en:'Check times'}, 'Check times':{sv:'Kolla tider',en:'Check times'},
    'Spara':{sv:'Spara',en:'Save'}, 'Save':{sv:'Spara',en:'Save'},
    'Fäll ihop':{sv:'Fäll ihop',en:'Collapse'}, 'Collapse':{sv:'Fäll ihop',en:'Collapse'},
    'Återgå':{sv:'Återgå',en:'Back'}, 'Back':{sv:'Återgå',en:'Back'},
    'Idag':{sv:'Idag',en:'Today'}, 'Today':{sv:'Idag',en:'Today'},
  };

  function translateExact(root=document) {
    qsa('button,h2,h3,.eyebrow,.stateKind,.callyEventSection h3',root).forEach(node => {
      if (node.closest?.('.callyLocaleAccessSheet')) return;
      const raw = node.textContent.trim();
      const item = TEXT[raw];
      if (item) node.textContent = item[locale];
    });
    const placeholderMap = {
      'Search people...':{sv:'Sök personer...',en:'Search people...'},
      'Search all states...':{sv:'Sök alla tillstånd...',en:'Search all states...'},
      'Person, plats, händelse, dimension…':{sv:'Person, plats, händelse, dimension…',en:'Person, place, event, dimension…'},
    };
    qsa('input[placeholder]',root).forEach(input => {
      const current = input.getAttribute('placeholder') || '';
      for (const item of Object.values(placeholderMap)) {
        if (current === item.sv || current === item.en) { input.placeholder = item[locale]; break; }
      }
    });
    document.documentElement.lang = locale;
  }

  function menuLanguageLabel() {
    const lang = LANGUAGES.find(item => item.code === locale);
    return locale === 'sv' ? `Språk · ${lang?.labels.sv || locale}` : `Language · ${lang?.labels.en || locale}`;
  }

  function ensureMenu() {
    const menu = qs('#callyMobileMenu');
    if (!menu) return;
    let block = qs('.callyLocaleAccessMenu',menu);
    if (!block) {
      block = document.createElement('section');
      block.className = 'callyLocaleAccessMenu';
      menu.appendChild(block);
    }
    const adminButton = access.role === 'superadmin' ? `<button type="button" data-cally-account-admin><span class="callyMenuGlyph">⌘</span><span>${locale==='sv'?'Administration':'Administration'}</span><small>Superadmin</small></button>` : '';
    block.innerHTML = `<div class="callyLocaleAccessKicker">${locale==='sv'?'SPRÅK & KONTO':'LANGUAGE & ACCOUNT'}</div><button type="button" data-cally-language><span class="callyMenuGlyph">文</span><span>${menuLanguageLabel()}</span><small>${locale.toUpperCase()}</small></button>${adminButton}`;
  }

  function ensureOverlay() {
    let overlay = qs('#callyLocaleAccessOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'callyLocaleAccessOverlay';
    overlay.className = 'callyLocaleAccessOverlay';
    overlay.innerHTML = '<section class="callyLocaleAccessSheet" role="dialog" aria-modal="true"></section>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click',event => { if (event.target === overlay) overlay.classList.remove('open'); });
    return overlay;
  }

  function closeOverlay() { qs('#callyLocaleAccessOverlay')?.classList.remove('open'); }

  function openLanguage() {
    const overlay = ensureOverlay();
    const sheet = qs('.callyLocaleAccessSheet',overlay);
    sheet.innerHTML = `<div class="callyLocaleAccessHead"><div><div class="eyebrow">${locale==='sv'?'SPRÅKDIMENSION':'LANGUAGE DIMENSION'}</div><h2>${locale==='sv'?'Språk':'Language'}</h2><p>${locale==='sv'?'Språk är ett tillstånd i samma dimensionsmodell. Svenska och engelska är första värdena; fler språk kan läggas till utan ny kalenderarkitektur.':'Language is state in the same dimension model. Swedish and English are the first values; more languages can be added without a new calendar architecture.'}</p></div><button type="button" data-cally-locale-close aria-label="Close">×</button></div><div class="callyLanguageChoices">${LANGUAGES.map(item=>`<button type="button" data-cally-locale="${item.code}" class="${item.code===locale?'active':''}"><b>${item.labels[locale]}</b><small>${item.code.toUpperCase()}</small><span>${item.code===locale?'✓':''}</span></button>`).join('')}</div>`;
    overlay.classList.add('open');
  }

  function roleLabel(role) {
    return ACCOUNT_ROLES.find(item => item.code === role)?.labels[locale] || role;
  }

  function openAdmin() {
    if (access.role !== 'superadmin') return;
    const state = readState();
    const overlay = ensureOverlay();
    const sheet = qs('.callyLocaleAccessSheet',overlay);
    const people = state.people || [];
    sheet.innerHTML = `<div class="callyLocaleAccessHead"><div><div class="eyebrow">SUPERADMIN</div><h2>${locale==='sv'?'Administration & abonnemang':'Administration & subscription'}</h2><p>${locale==='sv'?'Superadmin är kontonivån för prenumerationsansvar och utökad administration. Händelsebehörighet och delning förblir separata tillstånd.':'Superadmin is the account-level role for subscription responsibility and extended administration. Event permissions and sharing remain separate state.'}</p></div><button type="button" data-cally-locale-close aria-label="Close">×</button></div><div class="callyAdminSummary"><div><small>${locale==='sv'?'AKTIV ROLL':'ACTIVE ROLE'}</small><b>Superadmin</b></div><div><small>${locale==='sv'?'PRENUMERATIONSANSVAR':'SUBSCRIPTION OWNER'}</small><b>${access.subscription_responsible ? (locale==='sv'?'Ja':'Yes') : (locale==='sv'?'Nej':'No')}</b></div><div><small>${locale==='sv'?'STANDARDSPRÅK':'DEFAULT LANGUAGE'}</small><b>${LANGUAGES.find(item=>item.code===locale)?.labels[locale]}</b></div></div><div class="callyAdminPeople"><div class="callyAdminPeopleHead"><b>${locale==='sv'?'Personroller':'Account roles'}</b><small>${locale==='sv'?'Rollerna är dimensionsstate och ersätter inte personens jobb-/familjeroll.':'These are dimension states and do not replace a person’s work/family role.'}</small></div>${people.map(person=>{const entity=state.entities.find(item=>item.entity_id===(person.entity_id||person.person_id));const dims={...(entity?.dimensions||{}),...(person.dimensions||{})};const accountRole=dims.account_role||'member';const responsible=Boolean(dims.subscription_responsible);return `<div class="callyAdminPerson" data-admin-person="${person.person_id||person.entity_id}"><div><b>${person.name||'Person'}</b><small>${person.role||''}</small></div><select data-admin-role>${ACCOUNT_ROLES.map(item=>`<option value="${item.code}" ${item.code===accountRole?'selected':''}>${item.labels[locale]}</option>`).join('')}</select><label><input type="radio" name="subscription-owner" data-admin-responsible ${responsible?'checked':''}> ${locale==='sv'?'Prenumerationsansvarig':'Subscription owner'}</label></div>`;}).join('')}</div>`;
    overlay.classList.add('open');
  }

  function setLocale(code) {
    if (!LANGUAGES.some(item => item.code === code)) return;
    locale = code;
    try { localStorage.setItem(LOCALE_KEY,code); } catch (_) {}
    ensureDomainState();
    closeOverlay();
    /* Reload is deliberate: every formatter/calendar projection boots with the same locale. */
    location.reload();
  }

  function updatePersonAccess(row) {
    if (access.role !== 'superadmin') return;
    const personId = row.dataset.adminPerson;
    const role = qs('[data-admin-role]',row)?.value || 'member';
    const responsible = Boolean(qs('[data-admin-responsible]',row)?.checked);
    const state = readState();
    if (responsible) {
      state.people.forEach(item => { item.dimensions = {...(item.dimensions||{}),subscription_responsible:false}; });
      state.entities.filter(item=>item.kind==='person').forEach(item => { item.dimensions = {...(item.dimensions||{}),subscription_responsible:false}; });
    }
    const person = state.people.find(item => String(item.person_id||item.entity_id) === String(personId));
    if (person) person.dimensions = {...(person.dimensions||{}),account_role:role,subscription_responsible:responsible};
    const entity = state.entities.find(item => String(item.entity_id) === String(person?.entity_id||personId));
    if (entity) entity.dimensions = {...(entity.dimensions||{}),account_role:role,subscription_responsible:responsible};
    writeState(state);
    window.dispatchEvent(new CustomEvent('cally-one-ui-refresh'));
  }

  function refresh() {
    ensureDomainState();
    access = readAccessProfile();
    ensureMenu();
    translateExact();
  }

  document.addEventListener('click',event => {
    if (event.target.closest?.('[data-cally-language]')) { event.preventDefault(); openLanguage(); return; }
    if (event.target.closest?.('[data-cally-account-admin]')) { event.preventDefault(); openAdmin(); return; }
    const lang = event.target.closest?.('[data-cally-locale]');
    if (lang) { event.preventDefault(); setLocale(lang.dataset.callyLocale); return; }
    if (event.target.closest?.('[data-cally-locale-close]')) { closeOverlay(); return; }
  });
  document.addEventListener('change',event => {
    const row = event.target.closest?.('[data-admin-person]');
    if (!row) return;
    if (event.target.matches('[data-admin-role],[data-admin-responsible]')) {
      if (event.target.matches('[data-admin-responsible]') && event.target.checked) qsa('[data-admin-responsible]').forEach(input=>{if(input!==event.target)input.checked=false;});
      updatePersonAccess(row);
    }
  });

  window.addEventListener('cally-one-ui-refresh',refresh);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',refresh,{once:true});
  else refresh();
})();
