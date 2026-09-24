import test from "node:test";
import assert from "node:assert/strict";
import {
  GLASSWING_VERSION,
  projectFromScenario,
  runGlasswing,
} from "../glasswing.mjs";

test("Glasswing produces three ordered inference tracks", () => {
  const run = runGlasswing(projectFromScenario("portal"));
  assert.equal(GLASSWING_VERSION, "1.0.0");
  assert.deepEqual(
    run.tracks.map((track) => track.id),
    ["baseline", "agentic", "qcds"],
  );
  assert.ok(run.tracks[2].metrics.generatedVectorsTotal > 0);
  assert.ok(
    run.tracks[2].metrics.generatedVectorsVisible <=
      run.tracks[2].metrics.generatedVectorsTotal,
  );
});

test("QCDS track exposes rotation, dimension walk, recursion and mask space", () => {
  const run = runGlasswing(projectFromScenario("invoice"));
  const qcds = run.tracks.find((track) => track.id === "qcds");
  assert.ok(qcds.rotation.length > 0);
  assert.ok(Array.isArray(qcds.dimensions));
  assert.ok(qcds.metrics.recursiveBranches >= 1);
  assert.match(qcds.metrics.maskedLogicalSpace, /^2\^/);
});

test("Glasswing does not equate more candidates with proof", () => {
  const run = runGlasswing(projectFromScenario("coding"));
  assert.ok(
    run.comparison.notices.some((notice) =>
      notice.includes("do not mean more true vulnerabilities"),
    ),
  );
  assert.ok(
    run.comparison.notices.some((notice) =>
      notice.includes("not a vendor-model benchmark"),
    ),
  );
});
