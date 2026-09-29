// QCDS by Patrik Sundblom. Contributor: ChatGPT (OpenAI). See LICENSE.md.
// Gate-by-gate CPU simulation. No QPU calls and no device-calibration claim.
export const QUANTUM_VERSION = "1.0.0";
export const LIMITS = Object.freeze({
  qubits: 8,
  noisyQubits: 6,
  densityWork: 35000000,
  gates: 150000,
});
export const DEFAULT_NOISE = Object.freeze({
  single: 0.001,
  two: 0.01,
  readout: 0.01,
});
const clock = () => globalThis.performance?.now() ?? Date.now();
const gate = (name, qubits, angle) => ({
  name,
  qubits,
  ...(angle === undefined ? {} : { angle }),
});
const sum = (values) => values.reduce((a, b) => a + b, 0);

// Phase-polynomial synthesis: AND(x) = sum(nonempty S) (-1)^(|S|-1)
// parity(S) / 2^(k-1). RZ implements the phase up to one global phase.
// This creates actual H/X/RZ/CX instructions, not a marked-state shortcut.
function phaseAnd(literals) {
  if (!literals.length) return []; // A global phase has no observable effect.
  const operations = [],
    zeros = literals.filter((x) => x.value === 0);
  zeros.forEach((x) => operations.push(gate("x", [x.qubit])));
  for (let subset = 1; subset < 2 ** literals.length; subset++) {
    const bits = literals
      .filter((_, i) => subset & (1 << i))
      .map((x) => x.qubit);
    const target = bits[bits.length - 1],
      controls = bits.slice(0, -1);
    controls.forEach((q) => operations.push(gate("cx", [q, target])));
    operations.push(
      gate(
        "rz",
        [target],
        (Math.PI * (bits.length % 2 ? 1 : -1)) / 2 ** (literals.length - 1),
      ),
    );
    controls
      .slice()
      .reverse()
      .forEach((q) => operations.push(gate("cx", [q, target])));
  }
  zeros
    .slice()
    .reverse()
    .forEach((x) => operations.push(gate("x", [x.qubit])));
  return operations;
}

