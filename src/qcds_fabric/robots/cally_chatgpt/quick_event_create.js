(() => {
  'use strict';
  if (window.__callyQuickEventCreateInstalled) return;
  window.__callyQuickEventCreateInstalled = true;

  const stage = document.getElementById('stage');
  if (!stage) return;

  let press = null;

  function parseDate(value) {
    const parts = String(value || '').split('-').map(Number);
    if (parts.length !== 3 || parts.some(n => !Number.isFinite(n))) return null;
    return new Date(parts[0], parts[1] - 1, parts[2], 9, 0, 0, 0);
  }

  function localInputValue(date) {
    if (typeof window.localIso === 'function') return window.localIso(date);
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function openPrefilled(start, source) {
    if (!(start instanceof Date) || Number.isNaN(start.getTime())) return;
    if (typeof window.openEvent !== 'function') return;

    const end = new Date(start.getTime() + 60 * 60 * 1000);
    window.openEvent();

    const startInput = document.getElementById('fStart');
    const endInput = document.getElementById('fEnd');
    const titleInput = document.getElementById('fTitle');
    const modal = document.getElementById('modalBack');

    if (startInput) startInput.value = localInputValue(start);
    if (endInput) endInput.value = localInputValue(end);
    if (modal) {
      modal.dataset.callyQuickCreate = source || 'calendar';
      modal.dataset.callyQuickCreateStart = localInputValue(start);
    }

    requestAnimationFrame(() => titleInput?.focus({preventScroll:true}));
  }

  function targetInfo(target, clientY) {
    if (!(target instanceof Element)) return null;
    if (target.closest('[data-event-id],[data-pin-event],button,input,select,textarea,a,[role="button"]')) return null;

    const dayCol = target.closest('.dayCol[data-drop-date]');
    if (dayCol) {
      const date = parseDate(dayCol.dataset.dropDate);
      if (!date) return null;
      const rect = dayCol.getBoundingClientRect();
      const rawMinutes = 6 * 60 + ((clientY - rect.top) / 59.5) * 60;
      const snapped = Math.round(rawMinutes / 15) * 15;
      const minutes = Math.max(6 * 60, Math.min(21 * 60 + 45, snapped));
      date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
      return {start: date, source: 'timeline'};
    }

    const dayCell = target.closest('.dayCell[data-drop-date]');
    if (dayCell) {
      const date = parseDate(dayCell.dataset.dropDate);
      return date ? {start: date, source: 'month'} : null;
    }

    const dayHead = target.closest('.dayHead');
    if (dayHead) {
      const heads = Array.from(dayHead.parentElement?.querySelectorAll('.dayHead') || []);
      const cols = Array.from(dayHead.parentElement?.querySelectorAll('.dayCol[data-drop-date]') || []);
      const index = heads.indexOf(dayHead);
      if (index >= 0 && cols[index]) {
        const date = parseDate(cols[index].dataset.dropDate);
        return date ? {start: date, source: 'day-header'} : null;
      }
    }

    return null;
  }

  stage.addEventListener('pointerdown', event => {
    const info = targetInfo(event.target, event.clientY);
    if (!info) {
      press = null;
      return;
    }
    press = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startedAt: performance.now(),
      info,
    };
  }, true);

  stage.addEventListener('pointerup', event => {
    if (!press || press.pointerId !== event.pointerId) return;
    const current = press;
    press = null;

    const moved = Math.hypot(event.clientX - current.x, event.clientY - current.y);
    if (moved > 8 || performance.now() - current.startedAt > 900) return;

    const latest = targetInfo(event.target, event.clientY);
    if (!latest) return;

    event.preventDefault();
    event.stopPropagation();
    openPrefilled(latest.start, latest.source);
  }, true);

  stage.addEventListener('pointercancel', () => { press = null; }, true);

  window.__callyOpenPrefilledEvent = (value, options = {}) => {
    const date = value instanceof Date ? new Date(value) : new Date(value);
    if (options.hour != null) date.setHours(Number(options.hour), Number(options.minute || 0), 0, 0);
    openPrefilled(date, 'api');
  };
})();
