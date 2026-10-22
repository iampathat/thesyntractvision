// QCDS Security Lab Work. Created by Patrik Sundblom.
// OpenAI / ChatGPT: research & development support.
import {esc, fmt} from './work-data.js';

export function reportFilename(name, perspective = null) {
  const slug = String(name || 'system').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'system';
  const suffix = perspective ? '-' + perspective.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '';
  return `QCDS-${slug}${suffix}-security-report.pdf`;
}

export function reportShell(model) {
  const views = Object.entries(model.frameworkViews).filter(([, value]) => value.active && value.applicable);
  return `<div class="modal-head"><div><div class="page-kicker">SECURITY ASSESSMENT / A4</div><h2>Rapport för ${esc(model.input.name)}</h2></div><button class="icon-btn" data-action="close" aria-label="Stäng">×</button></div>
    <div class="report-controls"><div><label for="report-perspective">Rapportens omfattning</label><select id="report-perspective"><option value="">Hela undersökningen</option>${views.map(([name]) => `<option value="${esc(name)}">${esc(name)}</option>`).join('')}</select></div><p>Rapport på engelska, med dina egna texter bevarade.<br>Skapas på din enhet från den aktuella undersökningen.</p></div>
    <div id="report-body" aria-live="polite"></div>`;
}

let releasePrevious = () => {};

export function openSecurityReport(model, project, modal) {
  releasePrevious();
  // Freeze one scope for every perspective and for the downloaded PDF.
  const snapshot = structuredClone({model, project});
  let worker = null, objectUrl = null, pdfBytes = null, timer = null, generation = 0, closed = false;
  modal.classList.add('report-dialog');
  modal.innerHTML = reportShell(model);
  if (!modal.open) modal.showModal();

  function clearJob() {
    worker?.terminate(); worker = null;
    clearTimeout(timer);
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null;
    pdfBytes = null;
  }

  function dispose() {
    closed = true; generation++;
    clearJob();
    modal.removeEventListener('close', dispose);
    modal.removeEventListener('change', onChange);
    modal.removeEventListener('click', onClick);
    modal.classList.remove('report-dialog');
  }

  function generate() {
    clearJob();
    const job = ++generation;
    const perspective = modal.querySelector('#report-perspective').value || null;
    const body = modal.querySelector('#report-body');
    body.innerHTML = '<div class="loading" role="status"><span class="spinner"></span>Bygger rapportens sidor, diagram och register…</div>';
    const fail = message => {
      if (closed || generation !== job) return;
      clearJob();
      body.innerHTML = `<div class="empty-state error"><h3>Rapporten kunde inte skapas</h3><p>${esc(message)}</p><button class="secondary" data-report-retry>Försök igen</button></div>`;
    };
    try {
      worker = new Worker(new URL('./report-worker.js', import.meta.url), {type: 'module'});
      worker.onerror = () => fail('PDF-motorn kunde inte laddas. Ladda om sidan och försök igen.');
      worker.onmessage = ({data}) => {
        if (closed || generation !== job) return;
        if (data.error) return fail(data.error);
        clearTimeout(timer); worker.terminate(); worker = null;
        objectUrl = URL.createObjectURL(new Blob([data.bytes], {type: 'application/pdf'}));
        pdfBytes = data.bytes;
        const {summary} = data;
        const filename = reportFilename(model.input.name, perspective);
        body.innerHTML = `<div class="report-ready"><div><strong>${summary.pages} sidor</strong><span>${esc(summary.reportId)} · ${fmt(summary.counts.total)} modellerade kandidater</span></div><div class="report-actions"><a class="secondary" href="${objectUrl}" target="_blank" rel="noopener">Öppna PDF ↗</a><button class="primary" data-report-download data-filename="${esc(filename)}">Ladda ned PDF ↓</button></div></div>
          ${project.example ? '<p class="report-example">EXEMPEL · Syntetiska observationer är märkta i rapporten.</p>' : ''}
          <details class="report-contents"><summary>Visa rapportens innehåll</summary><ol>${summary.sections.map(section => `<li><a href="${objectUrl}#page=${section.page}" target="qcds-report-document"><span>${esc(section.title)}</span><span>s. ${section.page}</span></a></li>`).join('')}</ol></details>
          <iframe class="report-document" name="qcds-report-document" title="Förhandsvisning av den färdiga PDF-rapporten" src="${objectUrl}#toolbar=1&view=Fit"></iframe>
          <p class="report-preview-help">Detta är samma PDF som laddas ned. Om förhandsvisningen inte visas på din enhet, välj Öppna PDF eller Ladda ned PDF.</p>`;
      };
      worker.postMessage({...snapshot, perspective});
      timer = setTimeout(() => fail('Rapporten tog för lång tid. Försök igen.'), 60000);
    } catch (error) { fail(error.message); }
  }

  function onChange(event) { if (event.target.id === 'report-perspective') generate(); }
  function onClick(event) {
    if (event.target.closest('[data-report-retry]')) generate();
    const button = event.target.closest('[data-report-download]');
    if (button && pdfBytes) {
      const blob = new Blob([pdfBytes], {type: 'application/pdf'});
      const filename = button.dataset.filename;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      modal.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  }
  releasePrevious = dispose;
  modal.addEventListener('close', dispose, {once: true});
  modal.addEventListener('change', onChange);
  modal.addEventListener('click', onClick);
  generate();
}
