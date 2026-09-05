/* Cally.One terminology projection.
   The underlying Calendar Space/QCDS state never changes meaning when wording changes.
   This adapter projects the same state/actions as simple, standard or technical language. */
(() => {
  if (window.__callyTerminologyProjection) return;
  window.__callyTerminologyProjection = true;

  const qs=(s,r=document)=>r.querySelector(s), qsa=(s,r=document)=>[...r.querySelectorAll(s)];
  const PREF_KEY='cally.one.terminology-mode.v1';
  const MODES=[
    {code:'simple',labels:{sv:'Enkelt',en:'Simple'},descriptions:{sv:'Vanliga ord. Tekniken arbetar under ytan.',en:'Everyday words. The technical model stays underneath.'}},
    {code:'standard',labels:{sv:'Standard',en:'Standard'},descriptions:{sv:'Tydliga produktord med lite mer struktur.',en:'Clear product terminology with a little more structure.'}},
    {code:'technical',labels:{sv:'Tekniskt',en:'Technical'},descriptions:{sv:'State, dimensioner, orakel, QCDS och Syntract.',en:'State, dimensions, oracles, QCDS and Syntract.'}},
  ];
  const valid=code=>MODES.some(item=>item.code===code);
  const locale=()=>{try{return window.__callyLocale?.()||'sv';}catch(_){return'sv';}};
  const sv=()=>locale()==='sv';
  const stateKey=()=>{try{return window.__callySpaceStorageKey?.()||'cally.one.state.v1';}catch(_){return'cally.one.state.v1';}};

  function readState(){try{const state=JSON.parse(localStorage.getItem(stateKey())||'{}');if(!Array.isArray(state.dimension_states))state.dimension_states=[];if(!state.state_model||typeof state.state_model!=='object')state.state_model={};return state;}catch(_){return{dimension_states:[],state_model:{}};}}
  function writeState(state){try{localStorage.setItem(stateKey(),JSON.stringify(state));}catch(_){}}
  function defaultMode(){try{return window.__callyIsSuperadmin?.()?'technical':'simple';}catch(_){return'simple';}}
  function readMode(){
    try{const stored=String(localStorage.getItem(PREF_KEY)||'').toLowerCase();if(valid(stored))return stored;}catch(_){}
    const projected=String(readState().presentation_projection?.terminology_mode||'').toLowerCase();
    return valid(projected)?projected:defaultMode();
  }
  let mode=readMode();

  function dimensionSpec(current=null){
    return {
      key:'terminology_mode',label:'Språknivå',labels:{sv:'Språknivå',en:'Terminology mode'},
      value_kind:'terminology-projection-state',preferred:true,rich_editor:false,system:true,origin:'system',status:'active',hidden:false,
      values:Array.isArray(current?.values)&&current.values.length?current.values:MODES.map(item=>({code:item.code,labels:item.labels,descriptions:item.descriptions})),
    };
  }
  function ensureState(nextMode=mode){
    const state=readState();
    const index=state.dimension_states.findIndex(item=>item&&item.key==='terminology_mode');
    const current=index>=0?state.dimension_states[index]:null;
    const spec=dimensionSpec(current);
    if(index>=0)state.dimension_states[index]={...spec,...current,values:current.values||spec.values};else state.dimension_states.push(spec);
    state.presentation_projection={...(state.presentation_projection||{}),terminology_mode:nextMode};
    state.state_model={...(state.state_model||{}),terminology_mode_is_dimension:true,terminology_is_independent_projection:true,terminology_projection_preserves_domain_semantics:true,native_clients_are_adapters:true};
    writeState(state);
  }

  const COPY={
    sv:{
      simple:{
        mode:'Enkelt',menuTitle:'Språknivå',menuSub:'Enkelt · vanliga ord',kicker:'INSTÄLLNINGAR',
        dimensionsTitle:'Vad kalendern håller reda på',dimensionsSub:'Personer, saker, tider, regler och kopplingar',
        displayTitle:'Kalendervisning',displaySub:'Språk, tid, tidszon och klocka',languageTitle:'Menyspråk',languageSub:'Språket i knappar och menyer',
        adminTitle:'Administration',adminSub:'Konto, abonnemang och behörighet',infer:'Hitta bästa tiden',
        centerTitle:'Kalenderns byggstenar',centerDesc:'Personer, saker, tider, regler och kopplingar. Samma Calendar Space under ytan.',
        tabDimensions:'Egenskaper & regler',tabLanguages:'Språk',tabProjection:'Visning',tabModel:'Hur Cally löser',
        dimHeading:'Allt kalendern håller reda på',dimText:'Här ändrar du vad kalendern kan förstå och använda när den hjälper dig.',
        languageHeading:'Språk',languageText:'Här bestämmer du vad språkalternativen ska heta och betyda.',
        projectionHeading:'Visning',projectionText:'Menyspråk, kalenderspråk, tideräkning och tidszon kan vara olika utan att själva tiden ändras.',
        modelHeading:'Så hittar kalendern en lösning',modelText:'Kalendern väger ihop det som finns, vad som hör ihop och vad som måste stämma innan den föreslår en lösning.',
        flow:['Det som finns','Saker & kopplingar','Måste stämma','Löser','Bästa lösning'],editorTitle:'Ändra egenskap',newEditorTitle:'Ny egenskap'
      },
      standard:{
        mode:'Standard',menuTitle:'Begreppsnivå',menuSub:'Standard · produktord',kicker:'SYSTEM',
        dimensionsTitle:'Egenskaper & regler',dimensionsSub:'Personer, resurser, regler och relationer',
        displayTitle:'Kalendervisning',displaySub:'Visningsspråk, tideräkning, tidszon, 12/24 h',languageTitle:'Gränssnittsspråk',languageSub:'Huvudmenyer och administration',
        adminTitle:'Administration',adminSub:'Konto, abonnemang och behörigheter',infer:'Kolla tider',
        centerTitle:'Egenskaper & regler',centerDesc:'En gemensam domänmodell med flera visningar och en gemensam logikmotor.',
        tabDimensions:'Egenskaper',tabLanguages:'Språk',tabProjection:'Visning',tabModel:'Logik',
        dimHeading:'Egenskaper och regler',dimText:'Konfigurera egenskaper, semantik och tillåtna värden utan att bryta historiska relationer.',
        languageHeading:'Språkdefinitioner',languageText:'Konfigurera språkens namn och representation.',
        projectionHeading:'Oberoende visningsval',projectionText:'Gränssnitt, kalender, tideräkning och tidszon är separata visningsval.',
        modelHeading:'Gemensam logikmotor',modelText:'Information, relationer och villkor används för att hitta en koherent lösning.',
        flow:['Information','Egenskaper + relationer','Villkor','Logik','Lösning'],editorTitle:'Redigera egenskap',newEditorTitle:'Ny egenskap'
      },
      technical:{
        mode:'Tekniskt',menuTitle:'Terminology projection',menuSub:'Technical · QCDS vocabulary',kicker:'SYSTEM · TILLSTÅND',
        dimensionsTitle:'Dimensioner & state',dimensionsSub:'Semantik, språk, relationer och QCDS-modell',
        displayTitle:'Kalendervisning',displaySub:'Visningsspråk, tideräkning, tidszon, 12/24 h',languageTitle:'Gränssnittsspråk',languageSub:'Huvudmenyer och administration',
        adminTitle:'Administration',adminSub:'Superadmin · prenumeration och kontoroller',infer:'QCDS Resolve',
        centerTitle:'Tillstånd & dimensioner',centerDesc:'En domänmodell. Många projektioner. QCDS som enda inferensmotor.',
        tabDimensions:'Dimensioner',tabLanguages:'Språkbetydelser',tabProjection:'Visningsstate',tabModel:'QCDS',
        dimHeading:'Dimensioner är tillstånd',dimText:'Klicka en dimension för att ändra namn, semantik och värden. Ta bort pensionerar bara dimensionen; historiskt state finns kvar.',
        languageHeading:'Betydelser & språkstate',languageText:'Här konfigureras vad språkvärdena betyder. Koden är stabil identitet; namn/översättningar är representationsstate.',
        projectionHeading:'Oberoende visningsdimensioner',projectionText:'Exempel: svenska huvudmenyer + engelska kalenderetiketter + kinesisk tideräkning + Asia/Shanghai. Samma underliggande tidsstate.',
        modelHeading:'Kalendern är inte en samling specialfall',modelText:'Person, händelse, språk, kalendersystem, tidszon, åtkomst, bil, rum och krav representeras som tillstånd och dimensioner. QCDS är enda inferensmotorn när ett logiskt svar faktiskt begärs.',
        flow:['State Space','Dimensions + Relations','Constraints / Oracles','QCDS 4 phases','Syntract'],editorTitle:'Redigera dimension',newEditorTitle:'Ny dimension'
      }
    },
    en:{
      simple:{
        mode:'Simple',menuTitle:'Wording',menuSub:'Simple · everyday words',kicker:'SETTINGS',
        dimensionsTitle:'What the calendar keeps track of',dimensionsSub:'People, things, time, rules and connections',
        displayTitle:'Calendar display',displaySub:'Language, time, time zone and clock',languageTitle:'Menu language',languageSub:'Language used by buttons and menus',
        adminTitle:'Administration',adminSub:'Account, subscription and access',infer:'Find the best time',
        centerTitle:'Calendar building blocks',centerDesc:'People, things, time, rules and connections. The same Calendar Space underneath.',
        tabDimensions:'Properties & rules',tabLanguages:'Language',tabProjection:'Display',tabModel:'How Cally solves',
        dimHeading:'Everything the calendar keeps track of',dimText:'Change what the calendar can understand and use when it helps you.',
        languageHeading:'Language',languageText:'Define what the available languages are called and mean.',
        projectionHeading:'Display',projectionText:'Menu language, calendar language, calendar system and time zone can differ without changing the underlying time.',
        modelHeading:'How the calendar finds a solution',modelText:'The calendar combines what exists, what is connected and what must be true before proposing a solution.',
        flow:['What exists','Things & connections','Must be true','Solve','Best solution'],editorTitle:'Edit property',newEditorTitle:'New property'
      },
      standard:{
        mode:'Standard',menuTitle:'Terminology level',menuSub:'Standard · product terms',kicker:'SYSTEM',
        dimensionsTitle:'Properties & rules',dimensionsSub:'People, resources, rules and relations',
        displayTitle:'Calendar display',displaySub:'Display language, calendar system, time zone, 12/24 h',languageTitle:'Interface language',languageSub:'Main menus and administration',
        adminTitle:'Administration',adminSub:'Account, subscription and permissions',infer:'Check times',
        centerTitle:'Properties & rules',centerDesc:'One domain model with multiple views and one shared logic engine.',
        tabDimensions:'Properties',tabLanguages:'Language',tabProjection:'Display',tabModel:'Logic',
        dimHeading:'Properties and rules',dimText:'Configure properties, semantics and allowed values without breaking historical relations.',
        languageHeading:'Language definitions',languageText:'Configure language names and representation.',
        projectionHeading:'Independent display choices',projectionText:'Interface, calendar, calendar system and time zone are separate display choices.',
        modelHeading:'Shared logic engine',modelText:'Information, relations and conditions are used to find a coherent solution.',
        flow:['Information','Properties + relations','Conditions','Logic','Solution'],editorTitle:'Edit property',newEditorTitle:'New property'
      },
      technical:{
        mode:'Technical',menuTitle:'Terminology projection',menuSub:'Technical · QCDS vocabulary',kicker:'SYSTEM · STATE',
        dimensionsTitle:'Dimensions & state',dimensionsSub:'Semantics, language, relations and QCDS model',
        displayTitle:'Calendar display',displaySub:'Display language, calendar system, time zone, 12/24 h',languageTitle:'Interface language',languageSub:'Main menus and administration',
        adminTitle:'Administration',adminSub:'Superadmin · subscription and account roles',infer:'QCDS Resolve',
        centerTitle:'States & dimensions',centerDesc:'One domain model. Many projections. QCDS as the sole inference engine.',
        tabDimensions:'Dimensions',tabLanguages:'Language meanings',tabProjection:'Display state',tabModel:'QCDS',
        dimHeading:'Dimensions are states',dimText:'Open a dimension to change labels, semantics and values. Remove only retires the dimension; historical state remains.',
        languageHeading:'Meanings & language state',languageText:'Configure what language values mean here. The code is stable identity; names/translations are representation state.',
        projectionHeading:'Independent display dimensions',projectionText:'Example: Swedish main menus + English calendar labels + Chinese calendar system + Asia/Shanghai. Same underlying time state.',
        modelHeading:'The calendar is not a collection of special cases',modelText:'Person, event, language, calendar system, time zone, access, car, room and requirements are represented as states and dimensions. QCDS is the sole inference engine when a logical answer is actually requested.',
        flow:['State Space','Dimensions + Relations','Constraints / Oracles','QCDS 4 phases','Syntract'],editorTitle:'Edit dimension',newEditorTitle:'New dimension'
      }
    }
  };

  const DIMENSION_PUBLIC={
    sv:{person:'Personer',event:'Händelser',organization:'Organisationer',location:'Platser',resource:'Resurser',thing:'Saker & krav',day:'Dagar',language:'Språk',interface_language:'Menyspråk',calendar_display_language:'Kalenderspråk',calendar_system:'Tideräkning',time_zone:'Tidszon',time_reference:'Hur tiden räknas',time_epoch:'Tidens nollpunkt',reference_body:'Referensplats / observatör',reference_frame:'Referensram',clock_source:'Klockkälla',clock_format:'Klockformat',account_role:'Behörighet',visibility_policy:'Vem får se vad',calendar_layer_priority:'Kalenderprioritet',terminology_mode:'Språknivå'},
    en:{person:'People',event:'Events',organization:'Organizations',location:'Places',resource:'Resources',thing:'Things & requirements',day:'Days',language:'Language',interface_language:'Menu language',calendar_display_language:'Calendar language',calendar_system:'Calendar system',time_zone:'Time zone',time_reference:'How time is measured',time_epoch:'Time origin',reference_body:'Reference place / observer',reference_frame:'Reference frame',clock_source:'Clock source',clock_format:'Clock format',account_role:'Access',visibility_policy:'Who can see what',calendar_layer_priority:'Calendar priority',terminology_mode:'Wording'}
  };

  function copy(){return COPY[locale()]?.[mode]||COPY.sv.technical;}
  function setText(node,value){if(node&&value!=null&&node.textContent!==value)node.textContent=value;}

  function projectSystemMenu(){
    const system=qs('[data-cally-system-menu]');if(!system)return;
    const c=copy();setText(qs('.callySystemMenuKicker',system),c.kicker);
    const dimensions=qs('[data-system-action="dimensions"]',system),display=qs('[data-system-action="display"]',system),language=qs('[data-system-action="language"]',system),admin=qs('[data-system-action="admin"]',system);
    const label=(button,title,sub)=>{if(!button)return;setText(qs('span:nth-child(2) b',button),title);setText(qs('span:nth-child(2) small',button),sub);};
    label(dimensions,c.dimensionsTitle,c.dimensionsSub);label(display,c.displayTitle,c.displaySub);label(language,c.languageTitle,c.languageSub);label(admin,c.adminTitle,c.adminSub);
    let terminology=qs('[data-terminology-settings]',system);
    if(!terminology){terminology=document.createElement('button');terminology.type='button';terminology.dataset.terminologySettings='1';terminology.innerHTML='<span class="callySystemIcon callyTerminologyGlyph">Aa</span><span><b></b><small></small></span>';system.appendChild(terminology);}
    label(terminology,c.menuTitle,c.menuSub);
    let divider=qs('.callyTerminologyDivider',system);if(!divider){divider=document.createElement('div');divider.className='callyTerminologyDivider';}
    if(display)system.appendChild(display);if(language)system.appendChild(language);system.appendChild(terminology);system.appendChild(divider);if(dimensions)system.appendChild(dimensions);if(admin)system.appendChild(admin);
  }

  function projectCustomerActions(){qsa('[data-cally-customer-label]').forEach(button=>setText(button,copy().infer));}

  function projectDimensionCards(center){
    qsa('.callyDimensionCard[data-dimension-key]',center).forEach(card=>{
      const key=card.dataset.dimensionKey,title=qs(':scope>div:first-child>b',card);if(!title)return;
      if(!title.dataset.callyTechnicalLabel)title.dataset.callyTechnicalLabel=title.textContent;
      if(mode==='technical')setText(title,title.dataset.callyTechnicalLabel);else setText(title,DIMENSION_PUBLIC[locale()]?.[key]||title.dataset.callyTechnicalLabel);
      qsa('[data-edit-dimension]',card).forEach(button=>setText(button,sv()?(mode==='technical'?'Redigera':'Ändra'):(mode==='technical'?'Edit':'Change')));
    });
  }

  function projectStateCenter(){
    const center=qs('#callyQcdsStateCenter');if(!center)return;const c=copy();
    setText(qs('.callyQcdsStateHead h2',center),c.centerTitle);setText(qs('.callyQcdsStateHead p',center),c.centerDesc);
    setText(qs('[data-state-tab="dimensions"]',center),c.tabDimensions);setText(qs('[data-state-tab="languages"]',center),c.tabLanguages);setText(qs('[data-state-tab="projection"]',center),c.tabProjection);setText(qs('[data-state-tab="model"]',center),c.tabModel);
    const dims=qs('[data-state-pane="dimensions"]',center);if(dims){setText(qs('.callyStatePaneIntro h3',dims),c.dimHeading);setText(qs('.callyStatePaneIntro p',dims),c.dimText);projectDimensionCards(center);}
    const langs=qs('[data-state-pane="languages"]',center);if(langs){setText(qs('.callyStatePaneIntro h3',langs),c.languageHeading);setText(qs('.callyStatePaneIntro p',langs),c.languageText);}
    const projection=qs('[data-state-pane="projection"]',center);if(projection){setText(qs('.callyStatePaneIntro h3',projection),c.projectionHeading);setText(qs('.callyStatePaneIntro p',projection),c.projectionText);}
    const modelPane=qs('[data-state-pane="model"]',center);if(modelPane){setText(qs('.callyLogicalRobotHero h3',modelPane),c.modelHeading);setText(qs('.callyLogicalRobotHero p',modelPane),c.modelText);qsa('.callyQcdsFlow span',modelPane).forEach((span,index)=>setText(span,c.flow[index]));}
    const editor=qs('.callyDimensionEditor',center);if(editor){const header=qs('.callyQcdsStateHead h2',center);const isNew=!qs('[data-dim-key][readonly]',editor);setText(header,isNew?c.newEditorTitle:c.editorTitle);}
  }

  function applyNow(){
    document.documentElement.dataset.callyTerminology=mode;
    projectSystemMenu();projectCustomerActions();projectStateCenter();
  }

  function overlay(){let host=qs('#callyTerminologyOverlay');if(host)return host;host=document.createElement('div');host.id='callyTerminologyOverlay';host.className='callyTerminologyOverlay';host.innerHTML='<section class="callyTerminologySheet" role="dialog" aria-modal="true"></section>';document.body.appendChild(host);host.addEventListener('click',event=>{if(event.target===host)host.classList.remove('open');});return host;}
  function close(){qs('#callyTerminologyOverlay')?.classList.remove('open');}
  function open(){
    const host=overlay(),sheet=qs('.callyTerminologySheet',host),lang=locale();
    sheet.innerHTML=`<header class="callyTerminologyHead"><div><small>${sv()?'REPRESENTATION · SAMMA STATE':'REPRESENTATION · SAME STATE'}</small><h2>${sv()?'Språknivå':'Wording'}</h2><p>${sv()?'Välj hur tekniska begrepp ska visas. Kalenderns logik och underliggande state ändras inte.':'Choose how technical concepts are presented. Calendar logic and underlying state do not change.'}</p></div><button type="button" data-terminology-close>×</button></header><div class="callyTerminologyChoices">${MODES.map(item=>`<button type="button" data-terminology-mode="${item.code}" class="${item.code===mode?'active':''}"><span class="callyTerminologyChoiceIcon">${item.code==='simple'?'Aa':item.code==='standard'?'A·':'{ }'}</span><span><b>${item.labels[lang]}</b><small>${item.descriptions[lang]}</small></span><strong>${item.code===mode?'✓':''}</strong></button>`).join('')}</div><div class="callyTerminologyInvariant"><b>${sv()?'Samma Calendar Space':'Same Calendar Space'}</b><span>${sv()?'Bara orden och förklaringsnivån byts. State, relationer, orakel, QCDS och Syntracts finns kvar oförändrade under ytan.':'Only wording and explanation level change. State, relations, oracles, QCDS and Syntracts remain unchanged underneath.'}</span></div>`;
    host.classList.add('open');
  }

  function setMode(next){if(!valid(next)||next===mode){close();return;}mode=next;try{localStorage.setItem(PREF_KEY,mode);}catch(_){}ensureState(mode);close();applyNow();window.dispatchEvent(new CustomEvent('cally-terminology-change',{detail:{mode}}));window.dispatchEvent(new CustomEvent('cally-one-ui-refresh'));}

  window.__callyTerminologyMode=()=>mode;
  window.__callyTerminologyValues=()=>MODES.map(item=>({...item}));
  window.__callyOpenTerminologySettings=open;
  window.__callySetTerminologyMode=setMode;
  window.__callyApplyTerminology=applyNow;

  let scheduled=false;
  const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;applyNow();});};
  const reapplySoon=()=>{schedule();setTimeout(schedule,0);setTimeout(schedule,60);};

  document.addEventListener('click',event=>{
    if(event.target.closest?.('[data-terminology-settings]')){event.preventDefault();event.stopPropagation();open();return;}
    if(event.target.closest?.('[data-terminology-close]')){close();return;}
    const choice=event.target.closest?.('[data-terminology-mode]');if(choice){event.preventDefault();setMode(choice.dataset.terminologyMode);return;}
    if(event.target.closest?.('[data-system-action="dimensions"],[data-state-tab],[data-edit-dimension],[data-new-dimension],[data-tab-jump],[data-toggle-dimension]'))reapplySoon();
  });

  const boot=()=>{ensureState(mode);applyNow();};
  window.addEventListener('cally-one-ui-refresh',reapplySoon);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();