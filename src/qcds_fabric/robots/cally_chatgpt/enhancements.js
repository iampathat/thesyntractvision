/* Cally.One product UI enhancements — Cally.One Tribute License 1.0 */
(() => {
  const MOVE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M12 2v20M2 12h20M12 2l-3 3m3-3 3 3m-3 17-3-3m3 3 3-3M2 12l3-3m-3 3 3 3m17-3-3-3m3 3-3 3"/></svg>';
  const EDIT_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="m4 20 4.2-1 10.6-10.6-3.2-3.2L5 15.8 4 20Zm10.4-13.6 3.2 3.2M14.8 4.8l1.4-1.4a1.6 1.6 0 0 1 2.3 0l2.1 2.1a1.6 1.6 0 0 1 0 2.3l-1.4 1.4"/></svg>';
  let resizeState = null;
  let stateCache = {events:[], people:[], entities:[], relations:[]};
  let refreshPromise = null;
  let currentEditingEventId = null;
  let directoryKind = 'all';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const qs = (s, root=document) => root.querySelector(s);
  const qsa = (s, root=document) => [...root.querySelectorAll(s)];

  function setHeaderHeight() {
    const top = qs('.top');
    if (!top) return;
    document.documentElement.style.setProperty('--cally-header-h', `${Math.ceil(top.getBoundingClientRect().height)}px`);
  }

  async function refreshState(force=false) {
    if (refreshPromise && !force) return refreshPromise;
    refreshPromise = fetch('/api/state')
      .then(r => r.json())
      .then(data => {
        if (data && Array.isArray(data.events)) stateCache = data;
        if (!Array.isArray(stateCache.entities)) stateCache.entities = [];
        if (!Array.isArray(stateCache.relations)) stateCache.relations = [];
        return stateCache;
      })
      .catch(() => stateCache)
      .finally(() => { refreshPromise = null; });
    return refreshPromise;
  }

  async function postJson(path, payload) {
    const r = await fetch(path, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
    const body = await r.json();
    if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
    if (body.state && Array.isArray(body.state.events)) stateCache = body.state;
    return body;
  }

  function eventForId(id) {
    return (stateCache.events || []).find(item => item.event_id === id) || null;
  }

  function entityForId(id) {
    return (stateCache.entities || []).find(item => item.entity_id === id) || null;
  }

  function entitiesOf(kind) {
    return (stateCache.entities || []).filter(item => item.kind === kind).sort((a,b) => a.label.localeCompare(b.label));
  }

  function activeRelation(subject, predicate, object) {
    return (stateCache.relations || []).find(r => r.subject_id === subject && r.predicate === predicate && r.object_id === object) || null;
  }

  function isLocked(el) {
    return !!(el?.classList?.contains('locked') || el?.querySelector?.('[data-pin-event].locked'));
  }

  function makeMove(locked) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `eventMove${locked ? ' locked' : ''}`;
    b.title = locked ? 'Pinned — unpin before moving' : 'Drag to move';
    b.setAttribute('aria-label', locked ? 'Event pinned' : 'Move event');
    b.innerHTML = MOVE_ICON;
    return b;
  }

  function makeEdit(id) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'eventEdit';
    b.dataset.editEvent = id;
    b.title = 'Edit event';
    b.setAttribute('aria-label', 'Edit event');
    b.innerHTML = EDIT_ICON;
    return b;
  }

  function makeResize(id, locked) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `resizeHandle${locked ? ' locked' : ''}`;
    b.dataset.resizeEvent = id;
    b.title = locked ? 'Pinned — unpin before resizing' : 'Drag to change duration';
    b.setAttribute('aria-label', locked ? 'Event pinned' : 'Resize event duration');
    return b;
  }

  function decorateEvent(el) {
    if (!el || el.dataset.callyEnhanced === '1') return;
    const id = el.dataset.eventId;
    if (!id) return;
    const locked = isLocked(el);
    el.dataset.callyEnhanced = '1';
    const canMove = el.classList.contains('event') || el.classList.contains('monthEvent') || el.classList.contains('laneCard');
    if (canMove) el.appendChild(makeMove(locked));
    el.appendChild(makeEdit(id));
    if (el.classList.contains('event')) el.appendChild(makeResize(id, locked));
  }

  function decorateEventRows(root=document) {
    qsa('.eventRow', root).forEach(row => {
      if (row.dataset.callyEnhanced === '1') return;
      const open = row.querySelector('button[onclick*="openEvent"]');
      const pin = row.querySelector('[data-pin-event]');
      const id = pin?.dataset.pinEvent || (open?.getAttribute('onclick') || '').match(/openEvent\('([^']+)'\)/)?.[1];
      if (!id) return;
      row.dataset.callyEnhanced = '1';
      const controls = document.createElement('div');
      controls.className = 'eventControls';
      controls.appendChild(makeEdit(id));
      if (pin) controls.appendChild(pin);
      if (open) open.replaceWith(controls);
      else row.appendChild(controls);
    });
  }

  function focusTimeline(stage) {
    const timeline = stage.querySelector('.timeline');
    if (!timeline) {
      delete stage.dataset.callyTimelineFocus;
      return;
    }
    const title = qs('#dateTitle')?.textContent || '';
    const days = timeline.style.getPropertyValue('--days') || '';
    const signature = `${title}|${days}`;
    if (stage.dataset.callyTimelineFocus === signature) return;
    stage.dataset.callyTimelineFocus = signature;
    requestAnimationFrame(() => {
      const now = stage.querySelector('.nowline');
      const eventTops = qsa('.event[data-event-id]', stage).map(el => Number.parseFloat(el.style.top || '')).filter(Number.isFinite);
      const target = now ? Number.parseFloat(now.style.top || '0') : (eventTops.length ? Math.min(...eventTops) : 180);
      stage.scrollTop = Math.max(0, target - Math.min(150, stage.clientHeight * 0.25));
    });
  }

  function decorate(root=document) {
    qsa('[data-event-id]', root).forEach(decorateEvent);
    decorateEventRows(root);
    setHeaderHeight();
    const stage = root.id === 'stage' ? root : qs('#stage');
    if (stage) focusTimeline(stage);
  }

  function localIso(d) {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function startResize(ev, handle) {
    const el = handle.closest('[data-event-id]');
    const id = el?.dataset?.eventId;
    const item = eventForId(id);
    if (!el || !item || item.locked || handle.classList.contains('locked')) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    const start = new Date(item.start);
    const end = new Date(item.end);
    resizeState = {handle, el, item, startY:ev.clientY, originalEnd:end, start};
    el.classList.add('resizing');
    handle.setPointerCapture?.(ev.pointerId);
    handle.addEventListener('pointermove', resizeMove);
    handle.addEventListener('pointerup', resizeEnd, {once:true});
    handle.addEventListener('pointercancel', resizeCancel, {once:true});
  }

  function resizedEnd(ev) {
    const d = resizeState;
    if (!d) return null;
    const deltaMinutes = Math.round(((ev.clientY - d.startY) / 59.5 * 60) / 15) * 15;
    const minEnd = new Date(d.start.getTime() + 15 * 60000);
    const candidate = new Date(d.originalEnd.getTime() + deltaMinutes * 60000);
    return candidate < minEnd ? minEnd : candidate;
  }

  function resizeMove(ev) {
    const d = resizeState;
    if (!d) return;
    ev.preventDefault();
    const end = resizedEnd(ev);
    const durationHours = (end - d.start) / 3600000;
    d.el.style.height = `${Math.max(34, durationHours * 59.5 - 3)}px`;
  }

  async function resizeEnd(ev) {
    const d = resizeState;
    if (!d) return;
    const end = resizedEnd(ev);
    cleanupResize();
    try {
      await postJson('/api/event', {...d.item, end:localIso(end)});
      await refreshState(true);
      await window.load?.();
      window.toast?.('Event duration changed');
    } catch (error) {
      window.toast?.(error.message || String(error));
      await window.load?.();
    }
  }

  function resizeCancel() {
    cleanupResize();
    window.render?.();
  }

  function cleanupResize() {
    const d = resizeState;
    if (!d) return;
    d.el.classList.remove('resizing');
    d.handle.removeEventListener('pointermove', resizeMove);
    resizeState = null;
  }

  function ensureOverlay() {
    let overlay = qs('#callyStateOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'callyStateOverlay';
    overlay.className = 'stateOverlay';
    overlay.innerHTML = '<div class="stateSheet" role="dialog" aria-modal="true"><div id="stateSheetBody"></div></div>';
    overlay.addEventListener('click', e => { if (e.target === overlay) closeStateOverlay(); });
    document.body.appendChild(overlay);
    return overlay;
  }

  function closeStateOverlay() {
    const overlay = qs('#callyStateOverlay');
    if (overlay) overlay.classList.remove('open');
  }

  function openOverlay(html) {
    const overlay = ensureOverlay();
    qs('#stateSheetBody', overlay).innerHTML = html;
    overlay.classList.add('open');
    qs('[data-close-state]', overlay)?.addEventListener('click', closeStateOverlay);
    return overlay;
  }

  function relationSummary(entity) {
    const labels = [];
    (stateCache.relations || []).filter(r => r.subject_id === entity.entity_id && !r.predicate.startsWith('not_')).forEach(r => {
      const other = entityForId(r.object_id);
      if (other) labels.push(`${r.predicate.replaceAll('_',' ')} · ${other.label}`);
    });
    return labels.slice(0,3);
  }

  function renderDirectoryList() {
    const list = qs('#spaceDirectoryList');
    if (!list) return;
    const q = (qs('#spaceDirectorySearch')?.value || '').trim().toLowerCase();
    const items = (stateCache.entities || []).filter(entity => {
      if (directoryKind !== 'all' && entity.kind !== directoryKind) return false;
      const hay = `${entity.label} ${entity.kind} ${JSON.stringify(entity.dimensions || {})}`.toLowerCase();
      return !q || hay.includes(q);
    });
    list.innerHTML = items.length ? items.map(entity => {
      const rel = relationSummary(entity);
      const dims = Object.entries(entity.dimensions || {}).slice(0,3).map(([k,v]) => `<span>${esc(k)}: ${esc(typeof v === 'object' ? JSON.stringify(v) : v)}</span>`).join('');
      return `<div class="stateCard"><div class="stateKind">${esc(entity.kind)}</div><b>${esc(entity.label)}</b><div class="stateMeta">${dims || 'State entity'}</div>${rel.length ? `<div class="stateRelations">${rel.map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}</div>`;
    }).join('') : '<div class="stateEmpty">No matching states.</div>';
  }

  async function openSpaceDirectory() {
    await refreshState(true);
    const overlay = openOverlay(`<div class="sheetHead"><div><div class="eyebrow">CALENDAR SPACE</div><h2>States</h2><p>People, organizations, resources, things and their relations live in the same logical space.</p></div><button class="sheetClose" data-close-state>×</button></div><div class="directoryTools"><input id="spaceDirectorySearch" class="stateInput" placeholder="Search all states…"><div class="kindTabs"><button data-kind="all" class="active">All</button><button data-kind="person">People</button><button data-kind="organization">Organizations</button><button data-kind="resource">Resources</button><button data-kind="thing">Things</button></div><div class="stateActions"><button data-add-state="person">+ Person</button><button data-add-state="organization">+ Organization</button><button data-add-state="resource">+ Resource</button><button data-add-state="thing">+ Thing</button></div></div><div id="spaceDirectoryList" class="stateDirectory"></div>`);
    directoryKind = 'all';
    renderDirectoryList();
    qs('#spaceDirectorySearch', overlay).addEventListener('input', renderDirectoryList);
    qsa('[data-kind]', overlay).forEach(button => button.addEventListener('click', () => {
      directoryKind = button.dataset.kind;
      qsa('[data-kind]', overlay).forEach(x => x.classList.toggle('active', x === button));
      renderDirectoryList();
    }));
    qsa('[data-add-state]', overlay).forEach(button => button.addEventListener('click', () => {
      const kind = button.dataset.addState;
      if (kind === 'person') openPersonDialog();
      else openEntityDialog(kind);
    }));
  }

  function dimensionRowsHtml() {
    return '<div id="personExtraDims" class="personExtraDims"></div><button type="button" class="smallStateBtn" id="addPersonDimension">+ Dimension</button>';
  }

  function addPersonDimensionRow(key='', value='') {
    const box = qs('#personExtraDims');
    if (!box) return;
    const row = document.createElement('div');
    row.className = 'stateDimRow';
    row.innerHTML = `<input class="stateDimKey" placeholder="Dimension" value="${esc(key)}"><input class="stateDimValue" placeholder="State" value="${esc(value)}"><button type="button" class="stateDimRemove">×</button>`;
    qs('.stateDimRemove', row).onclick = () => row.remove();
    box.appendChild(row);
  }

  async function openPersonDialog() {
    await refreshState(true);
    const orgs = entitiesOf('organization');
    const overlay = openOverlay(`<div class="sheetHead"><div><div class="eyebrow">PERSON STATE</div><h2>Add person</h2><p>Person is a state entity. Organization membership, role and team are state relations/dimensions.</p></div><button class="sheetClose" data-close-state>×</button></div><div class="stateForm"><label>Name<input id="personStateName" class="stateInput" autofocus></label><label>Organization<input id="personOrganization" class="stateInput" list="organizationStates" placeholder="Existing or new organization"><datalist id="organizationStates">${orgs.map(o => `<option value="${esc(o.label)}"></option>`).join('')}</datalist></label><div class="stateFormTwo"><label>Role<input id="personRole" class="stateInput" placeholder="Optional"></label><label>Team / group<input id="personTeam" class="stateInput" placeholder="Optional"></label></div><div><div class="stateLabel">Additional person dimensions</div>${dimensionRowsHtml()}</div><button class="statePrimary" id="savePersonState">Save person state</button></div>`);
    qs('#addPersonDimension', overlay).onclick = () => addPersonDimensionRow();
    qs('#savePersonState', overlay).onclick = async () => {
      try {
        const name = qs('#personStateName').value.trim();
        if (!name) return;
        const orgLabel = qs('#personOrganization').value.trim();
        let org = orgs.find(o => o.label.toLowerCase() === orgLabel.toLowerCase());
        if (orgLabel && !org) {
          const created = await postJson('/api/entity', {kind:'organization', label:orgLabel, dimensions:{}});
          org = created.entity;
        }
        const dimensions = {};
        qsa('.stateDimRow', overlay).forEach(row => {
          const key = qs('.stateDimKey', row).value.trim();
          const value = qs('.stateDimValue', row).value.trim();
          if (key && value) dimensions[key] = value;
        });
        await postJson('/api/person', {
          name,
          dimensions,
          organization_id:org?.entity_id || '',
          role:qs('#personRole').value.trim(),
          team:qs('#personTeam').value.trim(),
        });
        closeStateOverlay();
        await refreshState(true);
        await window.load?.();
        window.toast?.('Person added as state');
      } catch (error) { window.toast?.(error.message || String(error)); }
    };
  }

  async function openEntityDialog(kind) {
    await refreshState(true);
    const orgs = entitiesOf('organization');
    const titles = {organization:'Organization', resource:'Resource', thing:'Thing'};
    const extra = kind === 'resource' ? `<div class="stateFormTwo"><label>Resource type<input id="entitySubtype" class="stateInput" placeholder="Room, car, equipment…"></label><label>Location<input id="entityLocation" class="stateInput" placeholder="Optional"></label></div><label class="checkLine"><input id="entityExclusive" type="checkbox" checked> Exclusive / reservable resource</label><label>Organization<input id="entityOrg" class="stateInput" list="entityOrganizations" placeholder="Optional"><datalist id="entityOrganizations">${orgs.map(o => `<option value="${esc(o.label)}"></option>`).join('')}</datalist></label>` : kind === 'organization' ? '<label>Organization type<input id="entitySubtype" class="stateInput" placeholder="Company, school, club…"></label>' : '<label>Thing / requirement type<input id="entitySubtype" class="stateInput" placeholder="Clothing, food, equipment…"></label>';
    const overlay = openOverlay(`<div class="sheetHead"><div><div class="eyebrow">${esc(kind.toUpperCase())} STATE</div><h2>Add ${esc(titles[kind] || 'state')}</h2><p>This is not a separate object system; it is another state entity in Calendar Space.</p></div><button class="sheetClose" data-close-state>×</button></div><div class="stateForm"><label>Name<input id="entityLabel" class="stateInput" autofocus></label>${extra}<button class="statePrimary" id="saveEntityState">Save state</button></div>`);
    qs('#saveEntityState', overlay).onclick = async () => {
      try {
        const label = qs('#entityLabel').value.trim();
        if (!label) return;
        const dimensions = {};
        const subtype = qs('#entitySubtype')?.value.trim();
        if (subtype) dimensions.type = subtype;
        if (kind === 'resource') {
          const location = qs('#entityLocation')?.value.trim();
          if (location) dimensions.location = location;
          dimensions.exclusive = !!qs('#entityExclusive')?.checked;
        }
        const created = await postJson('/api/entity', {kind, label, dimensions});
        if (kind === 'resource') {
          const orgLabel = qs('#entityOrg')?.value.trim();
          const org = orgs.find(o => o.label.toLowerCase() === String(orgLabel).toLowerCase());
          if (org) await postJson('/api/relation', {relation_id:`${created.entity.entity_id}|owned_by|${org.entity_id}`, subject_id:created.entity.entity_id, predicate:'owned_by', object_id:org.entity_id, dimensions:{}});
        }
        closeStateOverlay();
        await refreshState(true);
        await window.load?.();
        window.toast?.(`${titles[kind] || 'State'} added to Calendar Space`);
      } catch (error) { window.toast?.(error.message || String(error)); }
    };
  }

  function addPeopleSearch() {
    const people = qs('#fPeople');
    if (!people || qs('#eventPeopleSearch')) return;
    const input = document.createElement('input');
    input.id = 'eventPeopleSearch';
    input.className = 'stateInput peopleSearch';
    input.placeholder = 'Search people…';
    people.parentElement.insertBefore(input, people);
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      qsa('label', people).forEach(label => { label.style.display = !q || label.textContent.toLowerCase().includes(q) ? '' : 'none'; });
    });
  }

  function enhanceEventModal(eventId=currentEditingEventId) {
    const modal = qs('#modalBack');
    const form = qs('.formGrid', modal || document);
    if (!modal || !form || modal.style.display === 'none') return;
    currentEditingEventId = eventId;
    addPeopleSearch();
    const infer = qs('#inferBtn');
    if (infer) {
      infer.textContent = 'QCDS Resolve';
      infer.title = 'Resolve coherent placement across represented Calendar Space states';
    }
    qs('#callyLinkedStates')?.remove();
    const resources = entitiesOf('resource');
    const things = entitiesOf('thing');
    const resourceChecks = resources.length ? resources.map(entity => `<label class="linkChoice"><input type="checkbox" data-link-kind="uses" value="${esc(entity.entity_id)}" ${eventId && activeRelation(eventId,'uses',entity.entity_id) ? 'checked' : ''}><span><b>${esc(entity.label)}</b><small>${esc(entity.dimensions?.type || 'Resource')}</small></span></label>`).join('') : '<div class="linkedEmpty">No resources yet. Add rooms, cars or equipment from the Calendar Space button.</div>';
    const thingChecks = things.length ? things.map(entity => `<label class="linkChoice"><input type="checkbox" data-link-kind="requires" value="${esc(entity.entity_id)}" ${eventId && activeRelation(eventId,'requires',entity.entity_id) ? 'checked' : ''}><span><b>${esc(entity.label)}</b><small>${esc(entity.dimensions?.type || 'Thing / requirement')}</small></span></label>`).join('') : '<div class="linkedEmpty">No things yet. Add e.g. matsäck or badkläder from Calendar Space.</div>';
    const section = document.createElement('div');
    section.id = 'callyLinkedStates';
    section.className = 'field full linkedStates';
    section.innerHTML = `<label>Linked states</label><div class="linkedStateGrid"><div><div class="stateLabel">Resources · uses / reserves</div><div class="linkChoices">${resourceChecks}</div></div><div><div class="stateLabel">Things · requires</div><div class="linkChoices">${thingChecks}</div></div></div><div class="linkedHint">Room, car, matsäck, badkläder etc. are states. The event links to them through state relations.</div>`;
    form.appendChild(section);
  }

  async function saveEventWithLinkedStates(ev) {
    ev?.preventDefault?.();
    ev?.stopImmediatePropagation?.();
    try {
      const current = currentEditingEventId ? eventForId(currentEditingEventId) : null;
      const dims = {};
      const lang = qs('#fLanguage')?.value.trim();
      if (lang) dims.language = lang;
      qsa('#fDimensions .dimEdit').forEach(row => {
        const raw = qs('.dimKey', row)?.value.trim();
        const value = qs('.dimVal', row)?.value.trim();
        if (!raw || !value) return;
        const key = typeof window.resolveDimension === 'function' ? window.resolveDimension(raw) : raw;
        if (!['person','event','day','week','month','year','time','location'].includes(key)) dims[key] = value;
      });
      const payload = {
        event_id:currentEditingEventId || undefined,
        title:qs('#fTitle')?.value || 'Untitled event',
        start:qs('#fStart')?.value,
        end:qs('#fEnd')?.value,
        location:qs('#fLocation')?.value || '',
        people:qsa('#fPeople input:checked').map(x => x.value),
        dimensions:dims,
        locked:!!current?.locked,
        all_day:!!current?.all_day,
        constraints:current?.constraints || {},
      };
      const saved = await postJson('/api/event', payload);
      const eventId = saved.event?.event_id;
      if (!eventId) throw new Error('Event state id missing');
      const relationJobs = qsa('#callyLinkedStates input[data-link-kind]').map(input => {
        const positive = input.dataset.linkKind;
        const predicate = input.checked ? positive : `not_${positive}`;
        const old = activeRelation(eventId, positive, input.value);
        const dimensions = positive === 'requires' ? {...(old?.dimensions || {}), status:input.checked ? (old?.dimensions?.status || 'needed') : 'inactive'} : {...(old?.dimensions || {}), state:input.checked ? 'active' : 'inactive'};
        return postJson('/api/relation', {relation_id:`${eventId}|${positive}|${input.value}`, subject_id:eventId, predicate, object_id:input.value, dimensions});
      });
      await Promise.all(relationJobs);
      qs('#modalBack').style.display = 'none';
      currentEditingEventId = null;
      await refreshState(true);
      await window.load?.();
      window.toast?.('Event saved with linked states');
    } catch (error) { window.toast?.(error.message || String(error)); }
  }

  function setupStateUX() {
    const mark = qs('.mark');
    if (mark && mark.dataset.spaceButton !== '1') {
      mark.dataset.spaceButton = '1';
      mark.setAttribute('role','button');
      mark.setAttribute('tabindex','0');
      mark.title = 'Open Calendar Space states';
      mark.addEventListener('click', openSpaceDirectory);
      mark.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openSpaceDirectory(); });
    }
    const personButton = qs('#personBtn');
    if (personButton && personButton.dataset.statePerson !== '1') {
      personButton.dataset.statePerson = '1';
      personButton.title = 'Add person state';
      personButton.addEventListener('click', e => { e.preventDefault(); e.stopImmediatePropagation(); openPersonDialog(); }, true);
    }
    const eventButton = qs('#eventBtn');
    if (eventButton && eventButton.dataset.stateEvent !== '1') {
      eventButton.dataset.stateEvent = '1';
      eventButton.addEventListener('click', () => { currentEditingEventId = null; setTimeout(() => enhanceEventModal(null), 0); }, true);
    }
    if (typeof window.openEvent === 'function' && !window.openEvent.__callyStateWrapped) {
      const original = window.openEvent;
      const wrapped = function(id=null) {
        currentEditingEventId = id;
        const result = original(id);
        setTimeout(() => enhanceEventModal(id), 0);
        return result;
      };
      wrapped.__callyStateWrapped = true;
      window.openEvent = wrapped;
    }
    const save = qs('#saveEvent');
    if (save && save.dataset.linkedStateSave !== '1') {
      save.dataset.linkedStateSave = '1';
      save.onclick = saveEventWithLinkedStates;
    }
    const infer = qs('#inferBtn');
    if (infer) {
      infer.textContent = 'QCDS Resolve';
      infer.title = 'Resolve coherent placement across represented Calendar Space states';
    }
  }

  function onPointerDown(ev) {
    const resize = ev.target.closest?.('[data-resize-event]');
    if (resize) return startResize(ev, resize);
    const edit = ev.target.closest?.('[data-edit-event]');
    if (edit) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      currentEditingEventId = edit.dataset.editEvent;
      window.openEvent?.(currentEditingEventId);
      return;
    }
    const eventEl = ev.target.closest?.('[data-event-id]');
    if (!eventEl) return;
    if (ev.target.closest?.('[data-pin-event]')) return;
    if (ev.target.closest?.('.eventMove')) return;
    ev.stopPropagation();
  }

  function boot() {
    const stage = qs('#stage');
    if (!stage) return setTimeout(boot, 40);
    stage.addEventListener('pointerdown', onPointerDown, true);
    const observer = new MutationObserver(() => {
      decorate(stage);
      setupStateUX();
      refreshState();
    });
    observer.observe(stage, {childList:true, subtree:true});
    refreshState().then(() => { decorate(stage); setupStateUX(); });
    setupStateUX();
    setHeaderHeight();
    window.addEventListener('resize', setHeaderHeight, {passive:true});
    window.addEventListener('orientationchange', () => setTimeout(setHeaderHeight, 80), {passive:true});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
