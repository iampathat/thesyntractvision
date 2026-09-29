import { groverPlan } from "./grover-policy.mjs?v=1.0.0";
// QCDS by Patrik Sundblom. Assistant contributor: ChatGPT (OpenAI).
// Commercial license: LICENSE.md. Symbolic classical reference, no QPU calls.
export const ABSENT = "ABSENT";
export const LOGICAL_VERSION = "1.0.0";
const SYMBOLS = new Set(["0", "1", "?", ABSENT]);
const tri = (v) => (v === true ? "1" : v === false ? "0" : v == null ? "?" : v);
const pow2 = (n) => 1n << BigInt(n);

// Reduced ordered binary decision diagram. Counts use BigInt; no 2^n array.
export class LogicalSpace {
  constructor(dimensions, order = dimensions.map((d) => d.key)) {
    this.dimensions = dimensions.filter((d) => tri(d.value) !== ABSENT);
    const unknown = new Set(
      this.dimensions.filter((d) => tri(d.value) === "?").map((d) => d.key),
    );
    this.order = [...order.filter((key) => unknown.has(key))];
    if (
      new Set(this.order).size !== unknown.size ||
      this.order.length !== unknown.size
    )
      throw new Error(
        "Every unresolved dimension must occur once in the logical order.",
      );
    this.values = new Map(dimensions.map((d) => [d.key, tri(d.value)]));
    this.level = new Map(this.order.map((key, i) => [key, i]));
    this.nodes = [null, null];
    this.unique = new Map();
    this.memo = new Map();
    this.countMemo = new Map();
    this.total = pow2(this.order.length);
  }
  node(level, lo, hi) {
    if (lo === hi) return lo;
    const key = `${level}:${lo}:${hi}`;
    if (this.unique.has(key)) return this.unique.get(key);
    if (this.nodes.length >= 60000)
      throw new Error(
        "This oracle exceeded the browser's 60,000-node budget. Split the investigation into smaller lanes.",
      );
    const id = this.nodes.length;
    this.nodes.push({ level, lo, hi });
    this.unique.set(key, id);
    return id;
  }
  literal(key, value = "1") {
    const actual = this.values.get(key);
    if (!actual || actual === ABSENT)
      throw new Error(`Inactive oracle refers to an absent dimension: ${key}`);
    if (actual !== "?") return actual === value ? 1 : 0;
    return this.node(
      this.level.get(key),
      value === "1" ? 0 : 1,
      value === "1" ? 1 : 0,
    );
  }
  combine(op, a, b) {
    if (a > b) [a, b] = [b, a];
    if (op === "and") {
      if (a === 0 || b === 0) return 0;
      if (a === 1) return b;
    } else {
      if (b === 1 || a === 1) return 1;
      if (a === 0) return b;
    }
    if (a === b) return a;
    const key = `${op}:${a}:${b}`;
    if (this.memo.has(key)) return this.memo.get(key);
    const level = Math.min(
      this.nodes[a]?.level ?? Infinity,
      this.nodes[b]?.level ?? Infinity,
    );
    const branch = (id, side) =>
      this.nodes[id]?.level === level ? this.nodes[id][side] : id;
    const result = this.node(
      level,
      this.combine(op, branch(a, "lo"), branch(b, "lo")),
      this.combine(op, branch(a, "hi"), branch(b, "hi")),
    );
    this.memo.set(key, result);
    return result;
  }
  all(ids) {
    return ids.reduce((a, b) => this.combine("and", a, b), 1);
  }
  any(ids) {
    return ids.reduce((a, b) => this.combine("or", a, b), 0);
  }
  count(root, from = 0) {
    if (root === 0) return 0n;
    if (root === 1) return pow2(this.order.length - from);
    const key = `${root}:${from}`;
    if (this.countMemo.has(key)) return this.countMemo.get(key);
    const n = this.nodes[root];
    const result =
      pow2(n.level - from) *
      (this.count(n.lo, n.level + 1) + this.count(n.hi, n.level + 1));
    this.countMemo.set(key, result);
    return result;
  }
  witness(root) {
    if (!root) return null;
    const answer = Object.fromEntries(
      this.dimensions.map((d) => [
        d.key,
        tri(d.value) === "?" ? "0" : tri(d.value),
      ]),
    );
    let current = root;
    while (current > 1) {
      const node = this.nodes[current],
        side = node.lo ? "lo" : "hi";
      answer[this.order[node.level]] = side === "hi" ? "1" : "0";
      current = node[side];
    }
    return answer;
  }
  decisionGraph(root) {
    const visited = new Set(),
      nodes = [];
    const walk = (id) => {
      if (id < 2 || visited.has(id)) return;
      visited.add(id);
      const n = this.nodes[id];
      nodes.push({ id, dimension: this.order[n.level], zero: n.lo, one: n.hi });
      walk(n.lo);
      walk(n.hi);
    };
    walk(root);
    return {
      root,
      terminals: { 0: "unmarked", 1: "marked" },
      variableOrder: [...this.order],
      nodes,
    };
  }
}

