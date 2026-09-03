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
  }

  function boot() {
    installConflictAcceptanceGuard();
    const observer = new MutationObserver(enhancePlanningCards);
    observer.observe(document.body, {childList:true, subtree:true});
    enhancePlanningCards();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
