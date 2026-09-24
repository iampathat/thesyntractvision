// Copyright © 2026 Patrik Sundblom. See LICENSE.md.
// Project Glasswing — structural comparison harness for QCDS Security Lab.
import {
  VERSION as LAB_VERSION,
  CONDITION_DEFS,
  SCENARIOS,
  analyze,
  newProject,
} from "./engine.mjs";

const GLASSWING_VERSION = "1.0.0";

const MODE_META = {
  baseline: {
    name: "Single pass",
    eyebrow: "BASELINE",
    explanation:
      "A compact one-pass view. It surfaces a few currently supported route families, but does not rotate perspectives, walk dimensions or recursively challenge controls.",
  },
  agentic: {
    name: "Recursive agent",
    eyebrow: "AGENTIC",
    explanation:
      "A deeper sequential view. It follows more routes and carries each route through control → bypass → counter-test, but does not run the full QCDS rotation and dimension-walk comparisons.",
  },
  qcds: {
    name: "QCDS",
    eyebrow: "INFERENCE FABRIC",
    explanation:
      "The full QCDS run: condition mask, generated attack-vector fabric, parallel perspectives, rotation, dimension walking, recursive control challenge and evidence-bound verification.",
  },
};

function routeView(route) {
  return {
    id: route.id,
    title: route.shortTitle || route.title,
    status: route.status,
    severity: route.severity,
    path: route.path,
    control: route.control,
    challenge: route.bypass,
    counterTest: route.verify,
    perspectives: [...(route.hitLenses || [])],
    missing: [...(route.missing || [])],
    attackVectorCount: route.attackVectorCount || 0,
    activeAttackVectors: route.activeAttackVectors || 0,
    conditionalAttackVectors: route.conditionalAttackVectors || 0,
  };
}

function stableUnique(items) {
  return [...new Set(items)];
}

function baselineTrack(model) {
  const active = model.findings.map(routeView);
  const conditional = model.pending.map(routeView);
  const routes = [...active, ...conditional].slice(0, 3);
  return {
    id: "baseline",
    ...MODE_META.baseline,
    routes,
    metrics: {
      routeFamilies: routes.length,
      generatedVectorsVisible: routes.reduce(
        (sum, route) => sum + route.attackVectorCount,
        0,
      ),
      perspectiveComparisons: 0,
      dimensionComparisons: 0,
      recursiveBranches: 0,
      evidenceBoundRoutes: active.filter((route) =>
        ["SUPPORTED · REPORTED", "REFUTED · REPORTED", "CONFLICTING EVIDENCE"].includes(
          route.status,
        ),
      ).length,
      unresolvedQuestions: model.unknown.length,
    },
    trace: [
      "Read declared system facts",
      "Surface the strongest visible route families",
      "Stop after the first compact answer",
    ],
  };
}

function agenticTrack(model) {
  const routeById = Object.fromEntries(
    model.routes.map((route) => [route.id, routeView(route)]),
  );
  const recursiveRoutes = model.recursive.slice(0, 6).map((branch) => {
    const route = routeById[branch.id] || {
      id: branch.id,
      title: branch.title,
      status: branch.status,
      path: "",
      control: "",
      challenge: "",
      counterTest: "",
      perspectives: [],
      missing: [],
      attackVectorCount: branch.attackVectorCount || 0,
      activeAttackVectors: 0,
      conditionalAttackVectors: 0,
    };
    return {
      ...route,
      branchStatus: branch.status,
      nextQuestions: [...branch.nextQuestions],
      depth: branch.depth,
    };
  });
  return {
    id: "agentic",
    ...MODE_META.agentic,
    routes: recursiveRoutes,
    metrics: {
      routeFamilies: recursiveRoutes.length,
      generatedVectorsVisible: recursiveRoutes.reduce(
        (sum, route) => sum + route.attackVectorCount,
        0,
      ),
      perspectiveComparisons: 0,
      dimensionComparisons: 0,
      recursiveBranches: recursiveRoutes.length,
      evidenceBoundRoutes: model.findings.filter((route) =>
        ["SUPPORTED · REPORTED", "REFUTED · REPORTED", "CONFLICTING EVIDENCE"].includes(
          route.status,
        ),
      ).length,
      unresolvedQuestions: model.clarifications.length,
    },
    trace: [
      "Read declared system facts",
      "Follow several candidate routes",
      "Challenge each control",
      "Generate a counter-test",
      "Continue with the next unresolved question",
    ],
  };
}

