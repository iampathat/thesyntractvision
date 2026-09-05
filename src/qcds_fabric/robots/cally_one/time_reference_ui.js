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
    {code:'tt',group:'astronomy',labels:{sv:'TT · terrestrisk tid',en:'TT · Terrestrial Time'},note:{sv:'Astronomisk/relativistisk tid nära jordytan.',en:'Astronomical/relativistic time near Earth.'}},
    {code:'ut1',group:'astronomy',labels:{sv:'UT1 · jordrotationstid',en:'UT1 · Universal Time 1'},note:{sv:'Tid kopplad till jordens rotation.',en:'Time tied to Earth rotation.'}},
    {code:'tcg',group:'astronomy',labels:{sv:'TCG · geocentrisk koordinattid',en:'TCG · Geocentric Coordinate Time'},note:{sv:'Relativistisk koordinattid i geocentrisk referensram.',en:'Relativistic coordinate time in a geocentric frame.'}},
    {code:'tcb',group:'astronomy',labels:{sv:'TCB · barycentrisk koordinattid',en:'TCB · Barycentric Coordinate Time'},note:{sv:'Relativistisk koordinattid för solsystemets barycentrum.',en:'Relativistic coordinate time for the solar-system barycenter.'}},
    {code:'tdb',group:'astronomy',labels:{sv:'TDB · barycentrisk dynamisk tid',en:'TDB · Barycentric Dynamical Time'},note:{sv:'Barycentrisk tidsskala för astronomiska beräkningar.',en:'Barycentric timescale for astronomical calculations.'}},
    {code:'met',group:'mission',labels:{sv:'MET · Mission Elapsed Time',en:'MET · Mission Elapsed Time'},note:{sv:'Tid sedan en vald missionsnollpunkt. Kräver epoch.',en:'Elapsed time from a mission-defined zero point. Requires an epoch.'}},
    {code:'mrt',group:'mission',labels:{sv:'MRT · Mission Relative Time',en:'MRT · Mission Relative Time'},note:{sv:'Relativ missionstid mot vald nollpunkt.',en:'Mission-relative time against a selected zero point.'}},
    {code:'sclk',group:'spacecraft',labels:{sv:'SCLK · farkostens ombordklocka',en:'SCLK · Spacecraft Clock'},note:{sv:'Satellitens/farkostens egen klocka. Kräver normalt korrelation mot en referenstid.',en:'A spacecraft/satellite onboard clock. Normally requires correlation to a reference timescale.'}},
    {code:'unix',group:'computing',labels:{sv:'Unix/POSIX-tid',en:'Unix/POSIX time'},note:{sv:'Datorrepresentation från Unix-epoken. Det är inte en geografisk tidszon.',en:'Computer representation from the Unix epoch. It is not a geographic time zone.'}},
    {code:'ltc',group:'lunar',labels:{sv:'LTC · koordinerad måntid',en:'LTC · Coordinated Lunar Time'},note:{sv:'Måntidsreferens. Modellen tillåter standarden att utvecklas utan att Calendar Space behöver göras om.',en:'Lunar time reference. The model allows the standard to evolve without rebuilding Calendar Space.'}},
  ];
  const BODIES=[
    {code:'earth',labels:{sv:'Jorden',en:'Earth'}},{code:'moon',labels:{sv:'Månen',en:'Moon'}},{code:'mars',labels:{sv:'Mars',en:'Mars'}},
    {code:'solar_system_barycenter',labels:{sv:'Solsystemets barycentrum',en:'Solar-system barycenter'}},{code:'spacecraft',labels:{sv:'Farkost / satellit',en:'Spacecraft / satellite'}},{code:'computer',labels:{sv:'Datorsystem',en:'Computer system'}},
  ];
  const GROUPS={civil:{sv:'Civil referens',en:'Civil reference'},atomic:{sv:'Atomtid',en:'Atomic time'},navigation:{sv:'Navigation',en:'Navigation'},astronomy:{sv:'Astronomi / relativistisk tid',en:'Astronomy / relativistic time'},mission:{sv:'Missionstid',en:'Mission time'},spacecraft:{sv:'Farkost / satellit',en:'Spacecraft / satellite'},computing:{sv:'Datorer',en:'Computing'},lunar:{sv:'Månen',en:'Lunar'}};

  function readPrefs(){
    try{const p=JSON.parse(localStorage.getItem(PREF_KEY)||'{}');return {timeReference:String(p.timeReference||'utc'),referenceBody:String(p.referenceBody||'earth'),timeEpoch:String(p.timeEpoch||''),referenceFrame:String(p.referenceFrame||''),clockSource:String(p.clockSource||'')};}
    catch(_){return{timeReference:'utc',referenceBody:'earth',timeEpoch:'',referenceFrame:'',clockSource:''};}
  }
  let prefs=readPrefs();

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
      state.temporal_reference_projection={time_reference:prefs.timeReference,reference_body:prefs.referenceBody,time_epoch:prefs.timeEpoch||null,reference_frame:prefs.referenceFrame||null,clock_source:prefs.clockSource||null};
      state.state_model={...(state.state_model||{}),time_reference_is_dimension:true,time_zone_is_civil_projection:true,time_reference_is_independent_from_time_zone:true,machine_and_space_time_are_state:true,temporal_reference_projection_does_not_change_event_instant:true};
      localStorage.setItem(stateKey(),JSON.stringify(state));
    }catch(_){}
  }
  function save(next){prefs=next;try{localStorage.setItem(PREF_KEY,JSON.stringify(next));}catch(_){}ensureState();decorateBadge();}

  function options(){
    return Object.keys(GROUPS).map(group=>`<optgroup label="${GROUPS[group][locale()]}">${TIME_REFERENCES.filter(x=>x.group===group).map(x=>`<option value="${x.code}">${x.labels[locale()]}</option>`).join('')}</optgroup>`).join('');
  }
  function copy(){
    if(mode()==='simple')return{title:sv()?'Hur tiden räknas':'How time is measured',sub:sv()?'För datorer, satelliter, rymdfarkoster och andra tidsreferenser. Vanlig tidszon väljs ovanför.':'For computers, satellites, spacecraft and other time references. Ordinary time zone is selected above.',reference:sv()?'Tidssystem':'Time system',body:sv()?'Varifrån tiden betraktas':'Reference place',epoch:sv()?'Nollpunkt (vid behov)':'Zero point (when needed)',frame:sv()?'Referensram (valfritt)':'Reference frame (optional)',clock:sv()?'Klocka / källa (valfritt)':'Clock / source (optional)'};
    if(mode()==='standard')return{title:sv()?'Tidssystem & referens':'Time system & reference',sub:sv()?'Separat från geografisk tidszon. För maskiner, navigation, astronomi och rymd.':'Separate from geographic time zone. For machines, navigation, astronomy and space.',reference:sv()?'Tidsreferens':'Time reference',body:sv()?'Referenskropp / observatör':'Reference body / observer',epoch:sv()?'Epoch / nollpunkt':'Epoch / zero point',frame:sv()?'Referensram':'Reference frame',clock:sv()?'Klockkälla':'Clock source'};
    return{title:sv()?'Tidsreferens / tidsskala':'Time reference / timescale',sub:sv()?'Civil time_zone är en egen projektion. Här väljs UTC/TAI/GPS/TT/UT1/TCG/TCB/TDB/MET/MRT/SCLK/Unix/LTC och tillhörande referensstate.':'Civil time_zone is a separate projection. Select UTC/TAI/GPS/TT/UT1/TCG/TCB/TDB/MET/MRT/SCLK/Unix/LTC and related reference state here.',reference:'time_reference',body:'reference_body',epoch:'time_epoch',frame:'reference_frame',clock:'clock_source'};
  }

  function inject(){
    const form=qs('#callyCalendarSettings .callyCalendarSettingsForm');if(!form)return null;
    let block=qs('[data-cally-temporal-reference]',form);
    const c=copy();
    if(!block){block=document.createElement('section');block.className='callyTemporalReferenceBlock';block.dataset.callyTemporalReference='1';const hint=qs('.callyCalendarSettingsHint',form);if(hint)form.insertBefore(block,hint);else form.appendChild(block);}
    block.innerHTML=`<div class="callyTemporalReferenceHead"><b>${c.title}</b><small>${c.sub}</small></div><div class="callyTemporalReferenceGrid"><label class="wide">${c.reference}<select id="callyTimeReference">${options()}</select></label><label>${c.body}<select id="callyReferenceBody">${BODIES.map(x=>`<option value="${x.code}">${x.labels[locale()]}</option>`).join('')}</select></label><label>${c.epoch}<input id="callyTimeEpoch" placeholder="${sv()?'t.ex. 2030-01-01T00:00:00Z':'e.g. 2030-01-01T00:00:00Z'}"></label><label>${c.frame}<input id="callyReferenceFrame" placeholder="${sv()?'t.ex. ICRF / lokal ram':'e.g. ICRF / local frame'}"></label><label>${c.clock}<input id="callyClockSource" placeholder="${sv()?'t.ex. satellite-42-clock-A':'e.g. satellite-42-clock-A'}"></label></div><div class="callyTemporalReferenceNote" data-time-reference-note></div>`;
    sync(block);return block;
  }
  function sync(block=qs('[data-cally-temporal-reference]')){if(!block)return;prefs=readPrefs();qs('#callyTimeReference',block).value=prefs.timeReference;qs('#callyReferenceBody',block).value=prefs.referenceBody;qs('#callyTimeEpoch',block).value=prefs.timeEpoch;qs('#callyReferenceFrame',block).value=prefs.referenceFrame;qs('#callyClockSource',block).value=prefs.clockSource;updateNote(block);}
  function updateNote(block=qs('[data-cally-temporal-reference]')){if(!block)return;const ref=TIME_REFERENCES.find(x=>x.code===qs('#callyTimeReference',block)?.value)||TIME_REFERENCES[0];const note=qs('[data-time-reference-note]',block);if(note)note.textContent=ref.note[locale()];}
  function collect(){const block=qs('[data-cally-temporal-reference]');if(!block)return prefs;return{timeReference:qs('#callyTimeReference',block)?.value||'utc',referenceBody:qs('#callyReferenceBody',block)?.value||'earth',timeEpoch:qs('#callyTimeEpoch',block)?.value.trim()||'',referenceFrame:qs('#callyReferenceFrame',block)?.value.trim()||'',clockSource:qs('#callyClockSource',block)?.value.trim()||''};}
  function decorateBadge(){
    qs('.callyTimeReferenceBadge')?.remove();const context=qs('.callyCalendarContext');if(!context)return;
    const ref=TIME_REFERENCES.find(x=>x.code===prefs.timeReference)||TIME_REFERENCES[0];
    const badge=document.createElement('span');badge.className='callyTimeReferenceBadge';badge.textContent=ref.code.toUpperCase();badge.title=ref.labels[locale()];context.insertAdjacentElement('afterend',badge);
  }

  const originalOpen=window.__callyOpenCalendarDisplaySettings;
  if(typeof originalOpen==='function')window.__callyOpenCalendarDisplaySettings=function(...args){const out=originalOpen.apply(this,args);requestAnimationFrame(()=>{inject();sync();});return out;};

  document.addEventListener('change',event=>{if(event.target.closest?.('[data-cally-temporal-reference]'))updateNote();});
  document.addEventListener('click',event=>{if(event.target.closest?.('.callyCalendarSettingsSave'))save(collect());});
  window.addEventListener('cally-terminology-change',()=>{if(qs('#callyCalendarSettings.open'))inject();});
  window.addEventListener('cally-one-ui-refresh',()=>{ensureState();if(qs('#callyCalendarSettings.open'))inject();decorateBadge();});
  const boot=()=>{ensureState();inject();decorateBadge();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
