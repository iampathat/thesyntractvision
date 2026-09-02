/* Cally.One product UI enhancements — Cally.One Tribute License 1.0 */
(() => {
  const MOVE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M12 2v20M2 12h20M12 2l-3 3m3-3 3 3m-3 17-3-3m3 3 3-3M2 12l3-3m-3 3 3 3m17-3-3-3m3 3-3 3"/></svg>';
  const EDIT_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="m4 20 4.2-1 10.6-10.6-3.2-3.2L5 15.8 4 20Zm10.4-13.6 3.2 3.2M14.8 4.8l1.4-1.4a1.6 1.6 0 0 1 2.3 0l2.1 2.1a1.6 1.6 0 0 1 0 2.3l-1.4 1.4"/></svg>';
  let resizeState = null;
  let stateCache = {events:[]};
  let refreshPromise = null;

  function setHeaderHeight() {
    const top = document.querySelector('.top');
    if (!top) return;
    document.documentElement.style.setProperty('--cally-header-h', `${Math.ceil(top.getBoundingClientRect().height)}px`);
  }

  async function refreshState() {
    if (refreshPromise) return refreshPromise;
    refreshPromise = fetch('/api/state')
      .then(r => r.json())
      .then(data => { if (data && Array.isArray(data.events)) stateCache = data; return stateCache; })
      .catch(() => stateCache)
      .finally(() => { refreshPromise = null; });
    return refreshPromise;
  }

  function eventForId(id) {
    return (stateCache.events || []).find(item => item.event_id === id) || null;
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

  function decorateEventRows(root = document) {
    root.querySelectorAll?.('.eventRow').forEach(row => {
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

  function decorate(root = document) {
    root.querySelectorAll?.('[data-event-id]').forEach(decorateEvent);
    decorateEventRows(root);
    setHeaderHeight();
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
    resizeState = {handle, el, item, startY: ev.clientY, originalEnd: end, start};
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
      const r = await fetch('/api/event', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...d.item, end:localIso(end)})});
      const body = await r.json();
      if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
      await refreshState();
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

  function onPointerDown(ev) {
    const resize = ev.target.closest?.('[data-resize-event]');
    if (resize) return startResize(ev, resize);

    const edit = ev.target.closest?.('[data-edit-event]');
    if (edit) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      window.openEvent?.(edit.dataset.editEvent);
      return;
    }

    const eventEl = ev.target.closest?.('[data-event-id]');
    if (!eventEl) return;
    if (ev.target.closest?.('[data-pin-event]')) return;
    if (ev.target.closest?.('.eventMove')) return; // canonical dragStart handles allowed movement

    // Event cards are inert for movement unless the explicit four-arrow handle is used.
    ev.stopPropagation();
  }

  function boot() {
    const stage = document.querySelector('#stage');
    if (!stage) return setTimeout(boot, 40);
    stage.addEventListener('pointerdown', onPointerDown, true);
    const observer = new MutationObserver(() => {
      decorate(stage);
      refreshState();
    });
    observer.observe(stage, {childList:true, subtree:true});
    refreshState().then(() => decorate(stage));
    setHeaderHeight();
    window.addEventListener('resize', setHeaderHeight, {passive:true});
    window.addEventListener('orientationchange', () => setTimeout(setHeaderHeight, 80), {passive:true});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
