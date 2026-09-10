/* Cally.One canonical event entry bridge.
   Every NEW-event entry point uses one and the same editor path. Calendar clicks
   may add a start time, but they never open a second editor implementation. */
(() => {
  'use strict';
  if (window.__callyEventEntryBridge) return;
  window.__callyEventEntryBridge = true;

  const legacyOpenEvent = window.openEvent;
  if (typeof legacyOpenEvent !== 'function') return;

  const pad = value => String(value).padStart(2, '0');
  const localInputValue = date => {
    if (typeof window.localIso === 'function') return window.localIso(date);
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  function applyCreateContext(options = {}) {
    const modal = document.getElementById('modalBack');
    if (!modal) return;
    modal.dataset.callyEventEntry = 'canonical';
    modal.dataset.callyEventSource = options.source || 'button';

    if (options.start != null) {
      const start = options.start instanceof Date ? new Date(options.start) : new Date(options.start);
      if (!Number.isNaN(start.getTime())) {
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        const startInput = document.getElementById('fStart');
        const endInput = document.getElementById('fEnd');
        if (startInput) startInput.value = localInputValue(start);
        if (endInput) endInput.value = localInputValue(end);
        modal.dataset.callyQuickCreateStart = localInputValue(start);
      }
    } else {
      delete modal.dataset.callyQuickCreateStart;
    }

    window.dispatchEvent(new Event('cally-one-ui-refresh'));
  }

  function openCanonical(id = null, options = {}) {
    const result = legacyOpenEvent.call(window, id);
    if (id == null) {
      applyCreateContext(options);
      queueMicrotask(() => applyCreateContext(options));
      requestAnimationFrame(() => {
        applyCreateContext(options);
        document.getElementById('fTitle')?.focus({preventScroll:true});
      });
    } else {
      window.dispatchEvent(new Event('cally-one-ui-refresh'));
    }
    return result;
  }

  const publicOpenEvent = function(id = null) {
    return openCanonical(id, {});
  };
  /* interaction_controller already decorated legacyOpenEvent. Mark this wrapper
     as decorated too so a later UI refresh does not wrap the canonical entry a
     second time. */
  publicOpenEvent.__callyIntegratedWrapped = true;
  publicOpenEvent.__callyCanonicalEventEntry = true;
  window.openEvent = publicOpenEvent;
  window.__callyOpenNewEvent = options => openCanonical(null, options || {});

  /* The original top button closes over the old lexical openEvent function.
     Capture it here so the top button cannot bypass the same canonical route
     used by a calendar-cell click. */
  document.addEventListener('click', event => {
    if (!event.target.closest?.('#eventBtn')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.__callyOpenNewEvent({source:'top'});
  }, true);
})();
