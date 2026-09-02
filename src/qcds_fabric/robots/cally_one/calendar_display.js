/* Cally.One calendar/time display dimension — projection only; no QCDS startup. */
(() => {
  if (window.__callyCalendarDisplayDimension) return;
  window.__callyCalendarDisplayDimension = true;

  const PREF_KEY = 'cally.one.display.v1';
  const locale = String(navigator.language || 'en').toLowerCase();
  const sv = locale.startsWith('sv');
  const localZone = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (_) { return 'UTC'; } })();
  const CALENDARS = [
    ['gregory', sv ? 'Gregoriansk' : 'Gregorian'],
    ['iso8601', 'ISO 8601'],
    ['islamic', sv ? 'Islamisk' : 'Islamic'],
    ['islamic-umalqura', sv ? 'Islamisk · Umm al-Qura' : 'Islamic · Umm al-Qura'],
    ['chinese', sv ? 'Kinesisk' : 'Chinese'],
    ['hebrew', sv ? 'Hebreisk' : 'Hebrew'],
    ['persian', sv ? 'Persisk' : 'Persian'],
    ['indian', sv ? 'Indisk nationalkalender' : 'Indian national calendar'],
    ['buddhist', sv ? 'Buddhistisk' : 'Buddhist'],
    ['japanese', sv ? 'Japansk era' : 'Japanese era']
  ];

  function readPrefs() {
    try {
      const parsed = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
      return {
        calendar: String(parsed.calendar || 'gregory'),
        timeZone: String(parsed.timeZone || localZone),
        hourCycle: ['auto','h23','h12'].includes(parsed.hourCycle) ? parsed.hourCycle : 'auto'
      };
    } catch (_) { return {calendar:'gregory', timeZone:localZone, hourCycle:'auto'}; }
  }

  let prefs = readPrefs();

  function writePrefs(next) {
    prefs = next;
    try { localStorage.setItem(PREF_KEY, JSON.stringify(next)); } catch (_) {}
  }

  function parseIsoDate(value) {
    const [y,m,d] = String(value || '').slice(0,10).split('-').map(Number);
    return y && m && d ? new Date(y, m - 1, d, 12, 0, 0, 0) : null;
  }

  function isoWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  function safeFormat(date, options) {
    try {
      return new Intl.DateTimeFormat(undefined, {...options, calendar:prefs.calendar, timeZone:prefs.timeZone}).format(date);
    } catch (_) {
      return new Intl.DateTimeFormat(undefined, {...options, timeZone:prefs.timeZone}).format(date);
    }
  }

  function calendarDay(date) {
    try {
      const parts = new Intl.DateTimeFormat('en', {calendar:prefs.calendar,timeZone:prefs.timeZone,day:'numeric'}).formatToParts(date);
      return parts.find(p => p.type === 'day')?.value || safeFormat(date,{day:'numeric'});
    } catch (_) { return String(date.getDate()); }
  }

  function calendarName() {
    return CALENDARS.find(([id]) => id === prefs.calendar)?.[1] || prefs.calendar;
  }

  function zoneShort() {
    try {
      const parts = new Intl.DateTimeFormat(undefined,{timeZone:prefs.timeZone,timeZoneName:'short'}).formatToParts(new Date());
      return parts.find(p => p.type === 'timeZoneName')?.value || prefs.timeZone;
    } catch (_) { return prefs.timeZone; }
  }

  function formatClock(date) {
    const options = {timeZone:prefs.timeZone,hour:'numeric',minute:'2-digit',timeZoneName:'short'};
    if (prefs.hourCycle === 'h12') options.hour12 = true;
    if (prefs.hourCycle === 'h23') options.hour12 = false;
    try { return new Intl.DateTimeFormat(undefined, options).format(date); }
    catch (_) { return date.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}); }
  }

  function formatWallHour(hour) {
    if (prefs.hourCycle === 'h12') {
      const suffix = hour < 12 ? 'AM' : 'PM';
      const h = hour % 12 || 12;
      return `${h}:00 ${suffix}`;
    }
    if (prefs.hourCycle === 'h23') return `${String(hour).padStart(2,'0')}:00`;
    try {
      return new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'}).format(new Date(2000,0,1,hour,0));
    } catch (_) { return `${String(hour).padStart(2,'0')}:00`; }
  }

  function zonedGregorianParts(date) {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        calendar:'gregory',timeZone:prefs.timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'
      }).formatToParts(date);
      const get = type => parts.find(p => p.type === type)?.value;
      return {year:+get('year'),month:+get('month'),day:+get('day'),hour:+get('hour'),minute:+get('minute')};
    } catch (_) {
      return {year:date.getFullYear(),month:date.getMonth()+1,day:date.getDate(),hour:date.getHours(),minute:date.getMinutes()};
    }
  }

  function zonedDateKey(date) {
    const p = zonedGregorianParts(date);
    return `${p.year}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`;
  }

  function loadEventState() {
    try {
      const parsed = JSON.parse(localStorage.getItem('cally.one.state.v1') || '{}');
      return Array.isArray(parsed.events) ? parsed.events : [];
    } catch (_) { return []; }
  }

  function ensureMenuButtons() {
    const label = sv ? 'Kalender & tid' : 'Calendar & time';
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

  function supportedZones() {
    try {
      if (typeof Intl.supportedValuesOf === 'function') return Intl.supportedValuesOf('timeZone');
    } catch (_) {}
    return [localZone,'UTC','Europe/Stockholm','Europe/London','America/New_York','America/Los_Angeles','Asia/Tokyo','Asia/Shanghai','Asia/Dubai'];
  }

  function ensureSettings() {
    let overlay = document.querySelector('#callyCalendarSettings');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'callyCalendarSettings';
    overlay.className = 'callyCalendarSettings';
    overlay.innerHTML = `
      <div class="callyCalendarSettingsSheet" role="dialog" aria-modal="true" aria-labelledby="callyCalendarSettingsTitle">
        <div class="callyCalendarSettingsHead"><div><div class="eyebrow">${sv?'KALENDERDIMENSION':'CALENDAR DIMENSION'}</div><h2 id="callyCalendarSettingsTitle">${sv?'Kalender & tid':'Calendar & time'}</h2><p>${sv?'Samma tidslinje kan projiceras med annan tideräkning, tidszon och klocknotation.':'Project the same timeline through another calendar system, time zone and clock notation.'}</p></div><button type="button" class="callyCalendarSettingsClose" aria-label="${sv?'Stäng':'Close'}">×</button></div>
        <div class="callyCalendarSettingsForm">
          <label>${sv?'Tideräkning / kalendersystem':'Calendar system'}<select id="callyCalendarSystem">${CALENDARS.map(([id,name])=>`<option value="${id}">${name}</option>`).join('')}</select></label>
          <label>${sv?'Tidszon':'Time zone'}<input id="callyTimeZone" list="callyTimeZones" autocomplete="off"><datalist id="callyTimeZones"></datalist></label>
          <label>${sv?'Klockformat':'Clock format'}<select id="callyHourCycle"><option value="auto">${sv?'Automatiskt efter språk/region':'Automatic for locale'}</option><option value="h23">24 h · 18:30</option><option value="h12">12 h · 6:30 PM</option></select></label>
          <div class="callyCalendarSettingsHint">${sv?'Veckonummer visas enligt ISO 8601. Händelsernas underliggande tid ändras inte när projektionen växlas. Tidszon och AM/PM visas explicit där tider visas.':'Week numbers use ISO 8601. Switching projection never changes the underlying event instant. Time zone and AM/PM are shown explicitly where times are displayed.'}</div>
          <button type="button" class="callyCalendarSettingsSave">${sv?'Använd projektion':'Use projection'}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const list = overlay.querySelector('#callyTimeZones');
    supportedZones().forEach(zone => { const option=document.createElement('option'); option.value=zone; list.appendChild(option); });
    overlay.addEventListener('click', event => { if (event.target === overlay || event.target.closest('.callyCalendarSettingsClose')) overlay.classList.remove('open'); });
    overlay.querySelector('.callyCalendarSettingsSave').addEventListener('click', () => {
      const calendar = overlay.querySelector('#callyCalendarSystem').value || 'gregory';
      const timeZone = overlay.querySelector('#callyTimeZone').value.trim() || localZone;
      const hourCycle = overlay.querySelector('#callyHourCycle').value || 'auto';
      try { new Intl.DateTimeFormat(undefined,{calendar,timeZone}).format(new Date()); }
      catch (_) { return; }
      writePrefs({calendar,timeZone,hourCycle});
      overlay.classList.remove('open');
      if (typeof window.render === 'function') window.render();
      setTimeout(decorate, 0);
    });
    return overlay;
  }

  function openSettings() {
    const overlay = ensureSettings();
    overlay.querySelector('#callyCalendarSystem').value = prefs.calendar;
    overlay.querySelector('#callyTimeZone').value = prefs.timeZone;
    overlay.querySelector('#callyHourCycle').value = prefs.hourCycle;
    overlay.classList.add('open');
  }

  function decorateContext() {
    const title = document.querySelector('#dateTitle');
    if (!title) return;
    title.querySelector('.callyCalendarContext')?.remove();
    const badge = document.createElement('span');
    badge.className = 'callyCalendarContext';
    badge.textContent = `${calendarName()} · ${zoneShort()} · ${prefs.hourCycle === 'h12' ? 'AM/PM' : prefs.hourCycle === 'h23' ? '24 h' : (sv?'lokalt format':'locale format')}`;
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
      const last = parseIsoDate(inMonth[inMonth.length-1].dataset.jumpDate);
      const h3 = month.querySelector('h3');
      if (first && last && h3) h3.insertAdjacentHTML('beforeend', `<span class="miniWeekRange">v${isoWeekNumber(first)}–${isoWeekNumber(last)}</span>`);
    });
  }

  function decorateCalendarLabels() {
    const nonGregorian = prefs.calendar !== 'gregory' && prefs.calendar !== 'iso8601';

    const heads = [...document.querySelectorAll('.timeline .dayHead')];
    const cols = [...document.querySelectorAll('.timeline .dayCol[data-drop-date]')];
    heads.forEach((head,index) => {
      head.querySelector('.callyAltDate')?.remove();
      const date = parseIsoDate(cols[index]?.dataset.dropDate);
      if (!date || !nonGregorian) return;
      const alt = document.createElement('span');
      alt.className = 'callyAltDate';
      alt.textContent = safeFormat(date,{day:'numeric',month:'short',year:'numeric'});
      head.appendChild(alt);
    });

    document.querySelectorAll('.month .dayCell[data-drop-date]').forEach(cell => {
      const button = cell.querySelector('.dayNum');
      if (!button) return;
      if (!button.dataset.callyGregorianLabel) button.dataset.callyGregorianLabel = button.textContent;
      const date = parseIsoDate(cell.dataset.dropDate);
      button.textContent = nonGregorian && date ? calendarDay(date) : button.dataset.callyGregorianLabel;
      if (date) button.title = safeFormat(date,{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    });

    document.querySelectorAll('.miniDay[data-jump-date]').forEach(button => {
      if (!button.dataset.callyGregorianLabel) button.dataset.callyGregorianLabel = button.textContent;
      const date = parseIsoDate(button.dataset.jumpDate);
      button.textContent = nonGregorian && date ? calendarDay(date) : button.dataset.callyGregorianLabel;
      if (date) button.title = safeFormat(date,{day:'numeric',month:'long',year:'numeric'});
    });
  }

  function decorateTimelineTimeZone() {
    document.querySelectorAll('.timeRail .hour').forEach((hour,index) => { hour.textContent = formatWallHour(index + 6); });
    const timeline = document.querySelector('.timeline');
    if (!timeline) return;
    const columns = new Map([...timeline.querySelectorAll('.dayCol[data-drop-date]')].map(col => [col.dataset.dropDate, col]));
    const events = new Map(loadEventState().map(event => [String(event.event_id), event]));
    timeline.querySelectorAll('.event[data-event-id]').forEach(element => {
      const event = events.get(String(element.dataset.eventId));
      if (!event || !event.start) return;
      const start = new Date(event.start);
      const end = new Date(event.end || event.start);
      const parts = zonedGregorianParts(start);
      const key = zonedDateKey(start);
      const target = columns.get(key);
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
      const p = zonedGregorianParts(new Date());
      now.style.top = `${((p.hour + p.minute / 60) - 6) * 59.5}px`;
    }
  }

  function decorate() {
    prefs = readPrefs();
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
