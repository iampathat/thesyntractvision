/* Cally.One explicit interaction controller — no global MutationObserver. */
(() => {
  if (window.__callyInteractionController) return;
  window.__callyInteractionController = true;

  const qs = (s, root=document) => root.querySelector(s);
  const qsa = (s, root=document) => [...root.querySelectorAll(s)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const localKey = 'cally.one.state.v1';

  function readLocalState() {
    try {
      const raw = localStorage.getItem(localKey);
      const state = raw ? JSON.parse(raw) : {};
      if (!Array.isArray(state.people)) state.people = [];
      if (!Array.isArray(state.events)) state.events = [];
      if (!Array.isArray(state.entities)) state.entities = [];
      if (!Array.isArray(state.relations)) state.relations = [];
      return state;
    } catch (_) { return {people:[], events:[], entities:[], relations:[]}; }
  }

  function writeLocalState(state) {
    try { localStorage.setItem(localKey, JSON.stringify(state)); }
    catch (_) { /* browser storage is best effort */ }
  }

  function clickByText(root, text) {
    const target = qsa('button', root || document).find(b => b.textContent.trim().toLowerCase() === text.toLowerCase());
    target?.click();
  }

  function openDirectory(kind='all') {
    qs('.mark')?.click();
    setTimeout(() => {
      if (kind !== 'all') qs(`[data-kind="${kind}"]`)?.click();
    }, 0);
  }

  function ensureNavigation() {
    if (qs('#callyIntegratedNav')) return;
    const top = qs('.top');
    if (!top) return;
    const nav = document.createElement('div');
    nav.id = 'callyIntegratedNav';
    nav.className = 'callyIntegratedNav';
    nav.innerHTML = `
      <div class="callyWideNav" aria-label="Cally.One navigation">
        <button data-nav="space">Calendar Space</button><button data-nav="people">Personer</button>
        <button data-nav="perspective">Perspektiv</button><button data-nav="dimensions">Dimensioner</button>
        <button data-nav="organizations">Organisationer</button><button data-nav="resources">Resurser</button>
        <button data-nav="things">Saker/krav</button><button data-nav="add-person">+ Person</button>
      </div>
      <button class="callyMenuButton" id="callyMenuButton" type="button" aria-expanded="false" aria-controls="callyMobileMenu" aria-label="Öppna meny">☰</button>
      <div class="callyMobileMenu" id="callyMobileMenu" hidden>
        <button data-nav="space">Calendar Space</button><button data-nav="people">Personer</button>
        <button data-nav="perspective">Perspektiv</button><button data-nav="dimensions">Dimensioner</button>
        <button data-nav="organizations">Organisationer</button><button data-nav="resources">Resurser</button>
        <button data-nav="things">Saker/krav</button><button data-nav="add-person">+ Person</button>
      </div>`;
    top.appendChild(nav);
  }

  function handleNav(action) {
    if (action === 'space') return openDirectory('all');
    if (action === 'people') return openDirectory('person');
    if (action === 'organizations') return openDirectory('organization');
    if (action === 'resources') return openDirectory('resource');
    if (action === 'things') return openDirectory('thing');
    if (action === 'add-person') return qs('#personBtn')?.click();
    if (action === 'perspective') return clickByText(document, 'Perspektiv');
    if (action === 'dimensions') return clickByText(document, 'Dimensioner');
  }

  function closeMenu() {
    const menu = qs('#callyMobileMenu');
    const button = qs('#callyMenuButton');
    if (!menu || !button) return;
    menu.hidden = true;
    button.setAttribute('aria-expanded','false');
  }

  function sectionFor(field, title) {
    if (!field || field.closest('.callyEventSection')) return null;
    const section = document.createElement('section');
    section.className = 'callyEventSection';
    section.innerHTML = `<h3>${esc(title)}</h3>`;
    field.parentNode.insertBefore(section, field);
    section.appendChild(field);
    return section;
  }

  function titleAutosaveInput(input, eventId) {
    if (!input || !eventId || input.dataset.callyTitleAutosave === '1') return;
    input.dataset.callyTitleAutosave = '1';
    const save = () => {
      const state = readLocalState();
      const event = state.events.find(item => item.event_id === eventId);
      if (!event) return;
      const next = input.value.trim();
      if (!next || next === event.title) return;
      event.title = next;
      writeLocalState(state);
      if (window.state && Array.isArray(window.state.events)) {
        const live = window.state.events.find(item => item.event_id === eventId);
        if (live) live.title = next;
      }
      window.render?.();
      window.toast?.('Rubriken sparad');
    };
    input.addEventListener('blur', save);
    input.addEventListener('keydown', ev => {
      if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
    });
  }

  function prepareEventEditor(eventId=null) {
    const modal = qs('#modalBack');
    if (!modal || modal.style.display === 'none') return;
    modal.dataset.callyBaseEditor = '1';
    const body = modal.querySelector('.modal, .dialog, .modalCard, .form, .card') || modal.firstElementChild;
    if (!body) return;

    let head = qs('.callyEventHead', body);
    if (!head) {
      head = document.createElement('div');
      head.className = 'callyEventHead';
      head.innerHTML = '<h2>Händelse</h2><button type="button" class="callyEventClose" aria-label="Stäng">×</button>';
      body.insertBefore(head, body.firstChild);
    }

    const title = qs('#fTitle', modal);
    if (title) {
      title.classList.add('callyEventTitleInput');
      titleAutosaveInput(title, eventId);
    }

    const start = qs('#fStart', modal)?.closest('.field') || qs('#fStart', modal)?.parentElement;
    const end = qs('#fEnd', modal)?.closest('.field') || qs('#fEnd', modal)?.parentElement;
    const location = qs('#fLocation', modal)?.closest('.field') || qs('#fLocation', modal)?.parentElement;
    const people = qs('#fPeople', modal)?.closest('.field') || qs('#fPeople', modal)?.parentElement;
    const linked = qs('#callyLinkedStates', modal);
    const dimensions = qs('#fDimensions', modal)?.closest('.field') || qs('#fDimensions', modal)?.parentElement;

    const when = start && !start.closest('.callyEventSection') ? sectionFor(start, 'När') : null;
    if (when && end && !end.closest('.callyEventSection')) when.appendChild(end);
    sectionFor(location, 'Var');
    sectionFor(people, 'Personer');
    sectionFor(linked, 'Kopplade tillstånd');
    sectionFor(dimensions, 'Mer');

    const save = qs('#saveEvent', modal);
    const infer = qs('#inferBtn', modal);
    if (infer) infer.textContent = 'Kolla tider';
    if (save) save.textContent = 'Spara';
    if (save || infer) {
      let actions = qs('.callyEventActions', body);
      if (!actions) {
        actions = document.createElement('div');
        actions.className = 'callyEventActions';
        body.appendChild(actions);
      }
      if (infer && infer.parentElement !== actions) actions.appendChild(infer);
      if (save && save.parentElement !== actions) actions.appendChild(save);
    }
  }

  function wrapOpenEvent() {
    if (typeof window.openEvent !== 'function' || window.openEvent.__callyIntegratedWrapped) return;
    const original = window.openEvent;
    const wrapped = function(id=null) {
      const result = original.apply(this, arguments);
      queueMicrotask(() => prepareEventEditor(id));
      return result;
    };
    wrapped.__callyIntegratedWrapped = true;
    window.openEvent = wrapped;
  }

  async function openPersonEditor(entityId) {
    const state = await fetch('/api/state').then(r => r.json()).catch(() => readLocalState());
    const entity = (state.entities || []).find(item => item.entity_id === entityId && item.kind === 'person');
    if (!entity) return;
    const person = (state.people || []).find(item => item.person_id === entityId || item.entity_id === entityId || item.name === entity.label) || {};
    const overlay = qs('#callyStateOverlay');
    const body = qs('#stateSheetBody', overlay || document);
    if (!overlay || !body) return;
    body.innerHTML = `
      <div class="sheetHead callyPersonHead"><div><div class="eyebrow">PERSON STATE</div><h2>Person</h2></div><button class="sheetClose" data-close-state>×</button></div>
      <div class="stateForm callyPersonEditor" data-person-entity="${esc(entityId)}">
        <label>Namn<input id="callyEditPersonName" class="stateInput" value="${esc(person.name || entity.label)}"></label>
        <label>Organisation<input id="callyEditPersonOrg" class="stateInput" value="${esc(person.organization || person.organization_id || '')}"></label>
        <div class="stateFormTwo"><label>Roll<input id="callyEditPersonRole" class="stateInput" value="${esc(person.role || entity.dimensions?.role || '')}"></label><label>Team / grupp<input id="callyEditPersonTeam" class="stateInput" value="${esc(person.team || entity.dimensions?.team || '')}"></label></div>
        <div class="stateMeta">Historik och arkiveringsstatus bevaras. Händelsedeltagande och transportstatus ändras inte här.</div>
        <button type="button" class="statePrimary" id="callySavePersonEdit">Spara person</button>
      </div>`;
    overlay.classList.add('open');
    qs('[data-close-state]', body)?.addEventListener('click', () => overlay.classList.remove('open'), {once:true});
    qs('#callySavePersonEdit', body)?.addEventListener('click', async () => {
      const payload = {
        person_id: entityId,
        entity_id: entityId,
        name: qs('#callyEditPersonName', body)?.value.trim() || entity.label,
        organization_id: qs('#callyEditPersonOrg', body)?.value.trim() || '',
        role: qs('#callyEditPersonRole', body)?.value.trim() || '',
        team: qs('#callyEditPersonTeam', body)?.value.trim() || '',
        dimensions: {...(entity.dimensions || {})}
      };
      try {
        const r = await fetch('/api/person', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
        const result = await r.json();
        if (!r.ok) throw new Error(result.error || `HTTP ${r.status}`);
        overlay.classList.remove('open');
        await window.load?.();
        window.toast?.('Person sparad');
      } catch (error) { window.toast?.(error.message || String(error)); }
    }, {once:true});
  }

  function wireBaseUI() {
    ensureNavigation();
    wrapOpenEvent();
    const eventButton = qs('#eventBtn');
    if (eventButton && eventButton.dataset.callyIntegrated !== '1') {
      eventButton.dataset.callyIntegrated = '1';
      eventButton.addEventListener('click', () => queueMicrotask(() => prepareEventEditor(null)));
    }
  }

  document.addEventListener('click', ev => {
    const menuButton = ev.target.closest?.('#callyMenuButton');
    if (menuButton) {
      const menu = qs('#callyMobileMenu');
      const open = menu.hidden;
      menu.hidden = !open;
      menuButton.setAttribute('aria-expanded', String(open));
      return;
    }
    const nav = ev.target.closest?.('[data-nav]');
    if (nav) { handleNav(nav.dataset.nav); closeMenu(); return; }
    const close = ev.target.closest?.('.callyEventClose');
    if (close) {
      const modal = qs('#modalBack');
      if (modal) modal.style.display = 'none';
      return;
    }
    const card = ev.target.closest?.('.stateCard[data-state-entity]');
    if (card) { ev.preventDefault(); openPersonEditor(card.dataset.stateEntity); }
  });

  window.addEventListener('cally-one-ui-refresh', wireBaseUI);
  window.addEventListener('resize', closeMenu, {passive:true});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireBaseUI, {once:true});
  else wireBaseUI();
})();
