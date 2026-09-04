/* Cally.One human planning/conflict completion — product UI only.
   Everything remains represented state; QCDS/SyntractSystem is untouched. */
(() => {
  const qs = (s, root=document) => root.querySelector(s);
  const qsa = (s, root=document) => [...root.querySelectorAll(s)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

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
      const absolute = Number.parseFloat(event.dataset.callyOverlapAbsoluteTop || '');
      const current = Number.parseFloat(event.style.top || '');
      const relative = Number.isFinite(absolute)
        ? absolute - clusterTop
        : (Number.isFinite(current) ? current : Number.parseFloat(event.dataset.callyOverlapTimedTop || '0') || 0);
      event.dataset.callyOverlapTimedTop = String(relative);
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

  function clearOverlapLanes(cluster) {
    qsa('.callyOverlapLane', cluster).forEach(node => node.remove());
  }

  function ensureOverlapLanes(cluster, columns, cardWidth, step) {
    clearOverlapLanes(cluster);
    const track = qs('.callyOverlapTrack', cluster);
    if (!track) return;
    for (let column = 0; column < columns; column += 1) {
      const lane = document.createElement('span');
      lane.className = 'callyOverlapLane';
      lane.style.left = `${4 + column * step}px`;
      lane.style.width = `${cardWidth}px`;
      lane.setAttribute('aria-hidden', 'true');
      track.prepend(lane);
    }
  }

  function updateOverlapProgress(cluster) {
    const progress = qs('.callyOverlapProgress', cluster);
    if (!progress) return;
    const thumb = qs('.callyOverlapProgressThumb', progress);
    const label = qs('.callyOverlapProgressLabel', progress);
    const count = Math.max(2, Number.parseInt(cluster.dataset.overlapCount || '2', 10) || 2);
    const max = Math.max(0, cluster.scrollWidth - cluster.clientWidth);
    const ratio = max > 0 ? Math.max(0, Math.min(1, cluster.scrollLeft / max)) : 0;
    const visibleRatio = cluster.scrollWidth > 0 ? Math.max(.06, Math.min(1, cluster.clientWidth / cluster.scrollWidth)) : 1;
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
    clearOverlapLanes(cluster);
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
    const available = Math.max(260, window.innerWidth - edge * 2);
    const desired = Math.min(available, Math.max(dayRect.width, Math.min(columns, 4) * 150 + 14));
    let left = 0;
    if (dayRect.left + desired > window.innerWidth - edge) left = window.innerWidth - edge - dayRect.left - desired;
    if (dayRect.left + left < edge) left = edge - dayRect.left;

    const gap = 6;
    const visibleColumns = Math.max(2, Math.min(columns, Math.floor((desired - 14) / 132)));
    const cardWidth = Math.max(126, Math.floor((desired - 12 - gap * (visibleColumns - 1)) / visibleColumns));
    const step = cardWidth + gap;

    ensureOverlapTiming(cluster);
    cluster.classList.add('callyOverlapFan', 'expanded');
    cluster.classList.remove('rail');
    cluster.style.setProperty('--cally-overlap-expanded-left', `${left}px`);
    cluster.style.setProperty('--cally-overlap-expanded-width', `${desired}px`);
    track.style.setProperty('--cally-overlap-track-width', `${Math.max(desired, columns * step + 8)}px`);
    ensureOverlapLanes(cluster, columns, cardWidth, step);
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
      column:overlapColumn(event),
      title:(qs('b', event)?.textContent || qs('.eventTitle', event)?.textContent || 'Händelse').trim(),
      meta:(qs('small', event)?.textContent || '').trim(),
      time:overlapClock(event),
      top:Number.parseFloat(event.dataset.callyOverlapTimedTop || event.style.top || '0') || 0,
      height:Math.max(30, Number.parseFloat(event.style.height || '') || event.offsetHeight || 34),
    })).sort((a,b) => a.column - b.column || a.top - b.top || a.title.localeCompare(b.title, 'sv'));
  }

  function openOverlapExplorer(cluster) {
    const rows = overlapExplorerRows(cluster);
    if (!rows.length) return;
    let overlay = qs('#callyOverlapExplorer');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'callyOverlapExplorer';
      overlay.className = 'callyOverlapExplorer';
      overlay.innerHTML = '<section class="callyOverlapExplorerSheet" role="dialog" aria-modal="true" aria-label="Zooma samtidiga händelser"></section>';
      document.body.appendChild(overlay);
      overlay.addEventListener('click', event => { if (event.target === overlay) overlay.classList.remove('open'); });
    }
    const sheet = qs('.callyOverlapExplorerSheet', overlay);
    const pageSize = 80;
    let page = 0;
    let query = '';
    let zoom = 1;

    const clampZoom = value => Math.max(.45, Math.min(1.9, value));
    const filteredRows = () => rows.filter(row => !query || `${row.title} ${row.meta} ${row.time}`.toLowerCase().includes(query));

    const renderBoard = () => {
      const filtered = filteredRows();
      const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
      page = Math.max(0, Math.min(page, pages - 1));
      const visible = filtered.slice(page * pageSize, page * pageSize + pageSize);
      const viewport = qs('.callyOverlapZoomViewport', sheet);
      const board = qs('.callyOverlapZoomBoard', sheet);
      const zoomLabel = qs('[data-overlap-zoom-label]', sheet);
      const pager = qs('[data-overlap-page-label]', sheet);
      if (!viewport || !board) return;

      const baseWidth = 150;
      const cardWidth = Math.round(baseWidth * zoom);
      const step = cardWidth + 8;
      const minTop = visible.length ? Math.min(...visible.map(row => row.top)) : 0;
      const maxBottom = visible.length ? Math.max(...visible.map(row => row.top + row.height)) : 220;
      board.style.width = `${Math.max(viewport.clientWidth - 2, visible.length * step + 16)}px`;
      board.style.height = `${Math.max(250, maxBottom - minTop + 70)}px`;
      board.innerHTML = visible.map((row,index) => {
        const top = Math.max(12, row.top - minTop + 34);
        return `<button type="button" class="callyOverlapZoomCard" data-overlap-zoom-row="${index}" style="left:${8 + index * step}px;top:${top}px;width:${cardWidth}px;height:${Math.max(34,row.height)}px"><time>${esc(row.time || '—')}</time><b>${esc(row.title)}</b><small>${esc(row.meta)}</small></button>`;
      }).join('');
      qsa('[data-overlap-zoom-row]', board).forEach((button,index) => button.addEventListener('click', () => {
        const target = visible[index]?.element;
        overlay.classList.remove('open');
        if (!target) return;
        target.scrollIntoView({block:'center', inline:'center', behavior:'smooth'});
        target.classList.add('callyOverlapLocate');
        setTimeout(() => target.classList.remove('callyOverlapLocate'), 900);
      }));
      if (zoomLabel) zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
      if (pager) pager.textContent = `${filtered.length ? page * pageSize + 1 : 0}–${Math.min(filtered.length,(page+1)*pageSize)} / ${filtered.length}`;
      const prev = qs('[data-overlap-page="prev"]', sheet);
      const next = qs('[data-overlap-page="next"]', sheet);
      if (prev) prev.disabled = page <= 0;
      if (next) next.disabled = page >= pages - 1;
    };

    const renderShell = () => {
      sheet.innerHTML = `<div class="callyOverlapExplorerHead"><button type="button" class="callyOverlapBack" data-overlap-explorer-back>← Återgå</button><div><small>SAMTIDIGHET · ZOOM</small><h2>${rows.length} samtidiga händelser</h2><p>Pinch med två fingrar eller använd − / +. Korten ligger kvar på sina riktiga tider.</p></div><button type="button" class="callyOverlapExplorerX" data-overlap-explorer-close aria-label="Stäng">×</button></div><div class="callyOverlapExplorerTools"><label class="callyOverlapSearch"><span>Sök</span><input data-overlap-explorer-search value="${esc(query)}" placeholder="Person, plats, händelse …"></label><div class="callyOverlapZoomControls" aria-label="Zoom"><button type="button" data-overlap-zoom="out" aria-label="Zooma ut">−</button><span data-overlap-zoom-label>100%</span><button type="button" data-overlap-zoom="in" aria-label="Zooma in">+</button></div><div class="callyOverlapExplorerPager"><button type="button" data-overlap-page="prev" aria-label="Föregående grupp">‹</button><span data-overlap-page-label></span><button type="button" data-overlap-page="next" aria-label="Nästa grupp">›</button></div></div><div class="callyOverlapZoomViewport"><div class="callyOverlapZoomBoard"></div></div>`;
      qs('[data-overlap-explorer-back]', sheet)?.addEventListener('click', () => overlay.classList.remove('open'));
      qs('[data-overlap-explorer-close]', sheet)?.addEventListener('click', () => overlay.classList.remove('open'));
      const search = qs('[data-overlap-explorer-search]', sheet);
      search?.addEventListener('input', () => { query = search.value.trim().toLowerCase(); page = 0; renderBoard(); });
      qs('[data-overlap-page="prev"]', sheet)?.addEventListener('click', () => { page -= 1; renderBoard(); });
      qs('[data-overlap-page="next"]', sheet)?.addEventListener('click', () => { page += 1; renderBoard(); });
      qs('[data-overlap-zoom="out"]', sheet)?.addEventListener('click', () => { zoom = clampZoom(zoom - .15); renderBoard(); });
      qs('[data-overlap-zoom="in"]', sheet)?.addEventListener('click', () => { zoom = clampZoom(zoom + .15); renderBoard(); });

      const viewport = qs('.callyOverlapZoomViewport', sheet);
      if (viewport) {
        let pinchStart = 0;
        let pinchZoom = zoom;
        const distance = touches => {
          const a = touches[0], b = touches[1];
          return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        };
        viewport.addEventListener('touchstart', event => {
          if (event.touches.length !== 2) return;
          pinchStart = distance(event.touches);
          pinchZoom = zoom;
        }, {passive:true});
        viewport.addEventListener('touchmove', event => {
          if (event.touches.length !== 2 || !pinchStart) return;
          event.preventDefault();
          zoom = clampZoom(pinchZoom * (distance(event.touches) / pinchStart));
          renderBoard();
        }, {passive:false});
        viewport.addEventListener('touchend', event => { if (event.touches.length < 2) pinchStart = 0; }, {passive:true});
        viewport.addEventListener('wheel', event => {
          if (!(event.ctrlKey || event.metaKey)) return;
          event.preventDefault();
          zoom = clampZoom(zoom + (event.deltaY < 0 ? .12 : -.12));
          renderBoard();
        }, {passive:false});
      }
      renderBoard();
    };

    renderShell();
    overlay.classList.add('open');
  }

  function ensureOverlapDeepButton(cluster) {
    let button = qs('.callyOverlapDeep', cluster);
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'callyOverlapDeep';
      button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="5.5"></circle><path d="M14.5 14.5L20 20"></path><path d="M10.5 8v5M8 10.5h5"></path></svg><span>Zoom</span>';
      button.title = 'Zooma och utforska samtidiga händelser';
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
    button.innerHTML = expanded ? `<b>←</b><em>Fäll ihop</em>` : `<span>${columns}</span><b>↔</b>`;
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
