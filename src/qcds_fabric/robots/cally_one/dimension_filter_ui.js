/* Cally.One scalable dimension filters for linked states.
   UI projection only; all source data remains Calendar Space state. */
(() => {
  const qs = (s, root=document) => root.querySelector(s);
  const qsa = (s, root=document) => [...root.querySelectorAll(s)];
  let cachedState = null;
  let reading = null;

  async function state() {
    if (cachedState) return cachedState;
    if (reading) return reading;
    reading = fetch('/api/state')
      .then(r => r.json())
      .then(body => {
        cachedState = body && Array.isArray(body.entities) ? body : {entities:[]};
        return cachedState;
      })
      .catch(() => ({entities:[]}))
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

  function boot() {
    const observer = new MutationObserver(enhance);
    observer.observe(document.body, {childList:true, subtree:true});
    window.addEventListener('cally-one-core-state-ready', () => { cachedState = null; enhance(); });
    enhance();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
