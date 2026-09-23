import test from "node:test";
import assert from "node:assert/strict";
import {
  newProject,
  analyze,
  fingerprint,
  LENSES,
  validateProject,
  markdown,
} from "../engine.mjs";
const ids = (m) => m.findings.map((f) => f.id);
test("examples produce distinct, numerically ordered findings", () => {
  assert.deepEqual(ids(analyze(newProject("portal").input)), [
    "F1",
    "F3",
    "F7",
  ]);
  assert.deepEqual(ids(analyze(newProject("support").input)), [
    "F1",
    "F2",
    "F3",
    "F4",
    "F5",
    "F6",
    "F7",
    "F8",
  ]);
  assert.deepEqual(ids(analyze(newProject("knowledge").input)), [
    "F1",
    "F3",
    "F4",
    "F7",
  ]);
  assert.deepEqual(ids(analyze(newProject("coding").input)), [
    "F1",
    "F2",
    "F5",
    "F6",
    "F7",
    "F8",
  ]);
});
test("AI perspective applies only when the target itself contains AI", () => {
  const portal = analyze(newProject("portal").input);
  const support = analyze(newProject("support").input);
  const portalAI = portal.lenses.find((l) => l.name === "AI / GenAI");
  const supportAI = support.lenses.find((l) => l.name === "AI / GenAI");
  assert.equal(portal.input.flags.ai_component, false);
  assert.equal(portalAI.applicable, false);
  assert.equal(portalAI.active, false);
  assert.equal(support.input.flags.ai_component, true);
  assert.equal(supportAI.applicable, true);
  assert.equal(supportAI.active, true);
});
test("legacy imports migrate old perspective names and missing AI target state", () => {
  const p = newProject("portal");
  delete p.input.flags.ai_component;
  p.excludedLenses = ["OWASP / GenAI", "Agent / Tool Chain"];
  const clean = validateProject(JSON.parse(JSON.stringify(p)));
  assert.equal(clean.input.flags.ai_component, null);
  assert.deepEqual(clean.excludedLenses, [
    "OWASP / AppSec",
    "Action / Tool Chain",
  ]);
});
test("unknown system is not a security pass", () => {
  const m = analyze(newProject("custom").input);
  assert.equal(m.unknown.length, 14);
  assert.equal(m.findings.length, 0);
  assert.ok(m.oracles.every((o) => !["PASS", "VERIFIED"].includes(o.state)));
});
test("unknown prerequisites produce questions; explicit No excludes the rule", () => {
  const p = newProject();
  p.input.flags.untrusted_content = null;
  let m = analyze(p.input);
  assert.ok(!ids(m).includes("F1"));
  assert.ok(m.pending.some((f) => f.id === "F1"));
  p.input.flags.untrusted_content = false;
  m = analyze(p.input);
  assert.ok(!m.pending.some((f) => f.id === "F1"));
  assert.ok(!ids(m).includes("F1"));
});
test("declared authorization still needs a test", () => {
  const p = newProject();
  let m = analyze(p.input);
  assert.ok(ids(m).includes("F2"));
  assert.equal(m.oracles[1].state, "TEST CONTROL");
  p.input.flags.authorization = false;
  assert.equal(analyze(p.input).oracles[1].state, "CONTROL GAP");
});
test("rotation reruns selected perspectives and can lose all paths", () => {
  const p = newProject(),
    excluded = Object.keys(LENSES).filter((n) => n !== "Identity");
  const m = analyze(p.input, [], excluded);
  assert.deepEqual(ids(m), ["F2", "F3", "F6"]);
  assert.equal(m.rotation.length, 1);
  assert.deepEqual(m.rotation[0].retained, []);
  assert.deepEqual(m.rotation[0].lost, ids(m));
  assert.equal(analyze(p.input, [], Object.keys(LENSES)).findings.length, 0);
});
test("dimension exclusion identifies required facts", () => {
  const m = analyze(newProject().input);
  assert.deepEqual(m.dimensions.find((d) => d.key === "tools").lost, ["F2"]);
  assert.deepEqual(m.dimensions.find((d) => d.key === "human_approval").lost, [
    "F5",
  ]);
  assert.deepEqual(
    m.dimensions.find((d) => d.key === "authorization").lost,
    [],
  );
});
test("support and counter-evidence remain a conflict", () => {
  const p = newProject(),
    base = {
      id: "E1",
      findingId: "F1",
      source: "Test A",
      observation: "Observed result",
      createdAt: "2026-09-22T10:00:00Z",
      fingerprint: fingerprint(p.input),
    };
  p.evidence = [
    { ...base, outcome: "supports" },
    { ...base, id: "E2", outcome: "refutes" },
  ];
  const m = analyze(p.input, p.evidence);
  assert.equal(m.findings[0].status, "CONFLICTING EVIDENCE");
  assert.equal(m.oracles[3].state, "CONFLICT");
  assert.ok(m.findings.every((f) => f.status !== "VERIFIED"));
});
test("changed system archives evidence without deleting it", () => {
  const p = newProject();
  p.evidence = [
    {
      id: "E1",
      findingId: "F1",
      source: "Test",
      observation: "Observed",
      outcome: "supports",
      createdAt: "2026-09-22T10:00:00Z",
      fingerprint: fingerprint(p.input),
    },
  ];
  p.input.flags.authorization = false;
  const m = analyze(p.input, p.evidence);
  assert.equal(m.findings[0].records.length, 0);
  assert.equal(m.archivedEvidence, 1);
  assert.equal(p.evidence.length, 1);
});
test("lens selection is part of the evidence snapshot", () => {
  const p = newProject();
  assert.notEqual(fingerprint(p.input), fingerprint(p.input, ["Identity"]));
  assert.equal(
    fingerprint(p.input, ["Identity", "STRIDE"]),
    fingerprint(p.input, ["STRIDE", "Identity"]),
  );
});
test("import discards supplied conclusions and validates tri-state data", () => {
  const p = newProject();
  p.analysis = { findings: [{ id: "F1", status: "VERIFIED" }] };
  const clean = validateProject(JSON.parse(JSON.stringify(p)));
  assert.equal(clean.analysis, undefined);
  assert.equal(analyze(clean.input).findings[0].status, "HYPOTHESIS");
  p.input.flags.tools = "true";
  assert.throws(() => validateProject(p), /condition/);
});
test("import rejects invalid evidence and action identifiers", () => {
  const p = newProject();
  p.evidence = [{ findingId: "F999" }];
  assert.throws(() => validateProject(p), /evidence/);
  p.evidence = [];
  p.actions = { constructor: { status: "done" } };
  assert.throws(() => validateProject(p), /action/);
});
test("report includes provenance, uncertainty, evidence, actions and scope", () => {
  const p = newProject("coding"),
    fp = fingerprint(p.input);
  p.evidence = [
    {
      id: "E1",
      findingId: "F1",
      source: "Test suite 9",
      observation: "Boundary rejected synthetic action.",
      outcome: "refutes",
      createdAt: "2026-09-22T10:00:00Z",
      fingerprint: fp,
    },
  ];
  p.actions.F1 = {
    owner: "Security",
    note: "Add a regression test",
    status: "progress",
    fingerprint: fp,
  };
  const md = markdown(analyze(p.input, p.evidence), p);
  for (const s of [
    "Patrik Sundblom",
    "**?**",
    "Test suite 9",
    "Boundary rejected",
    "regression test",
    "shared rules",
    "Dimension exclusion",
    "REFUTED · REPORTED",
  ])
    assert.ok(md.includes(s), s);
});
