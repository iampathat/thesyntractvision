/* Cally.One calendar/time display dimension — projection only; no QCDS startup. */
(() => {
  if (window.__callyCalendarDisplayDimension) return;
  window.__callyCalendarDisplayDimension = true;

  const PREF_KEY = 'cally.one.display.v2';
  const LEGACY_PREF_KEY = 'cally.one.display.v1';
  const localZone = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (_) { return 'UTC'; } })();
  const uiLocale = () => { try { return window.__callyLocale?.() || ((navigator.language || 'sv').toLowerCase().startsWith('sv') ? 'sv' : 'en'); } catch (_) { return 'sv'; } };
  const uiSv = () => uiLocale() === 'sv';
  const DISPLAY_LANGUAGES = [
    {code:'sv', locale:'sv-SE', labels:{sv:'Svenska', en:'Swedish'}},
    {code:'en', locale:'en-GB', labels:{sv:'Engelska', en:'English'}},
  ];
  const CALENDARS = [
    ['gregory', {sv:'Gregoriansk', en:'Gregorian'}],
    ['iso8601', {sv:'ISO 8601', en:'ISO 8601'}],
    ['islamic', {sv:'Islamisk', en:'Islamic'}],
    ['islamic-umalqura', {sv:'Islamisk · Umm al-Qura', en:'Islamic · Umm al-Qura'}],
    ['chinese', {sv:'Kinesisk', en:'Chinese'}],
    ['hebrew', {sv:'Hebreisk', en:'Hebrew'}],
    ['persian', {sv:'Persisk', en:'Persian'}],
    ['indian', {sv:'Indisk nationalkalender', en:'Indian national calendar'}],
    ['buddhist', {sv:'Buddhistisk', en:'Buddhist'}],
    ['japanese', {sv:'Japansk era', en:'Japanese era'}],
  ];

  function stateKey() {
    return typeof window.__callySpaceStorageKey === 'function' ? window.__callySpaceStorageKey() : 'cally.one.state.v1';
  }

  function readPrefs() {
    try {
      const raw = localStorage.getItem(PREF_KEY) || localStorage.getItem(LEGACY_PREF_KEY) || '{}';
      const parsed = JSON.parse(raw);
      return {
        calendar: String(parsed.calendar || 'gregory'),
        timeZone: String(parsed.timeZone || localZone),
        hourCycle: ['auto','h23','h12'].includes(parsed.hourCycle) ? parsed.hourCycle : 'auto',
        displayLocale: ['sv','en'].includes(parsed.displayLocale) ? parsed.displayLocale : (uiLocale() === 'en' ? 'en' : 'sv'),
      };
    } catch (_) {
      return {calendar:'gregory', timeZone:localZone, hourCycle:'auto', displayLocale:uiLocale() === 'en' ? 'en' : 'sv'};
    }
  }

  let prefs = readPrefs();
  const formatLocale = () => DISPLAY_LANGUAGES.find(item => item.code === prefs.displayLocale)?.locale || 'sv-SE';

  function projectionDimension(key, label, valueKind, values=[]) {
    return {key, label:label.sv, labels:label, value_kind:valueKind, preferred:true, rich_editor:false, system:true, origin:'system', status:'active', hidden:false, values};
  }

  function writeProjectionState() {
    try {
      const state = JSON.parse(localStorage.getItem(stateKey()) || '{}');
      if (!Array.isArray(state.dimension_states)) state.dimension_states = [];
      const definitions = [
        projectionDimension('calendar_display_language', {sv:'Kalenderns visningsspråk',en:'Calendar display language'}, 'language-state', DISPLAY_LANGUAGES.map(item => ({code:item.code,labels:item.labels,locale:item.locale}))),
        projectionDimension('calendar_system', {sv:'Tideräkning',en:'Calendar system'}, 'calendar-system-state', CALENDARS.map(([code,labels]) => ({code,labels}))),
        projectionDimension('time_zone', {sv:'Tidszon',en:'Time zone'}, 'time-zone-state'),
        projectionDimension('clock_format', {sv:'Klockformat',en:'Clock format'}, 'clock-format-state', [
          {code:'auto',labels:{sv:'Automatiskt',en:'Automatic'}},
          {code:'h23',labels:{sv:'24 timmar',en:'24 hour'}},
          {code:'h12',labels:{sv:'12 timmar',en:'12 hour'}},
        ]),
      ];
      for (const definition of definitions) {
        const index = state.dimension_states.findIndex(item => item && item.key === definition.key);
        if (index >= 0) state.dimension_states[index] = {...definition, ...state.dimension_states[index], values:state.dimension_states[index].values || definition.values};
        else state.dimension_states.push(definition);
      }
      state.calendar_projection = {displayLocale:prefs.displayLocale, calendar:prefs.calendar, timeZone:prefs.timeZone, hourCycle:prefs.hourCycle};
      state.state_model = {
        ...(state.state_model || {}),
        calendar_projection_is_state:true,
        calendar_display_language_is_independent:true,
        calendar_system_is_independent:true,
        time_zone_is_independent:true,
        display_projection_does_not_change_temporal_state:true,
      };
      localStorage.setItem(stateKey(), JSON.stringify(state));
    } catch (_) {}
  }

  function writePrefs(next) {
    prefs = next;
    try { localStorage.setItem(PREF_KEY, JSON.stringify(next)); } catch (_) {}
    writeProjectionState();
  }

  function flag(code) {
    if (code === 'sv') return `<svg class="callyLangFlag" viewBox="0 0 28 20" aria-hidden="true"><rect width="28" height="20" rx="2" fill="#1769aa"/><rect x="8" width="3" height="20" fill="#ffd447"/><rect y="8" width="28" height="3" fill="#ffd447"/></svg>`;
    return `<svg class="callyLangFlag" viewBox="0 0 28 20" aria-hidden="true"><rect width="28" height="20" rx="2" fill="#21468b"/><path d="M0 0l28 20M28 0L0 20" stroke="#fff" stroke-width="5"/><path d="M0 0l28 20M28 0L0 20" stroke="#cf142b" stroke-width="2"/><path d="M14 0v20M0 10h28" stroke="#fff" stroke-width="6"/><path d="M14 0v20M0 10h28" stroke="#cf142b" stroke-width="3"/></svg>`;
  }

  function parseIsoDate(value) {
    const [year,month,day] = String(value || '').slice(0,10).split('-').map(Number);
    return year && month && day ? new Date(year, month - 1, day, 12, 0, 0, 0) : null;
  }

  function isoWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  function safeFormat(date, options) {
    try { return new Intl.DateTimeFormat(formatLocale(), {...options, calendar:prefs.calendar, timeZone:prefs.timeZone}).format(date); }
    catch (_) { return new Intl.DateTimeFormat(formatLocale(), {...options, timeZone:prefs.timeZone}).format(date); }
  }

  function calendarDay(date) {
    try {
      const parts = new Intl.DateTimeFormat(formatLocale(), {calendar:prefs.calendar,timeZone:prefs.timeZone,day:'numeric'}).formatToParts(date);
      return parts.find(part => part.type === 'day')?.value || safeFormat(date,{day:'numeric'});
    } catch (_) { return String(date.getDate()); }
  }

  function calendarName() {
    const labels = CALENDARS.find(([id]) => id === prefs.calendar)?.[1];
    return labels?.[prefs.displayLocale] || labels?.en || prefs.calendar;
  }

  function zoneShort() {
    try {
      const parts = new Intl.DateTimeFormat(formatLocale(), {timeZone:prefs.timeZone,timeZoneName:'short'}).formatToParts(new Date());
      return parts.find(part => part.type === 'timeZoneName')?.value || prefs.timeZone;
    } catch (_) { return prefs.timeZone; }
  }

  function formatClock(date) {
    const options = {timeZone:prefs.timeZone,hour:'numeric',minute:'2-digit',timeZoneName:'short'};
    if (prefs.hourCycle === 'h12') options.hour12 = true;
    if (prefs.hourCycle === 'h23') options.hour12 = false;
    try { return new Intl.DateTimeFormat(formatLocale(), options).format(date); }
    catch (_) { return date.toLocaleTimeString(formatLocale(), {hour:'2-digit',minute:'2-digit'}); }
  }

  function formatWallHour(hour) {
    if (prefs.hourCycle === 'h12') {
      const suffix = hour < 12 ? 'AM' : 'PM';
      const shown = hour % 12 || 12;
      return `${shown}:00 ${suffix}`;
    }
    if (prefs.hourCycle === 'h23') return `${String(hour).padStart(2,'0')}:00`;
    try { return new Intl.DateTimeFormat(formatLocale(), {hour:'numeric',minute:'2-digit'}).format(new Date(2000,0,1,hour,0)); }
    catch (_) { return `${String(hour).padStart(2,'0')}:00`; }
  }

  function zonedGregorianParts(date) {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {calendar:'gregory',timeZone:prefs.timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
      const get = type => parts.find(part => part.type === type)?.value;
      return {year:+get('year'),month:+get('month'),day:+get('day'),hour:+get('hour'),minute:+get('minute')};
    } catch (_) { return {year:date.getFullYear(),month:date.getMonth()+1,day:date.getDate(),hour:date.getHours(),minute:date.getMinutes()}; }
  }

  function zonedDateKey(date) {
    const parts = zonedGregorianParts(date);
    return `${parts.year}-${String(parts.month).padStart(2,'0')}-${String(parts.day).padStart(2,'0')}`;
  }

  function loadEventState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(stateKey()) || '{}');
      return Array.isArray(parsed.events) ? parsed.events : [];
    } catch (_) { return []; }
  }

  function supportedZones() {
    try { if (typeof Intl.supportedValuesOf === 'function') return Intl.supportedValuesOf('timeZone'); } catch (_) {}
    return [localZone,'UTC','Europe/Stockholm','Europe/London','America/New_York','America/Los_Angeles','Asia/Tokyo','Asia/Shanghai','Asia/Dubai'];
  }

  function ensureMenuButtons() {
    if (document.querySelector('[data-cally-system-menu]')) return;
    const label = uiSv() ? 'Kalender & tid' : 'Calendar & time';
    document.querySelectorAll('.callyWideNav,.callyMobileMenu').forEach(nav => {
      if (nav.querySelector('[data-cally-display-settings]')) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'callyDisplayMenuButton';
      button.dataset.callyDisplaySettings = '1';
      button.textContent = label;
      nav.appendChild(button);
    });
  }

  function ensureSettings() {
    let overlay = document.querySelector('#callyCalendarSettings');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'callyCalendarSettings';
    overlay.className = 'callyCalendarSettings';
    overlay.innerHTML = `
      <div class="callyCalendarSettingsSheet" role="dialog" aria-modal="true" aria-labelledby="callyCalendarSettingsTitle">
        <div class="callyCalendarSettingsHead"><div><div class="eyebrow">${uiSv()?'KALENDERDIMENSION · PROJEKTION':'CALENDAR DIMENSION · PROJECTION'}</div><h2 id="callyCalendarSettingsTitle">${uiSv()?'Kalendervisning':'Calendar display'}</h2><p>${uiSv()?'Visningsspråk, tideräkning, tidszon och klockformat är separata dimensioner. De ändrar inte den underliggande tiden.':'Display language, calendar system, time zone and clock format are separate dimensions. They do not change the underlying instant.'}</p></div><button type="button" class="callyCalendarSettingsClose">×</button></div>
        <div class="callyCalendarSettingsForm">
          <div class="callyDisplayLanguageField"><span>${uiSv()?'Visningsspråk i kalendern':'Calendar display language'}</span><div class="callyDisplayLanguageChoices">${DISPLAY_LANGUAGES.map(item=>`<button type="button" data-calendar-display-locale="${item.code}">${flag(item.code)}<b>${item.labels[uiLocale()]}</b></button>`).join('')}</div><small>${uiSv()?'Oberoende av huvudmenyns språk.':'Independent of the main-menu language.'}</small></div>
          <label>${uiSv()?'Tideräkning / kalendersystem':'Calendar system'}<select id="callyCalendarSystem">${CALENDARS.map(([id,labels])=>`<option value="${id}">${labels[uiLocale()]||labels.en}</option>`).join('')}</select></label>
          <label>${uiSv()?'Tidszon':'Time zone'}<input id="callyTimeZone" list="callyTimeZones" autocomplete="off"><datalist id="callyTimeZones"></datalist></label>
          <label>${uiSv()?'Klockformat':'Clock format'}<select id="callyHourCycle"><option value="auto">${uiSv()?'Automatiskt för visningsspråket':'Automatic for display language'}</option><option value="h23">24 h · 18:30</option><option value="h12">12 h · 6:30 PM</option></select></label>
          <div class="callyCalendarSettingsHint">${uiSv()?'Exempel: svenska huvudmenyer + English kalendertext + kinesisk tideräkning + Asia/Shanghai. Samma Calendar Space-state.':'Example: Swedish main menus + English calendar text + Chinese calendar system + Asia/Shanghai. Same Calendar Space state.'}</div>
          <button type="button" class="callyCalendarSettingsSave">${uiSv()?'Använd projektion':'Use projection'}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const list = overlay.querySelector('#callyTimeZones');
    supportedZones().forEach(zone => { const option=document.createElement('option'); option.value=zone; list.appendChild(option); });
    overlay.addEventListener('click', event => {
      if (event.target === overlay || event.target.closest('.callyCalendarSettingsClose')) overlay.classList.remove('open');
      const language = event.target.closest('[data-calendar-display-locale]');
      if (language) {
        prefs = {...prefs,displayLocale:language.dataset.calendarDisplayLocale};
        [...overlay.querySelectorAll('[data-calendar-display-locale]')].forEach(button => button.classList.toggle('active', button.dataset.calendarDisplayLocale === prefs.displayLocale));
      }
    });
    overlay.querySelector('.callyCalendarSettingsSave').addEventListener('click', () => {
      const calendar = overlay.querySelector('#callyCalendarSystem').value || 'gregory';
      const timeZone = overlay.querySelector('#callyTimeZone').value.trim() || localZone;
      const hourCycle = overlay.querySelector('#callyHourCycle').value || 'auto';
      try { new Intl.DateTimeFormat(formatLocale(), {calendar,timeZone}).format(new Date()); } catch (_) { return; }
      writePrefs({calendar,timeZone,hourCycle,displayLocale:prefs.displayLocale});
      overlay.classList.remove('open');
      window.render?.();
      setTimeout(decorate, 0);
      window.dispatchEvent(new CustomEvent('cally-one-ui-refresh'));
    });
    return overlay;
  }

  function openSettings() {
    prefs = readPrefs();
    const overlay = ensureSettings();
    overlay.querySelector('#callyCalendarSystem').value = prefs.calendar;
    overlay.querySelector('#callyTimeZone').value = prefs.timeZone;
    overlay.querySelector('#callyHourCycle').value = prefs.hourCycle;
    [...overlay.querySelectorAll('[data-calendar-display-locale]')].forEach(button => button.classList.toggle('active', button.dataset.calendarDisplayLocale === prefs.displayLocale));
    overlay.classList.add('open');
  }
  window.__callyOpenCalendarDisplaySettings = openSettings;

  function decorateContext() {
    const title = document.querySelector('#dateTitle');
    if (!title) return;
    title.querySelector('.callyCalendarContext')?.remove();
    const badge = document.createElement('span');
    badge.className = 'callyCalendarContext';
    badge.textContent = `${prefs.displayLocale.toUpperCase()} · ${calendarName()} · ${zoneShort()} · ${prefs.hourCycle === 'h12' ? 'AM/PM' : prefs.hourCycle === 'h23' ? '24 h' : (uiSv()?'lokalt format':'locale format')}`;
    title.appendChild(badge);
  }

  function addWeekNumbers() {
    const timeline = document.querySelector('.timeline');
    if (timeline) {
      const first = timeline.querySelector('.dayCol[data-drop-date]');
      const head = timeline.querySelector('.timeHead');
      if (first && head) {
        head.querySelector('.callyWeekNumber')?.remove();
        const date = parseIsoDate(first.dataset.dropDate);
        if (date) head.insertAdjacentHTML('beforeend', `<span class="callyWeekNumber">v ${isoWeekNumber(date)}</span>`);
      }
    }
    const cells = [...document.querySelectorAll('.month .dayCell[data-drop-date]')];
    cells.forEach((cell,index) => {
      cell.querySelector('.callyMonthWeek')?.remove();
      if (index % 7 !== 0) return;
      const date = parseIsoDate(cell.dataset.dropDate);
      if (date) cell.insertAdjacentHTML('afterbegin', `<span class="callyMonthWeek">v${isoWeekNumber(date)}</span>`);
    });
    document.querySelectorAll('.miniMonth').forEach(month => {
      month.querySelector('.miniWeekRange')?.remove();
      const inMonth = [...month.querySelectorAll('.miniDay')].filter(day => String(day.style.opacity) === '1');
      if (!inMonth.length) return;
      const first = parseIsoDate(inMonth[0].dataset.jumpDate);
      const last = parseIsoDate(inMonth[inMonth.length - 1].dataset.jumpDate);
      const heading = month.querySelector('h3');
      if (first && last && heading) heading.insertAdjacentHTML('beforeend', `<span class="miniWeekRange">v${isoWeekNumber(first)}–${isoWeekNumber(last)}</span>`);
    });
  }

  function decorateCalendarLabels() {
    const nonGregorian = prefs.calendar !== 'gregory' && prefs.calendar !== 'iso8601';
    const heads = [...document.querySelectorAll('.timeline .dayHead')];
    const columns = [...document.querySelectorAll('.timeline .dayCol[data-drop-date]')];
    heads.forEach((head,index) => {
      head.querySelector('.callyDisplayLocaleDate')?.remove();
      head.querySelector('.callyAltDate')?.remove();
      const date = parseIsoDate(columns[index]?.dataset.dropDate);
      if (!date) return;
      const localized = document.createElement('span');
      localized.className = 'callyDisplayLocaleDate';
      localized.textContent = safeFormat(date, {weekday:'short',day:'numeric',month:'short'});
      localized.title = uiSv() ? 'Kalenderns valda visningsspråk' : 'Selected calendar display language';
      head.appendChild(localized);
      if (nonGregorian) {
        const alt = document.createElement('span');
        alt.className = 'callyAltDate';
        alt.textContent = safeFormat(date, {day:'numeric',month:'short',year:'numeric'});
        head.appendChild(alt);
      }
    });

    document.querySelectorAll('.month .dayCell[data-drop-date]').forEach(cell => {
      const button = cell.querySelector('.dayNum');
      const date = parseIsoDate(cell.dataset.dropDate);
      if (!button || !date) return;
      if (!button.dataset.callyGregorianLabel) button.dataset.callyGregorianLabel = button.textContent;
      button.textContent = nonGregorian ? calendarDay(date) : button.dataset.callyGregorianLabel;
      button.title = safeFormat(date, {weekday:'long',day:'numeric',month:'long',year:'numeric'});
    });

    document.querySelectorAll('.miniDay[data-jump-date]').forEach(button => {
      if (!button.dataset.callyGregorianLabel) button.dataset.callyGregorianLabel = button.textContent;
      const date = parseIsoDate(button.dataset.jumpDate);
      button.textContent = nonGregorian && date ? calendarDay(date) : button.dataset.callyGregorianLabel;
      if (date) button.title = safeFormat(date, {day:'numeric',month:'long',year:'numeric'});
    });
  }

  function decorateTimelineTimeZone() {
    document.querySelectorAll('.timeRail .hour').forEach((hour,index) => { hour.textContent = formatWallHour(index + 6); });
    const timeline = document.querySelector('.timeline');
    if (!timeline) return;
    const columns = new Map([...timeline.querySelectorAll('.dayCol[data-drop-date]')].map(column => [column.dataset.dropDate,column]));
    const events = new Map(loadEventState().map(event => [String(event.event_id),event]));
    timeline.querySelectorAll('.event[data-event-id]').forEach(element => {
      const event = events.get(String(element.dataset.eventId));
      if (!event?.start) return;
      const start = new Date(event.start);
      const end = new Date(event.end || event.start);
      const parts = zonedGregorianParts(start);
      const target = columns.get(zonedDateKey(start));
      if (target && element.parentElement !== target) target.appendChild(element);
      const top = ((parts.hour + parts.minute / 60) - 6) * 59.5;
      const height = Math.max(34, Math.max(0, end - start) / 3600000 * 59.5 - 3);
      element.style.top = `${top}px`;
      element.style.height = `${height}px`;
      element.style.display = top < 0 || top > 952 ? 'none' : '';
      const small = element.querySelector('small');
      if (small) {
        const rest = small.textContent.includes(' · ') ? small.textContent.split(' · ').slice(1).join(' · ') : '';
        small.textContent = `${formatClock(start)}${rest ? ' · ' + rest : ''}`;
      }
    });
    const now = timeline.querySelector('.nowline');
    if (now) {
      const parts = zonedGregorianParts(new Date());
      now.style.top = `${((parts.hour + parts.minute / 60) - 6) * 59.5}px`;
    }
  }

  function decorate() {
    prefs = readPrefs();
    writeProjectionState();
    ensureMenuButtons();
    ensureSettings();
    decorateContext();
    addWeekNumbers();
    decorateCalendarLabels();
    decorateTimelineTimeZone();
  }

  document.addEventListener('click', event => {
    if (event.target.closest?.('[data-cally-display-settings]')) { event.preventDefault(); openSettings(); }
  });
  window.addEventListener('cally-one-ui-refresh', decorate);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', decorate, {once:true});
  else decorate();
})();