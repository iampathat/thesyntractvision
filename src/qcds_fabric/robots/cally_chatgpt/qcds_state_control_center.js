/* Cally.One unified state/dimension control center.
   This is a UI adapter over Calendar Space state. It does not implement inference.
   QCDS remains the sole inference engine when inference is explicitly requested. */
(() => {
  if (window.__callyQcdsStateControlCenter) return;
  window.__callyQcdsStateControlCenter = true;

  const qs = (s, root=document) => root.querySelector(s);
  const qsa = (s, root=document) => [...root.querySelectorAll(s)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uiLocale = () => { try { return window.__callyLocale?.() || 'sv'; } catch (_) { return 'sv'; } };
  const sv = () => uiLocale() === 'sv';

  async function readState() {
    try {
      const r = await fetch('/api/state');
      const body = await r.json();
      if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
      if (!Array.isArray(body.dimension_states)) body.dimension_states = [];
      if (!body.state_model || typeof body.state_model !== 'object') body.state_model = {};
      return body;
    } catch (_) {
      try {
        const key = window.__callySpaceStorageKey?.() || 'cally.one.state.v1';
        const body = JSON.parse(localStorage.getItem(key) || '{}');
        if (!Array.isArray(body.dimension_states)) body.dimension_states = [];
        if (!body.state_model || typeof body.state_model !== 'object') body.state_model = {};
        return body;
      } catch (_) { return {dimension_states:[],state_model:{}}; }
    }
  }

  async function postDimension(payload) {
    const r = await fetch('/api/dimension', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const body = await r.json();
    if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
    return body;
  }

  async function retireDimension(key, retired) {
    const r = await fetch('/api/dimension/retire', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key,retired})});
    const body = await r.json();
    if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
    return body;
  }

  function flag(code) {
    if (code === 'sv') return `<svg class="callyLangFlag" viewBox="0 0 28 20" aria-hidden="true"><rect width="28" height="20" rx="2" fill="#1769aa"/><rect x="8" width="3" height="20" fill="#ffd447"/><rect y="8" width="28" height="3" fill="#ffd447"/></svg>`;
    return `<svg class="callyLangFlag" viewBox="0 0 28 20" aria-hidden="true"><rect width="28" height="20" rx="2" fill="#21468b"/><path d="M0 0l28 20M28 0L0 20" stroke="#fff" stroke-width="5"/><path d="M0 0l28 20M28 0L0 20" stroke="#cf142b" stroke-width="2"/><path d="M14 0v20M0 10h28" stroke="#fff" stroke-width="6"/><path d="M14 0v20M0 10h28" stroke="#cf142b" stroke-width="3"/></svg>`;
  }

  function overlay() {
    let host = qs('#callyQcdsStateCenter');
    if (host) return host;
    host = document.createElement('div');
    host.id = 'callyQcdsStateCenter';
    host.className = 'callyQcdsStateCenter';
    host.innerHTML = '<section class="callyQcdsStateSheet" role="dialog" aria-modal="true"></section>';
    document.body.appendChild(host);
    host.addEventListener('click', event => { if (event.target === host) close(); });
    return host;
  }

  function close() { qs('#callyQcdsStateCenter')?.classList.remove('open'); }

  function languageValues(item) {
    const current = Array.isArray(item?.values) ? item.values : [];
    const byCode = new Map(current.map(value => [String(value.code || ''), value]));
    return ['sv','en'].map(code => {
      const value = byCode.get(code) || {};
      return {
        code,
        labels:{
          sv:String(value.labels?.sv || (code === 'sv' ? 'Svenska' : 'Engelska')),
          en:String(value.labels?.en || (code === 'sv' ? 'Swedish' : 'English')),
        },
        native_label:String(value.native_label || (code === 'sv' ? 'Svenska' : 'English')),
        locale:String(value.locale || (code === 'sv' ? 'sv-SE' : 'en-GB')),
        direction:String(value.direction || 'ltr'),
      };
    });
  }

  function dimensionLabel(item) {
    const labels = item?.labels || {};
    return labels[uiLocale()] || labels.sv || labels.en || item?.label || item?.key || 'Dimension';
  }

  async function saveLanguageMeanings(sheet, item) {
    const values = qsa('[data-language-meaning]',sheet).map(row => ({
      code:row.dataset.languageMeaning,
      labels:{sv:qs('[data-meaning-sv]',row).value.trim(),en:qs('[data-meaning-en]',row).value.trim()},
      native_label:qs('[data-meaning-native]',row).value.trim(),
      locale:qs('[data-meaning-locale]',row).value.trim(),
      direction:'ltr',
    }));
    await postDimension({
      key:'language',
      label:item?.label || 'Språk',
      labels:item?.labels || {sv:'Språk',en:'Language'},
      value_kind:'language-state',preferred:true,system:true,origin:'system',values,
    });
    window.toast?.(sv() ? 'Språkbetydelser sparade som dimension state' : 'Language meanings saved as dimension state');
    await renderCenter('languages');
  }

  function renderLanguageTab(sheet, state) {
    const item = state.dimension_states.find(dim => dim.key === 'language') || {key:'language',label:'Språk',labels:{sv:'Språk',en:'Language'}};
    const values = languageValues(item);
    return `<div class="callyStatePane" data-state-pane="languages">
      <div class="callyStatePaneIntro"><div><small>${sv()?'SPRÅKDIMENSION':'LANGUAGE DIMENSION'}</small><h3>${sv()?'Betydelser & språkstate':'Meanings & language state'}</h3><p>${sv()?'Här konfigureras vad språkvärdena betyder. Koden är stabil identitet; namn/översättningar är representationsstate.':'Configure what language values mean here. The code is stable identity; names/translations are representation state.'}</p></div></div>
      <div class="callyMeaningGrid">${values.map(value=>`<section class="callyMeaningCard" data-language-meaning="${value.code}"><div class="callyMeaningHead">${flag(value.code)}<div><b>${esc(value.native_label)}</b><small>${value.code.toUpperCase()} · ${esc(value.locale)}</small></div></div><label>${sv()?'Betydelse på svenska':'Meaning in Swedish'}<input data-meaning-sv value="${esc(value.labels.sv)}"></label><label>${sv()?'Betydelse på engelska':'Meaning in English'}<input data-meaning-en value="${esc(value.labels.en)}"></label><label>${sv()?'Eget namn':'Native label'}<input data-meaning-native value="${esc(value.native_label)}"></label><label>Locale<input data-meaning-locale value="${esc(value.locale)}"></label></section>`).join('')}</div>
      <button class="callyStatePrimary" data-save-language-meanings>${sv()?'Spara språkdimension':'Save language dimension'}</button>
    </div>`;
  }

  function renderModelTab(state) {
    const model = state.state_model || {};
    return `<div class="callyStatePane" data-state-pane="model">
      <div class="callyLogicalRobotHero"><small>QCDS · LOGICAL ROBOT</small><h3>${sv()?'Kalendern är inte en samling specialfall':'The calendar is not a collection of special cases'}</h3><p>${sv()?'Person, händelse, språk, kalendersystem, tidszon, åtkomst, bil, rum och krav representeras som tillstånd och dimensioner. QCDS är enda inferensmotorn när ett logiskt svar faktiskt begärs.':'Person, event, language, calendar system, time zone, access, car, room and requirements are represented as states and dimensions. QCDS is the sole inference engine when a logical answer is actually requested.'}</p></div>
      <div class="callyQcdsFlow"><span>State Space</span><b>→</b><span>Dimensions + Relations</span><b>→</b><span>Constraints / Oracles</span><b>→</b><span>QCDS 4 phases</span><b>→</b><span>Syntract</span></div>
      <div class="callyModelFacts"><div><small>everything_is_state</small><b>${model.everything_is_state !== false ? 'TRUE' : '—'}</b></div><div><small>dimensions_are_state</small><b>TRUE</b></div><div><small>shared_qcds_core</small><b>TRUE</b></div><div><small>native_clients_are_adapters</small><b>${model.native_clients_are_adapters !== false ? 'TRUE' : '—'}</b></div></div>
      <div class="callyStateNote">${sv()?'Vanliga klick, scroll, redigering och visningsprojektioner startar inte inferens. “Kolla tider” skickar representerade alternativ genom den gemensamma QCDS/Syntract-kärnan. Webben, framtida mobilappar och tredjepartsklienter ska vara adaptrar till samma domänkontrakt.':'Ordinary clicks, scrolling, editing and display projections do not start inference. “Check times” sends represented alternatives through the shared QCDS/Syntract core. Web, future mobile apps and third-party clients are adapters to the same domain contract.'}</div>
    </div>`;
  }

  function renderProjectionTab(state) {
    const projection = state.calendar_projection || {};
    const interfaceLanguage = state.interface_language || window.__callyLocale?.() || 'sv';
    const rows = [
      ['interface_language',interfaceLanguage,sv()?'Huvudmenyer / admin':'Main menus / admin'],
      ['calendar_display_language',projection.displayLocale || 'sv',sv()?'Språk i kalenderns datum/tider':'Language for calendar dates/times'],
      ['calendar_system',projection.calendar || 'gregory',sv()?'Tideräkning':'Calendar system'],
      ['time_zone',projection.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,sv()?'Tidszon':'Time zone'],
      ['clock_format',projection.hourCycle || 'auto',sv()?'Klockformat':'Clock format'],
    ];
    return `<div class="callyStatePane" data-state-pane="projection"><div class="callyStatePaneIntro"><div><small>${sv()?'PROJEKTIONSSTATE':'PROJECTION STATE'}</small><h3>${sv()?'Oberoende visningsdimensioner':'Independent display dimensions'}</h3><p>${sv()?'Exempel: svenska huvudmenyer + engelska kalenderetiketter + kinesisk tideräkning + Asia/Shanghai. Samma underliggande tidsstate.':'Example: Swedish main menus + English calendar labels + Chinese calendar system + Asia/Shanghai. Same underlying time state.'}</p></div><button data-open-calendar-display>${sv()?'Ändra visning':'Change display'}</button></div><div class="callyProjectionStateRows">${rows.map(([key,value,meaning])=>`<div><code>${esc(key)}</code><b>${esc(value)}</b><span>${esc(meaning)}</span></div>`).join('')}</div></div>`;
  }

  function renderDimensionsTab(state) {
    const dimensions = [...state.dimension_states].sort((a,b)=>dimensionLabel(a).localeCompare(dimensionLabel(b),uiLocale()));
    return `<div class="callyStatePane" data-state-pane="dimensions"><div class="callyStatePaneIntro"><div><small>CALENDAR SPACE · QCDS</small><h3>${sv()?'Dimensioner är tillstånd':'Dimensions are states'}</h3><p>${sv()?'Klicka en dimension för att ändra namn, semantik och värden. Ta bort pensionerar bara dimensionen; historiskt state finns kvar.':'Open a dimension to change labels, semantics and values. Remove only retires the dimension; historical state remains.'}</p></div><button data-new-dimension>+ ${sv()?'Dimension':'Dimension'}</button></div><input class="callyStateSearch" data-dimension-search placeholder="${sv()?'Sök dimension…':'Search dimension…'}"><div class="callyDimensionCards">${dimensions.map(item=>`<section class="callyDimensionCard" data-dimension-key="${esc(item.key)}"><div><b>${esc(dimensionLabel(item))}</b><small><code>${esc(item.key)}</code> · ${esc(item.value_kind || 'scalar')}${Array.isArray(item.values)?` · ${item.values.length} values`:''}</small></div><div class="callyDimensionBadges">${item.system?'<span>system</span>':''}${item.preferred?'<span>common</span>':''}${item.status!=='active'?'<span>retired</span>':''}</div><div class="callyDimensionActions"><button data-edit-dimension="${esc(item.key)}">${sv()?'Redigera':'Edit'}</button>${item.key==='language'?`<button data-tab-jump="languages">${sv()?'Betydelser':'Meanings'}</button>`:''}<button data-toggle-dimension="${esc(item.key)}" data-retired="${item.status!=='active'}">${item.status==='active'?(sv()?'Ta bort':'Remove'):(sv()?'Återställ':'Restore')}</button></div></section>`).join('')}</div></div>`;
  }

  function renderEditor(sheet, item=null) {
    const values = Array.isArray(item?.values) ? item.values : [];
    sheet.innerHTML = `<header class="callyQcdsStateHead"><div><small>DIMENSION STATE</small><h2>${item?(sv()?'Redigera dimension':'Edit dimension'):(sv()?'Ny dimension':'New dimension')}</h2></div><button data-state-close>×</button></header><div class="callyDimensionEditor"><label>Canonical key<input data-dim-key value="${esc(item?.key || '')}" ${item?'readonly':''}></label><div class="callyStateTwo"><label>Svenska<input data-dim-sv value="${esc(item?.labels?.sv || item?.label || '')}"></label><label>English<input data-dim-en value="${esc(item?.labels?.en || '')}"></label></div><label>Aliases<input data-dim-aliases value="${esc((item?.aliases || []).join(', '))}"></label><label>State/value semantics<select data-dim-kind>${['scalar','entity:person','entity:organization','entity:resource','entity:thing','event','temporal:day','language-state','calendar-system-state','time-zone-state','clock-format-state','access-role-state'].map(kind=>`<option ${item?.value_kind===kind?'selected':''}>${kind}</option>`).join('')}</select></label><div class="callyStateNote">${sv()?'Canonical key är identiteten. Etiketter och värdesemantik kan utvecklas utan att gamla relationer tappar sin betydelse.':'Canonical key is identity. Labels and value semantics can evolve without breaking historical relations.'}</div><button class="callyStatePrimary" data-save-dimension>${sv()?'Spara dimension state':'Save dimension state'}</button></div>`;
    qs('[data-state-close]',sheet)?.addEventListener('click',close);
    qs('[data-save-dimension]',sheet)?.addEventListener('click',async()=>{
      const key=qs('[data-dim-key]',sheet).value.trim(); if(!key)return;
      const labelSv=qs('[data-dim-sv]',sheet).value.trim()||key; const labelEn=qs('[data-dim-en]',sheet).value.trim()||labelSv;
      try { await postDimension({key,label:labelSv,labels:{sv:labelSv,en:labelEn},aliases:qs('[data-dim-aliases]',sheet).value.split(',').map(x=>x.trim()).filter(Boolean),value_kind:qs('[data-dim-kind]',sheet).value,preferred:item?.preferred||false,system:item?.system||false,origin:item?.origin||'user',values}); await renderCenter('dimensions'); window.toast?.(sv()?'Dimension sparad':'Dimension saved'); } catch(error){window.toast?.(error.message||String(error));}
    });
  }

  async function editDimension(key) {
    const state = await readState();
    const item = key ? state.dimension_states.find(dim=>dim.key===key) : null;
    const host=overlay(),sheet=qs('.callyQcdsStateSheet',host);renderEditor(sheet,item);host.classList.add('open');
  }

  async function renderCenter(tab='dimensions') {
    const state = await readState();
    const host = overlay(); const sheet = qs('.callyQcdsStateSheet',host);
    sheet.innerHTML = `<header class="callyQcdsStateHead"><div><small>CALLY.ONE · LOGICAL ROBOT</small><h2>${sv()?'Tillstånd & dimensioner':'States & dimensions'}</h2><p>${sv()?'En domänmodell. Många projektioner. QCDS som enda inferensmotor.':'One domain model. Many projections. QCDS as the sole inference engine.'}</p></div><button data-state-close>×</button></header><nav class="callyStateTabs"><button data-state-tab="dimensions">${sv()?'Dimensioner':'Dimensions'}</button><button data-state-tab="languages">${sv()?'Språkbetydelser':'Language meanings'}</button><button data-state-tab="projection">${sv()?'Visningsstate':'Display state'}</button><button data-state-tab="model">QCDS</button></nav><main>${tab==='languages'?renderLanguageTab(sheet,state):tab==='projection'?renderProjectionTab(state):tab==='model'?renderModelTab(state):renderDimensionsTab(state)}</main>`;
    qsa('[data-state-tab]',sheet).forEach(button=>{button.classList.toggle('active',button.dataset.stateTab===tab);button.onclick=()=>renderCenter(button.dataset.stateTab);});
    qs('[data-state-close]',sheet)?.addEventListener('click',close);
    qsa('[data-tab-jump]',sheet).forEach(button=>button.onclick=()=>renderCenter(button.dataset.tabJump));
    qsa('[data-edit-dimension]',sheet).forEach(button=>button.onclick=()=>editDimension(button.dataset.editDimension));
    qs('[data-new-dimension]',sheet)?.addEventListener('click',()=>editDimension(null));
    qs('[data-save-language-meanings]',sheet)?.addEventListener('click',()=>saveLanguageMeanings(sheet,state.dimension_states.find(dim=>dim.key==='language')).catch(error=>window.toast?.(error.message||String(error))));
    qs('[data-open-calendar-display]',sheet)?.addEventListener('click',()=>window.__callyOpenCalendarDisplaySettings?.());
    qsa('[data-toggle-dimension]',sheet).forEach(button=>button.onclick=async()=>{try{await retireDimension(button.dataset.toggleDimension,button.dataset.retired!=='true');await renderCenter('dimensions');}catch(error){window.toast?.(error.message||String(error));}});
    const search=qs('[data-dimension-search]',sheet); search?.addEventListener('input',()=>{const query=search.value.trim().toLowerCase();qsa('.callyDimensionCard',sheet).forEach(card=>{card.hidden=query&&!card.textContent.toLowerCase().includes(query);});});
    host.classList.add('open');
  }

  window.__callyOpenDimensionCenter = (tab='dimensions') => renderCenter(tab);
  window.__callyOpenDimensionEditor = key => editDimension(key);

  function systemMenuHtml() {
    const isSuper = !!window.__callyIsSuperadmin?.();
    return `<section class="callySystemMenu" data-cally-system-menu><div class="callySystemMenuKicker">${sv()?'SYSTEM · TILLSTÅND':'SYSTEM · STATE'}</div><button data-system-action="dimensions"><span class="callySystemIcon">◇</span><span><b>${sv()?'Dimensioner & state':'Dimensions & state'}</b><small>${sv()?'Semantik, språk, relationer och QCDS-modell':'Semantics, language, relations and QCDS model'}</small></span></button><button data-system-action="display"><span class="callySystemIcon">◫</span><span><b>${sv()?'Kalendervisning':'Calendar display'}</b><small>${sv()?'Visningsspråk, tideräkning, tidszon, 12/24 h':'Display language, calendar system, time zone, 12/24 h'}</small></span></button><button data-system-action="language"><span class="callySystemIcon">${flag(uiLocale())}</span><span><b>${sv()?'Gränssnittsspråk':'Interface language'}</b><small>${sv()?'Huvudmenyer och administration':'Main menus and administration'}</small></span></button>${isSuper?`<button data-system-action="admin"><span class="callySystemIcon">⌘</span><span><b>${sv()?'Administration':'Administration'}</b><small>Superadmin · ${sv()?'prenumeration och kontoroller':'subscription and account roles'}</small></span></button>`:''}</section>`;
  }

  function consolidateMenu() {
    const menu=qs('#callyMobileMenu'); if(!menu)return;
    qsa(':scope > button[data-nav],:scope > .callyDisplayMenuButton,:scope > .callyLocaleAccessMenu',menu).forEach(node=>node.remove());
    let system=qs('[data-cally-system-menu]',menu); if(!system){menu.insertAdjacentHTML('afterbegin',systemMenuHtml());system=qs('[data-cally-system-menu]',menu);} else system.outerHTML=systemMenuHtml();
  }

  document.addEventListener('click',event=>{
    const action=event.target.closest?.('[data-system-action]')?.dataset.systemAction;if(!action)return;
    event.preventDefault();event.stopPropagation();
    qs('#callyMobileMenu')?.setAttribute('hidden','');qs('#callyMenuButton')?.setAttribute('aria-expanded','false');
    if(action==='dimensions')renderCenter('dimensions');
    else if(action==='display')window.__callyOpenCalendarDisplaySettings?.();
    else if(action==='language')window.__callyOpenInterfaceLanguage?.();
    else if(action==='admin')window.__callyOpenAccountAdmin?.();
  });

  window.addEventListener('cally-one-ui-refresh',()=>setTimeout(consolidateMenu,0));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(consolidateMenu,0),{once:true});else setTimeout(consolidateMenu,0);
})();