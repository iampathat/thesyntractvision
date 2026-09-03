/* Cally.One Demo Space — isolated sample state, never a separate calendar engine. */
(() => {
  if (window.__callyDemoSpace) return;
  window.__callyDemoSpace = true;

  const ACTIVE_SPACE_KEY = 'cally.one.active-space.v1';
  const DEMO_SPACE_ID = 'demo-family-company';
  const DEMO_STATE_KEY = 'cally.one.state.demo.family-company.v1';
  const DEMO_SAVED_VIEWS_KEY = 'cally.one.saved.perspectives.demo.family-company.v1';

  const FAMILY = [
    ['johan','Johan Lindberg','Pappa'],
    ['anna','Anna Lindberg','Mamma'],
    ['elsa','Elsa Lindberg','Barn'],
    ['leo','Leo Lindberg','Barn'],
  ];
  const COMPANY_COLLEAGUES = [
    ['sara','Sara Berg','Commercial Lead'],
    ['amir','Amir Rahimi','Engineer'],
    ['karin','Karin Nyström','Designer'],
    ['daniel','Daniel Holm','Engineer'],
    ['fatima','Fatima Ali','Operations'],
    ['oskar','Oskar Lund','Engineer'],
    ['linnea','Linnea Ek','Finance'],
    ['magnus','Magnus Sjöberg','Sales'],
    ['emma','Emma Dahl','People'],
    ['viktor','Viktor Chen','Engineer'],
  ];

  const pad = n => String(n).padStart(2, '0');
  const localStamp = (base, offsetDays, hour, minute=0) => {
    const d = new Date(base);
    d.setDate(d.getDate() + offsetDays);
    d.setHours(hour, minute, 0, 0);
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const entity = (id, kind, label, dimensions={}) => ({entity_id:id, kind, label, dimensions});
  const relation = (subject_id, predicate, object_id, dimensions={}) => ({
    relation_id:`${subject_id}|${predicate}|${object_id}`,
    subject_id, predicate, object_id, dimensions,
  });

  function buildDemoState(now=new Date()) {
    const orgs = [
      entity('org:nordverk','organization','Nordverk AB',{type:'company',domain:'företag',location:'Stockholm'}),
      entity('org:family','organization','Familjen Lindberg',{type:'family',domain:'hemma',location:'Bromma'}),
      entity('org:bromma-fk','organization','Bromma FK',{type:'sports_club',activity:'fotboll'}),
      entity('org:bromma-gym','organization','Bromma Gymnastik',{type:'sports_club',activity:'gymnastik'}),
      entity('org:school','organization','Äppelviksskolan',{type:'school'}),
    ];
    const resources = [
      entity('res:eken','resource','Mötesrum Eken',{type:'room',mobility:'stationary',capacity:8,capacity_dimension:'booking',organization:'Nordverk AB'}),
      entity('res:fjorden','resource','Mötesrum Fjorden',{type:'room',mobility:'stationary',capacity:12,capacity_dimension:'booking',organization:'Nordverk AB'}),
      entity('res:volvo','resource','Volvo XC60',{type:'car',mobility:'mobile',capacity:5,organization:'Familjen Lindberg'}),
      entity('res:football-field','resource','Fotbollsplan 2',{type:'field',mobility:'stationary',organization:'Bromma FK'}),
      entity('res:gym-hall','resource','Gymnastiksal Bromma',{type:'hall',mobility:'stationary',organization:'Bromma Gymnastik'}),
    ];
    const things = [
      entity('thing:football-bag','thing','Fotbollsväska',{type:'equipment',owner:'Elsa Lindberg'}),
      entity('thing:gym-bag','thing','Gymnastikpåse',{type:'equipment',owner:'Leo Lindberg'}),
      entity('thing:packed-lunch','thing','Matsäck',{type:'food',owner:'Familjen Lindberg'}),
      entity('thing:laptop','thing','Johan · jobbdator',{type:'work_equipment',owner:'Johan Lindberg'}),
    ];

    const people = [
      {person_id:'person:johan',entity_id:'person:johan',name:'Johan Lindberg',organization_id:'org:nordverk',role:'Product Lead',team:'Product',dimensions:{family_role:'pappa',domain:['Familjen Lindberg','Nordverk AB'],language:'sv'}},
      {person_id:'person:anna',entity_id:'person:anna',name:'Anna Lindberg',organization_id:'org:family',role:'Förälder',team:'Familjen Lindberg',dimensions:{family_role:'mamma',domain:'Familjen Lindberg',language:'sv'}},
      {person_id:'person:elsa',entity_id:'person:elsa',name:'Elsa Lindberg',organization_id:'org:family',role:'Barn',team:'Familjen Lindberg',dimensions:{activity:'fotboll',school:'Äppelviksskolan',language:'sv'}},
      {person_id:'person:leo',entity_id:'person:leo',name:'Leo Lindberg',organization_id:'org:family',role:'Barn',team:'Familjen Lindberg',dimensions:{activity:'gymnastik',school:'Äppelviksskolan',language:'sv'}},
      ...COMPANY_COLLEAGUES.map(([id,name,role], index) => ({person_id:`person:${id}`,entity_id:`person:${id}`,name,organization_id:'org:nordverk',role,team:index % 3 === 0 ? 'Commercial' : index % 3 === 1 ? 'Product' : 'Operations',dimensions:{domain:'Nordverk AB',language:index === 1 || index === 4 ? 'en' : 'sv'}})),
    ];
    const peopleEntities = people.map(p => entity(p.entity_id,'person',p.name,{...(p.dimensions||{}),role:p.role,team:p.team,archived:false}));

    const event = (id,title,day,startH,startM,endH,endM,peopleIds,location,dimensions={},links=[]) => ({
      event_id:`event:${id}`, title,
      start:localStamp(now,day,startH,startM), end:localStamp(now,day,endH,endM),
      people:peopleIds.map(x => `person:${x}`), location, locked:false,
      constraints:{}, dimensions:{timezone:'Europe/Stockholm',language:'sv',...dimensions}, links,
    });
    const events = [
      event('standup','Daily stand-up · Nordverk',0,8,30,9,0,['johan','sara','amir','karin','daniel'],'Mötesrum Eken',{domain:'Nordverk AB',activity:'arbete',priority:'normal',organization:'Nordverk AB'},[{predicate:'uses',object_id:'res:eken'}]),
      event('aurora','Kundmöte Aurora',0,10,0,11,0,['johan','sara','amir'],'Mötesrum Eken',{domain:'Nordverk AB',activity:'kundmöte',priority:'high',organization:'Nordverk AB'},[{predicate:'uses',object_id:'res:eken'},{predicate:'requires',object_id:'thing:laptop'}]),
      event('product-plan','Produktplanering',0,14,0,15,30,['johan','karin','daniel','fatima','oskar'],'Mötesrum Fjorden',{domain:'Nordverk AB',activity:'planering',organization:'Nordverk AB'},[{predicate:'uses',object_id:'res:fjorden'}]),
      event('pickup-leo','Hämta Leo',0,16,20,16,50,['johan','leo'],'Äppelviksskolan',{domain:'Familjen Lindberg',activity:'hämtning',priority:'high',organization:'Familjen Lindberg'},[{predicate:'uses',object_id:'res:volvo'}]),
      event('elsa-football','Elsa · fotbollsträning',0,18,0,19,30,['elsa','johan'],'Fotbollsplan 2',{domain:'Familjen Lindberg',activity:'fotboll',organization:'Bromma FK'},[{predicate:'uses',object_id:'res:football-field'},{predicate:'requires',object_id:'thing:football-bag'}]),
      event('leo-gym','Leo · gymnastik',0,18,15,19,15,['leo','anna'],'Gymnastiksal Bromma',{domain:'Familjen Lindberg',activity:'gymnastik',organization:'Bromma Gymnastik'},[{predicate:'uses',object_id:'res:gym-hall'},{predicate:'requires',object_id:'thing:gym-bag'}]),
      event('sprint-review','Sprint review · Nordverk',1,9,0,10,0,['johan','sara','amir','karin','daniel','fatima','oskar','linnea','magnus','emma','viktor'],'Mötesrum Fjorden',{domain:'Nordverk AB',activity:'arbete',organization:'Nordverk AB'},[{predicate:'uses',object_id:'res:fjorden'}]),
      event('finance','Budget & forecast',1,13,0,14,0,['johan','linnea','magnus'],'Mötesrum Eken',{domain:'Nordverk AB',activity:'ekonomi',priority:'high',organization:'Nordverk AB'},[{predicate:'uses',object_id:'res:eken'}]),
      event('school-talk','Utvecklingssamtal · Elsa',1,15,30,16,15,['anna','johan','elsa'],'Äppelviksskolan',{domain:'Familjen Lindberg',activity:'skola',organization:'Äppelviksskolan'}),
      event('family-dinner','Middag hemma',1,18,0,19,0,['johan','anna','elsa','leo'],'Hemma · Bromma',{domain:'Familjen Lindberg',activity:'familj',organization:'Familjen Lindberg'}),
      event('retro','Team retro · Nordverk',2,10,30,11,30,['johan','amir','karin','daniel','oskar','viktor'],'Mötesrum Eken',{domain:'Nordverk AB',activity:'arbete',organization:'Nordverk AB'},[{predicate:'uses',object_id:'res:eken'}]),
      event('leo-dentist','Leo · tandläkare',2,15,0,15,45,['anna','leo'],'Alvik',{domain:'Familjen Lindberg',activity:'hälsa',priority:'high'}),
      event('elsa-match','Elsa · fotbollsmatch',2,17,30,19,30,['elsa','johan','anna'],'Bromma IP',{domain:'Familjen Lindberg',activity:'fotboll',organization:'Bromma FK'},[{predicate:'uses',object_id:'res:volvo'},{predicate:'requires',object_id:'thing:football-bag'}]),
      event('gym-show','Leo · gymnastikuppvisning',3,17,0,18,30,['leo','anna','johan'],'Gymnastiksal Bromma',{domain:'Familjen Lindberg',activity:'gymnastik',organization:'Bromma Gymnastik'},[{predicate:'uses',object_id:'res:gym-hall'},{predicate:'requires',object_id:'thing:gym-bag'}]),
      event('family-trip','Familjeutflykt · Drottningholm',4,11,0,15,0,['johan','anna','elsa','leo'],'Drottningholm',{domain:'Familjen Lindberg',activity:'familj',organization:'Familjen Lindberg'},[{predicate:'uses',object_id:'res:volvo'},{predicate:'requires',object_id:'thing:packed-lunch'}]),
      event('sales-sync','Sales sync · Nordverk',-1,9,30,10,15,['johan','sara','magnus'],'Mötesrum Eken',{domain:'Nordverk AB',activity:'arbete',organization:'Nordverk AB'},[{predicate:'uses',object_id:'res:eken'}]),
      event('school-football','Elsa · skolidrott',-1,13,0,14,0,['elsa'],'Äppelviksskolan',{domain:'Familjen Lindberg',activity:'skola',organization:'Äppelviksskolan'}),
    ];

    const relations = [];
    people.forEach(p => {
      if (p.organization_id) relations.push(relation(p.entity_id,'member_of',p.organization_id,{role:p.role||'',team:p.team||''}));
    });
    relations.push(
      relation('person:johan','member_of','org:family',{role:'pappa'}),
      relation('person:elsa','member_of','org:bromma-fk',{role:'spelare'}),
      relation('person:leo','member_of','org:bromma-gym',{role:'gymnast'}),
      relation('res:eken','belongs_to','org:nordverk'), relation('res:fjorden','belongs_to','org:nordverk'),
      relation('res:volvo','belongs_to','org:family'), relation('thing:packed-lunch','belongs_to','org:family')
    );
    events.forEach(e => {
      e.people.forEach(personId => relations.push(relation(e.event_id,'participant',personId,{state:'active'})));
      (e.links||[]).forEach(link => relations.push(relation(e.event_id,link.predicate,link.object_id,{time_start:e.start,time_end:e.end,temporal_scope:'event',state:'active'})));
    });

    return {
      product:'Cally.One', logical_robot:true, everything_is_state:true,
      space_id:DEMO_SPACE_ID, space_domain:'demo.cally.one/family-company', demo:true, demo_profile:'family-company',
      people, events, entities:[...peopleEntities,...orgs,...resources,...things], relations,
      conflicts:[], state_conflicts:[], planning_states:[], dimension_states:[], dimensions:{},
      state_model:{people_is_projection:true,linked_state_time_intersection:true,planning_can_be_resolved_by_human_or_qcds:true},
      provenance:{source:'Cally.One demo seed',demo_space:true,generated_at:new Date().toISOString(),qcds_core_replaced:false},
    };
  }

  const isDemo = () => localStorage.getItem(ACTIVE_SPACE_KEY) === DEMO_SPACE_ID;
  const seedDemo = (force=false) => {
    if (force || !localStorage.getItem(DEMO_STATE_KEY)) localStorage.setItem(DEMO_STATE_KEY, JSON.stringify(buildDemoState()));
  };
  const enterDemo = () => {
    seedDemo(false);
    localStorage.setItem(ACTIVE_SPACE_KEY, DEMO_SPACE_ID);
    location.reload();
  };
  const leaveDemo = () => {
    localStorage.removeItem(ACTIVE_SPACE_KEY);
    location.reload();
  };
  const resetDemo = () => {
    seedDemo(true);
    localStorage.removeItem(DEMO_SAVED_VIEWS_KEY);
    location.reload();
  };

  function ensureDemoBadge() {
    document.documentElement.dataset.callySpace = isDemo() ? 'demo' : 'personal';
    const brand = document.querySelector('.brandText');
    if (!brand) return;
    let badge = brand.querySelector('.demoSpaceBadge');
    if (!isDemo()) { badge?.remove(); return; }
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'demoSpaceBadge';
      brand.appendChild(badge);
    }
    badge.textContent = 'DEMO SPACE · FAMILJ + NORDVERK AB';
  }

  function ensureDemoMenu() {
    if (typeof window.__callySpaceStorageKey !== 'function') return;
    const menu = document.querySelector('#callyMobileMenu');
    if (!menu) return;
    let block = menu.querySelector('.demoSpaceMenu');
    if (!block) {
      block = document.createElement('section');
      block.className = 'demoSpaceMenu';
      menu.appendChild(block);
    }
    block.innerHTML = isDemo() ? `
      <div class="demoSpaceMenuKicker">AKTIV DOMÄN</div>
      <div class="demoSpaceMenuTitle">Demo Space</div>
      <div class="demoSpaceMenuMeta">Familjen Lindberg + Nordverk AB · 4 familjemedlemmar · 11 anställda</div>
      <div class="demoSpaceMenuActions">
        <button type="button" data-demo-space-action="personal">Min kalender</button>
        <button type="button" data-demo-space-action="reset">Återställ demo</button>
      </div>` : `
      <div class="demoSpaceMenuKicker">PROVA CALLY.ONE</div>
      <div class="demoSpaceMenuTitle">Demokalender</div>
      <div class="demoSpaceMenuMeta">Familj, fotboll, gymnastik och Nordverk AB med 11 anställda — helt separerat från din kalender.</div>
      <button type="button" class="demoSpaceLaunch" data-demo-space-action="demo">Öppna Demo Space</button>`;
  }

  function refreshDemoUI() {
    ensureDemoBadge();
    ensureDemoMenu();
  }

  document.addEventListener('click', event => {
    const action = event.target.closest?.('[data-demo-space-action]')?.dataset.demoSpaceAction;
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    if (action === 'demo') enterDemo();
    else if (action === 'personal') leaveDemo();
    else if (action === 'reset') resetDemo();
  });

  window.__callyBuildDemoState = buildDemoState;
  window.__callyDemoSpaceId = DEMO_SPACE_ID;
  window.addEventListener('cally-one-ui-refresh', refreshDemoUI);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refreshDemoUI, {once:true});
  else refreshDemoUI();
})();
