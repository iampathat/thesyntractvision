/* Cally.One calendar navigation/layout hotfix — projection UI only, never inference. */
(() => {
  if (window.__callyCalendarLayoutHotfix) return;
  window.__callyCalendarLayoutHotfix = true;

  const PERSON_PLUS_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 19c0-2.8-2.7-4.5-6-4.5S3 16.2 3 19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="9" cy="8" r="3.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M18 8v6M15 11h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  const CALENDAR_PLUS_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M7 3v4M17 3v4M3 9h18M12 12v6M9 15h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  const qs = (selector, root=document) => root.querySelector(selector);
  const qsa = (selector, root=document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pad = value => String(value).padStart(2, '0');

  function ensureQuickAddStyles() {
    if (document.querySelector('#callyQuickAddStyles')) return;
    const style = document.createElement('style');
    style.id = 'callyQuickAddStyles';
    style.textContent = `
      .topActions{grid-auto-columns:max-content!important}
      #perspectiveBtn,.callyMenuButton{width:42px!important;min-width:42px!important}
      #personBtn,#eventBtn{width:auto!important;min-width:58px!important;padding:0 11px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;line-height:1!important}
      #personBtn .actionIcon,#eventBtn .actionIcon{display:none!important}
      #personBtn .actionText,#eventBtn .actionText{display:block!important;font-size:9.5px!important;line-height:1!important;font-weight:790!important;letter-spacing:.01em!important;white-space:nowrap!important}
      #personBtn{background:transparent!important;color:var(--cally-ink)!important;border-color:var(--cally-line)!important}
      #eventBtn{background:#edf4ef!important;color:#174333!important;border-color:#c5d7cc!important}
      #eventBtn:hover{background:#e4efe8!important;border-color:#aac5b5!important}
      .callyMenuButton::before{transform:translateY(1.75px)!important}
      .callyQuickAdd{position:fixed;z-index:160;width:min(350px,calc(100vw - 16px));max-height:calc(100dvh - 86px);overflow:auto;overscroll-behavior:contain;padding:12px;border:1px solid var(--cally-line,#d9ddd7);border-radius:14px;background:var(--cally-paper,#fbfaf6);color:var(--cally-ink,#10231b);box-shadow:0 18px 50px rgba(16,35,27,.14)}
      .callyQuickAdd[hidden]{display:none!important}
      .callyQuickHead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:2px 2px 10px;margin-bottom:8px;border-bottom:1px solid var(--cally-line,#d9ddd7)}
      .callyQuickEyebrow{color:var(--cally-accent,#087a59);font-size:7.5px;line-height:1;font-weight:850;letter-spacing:.15em}
      .callyQuickTitle{margin-top:4px;font-size:16px;line-height:1.05;font-weight:790;letter-spacing:-.035em}
      .callyQuickClose{width:28px;min-width:28px;height:28px;min-height:28px;padding:0;display:grid;place-items:center;border:1px solid var(--cally-line,#d9ddd7);border-radius:8px;background:#f0f1ed;color:var(--cally-ink,#10231b);font-size:17px;line-height:1;cursor:pointer}
      .callyQuickForm{display:grid;gap:9px}.callyQuickTwo{display:grid;grid-template-columns:1fr 1fr;gap:8px}.callyQuickField{display:grid;gap:5px;min-width:0}
      .callyQuickField>span{color:var(--cally-muted,#66736c);font-size:8px;line-height:1;font-weight:790;letter-spacing:.02em}
      .callyQuickField input,.callyQuickField select{width:100%;min-width:0;height:37px;min-height:37px;padding:7px 9px;border:1px solid var(--cally-line,#d9ddd7);border-radius:8px;background:#fff;color:var(--cally-ink,#10231b);font-size:11px;line-height:1.2;box-shadow:none}
      .callyQuickField input:focus,.callyQuickField select:focus{outline:2px solid rgba(8,122,89,.14);outline-offset:1px;border-color:#91ad9d}
      .callyQuickPeople{display:flex;flex-wrap:wrap;gap:5px;max-height:82px;overflow:auto;padding:1px 0}
      .callyQuickPeople label{display:inline-flex;align-items:center;gap:5px;min-height:28px;padding:5px 8px;border:1px solid var(--cally-line,#d9ddd7);border-radius:999px;background:#fff;color:var(--cally-ink,#10231b);font-size:8.5px;line-height:1;font-weight:720;cursor:pointer}
      .callyQuickPeople label:has(input:checked){background:#edf5f0;border-color:#91b2a0;color:#164331}.callyQuickPeople input{width:13px;height:13px;margin:0;accent-color:var(--cally-accent,#087a59)}
      .callyQuickActions{display:flex;justify-content:flex-end;gap:6px;margin-top:2px;padding-top:9px;border-top:1px solid var(--cally-line,#d9ddd7)}
      .callyQuickActions button{min-height:34px;padding:7px 11px;border-radius:8px;font-size:9.5px;line-height:1;font-weight:790;cursor:pointer}
      .callyQuickCancel{background:transparent;border:1px solid var(--cally-line,#d9ddd7);color:var(--cally-ink,#10231b)}.callyQuickSave{background:var(--cally-accent-dark,#102a21);border:1px solid var(--cally-accent-dark,#102a21);color:#fff}.callyQuickSave:disabled{opacity:.5;cursor:wait}
      @media(max-width:760px){#perspectiveBtn,.callyMenuButton{width:40px!important;min-width:40px!important}#personBtn,#eventBtn{min-width:52px!important;padding:0 8px!important}#personBtn .actionText,#eventBtn .actionText{font-size:8.8px!important}.callyQuickAdd{left:8px!important;right:8px!important;width:auto!important;max-height:calc(100dvh - 74px);border-radius:14px;padding:11px}.callyQuickField input,.callyQuickField select{font-size:16px;height:40px;min-height:40px}}
      @media(max-width:390px){#perspectiveBtn,.callyMenuButton{width:37px!important;min-width:37px!important}#personBtn,#eventBtn{min-width:47px!important;padding:0 6px!important}#personBtn .actionText,#eventBtn .actionText{font-size:8.2px!important}.callyQuickTwo{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function localIso(date) {
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function roundedStart() {
    const date = new Date();
    date.setSeconds(0, 0);
    date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15);
    return date;
  }

  async function currentState() {
    try {
      const response = await fetch('/api/state');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (_) {
      try {
        const key = typeof window.__callySpaceStorageKey === 'function' ? window.__callySpaceStorageKey() : 'cally.one.state.v1';
        return JSON.parse(localStorage.getItem(key) || '{}');
      } catch (_) { return {}; }
    }
  }

  function quickAddBox() {
    let box = qs('#callyQuickAdd');
    if (box) return box;
    box = document.createElement('div');
    box.id = 'callyQuickAdd';
    box.className = 'callyQuickAdd';
    box.hidden = true;
    document.body.appendChild(box);
    return box;
  }

  function closeQuickAdd() {
    const box = qs('#callyQuickAdd');
    if (!box || box.hidden) return;
    box.hidden = true;
    box.innerHTML = '';
    qsa('[data-cally-quick-trigger]').forEach(button => button.setAttribute('aria-expanded', 'false'));
  }

  function placeQuickAdd(trigger) {
    const box = quickAddBox();
    const rect = trigger.getBoundingClientRect();
    const edge = 8;
    const width = Math.min(350, window.innerWidth - edge * 2);
    let left = rect.right - width;
    left = Math.max(edge, Math.min(left, window.innerWidth - width - edge));
    box.style.width = `${width}px`;
    box.style.left = `${left}px`;
    box.style.right = 'auto';
    box.style.top = `${Math.min(window.innerHeight - 80, rect.bottom + 8)}px`;
  }

  function openQuickShell(trigger, kind, title, eyebrow) {
    const menu = qs('#callyMobileMenu');
    if (menu) menu.hidden = true;
    qs('#callyMenuButton')?.setAttribute('aria-expanded', 'false');
    qsa('[data-cally-quick-trigger]').forEach(button => button.setAttribute('aria-expanded', String(button === trigger)));
    const box = quickAddBox();
    box.dataset.kind = kind;
    box.innerHTML = `<div class="callyQuickHead"><div><div class="callyQuickEyebrow">${esc(eyebrow)}</div><div class="callyQuickTitle">${esc(title)}</div></div><button type="button" class="callyQuickClose" aria-label="Stäng">×</button></div><div class="callyQuickBody"></div>`;
    box.hidden = false;
    placeQuickAdd(trigger);
    qs('.callyQuickClose', box)?.addEventListener('click', closeQuickAdd, {once:true});
    return qs('.callyQuickBody', box);
  }

  async function openEventQuickAdd(trigger) {
    const body = openQuickShell(trigger, 'event', 'Ny händelse', 'ADD EVENT');
    const state = await currentState();
    if (!body || body.closest('#callyQuickAdd')?.hidden) return;
    const people = Array.isArray(state.people) ? state.people.filter(person => !person.archived && !person.dimensions?.archived) : [];
    const start = roundedStart();
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    body.innerHTML = `<form class="callyQuickForm" id="callyQuickEventForm"><label class="callyQuickField"><span>Titel</span><input id="callyQuickEventTitle" autocomplete="off" placeholder="Fotboll, middag, möte …"></label><div class="callyQuickTwo"><label class="callyQuickField"><span>Start</span><input id="callyQuickEventStart" type="datetime-local" value="${localIso(start)}"></label><label class="callyQuickField"><span>Slut</span><input id="callyQuickEventEnd" type="datetime-local" value="${localIso(end)}"></label></div><label class="callyQuickField"><span>Plats</span><input id="callyQuickEventLocation" autocomplete="off" placeholder="Valfritt"></label>${people.length ? `<div class="callyQuickField"><span>Personer</span><div class="callyQuickPeople">${people.map(person => `<label><input type="checkbox" value="${esc(person.person_id)}"><span>${esc(person.name)}</span></label>`).join('')}</div></div>` : ''}<div class="callyQuickActions"><button type="button" class="callyQuickCancel">Avbryt</button><button type="submit" class="callyQuickSave">Lägg till</button></div></form>`;
    qs('.callyQuickCancel', body)?.addEventListener('click', closeQuickAdd, {once:true});
    qs('#callyQuickEventForm', body)?.addEventListener('submit', async event => {
      event.preventDefault();
      const save = qs('.callyQuickSave', body);
      const payload = {title:qs('#callyQuickEventTitle', body)?.value.trim() || 'Ny händelse',start:qs('#callyQuickEventStart', body)?.value || localIso(start),end:qs('#callyQuickEventEnd', body)?.value || localIso(end),location:qs('#callyQuickEventLocation', body)?.value.trim() || '',people:qsa('.callyQuickPeople input:checked', body).map(input => input.value),dimensions:{},constraints:{},locked:false};
      try {
        if (save) save.disabled = true;
        const response = await fetch('/api/event', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
        closeQuickAdd();
        await window.load?.();
        window.toast?.('Händelse tillagd');
      } catch (error) {
        window.toast?.(error.message || String(error));
        if (save) save.disabled = false;
      }
    });
    requestAnimationFrame(() => qs('#callyQuickEventTitle', body)?.focus());
  }

  async function openPersonQuickAdd(trigger) {
    const body = openQuickShell(trigger, 'person', 'Ny person', 'ADD PERSON');
    const state = await currentState();
    if (!body || body.closest('#callyQuickAdd')?.hidden) return;
    const organizations = Array.isArray(state.entities) ? state.entities.filter(entity => entity.kind === 'organization') : [];
    body.innerHTML = `<form class="callyQuickForm" id="callyQuickPersonForm"><label class="callyQuickField"><span>Namn</span><input id="callyQuickPersonName" autocomplete="off" placeholder="Namn"></label><label class="callyQuickField"><span>Organisation</span><select id="callyQuickPersonOrg"><option value="">Ingen / välj senare</option>${organizations.map(org => `<option value="${esc(org.entity_id)}">${esc(org.label)}</option>`).join('')}</select></label><label class="callyQuickField"><span>Roll</span><input id="callyQuickPersonRole" autocomplete="off" placeholder="Valfritt"></label><div class="callyQuickActions"><button type="button" class="callyQuickCancel">Avbryt</button><button type="submit" class="callyQuickSave">Lägg till</button></div></form>`;
    qs('.callyQuickCancel', body)?.addEventListener('click', closeQuickAdd, {once:true});
    qs('#callyQuickPersonForm', body)?.addEventListener('submit', async event => {
      event.preventDefault();
      const name = qs('#callyQuickPersonName', body)?.value.trim();
      if (!name) return qs('#callyQuickPersonName', body)?.focus();
      const save = qs('.callyQuickSave', body);
      const payload = {name,organization_id:qs('#callyQuickPersonOrg', body)?.value || '',role:qs('#callyQuickPersonRole', body)?.value.trim() || '',dimensions:{}};
      try {
        if (save) save.disabled = true;
        const response = await fetch('/api/person', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
        closeQuickAdd();
        await window.load?.();
        window.toast?.('Person tillagd');
      } catch (error) {
        window.toast?.(error.message || String(error));
        if (save) save.disabled = false;
      }
    });
    requestAnimationFrame(() => qs('#callyQuickPersonName', body)?.focus());
  }

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

  function setSemanticActionIcon(id, html, label) {
    const control = document.getElementById(id);
    const icon = control?.querySelector('.actionIcon');
    if (!control || !icon) return;
    if (icon.dataset.callySemanticIcon !== '1') {
      icon.dataset.callySemanticIcon = '1';
      icon.innerHTML = html;
    }
    control.title = label;
    control.setAttribute('aria-label', label);
  }

  function polishTopChrome() {
    ensureQuickAddStyles();
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

    setSemanticActionIcon('personBtn', PERSON_PLUS_ICON, 'Lägg till person');
    setSemanticActionIcon('eventBtn', CALENDAR_PLUS_ICON, 'Ny händelse');
    const person = document.getElementById('personBtn');
    const event = document.getElementById('eventBtn');
    if (person) {
      person.dataset.callyQuickTrigger = 'person';
      person.setAttribute('aria-haspopup', 'dialog');
      person.setAttribute('aria-expanded', 'false');
      const text = person.querySelector('.actionText');
      if (text) text.textContent = 'Person';
      person.onclick = click => { click.preventDefault(); click.stopPropagation(); openPersonQuickAdd(person); };
    }
    if (event) {
      event.dataset.callyQuickTrigger = 'event';
      event.setAttribute('aria-haspopup', 'dialog');
      event.setAttribute('aria-expanded', 'false');
      const text = event.querySelector('.actionText');
      if (text) text.textContent = 'Event';
      event.onclick = click => { click.preventDefault(); click.stopPropagation(); openEventQuickAdd(event); };
    }
    const perspective = document.getElementById('perspectiveBtn');
    if (perspective) {
      perspective.title = 'Perspektiv';
      perspective.setAttribute('aria-label', 'Perspektiv');
    }
    menuButton.title = 'Meny';
    menuButton.setAttribute('aria-label', 'Meny');
  }

  function readEvents() {
    try {
      const key = typeof window.__callySpaceStorageKey === 'function' ? window.__callySpaceStorageKey() : 'cally.one.state.v1';
      const parsed = JSON.parse(localStorage.getItem(key) || '{}');
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

  document.addEventListener('click', click => {
    const box = qs('#callyQuickAdd');
    if (!box || box.hidden) return;
    if (click.target.closest?.('#callyQuickAdd') || click.target.closest?.('[data-cally-quick-trigger]')) return;
    closeQuickAdd();
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeQuickAdd(); });
  window.addEventListener('resize', () => {
    const box = qs('#callyQuickAdd');
    if (!box || box.hidden) return;
    const trigger = qs(`[data-cally-quick-trigger="${box.dataset.kind}"]`);
    if (trigger) placeQuickAdd(trigger);
  }, {passive:true});
  window.addEventListener('cally-one-ui-refresh', refreshLayoutPolish);
  window.addEventListener('cally-display-changed', () => setTimeout(decorateYearEvents, 0));
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refreshLayoutPolish, {once:true});
  } else {
    refreshLayoutPolish();
  }
})();