// Exact two-subspace ideal-Grover reduction for a uniform initial state and
// Boolean phase oracle. Stores every state's weight by oracle membership.
// https://quantum.cloud.ibm.com/learning/en/courses/fundamentals-of-quantum-algorithms/grover-algorithm/analysis
export function amplify(marked, total, maxIterations = 40) {
  const m = BigInt(marked), n = BigInt(total);
  const plan = groverPlan(m, n, { maxIterations });
  const cap = plan.cap, fraction = plan.initialProbability, trace = plan.trace, best = plan.selected;
  return {
    substrate: "classical-symbolic / ideal Grover reference",
    markedStates: m.toString(),
    totalStates: n.toString(),
    iterations: best.iteration,
    iterationBudget: cap,
    alignment: { threshold: plan.threshold, reached: plan.reached, reason: plan.reason, bestWithinBudget: plan.best },
    initialProbability: fraction,
    probability: best.probability,
    lift: fraction ? best.probability / fraction : 0,
    trace,
    distribution: {
      representation:
        "lossless two-subspace distribution with Boolean membership graph",
      marked: {
        count: m.toString(),
        mass: best.probability,
        probabilityPerState: m ? best.probability / Number(m) : 0,
      },
      unmarked: {
        count: (n - m).toString(),
        mass: 1 - best.probability,
        probabilityPerState: n > m ? (1 - best.probability) / Number(n - m) : 0,
      },
    },
  };
}

export function normalizeResearch(value = {}) {
  if (!value || typeof value !== "object")
    throw new Error("Invalid dimensional investigation.");
  const text = (s, max = 2000) => typeof s === "string" && s.length <= max;
  const dimensions = value.dimensions || [],
    controls = value.controls || [],
    walk = value.walk || [],
    records = value.records || [];
  if (
    ![dimensions, controls, walk, records].every(Array.isArray) ||
    dimensions.length > 114 ||
    controls.length > 32 ||
    walk.length > 100 ||
    records.length > 150
  )
    throw new Error("Dimensional investigation exceeds its browser budget.");
  if (
    dimensions.some(
      (d) =>
        !d ||
        !/^x_[a-z0-9_-]{1,70}$/.test(d.key) ||
        !text(d.label, 240) ||
        !d.label.trim() ||
        !["0", "1", "?"].includes(d.value),
    ) ||
    new Set(dimensions.map((d) => d.key)).size !== dimensions.length
  )
    throw new Error(
      "Each added dimension needs a unique key, statement and 1 / 0 / ? value.",
    );
  if (
    controls.some(
      (c) =>
        !c ||
        !text(c.id, 80) ||
        !text(c.vectorId, 80) ||
        !text(c.label, 1000) ||
        !text(c.test, 3000) ||
        !dimensions.some((d) => d.key === c.key),
    )
  )
    throw new Error(
      "A control must refer to an existing dimension and attack vector.",
    );
  if (walk.some((w) => !w || !text(w.key, 80) || !SYMBOLS.has(w.value)))
    throw new Error("A walk value must be 1, 0, ?, or ABSENT.");
  if (
    records.some(
      (r) =>
        !r ||
        !["supports", "refutes", "inconclusive"].includes(r.outcome) ||
        !text(r.vectorId, 80) ||
        !text(r.bindingKey, 100000) ||
        !text(r.source, 1000) ||
        !r.source.trim() ||
        !text(r.observation, 5000) ||
        !r.observation.trim() ||
        !text(r.createdAt, 80),
    )
  )
    throw new Error(
      "A dimensional observation needs its exact scope, source and result.",
    );
  return {
    dimensions: dimensions.map(({ key, label, value }) => ({
      key,
      label,
      value,
    })),
    controls: controls.map(({ id, key, vectorId, label, test }) => ({
      id,
      key,
      vectorId,
      label,
      test,
    })),
    walk: walk.map(({ key, value }) => ({ key, value })),
    records: records.map(
      ({ vectorId, bindingKey, outcome, source, observation, createdAt }) => ({
        vectorId,
        bindingKey,
        outcome,
        source,
        observation,
        createdAt,
      }),
    ),
    focus: text(value.focus, 80) ? value.focus : "",
    mode: ["parallel", "sequential", "hybrid"].includes(value.mode)
      ? value.mode
      : "hybrid",
    maxIterations: Number.isInteger(value.maxIterations)
      ? Math.max(0, Math.min(40, value.maxIterations))
      : 40,
  };
}

