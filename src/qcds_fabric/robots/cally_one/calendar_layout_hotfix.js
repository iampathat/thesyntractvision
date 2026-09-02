/* Cally.One calendar navigation/layout hotfix — projection UI only, never inference. */
(() => {
  if (window.__callyCalendarLayoutHotfix) return;
  window.__callyCalendarLayoutHotfix = true;

  function focusTodayInCurrentProjection() {
    const stage = document.querySelector('#stage');
    if (!stage) return;

    const yearToday = stage.querySelector('.miniDay.today');
    if (yearToday) {
      const month = yearToday.closest('.miniMonth');
      if (month) {
        stage.scrollTo({
          top: Math.max(0, month.offsetTop - Math.max(8, stage.clientHeight * 0.08)),
          left: stage.scrollLeft,
          behavior: 'smooth'
        });
      }
      return;
    }

    const monthToday = stage.querySelector('.dayCell.today');
    if (monthToday) {
      stage.scrollTo({
        top: Math.max(0, monthToday.offsetTop - Math.max(8, stage.clientHeight * 0.08)),
        left: stage.scrollLeft,
        behavior: 'smooth'
      });
      return;
    }

    const nowLine = stage.querySelector('.nowline');
    if (nowLine) {
      stage.scrollTo({
        top: Math.max(0, nowLine.offsetTop - stage.clientHeight * 0.35),
        left: stage.scrollLeft,
        behavior: 'smooth'
      });
    }
  }

  function wireTodayFocus() {
    const today = document.querySelector('#todayBtn');
    if (!today || today.dataset.callyTodayFocus === '1') return;
    today.dataset.callyTodayFocus = '1';
    today.addEventListener('click', () => setTimeout(focusTodayInCurrentProjection, 0));
  }

  function polishTopChrome() {
    const mark = document.querySelector('.mark');
    if (mark && mark.dataset.callyMarkPolished !== '1') {
      mark.dataset.callyMarkPolished = '1';
      mark.textContent = 'C';
      mark.setAttribute('aria-hidden', 'true');
    }

    const actions = document.querySelector('.topActions');
    const menuButton = document.querySelector('#callyMenuButton');
    if (!actions || !menuButton) return;
    if (menuButton.parentElement !== actions) actions.appendChild(menuButton);
    ['perspectiveBtn','personBtn','eventBtn','callyMenuButton'].forEach(id => {
      const control = document.getElementById(id);
      if (control && control.parentElement === actions) actions.appendChild(control);
    });
  }

  function readEvents() {
    try {
      const parsed = JSON.parse(localStorage.getItem('cally.one.state.v1') || '{}');
      return Array.isArray(parsed.events) ? parsed.events : [];
    } catch (_) { return []; }
  }

  function displayTimeZone() {
    try {
      const prefs = JSON.parse(localStorage.getItem('cally.one.display.v1') || '{}');
      return String(prefs.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    } catch (_) { return 'UTC'; }
  }

  function dateKey(date) {
    try {
      const parts = new Intl.DateTimeFormat('en', {
        timeZone: displayTimeZone(), year:'numeric', month:'2-digit', day:'2-digit'
      }).formatToParts(date);
      const get = type => parts.find(part => part.type === type)?.value || '';
      return `${get('year')}-${get('month')}-${get('day')}`;
    } catch (_) {
      return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    }
  }

  function decorateYearEvents() {
    const days = [...document.querySelectorAll('.miniDay[data-jump-date]')];
    if (!days.length) return;
    const eventsByDate = new Map();
    readEvents().forEach(event => {
      if (!event || !event.start) return;
      const date = new Date(event.start);
      if (Number.isNaN(date.getTime())) return;
      const key = dateKey(date);
      if (!eventsByDate.has(key)) eventsByDate.set(key, []);
      eventsByDate.get(key).push(event);
    });

    days.forEach(day => {
      day.querySelectorAll('.callyYearEvent,.callyYearMore').forEach(node => node.remove());
      const events = eventsByDate.get(day.dataset.jumpDate) || [];
      day.classList.toggle('has', events.length > 0);
      if (!events.length) {
        day.removeAttribute('data-cally-year-events');
        return;
      }
      day.dataset.callyYearEvents = String(events.length);
      const first = document.createElement('span');
      first.className = 'callyYearEvent';
      first.textContent = String(events[0].title || 'Händelse');
      day.appendChild(first);
      if (events.length > 1) {
        const more = document.createElement('span');
        more.className = 'callyYearMore';
        more.textContent = `+${events.length - 1}`;
        day.appendChild(more);
      }
      day.title = events.map(event => String(event.title || 'Händelse')).join(' · ');
    });
  }

  function refreshLayoutPolish() {
    wireTodayFocus();
    polishTopChrome();
    decorateYearEvents();
  }

  window.addEventListener('cally-one-ui-refresh', refreshLayoutPolish);
  window.addEventListener('cally-display-changed', () => setTimeout(decorateYearEvents, 0));
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refreshLayoutPolish, {once:true});
  } else {
    refreshLayoutPolish();
  }
})();
