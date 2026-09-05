/* Cally.One human + machine language bridge.
   External APIs/formats are adapters around canonical Calendar Space state.
   This projection never starts QCDS inference. */
(() => {
  if (window.__callyMachineLanguageUI) return;
  window.__callyMachineLanguageUI = true;

  const qs=(s,r=document)=>r.querySelector(s), qsa=(s,r=document)=>[...r.querySelectorAll(s)];
  const stateKey=()=>{try{return window.__callySpaceStorageKey?.()||'cally.one.state.v1';}catch(_){return'cally.one.state.v1';}};
  const locale=()=>{try{return window.__callyLocale?.()||'sv';}catch(_){return'sv';}};
  const sv=()=>locale()==='sv';
  const terminology=()=>{try{return window.__callyTerminologyMode?.()||'technical';}catch(_){return'technical';}};
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const MACHINE_LANGUAGES=[
    {code:'vcalendar_1_0',name:'vCalendar 1.0',family:'document',generation:'legacy',fidelity:'partial',caps:['import','export'],example:'VEVENT ↔ event · partial'},
    {code:'icalendar',name:'iCalendar / ICS',family:'document',generation:'standard',fidelity:'mapped',caps:['import','export','events','recurrence','attendees','time-zones'],example:'DTSTART / LOCATION / ATTENDEE ↔ Calendar Space state'},
    {code:'caldav',name:'CalDAV',family:'sync',generation:'standard',fidelity:'mapped',caps:['read','write','sync','collections','etag'],example:'resource + ETag ↔ external_id + external_revision'},
    {code:'itip',name:'iTIP',family:'scheduling',generation:'standard',fidelity:'mapped',caps:['request','reply','cancel','counter'],example:'METHOD:REQUEST / REPLY ↔ invitation state'},
    {code:'imip',name:'iMIP',family:'mail-transport',generation:'standard',fidelity:'mapped',caps:['invitations','replies','email'],example:'email transport ↔ iTIP scheduling state'},
    {code:'exchange_ews',name:'Exchange EWS',family:'vendor-api',generation:'legacy',fidelity:'mapped',caps:['read','write','sync','recurrence'],example:'CalendarItem / RequiredAttendees ↔ event + participant relations'},
    {code:'exchange_activesync',name:'Exchange ActiveSync',family:'device-sync',generation:'legacy',fidelity:'partial',caps:['device-sync','events','recurrence'],example:'ApplicationData ↔ represented event state'},
    {code:'google_calendar_api',name:'Google Calendar API',family:'vendor-api',generation:'modern',fidelity:'mapped',caps:['read','write','sync','freebusy'],example:'attendees[] / recurrence[] ↔ relations + recurrence state'},
    {code:'microsoft_graph_calendar',name:'Microsoft Graph · Calendar',family:'vendor-api',generation:'modern',fidelity:'mapped',caps:['read','write','sync','calendar-view'],example:'event / attendees / location ↔ canonical state'},
    {code:'generic_json_rest',name:'Generic JSON / REST',family:'custom-api',generation:'generic',fidelity:'declared',caps:['custom-mapping','read','write'],example:'declared field mapping ↔ any Calendar Space state'},
  ];

  const DIRECTIONS=[
    {code:'import_only',labels:{sv:'Endast in',en:'Import only'}},{code:'export_only',labels:{sv:'Endast ut',en:'Export only'}},
    {code:'read_only',labels:{sv:'Läs',en:'Read only'}},{code:'read_write',labels:{sv:'Läs + skriv',en:'Read + write'}},
    {code:'bidirectional_sync',labels:{sv:'Tvåvägssynk',en:'Bidirectional sync'}},
  ];
  const FIDELITY=[
    {code:'lossless',labels:{sv:'Förlustfri',en:'Lossless'}},{code:'mapped',labels:{sv:'Semantiskt mappad',en:'Semantically mapped'}},
    {code:'partial',labels:{sv:'Delvis',en:'Partial'}},{code:'declared',labels:{sv:'Definieras av adaptern',en:'Declared by adapter'}},
  ];
  const AUTHORITY=[
    {code:'calendar_space',labels:{sv:'Calendar Space styr',en:'Calendar Space authoritative'}},{code:'external',labels:{sv:'Extern källa styr',en:'External source authoritative'}},
    {code:'shared',labels:{sv:'Delad auktoritet',en:'Shared authority'}},{code:'human_resolution',labels:{sv:'Människa avgör konflikt',en:'Human resolves conflict'}},
  ];
  const SYNC=[
    {code:'disconnected',labels:{sv:'Inte ansluten',en:'Disconnected'}},{code:'ready',labels:{sv:'Redo',en:'Ready'}},
    {code:'syncing',labels:{sv:'Synkar',en:'Syncing'}},{code:'conflict',labels:{sv:'Motsägelse',en:'Conflict'}},
    {code:'degraded',labels:{sv:'Delvis kompatibel',en:'Degraded'}},{code:'error',labels:{sv:'Fel',en:'Error'}},
  ];

  function labels(svLabel,enLabel){return{sv:svLabel,en:enLabel};}
  function dim(key,label,kind,values=[],preferred=false,rich=true){return{key,label:label.sv,labels:label,value_kind:kind,preferred,rich_editor:rich,system:true,origin:'system',status:'active',hidden:false,values};}

  function ensureState(){
    try{
      const key=stateKey();const state=JSON.parse(localStorage.getItem(key)||'{}');if(!Array.isArray(state.dimension_states))state.dimension_states=[];
      const machineValues=MACHINE_LANGUAGES.map(item=>({code:item.code,labels:{sv:item.name,en:item.name},family:item.family,generation:item.generation,capabilities:item.caps,default_fidelity:item.fidelity}));
      const defs=[
        dim('machine_language',labels('Maskinspråk / kalender-API','Machine language / calendar API'),'machine-language-state',machineValues,true,true),
        dim('connector_direction',labels('Adapterriktning','Connector direction'),'adapter-direction-state',DIRECTIONS,false,false),
        dim('adapter_capability',labels('Adapterförmåga','Adapter capability'),'capability-state'),
        dim('semantic_mapping',labels('Semantisk mappning','Semantic mapping'),'semantic-mapping-state'),
        dim('identity_mapping',labels('Identitetsmappning','Identity mapping'),'identity-mapping-state'),
        dim('time_semantics',labels('Tidssemantik i adaptern','Adapter time semantics'),'semantic-mapping-state'),
        dim('recurrence_semantics',labels('Upprepningssemantik','Recurrence semantics'),'semantic-mapping-state'),
        dim('permission_semantics',labels('Behörighetssemantik','Permission semantics'),'semantic-mapping-state'),
        dim('translation_fidelity',labels('Översättningsprecision','Translation fidelity'),'translation-fidelity-state',FIDELITY,false,false),
        dim('connector_authority',labels('Källa / auktoritet','Source authority'),'authority-state',AUTHORITY,false,false),
        dim('external_system',labels('Externt system','External system'),'external-system-state'),
        dim('external_id',labels('Externt ID','External ID'),'external-identity-state',[],false,false),
        dim('external_revision',labels('Extern revision / ETag','External revision / ETag'),'external-revision-state',[],false,false),
        dim('sync_state',labels('Synktillstånd','Sync state'),'sync-state',SYNC,false,false),
        dim('source_provenance',labels('Källproveniens','Source provenance'),'provenance-state'),
      ];
      for(const def of defs){const i=state.dimension_states.findIndex(item=>item&&item.key===def.key);if(i>=0)state.dimension_states[i]={...def,...state.dimension_states[i],values:state.dimension_states[i].values?.length?state.dimension_states[i].values:def.values};else state.dimension_states.push(def);}
      state.state_model={...(state.state_model||{}),calendar_space_is_canonical_contract:true,human_languages_are_projections:true,machine_languages_are_adapters:true,external_apis_do_not_own_domain_semantics:true,adapter_translation_loss_is_explicit:true,connector_sync_is_state:true,connector_provenance_is_state:true,qcds_consumes_canonical_calendar_space:true};
      localStorage.setItem(key,JSON.stringify(state));
    }catch(_){}
  }

  function ensureStyles(){
    if(qs('#callyMachineLanguageStyles'))return;
    const style=document.createElement('style');style.id='callyMachineLanguageStyles';style.textContent=`
      .callyLanguageBridge{display:grid;gap:11px;margin:2px 0 14px;padding:12px;border:1px solid #cbd7d0;border-radius:15px;background:linear-gradient(180deg,#f8fbf9,#f2f7f4)}
      .callyLanguageBridgeFlow{display:grid;grid-template-columns:1fr auto 1fr auto 1.2fr auto 1fr auto 1fr;align-items:center;gap:6px}
      .callyLanguageNode{min-width:0;padding:9px;border:1px solid #d5ddd8;border-radius:11px;background:#fff}.callyLanguageNode strong{display:block;font-size:9px;color:#173126}.callyLanguageNode small{display:block;margin-top:3px;font-size:7px;line-height:1.35;color:#68766e}.callyLanguageNode.canonical{border:2px solid #0a7e60;background:#edf8f3;text-align:center}.callyLanguageArrow{font-weight:900;color:#668078;text-align:center}
      .callyLanguageQcdsBranch{display:grid;justify-items:center;gap:3px;padding-top:2px;color:#52675d;font-size:7.5px}.callyLanguageQcdsBranch b{padding:5px 8px;border-radius:999px;background:#173126;color:#fff;font-size:7.5px}.callyLanguageInvariant{padding:8px 9px;border-left:3px solid #0a7e60;background:#fff;font-size:7.5px;line-height:1.45;color:#4b6257}
      .callyMachineLanguageSection{display:grid;gap:8px;margin:12px 0}.callyMachineLanguageHead{display:flex;justify-content:space-between;gap:10px;align-items:end}.callyMachineLanguageHead div{display:grid;gap:2px}.callyMachineLanguageHead b{font-size:10px;color:#173126}.callyMachineLanguageHead small{font-size:7.5px;color:#6b766f}.callyMachineLanguageHead span{font-size:7px;padding:4px 7px;border-radius:999px;background:#edf3ef;color:#54675d}
      .callyMachineLanguageGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.callyMachineLanguageCard{display:grid;gap:6px;padding:9px;border:1px solid #d5ddd8;border-radius:11px;background:#fff}.callyMachineLanguageCard header{display:flex;align-items:start;justify-content:space-between;gap:6px}.callyMachineLanguageCard b{font-size:9px;color:#173126}.callyMachineLanguageCard code{font-size:6.5px;color:#758079}.callyMachineLanguageMeta{display:flex;flex-wrap:wrap;gap:4px}.callyMachineLanguageMeta span{font-size:6.5px;padding:3px 5px;border-radius:999px;background:#eef3f0;color:#53675c}.callyMachineLanguageMeta span.legacy{background:#f6efe3;color:#755b37}.callyMachineLanguageMap{font-size:7px;line-height:1.4;color:#5d6d65}.callyMachineCaps{display:flex;flex-wrap:wrap;gap:3px}.callyMachineCaps span{font-size:6px;color:#68776f}
      .callyAdapterContract{display:grid;gap:6px;padding:10px;border:1px dashed #aebdb5;border-radius:12px;background:#fbfcfb}.callyAdapterContract b{font-size:8.5px;color:#173126}.callyAdapterContract div{display:flex;flex-wrap:wrap;gap:4px}.callyAdapterContract code{font-size:6.5px;padding:4px 6px;border-radius:7px;background:#edf2ef;color:#4f6258}
      .callyHumanLanguageDivider{display:flex;align-items:center;gap:8px;margin:14px 0 8px;font-size:8px;font-weight:850;color:#40574c}.callyHumanLanguageDivider:after{content:'';height:1px;flex:1;background:#d6ded9}
      @media(max-width:760px){.callyLanguageBridgeFlow{grid-template-columns:1fr;}.callyLanguageArrow{transform:rotate(90deg)}.callyMachineLanguageGrid{grid-template-columns:1fr}.callyLanguageNode strong,.callyMachineLanguageCard b{font-size:14px}.callyLanguageNode small,.callyMachineLanguageMap,.callyMachineLanguageHead small,.callyLanguageInvariant{font-size:11px}.callyMachineLanguageMeta span,.callyAdapterContract code{font-size:10px}}
      @media(min-width:560px) and (max-width:980px){.callyLanguageBridge{padding:9px}.callyLanguageNode{padding:7px}.callyLanguageBridgeFlow{gap:4px}.callyMachineLanguageGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    `;document.head.appendChild(style);
  }

  function copy(){
    const mode=terminology();
    if(mode==='simple')return{title:sv()?'Språk roboten förstår':'Languages the robot understands',sub:sv()?'Människor och kalendersystem kan tala på olika sätt. Robotens eget innehåll är samma under ytan.':'People and calendar systems can speak in different ways. The robot keeps the same meaning underneath.',human:sv()?'Människor':'People',humanLang:sv()?'Människospråk':'Human language',translator:sv()?'Förstår betydelsen':'Understands meaning',machine:sv()?'Kalendersystem':'Calendar systems',adapter:sv()?'Översätter format':'Translates format',catalog:sv()?'Format & API:er roboten kan tala':'Formats & APIs the robot can speak'};
    if(mode==='standard')return{title:sv()?'Människo- & maskinspråk':'Human & machine languages',sub:sv()?'Språk och API:er är adaptrar till samma Calendar Space. Externa system ändrar inte den kanoniska domänmodellen.':'Languages and APIs are adapters to the same Calendar Space. External systems do not change the canonical domain model.',human:sv()?'Människa':'Human',humanLang:sv()?'Språkadapter':'Language adapter',translator:sv()?'Semantisk översättning':'Semantic translation',machine:sv()?'Externt system':'External system',adapter:sv()?'Protokolladapter':'Protocol adapter',catalog:sv()?'Maskinspråk / kalender-API':'Machine languages / calendar APIs'};
    return{title:'Human + machine language state',sub:sv()?'Extern representation → translator/adapter → canonical Calendar Space. QCDS arbetar endast på representerat canonical state när inferens begärs.':'External representation → translator/adapter → canonical Calendar Space. QCDS operates only on represented canonical state when inference is requested.',human:'Human',humanLang:'language-state',translator:'semantic translator',machine:'External system',adapter:'machine_language adapter',catalog:'Machine/API language catalogue'};
  }

  function card(item){
    const gen=item.generation==='legacy'?(sv()?'gammalt stöd':'legacy'):item.generation;
    return `<section class="callyMachineLanguageCard" data-machine-language="${esc(item.code)}"><header><div><b>${esc(item.name)}</b><code>${esc(item.code)}</code></div></header><div class="callyMachineLanguageMeta"><span class="${item.generation==='legacy'?'legacy':''}">${esc(gen)}</span><span>${esc(item.family)}</span><span>${esc(item.fidelity)}</span></div><div class="callyMachineLanguageMap">${esc(item.example)}</div><div class="callyMachineCaps">${item.caps.map(cap=>`<span>· ${esc(cap)}</span>`).join('')}</div></section>`;
  }

  function bridgeHtml(){const c=copy();return `<section class="callyLanguageBridge" data-machine-language-bridge><div><small>LOGICAL ROBOT · REPRESENTATION BOUNDARY</small><h3>${c.title}</h3><p>${c.sub}</p></div><div class="callyLanguageBridgeFlow"><div class="callyLanguageNode"><strong>${c.human}</strong><small>${sv()?'fråga, önskemål, kalendertext':'question, intent, calendar text'}</small></div><div class="callyLanguageArrow">⇄</div><div class="callyLanguageNode"><strong>${c.humanLang}</strong><small>sv · en · …</small></div><div class="callyLanguageArrow">⇄</div><div class="callyLanguageNode canonical"><strong>CALENDAR SPACE</strong><small>${sv()?'kanoniskt state · dimensioner · relationer':'canonical state · dimensions · relations'}</small></div><div class="callyLanguageArrow">⇄</div><div class="callyLanguageNode"><strong>${c.adapter}</strong><small>ICS · CalDAV · Graph · Google · EWS · …</small></div><div class="callyLanguageArrow">⇄</div><div class="callyLanguageNode"><strong>${c.machine}</strong><small>${sv()?'kalender · server · fil · klient':'calendar · server · file · client'}</small></div></div><div class="callyLanguageQcdsBranch"><span>↓ ${sv()?'endast när en logisk fråga ska lösas':'only when a logical question is resolved'} ↓</span><b>QCDS 4 phases → Syntract</b></div><div class="callyLanguageInvariant"><b>${sv()?'En betydelse. Många språk.':'One meaning. Many languages.'}</b> ${sv()?'API:t äger aldrig sanningen. Adaptern beskriver hur extern semantik mappas till Calendar Space, hur mycket som går förlorat och var varje state kom ifrån.':'The API never owns truth. The adapter declares how external semantics map to Calendar Space, what fidelity is lost and where every state came from.'}</div></section>`;}

  function machineHtml(){const c=copy();const contract=['machine_language','connector_direction','adapter_capability','semantic_mapping','identity_mapping','time_semantics','recurrence_semantics','permission_semantics','translation_fidelity','connector_authority','external_system','external_id','external_revision','sync_state','source_provenance'];return `<section class="callyMachineLanguageSection" data-machine-language-catalog><div class="callyMachineLanguageHead"><div><b>${c.catalog}</b><small>${sv()?'Adapterdefinitioner · inte aktiva anslutningar. Gammalt och nytt lever sida vid sida.':'Adapter definitions · not active connections. Legacy and modern formats coexist.'}</small></div><span>${MACHINE_LANGUAGES.length} ${sv()?'språk':'languages'}</span></div><div class="callyMachineLanguageGrid">${MACHINE_LANGUAGES.map(card).join('')}</div><div class="callyAdapterContract"><b>${sv()?'Varje faktisk anslutning blir state av samma sort':'Every real connection becomes state of the same kind'}</b><div>${contract.map(key=>`<code>${key}</code>`).join('')}</div></div></section>`;}

  function enhancePane(){
    ensureState();ensureStyles();
    const pane=qs('.callyStatePane[data-state-pane="languages"]');if(!pane)return;
    const tab=qs('[data-state-tab="languages"]');if(tab)tab.textContent=sv()?'Språk & API':'Languages & APIs';
    const intro=qs('.callyStatePaneIntro',pane);if(intro){const c=copy();const small=qs('small',intro),h=qs('h3',intro),p=qs('p',intro);if(small)small.textContent='HUMAN + MACHINE LANGUAGE';if(h)h.textContent=c.title;if(p)p.textContent=c.sub;}
    if(!qs('[data-machine-language-bridge]',pane))intro?.insertAdjacentHTML('afterend',bridgeHtml());
    if(!qs('[data-machine-language-catalog]',pane)){const bridge=qs('[data-machine-language-bridge]',pane);bridge?.insertAdjacentHTML('afterend',machineHtml());}
    const grid=qs('.callyMeaningGrid',pane);if(grid&&!qs('.callyHumanLanguageDivider',pane)){grid.insertAdjacentHTML('beforebegin',`<div class="callyHumanLanguageDivider">${sv()?'Människospråk · betydelser':'Human languages · meanings'}</div>`);}
  }

  function relabelDimensionCard(){
    qsa('.callyDimensionCard[data-dimension-key="machine_language"]').forEach(card=>{const jump=qs('[data-machine-language-jump]',card);if(!jump){const actions=qs('.callyDimensionActions',card);if(actions){const button=document.createElement('button');button.type='button';button.dataset.machineLanguageJump='1';button.textContent=sv()?'Språk & API':'Languages & APIs';actions.prepend(button);}}});
  }

  const originalOpen=window.__callyOpenDimensionCenter;
  if(typeof originalOpen==='function')window.__callyOpenDimensionCenter=function(tab='dimensions'){const out=originalOpen(tab);Promise.resolve(out).then(()=>{if(tab==='languages')requestAnimationFrame(enhancePane);else requestAnimationFrame(relabelDimensionCard);});return out;};

  document.addEventListener('click',event=>{
    if(event.target.closest?.('[data-state-tab="languages"],[data-tab-jump="languages"],[data-machine-language-jump]'))setTimeout(enhancePane,0);
    if(event.target.closest?.('[data-machine-language-jump]')){event.preventDefault();window.__callyOpenDimensionCenter?.('languages');}
  });
  window.addEventListener('cally-one-ui-refresh',()=>{ensureState();setTimeout(()=>{enhancePane();relabelDimensionCard();},0);});
  window.addEventListener('cally-terminology-change',()=>setTimeout(enhancePane,0));
  const boot=()=>{ensureState();ensureStyles();setTimeout(()=>{enhancePane();relabelDimensionCard();},0);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