export function compileOracle(run) {
  if (!run?.final?.graph || !run.focus)
    throw new Error("Run dimensional inference first.");
  const dimensions = run.final.dimensions;
  const values = new Map(dimensions.map((d) => [d.key, d.value]));
  const controls = run.recursion || [];
  const dependencies = [
    ...new Set([
      ...(run.focus.requires || []),
      ...(run.focus.requiresAny || []),
      ...controls.map((c) => c.key),
    ]),
  ];
  const missing = dependencies.filter(
    (key) => !values.has(key) || values.get(key) === "ABSENT",
  );
  if (missing.length)
    throw new Error(
      "This oracle is inactive because a required coordinate is absent. Restore it before comparing execution.",
    );
  const required = new Map();
  let impossible = false;
  function requireValue(key, value) {
    const fixed = values.get(key);
    if (fixed !== "?") {
      if (Number(fixed) !== value) impossible = true;
      return;
    }
    if (required.has(key) && required.get(key) !== value) impossible = true;
    required.set(key, value);
  }
  (run.focus.requires || []).forEach((key) => requireValue(key, 1));
  controls.forEach((c) => requireValue(c.key, 0));
  const alternatives = [...new Set(run.focus.requiresAny || [])];
  const anySatisfied =
    !alternatives.length ||
    alternatives.some(
      (key) => values.get(key) === "1" || required.get(key) === 1,
    );
  let any = anySatisfied
    ? []
    : alternatives.filter(
        (key) => values.get(key) === "?" && !required.has(key),
      );
  if (!anySatisfied && !any.length) impossible = true;
  if (impossible) {
    required.clear();
    any = [];
  }
  const keys = dimensions
    .filter((d) => required.has(d.key) || any.includes(d.key))
    .map((d) => d.key);
  if (keys.length > LIMITS.qubits)
    throw new Error(
      `This predicate needs ${keys.length} interacting qubits. The browser circuit limit is ${LIMITS.qubits}; no dimensions were discarded. Use a smaller, explicitly scoped case for this comparison.`,
    );
  const n = keys.length,
    width = 2 ** n,
    index = new Map(keys.map((key, i) => [key, i]));
  const literals = [...required].map(([key, value]) => ({
    qubit: index.get(key),
    value,
  }));
  const oracle = impossible ? [] : phaseAnd(literals);
  if (any.length)
    oracle.push(
      ...phaseAnd([
        ...literals,
        ...any.map((key) => ({ qubit: index.get(key), value: 0 })),
      ]),
    );
  const preparation = keys.map((_, i) => gate("h", [i]));
  const diffusion = [
    ...preparation,
    ...keys.map((_, i) => gate("x", [i])),
    ...phaseAnd(keys.map((_, i) => ({ qubit: i, value: 1 }))),
    ...keys.map((_, i) => gate("x", [i])),
    ...preparation,
  ];
  // The independent classical truth table comes from the original BDD graph,
  // not the circuit expression. Unused free coordinates remain uniform factors.
  const nodes = new Map(run.final.graph.nodes.map((node) => [node.id, node]));
  const marked = Array.from({ length: width }, (_, state) => {
    let id = run.final.graph.root;
    while (id > 1) {
      const node = nodes.get(id);
      if (!node) throw new Error("Invalid oracle graph.");
      const q = index.get(node.dimension);
      const bit =
        q === undefined
          ? Number(values.get(node.dimension) === "1")
          : (state >> q) & 1;
      id = bit ? node.one : node.zero;
    }
    return id === 1;
  });
  const markedCount = marked.filter(Boolean).length;
  if (
    BigInt(run.final.markedStates) * BigInt(width) !==
    BigInt(run.final.totalStates) * BigInt(markedCount)
  )
    throw new Error(
      "Circuit reduction does not preserve the full mask count. Comparison stopped.",
    );
  return {
    qubits: n,
    keys,
    labels: keys.map((key) => dimensions.find((d) => d.key === key).label),
    factoredDimensions: dimensions
      .filter((d) => d.value === "?" && !index.has(d.key))
      .map((d) => d.key),
    fixedDimensions: dimensions
      .filter((d) => d.value === "0" || d.value === "1")
      .map((d) => ({ key: d.key, value: d.value })),
    fullMaskStates: run.final.totalStates,
    fullMarkedStates: run.final.markedStates,
    marked,
    markedCount,
    preparation,
    oracle,
    diffusion,
    reduction:
      "Uniform spectator coordinates factor out of the ideal search. Noise is applied only to the explicitly compiled reduced circuit.",
  };
}

// Complex statevector implementation. These functions never inspect the
// marked-state list or Grover's closed-form probability.
export class Statevector {
  constructor(qubits, basis = 0) {
    this.n = 2 ** qubits;
    this.re = new Float64Array(this.n);
    this.im = new Float64Array(this.n);
    this.re[basis] = 1;
  }
  apply(g) {
    const [q, t] = g.qubits,
      bit = 1 << q,
      r = this.re,
      im = this.im;
    if (g.name === "rz") {
      const c = Math.cos(g.angle / 2),
        s = Math.sin(g.angle / 2);
      for (let i = 0; i < this.n; i++) {
        const v = i & bit ? s : -s,
          a = r[i],
          b = im[i];
        r[i] = c * a - v * b;
        im[i] = v * a + c * b;
      }
      return;
    }
    for (let i = 0; i < this.n; i++) {
      let j;
      if (g.name === "cx") {
        if (!(i & bit) || i & (1 << t)) continue;
        j = i | (1 << t);
      } else {
        if (i & bit) continue;
        j = i | bit;
      }
      if (g.name === "h") {
        const a = r[i],
          b = im[i];
        r[i] = (a + r[j]) * Math.SQRT1_2;
        im[i] = (b + im[j]) * Math.SQRT1_2;
        r[j] = (a - r[j]) * Math.SQRT1_2;
        im[j] = (b - im[j]) * Math.SQRT1_2;
      } else if (g.name === "x" || g.name === "cx") {
        [r[i], r[j]] = [r[j], r[i]];
        [im[i], im[j]] = [im[j], im[i]];
      } else throw new Error(`Unsupported gate: ${g.name}`);
    }
  }
  probabilities() {
    return Array.from(this.re, (v, i) => v * v + this.im[i] * this.im[i]);
  }
}

