/* Cally.One customer presentation for QCDS results — presentation only.
   The inference motor remains SyntractSystem -> shared QCDS core. */
(() => {
  const box = () => document.querySelector('#qcdsBox');
  const locale = () => String(navigator.language || 'en').toLowerCase().startsWith('sv') ? 'sv-SE' : 'en-GB';
  const isSv = () => locale().startsWith('sv');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));

  function shiftMinutes(value) {
    const text = String(value || '').trim().toLowerCase();
    if (text === 'shift-zero') return 0;
    const match = text.match(/^shift-(minus|plus)-(\d+)$/);
    if (!match) return null;
    const minutes = Number(match[2]);
    return match[1] === 'minus' ? -minutes : minutes;
  }

  function offsetLabel(minutes) {
    if (minutes === 0) return isSv() ? 'Som nu' : 'Current time';
    const abs = Math.abs(minutes);
    const direction = minutes < 0 ? (isSv() ? 'tidigare' : 'earlier') : (isSv() ? 'senare' : 'later');
    if (abs % 60 === 0) {
      const hours = abs / 60;
      if (isSv()) return `${hours} ${hours === 1 ? 'timme' : 'timmar'} ${direction}`;
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${direction}`;
    }
    return `${abs} ${isSv() ? 'minuter' : 'minutes'} ${direction}`;
  }

  function candidateTime(base, minutes) {
    const date = new Date(base.getTime() + minutes * 60000);
    return new Intl.DateTimeFormat(locale(), {
      weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'
    }).format(date);
  }

  function humanizeQcdsResult() {
    const root = box();
    const result = root?.querySelector('.qcds:not([data-cally-humanized])');
    if (!result) return;

    const header = result.querySelector(':scope > b')?.textContent?.trim() || '';
    const technicalNote = result.querySelector(':scope > .tiny')?.textContent?.trim() || '';
    const rows = [...result.querySelectorAll('.qrow')].map(row => {
      const raw = row.querySelector('span')?.textContent?.trim() || '';
      const percentText = row.querySelector('b')?.textContent?.trim() || '0';
      const percent = Number.parseFloat(percentText.replace(',', '.')) || 0;
      return {raw, percent, minutes:shiftMinutes(raw)};
    }).filter(item => item.minutes !== null);

    if (!rows.length) {
      result.dataset.callyHumanized = '1';
      return;
    }

    const startInput = document.querySelector('#fStart')?.value;
    const base = startInput ? new Date(startInput) : null;
    if (!base || Number.isNaN(base.getTime())) {
      result.dataset.callyHumanized = '1';
      return;
    }

    rows.sort((a,b) => a.minutes - b.minutes);
    const values = rows.map(row => row.percent);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const equal = Math.abs(max - min) < 0.15;
    const best = rows.filter(row => Math.abs(row.percent - max) < 0.15);

    const title = equal
      ? (isSv() ? 'Alla tider funkar lika bra' : 'All these times work equally well')
      : best.length === 1
        ? (isSv() ? `${candidateTime(base, best[0].minutes)} passar bäst` : `${candidateTime(base, best[0].minutes)} works best`)
        : (isSv() ? 'Flera tider passar lika bra' : 'Several times work equally well');

    const intro = equal
      ? (isSv()
          ? 'Ingen av de här tiderna är bättre eller sämre än de andra utifrån det som finns i kalendern.'
          : 'None of these times is better or worse than the others based on what is in the calendar.')
      : (isSv()
          ? 'Här är tiderna som passar bäst ihop med resten av kalendern.'
          : 'These are the times that fit best with the rest of the calendar.');

    const options = rows.map(row => {
      const strongest = !equal && Math.abs(row.percent - max) < 0.15;
      const badge = equal
        ? (isSv() ? 'Funkar lika bra' : 'Works equally well')
        : strongest
          ? (isSv() ? 'Bäst' : 'Best')
          : (isSv() ? 'Funkar' : 'Works');
      const relative = max > 0 ? Math.max(8, Math.round((row.percent / max) * 100)) : 8;
      return `<div class="qcdsChoice ${strongest ? 'best' : ''}">
        <div class="qcdsChoiceTime"><b>${esc(candidateTime(base, row.minutes))}</b><small>${esc(offsetLabel(row.minutes))}</small></div>
        ${equal ? '' : `<div class="qcdsChoiceBar" aria-hidden="true"><i style="width:${relative}%"></i></div>`}
        <span class="qcdsChoiceBadge">${esc(badge)}</span>
      </div>`;
    }).join('');

    const technicalRows = rows.map(row => `${row.raw}: ${row.percent.toFixed(1)}%`).join(' · ');
    result.dataset.callyHumanized = '1';
    result.classList.add('qcdsHuman');
    result.innerHTML = `
      <div class="qcdsHumanHead"><div><b>${esc(title)}</b><p>${esc(intro)}</p></div></div>
      <div class="qcdsChoices">${options}</div>
      <details class="qcdsTech"><summary>${isSv() ? 'Tekniska detaljer' : 'Technical details'}</summary>
        <div><b>${isSv() ? 'Motor' : 'Engine'}:</b> SyntractSystem → shared QCDS core</div>
        <div>${esc(header)}</div>
        ${technicalNote ? `<div>${esc(technicalNote)}</div>` : ''}
        <div><b>TruthDistribution:</b> ${esc(technicalRows)}</div>
      </details>`;
  }

  function setActionLabel() {
    const button = document.querySelector('#inferBtn');
    if (!button) return;
    const label = isSv() ? 'Kolla tider' : 'Check times';
    if (button.textContent !== label) button.textContent = label;
    button.title = isSv()
      ? 'Jämför tider mot resten av kalendern'
      : 'Compare times against the rest of the calendar';
  }

  function boot() {
    setActionLabel();
    const target = box();
    if (!target) return setTimeout(boot, 40);
    const observer = new MutationObserver(() => {
      humanizeQcdsResult();
      setActionLabel();
    });
    observer.observe(target, {childList:true, subtree:true});
    humanizeQcdsResult();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();

/* Cally.One semantic lock + overlap zoom polish.
   Pure UI projection: it never mutates event pin state and never starts QCDS. */
(() => {
  if (window.__callySemanticLockZoomPolish) return;
  window.__callySemanticLockZoomPolish = true;

  const qs = (s, root=document) => root.querySelector(s);
  const qsa = (s, root=document) => [...root.querySelectorAll(s)];
  const OPEN_LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="10.5" width="11" height="9" rx="2" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M9 10.5V7.8c0-2.3 1.5-3.8 3.7-3.8 1.5 0 2.7.7 3.4 1.8" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><circle cx="12" cy="15" r="1" fill="currentColor"/></svg>';
  const CLOSED_LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="10.5" width="11" height="9" rx="2" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M9 10.5V7.7a3 3 0 0 1 6 0v2.8" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><circle cx="12" cy="15" r="1" fill="currentColor"/></svg>';

  function ensureStyles() {
    if (qs('#callySemanticLockZoomStyles')) return;
    const style = document.createElement('style');
    style.id = 'callySemanticLockZoomStyles';
    style.textContent = `
      #callyMoveOverrideBar button{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:5px!important}
      #callyMoveOverrideBar .callyMoveLockGlyph{width:14px!important;height:14px!important;display:grid!important;place-items:center!important;flex:0 0 14px!important}
      #callyMoveOverrideBar .callyMoveLockGlyph svg{display:block!important;width:14px!important;height:14px!important;overflow:visible!important}
      #callyMoveOverrideBar [data-move-override="free"] .callyMoveLockGlyph{color:#7d8781!important}
      #callyMoveOverrideBar [data-move-override="unlock_all"] .callyMoveLockGlyph,
      #callyMoveOverrideBar [data-move-override="lock_all"] .callyMoveLockGlyph{color:#b58a18!important}
      #callyMoveOverrideBar button[aria-pressed="true"]{background:#edf4ef!important;border-color:#8eac9d!important;color:#173126!important;box-shadow:inset 0 -2px 0 var(--green,#087b58)!important}
      #callyMoveOverrideBar button[aria-pressed="true"] .callyMoveLockGlyph{filter:none!important}

      .callyOverlapExplorerHead{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;align-items:start!important;gap:12px!important}
      .callyOverlapExplorerTitle{min-width:0!important;align-self:center!important}
      .callyOverlapExplorerTitle h2{margin:5px 0 4px!important;max-width:100%!important;font-size:clamp(18px,2.7vw,24px)!important;line-height:1.04!important;letter-spacing:-.035em!important;white-space:normal!important;overflow-wrap:normal!important;word-break:normal!important}
      .callyOverlapExplorerTitle p{margin:0!important;max-width:620px!important;line-height:1.4!important}
      .callyOverlapExplorerHeadActions{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:6px!important;white-space:nowrap!important}
      .callyOverlapExplorerHeadActions>.callyOverlapBack{position:static!important;inset:auto!important;width:auto!important;min-width:78px!important;height:32px!important;padding:0 10px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:5px!important;white-space:nowrap!important}
      .callyOverlapExplorerHeadActions>.callyOverlapExplorerX{position:static!important;inset:auto!important;width:32px!important;min-width:32px!important;height:32px!important;padding:0!important}
      .callyOverlapExplorerPager[hidden]{display:none!important}
      .callyOverlapExplorerTools:has(.callyOverlapExplorerPager[hidden]){grid-template-columns:minmax(180px,1fr) auto!important}
      @media(max-width:760px){
        .callyOverlapExplorerHead{grid-template-columns:minmax(0,1fr) auto!important;gap:8px!important}
        .callyOverlapExplorerTitle h2{font-size:18px!important;line-height:1.08!important}
        .callyOverlapExplorerTitle p{font-size:7.5px!important}
        .callyOverlapExplorerHeadActions{gap:4px!important}
        .callyOverlapExplorerHeadActions>.callyOverlapBack{min-width:68px!important;height:30px!important;padding:0 7px!important;font-size:7.5px!important}
        .callyOverlapExplorerHeadActions>.callyOverlapExplorerX{width:30px!important;min-width:30px!important;height:30px!important}
        .callyOverlapExplorerTools:has(.callyOverlapExplorerPager[hidden]){grid-template-columns:1fr auto!important}
      }
    `;
    document.head.appendChild(style);
  }

  function decorateMoveOverride() {
    const bar = qs('#callyMoveOverrideBar');
    if (!bar) return;
    const free = qs('[data-move-override="free"]', bar);
    const unlock = qs('[data-move-override="unlock_all"]', bar);
    const lock = qs('[data-move-override="lock_all"]', bar);
    const set = (button, icon, label) => {
      if (!button || button.dataset.callySemanticLock === '1') return;
      button.dataset.callySemanticLock = '1';
      button.innerHTML = `<span class="callyMoveLockGlyph" aria-hidden="true">${icon}</span><span>${label}</span>`;
    };
    set(free, OPEN_LOCK, 'Free');
    set(unlock, OPEN_LOCK, 'Unlock all');
    set(lock, CLOSED_LOCK, 'Lock all');
    // Neutral free → permissive override → restrictive override is the visual logic.
    [free, unlock, lock].filter(Boolean).forEach(button => bar.appendChild(button));
  }

  function polishExplorer() {
    const sheet = qs('.callyOverlapExplorerSheet');
    if (!sheet) return;
    const head = qs('.callyOverlapExplorerHead', sheet);
    if (head) {
      const back = qs('.callyOverlapBack', head);
      const close = qs('.callyOverlapExplorerX', head);
      let title = qs('.callyOverlapExplorerTitle', head);
      if (!title) {
        title = [...head.children].find(node => node.tagName === 'DIV' && !node.classList.contains('callyOverlapExplorerHeadActions')) || null;
        title?.classList.add('callyOverlapExplorerTitle');
      }
      let actions = qs('.callyOverlapExplorerHeadActions', head);
      if (!actions) {
        actions = document.createElement('div');
        actions.className = 'callyOverlapExplorerHeadActions';
      }
      if (title && title !== head.firstElementChild) head.insertBefore(title, head.firstElementChild);
      if (back) actions.appendChild(back);
      if (close) actions.appendChild(close);
      if (actions.parentElement !== head) head.appendChild(actions);
    }

    const pager = qs('.callyOverlapExplorerPager', sheet);
    const prev = qs('[data-overlap-page="prev"]', pager || sheet);
    const next = qs('[data-overlap-page="next"]', pager || sheet);
    const label = qs('[data-overlap-page-label]', pager || sheet);
    if (pager) {
      const onePage = (!prev || prev.disabled) && (!next || next.disabled);
      pager.hidden = onePage;
      if (!onePage && label) label.textContent = label.textContent.replace(/\s*\/\s*/, ' av ');
    }
  }

  const schedule = () => setTimeout(() => {
    ensureStyles();
    decorateMoveOverride();
    polishExplorer();
  }, 0);

  document.addEventListener('click', event => {
    if (event.target.closest?.('.callyOverlapDeep,[data-overlap-page],[data-overlap-explorer-back],[data-overlap-explorer-close]')) schedule();
  }, true);
  document.addEventListener('input', event => {
    if (event.target.matches?.('[data-overlap-explorer-search]')) schedule();
  }, true);
  window.addEventListener('cally-one-ui-refresh', schedule);
  window.addEventListener('cally-demo-space-changed', schedule);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, {once:true});
  else schedule();
})();
