/* Cally.One human planning/conflict completion — product UI only.
   Everything remains represented state; QCDS/SyntractSystem is untouched. */
(() => {
  const qs = (s, root=document) => root.querySelector(s);
  const qsa = (s, root=document) => [...root.querySelectorAll(s)];

  async function json(path, options={}) {
    const response = await fetch(path, options);
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
    return body;
  }

  /* A conflict acceptance relates the clashing event states to each other.
     The affected person/resource lives in dimensions.state_id. Keeping the
     resource out of object_id prevents the acceptance itself from being read
     as another use/reservation of that resource. */
  function installConflictAcceptanceGuard() {
    if (window.fetch.__callyConflictAcceptanceGuard) return;
    const previous = window.fetch.bind(window);
    const wrapped = async function(input, options={}) {
      let nextOptions = options;
      try {
        const url = new URL(typeof input === 'string' ? input : input.url, window.location.href);
        if (url.pathname.endsWith('/api/relation') && String(options.method || 'GET').toUpperCase() === 'POST' && options.body) {
          const body = JSON.parse(options.body);
          if (body?.predicate === 'accepts_conflict' && Array.isArray(body?.dimensions?.event_ids) && body.dimensions.event_ids.length > 1) {
            body.object_id = String(body.dimensions.event_ids[1]);
            nextOptions = {...options, body:JSON.stringify(body)};
          }
        }
      } catch (_) { /* preserve original request */ }
      return previous(input, nextOptions);
    };
    wrapped.__callyConflictAcceptanceGuard = true;
    window.fetch = wrapped;
  }

  async function completePlanningForEvent(eventId, button) {
    if (!eventId) return;
    button.disabled = true;
    const old = button.textContent;
    button.textContent = 'Sparar…';
    try {
      const state = await json('/api/state');
      const planning = (state.planning_states || []).find(item =>
        item.status === 'needs_resolution' && (item.event_ids || []).includes(eventId)
      );
      if (!planning) {
        window.toast?.('Planeringen är redan löst');
        return;
      }
      const eventIds = new Set(planning.event_ids || []);
      const relations = (state.relations || []).filter(relation =>
        eventIds.has(relation.subject_id) &&
        relation.object_id === planning.state_id &&
        ['uses','reserves'].includes(relation.predicate)
      );
      if (!relations.length) throw new Error('Transportkopplingen saknas');
      for (const relation of relations) {
        await json('/api/relation', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            relation_id:relation.relation_id,
            subject_id:relation.subject_id,
            predicate:relation.predicate,
            object_id:relation.object_id,
            dimensions:{...(relation.dimensions || {}), route_status:'resolved', resolved_by:'human'},
          }),
        });
      }
      qs('#callyIssueOverlay')?.classList.remove('open');
      await window.load?.();
      window.toast?.('Transportplanen är markerad som klar');
    } catch (error) {
      window.toast?.(error.message || String(error));
    } finally {
      button.disabled = false;
      button.textContent = old;
    }
  }

  function overlapColumn(event) {
    const stored = Number.parseInt(event.dataset.callyOverlapColumn || '', 10);
    if (Number.isFinite(stored)) return stored;
    const left = Number.parseFloat(event.style.left || '');
    if (!Number.isFinite(left)) return 0;
    return Math.max(0, Math.round((left - 2) / 132));
  }

  function overlapClock(event) {
    const text = qs('small', event)?.textContent || '';
    return text.match(/\b\d{1,2}:\d{2}\b/)?.[0] || '';
  }

  function ensureOverlapTiming(cluster) {
    const clusterTop = Number.parseFloat(cluster.style.top || '') || 0;
    qsa('.event[data-event-id]', cluster).forEach(event => {
      let relative = Number.parseFloat(event.dataset.callyOverlapTimedTop || '');
      if (!Number.isFinite(relative)) {
        const absolute = Number.parseFloat(event.dataset.callyOverlapAbsoluteTop || '');
        const current = Number.parseFloat(event.style.top || '');
        relative = Number.isFinite(absolute) ? absolute - clusterTop : (Number.isFinite(current) ? current : 0);
        event.dataset.callyOverlapTimedTop = String(relative);
      }
      event.style.top = `${relative}px`;
    });
  }

  function ensureOverlapPeek(event, column) {
    qs('.callyOverlapPeek', event)?.remove();
    if (column <= 0) return;
    const clock = overlapClock(event);
    if (!clock) return;
    const peek = document.createElement('span');
    peek.className = 'callyOverlapPeek';
    peek.textContent = clock;
    peek.setAttribute('aria-hidden', 'true');
    event.appendChild(peek);
  }

  function updateOverlapProgress(cluster) {
    const progress = qs('.callyOverlapProgress', cluster);
    if (!progress) return;
    const thumb = qs('.callyOverlapProgressThumb', progress);
    const label = qs('.callyOverlapProgressLabel', progress);
    const count = Math.max(2, Number.parseInt(cluster.dataset.overlapCount || '2', 10) || 2);
    const max = Math.max(0, cluster.scrollWidth - cluster.clientWidth);
    const ratio = max > 0 ? Math.max(0, Math.min(1, cluster.scrollLeft / max)) : 0;
    const visibleRatio = cluster.scrollWidth > 0 ? Math.max(.08, Math.min(1, cluster.clientWidth / cluster.scrollWidth)) : 1;
    if (thumb) {
      thumb.style.width = `${visibleRatio * 100}%`;
      thumb.style.left = `${ratio * (100 - visibleRatio * 100)}%`;
    }
    if (label) {
      const visible = Math.max(1, Math.min(count, Math.round(count * visibleRatio)));
      const first = Math.min(count, Math.max(1, Math.round((count - visible) * ratio) + 1));
      label.textContent = `${first}–${Math.min(count, first + visible - 1)} / ${count}`;
    }
    progress.hidden = max <= 3;
  }

  function ensureOverlapProgress(cluster) {
    let progress = qs('.callyOverlapProgress', cluster);
    if (!progress) {
      progress = document.createElement('div');
      progress.className = 'callyOverlapProgress';
      progress.innerHTML = '<span class="callyOverlapProgressRail"><i class="callyOverlapProgressThumb"></i></span><small class="callyOverlapProgressLabel"></small>';
      cluster.appendChild(progress);
    }
    if (cluster.dataset.callyOverlapProgressBound !== '1') {
      cluster.dataset.callyOverlapProgressBound = '1';
      cluster.addEventListener('scroll', () => requestAnimationFrame(() => updateOverlapProgress(cluster)), {passive:true});
    }
    requestAnimationFrame(() => updateOverlapProgress(cluster));
  }

  function applyCollapsedOverlap(cluster) {
    const track = qs('.callyOverlapTrack', cluster);
    const events = track ? qsa('.event[data-event-id]', track) : [];
    if (!track || events.length < 2) return;
    const columns = Math.max(2, Number.parseInt(cluster.dataset.overlapCount || '2', 10) || 2);
    const dayWidth = Math.max(1, cluster.parentElement?.getBoundingClientRect().width || cluster.clientWidth || 1);
    const reveal = Math.max(46, Math.min(72, Math.round(dayWidth * .24)));
    const cardWidth = dayWidth - reveal * (columns - 1) - 6;
    const fan = columns <= 3 && cardWidth >= 108;

    ensureOverlapTiming(cluster);
    cluster.classList.add('callyOverlapFan');
    cluster.classList.toggle('rail', !fan);
    cluster.classList.remove('expanded');
    cluster.style.removeProperty('--cally-overlap-expanded-left');
    cluster.style.removeProperty('--cally-overlap-expanded-width');
    cluster.scrollLeft = 0;

    if (fan) {
      track.style.setProperty('--cally-overlap-track-width', '100%');
      events.forEach(event => {
        const column = overlapColumn(event);
        event.dataset.callyOverlapColumn = String(column);
        event.style.setProperty('--cally-overlap-left', `${2 + column * reveal}px`);
        event.style.setProperty('--cally-overlap-width', `${Math.max(108, cardWidth)}px`);
        event.style.setProperty('--cally-overlap-z', String(40 - column));
        ensureOverlapPeek(event, column);
      });
    } else {
      const width = Math.max(112, Math.min(156, Math.round(dayWidth * .78)));
      const step = Math.max(74, Math.round(width * .72));
      track.style.setProperty('--cally-overlap-track-width', `${Math.max(dayWidth, step * (columns - 1) + width + 6)}px`);
      events.forEach(event => {
        const column = overlapColumn(event);
        event.dataset.callyOverlapColumn = String(column);
        event.style.setProperty('--cally-overlap-left', `${2 + column * step}px`);
        event.style.setProperty('--cally-overlap-width', `${width}px`);
        event.style.setProperty('--cally-overlap-z', String(20 + column));
        ensureOverlapPeek(event, column);
      });
    }
    ensureOverlapProgress(cluster);
  }

  function applyExpandedOverlap(cluster) {
    const track = qs('.callyOverlapTrack', cluster);
    const events = track ? qsa('.event[data-event-id]', track) : [];
    if (!track || !events.length) return;
    const columns = Math.max(2, Number.parseInt(cluster.dataset.overlapCount || '2', 10) || 2);
    const dayRect = cluster.parentElement?.getBoundingClientRect();
    if (!dayRect) return;
    const edge = 8;
    const cardWidth = 154;
    const step = 162;
    const desired = Math.min(window.innerWidth - edge * 2, Math.max(dayRect.width, Math.min(columns, 4) * step + 8));
    let left = 0;
    if (dayRect.left + desired > window.innerWidth - edge) left = window.innerWidth - edge - dayRect.left - desired;
    if (dayRect.left + left < edge) left = edge - dayRect.left;

    ensureOverlapTiming(cluster);
    cluster.classList.add('callyOverlapFan', 'expanded');
    cluster.classList.remove('rail');
    cluster.style.setProperty('--cally-overlap-expanded-left', `${left}px`);
    cluster.style.setProperty('--cally-overlap-expanded-width', `${desired}px`);
    track.style.setProperty('--cally-overlap-track-width', `${Math.max(desired, columns * step + 8)}px`);
    events.forEach(event => {
      const column = overlapColumn(event);
      event.dataset.callyOverlapColumn = String(column);
      event.style.setProperty('--cally-overlap-left', `${4 + column * step}px`);
      event.style.setProperty('--cally-overlap-width', `${cardWidth}px`);
      event.style.setProperty('--cally-overlap-z', String(20 + column));
      qs('.callyOverlapPeek', event)?.remove();
    });
    ensureOverlapProgress(cluster);
  }

  function overlapExplorerRows(cluster) {
    return qsa('.event[data-event-id]', cluster).map(event => ({
      element:event,
      eventId:String(event.dataset.eventId || ''),
      title:(qs('b', event)?.textContent || qs('.eventTitle', event)?.textContent || 'Händelse').trim(),
      meta:(qs('small', event)?.textContent || '').trim(),
      time:overlapClock(event),
      top:Number.parseFloat(event.dataset.callyOverlapTimedTop || event.style.top || '0') || 0,
    })).sort((a,b) => a.top - b.top || a.title.localeCompare(b.title, 'sv'));
  }

  function openOverlapExplorer(cluster) {
    const rows = overlapExplorerRows(cluster);
    if (!rows.length) return;
    let overlay = qs('#callyOverlapExplorer');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'callyOverlapExplorer';
      overlay.className = 'callyOverlapExplorer';
      overlay.innerHTML = '<section class="callyOverlapExplorerSheet" role="dialog" aria-modal="true" aria-label="Utforska samtidiga händelser"></section>';
      document.body.appendChild(overlay);
      overlay.addEventListener('click', event => { if (event.target === overlay) overlay.classList.remove('open'); });
    }
    const sheet = qs('.callyOverlapExplorerSheet', overlay);
    let page = 0;
    const pageSize = 60;
    let query = '';

    const render = () => {
      const filtered = rows.filter(row => !query || `${row.title} ${row.meta} ${row.time}`.toLowerCase().includes(query));
      const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
      page = Math.max(0, Math.min(page, pages - 1));
      const visible = filtered.slice(page * pageSize, page * pageSize + pageSize);
      sheet.innerHTML = `<div class="callyOverlapExplorerHead"><div><small>SAMTIDIGHET · DJUPVY</small><h2>${rows.length} samtidiga händelser</h2><p>Filtrera och utforska utan att lämna kalenderns tidsposition.</p></div><button type="button" data-overlap-explorer-close aria-label="Stäng">×</button></div><div class="callyOverlapExplorerTools"><label><span>Sök</span><input data-overlap-explorer-search value="${query.replace(/"/g,'&quot;')}" placeholder="Person, plats, händelse …"></label><div class="callyOverlapExplorerPager"><button type="button" data-overlap-page="prev" ${page<=0?'disabled':''}>‹</button><span>${filtered.length ? page * pageSize + 1 : 0}–${Math.min(filtered.length,(page+1)*pageSize)} / ${filtered.length}</span><button type="button" data-overlap-page="next" ${page>=pages-1?'disabled':''}>›</button></div></div><div class="callyOverlapExplorerList">${visible.map((row,index)=>`<button type="button" class="callyOverlapExplorerRow" data-overlap-row="${page*pageSize+index}"><time>${row.time || '—'}</time><span><b>${row.title}</b><small>${row.meta}</small></span><i>Visa</i></button>`).join('')}</div>`;
      qs('[data-overlap-explorer-close]', sheet)?.addEventListener('click', () => overlay.classList.remove('open'));
      const search = qs('[data-overlap-explorer-search]', sheet);
      search?.addEventListener('input', () => { query = search.value.trim().toLowerCase(); page = 0; render(); requestAnimationFrame(()=>qs('[data-overlap-explorer-search]', sheet)?.focus()); });
      qs('[data-overlap-page="prev"]', sheet)?.addEventListener('click', () => { page -= 1; render(); });
      qs('[data-overlap-page="next"]', sheet)?.addEventListener('click', () => { page += 1; render(); });
      qsa('[data-overlap-row]', sheet).forEach((button,index) => button.addEventListener('click', () => {
        const target = visible[index]?.element;
        overlay.classList.remove('open');
        if (!target) return;
        target.scrollIntoView({block:'center', inline:'center', behavior:'smooth'});
        target.classList.add('callyOverlapLocate');
        setTimeout(() => target.classList.remove('callyOverlapLocate'), 900);
      }));
    };
    render();
    overlay.classList.add('open');
    requestAnimationFrame(() => qs('[data-overlap-explorer-search]', sheet)?.focus());
  }

  function ensureOverlapDeepButton(cluster) {
    const columns = Math.max(2, Number.parseInt(cluster.dataset.overlapCount || '2', 10) || 2);
    let button = qs('.callyOverlapDeep', cluster);
    if (columns < 6) {
      button?.remove();
      return;
    }
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'callyOverlapDeep';
      button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="5.5"></circle><path d="M14.5 14.5L20 20"></path></svg><span>Djupvy</span>';
      button.title = 'Utforska alla samtidiga händelser';
      button.setAttribute('aria-label', button.title);
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        openOverlapExplorer(cluster);
      });
      cluster.appendChild(button);
    }
    button.hidden = !cluster.classList.contains('expanded');
  }

  function ensureOverlapSpreadButton(cluster) {
    let button = qs('.callyOverlapSpread', cluster);
    const columns = Math.max(2, Number.parseInt(cluster.dataset.overlapCount || '2', 10) || 2);
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'callyOverlapSpread';
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        if (cluster.classList.contains('expanded')) applyCollapsedOverlap(cluster);
        else applyExpandedOverlap(cluster);
        ensureOverlapSpreadButton(cluster);
        ensureOverlapDeepButton(cluster);
        ensureOverlapProgress(cluster);
      });
      cluster.appendChild(button);
    }
    const expanded = cluster.classList.contains('expanded');
    button.innerHTML = expanded ? `<span>${columns}</span><b>⇥⇤</b><em>Fäll ihop</em>` : `<span>${columns}</span><b>↔</b>`;
    button.title = expanded ? 'Fäll ihop samtidiga händelser' : 'Bredda samtidiga händelser';
    button.setAttribute('aria-label', button.title);
    button.setAttribute('aria-expanded', String(expanded));
  }

  function enhanceOverlapFans() {
    qsa('.callyOverlapCluster.dense').forEach(cluster => {
      ensureOverlapTiming(cluster);
      if (!cluster.classList.contains('expanded')) applyCollapsedOverlap(cluster);
      ensureOverlapSpreadButton(cluster);
      ensureOverlapDeepButton(cluster);
      ensureOverlapProgress(cluster);
    });
  }

  let overlapTimer = null;
  function scheduleOverlapFans(delay=36) {
    clearTimeout(overlapTimer);
    requestAnimationFrame(() => {
      overlapTimer = setTimeout(enhanceOverlapFans, delay);
    });
  }

  function enhancePlanningCards() {
    qsa('.callyIssueCard.planning').forEach(card => {
      if (card.dataset.humanResolve === '1') return;
      const edit = qs('[data-edit-event]', card);
      const actions = qs('.callyIssueActions', card);
      if (!edit || !actions) return;
      card.dataset.humanResolve = '1';
      const done = document.createElement('button');
      done.type = 'button';
      done.className = 'callyHumanResolved';
      done.textContent = 'Markera som löst';
      done.title = 'Använd när du själv har bestämt bil, passagerare, tider eller annan transportinformation';
      done.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        completePlanningForEvent(edit.dataset.editEvent, done);
      });
      actions.insertBefore(done, actions.querySelector('span'));
    });
    scheduleOverlapFans();
  }

  document.addEventListener('click', event => {
    if (event.target.closest?.('#callyOverlapExplorer')) return;
    if (event.target.closest?.('.callyOverlapCluster.expanded')) return;
    qsa('.callyOverlapCluster.expanded').forEach(cluster => {
      applyCollapsedOverlap(cluster);
      ensureOverlapSpreadButton(cluster);
      ensureOverlapDeepButton(cluster);
    });
  });
  window.addEventListener('resize', () => scheduleOverlapFans(110), {passive:true});

  function boot() {
    installConflictAcceptanceGuard();
    const observer = new MutationObserver(enhancePlanningCards);
    observer.observe(document.body, {childList:true, subtree:true});
    enhancePlanningCards();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();