// Exact density matrix for the declared local channels (floating-point).
// E_A(rho)=(1-lambda)rho + lambda I_A/d_A tensor Tr_A(rho).
export class DensityMatrix {
  constructor(qubits) {
    this.n = 2 ** qubits;
    this.re = new Float64Array(this.n * this.n);
    this.im = new Float64Array(this.n * this.n);
    this.re[0] = 1;
  }
  apply(g) {
    const n = this.n,
      r = this.re,
      im = this.im,
      [q, t] = g.qubits,
      bit = 1 << q;
    if (g.name === "rz") {
      const c = Math.cos(g.angle),
        s = Math.sin(g.angle);
      for (let row = 0; row < n; row++)
        for (let col = 0; col < n; col++)
          if ((row & bit) !== (col & bit)) {
            const at = row * n + col,
              v = row & bit ? s : -s,
              a = r[at],
              b = im[at];
            r[at] = c * a - v * b;
            im[at] = v * a + c * b;
          }
      return;
    }
    for (let i = 0; i < n; i++) {
      let j;
      if (g.name === "cx") {
        if (!(i & bit) || i & (1 << t)) continue;
        j = i | (1 << t);
      } else {
        if (i & bit) continue;
        j = i | bit;
      }
      if (!["h", "x", "cx"].includes(g.name))
        throw new Error(`Unsupported gate: ${g.name}`);
      for (let k = 0; k < n; k++) {
        const a = i * n + k,
          b = j * n + k;
        if (g.name === "h") {
          const x = r[a],
            y = im[a];
          r[a] = (x + r[b]) * Math.SQRT1_2;
          im[a] = (y + im[b]) * Math.SQRT1_2;
          r[b] = (x - r[b]) * Math.SQRT1_2;
          im[b] = (y - im[b]) * Math.SQRT1_2;
        } else {
          [r[a], r[b]] = [r[b], r[a]];
          [im[a], im[b]] = [im[b], im[a]];
        }
      }
    }
    for (let i = 0; i < n; i++) {
      let j;
      if (g.name === "cx") {
        if (!(i & bit) || i & (1 << t)) continue;
        j = i | (1 << t);
      } else {
        if (i & bit) continue;
        j = i | bit;
      }
      for (let k = 0; k < n; k++) {
        const a = k * n + i,
          b = k * n + j;
        if (g.name === "h") {
          const x = r[a],
            y = im[a];
          r[a] = (x + r[b]) * Math.SQRT1_2;
          im[a] = (y + im[b]) * Math.SQRT1_2;
          r[b] = (x - r[b]) * Math.SQRT1_2;
          im[b] = (y - im[b]) * Math.SQRT1_2;
        } else {
          [r[a], r[b]] = [r[b], r[a]];
          [im[a], im[b]] = [im[b], im[a]];
        }
      }
    }
  }
  depolarize(qubits, lambda) {
    if (!lambda) return;
    const n = this.n,
      r = this.re,
      im = this.im,
      d = 2 ** qubits.length,
      mask = qubits.reduce((m, q) => m | (1 << q), 0);
    const local = Array.from({ length: d }, (_, a) =>
      qubits.reduce((bits, q, i) => bits | (((a >> i) & 1) << q), 0),
    );
    for (let row = 0; row < n; row++)
      if (!(row & mask))
        for (let col = 0; col < n; col++)
          if (!(col & mask)) {
            let tr = 0,
              ti = 0;
            for (const b of local) {
              const at = (row | b) * n + (col | b);
              tr += r[at];
              ti += im[at];
            }
            for (const a of local)
              for (const b of local) {
                const at = (row | a) * n + (col | b);
                r[at] =
                  (1 - lambda) * r[at] + (a === b ? (lambda * tr) / d : 0);
                im[at] =
                  (1 - lambda) * im[at] + (a === b ? (lambda * ti) / d : 0);
              }
          }
  }
  probabilities() {
    return Array.from({ length: this.n }, (_, i) => this.re[i * this.n + i]);
  }
}

