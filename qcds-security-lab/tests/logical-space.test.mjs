import test from "node:test";
import assert from "node:assert/strict";
import {
  LogicalSpace,
  amplify,
  runDimensionExperiment,
  normalizeResearch,
  dimensionMarkdown,
} from "../logical-space.mjs";
import { newProject, analyze, validateProject, markdown } from "../engine.mjs";

const model = () => ({
  fingerprint: "two-dimensional-fixture",
  input: { name: "Two boundaries" },
  conditions: [
    { key: "a", label: "Entry", value: null },
    { key: "b", label: "Authority", value: null },
  ],
  lenses: [{ name: "STRIDE", active: true }],
  attackVectorSpace: {
    vectors: [
      {
        id: "AV1",
        title: "Entry plus authority",
        requires: ["a", "b"],
        requiresAny: [],
        frameworks: [{ lens: "STRIDE" }],
        state: "CONDITIONAL",
        control: "Independent policy",
        verify: "Check both boundaries",
      },
      {
        id: "AV2",
        title: "Authority alone",
        requires: ["b"],
        requiresAny: [],
        frameworks: [{ lens: "STRIDE" }],
        state: "CONDITIONAL",
        control: "Limit authority",
        verify: "Check the actor",
      },
    ],
  },
});
test("symbolic 50-dimensional counts branch only unresolved coordinates", () => {
  const dimensions = Array.from({ length: 50 }, (_, i) => ({
    key: `d${i}`,
    value: "?",
  }));
  const s = new LogicalSpace(dimensions),
    root = s.all([s.literal("d0"), s.literal("d49", "0")]);
  assert.equal(s.total, 1125899906842624n);
  assert.equal(s.count(root), 281474976710656n);
  assert.ok(s.nodes.length < 10, "does not materialize 2^50 states");
  const fixed = new LogicalSpace(
    dimensions.map((d, i) => (i < 48 ? { ...d, value: "1" } : d)),
  );
  assert.equal(fixed.total, 4n);
});
test("Boolean union handles overlap, contradictions and canonical rotations", () => {
  const ds = Array.from({ length: 8 }, (_, i) => ({
    key: `d${i}`,
    value: "?",
  }));
  for (let offset = 0; offset < 8; offset++) {
    const order = [...ds.slice(offset), ...ds.slice(0, offset)].map(
        (d) => d.key,
      ),
      s = new LogicalSpace(ds, order);
    const p = s.any([
      s.all([s.literal("d0"), s.literal("d7", "0")]),
      s.literal("d1"),
    ]);
    let brute = 0;
    for (let x = 0; x < 256; x++) if ((x & 1 && !(x & 128)) || x & 2) brute++;
    assert.equal(s.count(p), BigInt(brute));
    assert.equal(s.count(s.all([s.literal("d0"), s.literal("d0", "0")])), 0n);
  }
});
test("finite symbolic Grover matches a dense 8-bit amplitude simulation", () => {
  let amplitudes = Array(256).fill(1 / 16);
  const run = amplify(1n, 256n, 40);
  for (let t = 0; t <= 40; t++) {
    assert.ok(
      Math.abs(amplitudes[173] ** 2 - run.trace[t].probability) < 1e-12,
    );
    amplitudes[173] *= -1;
    const mean = amplitudes.reduce((a, b) => a + b, 0) / 256;
    amplitudes = amplitudes.map((x) => 2 * mean - x);
  }
  assert.equal(run.iterations, 12);
  assert.ok(run.probability > 0.9999);
  assert.equal(run.distribution.marked.count, "1");
  assert.equal(run.distribution.unmarked.count, "255");
  assert.equal(amplify(0n, 4n).probability, 0);
  assert.equal(amplify(4n, 4n).probability, 1);
});
test("absent, false and unknown have three different predicate semantics", () => {
  const input = model();
  const unresolved = runDimensionExperiment(input, { focus: "AV1" });
  const absent = runDimensionExperiment(input, {
    focus: "AV1",
    walk: [{ key: "a", value: "ABSENT" }],
  });
  const falseFact = runDimensionExperiment(input, {
    focus: "AV1",
    walk: [{ key: "a", value: "0" }],
  });
  assert.equal(unresolved.final.totalStates, "4");
  assert.equal(unresolved.final.markedStates, "1");
  assert.equal(absent.final.present, 1);
  assert.equal(absent.final.focusState.state, "INACTIVE");
  assert.equal(
    absent.final.states.find((v) => v.id === "AV2").state,
    "CONDITIONAL",
  );
  assert.equal(falseFact.final.present, 2);
  assert.equal(falseFact.final.focusState.state, "REJECTED");
  assert.ok(unresolved.rotations.every((r) => r.agrees));
  assert.equal(
    input.conditions[0].value,
    null,
    "experiment never changes declared facts",
  );
});
test("hybrid lanes remain independent and sequential changes carry forward", () => {
  const run = runDimensionExperiment(model(), {
    focus: "AV1",
    walk: [
      { key: "a", value: "1" },
      { key: "b", value: "1" },
    ],
  });
  assert.equal(run.final.maskSpace, "2^0");
  assert.equal(run.final.focusState.state, "ACTIVE");
  assert.deepEqual(
    run.sequential.map((s) => s.maskSpace),
    ["2^1", "2^0"],
  );
  assert.ok(run.lanes.every((l) => l.present === 1));
  assert.equal(run.binding.laneCount, 2);
  assert.equal(
    run.final.amplification.distribution.marked.mass +
      run.final.amplification.distribution.unmarked.mass,
    1,
  );
});
test("recursive control introduces a new predicate and uncertainty, not automatic truth", () => {
  const config = {
    focus: "AV1",
    dimensions: [{ key: "x_control", label: "Policy holds", value: "?" }],
    controls: [
      {
        id: "layer1",
        key: "x_control",
        label: "Policy holds",
        test: "Change actor",
        vectorId: "AV1",
      },
    ],
  };
  const r = runDimensionExperiment(model(), config);
  assert.equal(r.final.totalStates, "8");
  assert.equal(r.final.markedStates, "1");
  assert.equal(r.binding.status, "AWAITING TESTS");
  assert.equal(r.recursion.length, 1);
  assert.ok(r.impacts.find((q) => q.key === "x_control").decisive);
  const held = runDimensionExperiment(model(), {
    ...config,
    walk: [{ key: "x_control", value: "1" }],
  });
  assert.equal(held.final.focusState.state, "REJECTED");
  assert.equal(held.binding.status, "AWAITING TESTS");
});
test("observations bind to exact dimensions; changes archive and conflicts remain", () => {
  const first = runDimensionExperiment(model(), { focus: "AV1" });
  const record = {
    vectorId: "AV1",
    bindingKey: first.bindingKey,
    outcome: "supports",
    source: "Synthetic test",
    observation: "A fixture result",
    createdAt: "2026-09-28T00:00:00Z",
  };
  const conflict = runDimensionExperiment(model(), {
    focus: "AV1",
    records: [record, { ...record, outcome: "refutes" }],
  });
  assert.equal(conflict.binding.status, "CONFLICT");
  const changed = runDimensionExperiment(model(), {
    focus: "AV1",
    records: [record],
    walk: [{ key: "a", value: "1" }],
  });
  assert.equal(changed.binding.records.length, 0);
  assert.equal(changed.binding.archivedRecords, 1);
  assert.match(dimensionMarkdown(conflict), /CONFLICT/);
});
test("project round trip preserves research and main report includes it", () => {
  const p = newProject("invoice");
  p.research = normalizeResearch({
    dimensions: [
      { key: "x_target", label: "Approved target matches", value: "?" },
    ],
  });
  const clean = validateProject(JSON.parse(JSON.stringify(p)));
  assert.equal(clean.research.dimensions[0].key, "x_target");
  assert.match(
    markdown(analyze(clean.input, clean.evidence), clean),
    /QCDS dimensional investigation/,
  );
  assert.throws(() =>
    normalizeResearch({
      dimensions: [{ key: "__proto__", label: "bad", value: "?" }],
    }),
  );
  assert.throws(() =>
    runDimensionExperiment(model(), {
      walk: [{ key: "unknown-key", value: "1" }],
    }),
  );
});
