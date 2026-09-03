/* Cally.One Person module — compact expandable projection + compact person add + Level 2 view rail, no inference. */
(() => {
  if (window.__callyPersonModulePolish) return;
  window.__callyPersonModulePolish = true;

  const qs = (s, root=document) => root.querySelector(s);
  const qsa = (s, root=document) => [...root.querySelectorAll(s)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  async function currentState() {
    try {
      const response = await fetch('/api/state');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (_) {
      try {
        const key = typeof window.__callySpaceStorageKey === 'function' ? window.__callySpaceStorageKey() : 'cally.one.state.v1';
        return JSON.parse(localStorage.getItem(key) || '{}');
      } catch (_) { return {}; }
    }
  }

  async function postJson(path, payload) {
    const response = await fetch(path, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
    return body;
  }

  function personQuickBox() {
    let box = qs('#callyQuickAdd');
    if (box) return box;
    box = document.createElement('div');
    box.id = 'callyQuickAdd';
    box.className = 'callyQuickAdd';
    box.hidden = true;
    document.body.appendChild(box);
    return box;
  }

  function closeCompactPersonAdd() {
    const box = qs('#callyQuickAdd');
    if (!box) return;
    box.hidden = true;
    box.innerHTML = '';
    qs('#personBtn')?.setAttribute('aria-expanded', 'false');
  }

  function placeCompactPersonAdd(trigger) {
    const box = personQuickBox();
    const rect = trigger.getBoundingClientRect();
    const edge = 8;
    const width = Math.min(360, window.innerWidth - edge * 2);
    let left = rect.right - width;
    left = Math.max(edge, Math.min(left, window.innerWidth - width - edge));
    box.style.width = `${width}px`;
    box.style.left = `${left}px`;
    box.style.right = 'auto';
    box.style.top = `${Math.min(window.innerHeight - 80, rect.bottom + 8)}px`;
  }

  function addCompactDimensionRow(container, key='', value='') {
    const row = document.createElement('div');
    row.className = 'callyPersonQuickDimRow';
    row.innerHTML = `<input class="callyPersonQuickDimKey" placeholder="Dimension" value="${esc(key)}"><input class="callyPersonQuickDimValue" placeholder="Tillstånd" value="${esc(value)}"><button type="button" class="callyPersonQuickDimRemove" aria-label="Ta bort">×</button>`;
    qs('.callyPersonQuickDimRemove', row)?.addEventListener('click', () => row.remove());
    container.appendChild(row);
  }

  async function openCompactPersonAdd(trigger) {
    const overlay = qs('#callyStateOverlay');
    if (overlay) overlay.classList.remove('open');
    const menu = qs('#callyMobileMenu');
    if (menu) menu.hidden = true;
    qs('#callyMenuButton')?.setAttribute('aria-expanded', 'false');

    const box = personQuickBox();
    box.dataset.kind = 'person';
    box.innerHTML = `<div class="callyQuickHead"><div><div class="callyQuickEyebrow">PERSON</div><div class="callyQuickTitle">Ny person</div></div><button type="button" class="callyQuickClose" aria-label="Stäng">×</button></div><div class="callyQuickBody"><div class="callyPersonQuickLoading">Laddar…</div></div>`;
    box.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    placeCompactPersonAdd(trigger);
    qs('.callyQuickClose', box)?.addEventListener('click', closeCompactPersonAdd, {once:true});

    const state = await currentState();
    if (box.hidden || box.dataset.kind !== 'person') return;
    const organizations = Array.isArray(state.entities) ? state.entities.filter(entity => entity.kind === 'organization') : [];
    const body = qs('.callyQuickBody', box);
    if (!body) return;

    body.innerHTML = `<form class="callyQuickForm callyPersonQuickForm" id="callyCompactPersonForm">
      <label class="callyQuickField"><span>Namn</span><input id="callyCompactPersonName" autocomplete="off" placeholder="Namn"></label>
      <label class="callyQuickField"><span>Organisation</span><input id="callyCompactPersonOrg" autocomplete="off" list="callyCompactOrganizations" placeholder="Befintlig eller ny organisation"><datalist id="callyCompactOrganizations">${organizations.map(org => `<option value="${esc(org.label)}"></option>`).join('')}</datalist></label>
      <div class="callyQuickTwo"><label class="callyQuickField"><span>Roll</span><input id="callyCompactPersonRole" autocomplete="off" placeholder="Valfritt"></label><label class="callyQuickField"><span>Team / grupp</span><input id="callyCompactPersonTeam" autocomplete="off" placeholder="Valfritt"></label></div>
      <details class="callyPersonQuickDetails"><summary>Fler dimensioner</summary><div class="callyPersonQuickDims" id="callyPersonQuickDims"></div><button type="button" class="callyPersonQuickAddDim" id="callyPersonQuickAddDim">+ Dimension</button></details>
      <div class="callyQuickActions"><button type="button" class="callyQuickCancel">Avbryt</button><button type="submit" class="callyQuickSave">Lägg till</button></div>
    </form>`;

    qs('.callyQuickCancel', body)?.addEventListener('click', closeCompactPersonAdd, {once:true});
    qs('#callyPersonQuickAddDim', body)?.addEventListener('click', () => addCompactDimensionRow(qs('#callyPersonQuickDims', body)));
    qs('#callyCompactPersonForm', body)?.addEventListener('submit', async event => {
      event.preventDefault();
      const name = qs('#callyCompactPersonName', body)?.value.trim();
      if (!name) return qs('#callyCompactPersonName', body)?.focus();
      const save = qs('.callyQuickSave', body);
      try {
        if (save) save.disabled = true;
        const orgLabel = qs('#callyCompactPersonOrg', body)?.value.trim() || '';
        let org = organizations.find(item => item.label.toLowerCase() === orgLabel.toLowerCase());
        if (orgLabel && !org) {
          const created = await postJson('/api/entity', {kind:'organization', label:orgLabel, dimensions:{}});
          org = created.entity;
        }
        const dimensions = {};
        qsa('.callyPersonQuickDimRow', body).forEach(row => {
          const key = qs('.callyPersonQuickDimKey', row)?.value.trim();
          const value = qs('.callyPersonQuickDimValue', row)?.value.trim();
          if (key && value) dimensions[key] = value;
        });
        await postJson('/api/person', {
          name,
          organization_id:org?.entity_id || '',
          role:qs('#callyCompactPersonRole', body)?.value.trim() || '',
          team:qs('#callyCompactPersonTeam', body)?.value.trim() || '',
          dimensions,
        });
        closeCompactPersonAdd();
        await window.load?.();
        window.toast?.('Person tillagd');
      } catch (error) {
        window.toast?.(error.message || String(error));
        if (save) save.disabled = false;
      }
    });
    requestAnimationFrame(() => qs('#callyCompactPersonName', body)?.focus());
  }

  function decoratePersonModule() {
    const lanes = qs('#stage .personLanes');
    if (!lanes) return;

    if (!qs('.callyPersonModuleHead', lanes)) {
      const head = document.createElement('div');
      head.className = 'callyPersonModuleHead';
      head.innerHTML = '<div><div class="callyPersonModuleEyebrow">PERSON SPACE</div><h2>Personer</h2><p>Välj en person för att visa händelser i den aktuella kalenderprojektionen.</p></div>';
      lanes.prepend(head);
    }

    qsa('.lane[data-drop-person]', lanes).forEach((lane, index) => {
      if (lane.dataset.callyPersonModule === '1') return;
      lane.dataset.callyPersonModule = '1';
      lane.dataset.expanded = '0';

      const nameBox = qs('.laneName', lane);
      const events = qs('.laneEvents', lane);
      if (!nameBox || !events) return;

      const name = nameBox.textContent.trim() || 'Person';
      const eventCount = qsa('.laneCard', events).length;
      const initial = name.slice(0, 1).toUpperCase();
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'callyPersonToggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.innerHTML = `<span class="callyPersonInitial" aria-hidden="true">${initial}</span><span class="callyPersonIdentity"><strong></strong><small></small></span><span class="callyPersonCount"></span><span class="callyPersonChevron" aria-hidden="true">⌄</span>`;
      qs('strong', toggle).textContent = name;
      qs('small', toggle).textContent = eventCount ? 'Aktuell kalender' : 'Inga händelser i aktuell vy';
      qs('.callyPersonCount', toggle).textContent = eventCount ? `${eventCount} ${eventCount === 1 ? 'händelse' : 'händelser'}` : 'Tomt';

      nameBox.replaceWith(toggle);
      events.id = `cally-person-events-${index}`;
      events.hidden = true;
      toggle.setAttribute('aria-controls', events.id);
      toggle.addEventListener('click', () => {
        const open = lane.dataset.expanded !== '1';
        lane.dataset.expanded = open ? '1' : '0';
        toggle.setAttribute('aria-expanded', String(open));
        events.hidden = !open;
      });
    });
  }

  function updateLevel2RailState(shell, bar) {
    const max = Math.max(0, bar.scrollWidth - bar.clientWidth);
    const left = qs('[data-cally-rail="left"]', shell);
    const right = qs('[data-cally-rail="right"]', shell);
    if (left) left.disabled = bar.scrollLeft <= 2;
    if (right) right.disabled = bar.scrollLeft >= max - 2;
    shell.classList.toggle('is-scrollable', max > 4);
  }

  function centerActiveLevel2View(bar) {
    const active = qs('.view.active', bar);
    qsa('.view', bar).forEach(button => button.setAttribute('aria-current', button === active ? 'page' : 'false'));
    if (!active) return;
    const key = active.dataset.savedView ? `saved:${active.dataset.savedView}` : `view:${active.dataset.view || active.textContent.trim()}`;
    if (bar.dataset.callyActiveRailKey === key) return;
    bar.dataset.callyActiveRailKey = key;
    const max = Math.max(0, bar.scrollWidth - bar.clientWidth);
    const target = Math.max(0, Math.min(max, active.offsetLeft - (bar.clientWidth - active.offsetWidth) / 2));
    bar.scrollTo({left:target, behavior:'smooth'});
  }

  function ensureLevel2ViewRail() {
    const bar = qs('#viewbar');
    if (!bar) return;
    let shell = bar.parentElement?.classList?.contains('callyLevel2Rail') ? bar.parentElement : null;
    if (!shell) {
      shell = document.createElement('div');
      shell.className = 'callyLevel2Rail';
      shell.setAttribute('aria-label', 'Kalendervyer');
      const left = document.createElement('button');
      left.type = 'button';
      left.className = 'callyRailArrow callyRailArrowLeft';
      left.dataset.callyRail = 'left';
      left.setAttribute('aria-label', 'Föregående kalendervyer');
      left.textContent = '‹';
      const right = document.createElement('button');
      right.type = 'button';
      right.className = 'callyRailArrow callyRailArrowRight';
      right.dataset.callyRail = 'right';
      right.setAttribute('aria-label', 'Nästa kalendervyer');
      right.textContent = '›';
      bar.before(shell);
      shell.append(left, bar, right);
      const move = direction => bar.scrollBy({left:direction * Math.max(180, bar.clientWidth * 0.72), behavior:'smooth'});
      left.addEventListener('click', () => move(-1));
      right.addEventListener('click', () => move(1));
      bar.addEventListener('scroll', () => updateLevel2RailState(shell, bar), {passive:true});
    }
    requestAnimationFrame(() => {
      centerActiveLevel2View(bar);
      updateLevel2RailState(shell, bar);
    });
  }

  document.addEventListener('click', event => {
    const trigger = event.target.closest?.('#personBtn,[data-add-state="person"]');
    if (!trigger) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const anchor = qs('#personBtn') || trigger;
    openCompactPersonAdd(anchor);
  }, true);

  window.addEventListener('resize', () => {
    ensureLevel2ViewRail();
    const box = qs('#callyQuickAdd');
    if (!box || box.hidden || box.dataset.kind !== 'person') return;
    const trigger = qs('#personBtn');
    if (trigger) placeCompactPersonAdd(trigger);
  }, {passive:true});
  window.addEventListener('cally-one-ui-refresh', decoratePersonModule);
  window.addEventListener('cally-one-ui-refresh', ensureLevel2ViewRail);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', decoratePersonModule, {once:true});
    document.addEventListener('DOMContentLoaded', ensureLevel2ViewRail, {once:true});
  } else {
    decoratePersonModule();
    ensureLevel2ViewRail();
  }
})();