export function readoutChannel(probabilities, qubits, p) {
  const out = [...probabilities];
  for (let q = 0; q < qubits; q++)
    for (let i = 0; i < out.length; i++)
      if (!(i & (1 << q))) {
        const j = i | (1 << q),
          a = out[i],
          b = out[j];
        out[i] = (1 - p) * a + p * b;
        out[j] = p * a + (1 - p) * b;
      }
  return out;
}
function probabilityMass(p, marked) {
  return sum(p.filter((_, i) => marked[i]));
}
function validateDistribution(p) {
  if (
    p.some((x) => !Number.isFinite(x) || x < -1e-9) ||
    Math.abs(sum(p) - 1) > 1e-8
  )
    throw new Error(
      "Simulation normalization failed. Results were not accepted.",
    );
  return p.map((x) => Math.max(0, x));
}
function sample(probabilities, shots, seed) {
  let state = seed >>> 0;
  const counts = Array(probabilities.length).fill(0),
    cdf = [];
  let mass = 0;
  probabilities.forEach((p) => cdf.push((mass += p)));
  for (let i = 0; i < shots; i++) {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const u = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    let lo = 0,
      hi = cdf.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (u < cdf[mid]) hi = mid;
      else lo = mid + 1;
    }
    counts[lo]++;
  }
  return counts;
}
function interval(hits, shots) {
  const z = 1.959963984540054,
    p = hits / shots,
    den = 1 + (z * z) / shots,
    center = (p + (z * z) / (2 * shots)) / den,
    half =
      (z * Math.sqrt((p * (1 - p)) / shots + (z * z) / (4 * shots * shots))) /
      den;
  return [Math.max(0, center - half), Math.min(1, center + half)];
}
export function circuitMetrics(gates, qubits) {
  const levels = Array(qubits).fill(0),
    counts = { h: 0, x: 0, rz: 0, cx: 0 };
  for (const g of gates) {
    counts[g.name]++;
    const next = 1 + Math.max(...g.qubits.map((q) => levels[q]));
    g.qubits.forEach((q) => (levels[q] = next));
  }
  return {
    gates: gates.length,
    twoQubitGates: counts.cx,
    depth: Math.max(0, ...levels),
    counts,
    auxiliaryQubits: 0,
    basis: ["h", "x", "rz", "cx"],
    topology: "All-to-all logical circuit; hardware routing is not included.",
  };
}
export function openQasm(circuit, gates) {
  if (!circuit.qubits)
    return "// No unresolved oracle coordinates: no quantum circuit is needed.\n";
  const lines = [
    "OPENQASM 2.0;",
    'include "qelib1.inc";',
    `qreg q[${circuit.qubits}];`,
    `creg c[${circuit.qubits}];`,
    "// QCDS by Patrik Sundblom. Ideal circuit; noise is in the comparison JSON.",
  ];
  circuit.keys.forEach((key, i) =>
    lines.push(`// q[${i}] = ${key.replace(/[^a-zA-Z0-9_-]/g, "_")}`),
  );
  gates.forEach((g) =>
    lines.push(
      `${g.name}${g.name === "rz" ? `(${g.angle})` : ""} ${g.qubits.map((q) => `q[${q}]`).join(",")};`,
    ),
  );
  lines.push("measure q -> c;");
  return lines.join("\n") + "\n";
}

