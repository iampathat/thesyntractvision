/* Cally.One brand/home chrome + dense calendar-state presentation. Never QCDS inference. */
(() => {
  if (window.__callyBrandHomePolish) return;
  window.__callyBrandHomePolish = true;

  const qs = (s, root=document) => root.querySelector(s);
  const qsa = (s, root=document) => [...root.querySelectorAll(s)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));

  function closeTransientUI() {
    const quick = qs('#callyQuickAdd');
    if (quick) { quick.hidden = true; quick.innerHTML = ''; }
    qs('#callyStateOverlay')?.classList.remove('open');
    qs('.manageOverlay')?.classList.remove('open');
    const modal = qs('#modalBack');
    if (modal) modal.style.display = 'none';
    const menu = qs('#callyMobileMenu');
    if (menu) menu.hidden = true;
    qs('#callyMenuButton')?.setAttribute('aria-expanded', 'false');
  }

  function goHome() {
    closeTransientUI();
    const week = qs('#viewbar .view[data-view="week"]') || [...document.querySelectorAll('#viewbar .view')].find(button => button.textContent.trim().toLowerCase() === 'week');
    if (week && !week.classList.contains('active')) week.click();
    setTimeout(() => {
      qs('#todayBtn')?.click();
      qs('#stage')?.scrollTo?.({top:0, left:0, behavior:'smooth'});
    }, 0);
  }

  function openAllStates() {
    closeTransientUI();
    const legacyStateTrigger = qs('.mark');
    if (legacyStateTrigger) legacyStateTrigger.click();
  }

  function ensureHomeTile(actions) {
    let home = qs('#callyHomeTile');
    if (!home) {
      home = document.createElement('button');
      home.id = 'callyHomeTile';
      home.type = 'button';
      home.className = 'btn callyHomeTile';
      home.textContent = 'C';
      home.title = 'Calendar Space · alla states';
      home.setAttribute('aria-label', 'Calendar Space · alla states');
      home.addEventListener('click', openAllStates);
    }
    const perspective = qs('#perspectiveBtn');
    if (home.parentElement !== actions) actions.insertBefore(home, perspective || actions.firstChild);
    else if (perspective && home.nextElementSibling !== perspective) actions.insertBefore(home, perspective);
    return home;
  }

  function ensureWordmark() {
    const brand = qs('.brand');
    const wordmark = qs('.brandText h1') || qs('.brand h1');
    if (!brand || !wordmark) return;

    const legacyMark = qs('.mark', brand);
    if (legacyMark) {
      legacyMark.classList.add('callyLegacyMark');
      legacyMark.setAttribute('aria-hidden', 'true');
    }

    if (wordmark.dataset.callyHomeWordmark !== '1') {
      wordmark.dataset.callyHomeWordmark = '1';
      wordmark.classList.add('callyWordmarkHome');
      wordmark.setAttribute('role', 'button');
      wordmark.setAttribute('tabindex', '0');
      wordmark.setAttribute('aria-label', 'Cally.One · Start');
      wordmark.title = 'Till Cally.One start';
      wordmark.addEventListener('click', goHome);
      wordmark.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          goHome();
        }
      });
    }

    qs('.brand small')?.setAttribute('hidden', '');
  }

  function ensureMenuAbout() {
    const menu = qs('#callyMobileMenu');
    if (!menu || qs('.callyMenuAbout', menu)) return;
    const about = document.createElement('section');
    about.className = 'callyMenuAbout';
    about.setAttribute('aria-label', 'Om Cally.One och licens');
    about.innerHTML = `
      <div class="callyMenuAboutEyebrow">OM CALLY.ONE</div>
      <div class="callyMenuAboutName">Cally.One</div>
      <div class="callyMenuAboutCredit">by Patrik Sundblom · Tribute License 1.0</div>
      <div class="callyMenuAboutLicense">Personal/family free · commercial/professional use €99/mo or €990/yr</div>`;
    menu.appendChild(about);
  }

  function refreshBrandHome() {
    ensureWordmark();
    const actions = qs('.topActions');
    if (actions) {
      ensureHomeTile(actions);
      ['callyHomeTile','perspectiveBtn','personBtn','eventBtn','callyMenuButton'].forEach(id => {
        const control = qs(`#${id}`);
        if (control && control.parentElement === actions) actions.appendChild(control);
      });
    }
    ensureMenuAbout();
  }

  async function readCalendarState() {
    try {
      const response = await fetch('/api/state');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json();
      return body && typeof body === 'object' ? body : {};
    } catch (_) {
      try {
        const key = typeof window.__callySpaceStorageKey === 'function' ? window.__callySpaceStorageKey() : 'cally.one.state.v1';
        return JSON.parse(localStorage.getItem(key) || '{}');
      } catch (_) { return {}; }
    }
  }

  function activeAcceptance(state, conflict) {
    if (conflict?.status === 'accepted' || conflict?.accepted === true) return true;
    const id = String(conflict?.conflict_id || '');
    return (state.relations || []).some(relation =>
      relation?.predicate === 'accepts_conflict' &&
      relation?.dimensions?.accepted === true &&
      String(relation?.dimensions?.conflict_id || '') === id
    );
  }

  function acceptanceRelation(state, conflict) {
    const id = String(conflict?.conflict_id || '');
    return (state.relations || []).find(relation =>
      relation?.predicate === 'accepts_conflict' &&
      String(relation?.dimensions?.conflict_id || '') === id
    ) || null;
  }

  async function setConflictAccepted(conflict, accepted) {
    const state = await readCalendarState();
    const existing = acceptanceRelation(state, conflict);
    const eventIds = (conflict.event_ids || []).map(String);
    if (!eventIds.length || !conflict.state_id || !conflict.conflict_id) return;
    const dimensions = {
      ...(existing?.dimensions || {}),
      conflict_id:String(conflict.conflict_id),
      state_id:String(conflict.state_id),
      event_ids:eventIds,
      accepted:Boolean(accepted),
      accepted_by:'human',
      accepted_at:accepted ? new Date().toISOString() : (existing?.dimensions?.accepted_at || null),
      revoked_at:accepted ? null : new Date().toISOString(),
    };
    const response = await fetch('/api/relation', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        relation_id:existing?.relation_id || `acceptance:${conflict.conflict_id}`,
        subject_id:eventIds[0],
        predicate:'accepts_conflict',
        object_id:String(conflict.state_id),
        dimensions,
      }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
    qs('#callyIssueOverlay')?.classList.remove('open');
    await window.load?.();
    window.toast?.(accepted ? 'Konflikten är godkänd och finns kvar som tillstånd' : 'Godkännandet är återkallat');
  }

  function effectiveConflicts(state, status) {
    return (state.state_conflicts || []).filter(conflict => {
      const accepted = activeAcceptance(state, conflict);
      return status === 'accepted' ? accepted : !accepted && conflict.status !== 'accepted';
    });
  }

  function openAcceptedConflictSheet(eventId, state) {
    const conflicts = effectiveConflicts(state, 'accepted').filter(conflict => !eventId || (conflict.event_ids || []).includes(eventId));
    if (!conflicts.length) return;
    let overlay = qs('#callyIssueOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'callyIssueOverlay';
      overlay.className = 'callyIssueOverlay';
      overlay.innerHTML = '<div class="callyIssueSheet"></div>';
      document.body.appendChild(overlay);
      overlay.addEventListener('click', event => { if (event.target === overlay) overlay.classList.remove('open'); });
    }
    const sheet = qs('.callyIssueSheet', overlay);
    sheet.innerHTML = `<div class="callyIssueHead"><div><small>GODKÄND KROCK</small><h2>Den här samtidigheten är okej</h2><p>Konflikten finns kvar som representerat tillstånd och kan återkallas.</p></div><button type="button" data-close-accepted>×</button></div><div class="callyIssueList">${conflicts.map(conflict => {
      const names = (conflict.event_ids || []).map(id => (state.events || []).find(event => event.event_id === id)?.title || id);
      const label = conflict.state_label || (state.entities || []).find(entity => entity.entity_id === conflict.state_id)?.label || 'Tillstånd';
      return `<div class="callyIssueCard callyAcceptedIssue" data-accepted-conflict="${esc(conflict.conflict_id)}"><b>${esc(label)}</b><span>Godkänd samtidig användning</span><small>${esc(names.join(' + '))}</small><div class="callyIssueActions"><button type="button" data-revoke-conflict="${esc(conflict.conflict_id)}">Ångra godkännande</button></div></div>`;
    }).join('')}</div>`;
    qs('[data-close-accepted]', sheet)?.addEventListener('click', () => overlay.classList.remove('open'));
    qsa('[data-revoke-conflict]', sheet).forEach(button => button.addEventListener('click', async () => {
      const conflict = conflicts.find(item => String(item.conflict_id) === button.dataset.revokeConflict);
      if (!conflict) return;
      button.disabled = true;
      try { await setConflictAccepted(conflict, false); }
      catch (error) { button.disabled = false; window.toast?.(error.message || String(error)); }
    }));
    overlay.classList.add('open');
  }

  function decorateAcceptedConflicts(state) {
    qsa('[data-event-id]').forEach(element => {
      element.classList.remove('callyAcceptedConflict');
      qs('.callyAcceptedConflictBadge', element)?.remove();
    });
    const accepted = effectiveConflicts(state, 'accepted');
    accepted.forEach(conflict => {
      (conflict.event_ids || []).forEach(eventId => {
        qsa(`[data-event-id="${CSS.escape(String(eventId))}"]`).forEach(element => {
          element.classList.remove('callyStateConflict');
          qs('.callyConflictBadge', element)?.remove();
          element.classList.add('callyAcceptedConflict');
          if (qs('.callyAcceptedConflictBadge', element)) return;
          const badge = document.createElement('button');
          badge.type = 'button';
          badge.className = 'callyAcceptedConflictBadge';
          badge.textContent = '✓';
          badge.title = 'Godkänd konflikt · visa eller ångra';
          badge.setAttribute('aria-label', 'Godkänd konflikt · visa eller ångra');
          badge.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            openAcceptedConflictSheet(String(eventId), state);
          });
          element.appendChild(badge);
        });
      });
    });
    const unresolved = effectiveConflicts(state, 'unresolved').filter(conflict => conflict.status === 'unresolved').length;
    const counter = qs('#callyConflictCounter');
    if (counter) {
      if (!unresolved) counter.remove();
      else counter.textContent = `${unresolved} krock${unresolved === 1 ? '' : 'ar'}`;
    }
  }

  async function enhanceConflictSheet() {
    const overlay = qs('#callyIssueOverlay.open');
    const cards = overlay ? qsa('.callyIssueCard.conflict', overlay) : [];
    if (!cards.length) return;
    const state = await readCalendarState();
    const all = state.state_conflicts || [];
    let conflicts = all;
    if (cards.length !== all.length) {
      const eventId = qs('[data-edit-event]', cards[0])?.dataset.editEvent;
      if (eventId) conflicts = all.filter(conflict => (conflict.event_ids || []).includes(eventId));
    }
    cards.forEach((card, index) => {
      const conflict = conflicts[index];
      if (!conflict) return;
      const accepted = activeAcceptance(state, conflict);
      card.classList.toggle('accepted', accepted);
      qs('.callyConflictAcceptanceNote', card)?.remove();
      qs('[data-cally-conflict-accept]', card)?.remove();
      const actions = qs('.callyIssueActions', card);
      if (!actions) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.callyConflictAccept = String(conflict.conflict_id);
      button.className = accepted ? 'callyConflictRevoke' : 'callyConflictAccept';
      button.textContent = accepted ? 'Ångra godkännande' : 'Det här är okej';
      button.addEventListener('click', async event => {
        event.preventDefault();
        event.stopPropagation();
        button.disabled = true;
        try { await setConflictAccepted(conflict, !accepted); }
        catch (error) { button.disabled = false; window.toast?.(error.message || String(error)); }
      });
      actions.appendChild(button);
      if (accepted) {
        const note = document.createElement('small');
        note.className = 'callyConflictAcceptanceNote';
        note.textContent = 'Godkänd samtidighet · konflikten finns kvar i historiken.';
        actions.after(note);
      }
    });
  }

  function restoreOverlapClusters() {
    qsa('.callyOverlapCluster').forEach(cluster => {
      const day = cluster.parentElement;
      if (!day) { cluster.remove(); return; }
      qsa('.event[data-event-id]', cluster).forEach(event => {
        const top = Number.parseFloat(event.dataset.callyOverlapAbsoluteTop || '');
        if (Number.isFinite(top)) event.style.top = `${top}px`;
        event.style.left = '';
        event.style.right = '';
        event.style.width = '';
        event.style.maxWidth = '';
        event.style.scrollSnapAlign = '';
        delete event.dataset.callyOverlapAbsoluteTop;
        day.appendChild(event);
      });
      cluster.remove();
    });
  }

  function assignOverlapColumns(items) {
    const columnEnds = [];
    let maxColumns = 1;
    items.forEach(item => {
      let column = columnEnds.findIndex(end => end <= item.start);
      if (column < 0) column = columnEnds.length;
      columnEnds[column] = item.end;
      item.column = column;
      maxColumns = Math.max(maxColumns, column + 1);
    });
    return maxColumns;
  }

  function layoutTimelineOverlaps(state) {
    restoreOverlapClusters();
    const eventsById = new Map((state.events || []).map(event => [String(event.event_id), event]));
    qsa('.timeline .dayCol[data-drop-date]').forEach(day => {
      day.classList.remove('callyDayHasDenseOverlap');
      const items = [...day.children].filter(element => element.matches?.('.event[data-event-id]')).map(element => {
        const event = eventsById.get(String(element.dataset.eventId));
        const start = event?.start ? new Date(event.start).getTime() : NaN;
        const end = event?.end ? new Date(event.end).getTime() : start;
        const top = Number.parseFloat(element.style.top || '') || element.offsetTop || 0;
        const height = Number.parseFloat(element.style.height || '') || element.offsetHeight || 34;
        return {element,event,start,end:Number.isFinite(end) && end > start ? end : start + 60000,top,height,column:0};
      }).filter(item => Number.isFinite(item.start)).sort((a,b) => a.start - b.start || a.end - b.end);
      if (items.length < 2) return;

      const clusters = [];
      let current = [];
      let currentEnd = -Infinity;
      items.forEach(item => {
        if (current.length && item.start >= currentEnd) {
          clusters.push(current);
          current = [];
          currentEnd = -Infinity;
        }
        current.push(item);
        currentEnd = Math.max(currentEnd, item.end);
      });
      if (current.length) clusters.push(current);

      clusters.filter(cluster => cluster.length > 1).forEach(cluster => {
        const columns = assignOverlapColumns(cluster);
        if (columns <= 1) return;
        const top = Math.min(...cluster.map(item => item.top));
        const bottom = Math.max(...cluster.map(item => item.top + item.height));
        const dayWidth = Math.max(1, day.getBoundingClientRect().width || day.clientWidth || 1);
        const dense = dayWidth / columns < 118;
        const wrapper = document.createElement('div');
        wrapper.className = `callyOverlapCluster${dense ? ' dense' : ''}`;
        wrapper.dataset.overlapCount = String(columns);
        wrapper.setAttribute('aria-label', `${columns} samtidiga händelser`);
        wrapper.style.top = `${top}px`;
        wrapper.style.height = `${Math.max(34, bottom - top)}px`;
        const track = document.createElement('div');
        track.className = 'callyOverlapTrack';
        track.style.height = '100%';
        if (dense) {
          const cardWidth = 126;
          const gap = 6;
          track.style.width = `${Math.max(dayWidth, columns * (cardWidth + gap) + 4)}px`;
          day.classList.add('callyDayHasDenseOverlap');
        }
        wrapper.appendChild(track);
        day.appendChild(wrapper);

        cluster.forEach(item => {
          const element = item.element;
          element.dataset.callyOverlapAbsoluteTop = String(item.top);
          element.style.top = `${item.top - top}px`;
          element.style.right = 'auto';
          element.style.maxWidth = 'none';
          if (dense) {
            element.style.left = `${item.column * 132 + 2}px`;
            element.style.width = '126px';
            element.style.scrollSnapAlign = 'start';
          } else {
            const width = 100 / columns;
            element.style.left = `calc(${item.column * width}% + 3px)`;
            element.style.width = `calc(${width}% - 6px)`;
          }
          track.appendChild(element);
        });
      });
    });
  }

  async function refreshCalendarStatePresentation() {
    const state = await readCalendarState();
    layoutTimelineOverlaps(state);
    decorateAcceptedConflicts(state);
  }

  document.addEventListener('click', event => {
    if (event.target.closest?.('.callyConflictBadge,#callyConflictCounter')) {
      setTimeout(enhanceConflictSheet, 0);
    }
  });

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(refreshCalendarStatePresentation, 80);
  }, {passive:true});
  window.addEventListener('cally-one-ui-refresh', refreshBrandHome);
  window.addEventListener('cally-one-ui-refresh', refreshCalendarStatePresentation);
  window.addEventListener('cally-demo-space-changed', refreshBrandHome);
  window.addEventListener('cally-demo-space-changed', refreshCalendarStatePresentation);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refreshBrandHome, {once:true});
    document.addEventListener('DOMContentLoaded', refreshCalendarStatePresentation, {once:true});
  } else {
    refreshBrandHome();
    refreshCalendarStatePresentation();
  }
})();

