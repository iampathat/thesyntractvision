(() => {
  "use strict";

  const CORE = globalThis.QCDSCore;
  if (!CORE) throw new Error("QCDSCore failed to load.");

  const DIMENSIONS = CORE.DIMENSIONS;
  const DEFAULT_ORACLES = [
    { name: "DNA repair", mask: "11??0???", provenance: "legacy cancer hypothesis" },
    { name: "PI3K axis", mask: "??1?1???", provenance: "legacy cancer hypothesis" },
    { name: "Receptor axis", mask: "???111??", provenance: "legacy cancer hypothesis" },
    { name: "HR + broad", mask: "1??1????", provenance: "legacy cancer hypothesis" },
    { name: "PI3K + HR", mask: "??11????", provenance: "legacy cancer hypothesis" }
  ];

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

    maskViz.innerHTML = "";
    const bars = Math.min(16, Math.max(4, 2 ** Math.min(u, 4)));
    for (let i = 0; i < bars; i++) {
      const s = document.createElement("span");
      s.style.setProperty("--h", (24 + ((i * 31 + u * 17) % 58)) + "%");
      maskViz.appendChild(s);
    }
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
        <input class="oracle-mask" value="${o.mask}" maxlength="8" spellcheck="false" aria-label="${o.name} mask">
      `;

      const checkbox = row.querySelector('input[type="checkbox"]');
      const maskField = row.querySelector(".oracle-mask");

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
    p1.textContent =
      `QCDS ran ${first.laneCount} true-null Grover lanes in the first cycle: sixteen rotated banks of eight complementary views. Those 128 full lane distributions were bound into eight rotational families, then into one Syntract, and a fresh Parent Grover was executed over the strongest bound structures. After ${result.cycles.length} recursive cycle${result.cycles.length === 1 ? "" : "s"}, the leading Parent-Grover state was ${result.finalState}. The bound logic ${result.finalLogic} shows which dimensions stayed fixed and which ${unresolved} dimension${unresolved === 1 ? "" : "s"} remain unresolved as ?. `;

    const p2 = document.createElement("p");
    p2.textContent =
      `The influence bars are a sensitivity check, not a vote: they show how much the bound distribution changes when each semantic dimension is truly absent. In this run, ${strongest || "no single dimension"} changed it the most. The displayed probability (${formatP(result.finalProbability)}) is the Parent-Grover probability inside this QCDS run—not a medical probability or treatment confidence. What matters is whether the same structure survives new evidence, oracle changes and recursive return.`;

    box.append(p1, p2);
  }

  function renderResults(result) {
    const orb = resultsRunning.querySelector(".result-orb");
    resultsRunning.hidden = false;
    resultsRunning.style.display = "grid";
    orb.classList.remove("spin");
    resultsRunning.querySelector("h3").textContent = "QCDS complete.";
    resultsRunning.querySelector("p").textContent = "The Q has stopped because the recursive QCDS run is finished. The result is shown below.";

    resultsEmpty.hidden = true;
    resultsEmpty.style.display = "none";
    resultsLive.hidden = false;
    resultsLive.style.display = "";

    $("finalState").textContent = result.finalState;
    $("finalP").textContent = formatP(result.finalProbability);
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
    const topStates = Object.entries(result.finalDistribution).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const maxP = Math.max(...topStates.map(([, p]) => p), 1e-12);
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

      const orb = resultsRunning.querySelector(".result-orb");
      orb.classList.add("spin");
      resultsRunning.querySelector("h3").textContent = "QCDS is running.";
      resultsRunning.querySelector("p").textContent = "128 true-null Grover lanes are rotating through the 128 → 8 → 1 QCDS funnel.";
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
          runState.textContent = `Cycle ${info.cycle + 1}/${maxCycles}: ${info.lanesDone}/${info.lanesTotal} QCDS lanes complete · rotation bank ${info.bank}/${info.banks}`;
        }
      });

      const last = result.cycles[result.cycles.length - 1];
      runState.textContent =
        `Complete · ${result.cycles.length} recursive cycle${result.cycles.length === 1 ? "" : "s"} · 128→8→1 · Parent Grover m=${last.parent.grover.iterations} · no target state supplied.`;
      renderResults(result);
    } catch (err) {
      resultsRunning.hidden = true;
      resultsRunning.style.display = "none";
      resultsEmpty.hidden = false;
      resultsEmpty.style.display = "grid";
      resultsLive.hidden = true;
      resultsLive.style.display = "none";
      resultsEmpty.innerHTML = `<div class="result-orb error">!</div><h3>Input needs attention.</h3><p>${err.message}</p>`;
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

  renderDimensions();
  renderMask();
  renderOracles();
})();