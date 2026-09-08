/* Presentation-only: keep the temporal reference in the same metadata line as locale/calendar/time-zone context. */
(() => {
  'use strict';
  if (window.__callyTimeReferenceContextPolish) return;
  window.__callyTimeReferenceContextPolish = true;

  const PREF_KEY = 'cally.one.time-reference.v1';

  function referenceCode() {
    const badge = document.querySelector('.callyTimeReferenceBadge');
    const fromBadge = String(badge?.textContent || '').trim();
    if (fromBadge) return fromBadge.toUpperCase();
    try {
      const prefs = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
      return String(prefs.timeReference || 'utc').trim().toUpperCase();
    } catch (_) {
      return 'UTC';
    }
  }

  function mergeReferenceIntoContext() {
    const context = document.querySelector('.callyCalendarContext');
    if (!context) return;

    document.querySelectorAll('.callyTimeReferenceBadge').forEach(node => node.remove());
    context.querySelectorAll('.callyTimeReferenceInline').forEach(node => node.remove());

    const code = referenceCode();
    if (!code) return;

    const inline = document.createElement('span');
    inline.className = 'callyTimeReferenceInline';
    inline.textContent = ` · ${code}`;
    context.appendChild(inline);
  }

  const refresh = () => requestAnimationFrame(mergeReferenceIntoContext);

  window.addEventListener('cally-one-ui-refresh', refresh);
  window.addEventListener('cally-terminology-change', refresh);
  document.addEventListener('click', event => {
    if (event.target.closest?.('.callyCalendarSettingsSave')) setTimeout(mergeReferenceIntoContext, 0);
  });

  const boot = () => {
    mergeReferenceIntoContext();
    setTimeout(mergeReferenceIntoContext, 0);
    setTimeout(mergeReferenceIntoContext, 50);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
