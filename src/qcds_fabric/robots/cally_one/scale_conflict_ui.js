/* Cally.One scalable selectors + conflict/planning-state presentation.
   Presentation only. QCDS inference remains in the shared Python core. */
(() => {
  let latestState = {events:[], people:[], entities:[], relations:[], state_conflicts:[], planning_states:[]};
  const qs = (s, root=document) => root.querySelector(s);
  const qsa = (s, root=document) => [...root.querySelectorAll(s)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const MOBILE_TYPES = new Set(['car','vehicle','automobile','van','minivan','bus','taxi','bike','bicycle','motorcycle','scooter','boat','train']);

  function rememberState(value) {
    const state = value?.state && Array.isArray(value.state.events) ? value.state : value;
    if (!state || !Array.isArray(state.events)) return;
    latestState = state;
    for (const key of ['entities','relations','state_conflicts','planning_states','people']) {
      if (!Array.isArray(latestState[key])) latestState[key] = [];
    }
    paintStates();
    enhanceLargeSelectors();
  }

  function entityForId(id) { return (latestState.entities || []).find(e => e.entity_id === id) || null; }
  function personForId(id) { return (latestState.people || []).find(p => p.person_id === id) || entityForId(id); }
  function eventForId(id) { return (latestState.events || []).find(e => e.event_id === id) || null; }
  function isMobile(entity) {
    if (!entity) return false;
    const d = entity.dimensions || {};
    const mode = String(d.allocation_mode || '').toLowerCase();
    const mobility = String(d.mobility || '').toLowerCase();
    const type = String(d.type || '').toLowerCase();
    return ['route','mobile_route'].includes(mode) || mobility === 'mobile' || MOBILE_TYPES.has(type);
  }

  function currentEventIdFromForm() {
    const title = qs('#fTitle')?.value || '';
    const start = qs('#fStart')?.value || '';
    const end = qs('#fEnd')?.value || '';
    const matches = (latestState.events || []).filter(e => e.title === title && e.start === start && e.end === end);
    return matches.length === 1 ? matches[0].event_id : null;
  }

  function activeRelation(eventId, resourceId) {
    return (latestState.relations || []).find(r => r.subject_id === eventId && r.object_id === resourceId && ['uses','reserves'].includes(r.predicate)) || null;
  }

  function selectedRiders(resourceId) {
    const picker = qs(`.callyRiderPicker[data-resource-id="${CSS.escape(resourceId)}"]`);
    return picker ? qsa('input[data-rider-id]:checked', picker).map(input => input.dataset.riderId) : null;
  }

  function installFetchObserver() {
    if (window.fetch.__callyScaleWrapped) return;
    const previous = window.fetch.bind(window);
    const wrapped = async function(input, options={}) {
      let nextOptions = options;
      try {
        const url = new URL(typeof input === 'string' ? input : input.url, window.location.href);
        const method = String(options.method || 'GET').toUpperCase();
        if (method === 'POST' && options.body) {
          const body = JSON.parse(options.body);
          if (url.pathname.endsWith('/api/entity') && body?.kind === 'resource') {
            body.dimensions = {...(body.dimensions || {})};
            const capacity = Number.parseFloat(qs('#callyCapacity')?.value || '');
            const capacityDimension = qs('#callyCapacityDimension')?.value.trim();
            const mobility = qs('#callyMobility')?.value;
            if (Number.isFinite(capacity) && capacity > 0) body.dimensions.capacity = capacity;
            if (capacityDimension) body.dimensions.capacity_dimension = capacityDimension;
            if (mobility) body.dimensions.mobility = mobility;
            body.dimensions.conflict_policy = 'warn';
            nextOptions = {...options, body:JSON.stringify(body)};
          }
          if (url.pathname.endsWith('/api/relation') && body?.object_id) {
            const entity = entityForId(body.object_id);
            if (isMobile(entity) && !String(body.predicate || '').startsWith('not_')) {
              const riders = selectedRiders(body.object_id);
              if (riders !== null) {
                body.dimensions = {...(body.dimensions || {}), rider_ids:riders, route_status:'needs_resolution'};
                nextOptions = {...options, body:JSON.stringify(body)};
              }
            }
          }
        }
      } catch (_) { /* request stays unchanged */ }
      const response = await previous(input, nextOptions);
      try {
        const clone = response.clone?.();
        if (clone) clone.json().then(rememberState).catch(() => {});
      } catch (_) { /* state observation is best-effort */ }
      return response;
    };
    wrapped.__callyScaleWrapped = true;
    window.fetch = wrapped;
  }

  function conflictsForEvent(eventId) {
    return (latestState.state_conflicts || []).filter(c => (c.event_ids || []).includes(eventId) && c.status === 'unresolved');
  }
  function planningForEvent(eventId) {
    return (latestState.planning_states || []).filter(p => (p.event_ids || []).includes(eventId) && p.status === 'needs_resolution');
  }

  function paintStates() {
    qsa('[data-event-id]').forEach(el => {
      const eventId = el.dataset.eventId;
      const conflicts = conflictsForEvent(eventId);
      const planning = planningForEvent(eventId);
      el.classList.toggle('callyStateConflict', conflicts.length > 0);
      el.classList.toggle('callyNeedsResolution', !conflicts.length && planning.length > 0);
      qs('.callyConflictBadge', el)?.remove();
      qs('.callyPlanningBadge', el)?.remove();

      if (conflicts.length) {
        const badge = document.createElement('button');
        badge.type = 'button'; badge.className = 'callyConflictBadge'; badge.textContent = '!';
        badge.title = 'Det här går inte ihop ännu';
        badge.onclick = ev => { ev.preventDefault(); ev.stopPropagation(); openIssueSheet(eventId, 'conflict'); };
        el.appendChild(badge);
      } else if (planning.length) {
        const badge = document.createElement('button');
        badge.type = 'button'; badge.className = 'callyPlanningBadge'; badge.textContent = '?';
        badge.title = 'Det här behöver planeras';
        badge.onclick = ev => { ev.preventDefault(); ev.stopPropagation(); openIssueSheet(eventId, 'planning'); };
        el.appendChild(badge);
      }
    });
    updateIssueCounters();
  }

  function updateIssueCounters() {
    const top = qs('.top');
    if (!top) return;
    const conflictCount = (latestState.state_conflicts || []).filter(c => c.status === 'unresolved').length;
    const planningCount = (latestState.planning_states || []).filter(p => p.status === 'needs_resolution').length;
    let red = qs('#callyConflictCounter');
    let orange = qs('#callyPlanningCounter');
    if (!conflictCount) red?.remove();
    else {
      if (!red) { red = document.createElement('button'); red.id='callyConflictCounter'; red.className='callyConflictCounter'; red.type='button'; top.appendChild(red); }
      red.textContent = `${conflictCount} krock${conflictCount === 1 ? '' : 'ar'}`;
      red.onclick = () => openIssueSheet(null, 'conflict');
    }
    if (!planningCount) orange?.remove();
    else {
      if (!orange) { orange = document.createElement('button'); orange.id='callyPlanningCounter'; orange.className='callyPlanningCounter'; orange.type='button'; top.appendChild(orange); }
      orange.textContent = `${planningCount} behöver lösas`;
      orange.onclick = () => openIssueSheet(null, 'planning');
    }
  }

  function ensureIssueOverlay() {
    let overlay = qs('#callyIssueOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'callyIssueOverlay'; overlay.className = 'callyIssueOverlay';
      overlay.innerHTML = '<div class="callyIssueSheet"></div>';
      overlay.onclick = ev => { if (ev.target === overlay) overlay.classList.remove('open'); };
      document.body.appendChild(overlay);
    }
    return overlay;
  }

  function planningCard(item) {
    const eventNames = (item.event_ids || []).map(id => eventForId(id)?.title || id);
    const riders = (item.rider_ids || []).map(id => personForId(id)?.name || personForId(id)?.label || id);
    return `<div class="callyIssueCard planning"><b>${esc(item.state_label || 'Transport')}</b><span>Transporten behöver bestämmas</span><small>${esc(eventNames.join(' · '))}</small>${riders.length ? `<small>Åker med: ${esc(riders.join(', '))}</small>` : '<small>Ingen passagerare vald ännu</small>'}<div class="callyIssueActions"><button type="button" data-edit-event="${esc((item.event_ids || [])[0] || '')}">Ändra själv</button><span>Du kan ändra bil, personer, tid eller annan kalenderinformation. QCDS kan sedan pröva representerade alternativ.</span></div></div>`;
  }

  function conflictCard(item) {
    const entity = entityForId(item.state_id);
    const label = item.state_label || entity?.label || (item.capacity_dimension === 'person' ? 'Person' : 'Tillstånd');
    const eventNames = (item.event_ids || []).map(id => eventForId(id)?.title || id);
    const start = new Date(item.start).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    const end = new Date(item.end).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    const text = Number(item.capacity) === 1 ? 'Kan inte användas på två sätt samtidigt' : `Behöver ${item.load} men har plats för ${item.capacity}`;
    return `<div class="callyIssueCard conflict"><b>${esc(label)}</b><span>${esc(text)}</span><small>${esc(start)}–${esc(end)} · ${esc(eventNames.join(' + '))}</small><div class="callyIssueActions"><button type="button" data-edit-event="${esc((item.event_ids || [])[0] || '')}">Ändra själv</button></div></div>`;
  }

  function openIssueSheet(eventId=null, mode='planning') {
    const overlay = ensureIssueOverlay();
    const sheet = qs('.callyIssueSheet', overlay);
    const all = mode === 'conflict' ? (latestState.state_conflicts || []) : (latestState.planning_states || []);
    const items = eventId ? all.filter(item => (item.event_ids || []).includes(eventId)) : all;
    const heading = mode === 'conflict' ? 'Det här går inte ihop' : 'Det här behöver planeras';
    const intro = mode === 'conflict' ? 'Något är faktiskt dubbelbokat eller över kapacitet.' : 'Det kan gå bra, men transporten eller resursanvändningen är inte bestämd ännu.';
    sheet.innerHTML = `<div class="callyIssueHead"><div><small>${mode === 'conflict' ? 'KROCK' : 'BEHÖVER LÖSAS'}</small><h2>${esc(heading)}</h2><p>${esc(intro)}</p></div><button type="button" data-close-issues>×</button></div><div class="callyIssueList">${items.map(item => mode === 'conflict' ? conflictCard(item) : planningCard(item)).join('') || '<div class="callyIssueEmpty">Inget att lösa här.</div>'}</div>`;
    qs('[data-close-issues]', sheet).onclick = () => overlay.classList.remove('open');
    qsa('[data-edit-event]', sheet).forEach(button => button.onclick = () => {
      overlay.classList.remove('open');
      window.openEvent?.(button.dataset.editEvent);
    });
    overlay.classList.add('open');
  }

  function injectCapacityEditor() {
    const save = qs('#saveEntityState');
    if (!save || qs('#callyCapacity')) return;
    const exclusive = qs('#entityExclusive');
    if (!exclusive) return;
    const line = exclusive.closest('label');
    const block = document.createElement('div');
    block.className = 'callyCapacityEditor';
    block.innerHTML = `<div class="stateFormTwo"><label>Kapacitet<input id="callyCapacity" class="stateInput" type="number" min="1" step="1" placeholder="t.ex. 4"></label><label>Kapacitet av<input id="callyCapacityDimension" class="stateInput" placeholder="person, cykel, plats…" value="person"></label></div><label>Hur används den?<select id="callyMobility" class="stateInput"><option value="">Automatiskt från typ</option><option value="mobile">Rörlig · t.ex. bil/cykel</option><option value="stationary">Stationär · t.ex. rum</option></select></label><div class="callyCapacityHint">En rörlig resurs får egna rutt-, plats-, pickup/dropoff- och beläggningstillstånd. Överlappande aktiviteter betyder inte automatiskt krock.</div>`;
    line.parentElement.insertBefore(block, line.nextSibling);
  }

  function entityHay(input) {
    const entity = entityForId(input.value);
    return `${entity?.label || ''} ${entity?.kind || ''} ${JSON.stringify(entity?.dimensions || {})}`.toLowerCase();
  }

  function enhanceLinkChoiceBox(box) {
    if (box.dataset.callySearch === '1') return;
    box.dataset.callySearch = '1';
    const search = document.createElement('input');
    search.className = 'stateInput callyLinkSearch';
    search.placeholder = 'Sök namn, typ, plats eller annan egenskap…';
    const status = document.createElement('div'); status.className = 'callyLinkStatus';
    box.parentElement.insertBefore(search, box); box.parentElement.insertBefore(status, box);
    const apply = () => {
      const q = search.value.trim().toLowerCase(); let shown = 0; let total = 0;
      qsa('.linkChoice', box).forEach(label => {
        const input = qs('input', label); total += 1;
        const match = !q || entityHay(input).includes(q) || label.textContent.toLowerCase().includes(q);
        const visible = input.checked || (match && shown < 30);
        label.style.display = visible ? '' : 'none'; if (visible && !input.checked) shown += 1;
      });
      const selected = qsa('input:checked', box).length;
      status.textContent = q ? `Visar träffar · ${selected} valda` : `Visar upp till 30 av ${total} · ${selected} valda`;
    };
    search.addEventListener('input', apply); box.addEventListener('change', () => { apply(); enhanceRiderPickers(); }); apply();
  }

  function limitPeopleList() {
    const box = qs('#fPeople'); const search = qs('#eventPeopleSearch');
    if (!box || !search || search.dataset.callyScale === '1') return;
    search.dataset.callyScale = '1';
    const apply = () => {
      const q = search.value.trim().toLowerCase(); let shown = 0;
      qsa('label', box).forEach(label => {
        const input = qs('input', label); const match = !q || label.textContent.toLowerCase().includes(q);
        const visible = input?.checked || (match && shown < 30); label.style.display = visible ? '' : 'none';
        if (visible && !input?.checked) shown += 1;
      });
      enhanceRiderPickers();
    };
    search.addEventListener('input', apply, true); box.addEventListener('change', apply); apply();
  }

  function enhanceRiderPickers() {
    const people = qsa('#fPeople input:checked').map(input => ({id:input.value, label:input.closest('label')?.textContent?.trim() || personForId(input.value)?.name || input.value}));
    const eventId = currentEventIdFromForm();
    qsa('#callyLinkedStates input[data-link-kind="uses"]').forEach(input => {
      const entity = entityForId(input.value); const label = input.closest('.linkChoice');
      if (!label || !isMobile(entity)) return;
      let picker = qs(`.callyRiderPicker[data-resource-id="${CSS.escape(input.value)}"]`, label);
      if (!input.checked) { picker?.remove(); return; }
      const relation = eventId ? activeRelation(eventId, input.value) : null;
      const explicit = Array.isArray(relation?.dimensions?.rider_ids) ? relation.dimensions.rider_ids.map(String) : null;
      const existingSelected = picker ? qsa('input[data-rider-id]:checked', picker).map(x => x.dataset.riderId) : null;
      const selected = new Set(existingSelected || explicit || people.map(p => p.id));
      if (!picker) {
        picker = document.createElement('div'); picker.className = 'callyRiderPicker'; picker.dataset.resourceId = input.value; label.appendChild(picker);
      }
      picker.innerHTML = `<small>Åker med ${esc(entity.label)}</small><div>${people.map(person => `<label><input type="checkbox" data-rider-id="${esc(person.id)}" ${selected.has(person.id) ? 'checked' : ''}> ${esc(person.label)}</label>`).join('') || '<span>Välj personer i händelsen först.</span>'}</div>`;
    });
  }

  function enhanceLargeSelectors() {
    injectCapacityEditor();
    qsa('#callyLinkedStates .linkChoices').forEach(enhanceLinkChoiceBox);
    limitPeopleList(); enhanceRiderPickers();
  }

  async function refreshState() {
    try { const response = await fetch('/api/state'); rememberState(await response.json()); }
    catch (_) { /* visible calendar must remain usable */ }
  }

  function boot() {
    installFetchObserver();
    const observer = new MutationObserver(() => { enhanceLargeSelectors(); paintStates(); });
    observer.observe(document.body, {childList:true, subtree:true});
    window.addEventListener('cally-one-core-state-ready', refreshState);
    refreshState(); enhanceLargeSelectors();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