export function compareExecution(run, raw = {}) {
  const start = clock(),
    circuit = compileOracle(run),
    n = circuit.qubits,
    width = 2 ** n;
  const noise = { ...DEFAULT_NOISE, ...raw.noise };
  for (const key of ["single", "two", "readout"])
    if (!Number.isFinite(noise[key]) || noise[key] < 0 || noise[key] > 1)
      throw new Error("Noise parameters must be between 0 and 1.");
  const shots = raw.shots ?? 4096,
    seed = raw.seed ?? 173;
  if (
    !Number.isInteger(shots) ||
    shots < 128 ||
    shots > 16384 ||
    !Number.isInteger(seed) ||
    seed < 0 ||
    seed > 4294967295
  )
    throw new Error("Use 128–16384 shots and an unsigned 32-bit seed.");
  const fraction = circuit.markedCount / width,
    theta = Math.asin(Math.sqrt(fraction));
  const firstPeak =
    fraction === 0 || fraction === 1
      ? 0
      : Math.max(0, Math.floor(Math.PI / (4 * theta)));
  const iterations =
    raw.iterations ?? Math.min(run.config?.maxIterations ?? 40, firstPeak);
  if (!Number.isInteger(iterations) || iterations < 0 || iterations > 40)
    throw new Error("Choose 0–40 Grover iterations.");
  const cycle = [...circuit.oracle, ...circuit.diffusion];
  const gates = [
    ...circuit.preparation,
    ...Array.from({ length: iterations }, () => cycle).flat(),
  ];
  if (gates.length > LIMITS.gates)
    throw new Error(
      "This compiled circuit exceeds the browser gate budget. Reduce the iteration count; no partial run was substituted.",
    );
  const expected = (t) =>
    fraction === 0
      ? 0
      : fraction === 1
        ? 1
        : Math.sin((2 * t + 1) * theta) ** 2;
  const referenceMs = clock() - start;
  const noisyReason =
    n > LIMITS.noisyQubits
      ? `The exact noisy simulator supports up to ${LIMITS.noisyQubits} interacting qubits; this circuit needs ${n}.`
      : gates.length * width * width > LIMITS.densityWork
        ? "The requested density-matrix run exceeds the browser work budget. Lower the iteration count or use a smaller explicitly scoped oracle."
        : null;
  const ideal = new Statevector(n),
    density = noisyReason ? null : new DensityMatrix(n),
    trace = [];
  let idealMs = 0,
    noisyMs = 0;
  function apply(batch) {
    let t = clock();
    batch.forEach((g) => ideal.apply(g));
    idealMs += clock() - t;
    if (density) {
      t = clock();
      batch.forEach((g) => {
        density.apply(g);
        density.depolarize(
          g.qubits,
          g.name === "cx" ? noise.two : noise.single,
        );
      });
      noisyMs += clock() - t;
    }
  }
  function record(iteration) {
    const p = ideal.probabilities(),
      q = density
        ? readoutChannel(density.probabilities(), n, noise.readout)
        : null;
    trace.push({
      iteration,
      reference: expected(iteration),
      ideal: probabilityMass(p, circuit.marked),
      noisy: q ? probabilityMass(q, circuit.marked) : null,
    });
  }
  apply(circuit.preparation);
  record(0);
  for (let i = 1; i <= iterations; i++) {
    apply(cycle);
    record(i);
  }
  const p = validateDistribution(ideal.probabilities()),
    q = density
      ? validateDistribution(
          readoutChannel(density.probabilities(), n, noise.readout),
        )
      : null;
  const maxReferenceError = Math.max(
    ...trace.map((t) => Math.abs(t.reference - t.ideal)),
  );
  if (maxReferenceError > 1e-8)
    throw new Error(
      "The compiled circuit disagrees with the independent classical reference. Comparison stopped.",
    );
  const idealCounts = sample(p, shots, seed),
    noisyCounts = q ? sample(q, shots, (seed + 1) >>> 0) : null;
  function sampled(counts) {
    if (!counts) return null;
    const hits = sum(counts.filter((_, i) => circuit.marked[i]));
    return {
      shots,
      hits,
      successRate: hits / shots,
      interval95: interval(hits, shots),
    };
  }
  const last = trace[trace.length - 1];
  return {
    schema: "qcds-security-lab/quantum-comparison-v1",
    version: QUANTUM_VERSION,
    generatedAt: new Date().toISOString(),
    bindingKey: run.bindingKey,
    system: run.system,
    vectorId: run.focus.id,
    substrate: "CPU statevector + density-matrix simulation; no QPU job",
    circuit: {
      ...circuit,
      gates,
      metrics: circuitMetrics(gates, n),
      iterations,
      iterationSelection:
        raw.iterations === undefined
          ? "First ideal peak within the selected budget, using the classical reference count"
          : "User-selected; identical for every backend",
    },
    reference: {
      fullMaskStates: circuit.fullMaskStates,
      fullMarkedStates: circuit.fullMarkedStates,
      initialProbability: fraction,
      expectedProbability: last.reference,
      runtimeMs: referenceMs,
    },
    ideal: {
      probability: last.ideal,
      maxReferenceError,
      runtimeMs: idealMs,
      sample: sampled(idealCounts),
    },
    noisy: q
      ? {
          status: "completed",
          probability: last.noisy,
          runtimeMs: noisyMs,
          sample: sampled(noisyCounts),
          totalVariationDistance: sum(p.map((v, i) => Math.abs(v - q[i]))) / 2,
        }
      : { status: "limited", reason: noisyReason },
    noise: {
      ...noise,
      model:
        "Local depolarizing channel after each H/X/RZ and CX; independent symmetric readout flips. No device calibration, T1/T2, idle noise or crosstalk.",
      seed,
      shots,
    },
    trace,
    distribution: p.map((probability, i) => ({
      bits: n ? i.toString(2).padStart(n, "0") : "empty",
      marked: circuit.marked[i],
      ideal: probability,
      noisy: q?.[i] ?? null,
      idealCount: idealCounts[i],
      noisyCount: noisyCounts?.[i] ?? null,
    })),
    interpretation:
      "Success means measuring an assignment accepted by this declared oracle. It is not evidence of an exploit, truth or a quantum speedup. Classical counting, statevector simulation and density-matrix simulation have different costs.",
    bitOrder:
      "Little endian: q[0] is the rightmost bit. Every reduced-register outcome is exported; factored spectator coordinates are listed separately.",
    runtimeMs: clock() - start,
  };
}

