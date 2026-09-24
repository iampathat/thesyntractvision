/* Cally.One surface coordinator v7
   Interaction hygiene only. Exactly one top-level Cally surface may be visible.
   No domain state, Calendar Space semantics or QCDS inference lives here. */
(() => {
  'use strict';
  if (window.__callySurfaceCoordinatorV7) return;
  window.__callySurfaceCoordinatorV7 = true;

  const q = (s, root=document) => root.querySelector(s);
  const qa = (s, root=document) => [...root.querySelectorAll(s)];
  let seq = 0;
  let lastVisible = new WeakMap();
  const timers = new Set();

  const specs = [
    ['menu', () => q('#callyMobileMenu')],
    ['perspective', () => q('#rightSide')],
    ['event', () => q('#modalBack')],
    ['state', () => q('#callyStateOverlay')],
    ['state', () => qa('.stateOverlay').find(el => el.id !== 'callyStateOverlay' && el.classList.contains('open')) || null],
    ['calendar-settings', () => q('#callyCalendarSettings')],
    ['theme', () => q('#callyThemeSettings')],
    ['terminology', () => q('.callyTerminologyOverlay')],
    ['qcds-state', () => q('.callyQcdsStateCenter')],
    ['locale', () => q('.callyLocaleAccess')],
    ['manage', () => q('#callyManagementOverlay')],
    ['manage', () => qa('.manageOverlay').find(el => el.id !== 'callyManagementOverlay' && el.classList.contains('open')) || null],
    ['person', () => q('#callyQuickAdd')],
    ['chatgpt', () => q('#callyChatGPTSheet')],
  ];

  const unique = rows => {
    const seen = new Set();
    return rows.filter(row => row.el && !seen.has(row.el) && seen.add(row.el));
  };

  function roots() {
    return unique(specs.map(([kind, get]) => ({kind, el:get()})));
  }

  function computedVisible(el) {
    if (!el || !el.isConnected) return false;
    try {
      const s = getComputedStyle(el);
      return s.display !== 'none' && s.visibility !== 'hidden';
    } catch (_) { return true; }
  }

  function visible(row) {
    const {kind, el} = row;
    if (!el || !el.isConnected) return false;
    if (kind === 'person') return !el.hidden && computedVisible(el);
    if (kind === 'menu') return !el.hidden && computedVisible(el);
    if (kind === 'event') {
      if (String(el.style.display || '').toLowerCase() === 'none') return false;
      return computedVisible(el);
    }
    return el.classList.contains('open') && computedVisible(el);
  }

  function close(row) {
    const {kind, el} = row;
    if (!el || !el.isConnected) return;
    if (kind === 'menu') {
      if (window.__callyMenu?.close) window.__callyMenu.close();
      else {
        el.hidden = true;
        el.classList.remove('open');
        q('#callyMenuButton')?.setAttribute('aria-expanded','false');
      }
      return;
    }
    if (kind === 'event') {
      if (typeof window.closeModal === 'function') {
        try { window.closeModal(); } catch (_) { el.style.display='none'; }
      } else el.style.display='none';
      el.classList.remove('open','callySurfaceOpen');
      return;
    }
    if (kind === 'person') {
      el.hidden = true;
      el.innerHTML = '';
      q('#personBtn')?.setAttribute('aria-expanded','false');
      return;
    }
    el.classList.remove('open','callySurfaceOpen');
  }

  function markTransitions(rows) {
    for (const row of rows) {
      const now = visible(row);
      const was = lastVisible.get(row.el) === true;
      if (now && !was) row.el.dataset.callyOpenSeq = String(++seq);
    }
  }

  function winner(rows) {
    return rows.reduce((best,row) => {
      if (!best) return row;
      const a = Number(best.el.dataset.callyOpenSeq || 0);
      const b = Number(row.el.dataset.callyOpenSeq || 0);
      if (b !== a) return b > a ? row : best;
      const za = Number.parseInt(getComputedStyle(best.el).zIndex || '0',10) || 0;
      const zb = Number.parseInt(getComputedStyle(row.el).zIndex || '0',10) || 0;
      if (zb !== za) return zb > za ? row : best;
      return row;
    }, null);
  }

  function reconcile() {
    const all = roots();
    markTransitions(all);
    const open = all.filter(visible);
    if (open.length > 1) {
      const keep = winner(open);
      open.forEach(row => { if (row.el !== keep.el) close(row); });
    }
    const after = roots().filter(visible);
    lastVisible = new WeakMap();
    roots().forEach(row => lastVisible.set(row.el, after.some(x => x.el === row.el)));
    const active = after.length ? after[after.length - 1].kind : '';
    if (active) document.body.dataset.callyActiveSurface = active;
    else delete document.body.dataset.callyActiveSurface;
    document.body.classList.toggle('callyDrawerActive', after.length > 0);
  }

  function cascade() {
    requestAnimationFrame(reconcile);
    for (const delay of [24, 120, 360]) {
      const id = setTimeout(() => { timers.delete(id); reconcile(); }, delay);
      timers.add(id);
    }
  }

  function closeAllExcept(kind) {
    roots().filter(row => visible(row) && row.kind !== kind).forEach(close);
    reconcile();
  }

  function intendedKind(target) {
    if (!target?.closest) return '';
    if (target.closest('#callyMenuButton')) return 'menu';
    if (target.closest('#perspectiveBtn')) return 'perspective';
    if (target.closest('#eventBtn,[data-new-event],[data-event-create],[data-add-event]')) return 'event';
    if (target.closest('#personBtn,[data-add-state="person"]')) return 'person';
    if (target.closest('[data-cally-theme-settings]')) return 'theme';
    if (target.closest('[data-cally-calendar-settings]')) return 'calendar-settings';
    if (target.closest('#callyChatGPTBadge')) return 'chatgpt';
    return '';
  }

  document.addEventListener('click', event => {
    const kind = intendedKind(event.target);
    if (kind) closeAllExcept(kind);
    cascade();
  }, true);
  document.addEventListener('change', cascade, true);
  document.addEventListener('submit', cascade, true);
  document.addEventListener('focusin', cascade, true);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      const open = roots().filter(visible);
      const top = winner(open);
      if (top) close(top);
    }
    cascade();
  }, true);

  [
    'cally-one-ui-refresh','cally-theme-change','cally-locale-change',
    'cally-terminology-change','cally-chatgpt-interface-ready'
  ].forEach(name => window.addEventListener(name, cascade));

  window.addEventListener('resize', cascade, {passive:true});

  window.__callySurfaces = {
    reconcile,
    closeAll() { roots().filter(visible).forEach(close); reconcile(); },
    closeAllExcept,
    visible() { return roots().filter(visible).map(row => row.kind); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', cascade, {once:true});
  else cascade();
})();
