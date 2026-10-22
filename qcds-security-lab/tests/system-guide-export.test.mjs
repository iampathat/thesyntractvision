// QCDS System Guide integration smoke tests.
// This test uses a drawing stub; visual PDF review and browser tests remain separate.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createSystemGuidePdf } from '../system-guide-pdf.mjs';

const read = (relative) => readFileSync(new URL(relative, import.meta.url), 'utf8');

class PDFDrawingStub {
  constructor() { this.count = 1; this.outOfBounds = []; }
  addPage() { this.count++; }
  getNumberOfPages() { return this.count; }
  setTextColor() {} setFillColor() {} setDrawColor() {}
  setFont() {} setFontSize() {} setLineWidth() {}
  rect() {} roundedRect() {} line() {} circle() {}
  addFileToVFS() {} addFont() {} setProperties() {}
  splitTextToSize(source, width) {
    const max = Math.max(8, Math.floor(width / 5.2));
    return String(source).split('\\n').flatMap(paragraph => {
      const lines=[]; let line='';
      for (const word of paragraph.split(/\\s+/)) {
        if (line && (line + ' ' + word).length > max) { lines.push(line); line=word; }
        else line += (line ? ' ' : '') + word;
      }
      if (line) lines.push(line);
      return lines;
    });
  }
  text(source,x,y) {
    if (!Number.isFinite(x) || !Number.isFinite(y) || y<0 || y>842)
      this.outOfBounds.push({x,y,source});
  }
}

test('system guide generates its own document without an investigation', () => {
  const result = createSystemGuidePdf(PDFDrawingStub);
  assert.equal(result.summary.frameworks, 7);
  assert.equal(result.summary.pages, 23);
  assert.deepEqual(result.doc.outOfBounds, []);
});

test('all seven active perspectives are covered', () => {
  const code=read('../system-guide-pdf.mjs');
  for (const name of ['STRIDE','OWASP','Identity','Action / Tool Chain','Privacy / Supply Chain','AI / GenAI','Open Search']) {
    assert.ok(code.includes(name), 'Missing '+name);
  }
  assert.ok(code.includes('Complementary models, not active lenses'));
});

test('the separate app export is available from Reports', () => {
  const app=read('../app-stage-v118.js');
  const exp=read('../report-export.js');
  assert.match(app, /data-action=\"system-guide-pdf\"/);
  assert.match(app, /case \"system-guide-pdf\"/);
  assert.match(exp, /export async function downloadSystemGuidePdf\\(\\)/);
  assert.match(exp, /createSystemGuidePdf\\(jsPDF\\)/);
  assert.match(exp, /QCDS-Security-Lab-System-Guide\\.pdf/);
});
