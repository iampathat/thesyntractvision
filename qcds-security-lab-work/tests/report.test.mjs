import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import '../dist/vendor/jspdf.umd.min.js';
import {analyze, newProject} from '../dist/core/engine.mjs';
import {EXAMPLES, loadExample} from '../dist/guided-work.js';
import {buildReportData, createSecurityPdf} from '../dist/report-pdf.mjs';

const fonts = Object.fromEntries(['Regular','Bold'].map(style => [style.toLowerCase(),
  new Uint8Array(readFileSync(new URL(`../dist/vendor/QCDSReportSans-${style}.ttf`,import.meta.url)))]));

test('original portal fixture reconciles all 566 vectors, sectors and mechanism groups', () => {
  const p = newProject('portal'), m = analyze(p.input,p.evidence,p.excludedLenses);
  const {doc,summary} = createSecurityPdf(globalThis.jspdf.jsPDF,m,p,{fonts});
  assert.deepEqual(summary.counts,{total:566,active:235,conditional:0,rejected:331,excluded:0});
  assert.equal(summary.sectorTotal,566);assert.equal(summary.mechanismTotal,566);
  assert.equal(summary.reportId,'QSL-67BCEBB4');
  for (const title of ['The modeled threat landscape','STRIDE: six threat categories','OWASP / AppSec breakdown','From a candidate to a decision','The catalog behind the charts']) {
    assert.ok(summary.sections.some(s => s.title === title),title);
  }
  const bytes = Buffer.from(doc.output('arraybuffer'));
  assert.equal(bytes.subarray(0,5).toString(),'%PDF-');
  assert.ok(bytes.includes(Buffer.from('/Outlines')));
  assert.ok(summary.pages >= 20);
});

test('all five worked examples and an unresolved custom case export real PDFs', () => {
  for (const key of [...Object.keys(EXAMPLES),'custom']) {
    const p = key === 'custom' ? newProject('custom') : loadExample(key);
    const m = analyze(p.input,p.evidence,p.excludedLenses);
    const {doc,summary} = createSecurityPdf(globalThis.jspdf.jsPDF,m,p,{fonts});
    assert.equal(summary.sectorTotal,summary.counts.total,key);
    assert.equal(summary.mechanismTotal,summary.counts.total,key);
    assert.ok(doc.output('arraybuffer').byteLength > 30000,key);
  }
});

test('perspective reports only count vectors mapped to the selected framework', () => {
  const p=loadExample('support'),m=analyze(p.input,p.evidence,p.excludedLenses);
  const data=buildReportData(m,p,{perspective:'Identity'});
  assert.ok(data.vectors.every(v=>v.frameworks.some(f=>f.lens==='Identity')));
  assert.deepEqual(data.frameworks.map(f=>f.name),['Identity']);
  assert.ok(data.counts.total < m.attackVectorSpace.vectors.length);
  const {summary}=createSecurityPdf(globalThis.jspdf.jsPDF,m,p,{fonts,perspective:'Identity'});
  assert.equal(summary.sectorTotal,data.counts.total);
});

test('stale observations do not reappear in the current report evidence register', () => {
  const p=loadExample('portal');
  assert.equal(buildReportData(analyze(p.input,p.evidence,[]),p).records.length,1);
  p.input.name='Revised scope';
  const m=analyze(p.input,p.evidence,[]),data=buildReportData(m,p);
  assert.equal(m.archivedEvidence,1);assert.equal(data.records.length,0);
  assert.equal(data.reported.refutes,0);
});
