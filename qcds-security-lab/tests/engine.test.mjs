import test from "node:test";
import assert from "node:assert/strict";
import {
  newProject,
  analyze,
  fingerprint,
  suggestConditions,
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
test("core C conditions constrain a much larger attack-vector fabric", () => {
  const portal = analyze(newProject("portal").input);
  assert.equal(portal.searchSpace.coreConditions, 14);
  assert.equal(portal.searchSpace.ternaryConditionSpace, 4782969);
  assert.equal(portal.searchSpace.generatedAttackVectors, 251);
  assert.ok(portal.searchSpace.activeAttackVectors > 100);
  assert.ok(portal.searchSpace.generatedAttackVectors > portal.searchSpace.coreConditions * 10);
  const owasp = portal.frameworkViews["OWASP / AppSec"];
  assert.ok(owasp.vectorCount > 100);
  assert.ok(Object.hasOwn(owasp.categories, "A01:2025 Broken Access Control"));
  assert.ok(Object.hasOwn(owasp.categories, "A05:2025 Injection"));
  assert.ok(
    Object.hasOwn(
      owasp.categories,
      "API1:2023 Broken Object Level Authorization",
    ),
  );
  assert.ok(portal.routes.find((route) => route.id === "F3").attackVectorCount > 20);
});
test("unknown core facts keep attack vectors conditional rather than deleting them", () => {
  const m = analyze(newProject("custom").input);
  assert.equal(m.searchSpace.generatedAttackVectors, 251);
  assert.equal(m.searchSpace.activeAttackVectors, 0);
  assert.equal(m.searchSpace.conditionalAttackVectors, 251);
  assert.equal(m.searchSpace.rejectedAttackVectors, 0);
  assert.ok(m.frameworkViews["OWASP / AppSec"].conditionalCount > 200);
});
test("framework reports are projections over the same vector fabric", () => {
  const m = analyze(newProject("support").input);
  assert.equal(m.attackVectorSpace.generated, m.searchSpace.generatedAttackVectors);
  assert.equal(
    m.frameworkViews["OWASP / AppSec"].vectors[0].id.startsWith("AV"),
    true,
  );
  assert.ok(m.frameworkViews.STRIDE.vectorCount > 100);
  assert.ok(m.frameworkViews.Identity.vectorCount > 20);
  assert.equal(m.vectorRotation.length, Object.keys(LENSES).length);
});
test("worked examples carry synthetic evidence into the real workflow", () => {
  const portal = newProject("portal");
  const portalModel = analyze(portal.input, portal.evidence);
  const f3 = portalModel.findings.find((f) => f.id === "F3");
  assert.equal(portal.example, true);
  assert.equal(f3.records.length, 1);
  assert.equal(f3.records[0].source.includes("Worked example"), true);
  assert.equal(f3.status, "REFUTED · REPORTED");
  assert.equal(portal.actions.F3.status, "done");

  const invoice = newProject("invoice");
  const invoiceModel = analyze(invoice.input, invoice.evidence);
  assert.equal(invoice.evidence.length, 0);
  assert.ok(invoiceModel.pending.some((f) => f.id === "F4"));
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
  assert.equal(m.pending.length, 8);
  assert.equal(m.searchSpace.conditionalRoutes, 8);
  assert.equal(m.searchSpace.conditionalAttackVectors, 251);
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
test("interview condition formation turns a sparse brief into an inspectable route space", () => {
  const p = newProject("custom");
  p.input.name = "I am building a security app";
  p.input.description =
    "System: I am building a security app\n" +
    "Inputs: Anyone who downloads the app\n" +
    "Attacker goal: Expose security flaws\n" +
    "Assets: Personal data\n" +
    "Actions: All of them\n" +
    "Controls: Nothing";
  p.input.attackerGoal = "Expose security flaws";
  p.input.assets = ["Personal data"];

  const suggestions = suggestConditions(p.input);
  for (const suggestion of suggestions)
    if (p.input.flags[suggestion.key] === null)
      p.input.flags[suggestion.key] = suggestion.value;

  const m = analyze(p.input);
  assert.equal(p.input.flags.external_input, true);
  assert.equal(p.input.flags.sensitive_data, true);
  assert.equal(p.input.flags.tools, true);
  assert.equal(p.input.flags.high_impact, true);
  assert.equal(p.input.flags.authorization, false);
  assert.deepEqual(ids(m), ["F1", "F2", "F3", "F8"]);
  assert.deepEqual(
    m.pending.map((f) => f.id),
    ["F4", "F6", "F7"],
  );
  assert.equal(m.searchSpace.confirmedRoutes, 4);
  assert.equal(m.searchSpace.conditionalRoutes, 3);
  assert.ok(m.clarifications.some((item) => item.key === "rag"));
  assert.ok(m.recursive.some((branch) => branch.id === "F1"));
});
test("condition provenance survives project import but conclusions do not", () => {
  const p = newProject("custom");
  p.conditionBasis.external_input = {
    source: "guided interview + deterministic formation",
    reason: "External users can interact with the target.",
    confidence: "medium",
  };
  p.analysis = { findings: [{ id: "F1", status: "VERIFIED" }] };
  const clean = validateProject(JSON.parse(JSON.stringify(p)));
  assert.equal(clean.analysis, undefined);
  assert.equal(clean.conditionBasis.external_input.confidence, "medium");
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
test("dimension walk measures both route and attack-vector impact", () => {
  const m = analyze(newProject().input);
  const tools = m.dimensions.find((d) => d.key === "tools");
  assert.deepEqual(tools.weakened, ["F2"]);
  assert.ok(tools.vectorImpact.activeToConditional.length > 0);
  assert.deepEqual(
    m.dimensions.find((d) => d.key === "human_approval").weakened,
    ["F5"],
  );
  assert.deepEqual(
    m.dimensions.find((d) => d.key === "authorization").weakened,
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
    "attack-vector candidates",
    "Framework projections",
    "Dimension walk",
    "Recursive inference",
    "REFUTED · REPORTED",
  ])
    assert.ok(md.includes(s), s);
});
