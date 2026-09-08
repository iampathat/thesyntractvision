/* Presentation-only: keep the temporal reference in the same metadata line as locale/calendar/time-zone context. */
(() => {
  'use strict';
  if (window.__callyTimeReferenceContextPolish) return;
  window.__callyTimeReferenceContextPolish = true;

  function mergeReferenceIntoContext() {
    const context = document.querySelector('.callyCalendarContext');
    if (!context) return;

    context.querySelectorAll('.callyTimeReferenceInline').forEach(node => node.remove());

    const badge = document.querySelector('.callyTimeReferenceBadge');
    if (!badge) return;

    const code = String(badge.textContent || '').trim();
    if (!code) {
      badge.remove();
      return;
    }

    const inline = document.createElement('span');
    inline.className = 'callyTimeReferenceInline';
    inline.textContent = ` · ${code}`;
    if (badge.title) inline.title = badge.title;

    badge.remove();
    context.appendChild(inline);
  }

  const refresh = () => queueMicrotask(mergeReferenceIntoContext);

  window.addEventListener('cally-one-ui-refresh', refresh);
  window.addEventListener('cally-terminology-change', refresh);
  document.addEventListener('click', event => {
    if (event.target.closest?.('.callyCalendarSettingsSave')) setTimeout(mergeReferenceIntoContext, 0);
  });

  const boot = () => setTimeout(mergeReferenceIntoContext, 0);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
