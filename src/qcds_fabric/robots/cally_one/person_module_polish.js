/* Cally.One Person module — compact expandable projection, no inference. */
(() => {
  if (window.__callyPersonModulePolish) return;
  window.__callyPersonModulePolish = true;

  const qs = (s, root=document) => root.querySelector(s);
  const qsa = (s, root=document) => [...root.querySelectorAll(s)];

  function decoratePersonModule() {
    const lanes = qs('#stage .personLanes');
    if (!lanes) return;

    if (!qs('.callyPersonModuleHead', lanes)) {
      const head = document.createElement('div');
      head.className = 'callyPersonModuleHead';
      head.innerHTML = '<div><div class="callyPersonModuleEyebrow">PERSON SPACE</div><h2>Personer</h2><p>Välj en person för att visa händelser i den aktuella kalenderprojektionen.</p></div>';
      lanes.prepend(head);
    }

    qsa('.lane[data-drop-person]', lanes).forEach((lane, index) => {
      if (lane.dataset.callyPersonModule === '1') return;
      lane.dataset.callyPersonModule = '1';
      lane.dataset.expanded = '0';

      const nameBox = qs('.laneName', lane);
      const events = qs('.laneEvents', lane);
      if (!nameBox || !events) return;

      const name = nameBox.textContent.trim() || 'Person';
      const eventCount = qsa('.laneCard', events).length;
      const initial = name.slice(0, 1).toUpperCase();
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'callyPersonToggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.innerHTML = `<span class="callyPersonInitial" aria-hidden="true">${initial}</span><span class="callyPersonIdentity"><strong></strong><small></small></span><span class="callyPersonCount"></span><span class="callyPersonChevron" aria-hidden="true">⌄</span>`;
      qs('strong', toggle).textContent = name;
      qs('small', toggle).textContent = eventCount ? 'Aktuell kalender' : 'Inga händelser i aktuell vy';
      qs('.callyPersonCount', toggle).textContent = eventCount ? `${eventCount} ${eventCount === 1 ? 'händelse' : 'händelser'}` : 'Tomt';

      nameBox.replaceWith(toggle);
      events.id = `cally-person-events-${index}`;
      events.hidden = true;
      toggle.setAttribute('aria-controls', events.id);
      toggle.addEventListener('click', () => {
        const open = lane.dataset.expanded !== '1';
        lane.dataset.expanded = open ? '1' : '0';
        toggle.setAttribute('aria-expanded', String(open));
        events.hidden = !open;
      });
    });
  }

  window.addEventListener('cally-one-ui-refresh', decoratePersonModule);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', decoratePersonModule, {once:true});
  else decoratePersonModule();
})();
