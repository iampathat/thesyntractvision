// QCDS by Patrik Sundblom. Contributor: ChatGPT (OpenAI). LICENSE.md.
export const GROVER_MAX = 40;
export const DEFAULT_ALIGNMENT = 0.95;
export const NUMERICAL_TOLERANCE = 1e-10;

export function groverPlan(marked, total, { maxIterations = GROVER_MAX, threshold = DEFAULT_ALIGNMENT } = {}) {
  const m = BigInt(marked), n = BigInt(total);
  if (n < 1n || m < 0n || m > n) throw new Error('Invalid oracle cardinality.');
  if (!Number.isFinite(maxIterations)) throw new Error('Iteration budget must be finite.');
  if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 1) throw new Error('Alignment threshold must be above 0 and at most 1.');
  const cap = Math.max(0, Math.min(GROVER_MAX, Math.trunc(maxIterations)));
  const fraction = Number(m) / Number(n), theta = Math.asin(Math.sqrt(fraction));
  const trace = Array.from({length: cap + 1}, (_, iteration) => ({iteration, probability: m === 0n ? 0 : m === n ? 1 : Math.sin((2 * iteration + 1) * theta) ** 2}));
  const best = trace.reduce((a,b) => b.probability > a.probability + 1e-12 ? b : a);
  const first = trace.find(row => row.probability + NUMERICAL_TOLERANCE >= threshold);
  const selected = first || best;
  return { threshold, cap, initialProbability: fraction, selected, best, trace,
    reached: !!first,
    reason: m === 0n ? 'no_solutions' : m === n ? 'all_states_accepted' : first ? 'threshold_reached' : 'threshold_not_reached',
    selection: 'Earliest iteration reaching the threshold; otherwise earliest best within budget. Exact classical counts inform this simulation policy.' };
}
