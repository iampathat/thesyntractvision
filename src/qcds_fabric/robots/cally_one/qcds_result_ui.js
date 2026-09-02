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