export function comparisonMarkdown(r) {
  return (
    [
      `# QCDS execution comparison`,
      `Author: Patrik Sundblom. Contributor: ChatGPT (OpenAI).`,
      `System: ${r.system}. Vector: ${r.vectorId}.`,
      r.substrate,
      `Same oracle, ${r.circuit.qubits} interacting qubits, ${r.circuit.iterations} Grover iterations.`,
      `Full mask: ${r.reference.fullMarkedStates} marked / ${r.reference.fullMaskStates} states.`,
      `Reference: ${r.reference.expectedProbability}. Ideal circuit: ${r.ideal.probability}. Maximum discrepancy: ${r.ideal.maxReferenceError}.`,
      r.noisy.status === "completed"
        ? `Noisy success mass: ${r.noisy.probability}. Samples: ${r.noisy.sample.hits}/${r.noisy.sample.shots}; 95% Wilson interval ${r.noisy.sample.interval95.join(" to ")}.`
        : `Noisy run not performed: ${r.noisy.reason}`,
      `Circuit: ${r.circuit.metrics.gates} gates, ${r.circuit.metrics.twoQubitGates} CX, depth ${r.circuit.metrics.depth}.`,
      `Noise parameters: one-qubit ${r.noise.single}, two-qubit ${r.noise.two}, readout ${r.noise.readout}; seed ${r.noise.seed}.`,
      r.noise.model,
      r.circuit.reduction,
      `Factored coordinates: ${r.circuit.factoredDimensions.join(", ") || "none"}.`,
      r.interpretation,
      "The complete comparison JSON contains all gates, all reduced-register probabilities, shot counts, the trace and scope binding.",
    ].join("\n\n") + "\n"
  );
}