function predicate(vector, dimensions, controls, space) {
  const required = [...new Set(vector.requires || [])],
    any = [...new Set(vector.requiresAny || [])];
  const attached = controls.filter((c) => c.vectorId === vector.id);
  const dependencies = [...required, ...any, ...attached.map((c) => c.key)];
  const missing = dependencies.filter(
    (key) => !space.values.has(key) || space.values.get(key) === ABSENT,
  );
  // A predicate using a removed coordinate is inactive, never relaxed to true.
  if (missing.length) return { root: 0, inactive: missing };
  const root = space.all([
    ...required.map((key) => space.literal(key)),
    ...(any.length ? [space.any(any.map((key) => space.literal(key)))] : []),
    ...attached.map((control) => space.literal(control.key, "0")),
  ]);
  return { root, inactive: [] };
}

function evaluate(dimensions, vectors, controls, focus, maxIterations, order) {
  const space = new LogicalSpace(dimensions, order),
    counts = { active: 0, conditional: 0, rejected: 0, inactive: 0 };
  const roots = new Map(),
    states = [];
  for (const vector of vectors) {
    const p = predicate(vector, dimensions, controls, space),
      count = space.count(p.root);
    const state = p.inactive.length
      ? "INACTIVE"
      : count === 0n
        ? "REJECTED"
        : count === space.total
          ? "ACTIVE"
          : "CONDITIONAL";
    counts[state.toLowerCase()]++;
    roots.set(vector.id, p.root);
    states.push({
      id: vector.id,
      state,
      satisfyingStates: count.toString(),
      inactiveDimensions: p.inactive,
    });
  }
  const root = roots.get(focus) ?? 0,
    marked = space.count(root);
  return {
    dimensions: dimensions.map((d) => ({ ...d, value: tri(d.value) })),
    present: space.dimensions.length,
    unknown: space.order.length,
    logicalBasis: `2^${space.dimensions.length}`,
    maskSpace: `2^${space.order.length}`,
    totalStates: space.total.toString(),
    markedStates: marked.toString(),
    counts,
    states,
    focusState: states.find((s) => s.id === focus),
    witness: space.witness(root),
    graph: space.decisionGraph(root),
    nodesUsed: space.nodes.length - 2,
    amplification: amplify(marked, space.total, maxIterations),
  };
}

