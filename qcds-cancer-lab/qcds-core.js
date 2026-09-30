(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.QCDSCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DIMENSIONS = [
    "Mutation load",
    "DNA repair",
    "Growth signal",
    "Apoptosis escape",
    "Immune evasion",
    "Target engagement",
    "Resistance",
    "Cell process"
  ];

  const MAX_GROVER_ITERS = 40;
  const ROTATION_BANKS = 16;
  const LANES_PER_BANK = 8;
  const PARALLEL_LANES = ROTATION_BANKS * LANES_PER_BANK;
  const PARENT_MARK_RATIO = 0.60;
  const EPSILON = 1e-15;

  function validateMask(mask) {
    if (typeof mask !== "string" || mask.length !== 8 || !/^[01?]{8}$/.test(mask)) {
      throw new Error("Mask must contain exactly eight 0 / 1 / ? symbols.");
    }
    return mask;
  }

  function bitAt(state, i) { return (state >> i) & 1; }

  function stateToBits(state) {
    let out = "";
    for (let i = 0; i < 8; i++) out += String(bitAt(state, i));
    return out;
  }

  function stateMatchesMask(state, mask) {
    validateMask(mask);
    for (let i = 0; i < 8; i++) {
      if (mask[i] !== "?" && bitAt(state, i) !== Number(mask[i])) return false;
    }
    return true;
  }

  function groverSuccessProbability(stateCount, markedCount, iterations) {
    if (!(stateCount > 0)) throw new Error("stateCount must be positive");
    if (!(markedCount > 0 && markedCount <= stateCount)) throw new Error("markedCount must satisfy 1 <= M <= N");
    const theta = Math.asin(Math.sqrt(markedCount / stateCount));
    return Math.sin((2 * iterations + 1) * theta) ** 2;
  }

  function peakIterationCount(stateCount, markedCount, maxIterations = MAX_GROVER_ITERS, alignmentThreshold = 0.999) {
    if (markedCount === 0 || markedCount === stateCount) return 0;
    if (!(alignmentThreshold > 0 && alignmentThreshold <= 1)) throw new Error("alignmentThreshold must lie in (0,1]");

    let prev = groverSuccessProbability(stateCount, markedCount, 0);
    if (prev >= alignmentThreshold) return 0;

    let bestK = 0;
    let bestMass = prev;
    for (let k = 1; k <= maxIterations; k++) {
      const mass = groverSuccessProbability(stateCount, markedCount, k);

      if (mass >= alignmentThreshold) return k;

      if (mass > bestMass + 1e-15) {
        bestK = k;
        bestMass = mass;
      }

      // Stop at the first tangent/peak. Do not chase a later periodic Grover recurrence.
      if (mass < prev - 1e-15) return bestK;

      prev = mass;
    }
    return bestK;
  }

  function entropyBits(probabilities) {
    let h = 0;
    for (const p of probabilities) if (p > 0) h -= p * Math.log2(p);
    return h;
  }

  function runGrover(stateCount, markedIterable, maxIterations = MAX_GROVER_ITERS) {
    if (stateCount <= 0 || (stateCount & (stateCount - 1)) !== 0) {
      throw new Error("stateCount must be a positive power of two");
    }
    const marked = new Set(markedIterable);
    for (const s of marked) if (s < 0 || s >= stateCount) throw new Error("marked state outside state space");

    if (marked.size === 0) {
      const probabilities = Array(stateCount).fill(1 / stateCount);
      return { stateCount, markedCount: 0, iterations: 0, probabilities, markedMass: 0, entropyBits: Math.log2(stateCount), topState: 0, topProbability: 1 / stateCount };
    }

    const iterations = peakIterationCount(stateCount, marked.size, maxIterations);
    let amp = Array(stateCount).fill(1 / Math.sqrt(stateCount));
    for (let k = 0; k < iterations; k++) {
      for (const s of marked) amp[s] = -amp[s];
      const mean = amp.reduce((a, b) => a + b, 0) / stateCount;
      amp = amp.map(a => 2 * mean - a);
    }
    let probabilities = amp.map(a => a * a);
    const z = probabilities.reduce((a, b) => a + b, 0) || 1;
    probabilities = probabilities.map(p => p / z);
    let topState = 0;
    for (let i = 1; i < stateCount; i++) if (probabilities[i] > probabilities[topState]) topState = i;
    let markedMass = 0;
    for (const s of marked) markedMass += probabilities[s];
    return {
      stateCount,
      markedCount: marked.size,
      iterations,
      probabilities,
      markedMass,
      entropyBits: entropyBits(probabilities),
      topState,
      topProbability: probabilities[topState]
    };
  }

  function rotationOrder(bankId) {
    // 16 unique balanced rotations: forward cyclic + mirrored cyclic.
    // Every semantic dimension visits every fixed oracle position exactly twice.
    const n = DIMENSIONS.length;
    const phase = ((bankId % (2 * n)) + (2 * n)) % (2 * n);
    const mirrored = phase >= n;
    const shift = phase % n;
    const base = Array.from({ length: n }, (_, i) => mirrored ? (n - 1 - i) : i);
    return Array.from({ length: n }, (_, position) => base[(position + shift) % n]);
  }

  function buildView(excludedIndex, bankId) {
    const orderedIndices = rotationOrder(bankId);
    const activeIndices = orderedIndices.filter(i => i !== excludedIndex);
    const semanticToPosition = Array(8).fill(-1);
    orderedIndices.forEach((semanticIndex, position) => { semanticToPosition[semanticIndex] = position; });
    return {
      excludedIndex,
      excludedPosition: semanticToPosition[excludedIndex],
      bankId,
      orderedIndices,
      activeIndices,
      semanticToPosition,
      stateCount: 1 << activeIndices.length
    };
  }

  function decodeLocal(view, localState) {
    const semanticAssignment = new Array(8).fill(null);
    const positionAssignment = new Array(8).fill(null);
    view.activeIndices.forEach((semanticIndex, localBit) => {
      const value = (localState >> localBit) & 1;
      semanticAssignment[semanticIndex] = value;
      positionAssignment[view.semanticToPosition[semanticIndex]] = value;
    });
    return { semanticAssignment, positionAssignment };
  }

  function hypothesisMatchesPositions(mask, positionAssignment) {
    validateMask(mask);
    for (let position = 0; position < 8; position++) {
      const expected = mask[position];
      const actual = positionAssignment[position];
      if (expected === "?" || actual === null) continue;
      if (actual !== Number(expected)) return false;
    }
    return true;
  }

  function compileCancerOracle(view, inputMask, hypotheses, recursiveStates) {
    validateMask(inputMask);
    const activeSet = new Set(view.activeIndices);
    const marked = [];

    // Every rotated lane receives the SAME oracle bank.
    // Only the semantic input-to-position mapping changes. True-null exclusion
    // removes one observation; it never removes an oracle from the bank.
    for (let localState = 0; localState < view.stateCount; localState++) {
      const { semanticAssignment, positionAssignment } = decodeLocal(view, localState);

      let hardOk = true;
      for (let semanticIndex = 0; semanticIndex < 8; semanticIndex++) {
        if (inputMask[semanticIndex] === "?" || !activeSet.has(semanticIndex)) continue;
        if (semanticAssignment[semanticIndex] !== Number(inputMask[semanticIndex])) {
          hardOk = false;
          break;
        }
      }
      if (!hardOk) continue;

      const hypothesisOk = hypotheses.length === 0 ||
        hypotheses.some(h => hypothesisMatchesPositions(h.mask, positionAssignment));
      if (!hypothesisOk) continue;

      if (recursiveStates && recursiveStates.length) {
        let recursiveOk = false;
        for (const canonicalState of recursiveStates) {
          if (view.activeIndices.every(
            semanticIndex => semanticAssignment[semanticIndex] === bitAt(canonicalState, semanticIndex)
          )) {
            recursiveOk = true;
            break;
          }
        }
        if (!recursiveOk) continue;
      }

      marked.push(localState);
    }
    return marked;
  }

  function canonicalStateFromAssignment(assignment) {
    let state = 0;
    for (let i = 0; i < 8; i++) state |= assignment[i] << i;
    return state;
  }

  function liftLaneDistribution(view, probabilities) {
    if (probabilities.length !== view.stateCount) throw new Error("lane distribution does not match view state space");
    const out = Array(256).fill(0);
    for (let localState = 0; localState < view.stateCount; localState++) {
      const { semanticAssignment } = decodeLocal(view, localState);
      for (const missing of [0, 1]) {
        const assignment = semanticAssignment.slice();
        assignment[view.excludedIndex] = missing;
        out[canonicalStateFromAssignment(assignment)] += probabilities[localState] * 0.5;
      }
    }
    return out;
  }

  function logOpinionPool(distributions, epsilon = EPSILON) {
    if (!distributions.length) throw new Error("Need distributions to Syntract-bind");
    const width = distributions[0].length;
    if (distributions.some(d => d.length !== width)) throw new Error("Syntract bind requires shared support");
    const logScores = Array(width).fill(0);
    for (const d of distributions) {
      for (let i = 0; i < width; i++) logScores[i] += Math.log(Math.max(d[i], epsilon));
    }
    for (let i = 0; i < width; i++) logScores[i] /= distributions.length;
    const shift = Math.max(...logScores);
    const raw = logScores.map(v => Math.exp(v - shift));
    const z = raw.reduce((a, b) => a + b, 0) || 1;
    return raw.map(v => v / z);
  }

  function conditionOnInput(distribution, inputMask) {
    const out = distribution.map((p, state) => stateMatchesMask(state, inputMask) ? p : 0);
    const z = out.reduce((a, b) => a + b, 0);
    if (z <= 0) throw new Error("QCDS bind produced no support compatible with the input Condition.");
    return out.map(p => p / z);
  }

  function totalVariation(a, b) {
    if (a.length !== b.length) throw new Error("TVD support mismatch");
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
    return 0.5 * sum;
  }

  function topState(distribution) {
    let state = 0;
    for (let i = 1; i < distribution.length; i++) if (distribution[i] > distribution[state]) state = i;
    return { state, p: distribution[state] };
  }

  function nextPowerOfTwo(n) {
    if (n <= 1) return 1;
    let p = 1;
    while (p < n) p <<= 1;
    return p;
  }

  function parentGrover(boundDistribution, inputMask) {
    const ranked = Array.from({ length: 256 }, (_, s) => s)
      .filter(s => boundDistribution[s] > 0 && stateMatchesMask(s, inputMask))
      .sort((a, b) => boundDistribution[b] - boundDistribution[a]);

    if (!ranked.length) throw new Error("No compatible Parent-Grover candidates.");

    const scores = ranked.map(s => boundDistribution[s]);
    const parentN = nextPowerOfTwo(ranked.length);
    const topScore = scores[0];
    const marked = [];
    scores.forEach((score, i) => { if (score >= topScore * PARENT_MARK_RATIO) marked.push(i); });
    const grover = runGrover(parentN, marked, MAX_GROVER_ITERS);

    const mappedDistribution = {};
    let mappedMass = 0;
    ranked.forEach((canonical, i) => {
      const p = grover.probabilities[i] || 0;
      mappedDistribution[canonical] = p;
      mappedMass += p;
    });
    if (mappedMass > 0) {
      ranked.forEach(canonical => { mappedDistribution[canonical] /= mappedMass; });
    }

    const topCanonical = ranked.reduce((best, state) =>
      mappedDistribution[state] > mappedDistribution[best] ? state : best, ranked[0]);
    const markedCanonical = marked.filter(i => i < ranked.length).map(i => ranked[i]);
    const baselineMarkedMass = marked.length / parentN;
    const resolved =
      grover.iterations > 0 &&
      grover.markedMass > baselineMarkedMass + 1e-12 &&
      markedCanonical.length > 0 &&
      markedCanonical.length < ranked.length;

    return {
      ranked, scores, marked, markedCanonical, grover, mappedDistribution,
      topCanonical, resolved, candidateCount: ranked.length
    };
  }

  function logicFromStates(states, fallback) {
    if (!states.length) return fallback;
    let out = "";
    for (let i = 0; i < 8; i++) {
      const values = new Set(states.map(s => bitAt(s, i)));
      out += values.size === 1 ? String([...values][0]) : "?";
    }
    return out;
  }

  function topKSet(distribution, k) {
    return new Set(Array.from({ length: distribution.length }, (_, i) => i)
      .sort((a, b) => distribution[b] - distribution[a]).slice(0, k));
  }

  function jaccard(a, b) {
    let inter = 0;
    for (const x of a) if (b.has(x)) inter++;
    const union = new Set([...a, ...b]).size;
    return union ? inter / union : 1;
  }

  function stabilityReport(history) {
    const window = 3;
    if (history.length < window) {
      return { stable: false, reasons: [`need ${window} cycles; have ${history.length}`] };
    }
    const recent = history.slice(-window);
    let maxTvd = 0, maxEntropyDelta = 0, minJ = 1, maxInfluenceDelta = 0;
    let topStable = true;
    const firstTop = topState(recent[0].distribution).state;

    for (let i = 0; i < recent.length; i++) {
      if (topState(recent[i].distribution).state !== firstTop) topStable = false;
      if (i === 0) continue;
      maxTvd = Math.max(maxTvd, totalVariation(recent[i - 1].distribution, recent[i].distribution));
      maxEntropyDelta = Math.max(maxEntropyDelta, Math.abs(entropyBits(recent[i - 1].distribution) - entropyBits(recent[i].distribution)));
      minJ = Math.min(minJ, jaccard(topKSet(recent[i - 1].distribution, 8), topKSet(recent[i].distribution, 8)));
      for (let d = 0; d < 8; d++) {
        maxInfluenceDelta = Math.max(maxInfluenceDelta, Math.abs(recent[i - 1].influence[d] - recent[i].influence[d]));
      }
    }

    const reasons = [];
    if (maxTvd > 0.03) reasons.push("distribution not stable");
    if (maxEntropyDelta > 0.05) reasons.push("entropy not stable");
    if (!topStable) reasons.push("top identity not stable");
    if (minJ < 0.70) reasons.push("top-k not stable");
    if (maxInfluenceDelta > 0.05) reasons.push("dimension influence not stable");
    return { stable: reasons.length === 0, reasons, maxTvd, maxEntropyDelta, minJ, maxInfluenceDelta, topStable };
  }

  function runCycle(inputMask, hypotheses, recursiveStates, cycle, onProgress) {
    const familyLanes = Array.from({ length: 8 }, () => []);
    const allLanes = [];

    for (let bank = 0; bank < ROTATION_BANKS; bank++) {
      const bankId = cycle + bank;
      for (let excluded = 0; excluded < 8; excluded++) {
        const view = buildView(excluded, bankId);
        const marked = compileCancerOracle(view, inputMask, hypotheses, recursiveStates);
        const grover = runGrover(view.stateCount, marked, MAX_GROVER_ITERS);
        const lifted = liftLaneDistribution(view, grover.probabilities);
        const lane = { view, markedCount: marked.length, grover, lifted };
        familyLanes[excluded].push(lane);
        allLanes.push(lane);
      }
      if (onProgress) onProgress({ cycle, bank: bank + 1, banks: ROTATION_BANKS, lanesDone: (bank + 1) * 8, lanesTotal: PARALLEL_LANES });
    }

    const familyDistributions = familyLanes.map(lanes => logOpinionPool(lanes.map(l => l.lifted)));
    let boundDistribution = logOpinionPool(familyDistributions);
    boundDistribution = conditionOnInput(boundDistribution, inputMask);

    const influence = familyDistributions.map(d => totalVariation(d, boundDistribution));
    const parent = parentGrover(boundDistribution, inputMask);
    const derivedLogic = logicFromStates(parent.markedCanonical, inputMask);

    const groverIters = allLanes.map(l => l.grover.iterations);
    const markedCounts = allLanes.map(l => l.markedCount);
    const boundTop = topState(boundDistribution);

    return {
      cycle,
      laneCount: allLanes.length,
      familyCount: familyDistributions.length,
      groverMin: Math.min(...groverIters),
      groverMax: Math.max(...groverIters),
      markedMin: Math.min(...markedCounts),
      markedMax: Math.max(...markedCounts),
      familyDistributions,
      boundDistribution,
      boundTopState: boundTop.state,
      boundTopProbability: boundTop.p,
      influence,
      parent,
      derivedLogic
    };
  }

  function normalizeHypotheses(hypotheses) {
    return (hypotheses || []).map(h => ({ name: h.name || "oracle", mask: validateMask(h.mask), provenance: h.provenance || "top-down cancer hypothesis" }));
  }

  function runCancerQCDS(options) {
    const inputMask = validateMask(options.inputMask || "????????");
    const hypotheses = normalizeHypotheses(options.hypotheses || []);
    const maxCycles = Math.max(1, Math.min(8, Number(options.maxCycles || 4)));
    const minCycles = Math.min(2, maxCycles);
    const cycles = [];
    const history = [];
    let recursiveStates = null;

    for (let cycle = 0; cycle < maxCycles; cycle++) {
      const result = runCycle(inputMask, hypotheses, recursiveStates, cycle, options.onProgress);
      cycles.push(result);
      history.push({ distribution: result.boundDistribution, influence: result.influence });
      recursiveStates = result.parent.markedCanonical.slice();
      result.stability = stabilityReport(history);
      if (cycles.length >= minCycles && result.stability.stable && result.parent.resolved) break;
    }

    const last = cycles[cycles.length - 1];
    const finalDistribution = {};
    for (const [stateText, p] of Object.entries(last.parent.mappedDistribution)) {
      const state = Number(stateText);
      if (p > 0 && stateMatchesMask(state, inputMask)) finalDistribution[stateToBits(state)] = p;
    }
    for (const bits of Object.keys(finalDistribution)) {
      let state = 0;
      for (let i = 0; i < 8; i++) state |= Number(bits[i]) << i;
      if (!stateMatchesMask(state, inputMask)) throw new Error("QCDS invariant failed: output violated input Condition.");
    }

    return {
      inputMask,
      cycles,
      finalState: stateToBits(last.parent.topCanonical),
      finalProbability: last.parent.mappedDistribution[last.parent.topCanonical] || 0,
      finalLogic: last.derivedLogic,
      finalDistribution,
      finalResolved: last.parent.resolved,
      parallelLanesPerCycle: PARALLEL_LANES,
      exclusionFamilies: 8,
      maxGroverIterations: MAX_GROVER_ITERS
    };
  }

  async function runCancerQCDSAsync(options) {
    const progress = options.onProgress;
    const wrapped = Object.assign({}, options, {
      onProgress(info) {
        if (progress) progress(info);
      }
    });

    // Same engine; yielding between cycles/banks is UI scheduling only, not a
    // different inference calculation.
    const inputMask = validateMask(wrapped.inputMask || "????????");
    const hypotheses = normalizeHypotheses(wrapped.hypotheses || []);
    const maxCycles = Math.max(1, Math.min(8, Number(wrapped.maxCycles || 4)));
    const minCycles = Math.min(2, maxCycles);
    const cycles = [];
    const history = [];
    let recursiveStates = null;

    for (let cycle = 0; cycle < maxCycles; cycle++) {
      const familyLanes = Array.from({ length: 8 }, () => []);
      const allLanes = [];
      for (let bank = 0; bank < ROTATION_BANKS; bank++) {
        const bankId = cycle + bank;
        for (let excluded = 0; excluded < 8; excluded++) {
          const view = buildView(excluded, bankId);
          const marked = compileCancerOracle(view, inputMask, hypotheses, recursiveStates);
          const grover = runGrover(view.stateCount, marked, MAX_GROVER_ITERS);
          const lifted = liftLaneDistribution(view, grover.probabilities);
          const lane = { view, markedCount: marked.length, grover, lifted };
          familyLanes[excluded].push(lane);
          allLanes.push(lane);
        }
        if (progress) progress({ cycle, bank: bank + 1, banks: ROTATION_BANKS, lanesDone: (bank + 1) * 8, lanesTotal: PARALLEL_LANES });
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      const familyDistributions = familyLanes.map(lanes => logOpinionPool(lanes.map(l => l.lifted)));
      let boundDistribution = conditionOnInput(logOpinionPool(familyDistributions), inputMask);
      const influence = familyDistributions.map(d => totalVariation(d, boundDistribution));
      const parent = parentGrover(boundDistribution, inputMask);
      const derivedLogic = logicFromStates(parent.markedCanonical, inputMask);
      const groverIters = allLanes.map(l => l.grover.iterations);
      const markedCounts = allLanes.map(l => l.markedCount);
      const boundTop = topState(boundDistribution);
      const result = {
        cycle, laneCount: allLanes.length, familyCount: 8,
        groverMin: Math.min(...groverIters), groverMax: Math.max(...groverIters),
        markedMin: Math.min(...markedCounts), markedMax: Math.max(...markedCounts),
        familyDistributions, boundDistribution, boundTopState: boundTop.state, boundTopProbability: boundTop.p,
        influence, parent, derivedLogic
      };
      cycles.push(result);
      history.push({ distribution: boundDistribution, influence });
      recursiveStates = parent.markedCanonical.slice();
      result.stability = stabilityReport(history);
      if (cycles.length >= minCycles && result.stability.stable && result.parent.resolved) break;
    }

    const last = cycles[cycles.length - 1];
    const finalDistribution = {};
    for (const [stateText, p] of Object.entries(last.parent.mappedDistribution)) {
      const state = Number(stateText);
      if (p > 0 && stateMatchesMask(state, inputMask)) finalDistribution[stateToBits(state)] = p;
    }
    return {
      inputMask, cycles,
      finalState: stateToBits(last.parent.topCanonical),
      finalProbability: last.parent.mappedDistribution[last.parent.topCanonical] || 0,
      finalLogic: last.derivedLogic,
      finalDistribution,
      finalResolved: last.parent.resolved,
      parallelLanesPerCycle: PARALLEL_LANES,
      exclusionFamilies: 8,
      maxGroverIterations: MAX_GROVER_ITERS
    };
  }

  return {
    DIMENSIONS,
    MAX_GROVER_ITERS,
    ROTATION_BANKS,
    PARALLEL_LANES,
    validateMask,
    rotationOrder,
    buildView,
    compileCancerOracle,
    stateToBits,
    stateMatchesMask,
    groverSuccessProbability,
    peakIterationCount,
    runGrover,
    runCancerQCDS,
    runCancerQCDSAsync
  };
});
