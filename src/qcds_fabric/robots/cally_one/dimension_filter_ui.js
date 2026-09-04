/* Cally.One scalable dimension filters + event projection/access states.
   UI projection only; all source data remains Calendar Space state. */
(() => {
  const qs = (s, root=document) => root.querySelector(s);
  const qsa = (s, root=document) => [...root.querySelectorAll(s)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let cachedState = null;
  let reading = null;
  const activeOverlapEvent = new Map();
  let lastZoomCluster = null;
  let projectionTimers = [];

  async function state(force=false) {
    if (force) cachedState = null;
    if (cachedState) return cachedState;
    if (reading) return reading;
    reading = fetch('/api/state')
      .then(r => r.json())
      .then(body => {
        cachedState = body && typeof body === 'object' ? body : {};
        if (!Array.isArray(cachedState.entities)) cachedState.entities = [];
        if (!Array.isArray(cachedState.people)) cachedState.people = [];
        if (!Array.isArray(cachedState.events)) cachedState.events = [];
        return cachedState;
      })
      .catch(() => ({entities:[],people:[],events:[]}))
      .finally(() => { reading = null; });
    return reading;
  }

  function option(value) {
    const el = document.createElement('option');
    el.value = value;
    el.textContent = value;
    return el;
  }

  async function enhanceResourceBox(box) {
    if (box.dataset.callyDimensionFilters === '1') return;
    const inputs = qsa('input[data-link-kind="uses"]', box);
    if (!inputs.length) return;
    box.dataset.callyDimensionFilters = '1';

    const snapshot = await state();
    const byId = new Map((snapshot.entities || []).map(entity => [entity.entity_id, entity]));
    const entities = inputs.map(input => byId.get(input.value)).filter(Boolean);
    const types = [...new Set(entities.map(entity => String(entity.dimensions?.type || '').trim()).filter(Boolean))].sort();
    const locations = [...new Set(entities.map(entity => String(entity.dimensions?.location || '').trim()).filter(Boolean))].sort();

    const filters = document.createElement('div');
    filters.className = 'callyLinkedDimensionFilters';
    const typeSelect = document.createElement('select');
    typeSelect.className = 'stateInput';
    typeSelect.setAttribute('aria-label', 'Filtrera resurser på typ');
    typeSelect.appendChild(option(''));
    typeSelect.options[0].textContent = 'Alla typer';
    types.forEach(value => typeSelect.appendChild(option(value)));
    const locationSelect = document.createElement('select');
    locationSelect.className = 'stateInput';
    locationSelect.setAttribute('aria-label', 'Filtrera resurser på plats');
    locationSelect.appendChild(option(''));
    locationSelect.options[0].textContent = 'Alla platser';
    locations.forEach(value => locationSelect.appendChild(option(value)));
    filters.append(typeSelect, locationSelect);
    box.parentElement.insertBefore(filters, box);

    const search = box.parentElement.querySelector('.callyLinkSearch');
    const status = box.parentElement.querySelector('.callyLinkStatus');
    const apply = () => {
      const query = String(search?.value || '').trim().toLowerCase();
      const wantedType = typeSelect.value;
      const wantedLocation = locationSelect.value;
      let shown = 0;
      let matched = 0;
      qsa('.linkChoice', box).forEach(label => {
        const input = qs('input', label);
        const entity = byId.get(input?.value);
        if (!input || !entity) return;
        const dimensions = entity.dimensions || {};
        const hay = `${entity.label || ''} ${entity.kind || ''} ${JSON.stringify(dimensions)}`.toLowerCase();
        const matches = (!query || hay.includes(query) || label.textContent.toLowerCase().includes(query))
          && (!wantedType || String(dimensions.type || '') === wantedType)
          && (!wantedLocation || String(dimensions.location || '') === wantedLocation);
        if (matches) matched += 1;
        const visible = input.checked || (matches && shown < 30);
        label.style.display = visible ? '' : 'none';
        if (visible && !input.checked) shown += 1;
      });
      const selected = qsa('input:checked', box).length;
      if (status) status.textContent = `Visar ${Math.min(matched, 30)} av ${matched} träffar · ${selected} valda`;
    };
    typeSelect.addEventListener('change', apply);
    locationSelect.addEventListener('change', apply);
    search?.addEventListener('input', () => queueMicrotask(apply));
    box.addEventListener('change', apply);
    apply();
  }

  function enhance() {
    qsa('#callyLinkedStates .linkChoices').forEach(box => { void enhanceResourceBox(box); });
  }

  function eventPriority(item) {
    const value = Number(item?.dimensions?.calendar_layer_priority ?? 0);
    return Number.isFinite(value) ? value : 0;
  }

  function clusterKey(cluster) {
    const ids = qsa('.event[data-event-id]', cluster).map(el => String(el.dataset.eventId || '')).filter(Boolean).sort();
    return ids.join('|');
  }

  function rememberActive(cluster, eventId) {
    if (!cluster || !eventId) return;
    const key = clusterKey(cluster);
    if (!key) return;
    activeOverlapEvent.set(key, String(eventId));
    cluster.dataset.callyActiveEvent = String(eventId);
  }

  function applyOverlapPriority(cluster) {
    if (!cluster || cluster.classList.contains('expanded')) return;
    const events = qsa('.event[data-event-id]', cluster);
    if (events.length < 2) return;
    const key = clusterKey(cluster);
    if (!key) return;
    const active = activeOverlapEvent.get(key) || cluster.dataset.callyActiveEvent || '';
    const ranked = [...events].sort((a,b) => {
      const aa = String(a.dataset.eventId) === active ? 1 : 0;
      const ba = String(b.dataset.eventId) === active ? 1 : 0;
      if (aa !== ba) return ba - aa;
      const ap = Number(a.dataset.callyLayerPriority || 0);
      const bp = Number(b.dataset.callyLayerPriority || 0);
      if (ap !== bp) return bp - ap;
      return Number(a.dataset.callyOverlapColumn || 0) - Number(b.dataset.callyOverlapColumn || 0);
    });
    if (!active && ranked[0]) cluster.dataset.callyActiveEvent = String(ranked[0].dataset.eventId || '');

    if (cluster.classList.contains('callyOverlapFan') && !cluster.classList.contains('rail')) {
      const positions = events.map(event => Number.parseFloat(event.style.getPropertyValue('--cally-overlap-left') || '0')).sort((a,b) => a-b);
      ranked.forEach((event,index) => {
        if (Number.isFinite(positions[index])) event.style.setProperty('--cally-overlap-left', `${positions[index]}px`);
        event.style.setProperty('--cally-overlap-z', String(90 - index));
      });
    } else {
      ranked.forEach((event,index) => event.style.setProperty('--cally-overlap-z', String(90 - index)));
    }
  }

  function applyAllOverlapPriorities() {
    qsa('.callyOverlapCluster').forEach(applyOverlapPriority);
  }

  function closeProjectionPanel() {
    qs('#callyEventProjectionPanel')?.remove();
  }

  function audienceChoices(snapshot, selected) {
    const people = (snapshot.people || []).map(person => ({id:person.person_id,label:person.name,kind:'Person'}));
    const entities = (snapshot.entities || [])
      .filter(entity => ['organization','resource','thing'].includes(String(entity.kind || '')))
      .map(entity => ({id:entity.entity_id,label:entity.label,kind:entity.kind === 'organization' ? 'Organisation' : entity.kind === 'resource' ? 'Resurs' : 'Sak'}));
    return [...people,...entities].slice(0,120).map(item => `<label class="callyShareChoice"><input type="checkbox" value="${esc(item.id)}" ${selected.includes(String(item.id))?'checked':''}><span><b>${esc(item.label || item.id)}</b><small>${esc(item.kind)}</small></span></label>`).join('');
  }

  function dimensionOptions(item) {
    const standard = ['person','organization','resource','location','activity','priority'];
    const custom = Object.keys(item?.dimensions || {}).filter(key => !key.startsWith('calendar_') && key !== 'visibility_policy');
    return [...new Set([...standard,...custom])];
  }

  async function openProjectionPanel(eventId, anchor) {
    closeProjectionPanel();
    const snapshot = await state(true);
    const item = (snapshot.events || []).find(event => String(event.event_id) === String(eventId));
    if (!item) return;
    const dimensions = item.dimensions || {};
    const policy = dimensions.visibility_policy && typeof dimensions.visibility_policy === 'object' ? dimensions.visibility_policy : {};
    const fields = policy.fields && typeof policy.fields === 'object' ? policy.fields : {};
    const selected = Array.isArray(policy.audience_ids) ? policy.audience_ids.map(String) : [];
    const panel = document.createElement('section');
    panel.id = 'callyEventProjectionPanel';
    panel.className = 'callyEventProjectionPanel';
    panel.setAttribute('role','dialog');
    panel.setAttribute('aria-label','Lager och delning för händelse');
    const priority = eventPriority(item);
    const priorityDimension = String(dimensions.calendar_priority_dimension || '');
    panel.innerHTML = `<div class="callyProjectionHead"><div><small>PROJEKTION · ÅTKOMST</small><strong>${esc(item.title || 'Händelse')}</strong></div><button type="button" data-projection-close aria-label="Stäng">×</button></div>
      <div class="callyProjectionSection"><div class="callyProjectionSectionTitle">Lagerprio</div><div class="callyProjectionTwo"><label><span>Visas överst när det är trångt</span><select data-layer-priority><option value="-10" ${priority===-10?'selected':''}>Låg</option><option value="0" ${priority===0?'selected':''}>Normal</option><option value="10" ${priority===10?'selected':''}>Hög</option><option value="20" ${priority===20?'selected':''}>Överst</option></select></label><label><span>Prioritera via dimension</span><select data-priority-dimension><option value="">Ingen särskild</option>${dimensionOptions(item).map(key=>`<option value="${esc(key)}" ${priorityDimension===key?'selected':''}>${esc(key)}</option>`).join('')}</select></label></div><p>Senast aktiv händelse får tillfälligt ligga överst. Lagerprio bestämmer standardordningen nästa gång stacken ritas.</p></div>
      <div class="callyProjectionSection"><div class="callyProjectionSectionTitle">Delning</div><label><span>Vilka får se den här händelsen?</span><select data-share-scope><option value="private" ${policy.scope==='private'||!policy.scope?'selected':''}>Privat</option><option value="participants" ${policy.scope==='participants'?'selected':''}>Deltagare</option><option value="linked" ${policy.scope==='linked'?'selected':''}>Kopplade personer / resurser</option><option value="selected" ${policy.scope==='selected'?'selected':''}>Valda</option></select></label>
      <label class="callyProjectionToggle"><input type="checkbox" data-shared-presence ${policy.shared_state_presence!==false?'checked':''}><span><b>Visa närvaro i delat tillstånd</b><small>T.ex. att Anna finns i bilen utan att ge åtkomst till Annas kalender.</small></span></label>
      <div class="callyProjectionThree"><label><span>Rubrik</span><select data-share-title><option value="full" ${fields.title!=='busy'&&fields.title!=='hidden'?'selected':''}>Full</option><option value="busy" ${fields.title==='busy'?'selected':''}>Endast upptagen</option><option value="hidden" ${fields.title==='hidden'?'selected':''}>Dold</option></select></label><label><span>Personer</span><select data-share-people><option value="names" ${fields.people!=='presence'&&fields.people!=='hidden'?'selected':''}>Namn</option><option value="presence" ${fields.people==='presence'?'selected':''}>Närvaro</option><option value="hidden" ${fields.people==='hidden'?'selected':''}>Dolda</option></select></label><label><span>Resurser</span><select data-share-states><option value="labels" ${fields.linked_states!=='presence'&&fields.linked_states!=='hidden'?'selected':''}>Namn</option><option value="presence" ${fields.linked_states==='presence'?'selected':''}>Närvaro</option><option value="hidden" ${fields.linked_states==='hidden'?'selected':''}>Dolda</option></select></label></div>
      <label class="callyProjectionToggle"><input type="checkbox" data-share-location ${fields.location!==false?'checked':''}><span><b>Visa plats</b><small>Tid delas alltid inom vald åtkomstnivå.</small></span></label>
      <div class="callyShareAudience" data-share-audience ${policy.scope==='selected'?'':'hidden'}><div class="callyShareAudienceTitle">Valda mottagare</div>${audienceChoices(snapshot,selected) || '<small>Inga personer eller states att välja ännu.</small>'}</div>
      <div class="callyProjectionAccessNote">Delning av närvaro i en resurs är inte kalenderbehörighet. Åtkomst kan alltså projiceras genom ett gemensamt state utan att den andra personens kalender exponeras.</div></div>
      <div class="callyProjectionActions"><button type="button" data-projection-cancel>Avbryt</button><button type="button" data-projection-save>Spara</button></div>`;
    document.body.appendChild(panel);

    const rect = anchor?.getBoundingClientRect?.() || {left:8,right:8,bottom:8,top:8};
    const width = Math.min(430, window.innerWidth - 16);
    let left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    let top = rect.bottom + 8;
    panel.style.width = `${width}px`;
    panel.style.left = `${left}px`;
    panel.style.top = `${Math.max(8, top)}px`;
    requestAnimationFrame(() => {
      if (panel.getBoundingClientRect().bottom > window.innerHeight - 8) panel.style.top = `${Math.max(8, rect.top - panel.offsetHeight - 8)}px`;
    });

    const scope = qs('[data-share-scope]', panel);
    const audience = qs('[data-share-audience]', panel);
    scope?.addEventListener('change', () => { if (audience) audience.hidden = scope.value !== 'selected'; });
    qs('[data-projection-close]', panel)?.addEventListener('click', closeProjectionPanel);
    qs('[data-projection-cancel]', panel)?.addEventListener('click', closeProjectionPanel);
    qs('[data-projection-save]', panel)?.addEventListener('click', async () => {
      const save = qs('[data-projection-save]', panel);
      if (save) save.disabled = true;
      try {
        const nextDimensions = {...dimensions};
        nextDimensions.calendar_layer_priority = Number(qs('[data-layer-priority]', panel)?.value || 0);
        nextDimensions.calendar_priority_dimension = qs('[data-priority-dimension]', panel)?.value || '';
        nextDimensions.visibility_policy = {
          version:1,
          scope:scope?.value || 'private',
          audience_ids:qsa('[data-share-audience] input:checked', panel).map(input => input.value),
          shared_state_presence:!!qs('[data-shared-presence]', panel)?.checked,
          grants_calendar_access:false,
          principle:'state_presence_without_calendar_access',
          fields:{
            title:qs('[data-share-title]', panel)?.value || 'full',
            time:true,
            location:!!qs('[data-share-location]', panel)?.checked,
            people:qs('[data-share-people]', panel)?.value || 'names',
            linked_states:qs('[data-share-states]', panel)?.value || 'labels',
          },
        };
        const response = await fetch('/api/event', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...item,dimensions:nextDimensions})});
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
        cachedState = null;
        closeProjectionPanel();
        await window.load?.();
        scheduleProjection();
        window.toast?.('Lagerprio och delning sparad');
      } catch (error) {
        if (save) save.disabled = false;
        window.toast?.(error.message || String(error));
      }
    });
  }

  function decorateEventProjectionActions(snapshot) {
    const byId = new Map((snapshot.events || []).map(item => [String(item.event_id),item]));
    qsa('#stage [data-event-id]').forEach(eventEl => {
      const item = byId.get(String(eventEl.dataset.eventId));
      if (item) eventEl.dataset.callyLayerPriority = String(eventPriority(item));
      const menu = qs('.callyEventActionMenu', eventEl);
      if (!menu || qs('.callyEventProjectionAction', menu)) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'callyEventProjectionAction';
      button.title = 'Lager & delning';
      button.setAttribute('aria-label','Lagerprio och delning');
      button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="2"></circle><circle cx="17" cy="6" r="2"></circle><circle cx="17" cy="18" r="2"></circle><path d="M8 11l7-4M8 13l7 4"></path></svg>';
      button.addEventListener('click', event => {
        event.preventDefault(); event.stopPropagation();
        menu.hidden = true;
        qs('.callyEventMore', eventEl)?.setAttribute('aria-expanded','false');
        void openProjectionPanel(String(eventEl.dataset.eventId), eventEl);
      });
      menu.appendChild(button);
    });
  }

  async function refreshProjectionDecorations() {
    const snapshot = await state(true);
    decorateEventProjectionActions(snapshot);
    applyAllOverlapPriorities();
  }

  function scheduleProjection() {
    projectionTimers.forEach(clearTimeout);
    projectionTimers = [0,48,130].map(delay => setTimeout(() => { void refreshProjectionDecorations(); }, delay));
  }

  document.addEventListener('click', event => {
    const deep = event.target.closest?.('.callyOverlapDeep');
    if (deep) lastZoomCluster = deep.closest('.callyOverlapCluster');

    const zoomCard = event.target.closest?.('.callyOverlapZoomCard');
    if (zoomCard && lastZoomCluster) {
      const title = (qs('b', zoomCard)?.textContent || '').trim();
      const time = (qs('time', zoomCard)?.textContent || '').trim();
      const source = qsa('.event[data-event-id]', lastZoomCluster).find(el => {
        const sourceTitle = (qs('b', el)?.textContent || '').trim();
        const sourceMeta = (qs('small', el)?.textContent || '').trim();
        return sourceTitle === title && (!time || sourceMeta.includes(time));
      });
      if (source) rememberActive(lastZoomCluster, source.dataset.eventId);
    }

    const eventEl = event.target.closest?.('.callyOverlapCluster .event[data-event-id]');
    if (eventEl && !event.target.closest?.('.callyOverlapSpread,.callyOverlapDeep')) {
      rememberActive(eventEl.closest('.callyOverlapCluster'), eventEl.dataset.eventId);
    }

    if (event.target.closest?.('.callyOverlapSpread,[data-overlap-explorer-back],[data-overlap-explorer-close],.callyOverlapZoomCard') || !event.target.closest?.('.callyOverlapCluster.expanded')) {
      setTimeout(applyAllOverlapPriorities, 0);
    }

    if (!event.target.closest?.('#callyEventProjectionPanel,.callyEventProjectionAction')) closeProjectionPanel();
  });

  function boot() {
    const observer = new MutationObserver(enhance);
    observer.observe(document.body, {childList:true, subtree:true});
    window.addEventListener('cally-one-core-state-ready', () => { cachedState = null; enhance(); scheduleProjection(); });
    window.addEventListener('cally-one-ui-refresh', () => { cachedState = null; scheduleProjection(); });
    window.addEventListener('cally-demo-space-changed', () => { cachedState = null; activeOverlapEvent.clear(); scheduleProjection(); });
    enhance();
    scheduleProjection();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