export function runDimensionExperiment(model, raw = {}) {
  const config = normalizeResearch(raw);
  const dimensions = [
    ...model.conditions.map((d) => ({
      key: d.key,
      label: d.label,
      value: tri(d.value),
    })),
    ...config.dimensions,
  ];
  if (
    dimensions.length > 128 ||
    new Set(dimensions.map((d) => d.key)).size !== dimensions.length
  )
    throw new Error(
      "Use up to 128 unique logical dimensions in this browser reference.",
    );
  if (config.walk.some((w) => !dimensions.some((d) => d.key === w.key)))
    throw new Error("A walk refers to a missing dimension.");
  // Keep rejected candidates available: changing 0 to ? or 1 may revive them.
  const vectors = model.attackVectorSpace.vectors.filter(
    (v) => v.frameworks.length,
  );
  const focus =
    vectors.find((v) => v.id === config.focus) ||
    vectors.find((v) => v.state !== "REJECTED") ||
    vectors[0];
  if (!focus)
    throw new Error("Enable a perspective to investigate its logical space.");
  const start = evaluate(
    dimensions,
    vectors,
    config.controls,
    focus.id,
    config.maxIterations,
  );
  let current = dimensions.map((d) => ({ ...d }));
  const sequential = [];
  for (const [i, step] of config.walk.entries()) {
    current = current.map((d) =>
      d.key === step.key ? { ...d, value: step.value } : d,
    );
    if (config.mode !== "parallel") {
      const result = evaluate(
        current,
        vectors,
        config.controls,
        focus.id,
        config.maxIterations,
      );
      sequential.push({
        step: i + 1,
        key: step.key,
        value: step.value,
        maskSpace: result.maskSpace,
        present: result.present,
        markedStates: result.markedStates,
        counts: result.counts,
        focusState: result.focusState,
      });
    }
  }
  const final = config.walk.length
    ? evaluate(
        current,
        vectors,
        config.controls,
        focus.id,
        config.maxIterations,
      )
    : start;
  const baselineById = new Map(final.states.map((v) => [v.id, v]));
  const lanes = [];
  if (config.mode !== "sequential") {
    for (const [i, dimension] of current
      .filter((d) => d.value !== ABSENT)
      .entries()) {
      const reduced = current.map((d) =>
        d.key === dimension.key ? { ...d, value: ABSENT } : d,
      );
      const keys = reduced.map((d) => d.key),
        offset = i % keys.length;
      const order = [...keys.slice(offset), ...keys.slice(0, offset)];
      const result = evaluate(
        reduced,
        vectors,
        config.controls,
        focus.id,
        config.maxIterations,
        order,
      );
      const affected = result.states.filter(
        (v) => v.state !== baselineById.get(v.id).state,
      );
      lanes.push({
        id: `L${i + 1}`,
        excluded: dimension.key,
        label: dimension.label,
        present: result.present,
        maskSpace: result.maskSpace,
        totalStates: result.totalStates,
        markedStates: result.markedStates,
        focusState: result.focusState,
        counts: result.counts,
        affected: affected.map((v) => ({
          id: v.id,
          before: baselineById.get(v.id).state,
          after: v.state,
        })),
        amplification: result.amplification,
        graph: result.graph,
        retained: result.states
          .filter((v) => ["ACTIVE", "CONDITIONAL"].includes(v.state))
          .map((v) => v.id),
      });
    }
  }
  // Rotate logical coordinates and their predicates together; inverse mapping
  // is by canonical keys. This ideal reference should be orientation invariant.
  const canonical = current.filter((d) => d.value !== ABSENT).map((d) => d.key);
  const rotations = [];
  for (let i = 0; i < Math.min(8, canonical.length); i++) {
    const order = [...canonical.slice(i), ...canonical.slice(0, i)];
    const space = new LogicalSpace(current, order),
      p = predicate(focus, current, config.controls, space);
    const count = space.count(p.root).toString();
    rotations.push({
      offset: i,
      order,
      canonicalMarkedStates: count,
      agrees: count === final.markedStates,
      graph: space.decisionGraph(p.root),
    });
  }
  const startById = new Map(start.states.map((s) => [s.id, s]));
  const changed = final.states.filter(
    (s) => s.state !== startById.get(s.id)?.state,
  );
  const witnesses = (v) => {
    const space = new LogicalSpace(current);
    return space.witness(predicate(v, current, config.controls, space).root);
  };
  const impacts = current
    .filter((d) => d.value === "?")
    .map((d) => {
      const fixed = (value) => {
        const next = current.map((x) =>
          x.key === d.key ? { ...x, value } : x,
        );
        const space = new LogicalSpace(next),
          p = predicate(focus, next, config.controls, space);
        return space.count(p.root).toString();
      };
      const zero = fixed("0"),
        one = fixed("1");
      return {
        key: d.key,
        label: d.label,
        zero,
        one,
        decisive: (zero === "0") !== (one === "0"),
        relevant: zero !== one,
      };
    })
    .sort(
      (a, b) =>
        Number(b.decisive) - Number(a.decisive) ||
        Number(b.relevant) - Number(a.relevant),
    );
  const bindingKey = JSON.stringify({
    base: model.fingerprint,
    dimensions: current,
    controls: config.controls,
    focus: focus.id,
  });
  const records = config.records.filter(
    (r) => r.bindingKey === bindingKey && r.vectorId === focus.id,
  );
  const supports = records.some((r) => r.outcome === "supports"),
    refutes = records.some((r) => r.outcome === "refutes");
  const evidenceStatus =
    supports && refutes
      ? "CONFLICT"
      : supports
        ? "SUPPORTED · REPORTED"
        : refutes
          ? "REFUTED · REPORTED"
          : records.length
            ? "INCONCLUSIVE"
            : "AWAITING TESTS";
  const frameworks = {};
  for (const lens of model.lenses.filter((l) => l.active)) {
    const ids = new Set(
      vectors
        .filter((v) => v.frameworks.some((f) => f.lens === lens.name))
        .map((v) => v.id),
    );
    frameworks[lens.name] = Object.fromEntries(
      ["ACTIVE", "CONDITIONAL", "REJECTED", "INACTIVE"].map((s) => [
        s,
        final.states.filter((v) => ids.has(v.id) && v.state === s).length,
      ]),
    );
  }
  return {
    schema: "qcds-security-lab/dimension-run-v1",
    version: LOGICAL_VERSION,
    generatedAt: new Date().toISOString(),
    system: model.input.name,
    mode: config.mode,
    baseFingerprint: model.fingerprint,
    bindingKey,
    config,
    focus: { ...focus, witness: witnesses(focus) },
    start,
    final,
    sequential,
    lanes,
    rotations,
    changed,
    impacts,
    frameworks,
    binding: {
      status: evidenceStatus,
      records,
      archivedRecords: config.records.length - records.length,
      orientationStable: rotations.every((r) => r.agrees),
      invariant:
        "Orientation agreement and Grover probability are analytical results, not evidence of a vulnerability.",
      laneAgreement: lanes.filter(
        (l) => l.focusState?.state === final.focusState?.state,
      ).length,
      laneCount: lanes.length,
    },
    recursion: config.controls
      .filter((c) => c.vectorId === focus.id)
      .map((c, i) => ({
        ...c,
        depth: i + 1,
        value: current.find((d) => d.key === c.key)?.value,
      })),
  };
}

