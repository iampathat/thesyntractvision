(() => {
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

  const DEFAULT_ORACLES = [
    { name: "DNA repair", mask: "11??0???", weight: 1.20, provenance: "legacy cancer hypothesis" },
    { name: "PI3K axis", mask: "??1?1???", weight: 1.00, provenance: "legacy cancer hypothesis" },
    { name: "Receptor axis", mask: "???111??", weight: 1.10, provenance: "legacy cancer hypothesis" },
    { name: "HR + broad", mask: "1??1????", weight: 0.90, provenance: "legacy cancer hypothesis" },
    { name: "PI3K + HR", mask: "??11????", weight: 1.05, provenance: "legacy cancer hypothesis" }
  ];

  const PHYSICAL_BITFLIP = [0.008, 0.012, 0.009, 0.015, 0.010, 0.013, 0.011, 0.014];
  const MAX_GROVER_ITERS = 40;
  const PARALLEL_BRANCHES = 128;
  const FUNNEL_WIDTH = 8;

  let mask = Array(8).fill("?");
  let oracleRows = DEFAULT_ORACLES.map(o => ({ ...o, enabled: true }));

  const $ = id => document.getElementById(id);
  const maskInput = $("maskInput");
  const maskViz = $("maskViz");
  const dimensionLabels = $("dimensionLabels");
  const unknownCount = $("unknownCount");
  const stateCount = $("stateCount");
  const modeText = $("modeText");
  const oracleControls = $("oracleControls");
  const runButton = $("runButton");
  const runState = $("runState");
  const resultsRunning = $("resultsRunning");
  const resultsEmpty = $("resultsEmpty");
  const resultsLive = $("resultsLive");

  function validMask(value) {
    return typeof value === "string" && value.length === 8 && /^[01?]{8}$/.test(value);
  }

  function cycleBit(v) {
    return v === "?" ? "0" : v === "0" ? "1" : "?";
  }

  function expandMask(value) {
    if (!validMask(value)) throw new Error("Mask must contain exactly eight 0 / 1 / ? symbols.");
    let states = [""];
    for (const ch of value) {
      if (ch === "?") {
        const next = [];
        for (const s of states) { next.push(s + "0", s + "1"); }
        states = next;
      } else {
        states = states.map(s => s + ch);
      }
    }
    return states;
  }

  function maskMatches(state, oracleMask, excluded = -1) {
    for (let i = 0; i < state.length; i++) {
      if (i === excluded) continue;
      const m = oracleMask[i];
      if (m !== "?" && state[i] !== m) return false;
    }
    return true;
  }

  function renderDimensions() {
    dimensionLabels.innerHTML = "";
    DIMENSIONS.forEach((name, i) => {
      const el = document.createElement("div");
      el.textContent = String(i + 1).padStart(2, "0");
      el.title = name;
      dimensionLabels.appendChild(el);
    });
  }

  function renderMask() {
    maskInput.innerHTML = "";
    mask.forEach((v, idx) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = v;
      b.className = v === "?" ? "" : "bound";
      b.title = DIMENSIONS[idx];
      b.setAttribute("aria-label", `${DIMENSIONS[idx]}: ${v === "?" ? "unknown" : v}`);
      b.addEventListener("click", () => {
        mask[idx] = cycleBit(mask[idx]);
        renderMask();
      });
      maskInput.appendChild(b);
    });

    const u = mask.filter(x => x === "?").length;
    unknownCount.textContent = String(u);
    stateCount.textContent = (2 ** u).toLocaleString("en-US");
    modeText.textContent = u === 0 ? "COMPLETE" : "OPEN";

    maskViz.innerHTML = "";
    const bars = Math.min(16, Math.max(4, 2 ** Math.min(u, 4)));
    for (let i = 0; i < bars; i++) {
      const s = document.createElement("span");
      const wave = 24 + ((i * 31 + u * 17) % 58);
      s.style.setProperty("--h", wave + "%");
      maskViz.appendChild(s);
    }
  }

  function renderOracles() {
    oracleControls.innerHTML = "";
    oracleRows.forEach((o, index) => {
      const row = document.createElement("div");
      row.className = "oracle-row";
      row.innerHTML = `
        <label class="oracle-switch" title="Enable oracle">
          <input type="checkbox" ${o.enabled ? "checked" : ""} aria-label="Enable ${o.name}">
          <span></span>
        </label>
        <div class="oracle-meta">
          <strong>${o.name}</strong>
          <small>${o.provenance}</small>
        </div>
        <input class="oracle-mask" value="${o.mask}" maxlength="8" spellcheck="false" aria-label="${o.name} mask">
        <input class="oracle-weight" type="number" min="0.05" max="5" step="0.05" value="${o.weight.toFixed(2)}" aria-label="${o.name} weight">
      `;

      const checkbox = row.querySelector('input[type="checkbox"]');
      const maskField = row.querySelector(".oracle-mask");
      const weightField = row.querySelector(".oracle-weight");

      checkbox.addEventListener("change", e => {
        oracleRows[index].enabled = e.target.checked;
        row.classList.toggle("disabled", !e.target.checked);
      });
      maskField.addEventListener("input", e => {
        const value = e.target.value.trim();
        oracleRows[index].mask = value;
        e.target.classList.toggle("invalid", !validMask(value));
      });
      weightField.addEventListener("input", e => {
        const value = Number(e.target.value);
        oracleRows[index].weight = Number.isFinite(value) && value > 0 ? value : 1;
      });
      row.classList.toggle("disabled", !o.enabled);
      oracleControls.appendChild(row);
    });
  }

  function oracleScores(states, oracles, excluded) {
    const scores = new Map();
    for (const state of states) {
      let score = 0;
      for (const oracle of oracles) {
        if (maskMatches(state, oracle.mask, excluded)) score += oracle.weight;
      }
      scores.set(state, score);
    }
    return scores;
  }

  function markedStates(states, scores) {
    if (!states.length) return [];
    let best = -Infinity;
    for (const s of states) best = Math.max(best, scores.get(s));
    return states.filter(s => scores.get(s) >= best - 1e-12);
  }

  function amplify(states, marked) {
    const n = states.length;
    if (!n) return { distribution: {}, iters: 0 };
    const markedSet = new Set(marked);
    if (!marked.length || marked.length === n) {
      const p = 1 / n;
      return { distribution: Object.fromEntries(states.map(s => [s, p])), iters: 0 };
    }

    const m = Math.max(1, Math.min(
      MAX_GROVER_ITERS,
      Math.round((Math.PI / 4) * Math.sqrt(n / marked.length) - 0.5)
    ));

    const amp = new Map(states.map(s => [s, 1 / Math.sqrt(n)]));
    for (let iter = 0; iter < m; iter++) {
      for (const s of markedSet) amp.set(s, -amp.get(s));
      let mean = 0;
      for (const a of amp.values()) mean += a;
      mean /= n;
      for (const s of states) amp.set(s, 2 * mean - amp.get(s));
    }

    const distribution = {};
    let z = 0;
    for (const s of states) {
      const p = amp.get(s) ** 2;
      distribution[s] = p;
      z += p;
    }
    if (z > 0) for (const s of states) distribution[s] /= z;
    return { distribution, iters: m };
  }

  function flipBit(state, i) {
    return state.slice(0, i) + (state[i] === "0" ? "1" : "0") + state.slice(i + 1);
  }

  function applyPhysicalNoise(distribution, rotation) {
    let current = { ...distribution };
    const n = 8;
    for (let logical = 0; logical < n; logical++) {
      const physical = (logical + rotation) % n;
      const e = PHYSICAL_BITFLIP[physical];
      const next = {};
      for (const [state, p] of Object.entries(current)) {
        next[state] = (next[state] || 0) + p * (1 - e);
        const flipped = flipBit(state, logical);
        next[flipped] = (next[flipped] || 0) + p * e;
      }
      current = next;
    }
    return current;
  }

  function mulberry32(seed) {
    return function() {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function finiteShots(distribution, shots, seed) {
    const entries = Object.entries(distribution).filter(([, p]) => p > 0).sort((a, b) => a[0].localeCompare(b[0]));
    let cumulative = 0;
    const cdf = entries.map(([s, p]) => [s, cumulative += p]);
    if (!cdf.length) return {};
    cdf[cdf.length - 1][1] = 1;

    const rng = mulberry32(seed >>> 0);
    const counts = {};
    for (let k = 0; k < shots; k++) {
      const r = rng();
      let lo = 0, hi = cdf.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (r <= cdf[mid][1]) hi = mid; else lo = mid + 1;
      }
      const state = cdf[lo][0];
      counts[state] = (counts[state] || 0) + 1;
    }
    return Object.fromEntries(Object.entries(counts).map(([s, c]) => [s, c / shots]));
  }

  function branchRun(logic, oracles, excluded, rotation, perspective, depth, shots, seedOffset = 0) {
    const chars = logic.split("");
    if (excluded >= 0) chars[excluded] = "?";
    const states = expandMask(chars.join(""));
    const scores = oracleScores(states, oracles, excluded);
    const marked = markedStates(states, scores);
    const amp = amplify(states, marked);
    const noisy = applyPhysicalNoise(amp.distribution, rotation);
    const seed = 173 + seedOffset + depth * 100000 + Math.max(0, excluded) * 10000 + rotation * 100 + perspective;
    const measured = finiteShots(noisy, shots, seed);
    const top = topState(measured);
    return { excluded, rotation, perspective, markedCount: marked.length, groverIters: amp.iters, distribution: measured, topState: top.state, topP: top.p };
  }

  function meanDistributions(distributions) {
    if (!distributions.length) return {};
    const out = {};
    for (const d of distributions) {
      for (const [s, p] of Object.entries(d)) out[s] = (out[s] || 0) + p / distributions.length;
    }
    let z = Object.values(out).reduce((a, b) => a + b, 0) || 1;
    for (const s of Object.keys(out)) out[s] /= z;
    return out;
  }

  function topState(distribution) {
    let state = "", p = -1;
    for (const [s, v] of Object.entries(distribution)) {
      if (v > p) { state = s; p = v; }
    }
    return { state, p: Math.max(0, p) };
  }

  function familyStability(branches) {
    const counts = {};
    for (const b of branches) counts[b.topState] = (counts[b.topState] || 0) + 1;
    return Math.max(0, ...Object.values(counts)) / Math.max(1, branches.length);
  }

  function deriveLogic(distribution, topK = FUNNEL_WIDTH, bindThreshold = 0.875) {
    const top = Object.entries(distribution).sort((a, b) => b[1] - a[1]).slice(0, topK);
    const total = top.reduce((sum, [, p]) => sum + p, 0) || 1;
    let logic = "";
    for (let i = 0; i < 8; i++) {
      const p1 = top.reduce((sum, [s, p]) => sum + (s[i] === "1" ? p : 0), 0) / total;
      logic += p1 >= bindThreshold ? "1" : p1 <= (1 - bindThreshold) ? "0" : "?";
    }
    return logic;
  }

  function totalVariation(a, b) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    let sum = 0;
    for (const k of keys) sum += Math.abs((a[k] || 0) - (b[k] || 0));
    return 0.5 * sum;
  }

  async function runRound(logic, oracles, depth, shots, onProgress) {
    const baselineBranches = [];
    for (let r = 0; r < 16; r++) {
      baselineBranches.push(branchRun(logic, oracles, -1, r % 8, Math.floor(r / 8), depth, shots, 700000));
    }
    const baseline = meanDistributions(baselineBranches.map(b => b.distribution));
    const baselineTop = topState(baseline);

    const families = [];
    const branchesPerFamily = PARALLEL_BRANCHES / 8;
    for (let dim = 0; dim < 8; dim++) {
      const branches = [];
      for (let j = 0; j < branchesPerFamily; j++) {
        branches.push(branchRun(logic, oracles, dim, j % 8, Math.floor(j / 8), depth, shots, 0));
      }
      const distribution = meanDistributions(branches.map(b => b.distribution));
      const top = topState(distribution);
      families.push({
        excludedDimension: dim,
        distribution,
        topState: top.state,
        topP: top.p,
        stability: familyStability(branches)
      });
      onProgress?.(dim + 1, 8);
      await new Promise(requestAnimationFrame);
    }

    const consensus = meanDistributions(families.map(f => f.distribution));
    const ctop = topState(consensus);
    const derivedLogic = deriveLogic(consensus);
    const influence = {};
    families.forEach(f => {
      influence[DIMENSIONS[f.excludedDimension]] = totalVariation(baseline, f.distribution);
    });

    return {
      depth,
      inputLogic: logic,
      unknowns: [...logic].filter(x => x === "?").length,
      stateCount: 2 ** [...logic].filter(x => x === "?").length,
      baselineTop: baselineTop.state,
      baselineP: baselineTop.p,
      families,
      consensusDistribution: consensus,
      consensusTop: ctop.state,
      consensusP: ctop.p,
      derivedLogic,
      dimensionInfluence: influence
    };
  }

  async function runQCDS(logic, initialOracles, recursionDepth, shots) {
    let currentLogic = logic;
    let oracles = initialOracles.map(o => ({ ...o }));
    const rounds = [];
    let lastTop = null;
    let stableCount = 0;

    for (let depth = 0; depth < recursionDepth; depth++) {
      runState.textContent = `Round ${depth + 1}/${recursionDepth}: running 128 perspectives → 8 families…`;
      const round = await runRound(currentLogic, oracles, depth, shots, (family, total) => {
        runState.textContent = `Round ${depth + 1}/${recursionDepth}: family ${family}/${total} · rotating + excluding dimensions…`;
      });

      const derivedOracle = {
        name: `Recursive consensus d${depth}`,
        mask: round.derivedLogic,
        weight: 1 + 0.25 * depth,
        provenance: "QCDS 128→8→1 consensus"
      };
      round.addedOracle = derivedOracle;
      rounds.push(round);
      oracles.push(derivedOracle);
      currentLogic = round.derivedLogic;

      if (round.consensusTop === lastTop) stableCount += 1; else stableCount = 0;
      lastTop = round.consensusTop;

      if (!currentLogic.includes("?") || stableCount >= 1) break;
      await new Promise(requestAnimationFrame);
    }

    const finalRound = rounds[rounds.length - 1];
    return {
      rounds,
      finalState: finalRound.consensusTop,
      finalP: finalRound.consensusP,
      finalLogic: currentLogic,
      finalOracles: oracles
    };
  }

  function collectOracles() {
    const bad = oracleRows.find(o => o.enabled && !validMask(o.mask));
    if (bad) throw new Error(`Invalid oracle mask: ${bad.name}. Use exactly eight 0 / 1 / ? symbols.`);
    return oracleRows.filter(o => o.enabled).map(o => ({
      name: o.name,
      mask: o.mask,
      weight: Number(o.weight) || 1,
      provenance: o.provenance
    }));
  }

  function formatP(p) {
    if (!Number.isFinite(p)) return "—";
    return p >= 0.01 ? (p * 100).toFixed(2) + "%" : (p * 100).toFixed(4) + "%";
  }

  function renderLaymanExplanation(result) {
    const box = $("laymanExplanation");
    const first = result.rounds[0];
    const last = result.rounds[result.rounds.length - 1];
    const unresolved = [...result.finalLogic].filter(x => x === "?").length;
    const strongest = Object.entries(last.dimensionInfluence).sort((a, b) => b[1] - a[1]).slice(0, 2);
    const strongestText = strongest.length
      ? strongest.map(([name]) => name).join(" and ")
      : "no single dimension";

    box.innerHTML = "";
    const p1 = document.createElement("p");
    p1.textContent =
      `QCDS started with ${first.stateCount.toLocaleString("en-US")} logically compatible state${first.stateCount === 1 ? "" : "s"} and repeatedly asked which patterns survived the oracle hypotheses, rotation and one-dimension-at-a-time removal. After ${result.rounds.length} recursive round${result.rounds.length === 1 ? "" : "s"}, the strongest remaining simulated state was ${result.finalState}. The derived logic ${result.finalLogic} means that some dimensions became stable 0/1 conditions while ${unresolved} dimension${unresolved === 1 ? "" : "s"} remained unresolved as ?. `;

    const p2 = document.createElement("p");
    p2.textContent =
      `The dimension-influence bars explain why that result matters: removing ${strongestText} changed the final distribution the most, so the current conclusion depends more strongly on those parts of the Syntract. The consensus probability (${formatP(result.finalP)}) is only the share of this final QCDS simulation distribution assigned to the leading state—it is not a medical probability, diagnosis or treatment confidence. The useful question is whether the same structure stays stable when better evidence and better oracles are added in the next run.`;

    box.append(p1, p2);
  }

  function renderResults(result) {
    const runningOrb = resultsRunning.querySelector(".result-orb");
    const runningTitle = resultsRunning.querySelector("h3");
    const runningText = resultsRunning.querySelector("p");
    resultsRunning.hidden = false;
    resultsRunning.style.display = "grid";
    runningOrb.classList.remove("spin");
    runningTitle.textContent = "QCDS complete.";
    runningText.textContent = "The recursive run is finished. The Q has stopped rotating; the result is shown below.";
    resultsEmpty.hidden = true;
    resultsEmpty.style.display = "none";
    resultsLive.hidden = false;
    resultsLive.style.display = "";
    $("finalState").textContent = result.finalState;
    $("finalP").textContent = formatP(result.finalP);
    $("finalLogic").textContent = result.finalLogic;
    $("roundCount").textContent = String(result.rounds.length);

    const timeline = $("roundTimeline");
    timeline.innerHTML = "";
    result.rounds.forEach((r, i) => {
      const row = document.createElement("div");
      row.className = "round-row";
      row.innerHTML = `
        <div class="round-index">R${i + 1}</div>
        <div class="round-path"><code>${r.inputLogic}</code><span>→</span><code>${r.derivedLogic}</code></div>
        <div class="round-meta"><b>${r.stateCount.toLocaleString("en-US")}</b> states · top <code>${r.consensusTop}</code> · ${formatP(r.consensusP)}</div>
      `;
      timeline.appendChild(row);
    });

    const last = result.rounds[result.rounds.length - 1];
    const influence = $("influenceChart");
    influence.innerHTML = "";
    const influenceEntries = Object.entries(last.dimensionInfluence).sort((a, b) => b[1] - a[1]);
    const maxInfluence = Math.max(...influenceEntries.map(([, v]) => v), 1e-9);
    influenceEntries.forEach(([name, value]) => {
      const row = document.createElement("div");
      row.className = "bar-row";
      row.innerHTML = `
        <span>${name}</span>
        <div class="bar-track"><i style="width:${Math.max(2, (value / maxInfluence) * 100).toFixed(1)}%"></i></div>
        <b>${value.toFixed(3)}</b>
      `;
      influence.appendChild(row);
    });

    const dist = $("distributionChart");
    dist.innerHTML = "";
    const topStates = Object.entries(last.consensusDistribution).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const maxP = Math.max(...topStates.map(([, p]) => p), 1e-9);
    topStates.forEach(([state, p], i) => {
      const col = document.createElement("div");
      col.className = "dist-col" + (i === 0 ? " winner" : "");
      col.innerHTML = `
        <div class="dist-value">${(p * 100).toFixed(2)}%</div>
        <div class="dist-bar" style="height:${Math.max(5, (p / maxP) * 100).toFixed(1)}%"></div>
        <code>${state}</code>
      `;
      dist.appendChild(col);
    });

    renderLaymanExplanation(result);
    resultsLive.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function execute() {
    if (runButton.disabled) return;
    try {
      const logic = mask.join("");
      const oracles = collectOracles();
      const depth = Number($("depthSelect").value);
      const shots = Number($("shotsSelect").value);

      runButton.disabled = true;
      runButton.classList.add("running");
      const runningOrb = resultsRunning.querySelector(".result-orb");
      const runningTitle = resultsRunning.querySelector("h3");
      const runningText = resultsRunning.querySelector("p");
      runningOrb.classList.add("spin");
      runningTitle.textContent = "QCDS is running.";
      runningText.textContent = "128 perspectives are being rotated, excluded and funneled into eight families and one consensus.";
      resultsRunning.hidden = false;
      resultsRunning.style.display = "grid";
      resultsEmpty.hidden = true;
      resultsEmpty.style.display = "none";
      resultsLive.hidden = true;
      resultsLive.style.display = "none";

      const result = await runQCDS(logic, oracles, depth, shots);
      runState.textContent = `Complete. ${result.rounds.length} recursive round${result.rounds.length === 1 ? "" : "s"} executed. No target state was supplied.`;
      renderResults(result);
    } catch (err) {
      runState.textContent = "Run stopped: " + err.message;
      resultsRunning.hidden = true;
      resultsRunning.style.display = "none";
      resultsEmpty.hidden = false;
      resultsEmpty.style.display = "grid";
      resultsLive.hidden = true;
      resultsLive.style.display = "none";
      resultsEmpty.innerHTML = `<div class="result-orb error">!</div><h3>Input needs attention.</h3><p>${err.message}</p>`;
    } finally {
      runButton.disabled = false;
      runButton.classList.remove("running");
    }
  }

  document.querySelectorAll(".preset").forEach(btn => {
    btn.addEventListener("click", () => {
      mask = btn.dataset.mask.split("");
      renderMask();
    });
  });

  $("resetMask").addEventListener("click", () => {
    mask = Array(8).fill("?");
    renderMask();
  });

  runButton.addEventListener("click", execute);

  renderDimensions();
  renderMask();
  renderOracles();
})();