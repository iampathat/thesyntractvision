/* Cally.One product UI enhancements — Cally.One Tribute License 1.0 */
(() => {
  const MOVE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M12 2v20M2 12h20M12 2l-3 3m3-3 3 3m-3 17-3-3m3 3 3-3M2 12l3-3m-3 3 3 3m17-3-3-3m3 3-3 3"/></svg>';
  const EDIT_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="m4 20 4.2-1 10.6-10.6-3.2-3.2L5 15.8 4 20Zm10.4-13.6 3.2 3.2M14.8 4.8l1.4-1.4a1.6 1.6 0 0 1 2.3 0l2.1 2.1a1.6 1.6 0 0 1 0 2.3l-1.4 1.4"/></svg>';
  let resizeState = null;

  function setHeaderHeight() {
    const top = document.querySelector('.top');
    if (!top) return;
    document.documentElement.style.setProperty('--cally-header-h', `${Math.ceil(top.getBoundingClientRect().height)}px`);
  }

  function eventFor(el) {
    const id = el?.dataset?.eventId;
    return (window.state?.data?.events || []).find(item => item.event_id === id) || null;
  }

  function makeMove(item) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `eventMove${item?.locked ? ' locked' : ''}`;
    b.title = item?.locked ? 'Pinned — unpin before moving' : 'Drag to move';
    b.setAttribute('aria-label', item?.locked ? 'Event pinned' : 'Move event');
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

  function makeResize(id) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'resizeHandle';
    b.dataset.resizeEvent = id;
    b.title = 'Drag to change duration';
    b.setAttribute('aria-label', 'Resize event duration');
    return b;
  }

  function decorateEvent(el) {
    if (!el || el.dataset.callyEnhanced === '1') return;
    const item = eventFor(el);
    if (!item) return;
    el.dataset.callyEnhanced = '1';

    if (el.classList.contains('eventRow')) return;
    const move = makeMove(item);
    const edit = makeEdit(item.event_id);
    el.appendChild(move);
    el.appendChild(edit);
    if (el.classList.contains('event')) el.appendChild(makeResize(item.event_id));
  }

  function decorateEventRows(root = document) {
    root.querySelectorAll?.('.eventRow').forEach(row => {
      if (row.dataset.callyEnhanced === '1') return;
      const open = row.querySelector('button[onclick*="openEvent"]');
      const pin = row.querySelector('[data-pin-event]');
      const id = pin?.dataset.pinEvent || (open?.getAttribute('onclick') || '').match(/openEvent\('([^']+)'\)/)?.[1];
      const item = (window.state?.data?.events || []).find(x => x.event_id === id);
      if (!id || !item) return;
      row.dataset.callyEnhanced = '1';
      const controls = document.createElement('div');
      controls.className = 'eventControls';
      controls.appendChild(makeMove(item));
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

  function startResize(ev, handle) {
    const el = handle.closest('[data-event-id]');
    const item = eventFor(el);
    if (!el || !item || item.locked) return;
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
      await window.api('/api/event', {method:'POST', body:JSON.stringify({...d.item, end:window.localIso(end)})});
      await window.load();
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
    if (ev.target.closest?.('.eventMove')) return; // existing dragStart handles movement

    // Do not start moving merely because the event card was touched.
    ev.stopPropagation();
  }

  function boot() {
    const stage = document.querySelector('#stage');
    if (!stage) return setTimeout(boot, 40);
    stage.addEventListener('pointerdown', onPointerDown, true);
    const observer = new MutationObserver(() => decorate(stage));
    observer.observe(stage, {childList:true, subtree:true});
    decorate(stage);
    setHeaderHeight();
    window.addEventListener('resize', setHeaderHeight, {passive:true});
    window.addEventListener('orientationchange', () => setTimeout(setHeaderHeight, 80), {passive:true});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
