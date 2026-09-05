/* Cally.One civil Earth time-zone selector.
   IANA civil zones are a projection and remain independent from deeper time-reference/body state. */
(() => {
  if (window.__callyCivilTimeZoneUI) return;
  window.__callyCivilTimeZoneUI = true;

  const PREF_KEY = 'cally.one.time-reference.v1';
  const uiLocale = () => { try { return window.__callyLocale?.() || 'sv'; } catch (_) { return 'sv'; } };
  const sv = () => uiLocale() === 'sv';

  function referenceBody() {
    const live = document.querySelector('#callyReferenceBody');
    if (live?.value) return live.value;
    try {
      const saved = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
      return String(saved.referenceBody || 'earth');
    } catch (_) { return 'earth'; }
  }

  function supportedZones() {
    let zones = [];
    try {
      if (typeof Intl.supportedValuesOf === 'function') zones = Intl.supportedValuesOf('timeZone');
    } catch (_) {}
    if (!zones.length) {
      zones = [
        'Africa/Cairo','Africa/Johannesburg','America/Chicago','America/Denver','America/Los_Angeles','America/New_York','America/Sao_Paulo',
        'Asia/Dubai','Asia/Hong_Kong','Asia/Kolkata','Asia/Seoul','Asia/Shanghai','Asia/Singapore','Asia/Tokyo',
        'Australia/Perth','Australia/Sydney','Europe/Berlin','Europe/Helsinki','Europe/London','Europe/Paris','Europe/Stockholm',
        'Pacific/Auckland','Pacific/Honolulu','UTC'
      ];
    }
    const local = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (_) { return 'UTC'; } })();
    return [...new Set(['UTC', local, ...zones])].filter(Boolean).sort((a,b) => a.localeCompare(b));
  }

  function groupName(zone) {
    if (zone === 'UTC' || zone.startsWith('Etc/')) return 'UTC / Etc';
    return zone.includes('/') ? zone.split('/')[0] : 'Other';
  }

  function fill(select, current) {
    const zones = supportedZones();
    if (current && !zones.includes(current)) zones.unshift(current);
    select.innerHTML = '';
    const groups = new Map();
    for (const zone of zones) {
      const group = groupName(zone);
      if (!groups.has(group)) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = group;
        groups.set(group, optgroup);
        select.appendChild(optgroup);
      }
      const option = document.createElement('option');
      option.value = zone;
      option.textContent = zone;
      groups.get(group).appendChild(option);
    }
    select.value = current && zones.includes(current) ? current : (zones.includes('UTC') ? 'UTC' : zones[0]);
  }

  function updateContext(select) {
    const label = select.closest('label');
    if (!label) return;
    let title = label.querySelector('[data-cally-time-zone-title]');
    if (!title) {
      const firstText = [...label.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
      if (firstText) firstText.remove();
      title = document.createElement('span');
      title.dataset.callyTimeZoneTitle = '1';
      label.insertBefore(title, select);
    }
    let note = label.querySelector('[data-cally-time-zone-note]');
    if (!note) {
      note = document.createElement('small');
      note.dataset.callyTimeZoneNote = '1';
      select.insertAdjacentElement('afterend', note);
    }
    const earth = referenceBody() === 'earth';
    title.textContent = earth ? (sv() ? 'Tidszon' : 'Time zone') : (sv() ? 'Jordisk visningstidszon' : 'Earth display time zone');
    note.textContent = earth
      ? (sv() ? 'Välj bland enhetens färdiga IANA-tidszoner för Jorden.' : 'Choose from the device-supported IANA time zones for Earth.')
      : (sv() ? 'IANA-tidszoner gäller Jorden. Detta är en separat jordisk visningsprojektion och ändrar inte vald referenskropp eller tidsskala.' : 'IANA time zones apply to Earth. This is a separate Earth display projection and does not change the selected reference body or timescale.');
  }

  function enhance() {
    const old = document.querySelector('#callyTimeZone');
    if (!old) return;
    if (old.tagName === 'SELECT' && old.dataset.callyCanonicalZones === '1') {
      updateContext(old);
      return;
    }
    const current = String(old.value || '').trim();
    const select = document.createElement('select');
    select.id = 'callyTimeZone';
    select.dataset.callyCanonicalZones = '1';
    select.setAttribute('aria-label', sv() ? 'Tidszon' : 'Time zone');
    fill(select, current);
    old.replaceWith(select);
    document.querySelector('#callyTimeZones')?.remove();
    updateContext(select);
  }

  document.addEventListener('change', event => {
    if (event.target?.id === 'callyReferenceBody') requestAnimationFrame(enhance);
  });
  window.addEventListener('cally-one-ui-refresh', enhance);
  window.addEventListener('cally-terminology-change', enhance);
  const boot = () => enhance();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