export function dimensionMarkdown(run) {
  return [
    `# QCDS dimensional investigation — ${run.system}`,
    "Author: Patrik Sundblom · Assistant contributor: ChatGPT (OpenAI)",
    `\nVector: ${run.focus.id} — ${run.focus.title}`,
    `Mode: ${run.mode} · ${run.generatedAt}`,
    "\n## 1. Condition Formation",
    ...run.final.dimensions.map((d) => `- ${d.label}: ${d.value}`),
    `\nPresent coordinates: ${run.final.present}. Logical basis ${run.final.logicalBasis}; unresolved mask ${run.final.maskSpace} = ${run.final.totalStates} states.`,
    "\n## 2. Conditional Evolution",
    `Selected predicate: ${run.final.markedStates} compatible assignments; ${run.final.focusState.state}.`,
    `Grover reference: ${run.final.amplification.iterations} iterations within a ${run.final.amplification.iterationBudget} budget, selected-subspace mass ${run.final.amplification.probability}. This is a symbolic classical calculation, not a QPU execution or a vulnerability probability.`,
    "\n## 3. Recursive Inference",
    ...run.lanes.map(
      (l) =>
        `- ${l.id}: remove ${l.label}; ${l.present} coordinates, ${l.maskSpace} mask states; ${l.counts.inactive} inactive predicates; focus ${l.focusState?.state}.`,
    ),
    ...run.recursion.map(
      (c) =>
        `- Layer ${c.depth}: ${c.label} = ${c.value}. Counter-test: ${c.test}`,
    ),
    "\n## 4. Truth-Alignment / Syntract Binding",
    `Evidence: ${run.binding.status}. ${run.binding.archivedRecords} observations belong to other snapshots.`,
    ...run.binding.records.map(
      (r) => `- ${r.outcome} — ${r.source}: ${r.observation}`,
    ),
    "\n## Framework projections",
    ...Object.entries(run.frameworks).map(
      ([name, c]) =>
        `- ${name}: ${c.ACTIVE} active, ${c.CONDITIONAL} conditional, ${c.REJECTED} rejected, ${c.INACTIVE} inactive.`,
    ),
    "\n## Scope",
    "Catalog-bounded logical investigation. An ABSENT coordinate deactivates predicates that refer to it. 0 is a present false fact; ? is a present unresolved coordinate. Parallel lanes are separate spaces, never one combined 2^(sum of widths) state. The JSON export preserves complete compressed distributions and Boolean membership graphs. User-reported observations remain distinct from inference.",
  ].join("\n");
}
