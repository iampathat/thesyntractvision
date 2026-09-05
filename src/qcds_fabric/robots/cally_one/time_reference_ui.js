/* Cally.One machine / mission / space time projection.
   Civil time zone is intentionally separate from timescale/reference state. */
(() => {
  if (window.__callyTimeReferenceUI) return;
  window.__callyTimeReferenceUI = true;

  const qs=(s,r=document)=>r.querySelector(s), qsa=(s,r=document)=>[...r.querySelectorAll(s)];
  const PREF_KEY='cally.one.time-reference.v1';
  const stateKey=()=>{try{return window.__callySpaceStorageKey?.()||'cally.one.state.v1';}catch(_){return'cally.one.state.v1';}};
  const locale=()=>{try{return window.__callyLocale?.()||'sv';}catch(_){return'sv';}};
  const sv=()=>locale()==='sv';
  const mode=()=>{try{return window.__callyTerminologyMode?.()||'technical';}catch(_){return'technical';}};

  const TIME_REFERENCES=[
    {code:'utc',group:'civil',labels:{sv:'UTC · koordinerad universell tid',en:'UTC · Coordinated Universal Time'},note:{sv:'Civil referenstid. Vanliga tidszoner projiceras ovanpå denna typ av tidsreferens.',en:'Civil reference time. Ordinary time zones are projected on top of this kind of reference.'}},
    {code:'tai',group:'atomic',labels:{sv:'TAI · internationell atomtid',en:'TAI · International Atomic Time'},note:{sv:'Kontinuerlig atomtid utan skottsekunder.',en:'Continuous atomic time without leap seconds.'}},
    {code:'gps',group:'navigation',labels:{sv:'GPS-tid',en:'GPS Time'},note:{sv:'Navigationssystemens tidsreferens.',en:'Navigation-system time reference.'}},
    {code:'tt',group:'astronomy',labels:{sv:'TT · terrestrisk tid',en:'TT · Terrestrial Time'},note:{sv:'Astronomisk/relativistisk tid nära jorden.',en:'Astronomical/relativistic time in the terrestrial context.'}},
    {code:'ut1',group:'astronomy',labels:{sv:'UT1 · jordrotationstid',en:'UT1 · Universal Time 1'},note:{sv:'Tid kopplad till jordens rotation.',en:'Time tied to Earth rotation.'}},
    {code:'tcg',group:'astronomy',labels:{sv:'TCG · geocentrisk koordinattid',en:'TCG · Geocentric Coordinate Time'},note:{sv:'Relativistisk koordinattid i det geocentriska referenssystemet.',en:'Relativistic coordinate time in the geocentric reference system.'}},
    {code:'tcb',group:'astronomy',labels:{sv:'TCB · barycentrisk koordinattid',en:'TCB · Barycentric Coordinate Time'},note:{sv:'Relativistisk koordinattid i solsystemets barycentriska referenssystem.',en:'Relativistic coordinate time in the solar-system barycentric reference system.'}},
    {code:'tdb',group:'astronomy',labels:{sv:'TDB · barycentrisk dynamisk tid',en:'TDB · Barycentric Dynamical Time'},note:{sv:'Barycentrisk tidsskala för astronomiska beräkningar.',en:'Barycentric timescale for astronomical calculations.'}},
    {code:'met',group:'mission',labels:{sv:'MET · Mission Elapsed Time',en:'MET · Mission Elapsed Time'},note:{sv:'Tid sedan en vald missions- eller händelsenollpunkt. Epoch måste definieras av missionen.',en:'Elapsed time from a mission/event-defined zero point. The epoch must be defined by the mission.'}},
    {code:'mrt',group:'mission',labels:{sv:'MRT · Mission Relative Time',en:'MRT · Mission Relative Time'},note:{sv:'Relativ missionstid mot vald nollpunkt. Epoch definieras av missionen.',en:'Mission-relative time against a selected zero point. The epoch is mission-defined.'}},
    {code:'sclk',group:'spacecraft',labels:{sv:'SCLK · farkostens ombordklocka',en:'SCLK · Spacecraft Clock'},note:{sv:'Satellitens/farkostens egen klocka. Tolkningen kräver missionsspecifik klockdefinition och normalt korrelation mot en referenstid.',en:'A spacecraft/satellite onboard clock. Interpretation requires mission-specific clock rules and normally correlation to a reference timescale.'}},
    {code:'unix',group:'computing',labels:{sv:'Unix/POSIX-tid',en:'Unix/POSIX time'},note:{sv:'Datorrepresentation från Unix-epoken. Det är inte en geografisk tidszon eller astronomisk koordinattid.',en:'Computer representation from the Unix epoch. It is not a geographic time zone or astronomical coordinate time.'}},
    {code:'tcl',group:'lunar',labels:{sv:'TCL · Lunar Coordinate Time',en:'TCL · Lunar Coordinate Time'},note:{sv:'IAU:s koordinattid för det lunära referenssystemet LCRS.',en:'IAU coordinate time for the Lunar Celestial Reference System (LCRS).'}},
    {code:'ltc',group:'lunar',labels:{sv:'LTC · koordinerad måntid',en:'LTC · Coordinated Lunar Time'},note:{sv:'Koordinerad måntid är en separat civil/operativ måntidsstandard under internationell utveckling; den är inte samma sak som TCL.',en:'Coordinated lunar time is a separate civil/operational lunar standard under international development; it is not the same thing as TCL.'}},
  ];
  const BODIES=[
    {code:'earth',labels:{sv:'Jorden',en:'Earth'}},{code:'moon',labels:{sv:'Månen',en:'Moon'}},{code:'mars',labels:{sv:'Mars',en:'Mars'}},
    {code:'solar_system_barycenter',labels:{sv:'Solsystemets barycentrum',en:'Solar-system barycenter'}},{code:'spacecraft',labels:{sv:'Farkost / satellit',en:'Spacecraft / satellite'}},{code:'computer',labels:{sv:'Datorsystem',en:'Computer system'}},
  ];
  const GROUPS={civil:{sv:'Civil referens',en:'Civil reference'},atomic:{sv:'Atomtid',en:'Atomic time'},navigation:{sv:'Navigation',en:'Navigation'},astronomy:{sv:'Astronomi / relativistisk tid',en:'Astronomy / relativistic time'},mission:{sv:'Missionstid',en:'Mission time'},spacecraft:{sv:'Farkost / satellit',en:'Spacecraft / satellite'},computing:{sv:'Datorer',en:'Computing'},lunar:{sv:'Månen',en:'Lunar'}};

  const AUTO={mode:'derived'}, OPTIONAL={mode:'optional'}, REQUIRED={mode:'required'};
  const REFERENCE_DETAILS={
    utc:{epoch:{...AUTO,value:{sv:'Standarddefinierad · ingen användarepok',en:'Standard-defined · no user epoch'}},frame:{...AUTO,value:{sv:'Inte definierad av UTC',en:'Not defined by UTC'}},clock:{...OPTIONAL,placeholder:{sv:'t.ex. UTC(k), NTP/PTP-källa',en:'e.g. UTC(k), NTP/PTP source'}}},
    tai:{epoch:{...AUTO,value:{sv:'Standarddefinierad TAI-tidsskala',en:'Standard-defined TAI timescale'}},frame:{...AUTO,value:{sv:'Inte definierad av TAI',en:'Not defined by TAI'}},clock:{...OPTIONAL,placeholder:{sv:'t.ex. atomklocka / TAI-realisation',en:'e.g. atomic clock / TAI realization'}}},
    gps:{epoch:{...AUTO,value:{sv:'GPS-epok · 1980-01-06 00:00:00',en:'GPS epoch · 1980-01-06 00:00:00'}},frame:{...AUTO,value:{sv:'Inte definierad av GPS-tid',en:'Not defined by GPS Time'}},clock:{...OPTIONAL,placeholder:{sv:'t.ex. GNSS-mottagare 7',en:'e.g. GNSS receiver 7'}}},
    tt:{epoch:{...AUTO,value:{sv:'Standarddefinierad astronomisk tidsskala',en:'Standard-defined astronomical timescale'}},frame:{...AUTO,value:{sv:'Terrestrisk/geocentrisk kontext · ingen egen rumslig ram',en:'Terrestrial/geocentric context · no intrinsic spatial frame'}},clock:{...AUTO,value:{sv:'Härledd tidsskala · TT = TAI + 32,184 s',en:'Derived timescale · TT = TAI + 32.184 s'}}},
    ut1:{epoch:{...AUTO,value:{sv:'Jordrotation · ingen fast missionsepok',en:'Earth rotation · no fixed mission epoch'}},frame:{...AUTO,value:{sv:'Jordrotation / IERS-kontext',en:'Earth rotation / IERS context'}},clock:{...AUTO,value:{sv:'Härleds från jordorienteringsdata',en:'Derived from Earth-orientation data'}}},
    tcg:{epoch:{...AUTO,value:{sv:'IAU-definierad koordinattid',en:'IAU-defined coordinate time'}},frame:{...AUTO,value:{sv:'GCRS · Geocentric Celestial Reference System',en:'GCRS · Geocentric Celestial Reference System'}},clock:{...AUTO,value:{sv:'Koordinattid · beräknad/härledd',en:'Coordinate time · computed/derived'}}},
    tcb:{epoch:{...AUTO,value:{sv:'IAU-definierad koordinattid',en:'IAU-defined coordinate time'}},frame:{...AUTO,value:{sv:'BCRS · Barycentric Celestial Reference System',en:'BCRS · Barycentric Celestial Reference System'}},clock:{...AUTO,value:{sv:'Koordinattid · beräknad/härledd',en:'Coordinate time · computed/derived'}}},
    tdb:{epoch:{...AUTO,value:{sv:'IAU-definierad tidsskala',en:'IAU-defined timescale'}},frame:{...AUTO,value:{sv:'BCRS · barycentrisk astronomisk kontext',en:'BCRS · barycentric astronomical context'}},clock:{...AUTO,value:{sv:'Härledd barycentrisk tidsskala',en:'Derived barycentric timescale'}}},
    met:{epoch:{...REQUIRED,placeholder:{sv:'t.ex. 2030-01-01T00:00:00Z',en:'e.g. 2030-01-01T00:00:00Z'}},frame:{...OPTIONAL,placeholder:{sv:'t.ex. missionens lokala ram',en:'e.g. mission local frame'}},clock:{...OPTIONAL,placeholder:{sv:'t.ex. mission-master-clock',en:'e.g. mission-master-clock'}}},
    mrt:{epoch:{...REQUIRED,placeholder:{sv:'t.ex. missionens starttid',en:'e.g. mission start instant'}},frame:{...OPTIONAL,placeholder:{sv:'t.ex. missionens lokala ram',en:'e.g. mission local frame'}},clock:{...OPTIONAL,placeholder:{sv:'t.ex. mission-master-clock',en:'e.g. mission-master-clock'}}},
    sclk:{epoch:{...OPTIONAL,placeholder:{sv:'korrelationsepok om missionen använder en',en:'correlation epoch if used by the mission'}},frame:{...AUTO,value:{sv:'Missions-/farkostdefinierad · inte definierad av SCLK självt',en:'Mission/spacecraft-defined · not defined by SCLK itself'}},clock:{...REQUIRED,placeholder:{sv:'t.ex. satellite-42-clock-A',en:'e.g. satellite-42-clock-A'}}},
    unix:{epoch:{...AUTO,value:{sv:'1970-01-01T00:00:00Z · Unix-epoken',en:'1970-01-01T00:00:00Z · Unix epoch'}},frame:{...AUTO,value:{sv:'Ej tillämplig · datorrepresentation',en:'Not applicable · computer representation'}},clock:{...OPTIONAL,placeholder:{sv:'t.ex. server-03 / OS-klocka',en:'e.g. server-03 / OS clock'}}},
    tcl:{epoch:{...AUTO,value:{sv:'1977-01-01 00:00:32.184 · IAU-definierad läsning',en:'1977-01-01 00:00:32.184 · IAU-defined reading'}},frame:{...AUTO,value:{sv:'LCRS · Lunar Celestial Reference System',en:'LCRS · Lunar Celestial Reference System'}},clock:{...AUTO,value:{sv:'Lunär koordinattid · beräknad/härledd',en:'Lunar coordinate time · computed/derived'}}},
    ltc:{epoch:{...AUTO,value:{sv:'Fastställs av den koordinerade måntidsstandarden',en:'Defined by the coordinated lunar-time standard'}},frame:{...AUTO,value:{sv:'Lunär civil/operativ referens · standard utvecklas',en:'Lunar civil/operational reference · standard evolving'}},clock:{...OPTIONAL,placeholder:{sv:'framtida LTC-realisation / lunär klockkälla',en:'future LTC realization / lunar clock source'}}},
  };

  function readPrefs(){
    try{const p=JSON.parse(localStorage.getItem(PREF_KEY)||'{}');return {timeReference:String(p.timeReference||'utc'),referenceBody:String(p.referenceBody||'earth'),timeEpoch:String(p.timeEpoch||''),referenceFrame:String(p.referenceFrame||''),clockSource:String(p.clockSource||'')};}
    catch(_){return{timeReference:'utc',referenceBody:'earth',timeEpoch:'',referenceFrame:'',clockSource:''};}
  }
  let prefs=readPrefs();

  function detail(refCode,key){return REFERENCE_DETAILS[refCode]?.[key]||OPTIONAL;}
  function localized(value){return typeof value==='object'?(value[locale()]||value.en||value.sv||''):String(value||'');}
  function resolvedField(refCode,key,userValue){const d=detail(refCode,key);return d.mode==='derived'?localized(d.value):String(userValue||'');}
  function fieldSource(refCode,key){const d=detail(refCode,key);return d.mode==='derived'?'standard':d.mode==='required'?'user-required':d.mode==='optional'?'user-optional':'user';}

  function dimension(key,label,kind,values=[]){return{key,label:label.sv,labels:label,value_kind:kind,preferred:key==='time_reference',rich_editor:true,system:true,origin:'system',status:'active',hidden:false,values};}
  function ensureState(){
    try{
      const state=JSON.parse(localStorage.getItem(stateKey())||'{}');if(!Array.isArray(state.dimension_states))state.dimension_states=[];
      const defs=[
        dimension('time_reference',{sv:'Tidsreferens / tidsskala',en:'Time reference / timescale'},'time-reference-state',TIME_REFERENCES.map(x=>({code:x.code,labels:x.labels,category:x.group}))),
        dimension('time_epoch',{sv:'Tidsepok / nollpunkt',en:'Time epoch'},'temporal-epoch-state'),
        dimension('reference_body',{sv:'Referenskropp / observatör',en:'Reference body / observer'},'observer-body-state',BODIES.map(x=>({code:x.code,labels:x.labels}))),
        dimension('reference_frame',{sv:'Referensram',en:'Reference frame'},'reference-frame-state'),
        dimension('clock_source',{sv:'Klockkälla',en:'Clock source'},'clock-source-state'),
      ];
      for(const def of defs){const i=state.dimension_states.findIndex(x=>x&&x.key===def.key);if(i>=0)state.dimension_states[i]={...def,...state.dimension_states[i],values:state.dimension_states[i].values?.length?state.dimension_states[i].values:def.values};else state.dimension_states.push(def);}
      state.temporal_reference_projection={
        time_reference:prefs.timeReference,
        reference_body:prefs.referenceBody,
        time_epoch:resolvedField(prefs.timeReference,'epoch',prefs.timeEpoch)||null,
        time_epoch_source:fieldSource(prefs.timeReference,'epoch'),
        reference_frame:resolvedField(prefs.timeReference,'frame',prefs.referenceFrame)||null,
        reference_frame_source:fieldSource(prefs.timeReference,'frame'),
        clock_source:resolvedField(prefs.timeReference,'clock',prefs.clockSource)||null,
        clock_source_source:fieldSource(prefs.timeReference,'clock'),
      };
      state.state_model={...(state.state_model||{}),time_reference_is_dimension:true,time_zone_is_civil_projection:true,time_reference_is_independent_from_time_zone:true,machine_and_space_time_are_state:true,temporal_reference_projection_does_not_change_event_instant:true,standard_time_facts_are_read_only_projection:true};
      localStorage.setItem(stateKey(),JSON.stringify(state));
    }catch(_){}
  }
  function save(next){prefs=next;try{localStorage.setItem(PREF_KEY,JSON.stringify(next));}catch(_){}ensureState();decorateBadge();}

  function options(){
    return Object.keys(GROUPS).map(group=>`<optgroup label="${GROUPS[group][locale()]}">${TIME_REFERENCES.filter(x=>x.group===group).map(x=>`<option value="${x.code}">${x.labels[locale()]}</option>`).join('')}</optgroup>`).join('');
  }
  function copy(){
    if(mode()==='simple')return{title:sv()?'Hur tiden räknas':'How time is measured',sub:sv()?'För datorer, satelliter, astronomi, månen och andra tidsreferenser. Vanlig tidszon väljs ovanför.':'For computers, satellites, astronomy, the Moon and other time references. Ordinary time zone is selected above.',reference:sv()?'Tidssystem':'Time system',body:sv()?'Varifrån tiden betraktas':'Reference place',epoch:sv()?'Nollpunkt / epoch':'Zero point / epoch',frame:sv()?'Referensram':'Reference frame',clock:sv()?'Klocka / källa':'Clock / source'};
    if(mode()==='standard')return{title:sv()?'Tidssystem & referens':'Time system & reference',sub:sv()?'Separat från geografisk tidszon. Standarddefinierade fakta visas låsta; bara missions-/systemspecifika värden kan ändras.':'Separate from geographic time zone. Standard-defined facts are shown read-only; only mission/system-specific values can be changed.',reference:sv()?'Tidsreferens':'Time reference',body:sv()?'Referenskropp / observatör':'Reference body / observer',epoch:sv()?'Epoch / nollpunkt':'Epoch / zero point',frame:sv()?'Referensram':'Reference frame',clock:sv()?'Klockkälla':'Clock source'};
    return{title:sv()?'Tidsreferens / tidsskala':'Time reference / timescale',sub:sv()?'Civil time_zone är en egen projektion. Standardstate för epoch, referensram och klockrealisation visas även när det inte är redigerbart.':'Civil time_zone is a separate projection. Standard state for epoch, reference frame and clock realization remains visible even when it is not editable.',reference:'time_reference',body:'reference_body',epoch:'time_epoch',frame:'reference_frame',clock:'clock_source'};
  }
  function badgeText(kind){return kind==='derived'?(sv()?'STANDARD':'STANDARD'):kind==='required'?(sv()?'ANGE':'SET'):(sv()?'VALFRI':'OPTIONAL');}

  function inject(){
    const form=qs('#callyCalendarSettings .callyCalendarSettingsForm');if(!form)return null;
    let block=qs('[data-cally-temporal-reference]',form);
    const c=copy();
    if(!block){block=document.createElement('section');block.className='callyTemporalReferenceBlock';block.dataset.callyTemporalReference='1';const hint=qs('.callyCalendarSettingsHint',form);if(hint)form.insertBefore(block,hint);else form.appendChild(block);}
    block.innerHTML=`<div class="callyTemporalReferenceHead"><b>${c.title}</b><small>${c.sub}</small></div><div class="callyTemporalReferenceGrid"><label class="wide">${c.reference}<select id="callyTimeReference">${options()}</select></label><label>${c.body}<select id="callyReferenceBody">${BODIES.map(x=>`<option value="${x.code}">${x.labels[locale()]}</option>`).join('')}</select></label><label data-time-field="epoch"><span>${c.epoch}<em data-time-field-badge></em></span><input id="callyTimeEpoch"></label><label data-time-field="frame"><span>${c.frame}<em data-time-field-badge></em></span><input id="callyReferenceFrame"></label><label data-time-field="clock"><span>${c.clock}<em data-time-field-badge></em></span><input id="callyClockSource"></label></div><div class="callyTemporalReferenceNote" data-time-reference-note></div>`;
    sync(block);return block;
  }

  function applyField(block,key,inputSelector,prefValue){
    const ref=qs('#callyTimeReference',block)?.value||prefs.timeReference||'utc';
    const d=detail(ref,key),input=qs(inputSelector,block),holder=qs(`[data-time-field="${key}"]`,block),badge=qs('[data-time-field-badge]',holder);
    if(!input)return;
    const derived=d.mode==='derived';
    input.readOnly=derived;
    input.setAttribute('aria-readonly',derived?'true':'false');
    input.classList.toggle('callyTemporalDerived',derived);
    input.classList.toggle('callyTemporalRequired',d.mode==='required');
    if(derived){input.value=localized(d.value);input.placeholder='';}
    else{input.value=String(prefValue||'');input.placeholder=localized(d.placeholder)||(d.mode==='required'?(sv()?'måste anges':'required'):(sv()?'valfritt':'optional'));}
    if(badge){badge.textContent=badgeText(d.mode);badge.dataset.kind=d.mode;}
  }

  function sync(block=qs('[data-cally-temporal-reference]')){
    if(!block)return;
    prefs=readPrefs();
    qs('#callyTimeReference',block).value=prefs.timeReference;
    qs('#callyReferenceBody',block).value=prefs.referenceBody;
    applyField(block,'epoch','#callyTimeEpoch',prefs.timeEpoch);
    applyField(block,'frame','#callyReferenceFrame',prefs.referenceFrame);
    applyField(block,'clock','#callyClockSource',prefs.clockSource);
    updateNote(block);
  }
  function refreshForSelectedReference(block=qs('[data-cally-temporal-reference]')){
    if(!block)return;
    const selected=qs('#callyTimeReference',block)?.value||'utc';
    applyField(block,'epoch','#callyTimeEpoch',selected===prefs.timeReference?prefs.timeEpoch:'');
    applyField(block,'frame','#callyReferenceFrame',selected===prefs.timeReference?prefs.referenceFrame:'');
    applyField(block,'clock','#callyClockSource',selected===prefs.timeReference?prefs.clockSource:'');
    updateNote(block);
  }
  function updateNote(block=qs('[data-cally-temporal-reference]')){if(!block)return;const ref=TIME_REFERENCES.find(x=>x.code===qs('#callyTimeReference',block)?.value)||TIME_REFERENCES[0];const note=qs('[data-time-reference-note]',block);if(note)note.textContent=ref.note[locale()];}
  function collect(){
    const block=qs('[data-cally-temporal-reference]');if(!block)return prefs;
    const ref=qs('#callyTimeReference',block)?.value||'utc';
    const read=(key,selector)=>{const d=detail(ref,key),input=qs(selector,block);return d.mode==='derived'?'':(input?.value.trim()||'');};
    return{timeReference:ref,referenceBody:qs('#callyReferenceBody',block)?.value||'earth',timeEpoch:read('epoch','#callyTimeEpoch'),referenceFrame:read('frame','#callyReferenceFrame'),clockSource:read('clock','#callyClockSource')};
  }
  function decorateBadge(){
    qs('.callyTimeReferenceBadge')?.remove();const context=qs('.callyCalendarContext');if(!context)return;
    const ref=TIME_REFERENCES.find(x=>x.code===prefs.timeReference)||TIME_REFERENCES[0];
    const badge=document.createElement('span');badge.className='callyTimeReferenceBadge';badge.textContent=ref.code.toUpperCase();badge.title=ref.labels[locale()];context.insertAdjacentElement('afterend',badge);
  }

  const originalOpen=window.__callyOpenCalendarDisplaySettings;
  if(typeof originalOpen==='function')window.__callyOpenCalendarDisplaySettings=function(...args){const out=originalOpen.apply(this,args);requestAnimationFrame(()=>{inject();sync();});return out;};

  document.addEventListener('change',event=>{
    if(event.target?.id==='callyTimeReference'&&event.target.closest?.('[data-cally-temporal-reference]')){refreshForSelectedReference(event.target.closest('[data-cally-temporal-reference]'));return;}
    if(event.target.closest?.('[data-cally-temporal-reference]'))updateNote();
  });
  document.addEventListener('click',event=>{if(event.target.closest?.('.callyCalendarSettingsSave'))save(collect());});
  window.addEventListener('cally-terminology-change',()=>{if(qs('#callyCalendarSettings.open'))inject();});
  window.addEventListener('cally-one-ui-refresh',()=>{ensureState();if(qs('#callyCalendarSettings.open'))inject();decorateBadge();});
  const boot=()=>{ensureState();inject();decorateBadge();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
