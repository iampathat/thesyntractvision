/* Cally.One human planning completion — product UI only.
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
    const observer = new MutationObserver(enhancePlanningCards);
    observer.observe(document.body, {childList:true, subtree:true});
    enhancePlanningCards();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
