/* Cally.One surface integrity v6
   Presentation/interaction hygiene only. Legacy modules may still own their
   content, but only one top-level Cally surface may be visible at a time. */
(() => {
  'use strict';
  if (window.__callySurfaceIntegrityV6) return;
  window.__callySurfaceIntegrityV6 = true;

  const q = selector => document.querySelector(selector);
  let previous = new WeakMap();
  let scheduled = false;

  function unique(items) {
    const seen = new Set();
    return items.filter(item => item && !seen.has(item) && seen.add(item));
  }

  function roots() {
    return unique([
      q('#callyMobileMenu'),
      q('#rightSide'),
      q('#modalBack'),
      q('#callyStateOverlay'),
      ...document.querySelectorAll('.stateOverlay'),
      q('#callyCalendarSettings'),
      q('#callyThemeSettings'),
      q('.callyTerminologyOverlay'),
      q('.callyQcdsStateCenter'),
      q('.callyLocaleAccess'),
      q('#callyManagementOverlay'),
      ...document.querySelectorAll('.manageOverlay'),
      q('#callyQuickAdd')
    ]);
  }

  function kind(el) {
    if (!el) return '';
    if (el.id === 'callyMobileMenu') return 'menu';
    if (el.id === 'rightSide') return 'perspective';
    if (el.id === 'modalBack') return 'event';
    if (el.id === 'callyQuickAdd') return 'quick';
    if (el.id === 'callyThemeSettings') return 'theme';
    if (el.id === 'callyCalendarSettings') return 'calendar-settings';
    if (el.id === 'callyManagementOverlay' || el.classList.contains('manageOverlay')) return 'manage';
    if (el.id === 'callyStateOverlay' || el.classList.contains('stateOverlay')) return 'state';
    if (el.classList.contains('callyTerminologyOverlay')) return 'terminology';
    if (el.classList.contains('callyQcdsStateCenter')) return 'qcds-state';
    if (el.classList.contains('callyLocaleAccess')) return 'locale';
    return 'surface';
  }

  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    if (el.id === 'callyQuickAdd') {
      if (el.hidden) return false;
      try { return getComputedStyle(el).display !== 'none'; } catch (_) { return true; }
    }
    if (el.id === 'callyMobileMenu') return !el.hidden && el.classList.contains('open');
    if (el.id === 'rightSide') return el.classList.contains('open');
    if (el.id === 'modalBack') {
      const inline = String(el.style.display || '').toLowerCase();
      if (inline === 'none') return false;
      try { return getComputedStyle(el).display !== 'none'; } catch (_) { return inline !== 'none'; }
    }
    return el.classList.contains('open');
  }

  function zIndex(el) {
    try {
      const value = Number.parseInt(getComputedStyle(el).zIndex || '0', 10);
      return Number.isFinite(value) ? value : 0;
    } catch (_) { return 0; }
  }

  function closeSurface(el) {
    if (!el || !el.isConnected) return;
    const k = kind(el);
    if (k === 'menu') {
      if (window.__callyMenu?.close) window.__callyMenu.close();
      else { el.classList.remove('open'); el.hidden = true; q('#callyMenuButton')?.setAttribute('aria-expanded','false'); }
      return;
    }
    if (k === 'event') {
      if (typeof window.closeModal === 'function') window.closeModal();
      else el.style.display = 'none';
      el.classList.remove('callySurfaceOpen','open');
      return;
    }
    if (k === 'quick') {
      el.hidden = true;
      el.innerHTML = '';
      q('#personBtn')?.setAttribute('aria-expanded','false');
      return;
    }
    el.classList.remove('open','callySurfaceOpen');
  }

  function chooseWinner(visible) {
    const newlyOpened = visible.filter(el => previous.get(el) !== true);
    const pool = newlyOpened.length ? newlyOpened : visible;
    return pool.reduce((best, el) => {
      if (!best) return el;
      const za = zIndex(best), zb = zIndex(el);
      if (zb > za) return el;
      if (zb < za) return best;
      /* On equal depth, the surface later in document order is normally the
         surface opened by the latest interaction. */
      const pos = best.compareDocumentPosition(el);
      return pos & Node.DOCUMENT_POSITION_FOLLOWING ? el : best;
    }, null);
  }

  function reconcile() {
    scheduled = false;
    const all = roots();
    const visible = all.filter(isVisible);
    if (visible.length > 1) {
      const winner = chooseWinner(visible);
      visible.forEach(el => { if (el !== winner) closeSurface(el); });
    }
    const after = all.filter(isVisible);
    previous = new WeakMap();
    all.forEach(el => previous.set(el, after.includes(el)));
    document.body.classList.toggle('callyDrawerActive', after.length > 0);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => requestAnimationFrame(reconcile));
  }

  /* Capture is intentional: older modules sometimes stop propagation. We only
     reconcile after their click stack is finished, so their own action still runs. */
  document.addEventListener('click', schedule, true);
  document.addEventListener('change', schedule, true);
  document.addEventListener('submit', schedule, true);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      const visible = roots().filter(isVisible);
      if (visible.length) {
        const top = visible.reduce((best, el) => !best || zIndex(el) >= zIndex(best) ? el : best, null);
        closeSurface(top);
      }
    }
    schedule();
  }, true);

  ['cally-one-ui-refresh','cally-theme-change','cally-locale-change','cally-terminology-change'].forEach(name => window.addEventListener(name, schedule));
  window.addEventListener('resize', schedule, {passive:true});

  window.__callySurfaces = {
    reconcile,
    closeAll() { roots().filter(isVisible).forEach(closeSurface); reconcile(); },
    visible() { return roots().filter(isVisible).map(kind); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', reconcile, {once:true});
  else reconcile();
})();
