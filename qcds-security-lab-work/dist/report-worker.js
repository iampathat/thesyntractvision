// QCDS Security Lab Work. Created by Patrik Sundblom.
// PDF composition runs off the UI thread and returns binary bytes, never a data URL.
import './vendor/jspdf.umd.min.js';
import {createSecurityPdf} from './report-pdf.mjs';

self.onmessage = async ({data: {model, project, perspective}}) => {
  try {
    const fonts = Object.fromEntries(await Promise.all(['Regular', 'Bold'].map(async style => {
      const response = await fetch(new URL(`./vendor/QCDSReportSans-${style}.ttf`, import.meta.url));
      if (!response.ok) throw Error('Rapportens typsnitt kunde inte laddas.');
      return [style.toLowerCase(), new Uint8Array(await response.arrayBuffer())];
    })));
    const {doc, summary} = createSecurityPdf(globalThis.jspdf.jsPDF, model, project, {perspective, fonts});
    const bytes = doc.output('arraybuffer');
    self.postMessage({bytes, summary}, [bytes]);
  } catch (error) {
    self.postMessage({error: error.message || 'Rapporten kunde inte skapas.'});
  }
};
