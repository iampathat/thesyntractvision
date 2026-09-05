(() => {
  'use strict';
  if (window.__callyChatGPT) return;

  const DESCRIPTOR = Object.freeze({
    robot: 'cally-chatgpt',
    contract: 'logical-robot-interface/v1',
    canonicalState: 'Calendar Space',
    projection: 'calendar',
    verbs: ['read', 'write', 'query', 'project', 'resolve'],
    inferenceBoundary: 'resolve -> QCDS -> Syntract',
    parallelInferenceEngine: false,
  });

  const json = async (response) => {
    const data = await response.json();
    if (!response.ok) throw new Error(data && data.error ? data.error : `HTTP ${response.status}`);
    return data;
  };

  async function read(selector = {}) {
    const state = await json(await fetch('/api/state'));
    const sections = Array.isArray(selector.sections) ? selector.sections : null;
    if (!sections) return {verb: 'read', interface: DESCRIPTOR, calendar_space: state};
    const selected = {};
    for (const key of sections) if (Object.prototype.hasOwnProperty.call(state, key)) selected[key] = state[key];
    return {verb: 'read', interface: DESCRIPTOR, calendar_space: selected};
  }

  const WRITE_ENDPOINTS = Object.freeze({
    upsert_person: '/api/person',
    archive_person: '/api/person/archive',
    upsert_event: '/api/event',
    move_event: '/api/move',
    delete_event: '/api/delete',
    upsert_entity: '/api/entity',
    upsert_relation: '/api/relation',
    upsert_dimension: '/api/dimension',
    retire_dimension: '/api/dimension/retire',
  });

  async function write(operation, payload = {}) {
    const endpoint = WRITE_ENDPOINTS[String(operation || '')];
    if (!endpoint) throw new Error('Unknown write operation');
    const result = await json(await fetch(endpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload || {}),
    }));
    return {verb: 'write', operation, interface: DESCRIPTOR, result};
  }

  function valueAt(item, path) {
    let value = item;
    for (const part of String(path).split('.')) {
      if (!value || typeof value !== 'object' || !(part in value)) return undefined;
      value = value[part];
    }
    return value;
  }

  async function query(spec = {}) {
    const section = String(spec.section || 'events');
    const allowed = new Set(['people','events','entities','relations','dimension_states','state_conflicts','planning_states']);
    if (!allowed.has(section)) throw new Error('Query section is not exposed');
    const where = spec.where && typeof spec.where === 'object' ? spec.where : {};
    const limit = Math.max(1, Math.min(1000, Number(spec.limit || 100)));
    const state = (await read({sections:[section]})).calendar_space;
    const items = Array.isArray(state[section]) ? state[section] : [];
    const matches = items.filter(item => Object.entries(where).every(([key, expected]) => valueAt(item, key) === expected)).slice(0, limit);
    return {verb: 'query', interface: DESCRIPTOR, query:{section, where, limit}, matches, count:matches.length};
  }

  async function project(projection = 'calendar', options = {}) {
    if (String(projection).toLowerCase() !== 'calendar') throw new Error('This robot currently exposes the calendar projection');
    const state = (await read()).calendar_space;
    return {
      verb: 'project',
      interface: DESCRIPTOR,
      projection: {name:'calendar', canonical_source:'Calendar Space', options, state, changes_canonical_state:false, runs_inference:false},
    };
  }

  async function resolve(problem = {}) {
    if (!problem.event_id) throw new Error('resolve requires event_id');
    const result = await json(await fetch('/api/infer', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({event_id:problem.event_id, candidates:problem.candidates || null}),
    }));
    return {verb:'resolve', interface:DESCRIPTOR, inference_engine:'QCDS', parallel_inference_engine:false, result};
  }

  window.__callyChatGPT = Object.freeze({descriptor:DESCRIPTOR, read, write, query, project, resolve});

  function counts(state) {
    return [
      `${(state.events || []).length} events`,
      `${(state.people || []).length} people`,
      `${(state.entities || []).length} states`,
      `${(state.relations || []).length} relations`,
    ].join(' · ');
  }

  function openSheet() {
    let sheet = document.getElementById('callyChatGPTSheet');
    if (!sheet) {
      sheet = document.createElement('div');
      sheet.id = 'callyChatGPTSheet';
      sheet.className = 'callyChatGPTSheet';
      sheet.innerHTML = `
        <div class="callyChatGPTBackdrop" data-close></div>
        <section class="callyChatGPTPanel" role="dialog" aria-modal="true" aria-label="Cally ChatGPT interface">
          <header>
            <div><b>Cally · ChatGPT</b><span>Logical Robot Interface</span></div>
            <button type="button" data-close aria-label="Close">×</button>
          </header>
          <div class="callyChatGPTFlow" aria-label="Architecture">
            <span>CHATGPT</span><i>→</i><span>5-PORT</span><i>→</i><strong>CALENDAR SPACE</strong>
          </div>
          <div class="callyChatGPTPorts">
            <article><b>READ</b><span>Read represented state</span></article>
            <article><b>WRITE</b><span>Represent a state change</span></article>
            <article><b>QUERY</b><span>Select state deterministically</span></article>
            <article><b>PROJECT</b><span>Show the same state as calendar</span></article>
            <article class="resolve"><b>RESOLVE</b><span>QCDS → Syntract</span></article>
          </div>
          <div class="callyChatGPTBoundary">
            <div><span>READ / WRITE / QUERY / PROJECT</span><b>No inference</b></div>
            <div><span>RESOLVE</span><b>Only QCDS inference boundary</b></div>
          </div>
          <div class="callyChatGPTFlow lower"><strong>CALENDAR SPACE</strong><i>→</i><span>CALENDAR PROJECTION</span></div>
          <div class="callyChatGPTStatus"><span class="dot"></span><span id="callyChatGPTStatusText">Interface ready</span></div>
          <button type="button" class="callyChatGPTTest" id="callyChatGPTReadTest">Test READ against this Calendar Space</button>
          <pre id="callyChatGPTReadOutput" hidden></pre>
        </section>`;
      document.body.appendChild(sheet);
      sheet.querySelectorAll('[data-close]').forEach(node => node.addEventListener('click', () => sheet.classList.remove('open')));
      sheet.querySelector('#callyChatGPTReadTest').addEventListener('click', async () => {
        const out = sheet.querySelector('#callyChatGPTReadOutput');
        const status = sheet.querySelector('#callyChatGPTStatusText');
        status.textContent = 'Reading Calendar Space…';
        try {
          const result = await read();
          out.hidden = false;
          out.textContent = counts(result.calendar_space);
          status.textContent = 'READ returned canonical state';
        } catch (error) {
          out.hidden = false;
          out.textContent = String(error && error.message ? error.message : error);
          status.textContent = 'READ failed';
        }
      });
    }
    sheet.classList.add('open');
  }

  function mountBadge() {
    if (document.getElementById('callyChatGPTBadge')) return;
    const badge = document.createElement('button');
    badge.id = 'callyChatGPTBadge';
    badge.className = 'callyChatGPTBadge';
    badge.type = 'button';
    badge.innerHTML = '<span class="spark">✦</span><span><b>ChatGPT</b><small>Calendar Space</small></span>';
    badge.title = 'Open the Cally ChatGPT logical robot interface';
    badge.addEventListener('click', openSheet);
    document.body.appendChild(badge);
  }

  const boot = () => {
    document.documentElement.dataset.callyChatgpt = '1';
    mountBadge();
    window.dispatchEvent(new CustomEvent('cally-chatgpt-interface-ready', {detail:DESCRIPTOR}));
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
