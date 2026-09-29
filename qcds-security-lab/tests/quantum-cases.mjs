import { runDimensionExperiment } from "../logical-space.mjs";
export function fixture({
  name = "fixture",
  count = 3,
  requires,
  any = [],
  fixed = {},
  barriers = [],
  spectators = 0,
} = {}) {
  const keys = Array.from({ length: count }, (_, i) => `d${i}`);
  const model = {
    fingerprint: name,
    input: { name },
    conditions: [
      ...keys,
      ...Array.from({ length: spectators }, (_, i) => `s${i}`),
    ].map((key) => ({ key, label: key, value: fixed[key] ?? null })),
    lenses: [{ name: "STRIDE", active: true }],
    attackVectorSpace: {
      vectors: [
        {
          id: "AV-TEST",
          title: name,
          requires: requires ?? keys,
          requiresAny: any,
          frameworks: [{ lens: "STRIDE" }],
          state: "CONDITIONAL",
        },
      ],
    },
  };
  return runDimensionExperiment(model, {
    focus: "AV-TEST",
    dimensions: barriers.map((key) => ({ key, label: key, value: "?" })),
    controls: barriers.map((key) => ({
      id: key,
      key,
      label: key,
      test: "Check the barrier",
      vectorId: "AV-TEST",
    })),
  });
}
export const cases = [
  { name: "noisy_threshold", spec: {count:2}, options: {selection:"noisy",noise:{single:0.0001,two:0.001,readout:0.001}} },
  { name: "noisy_best_checkpoint", spec: {count:3}, options: {selection:"noisy"} },
  { name: "unreachable_half", spec: {count:1}, options: {} },
  { name: "and3", spec: { count: 3 }, options: {} },
  {
    name: "or_and_barrier",
    spec: {
      count: 4,
      requires: ["d0"],
      any: ["d1", "d2", "d3"],
      barriers: ["x_control"],
    },
    options: {},
  },
  {
    name: "fixed_spectators",
    spec: { count: 3, fixed: { d1: true }, spectators: 3 },
    options: { iterations: 2 },
  },
  { name: "six_qubits", spec: { count: 6 }, options: { iterations: 6 } },
  {
    name: "eight_qubits_ideal",
    spec: { count: 8 },
    options: { iterations: 12 },
  },
];
