/* Cally.One scalable selectors + conflict-state presentation.
   Presentation only. QCDS inference remains in the shared Python core. */
(() => {
  let latestState = {events:[], people:[], entities:[], relations:[], state_conflicts:[]};
  const qs = (s, root=document) => root.querySelector(s);
  const qsa = (s, root=document) => [...root.querySelectorAll(s)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function rememberState(value) {
    const state = value?.state && Array.isArray(value.state.events) ? value.state : value;
    if (!state || !Array.isArray(state.events)) return;
    latestState = state;
    if (!Array.isArray(latestState.entities)) latestState.entities = [];
    if (!Array.isArray(latestState.state_conflicts)) latestState.state_conflicts = [];
    paintConflicts();
    enhanceLargeSelectors();
  }

  function installFetchObserver() {
    if (window.fetch.__callyScaleWrapped) return;
    const previous = window.fetch.bind(window);
    const wrapped = async function(input, options={}) {
      let nextOptions = options;
      try {
        const url = new URL(typeof input === 'string' ? input : input.url, window.location.href);
        if (url.pathname.endsWith('/api/entity') && String(options.method || 'GET').toUpperCase() === 'POST' && options.body) {
          const body = JSON.parse(options.body);
          if (body?.kind === 'resource') {
            body.dimensions = {...(body.dimensions || {})};
            const capacity = Number.parseFloat(qs('#callyCapacity')?.value || '');
            const capacityDimension = qs('#callyCapacityDimension')?.value.trim();
            if (Number.isFinite(capacity) && capacity > 0) body.dimensions.capacity = capacity;
            if (capacityDimension) body.dimensions.capacity_dimension = capacityDimension;
            body.dimensions.conflict_policy = 'warn';
            nextOptions = {...options, body:JSON.stringify(body)};
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

  function paintConflicts() {
    qsa('[data-event-id]').forEach(el => {
      const conflicts = conflictsForEvent(el.dataset.eventId);
      el.classList.toggle('callyStateConflict', conflicts.length > 0);
      let badge = qs('.callyConflictBadge', el);
      if (!conflicts.length) {
        badge?.remove();
        return;
      }
      if (!badge) {
        badge = document.createElement('button');
        badge.type = 'button';
        badge.className = 'callyConflictBadge';
        badge.textContent = '!';
        el.appendChild(badge);
      }
      const labels = conflicts.map(c => {
        const entity = (latestState.entities || []).find(e => e.entity_id === c.state_id);
        const name = c.state_label || entity?.label || 'Planeringskrock';
        return `${name}: ${c.load}/${c.capacity}`;
      });
      badge.title = labels.join('\n');
      badge.onclick = ev => {
        ev.preventDefault(); ev.stopPropagation();
        openConflictSheet(el.dataset.eventId);
      };
    });
    updateConflictCounter();
  }

  function updateConflictCounter() {
    const top = qs('.top');
    if (!top) return;
    let chip = qs('#callyConflictCounter');
    const count = (latestState.state_conflicts || []).filter(c => c.status === 'unresolved').length;
    if (!count) { chip?.remove(); return; }
    if (!chip) {
      chip = document.createElement('button');
      chip.id = 'callyConflictCounter';
      chip.className = 'callyConflictCounter';
      chip.type = 'button';
      top.appendChild(chip);
    }
    chip.textContent = `${count} behöver lösas`;
    chip.title = 'Visa planeringskrockar';
    chip.onclick = () => openConflictSheet(null);
  }

  function openConflictSheet(eventId=null) {
    const all = (latestState.state_conflicts || []).filter(c => c.status === 'unresolved');
    const conflicts = eventId ? all.filter(c => (c.event_ids || []).includes(eventId)) : all;
    let overlay = qs('#callyConflictOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'callyConflictOverlay';
      overlay.className = 'callyConflictOverlay';
      overlay.innerHTML = '<div class="callyConflictSheet"></div>';
      overlay.onclick = ev => { if (ev.target === overlay) overlay.classList.remove('open'); };
      document.body.appendChild(overlay);
    }
    const sheet = qs('.callyConflictSheet', overlay);
    sheet.innerHTML = `<div class="callyConflictHead"><div><small>BEHÖVER LÖSAS</small><h2>Planeringskrockar</h2><p>Händelserna är sparade, men något kan inte fungera samtidigt.</p></div><button type="button" data-close-conflicts>×</button></div><div class="callyConflictList">${conflicts.map(conflict => {
      const entity = (latestState.entities || []).find(e => e.entity_id === conflict.state_id);
      const label = conflict.state_label || entity?.label || (conflict.capacity_dimension === 'person' ? 'Person' : 'Tillstånd');
      const events = (conflict.event_ids || []).map(id => latestState.events.find(e => e.event_id === id)?.title || id);
      const start = new Date(conflict.start).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
      const end = new Date(conflict.end).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
      const capacityText = Number(conflict.capacity) === 1
        ? 'Kan bara användas av en åt gången'
        : `Behöver ${conflict.load} av ${conflict.capacity} tillgängliga`;
      return `<div class="callyConflictCard"><b>${esc(label)}</b><span>${esc(capacityText)}</span><small>${esc(start)}–${esc(end)} · ${esc(events.join(' + '))}</small><button type="button" data-conflict-event="${esc((conflict.event_ids || [])[0] || '')}">Ändra en händelse</button></div>`;
    }).join('') || '<div class="callyConflictEmpty">Inga olösta krockar.</div>'}</div>`;
    qs('[data-close-conflicts]', sheet).onclick = () => overlay.classList.remove('open');
    qsa('[data-conflict-event]', sheet).forEach(button => button.onclick = () => {
      overlay.classList.remove('open');
      window.openEvent?.(button.dataset.conflictEvent);
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
    block.className = 'callyCapacityEditor stateFormTwo';
    block.innerHTML = `<label>Kapacitet<input id="callyCapacity" class="stateInput" type="number" min="1" step="1" placeholder="t.ex. 4"></label><label>Kapacitet av<input id="callyCapacityDimension" class="stateInput" placeholder="person, cykel, plats…" value="person"></label>`;
    line.parentElement.insertBefore(block, line.nextSibling);
    const hint = document.createElement('div');
    hint.className = 'callyCapacityHint';
    hint.textContent = 'Exempel: en bil kan ha kapacitet 4 personer. Kapacitet 1 betyder i praktiken en åt gången.';
    block.after(hint);
  }

  function entityHay(input) {
    const entity = (latestState.entities || []).find(e => e.entity_id === input.value);
    return `${entity?.label || ''} ${entity?.kind || ''} ${JSON.stringify(entity?.dimensions || {})}`.toLowerCase();
  }

  function enhanceLinkChoiceBox(box) {
    if (box.dataset.callySearch === '1') return;
    box.dataset.callySearch = '1';
    const search = document.createElement('input');
    search.className = 'stateInput callyLinkSearch';
    search.placeholder = 'Sök namn, typ, plats eller annan egenskap…';
    const status = document.createElement('div');
    status.className = 'callyLinkStatus';
    box.parentElement.insertBefore(search, box);
    box.parentElement.insertBefore(status, box);
    const apply = () => {
      const q = search.value.trim().toLowerCase();
      let shown = 0;
      let total = 0;
      qsa('.linkChoice', box).forEach(label => {
        const input = qs('input', label);
        total += 1;
        const match = !q || entityHay(input).includes(q) || label.textContent.toLowerCase().includes(q);
        const visible = input.checked || (match && shown < 30);
        label.style.display = visible ? '' : 'none';
        if (visible && !input.checked) shown += 1;
      });
      const selected = qsa('input:checked', box).length;
      status.textContent = q ? `Visar träffar · ${selected} valda` : `Visar upp till 30 av ${total} · ${selected} valda`;
    };
    search.addEventListener('input', apply);
    box.addEventListener('change', apply);
    apply();
  }

  function limitPeopleList() {
    const box = qs('#fPeople');
    const search = qs('#eventPeopleSearch');
    if (!box || !search || search.dataset.callyScale === '1') return;
    search.dataset.callyScale = '1';
    const apply = () => {
      const q = search.value.trim().toLowerCase();
      let shown = 0;
      qsa('label', box).forEach(label => {
        const input = qs('input', label);
        const match = !q || label.textContent.toLowerCase().includes(q);
        const visible = input?.checked || (match && shown < 30);
        label.style.display = visible ? '' : 'none';
        if (visible && !input?.checked) shown += 1;
      });
    };
    search.addEventListener('input', apply, true);
    box.addEventListener('change', apply);
    apply();
  }

  function enhanceLargeSelectors() {
    injectCapacityEditor();
    qsa('#callyLinkedStates .linkChoices').forEach(enhanceLinkChoiceBox);
    limitPeopleList();
  }

  async function refreshState() {
    try {
      const response = await fetch('/api/state');
      rememberState(await response.json());
    } catch (_) { /* visible calendar must remain usable */ }
  }

  function boot() {
    installFetchObserver();
    const observer = new MutationObserver(() => {
      enhanceLargeSelectors();
      paintConflicts();
    });
    observer.observe(document.body, {childList:true, subtree:true});
    window.addEventListener('cally-one-core-state-ready', refreshState);
    refreshState();
    enhanceLargeSelectors();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
