/* Cally.One brand/home chrome + dense calendar-state presentation. Never QCDS inference. */
(() => {
  if (window.__callyBrandHomePolish) return;
  window.__callyBrandHomePolish = true;

  const qs = (s, root=document) => root.querySelector(s);
  const qsa = (s, root=document) => [...root.querySelectorAll(s)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

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