/* Interaction integrity pass: real four-way move handle, fully visible event tools,
   and a bounded second UI pass after geometry changes so overlap clusters are
   always rebuilt from the current event times. No inference is started here. */
(() => {
  if (window.__callyInteractionIntegrityV1) return;
  window.__callyInteractionIntegrityV1 = true;

  const qs = (s, root=document) => root.querySelector(s);
  const qsa = (s, root=document) => [...root.querySelectorAll(s)];
  const pad = value => String(value).padStart(2, '0');
  const localIso = date => `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  let moveState = null;
  let followTimer = null;
  let labelTimer = null;
  let projectionRetryBudget = 0;

  function ensureStyles() {
    if (qs('#callyInteractionIntegrityStyles')) return;
    const style = document.createElement('style');
    style.id = 'callyInteractionIntegrityStyles';
    style.textContent = `
      html body #stage .event.callyCompactControls .callyEventActionMenu{
        left:auto!important;right:6px!important;width:max-content!important;max-width:none!important;
        overflow:visible!important;flex-wrap:nowrap!important;pointer-events:auto!important;
      }
      html body #stage .event.callyCompactControls .callyEventActionMenu>*{flex:0 0 26px!important;pointer-events:auto!important}
      html body #stage .event.callyCompactControls .callyEventActionMenu .eventMove{
        display:grid!important;pointer-events:auto!important;cursor:grab!important;touch-action:none!important;
      }
      html body #stage .event.callyCompactControls .callyEventActionMenu .eventMove:active{cursor:grabbing!important}
      html body #stage .timeline .dayCol .callyOverlapCluster:not(.expanded)>.callyOverlapSpread{
        min-width:92px!important;width:auto!important;padding:0 8px!important;gap:5px!important;white-space:nowrap!important;
        display:inline-flex!important;align-items:center!important;justify-content:center!important;
      }
      html body #stage .timeline .dayCol .callyOverlapCluster:not(.expanded)>.callyOverlapSpread span,
      html body #stage .timeline .dayCol .callyOverlapCluster:not(.expanded)>.callyOverlapSpread em{
        font-size:8px!important;line-height:1!important;font-style:normal!important;font-weight:820!important;
      }
      html body #stage .timeline .dayCol .callyOverlapCluster:not(.expanded)>.callyOverlapSpread b{font-size:11px!important;line-height:1!important}
    `;
    document.head.appendChild(style);
  }

  function effectiveLocked(element) {
    const mode = window.__callyGlobalMoveMode?.() || 'free';
    if (mode === 'lock_all') return true;
    if (mode === 'unlock_all') return false;
    return element.classList.contains('locked') || !!qs('[data-pin-event].locked', element);
  }

  async function currentEvent(id) {
    try {
      const response = await fetch('/api/state');
      const state = await response.json();
      return (state.events || []).find(item => String(item.event_id) === String(id)) || null;
    } catch (_) { return null; }
  }

  async function postMove(item, start, end, people) {
    const response = await fetch('/api/event/move', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({event_id:item.event_id,start:localIso(start),end:localIso(end),people}),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
    return body;
  }

  function closeEventMenu(element) {
    const menu = qs('.callyEventActionMenu', element);
    if (menu) menu.hidden = true;
    qs('.callyEventMore', element)?.setAttribute('aria-expanded','false');
  }

  function cleanupMove() {
    const state = moveState;
    if (!state) return;
    state.handle.removeEventListener('pointerup', finishMove);
    state.handle.removeEventListener('pointercancel', cancelMove);
    state.element.classList.remove('dragging');
    state.handle.removeAttribute('aria-grabbed');
    moveState = null;
  }

  function cancelMove() { cleanupMove(); }

  async function finishMove(event) {
    const state = moveState;
    if (!state) return;
    const item = await currentEvent(state.eventId);
    const under = document.elementFromPoint(event.clientX, event.clientY);
    const dateCell = under?.closest?.('[data-drop-date]');
    const personLane = under?.closest?.('[data-drop-person]');
    cleanupMove();
    if (!item || (!dateCell && !personLane)) return;

    let start = new Date(item.start);
    let end = new Date(item.end);
    const duration = Math.max(0, end - start);
    let people = [...(item.people || [])];
    if (dateCell) {
      const parts = String(dateCell.dataset.dropDate || '').split('-').map(Number);
      if (parts.length === 3 && parts.every(Number.isFinite)) {
        start.setFullYear(parts[0], parts[1]-1, parts[2]);
        if (dateCell.classList.contains('dayCol')) {
          const rect = dateCell.getBoundingClientRect();
          const rawMinutes = ((event.clientY - rect.top) / 59.5) * 60;
          const snapped = Math.max(0, Math.min(16 * 60, Math.round(rawMinutes / 15) * 15));
          start.setHours(6 + Math.floor(snapped / 60), snapped % 60, 0, 0);
        }
        end = new Date(start.getTime() + duration);
      }
    }
    if (personLane) people = [String(personLane.dataset.dropPerson || '')].filter(Boolean);

    try {
      await postMove(item, start, end, people);
      await window.load?.();
      requestAnimationFrame(() => window.dispatchEvent(new CustomEvent('cally-one-ui-refresh', {detail:{geometryExplicit:true}})));
      window.toast?.('Händelsen flyttad');
    } catch (error) {
      window.toast?.(error.message || String(error));
      await window.load?.();
    }
  }

  function beginMove(event, handle) {
    if (moveState || (event.button !== undefined && event.button !== 0)) return;
    const element = handle.closest('#stage [data-event-id]');
    if (!element || effectiveLocked(element)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    closeEventMenu(element);
    moveState = {handle, element, eventId:String(element.dataset.eventId || '')};
    element.classList.add('dragging');
    handle.setAttribute('aria-grabbed','true');
    handle.setPointerCapture?.(event.pointerId);
    handle.addEventListener('pointerup', finishMove, {once:true});
    handle.addEventListener('pointercancel', cancelMove, {once:true});
  }

  function decorateOverlapLabels() {
    qsa('.callyOverlapCluster:not(.expanded)>.callyOverlapSpread').forEach(button => {
      const cluster = button.closest('.callyOverlapCluster');
      const count = Math.max(2, Number.parseInt(cluster?.dataset.overlapCount || '2', 10) || 2);
      button.innerHTML = `<span>${count}</span><em>samtidiga</em><b aria-hidden="true">↔</b>`;
      button.title = `Bredda ${count} samtidiga händelser`;
      button.setAttribute('aria-label', button.title);
    });
  }

  function ensureVisibleActions() {
    qsa('#stage .event.callyCompactControls').forEach(element => {
      const move = qs('.callyEventActionMenu .eventMove', element);
      if (move) {
        move.title = 'Flytta mellan dagar och tider';
        move.setAttribute('aria-label', 'Flytta händelse mellan dagar och tider');
      }
    });
  }

  function hasMissingProjectionAction() {
    return qsa('#stage .event.callyCompactControls').some(element => {
      const menu = qs('.callyEventActionMenu', element);
      return !!menu && !qs('.callyEventProjectionAction', menu);
    });
  }

  function scheduleAfterRefresh(isFollowup=false) {
    ensureStyles();
    ensureVisibleActions();
    clearTimeout(labelTimer);
    labelTimer = setTimeout(() => {
      decorateOverlapLabels();
      ensureVisibleActions();
      if (hasMissingProjectionAction() && projectionRetryBudget > 0) {
        projectionRetryBudget -= 1;
        window.dispatchEvent(new CustomEvent('cally-one-ui-refresh', {detail:{callyPostLayout:true,callyProjectionRetry:true}}));
      }
    }, 190);

    if (isFollowup) return;
    projectionRetryBudget = 1;
    clearTimeout(followTimer);
    followTimer = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('cally-one-ui-refresh', {detail:{callyPostLayout:true}}));
    }, 145);
  }

  document.addEventListener('pointerdown', event => {
    const handle = event.target.closest?.('#stage .eventMove');
    if (handle) beginMove(event, handle);
  }, true);

  document.addEventListener('click', event => {
    if (event.target.closest?.('.callyOverlapSpread')) setTimeout(decorateOverlapLabels, 0);
  });

  window.addEventListener('cally-one-ui-refresh', event => {
    scheduleAfterRefresh(Boolean(event.detail?.callyPostLayout));
  });
  window.addEventListener('cally-demo-space-changed', () => scheduleAfterRefresh(false));
  window.addEventListener('resize', () => setTimeout(() => { decorateOverlapLabels(); ensureVisibleActions(); }, 120), {passive:true});

  ensureStyles();
  scheduleAfterRefresh(false);
})();
