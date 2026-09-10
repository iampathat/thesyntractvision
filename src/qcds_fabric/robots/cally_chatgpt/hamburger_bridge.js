/* Cally.One hamburger compatibility bridge.
   Narrow fix only: keeps the existing menu UI and synchronizes the legacy
   `hidden` state with the v5 `.open` state. No other drawer/modal is touched. */
(() => {
  'use strict';
  if (window.__callyHamburgerBridge) return;
  window.__callyHamburgerBridge = true;

  const menu = () => document.querySelector('#callyMobileMenu');
  const button = () => document.querySelector('#callyMenuButton');

  function setOpen(open) {
    const m = menu();
    const b = button();
    if (!m || !b) return;
    if (open) {
      m.hidden = false;
      m.classList.add('open');
    } else {
      m.classList.remove('open');
      m.hidden = true;
    }
    b.setAttribute('aria-expanded', String(open));
  }

  document.addEventListener('click', event => {
    const trigger = event.target.closest?.('#callyMenuButton');
    if (trigger) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const m = menu();
      setOpen(!(m && !m.hidden && m.classList.contains('open')));
      return;
    }

    /* Existing menu actions already perform their own navigation. We only
       clean up the visual state afterwards so the next hamburger click starts
       from a truthful closed state. */
    if (event.target.closest?.('#callyMobileMenu [data-nav], #callyMobileMenu [data-system-action], #callyMobileMenu [data-cally-theme-settings], #callyMobileMenu [data-terminology-settings]')) {
      queueMicrotask(() => {
        const m = menu();
        if (m?.hidden) m.classList.remove('open');
        const b = button();
        if (b && m?.hidden) b.setAttribute('aria-expanded', 'false');
      });
    }
  }, true);

  window.addEventListener('resize', () => setOpen(false), {passive:true});
})();
