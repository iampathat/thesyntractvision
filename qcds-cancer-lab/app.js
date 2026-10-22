(() => {
  "use strict";

  const CORE = globalThis.QCDSCore;
  if (!CORE) throw new Error("QCDSCore failed to load.");

  const DIMENSIONS = CORE.DIMENSIONS;
  const ROOM = globalThis.QCDSInferenceRoom;
  const CLINICAL = globalThis.CancerLabClinicalUI;
  const DEFAULT_ORACLES = [
    { name: "DNA repair", mask: "11??0???", provenance: "Illustrative · unvalidated mask" },
    { name: "PI3K axis", mask: "??1?1???", provenance: "Illustrative · unvalidated mask" },
    { name: "Receptor axis", mask: "???111??", provenance: "Illustrative · unvalidated mask" },
    { name: "HR + broad", mask: "1??1????", provenance: "Illustrative · unvalidated mask" },
    { name: "PI3K + HR", mask: "??11????", provenance: "Illustrative · unvalidated mask" }
  ];

  let mask = Array(8).fill("?");
  let oracleRows = DEFAULT_ORACLES.map(o => ({ ...o, enabled: true }));
  globalThis.CancerLabOracleState = () => oracleRows.map(o => o.mask);

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

  function cycleBit(v) {
    return v === "?" ? "0" : v === "0" ? "1" : "?";
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

    // No fabricated decorative probability bars: the analysis panels show only computed data.
    maskViz.replaceChildren();
    CLINICAL?.renderDimensionReference(mask);
  }

  function renderOracles() {
    oracleControls.innerHTML = "";
    oracleRows.forEach((o, index) => {
      const row = document.createElement("div");
      row.className = "oracle-row";
      row.innerHTML = `
        <label class="oracle-switch" title="Enable oracle hypothesis">
          <input type="checkbox" ${o.enabled ? "checked" : ""} aria-label="Enable ${o.name}">
          <span></span>
        </label>
        <div class="oracle-meta">
          <strong>${o.name}</strong>
          <small>${o.provenance}</small>
        </div>
        <input class="oracle-mask" value="${o.mask}" maxlength="8" spellcheck="false" aria-label="${o.name} positional mask">
        <button type="button" class="explain-button oracle-help" aria-label="Scientific and QCDS explanation for ${o.name}" title="Mechanism, genes, assays and actual mask mapping">?</button>
      `;

      const checkbox = row.querySelector('input[type="checkbox"]');
      const maskField = row.querySelector(".oracle-mask");
      row.querySelector(".oracle-help").addEventListener("click", () => CLINICAL?.open("oracle", index, {mask: oracleRows[index].mask}));

      checkbox.addEventListener("change", e => {
        oracleRows[index].enabled = e.target.checked;
        row.classList.toggle("disabled", !e.target.checked);
      });
      maskField.addEventListener("input", e => {
        const value = e.target.value.trim();
        oracleRows[index].mask = value;
        let valid = true;
        try { CORE.validateMask(value); } catch { valid = false; }
        e.target.classList.toggle("invalid", !valid);
      });
      row.classList.toggle("disabled", !o.enabled);
      oracleControls.appendChild(row);
    });
  }

  function collectOracles() {
    return oracleRows.filter(o => o.enabled).map(o => {
      CORE.validateMask(o.mask);
      return { name: o.name, mask: o.mask, provenance: o.provenance };
    });
  }

  function formatP(p) {
    if (!Number.isFinite(p)) return "—";
    return p >= 0.01 ? (p * 100).toFixed(2) + "%" : (p * 100).toFixed(4) + "%";
  }

  function renderLaymanExplanation(result) {
    const box = $("laymanExplanation");
    const first = result.cycles[0];
    const last = result.cycles[result.cycles.length - 1];
    const unresolved = [...result.finalLogic].filter(x => x === "?").length;
    const strongest = last.influence
      .map((v, i) => [DIMENSIONS[i], v])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([name]) => name)
      .join(" and ");

    box.innerHTML = "";
    const p1 = document.createElement("p");
    const status = last.stability?.stable ? "The internal convergence gate passed." : "The internal convergence gate was not satisfied.";
    p1.textContent = result.finalResolved
      ? `The engine executed ${first.laneCount} symbolic seven-bit Grover searches per recursive pass (16 position rotations × 8 feature exclusions), combined the complete distributions into eight families and then a Parent-Grover distribution. Following ${result.cycles.length} pass(es), the algorithm amplified state ${result.finalState}, with inferred constraint mask ${result.finalLogic} (${unresolved} unresolved dimensions). ${status}`
      : `The engine completed ${result.cycles.length} recursive pass(es) but no discriminating Parent-Grover amplification was observed. The derived mask remains ${result.finalLogic} with ${unresolved} unresolved dimensions. This is an unresolved computational result. ${status}`;

    const p2 = document.createElement("p");
    p2.textContent = `The most sensitive excluded features were ${strongest || "not differentiated"}. These scores measure total-variation differences under feature exclusion; they do not establish causal biology. Parent-state probability ${formatP(result.finalProbability)} is a modeled distribution conditional on the current synthetic masks, not an estimated likelihood of malignancy, DNA repair deficiency or therapeutic response. No patient observations or independent molecular truth labels were evaluated.`;

    box.append(p1, p2);
  }

  function renderResults(result) {
    const orb = resultsRunning.querySelector(".result-orb");
    resultsRunning.hidden = false;
    resultsRunning.style.display = "grid";
    orb.classList.remove("spin");
    resultsRunning.querySelector("h3").textContent = "QCDS complete.";
    resultsRunning.querySelector("p").textContent = "The simulation completed and its computed trace is available for inspection below.";

    resultsEmpty.hidden = true;
    resultsEmpty.style.display = "none";
    resultsLive.hidden = false;
    resultsLive.style.display = "";

    const lastParent = result.cycles[result.cycles.length - 1].parent;
    const unresolvedParent = result.finalResolved === false;
    $("finalState").textContent = unresolvedParent ? "UNRESOLVED" : result.finalState;
    $("finalP").textContent = unresolvedParent ? "—" : formatP(result.finalProbability);
    $("finalLogic").textContent = result.finalLogic;
    $("roundCount").textContent = String(result.cycles.length);

    const timeline = $("roundTimeline");
    timeline.innerHTML = "";
    result.cycles.forEach((r, i) => {
      const row = document.createElement("div");
      row.className = "round-row";
      const stableText = r.stability?.stable ? "stable" : "re-enter";
      row.innerHTML = `
        <div class="round-index">R${i + 1}</div>
        <div class="round-path"><code>${r.derivedLogic}</code><span>·</span><code>${stableText}</code></div>
        <div class="round-meta"><b>${r.laneCount}</b> lanes · local N=128 · M=${r.markedMin === r.markedMax ? r.markedMin : r.markedMin + "–" + r.markedMax} · Grover m=${r.groverMin === r.groverMax ? r.groverMin : r.groverMin + "–" + r.groverMax} · Parent N=${r.parent.grover.stateCount}, M=${r.parent.grover.markedCount}, m=${r.parent.grover.iterations} · top <code>${CORE.stateToBits(r.parent.topCanonical)}</code> · ${formatP(r.parent.grover.topProbability)}</div>
      `;
      timeline.appendChild(row);
    });

    const influence = $("influenceChart");
    influence.innerHTML = "";
    const influenceEntries = lastInfluenceEntries(result);
    const maxInfluence = Math.max(...influenceEntries.map(([, v]) => v), 1e-12);
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
    const topStates = Object.entries(result.finalDistribution).sort((a, b) => b[1] - a[1]).slice(0, 32);
    const maxP = Math.max(...topStates.map(([, p]) => p), 1e-12);
    topStates.forEach(([state, p], i) => {
      const col = document.createElement("div");
      col.className = "dist-col" + (!unresolvedParent && i === 0 ? " highlighted" : "");
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

  function lastInfluenceEntries(result) {
    const last = result.cycles[result.cycles.length - 1];
    return last.influence.map((v, i) => [DIMENSIONS[i], v]).sort((a, b) => b[1] - a[1]);
  }

  async function execute() {
    if (runButton.disabled) return;

    try {
      const inputMask = mask.join("");
      CORE.validateMask(inputMask);
      const hypotheses = collectOracles();
      const maxCycles = Number($("depthSelect").value);

      runButton.disabled = true;
      runButton.classList.add("running");
      ROOM?.start();

      const orb = resultsRunning.querySelector(".result-orb");
      orb.classList.add("spin");
      resultsRunning.querySelector("h3").textContent = "QCDS is running.";
      resultsRunning.querySelector("p").textContent = "Computing 128 logical QCDS lanes: sixteen balanced rotations × eight true-null exclusions. The browser schedules these lanes sequentially.";
      resultsRunning.hidden = false;
      resultsRunning.style.display = "grid";
      resultsEmpty.hidden = true;
      resultsEmpty.style.display = "none";
      resultsLive.hidden = true;
      resultsLive.style.display = "none";

      await new Promise(requestAnimationFrame);

      const result = await CORE.runCancerQCDSAsync({
        inputMask,
        hypotheses,
        maxCycles,
        onProgress(info) {
          runState.textContent = `Cycle ${info.cycle + 1}/${maxCycles}: ${info.lanesDone}/${info.lanesTotal} computed lanes · rotation bank ${info.bank}/${info.banks}`;
          ROOM?.update(info);
        }
      });

      const last = result.cycles[result.cycles.length - 1];
      runState.textContent =
        `Complete · ${result.cycles.length} recursive cycle${result.cycles.length === 1 ? "" : "s"} · 128→8→1 · Parent Grover m=${last.parent.grover.iterations} · no target state supplied.`;
      ROOM?.finish(result);
      renderResults(result);
    } catch (err) {
      resultsRunning.hidden = true;
      resultsRunning.style.display = "none";
      resultsEmpty.hidden = false;
      resultsEmpty.style.display = "grid";
      resultsLive.hidden = true;
      resultsLive.style.display = "none";
      resultsEmpty.replaceChildren();
      const symbol = document.createElement("div");
      symbol.className = "result-orb error"; symbol.textContent = "!";
      const heading = document.createElement("h3"); heading.textContent = "Input needs attention.";
      const message = document.createElement("p"); message.textContent = err.message;
      resultsEmpty.append(symbol, heading, message);
      runState.textContent = "Run stopped: " + err.message;
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

  CLINICAL?.initialize();
  ROOM?.initialize();
  renderDimensions();
  renderMask();
  renderOracles();
})();