/* Cally.One hamburger compatibility bridge.
   Narrow scope: owns only hamburger open/close state and provides a visible
   close control inside the menu. No event/person/perspective surface is touched. */
(() => {
  'use strict';
  if (window.__callyHamburgerBridge) return;
  window.__callyHamburgerBridge = true;

  const menu = () => document.querySelector('#callyMobileMenu');
  const button = () => document.querySelector('#callyMenuButton');

  function ensureCloseButton() {
    const m = menu();
    if (!m) return null;
    let close = m.querySelector(':scope > .callyMenuClose');
    if (close) return close;
    close = document.createElement('button');
    close.type = 'button';
    close.className = 'callyMenuClose';
    close.setAttribute('aria-label', 'Stäng meny');
    close.setAttribute('title', 'Stäng meny');
    close.textContent = '×';
    m.prepend(close);
    return close;
  }

  function setOpen(open) {
    const m = menu();
    const b = button();
    if (!m || !b) return;
    if (open) {
      ensureCloseButton();
      m.hidden = false;
      m.classList.add('open');
    } else {
      m.classList.remove('open');
      m.hidden = true;
    }
    b.setAttribute('aria-expanded', String(open));
  }

  document.addEventListener('click', event => {
    if (event.target.closest?.('.callyMenuClose')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      setOpen(false);
      return;
    }

    const trigger = event.target.closest?.('#callyMenuButton');
    if (trigger) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const m = menu();
      setOpen(!(m && !m.hidden && m.classList.contains('open')));
      return;
    }

    /* Existing menu actions own their navigation. We only normalize the visual
       state after the selected action has had a chance to run. */
    if (event.target.closest?.('#callyMobileMenu [data-nav], #callyMobileMenu [data-system-action], #callyMobileMenu [data-cally-theme-settings], #callyMobileMenu [data-terminology-settings]')) {
      queueMicrotask(() => setOpen(false));
    }
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const m = menu();
    if (m && !m.hidden) setOpen(false);
  }, true);

  window.addEventListener('resize', () => setOpen(false), {passive:true});

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureCloseButton, {once:true});
  } else {
    ensureCloseButton();
  }

  window.__callyMenu = {
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: () => {
      const m = menu();
      setOpen(!(m && !m.hidden && m.classList.contains('open')));
    }
  };
})();
