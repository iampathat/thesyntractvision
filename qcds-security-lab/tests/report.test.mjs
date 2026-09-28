import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { newProject, analyze, LENSES } from "../engine.mjs";
import { buildReportData, createSecurityPdf } from "../report-pdf.mjs";
const require = createRequire(import.meta.url),
  { jsPDF } = require("../vendor/jspdf.umd.min.js");
const model = (p) => analyze(p.input, p.evidence, p.excludedLenses);
test("sector and mechanism charts reconcile to the complete catalog", () => {
  const p = newProject("coding"),
    m = model(p),
    r = buildReportData(m, p);
  assert.equal(r.counts.total, m.searchSpace.generatedAttackVectors);
  assert.equal(
    r.sectors.reduce((n, s) => n + s.total, 0),
    r.counts.total,
  );
  assert.equal(
    r.sectors.reduce((n, s) => n + s.retained, 0),
    m.searchSpace.survivingAttackVectors,
  );
  assert.equal(
    r.mechanisms.reduce((n, g) => n + g.ids.length, 0),
    r.counts.total,
  );
  assert.ok(r.sectors.every((s) => s.share >= 0 && s.share <= 1));
  assert.equal(
    r.records.length,
    1,
    "worked observation stays visible and correctly scoped",
  );
});
test("framework exports stay scoped and old observations are not reused", () => {
  const p = newProject("coding"),
    m = model(p),
    r = buildReportData(m, p, { perspective: "STRIDE" });
  assert.ok(
    r.vectors.every((v) => v.frameworks.some((f) => f.lens === "STRIDE")),
  );
  assert.equal(r.surviving.length, m.frameworkViews.STRIDE.vectorCount);
  p.input.name += " - changed scope";
  assert.equal(buildReportData(model(p), p).records.length, 0);
});
test("the PDF renders real A4 pages for populated, unresolved and excluded views", () => {
  for (const scenario of ["coding", "invoice", "custom"]) {
    const p = newProject(scenario);
    if (scenario === "custom") p.excludedLenses = Object.keys(LENSES);
    if (scenario === "invoice")
      p.research = {
        dimensions: [
          { key: "x_target", label: "Approved target matches", value: "?" },
        ],
      };
    const { doc, summary } = createSecurityPdf(jsPDF, model(p), p);
    assert.ok(summary.pages >= 10 && summary.pages < 45);
    assert.equal(summary.sectorTotal, summary.counts.total);
    assert.ok(doc.output().startsWith("%PDF-1.3"));
    assert.equal(doc.internal.pageSize.getWidth(), 595.28);
    assert.ok(!doc.output().includes("/JavaScript"), "no PDF scripts");
  }
});
