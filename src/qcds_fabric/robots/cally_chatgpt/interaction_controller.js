/* Cally.One explicit interaction controller — no global MutationObserver. */
(() => {
  if (window.__callyInteractionController) return;
  window.__callyInteractionController = true;

  const qs = (s, root=document) => root.querySelector(s);
  const qsa = (s, root=document) => [...root.querySelectorAll(s)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const localKey = () => typeof window.__callySpaceStorageKey === 'function' ? window.__callySpaceStorageKey() : 'cally.one.state.v1';

  function readLocalState() {
    try {
      const raw = localStorage.getItem(localKey());
      const state = raw ? JSON.parse(raw) : {};
      if (!Array.isArray(state.people)) state.people = [];
      if (!Array.isArray(state.events)) state.events = [];
      if (!Array.isArray(state.entities)) state.entities = [];
      if (!Array.isArray(state.relations)) state.relations = [];
      return state;
    } catch (_) { return {people:[], events:[], entities:[], relations:[]}; }
  }

  function writeLocalState(state) {
    try { localStorage.setItem(localKey(), JSON.stringify(state)); }
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
      title.closest('.field')?.classList.add('callyEventTitleField');
      titleAutosaveInput(title, eventId);
    }

    const start = qs('#fStart', modal)?.closest('.field') || qs('#fStart', modal)?.parentElement;
    const end = qs('#fEnd', modal)?.closest('.field') || qs('#fEnd', modal)?.parentElement;
    const location = qs('#fLocation', modal)?.closest('.field') || qs('#fLocation', modal)?.parentElement;
    const language = qs('#fLanguage', modal)?.closest('.field') || qs('#fLanguage', modal)?.parentElement;
    const people = qs('#fPeople', modal)?.closest('.field') || qs('#fPeople', modal)?.parentElement;
    const linked = qs('#callyLinkedStates', modal);
    const dimensions = qs('#fDimensions', modal)?.closest('.field') || qs('#fDimensions', modal)?.parentElement;

    const when = start && !start.closest('.callyEventSection') ? sectionFor(start, 'När') : start?.closest('.callyEventSection');
    if (when) when.classList.add('callyWhenSection');
    if (when && end && !end.closest('.callyEventSection')) when.appendChild(end);
    sectionFor(location, 'Var');
    sectionFor(people, 'Personer');
    sectionFor(linked, 'Kopplade tillstånd');
    const more = language && !language.closest('.callyEventSection') ? sectionFor(language, 'Mer') : null;
    if (more && dimensions && !dimensions.closest('.callyEventSection')) more.appendChild(dimensions);
    else sectionFor(dimensions, 'Mer');

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

/* Cally.One temporary movement override.
   Free = each event's own pin state. Lock all / Unlock all override behavior only;
   individual pin changes remain available and become effective again on Free. */
(() => {
  if (window.__callyGlobalMoveOverride) return;
  window.__callyGlobalMoveOverride = true;

  const qs = (s, root=document) => root.querySelector(s);
  const qsa = (s, root=document) => [...root.querySelectorAll(s)];
  const pad = value => String(value).padStart(2, '0');
  const localIso = date => `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const modes = new Set(['free','lock_all','unlock_all']);
  let snapshot = {events:[]};
  let dragState = null;
  let resizeState = null;

  const activeSpace = () => {
    try { return window.__callyActiveSpace?.() || 'personal'; }
    catch (_) { return 'personal'; }
  };
  const modeKey = () => `cally.one.move-override.v1:${activeSpace()}`;
  const stateKey = () => {
    try { return window.__callySpaceStorageKey?.() || 'cally.one.state.v1'; }
    catch (_) { return 'cally.one.state.v1'; }
  };
  const readMode = () => {
    try {
      const value = sessionStorage.getItem(modeKey()) || 'free';
      return modes.has(value) ? value : 'free';
    } catch (_) { return 'free'; }
  };
  let mode = readMode();

  function readLocalEvent(id) {
    try {
      const state = JSON.parse(localStorage.getItem(stateKey()) || '{}');
      return (state.events || []).find(item => String(item.event_id) === String(id)) || null;
    } catch (_) { return null; }
  }

  function eventById(id) {
    return readLocalEvent(id) || (snapshot.events || []).find(item => String(item.event_id) === String(id)) || null;
  }

  async function refreshSnapshot() {
    try {
      const response = await fetch('/api/state');
      const body = await response.json();
      if (body && Array.isArray(body.events)) snapshot = body;
    } catch (_) {}
  }

  window.__callyGlobalMoveMode = () => mode;
  window.__callyEffectiveLocked = item => mode === 'lock_all' ? true : mode === 'unlock_all' ? false : !!item?.locked;
  const effectiveLocked = item => window.__callyEffectiveLocked(item);

  function ensureStyles() {
    if (qs('#callyGlobalMoveOverrideStyles')) return;
    const style = document.createElement('style');
    style.id = 'callyGlobalMoveOverrideStyles';
    style.textContent = `
      .callyMoveOverrideBar{display:flex;align-items:center;gap:4px;width:max-content;max-width:100%;margin:7px 0 0 auto;padding:3px;border:1px solid var(--line,#d8ddd4);border-radius:11px;background:rgba(255,253,248,.95);overflow-x:auto;scrollbar-width:none}
      .callyMoveOverrideBar::-webkit-scrollbar{display:none}
      .callyMoveOverrideLabel{padding:0 5px;color:var(--muted,#6c776f);font-size:7px;font-weight:850;letter-spacing:.1em;white-space:nowrap}
      .callyMoveOverrideBar button{min-height:30px;padding:5px 8px;border:1px solid transparent;border-radius:8px;background:transparent;color:var(--ink,#14261e);font-size:8px;line-height:1;font-weight:790;white-space:nowrap;cursor:pointer}
      .callyMoveOverrideBar button:hover{background:#f0f4ec}
      .callyMoveOverrideBar button[aria-pressed="true"]{background:var(--green,#087b58);border-color:var(--green,#087b58);color:#fff}
      html.callyLockAll #stage [data-event-id]{cursor:default!important;touch-action:pan-x pan-y!important}
      html.callyUnlockAll #stage [data-event-id]{cursor:grab!important}
      html.callyUnlockAll #stage [data-event-id]:active{cursor:grabbing!important}
      html.callyLockAll #stage .resizeHandle{opacity:.38!important;cursor:not-allowed!important}
      html.callyUnlockAll #stage .resizeHandle{opacity:1!important;cursor:ns-resize!important}
      @media(max-width:760px){.callyMoveOverrideBar{margin:5px auto 0 0;gap:2px;padding:3px}.callyMoveOverrideLabel{font-size:6.5px;padding:0 3px}.callyMoveOverrideBar button{min-height:28px;padding:5px 7px;font-size:7.5px}}
    `;
    document.head.appendChild(style);
  }

  function paintMode() {
    document.documentElement.classList.toggle('callyLockAll', mode === 'lock_all');
    document.documentElement.classList.toggle('callyUnlockAll', mode === 'unlock_all');
    qsa('#callyMoveOverrideBar [data-move-override]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.moveOverride === mode));
    });
  }

  function setMode(next) {
    mode = modes.has(next) ? next : 'free';
    try { sessionStorage.setItem(modeKey(), mode); } catch (_) {}
    void refreshSnapshot();
    paintMode();
    window.dispatchEvent(new CustomEvent('cally-global-move-mode-changed', {detail:{mode}}));
  }

  function ensureBar() {
    ensureStyles();
    const top = qs('.top');
    if (!top) return;
    let bar = qs('#callyMoveOverrideBar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'callyMoveOverrideBar';
      bar.className = 'callyMoveOverrideBar';
      bar.setAttribute('aria-label', 'Tillfälligt låsläge för kalendern');
      bar.innerHTML = `<span class="callyMoveOverrideLabel">FLYTTLÄGE</span><button type="button" data-move-override="free">Free</button><button type="button" data-move-override="lock_all">🔒 Lock all</button><button type="button" data-move-override="unlock_all">🔓 Unlock all</button>`;
      bar.addEventListener('click', event => {
        const button = event.target.closest?.('[data-move-override]');
        if (button) setMode(button.dataset.moveOverride);
      });
    }
    const rail = qs('.callyLevel2Rail') || qs('#viewbar');
    if (rail?.parentElement === top) rail.insertAdjacentElement('afterend', bar);
    else if (bar.parentElement !== top) top.appendChild(bar);
    paintMode();
  }

  function controlTarget(target) {
    return !!target.closest?.('button,input,select,textarea,a,[role="button"],.callyEventActionMenu');
  }

  async function post(path, payload) {
    const response = await fetch(path, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
    return body;
  }

  function beginDrag(event, element, item) {
    event.preventDefault();
    event.stopImmediatePropagation();
    dragState = {id:String(item.event_id), element};
    element.classList.add('dragging');
    element.setPointerCapture?.(event.pointerId);
    element.addEventListener('pointerup', finishDrag, {once:true});
    element.addEventListener('pointercancel', cancelDrag, {once:true});
  }

  async function finishDrag(event) {
    const current = dragState;
    if (!current) return;
    current.element.classList.remove('dragging');
    const item = eventById(current.id);
    const under = document.elementFromPoint(event.clientX, event.clientY);
    const dateCell = under?.closest?.('[data-drop-date]');
    const personLane = under?.closest?.('[data-drop-person]');
    dragState = null;
    if (!item) return;
    try {
      let start = new Date(item.start);
      let end = new Date(item.end);
      const duration = end - start;
      let people = [...(item.people || [])];
      if (dateCell) {
        const parts = dateCell.dataset.dropDate.split('-').map(Number);
        start.setFullYear(parts[0], parts[1]-1, parts[2]);
        if (dateCell.classList.contains('dayCol')) {
          const rect = dateCell.getBoundingClientRect();
          const minutes = Math.max(0, Math.min(16*60, Math.round(((event.clientY-rect.top)/59.5*60)/15)*15));
          start.setHours(6+Math.floor(minutes/60), minutes%60, 0, 0);
        }
        end = new Date(start.getTime()+duration);
      }
      if (personLane) people = [personLane.dataset.dropPerson];
      if (!dateCell && !personLane) {
        window.openEvent?.(current.id);
        return;
      }
      await post('/api/event/move', {event_id:current.id,start:localIso(start),end:localIso(end),people});
      await window.load?.();
      await refreshSnapshot();
      window.toast?.('Event moved in Calendar Space');
    } catch (error) {
      window.toast?.(error.message || String(error));
      await window.load?.();
    }
  }

  function cancelDrag() {
    dragState?.element?.classList.remove('dragging');
    dragState = null;
  }

  function resizeEndFor(event) {
    if (!resizeState) return null;
    const deltaMinutes = Math.round(((event.clientY-resizeState.startY)/59.5*60)/15)*15;
    const minimum = new Date(resizeState.start.getTime()+15*60000);
    const candidate = new Date(resizeState.originalEnd.getTime()+deltaMinutes*60000);
    return candidate < minimum ? minimum : candidate;
  }

  function beginResize(event, handle, element, item) {
    event.preventDefault();
    event.stopImmediatePropagation();
    resizeState = {handle,element,item,startY:event.clientY,start:new Date(item.start),originalEnd:new Date(item.end)};
    element.classList.add('resizing');
    handle.setPointerCapture?.(event.pointerId);
    handle.addEventListener('pointermove', moveResize);
    handle.addEventListener('pointerup', finishResize, {once:true});
    handle.addEventListener('pointercancel', cancelResize, {once:true});
  }

  function moveResize(event) {
    if (!resizeState) return;
    event.preventDefault();
    const end = resizeEndFor(event);
    const hours = (end-resizeState.start)/3600000;
    resizeState.element.style.height = `${Math.max(34,hours*59.5-3)}px`;
  }

  async function finishResize(event) {
    const current = resizeState;
    if (!current) return;
    const end = resizeEndFor(event);
    cleanupResize();
    try {
      await post('/api/event', {...current.item,end:localIso(end)});
      await window.load?.();
      await refreshSnapshot();
      window.toast?.('Event duration changed');
    } catch (error) {
      window.toast?.(error.message || String(error));
      await window.load?.();
    }
  }

  function cleanupResize() {
    if (!resizeState) return;
    resizeState.element.classList.remove('resizing');
    resizeState.handle.removeEventListener('pointermove', moveResize);
    resizeState = null;
  }

  function cancelResize() {
    cleanupResize();
    window.render?.();
  }

  document.addEventListener('pointerdown', event => {
    const handle = event.target.closest?.('[data-resize-event]');
    if (handle) {
      const element = handle.closest?.('[data-event-id]');
      const item = eventById(element?.dataset?.eventId);
      if (!element || !item) return;
      if (effectiveLocked(item)) {
        event.stopImmediatePropagation();
        return;
      }
      beginResize(event, handle, element, item);
      return;
    }

    const element = event.target.closest?.('#stage [data-event-id]');
    if (!element || controlTarget(event.target)) return;
    if (event.button !== undefined && event.button !== 0) return;
    const item = eventById(element.dataset.eventId);
    if (!item) return;
    if (effectiveLocked(item)) {
      event.stopImmediatePropagation();
      return;
    }
    beginDrag(event, element, item);
  }, true);

  function refreshSpaceMode() {
    mode = readMode();
    void refreshSnapshot();
    ensureBar();
    paintMode();
  }

  window.addEventListener('cally-one-ui-refresh', () => { ensureBar(); void refreshSnapshot(); });
  window.addEventListener('cally-demo-space-changed', refreshSpaceMode);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refreshSpaceMode, {once:true});
  else refreshSpaceMode();
})();