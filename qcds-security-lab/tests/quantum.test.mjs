import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fixture } from "./quantum-cases.mjs";
import {
  compileOracle,
  compareExecution,
  Statevector,
  openQasm,
} from "../quantum-compare.mjs";
const zero = { single: 0, two: 0, readout: 0 };
test("compiled phase oracles agree with every classical truth-table entry", () => {
  for (const spec of [
    { count: 1 },
    { count: 3, requires: [], any: ["d0", "d1", "d2"] },
    { count: 3, requires: ["d0"], any: ["d0", "d1"] },
    { count: 3, requires: ["d0"], any: ["d1", "d2"], fixed: { d1: false } },
    { count: 3 },
    { count: 4, requires: ["d0"], any: ["d1", "d2", "d3"] },
    { count: 3, barriers: ["x_barrier"] },
    { count: 3, fixed: { d1: true }, spectators: 5 },
  ]) {
    const c = compileOracle(fixture(spec));
    let base;
    for (let state = 0; state < c.marked.length; state++) {
      const sv = new Statevector(c.qubits, state);
      c.oracle.forEach((g) => sv.apply(g));
      assert.ok(Math.abs(sv.probabilities()[state] - 1) < 1e-10);
      const sign = c.marked[state] ? -1 : 1,
        phase = [sv.re[state] * sign, sv.im[state] * sign];
      if (!base) base = phase;
      assert.ok(
        Math.hypot(phase[0] - base[0], phase[1] - base[1]) < 1e-10,
        "oracle phase is correct up to a common global phase",
      );
    }
  }
});
test("ideal and zero-noise circuits match the reference and conserve probability", () => {
  for (const spec of [
    { count: 3 },
    { count: 4, requires: ["d0"], any: ["d1", "d2", "d3"] },
    { count: 3, barriers: ["x_barrier"] },
  ]) {
    const r = compareExecution(fixture(spec), { iterations: 9, noise: zero });
    assert.ok(r.ideal.maxReferenceError < 1e-10);
    assert.equal(r.noisy.status, "completed");
    assert.ok(r.distribution.every((x) => Math.abs(x.ideal - x.noisy) < 1e-10));
    assert.equal(
      r.distribution.reduce((s, x) => s + x.noisyCount, 0),
      4096,
    );
  }
});
test("readout errors, constant predicates and resource limits are explicit", () => {
  const run = fixture({ count: 2 });
  const r = compareExecution(run, { noise: { ...zero, readout: 1 } });
  assert.ok(r.noisy.probability < 1e-10);
  assert.ok(r.ideal.probability > 1 - 1e-10);
  const mixed = compareExecution(run, {
    noise: { single: 1, two: 1, readout: 0 },
  });
  assert.ok(Math.abs(mixed.noisy.probability - 0.25) < 1e-10);
  const constant = compareExecution(
    fixture({ count: 2, fixed: { d0: false } }),
  );
  assert.equal(constant.reference.fullMarkedStates, "0");
  assert.equal(constant.ideal.probability, 0);
  assert.throws(
    () => compileOracle(fixture({ count: 9 })),
    /no dimensions were discarded/,
  );
  assert.equal(
    compareExecution(fixture({ count: 8 }), { iterations: 1 }).noisy.status,
    "limited",
  );
  assert.throws(
    () => compareExecution(run, { noise: { single: -1 } }),
    /Noise parameters/,
  );
  assert.throws(() => compareExecution(run, { iterations: 41 }), /0–40/);
});
test("exports carry every outcome, circuit, mask reduction and exact scope", () => {
  const run = fixture({ count: 3, spectators: 4 }),
    r = compareExecution(run);
  assert.equal(r.bindingKey, run.bindingKey);
  assert.equal(r.distribution.length, 8);
  assert.equal(r.circuit.factoredDimensions.length, 4);
  assert.equal(r.reference.fullMaskStates, "128");
  assert.match(openQasm(r.circuit, r.circuit.gates), /OPENQASM 2.0/);
  assert.deepEqual(
    compareExecution(run).distribution,
    r.distribution,
    "seeded shot sampling is reproducible",
  );
});
test("browser distributions match independent Qiskit and Aer golden results", () => {
  const golden = JSON.parse(
    readFileSync(
      new URL("./fixtures/quantum-aer.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(golden.aer, "0.17.1");
  for (const c of golden.cases) {
    const r = compareExecution(fixture({ ...c.spec, name: c.name }), c.options);
    assert.equal(r.distribution.length, c.idealProbabilities.length);
    assert.ok(
      r.distribution.every(
        (p, i) => Math.abs(p.ideal - c.idealProbabilities[i]) < 1e-8,
      ),
      c.name + " ideal",
    );
    if (c.noisyProbabilities)
      assert.ok(
        r.distribution.every(
          (p, i) => Math.abs(p.noisy - c.noisyProbabilities[i]) < 1e-8,
        ),
        c.name + " noisy",
      );
  }
});


test("automatic selection reaches the threshold without stopping at an inadequate first peak", () => {
  const r = compareExecution(fixture({count:3}));
  assert.equal(r.circuit.iterations,6);
  assert.ok(r.trace.slice(0,-1).every(t => t.ideal < .95));
  assert.equal(r.alignment.idealReached,true);
  assert.equal(r.alignment.noisyReached,false);
  const short = fixture({count:3}); short.config.maxIterations=2;
  const limited=compareExecution(short);
  assert.equal(limited.circuit.iterations,2);
  assert.equal(limited.alignment.reached,false);
  assert.throws(() => compareExecution(short,{iterations:3}),/budget/);
  short.config.maxIterations=999;
  assert.equal(compareExecution(short).alignment.maxIterations,40);
  const half=compareExecution(fixture({count:1}));
  assert.equal(half.circuit.iterations,0);
  assert.equal(half.alignment.reached,false);
  assert.throws(() => compareExecution(short,{threshold:0}),/threshold/);
});
test("noisy selection retains a real earlier checkpoint and honors work and iteration limits", () => {
  const run=fixture({count:3}),r=compareExecution(run,{selection:'noisy'});
  assert.equal(r.alignment.executedIterations,40);
  assert.equal(r.circuit.iterations,2);
  assert.equal(r.alignment.reached,false);
  const fixed=compareExecution(run,{iterations:2});
  assert.deepEqual(r.distribution,fixed.distribution);
  assert.deepEqual(r.circuit.gates,fixed.circuit.gates);
  const early=compareExecution(fixture({count:2}),{selection:'noisy',noise:{single:.0001,two:.001,readout:.001}});
  assert.equal(early.alignment.reached,true);
  assert.equal(early.alignment.executedIterations,1);
  const bounded=compareExecution(fixture({count:6}),{selection:'noisy'});
  assert.ok(bounded.alignment.executedIterations<40);
  assert.ok(bounded.alignment.densityWork<=35000000);
  assert.equal(bounded.alignment.reason,'resource_limit');
});
test("discovered configurations come from accepted sampled outcomes and do not certify evidence", () => {
  const run=fixture({count:3,requires:['d0'],any:['d1','d2'],spectators:4});
  const r=compareExecution(run);
  assert.equal(r.discovery.status,'candidate_found');
  assert.equal(r.discovery.distinctAcceptedOutcomes,3);
  for (const found of r.discovery.candidates) {
    const outcome=r.distribution.find(x=>x.bits===found.bits);
    assert.ok(outcome.marked && outcome.noisyCount>0);
    assert.equal(found.shots,outcome.noisyCount);
    assert.equal(found.assignments.length,3);
  }
  assert.equal(r.discovery.evidenceStatus,run.binding.status);
  assert.equal(r.circuit.factoredDimensions.length,4);
  assert.equal(compareExecution(fixture({count:2,fixed:{d0:false}})).discovery.status,'no_solutions');
});