function qcdsTrack(model) {
  const routes = model.routes.map(routeView);
  const independentRotation = model.rotation.filter(
    (run) => run.retained.length || run.lost.length,
  );
  const materialDimensions = model.dimensions.filter(
    (run) =>
      run.weakened.length ||
      run.lost.length ||
      run.vectorImpact.activeToConditional.length ||
      run.vectorImpact.removed.length,
  );
  const evidenceBound = model.findings.filter((route) =>
    ["SUPPORTED · REPORTED", "REFUTED · REPORTED", "CONFLICTING EVIDENCE"].includes(
      route.status,
    ),
  );
  return {
    id: "qcds",
    ...MODE_META.qcds,
    routes,
    metrics: {
      routeFamilies: routes.length,
      generatedVectorsVisible: model.searchSpace.survivingAttackVectors,
      generatedVectorsTotal: model.searchSpace.generatedAttackVectors,
      activeVectors: model.searchSpace.activeAttackVectors,
      conditionalVectors: model.searchSpace.conditionalAttackVectors,
      perspectiveComparisons: independentRotation.length,
      dimensionComparisons: materialDimensions.length,
      recursiveBranches: model.recursive.length,
      evidenceBoundRoutes: evidenceBound.length,
      unresolvedQuestions: model.clarifications.length,
      maskedLogicalSpace: model.searchSpace.maskedLogicalSpace,
    },
    trace: [
      `Form ${model.searchSpace.coreConditions} core condition coordinates`,
      `Keep ${model.searchSpace.unknownMaskDimensions} unresolved dimensions as ${model.searchSpace.maskedLogicalSpace}`,
      `Generate ${model.searchSpace.generatedAttackVectors.toLocaleString("en-US")} attack-vector candidates`,
      `Retain ${model.searchSpace.survivingAttackVectors.toLocaleString("en-US")} active + conditional vectors`,
      "Project the same vector fabric through multiple security perspectives",
      "Rotate perspectives and walk declared dimensions",
      "Recursively challenge controls and counter-test surviving routes",
      "Bind scoped conclusions to observations instead of route count",
    ],
    rotation: model.rotation.map((run) => ({
      name: run.name,
      retained: [...run.retained],
      lost: [...run.lost],
    })),
    dimensions: materialDimensions.map((run) => ({
      id: run.id,
      label: run.label,
      retained: [...run.retained],
      weakened: [...run.weakened],
      lost: [...run.lost],
      activeToConditional: run.vectorImpact.activeToConditional.length,
      removedVectors: run.vectorImpact.removed.length,
    })),
    clarifications: model.clarifications.slice(0, 8).map((item) => ({
      id: item.id,
      label: item.label,
      question: item.question,
      routeIds: [...item.routeIds],
      priority: item.priority,
    })),
    oracles: model.oracles.map((oracle) => ({ ...oracle })),
  };
}

function comparison(trackSet) {
  const [baseline, agentic, qcds] = trackSet;
  return {
    notices: [
      "This compares reasoning structure over one declared system state. It is not a vendor-model benchmark.",
      "More routes or vectors do not mean more true vulnerabilities. Evidence and counter-tests decide what survives.",
    ],
    deltas: {
      baselineToAgenticRoutes:
        agentic.metrics.routeFamilies - baseline.metrics.routeFamilies,
      agenticToQcdsRoutes:
        qcds.metrics.routeFamilies - agentic.metrics.routeFamilies,
      qcdsPerspectiveComparisons: qcds.metrics.perspectiveComparisons,
      qcdsDimensionComparisons: qcds.metrics.dimensionComparisons,
      qcdsRecursiveBranches: qcds.metrics.recursiveBranches,
    },
    sharedRouteIds: stableUnique(
      baseline.routes
        .map((route) => route.id)
        .filter((id) => agentic.routes.some((route) => route.id === id))
        .filter((id) => qcds.routes.some((route) => route.id === id)),
    ),
  };
}

function runGlasswing(project) {
  const model = analyze(
    project.input,
    project.evidence || [],
    project.excludedLenses || [],
  );
  const tracks = [
    baselineTrack(model),
    agenticTrack(model),
    qcdsTrack(model),
  ];
  return {
    schema: "qcds-security-lab/glasswing-run-v1",
    version: GLASSWING_VERSION,
    labVersion: LAB_VERSION,
    generatedAt: new Date().toISOString(),
    system: {
      name: model.input.name,
      description: model.input.description,
      attackerGoal: model.input.attackerGoal,
      assets: [...model.input.assets],
    },
    conditions: model.conditions.map((condition) => ({ ...condition })),
    tracks,
    comparison: comparison(tracks),
    model,
  };
}

function projectFromScenario(id = "portal") {
  const scenario = SCENARIOS.some((item) => item.id === id) ? id : "portal";
  return newProject(scenario);
}

export {
  GLASSWING_VERSION,
  MODE_META,
  CONDITION_DEFS,
  SCENARIOS,
  projectFromScenario,
  runGlasswing,
};
