/* Cally.One compact quick-add — ordinary state editing only, never QCDS inference. */
(() => {
  if (window.__callyQuickAddUI) return;
  window.__callyQuickAddUI = true;

  const qs = (selector, root=document) => root.querySelector(selector);
  const qsa = (selector, root=document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pad = value => String(value).padStart(2, '0');

  function localIso(date) {
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function roundedStart() {
    const date = new Date();
    date.setSeconds(0, 0);
    date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15);
    return date;
  }

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

  function popover() {
    let box = qs('#callyQuickAdd');
    if (box) return box;
    box = document.createElement('div');
    box.id = 'callyQuickAdd';
    box.className = 'callyQuickAdd';
    box.hidden = true;
    document.body.appendChild(box);
    return box;
  }

  function closeQuickAdd() {
    const box = qs('#callyQuickAdd');
    if (!box || box.hidden) return;
    box.hidden = true;
    box.innerHTML = '';
    document.body.classList.remove('callyQuickAddOpen');
    qsa('[data-cally-quick-trigger]').forEach(button => button.setAttribute('aria-expanded', 'false'));
  }

  function placeQuickAdd(trigger) {
    const box = popover();
    const rect = trigger.getBoundingClientRect();
    const gap = 8;
    const edge = 8;
    const width = Math.min(350, window.innerWidth - edge * 2);
    let left = rect.right - width;
    left = Math.max(edge, Math.min(left, window.innerWidth - width - edge));
    box.style.width = `${width}px`;
    box.style.left = `${left}px`;
    box.style.right = 'auto';
    box.style.top = `${Math.min(window.innerHeight - 80, rect.bottom + gap)}px`;
  }

  function openShell(trigger, kind, title, eyebrow) {
    const box = popover();
    const menu = qs('#callyMobileMenu');
    if (menu) {
      menu.hidden = true;
      qs('#callyMenuButton')?.setAttribute('aria-expanded', 'false');
    }
    qsa('[data-cally-quick-trigger]').forEach(button => button.setAttribute('aria-expanded', String(button === trigger)));
    box.dataset.kind = kind;
    box.innerHTML = `
      <div class="callyQuickHead">
        <div><div class="callyQuickEyebrow">${esc(eyebrow)}</div><div class="callyQuickTitle">${esc(title)}</div></div>
        <button type="button" class="callyQuickClose" aria-label="Stäng">×</button>
      </div>
      <div class="callyQuickBody"></div>`;
    box.hidden = false;
    document.body.classList.add('callyQuickAddOpen');
    placeQuickAdd(trigger);
    qs('.callyQuickClose', box)?.addEventListener('click', closeQuickAdd, {once:true});
    return qs('.callyQuickBody', box);
  }

  async function openEventQuickAdd(trigger) {
    const state = await currentState();
    const people = Array.isArray(state.people) ? state.people.filter(person => !person.archived && !person.dimensions?.archived) : [];
    const start = roundedStart();
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const body = openShell(trigger, 'event', 'Ny händelse', 'ADD EVENT');
    if (!body) return;
    body.innerHTML = `
      <form class="callyQuickForm" id="callyQuickEventForm">
        <label class="callyQuickField callyQuickFieldFull"><span>Titel</span><input id="callyQuickEventTitle" autocomplete="off" placeholder="T.ex. fotboll, middag, möte"></label>
        <div class="callyQuickTwo">
          <label class="callyQuickField"><span>Start</span><input id="callyQuickEventStart" type="datetime-local" value="${localIso(start)}"></label>
          <label class="callyQuickField"><span>Slut</span><input id="callyQuickEventEnd" type="datetime-local" value="${localIso(end)}"></label>
        </div>
        <label class="callyQuickField callyQuickFieldFull"><span>Plats</span><input id="callyQuickEventLocation" autocomplete="off" placeholder="Valfritt"></label>
        ${people.length ? `<div class="callyQuickField callyQuickFieldFull"><span>Personer</span><div class="callyQuickPeople">${people.map(person => `<label><input type="checkbox" value="${esc(person.person_id)}"><span>${esc(person.name)}</span></label>`).join('')}</div></div>` : ''}
        <div class="callyQuickActions"><button type="button" class="callyQuickCancel">Avbryt</button><button type="submit" class="callyQuickSave">Lägg till</button></div>
      </form>`;
    qs('.callyQuickCancel', body)?.addEventListener('click', closeQuickAdd, {once:true});
    qs('#callyQuickEventForm', body)?.addEventListener('submit', async event => {
      event.preventDefault();
      const title = qs('#callyQuickEventTitle', body)?.value.trim() || 'Ny händelse';
      const payload = {
        title,
        start: qs('#callyQuickEventStart', body)?.value || localIso(start),
        end: qs('#callyQuickEventEnd', body)?.value || localIso(end),
        location: qs('#callyQuickEventLocation', body)?.value.trim() || '',
        people: qsa('.callyQuickPeople input:checked', body).map(input => input.value),
        dimensions: {}, constraints: {}, locked: false,
      };
      const save = qs('.callyQuickSave', body);
      try {
        if (save) save.disabled = true;
        const response = await fetch('/api/event', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
        closeQuickAdd();
        await window.load?.();
        window.toast?.('Händelse tillagd');
      } catch (error) {
        window.toast?.(error.message || String(error));
        if (save) save.disabled = false;
      }
    });
    requestAnimationFrame(() => qs('#callyQuickEventTitle', body)?.focus());
  }

  async function openPersonQuickAdd(trigger) {
    const state = await currentState();
    const organizations = Array.isArray(state.entities) ? state.entities.filter(entity => entity.kind === 'organization') : [];
    const body = openShell(trigger, 'person', 'Ny person', 'ADD PERSON');
    if (!body) return;
    body.innerHTML = `
      <form class="callyQuickForm" id="callyQuickPersonForm">
        <label class="callyQuickField callyQuickFieldFull"><span>Namn</span><input id="callyQuickPersonName" autocomplete="off" placeholder="Namn"></label>
        <label class="callyQuickField callyQuickFieldFull"><span>Organisation</span><select id="callyQuickPersonOrg"><option value="">Ingen / välj senare</option>${organizations.map(org => `<option value="${esc(org.entity_id)}">${esc(org.label)}</option>`).join('')}</select></label>
        <label class="callyQuickField callyQuickFieldFull"><span>Roll</span><input id="callyQuickPersonRole" autocomplete="off" placeholder="Valfritt"></label>
        <div class="callyQuickActions"><button type="button" class="callyQuickCancel">Avbryt</button><button type="submit" class="callyQuickSave">Lägg till</button></div>
      </form>`;
    qs('.callyQuickCancel', body)?.addEventListener('click', closeQuickAdd, {once:true});
    qs('#callyQuickPersonForm', body)?.addEventListener('submit', async event => {
      event.preventDefault();
      const name = qs('#callyQuickPersonName', body)?.value.trim();
      if (!name) return qs('#callyQuickPersonName', body)?.focus();
      const payload = {
        name,
        organization_id: qs('#callyQuickPersonOrg', body)?.value || '',
        role: qs('#callyQuickPersonRole', body)?.value.trim() || '',
        dimensions: {},
      };
      const save = qs('.callyQuickSave', body);
      try {
        if (save) save.disabled = true;
        const response = await fetch('/api/person', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
        closeQuickAdd();
        await window.load?.();
        window.toast?.('Person tillagd');
      } catch (error) {
        window.toast?.(error.message || String(error));
        if (save) save.disabled = false;
      }
    });
    requestAnimationFrame(() => qs('#callyQuickPersonName', body)?.focus());
  }

  function wireQuickAdd() {
    const person = qs('#personBtn');
    const event = qs('#eventBtn');
    if (person) {
      person.dataset.callyQuickTrigger = 'person';
      person.setAttribute('aria-haspopup', 'dialog');
      person.setAttribute('aria-expanded', 'false');
      person.title = 'Add person';
      const text = qs('.actionText', person);
      if (text) text.textContent = 'Person';
      person.onclick = click => { click.preventDefault(); click.stopPropagation(); openPersonQuickAdd(person); };
    }
    if (event) {
      event.dataset.callyQuickTrigger = 'event';
      event.setAttribute('aria-haspopup', 'dialog');
      event.setAttribute('aria-expanded', 'false');
      event.title = 'Add event';
      const text = qs('.actionText', event);
      if (text) text.textContent = 'Event';
      event.onclick = click => { click.preventDefault(); click.stopPropagation(); openEventQuickAdd(event); };
    }
  }

  document.addEventListener('click', event => {
    const box = qs('#callyQuickAdd');
    if (!box || box.hidden) return;
    if (event.target.closest?.('#callyQuickAdd') || event.target.closest?.('[data-cally-quick-trigger]')) return;
    closeQuickAdd();
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeQuickAdd(); });
  window.addEventListener('resize', () => {
    const box = qs('#callyQuickAdd');
    if (!box || box.hidden) return;
    const trigger = qs(`[data-cally-quick-trigger="${box.dataset.kind}"]`);
    if (trigger) placeQuickAdd(trigger);
  }, {passive:true});
  window.addEventListener('cally-one-ui-refresh', wireQuickAdd);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireQuickAdd, {once:true});
  else wireQuickAdd();
})();
