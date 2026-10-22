// QCDS by Patrik Sundblom. Contributor: ChatGPT (OpenAI). LICENSE.md.
export const GROVER_MAX = 40;
export const DEFAULT_ALIGNMENT = 0.95;
export const NUMERICAL_TOLERANCE = 1e-10;
export const STALL_PATIENCE = 3;
export const MIN_RELATIVE_GAIN = 0.001;

// A performance stopping rule, not a claim that unitary Grover converges.
// Keep the best observed state; later oscillation peaks may be skipped.
export function improvementMonitor({threshold = DEFAULT_ALIGNMENT, patience = STALL_PATIENCE, minRelativeGain = MIN_RELATIVE_GAIN} = {}) {
  let checkpoint = null, stagnant = 0;
  return probability => {
    if (probability + NUMERICAL_TOLERANCE >= threshold) return 'threshold_reached';
    if (checkpoint === null || probability - checkpoint > Math.max(Number.MIN_VALUE, Math.abs(checkpoint) * minRelativeGain)) {
      checkpoint = probability; stagnant = 0;
    } else stagnant++;
    return stagnant >= patience ? 'gain_stalled' : null;
  };
}

export function groverProbability(marked, total, iteration) {
  const m = BigInt(marked), n = BigInt(total);
  if (n < 1n || m < 0n || m > n || !Number.isInteger(iteration) || iteration < 0) throw new Error('Invalid oracle cardinality or iteration.');
  if (m === 0n) return 0;
  if (m === n) return 1;
  return Math.sin((2 * iteration + 1) * Math.asin(Math.sqrt(Number(m) / Number(n)))) ** 2;
}

export function groverPlan(marked, total, {maxIterations = GROVER_MAX, threshold = DEFAULT_ALIGNMENT} = {}) {
  const m = BigInt(marked), n = BigInt(total);
  if (n < 1n || m < 0n || m > n) throw new Error('Invalid oracle cardinality.');
  if (!Number.isFinite(maxIterations)) throw new Error('Iteration budget must be finite.');
  if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 1) throw new Error('Alignment threshold must be above 0 and at most 1.');
  const cap = Math.max(0, Math.min(GROVER_MAX, Math.trunc(maxIterations)));
  const trace = [], stop = improvementMonitor({threshold});
  let best, reason;
  for (let iteration = 0; iteration <= cap; iteration++) {
    const row = {iteration, probability:groverProbability(m,n,iteration)};
    trace.push(row);
    if (!best || row.probability > best.probability + Math.abs(best.probability) * 1e-12) best = row;
    reason = m === 0n ? 'no_solutions' : m === n ? 'all_states_accepted' : stop(row.probability);
    if (reason) break;
  }
  reason ||= 'iteration_limit';
  return {threshold, cap, initialProbability:Number(m)/Number(n), selected:best, best, trace,
    evaluatedIterations:trace.at(-1).iteration, reached:best.probability + NUMERICAL_TOLERANCE >= threshold,
    reason, stopping:{patience:STALL_PATIENCE,minRelativeGain:MIN_RELATIVE_GAIN},
    selection:'Stop at the target or after three steps without a material best-state improvement (0.1% relative). Retain the earliest best observed state. The cap is a ceiling; later oscillation peaks may be skipped. Exact classical counts inform this simulation policy.'};
}
