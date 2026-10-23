(() => {
  "use strict";

  const CORE = globalThis.QCDSCore;
  if (!CORE) throw new Error("QCDS-kärnan kunde inte laddas.");

  const DIMENSIONS = globalThis.CancerLabKnowledge?.dimensions?.map(d => d.name) || CORE.DIMENSIONS;
  const ROOM = globalThis.QCDSInferenceRoom;
  const CLINICAL = globalThis.CancerLabClinicalUI;
  const CONCLUSION = globalThis.QCDSConclusion;
  const DEFAULT_ORACLES = [
    { name: "DNA-reparation", mask: "11??0???", provenance: "Illustrativ · ej validerad mask" },
    { name: "PI3K-axeln", mask: "??1?1???", provenance: "Illustrativ · ej validerad mask" },
    { name: "Receptoraxeln", mask: "???111??", provenance: "Illustrativ · ej validerad mask" },
    { name: "Homolog rekombination + brett villkor", mask: "1??1????", provenance: "Illustrativ · ej validerad mask" },
    { name: "PI3K + homolog rekombination", mask: "??11????", provenance: "Illustrativ · ej validerad mask" }
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
      b.setAttribute("aria-label", `${DIMENSIONS[idx]}: ${v === "?" ? "okänd" : v}`);
      b.addEventListener("click", () => {
        mask[idx] = cycleBit(mask[idx]);
        renderMask();
      });
      maskInput.appendChild(b);
    });

    const u = mask.filter(x => x === "?").length;
    unknownCount.textContent = String(u);
    stateCount.textContent = (2 ** u).toLocaleString("sv-SE");
    modeText.textContent = u === 0 ? "FULLSTÄNDIGT" : "ÖPPET";

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
        <label class="oracle-switch" title="Aktivera orakelhypotes">
          <input type="checkbox" ${o.enabled ? "checked" : ""} aria-label="Aktivera ${o.name}">
          <span></span>
        </label>
        <div class="oracle-meta">
          <strong>${o.name}</strong>
          <small>${o.provenance}</small>
        </div>
        <input class="oracle-mask" value="${o.mask}" maxlength="8" spellcheck="false" aria-label="${o.name} positionsmask">
        <button type="button" class="explain-button oracle-help" aria-label="Vetenskaplig förklaring och QCDS-modell för ${o.name}" title="Mekanism, gener, mätmetoder och exakt maskkoppling">?</button>
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
      .join(" och ");

    box.innerHTML = "";
    const p1 = document.createElement("p");
    const status = last.stability?.stable ? "De interna konvergensvillkoren uppfylldes." : "De interna konvergensvillkoren uppfylldes inte.";
    p1.textContent = result.finalResolved
      ? `Motorn genomförde ${first.laneCount} symboliska sjubitarsökningar med Grover per rekursivt pass (16 positionsrotationer × 8 uteslutna dimensioner). Fördelningarna bands samman till åtta familjer och därefter till en överordnad Grover-fördelning. Efter ${result.cycles.length} pass förstärktes tillståndet ${result.finalState}, med härledd villkorsmask ${result.finalLogic} (${unresolved} oavgjorda dimensioner). ${status}`
      : `Motorn genomförde ${result.cycles.length} rekursiva pass, men ingen särskiljande förstärkning från överordnad Grover observerades. Den härledda masken är ${result.finalLogic} med ${unresolved} oavgjorda dimensioner. Beräkningsresultatet är olöst. ${status}`;

    const p2 = document.createElement("p");
    p2.textContent = `De mest känsliga uteslutna egenskaperna var ${strongest || "ingen tydlig skillnad"}. Måtten visar skillnader i total variationsdistans när en egenskap utesluts; de bevisar inte biologiska orsakssamband. Huvudtillståndets sannolikhet ${formatP(result.finalProbability)} hör till modellens fördelning med aktuella syntetiska masker, inte sannolikheten för cancer, bristande DNA-reparation eller behandlingseffekt. Inga patientobservationer eller oberoende molekylära facit har utvärderats.`;

    box.append(p1, p2);
  }

  function renderResults(result) {
    const orb = resultsRunning.querySelector(".result-orb");
    resultsRunning.hidden = false;
    resultsRunning.style.display = "grid";
    orb.classList.remove("spin");
    resultsRunning.querySelector("h3").textContent = "QCDS-beräkningen är klar.";
    $("runProgressText").hidden = true;
    const conclusion = CONCLUSION.summarize(result, DIMENSIONS);
    $("qcdsConclusion").dataset.outcome = conclusion.category;
    $("qcdsConclusionTitle").textContent = conclusion.title;
    $("qcdsConclusionLead").textContent = conclusion.lead;
    $("qcdsConclusionDetail").textContent = conclusion.detail;
    $("qcdsConclusionScope").textContent = conclusion.scope;
    $("qcdsConclusion").hidden = false;
    resultsRunning.classList.add("completed");

    resultsEmpty.hidden = true;
    resultsEmpty.style.display = "none";
    resultsLive.hidden = false;
    resultsLive.style.display = "";

    const lastParent = result.cycles[result.cycles.length - 1].parent;
    const unresolvedParent = result.finalResolved === false;
    $("finalState").textContent = unresolvedParent ? "OLÖST" : result.finalState;
    $("finalP").textContent = unresolvedParent ? "—" : formatP(result.finalProbability);
    $("finalLogic").textContent = result.finalLogic;
    $("roundCount").textContent = String(result.cycles.length);

    const timeline = $("roundTimeline");
    timeline.innerHTML = "";
    result.cycles.forEach((r, i) => {
      const row = document.createElement("div");
      row.className = "round-row";
      const stableText = r.stability?.stable ? "stabil" : "återförs";
      row.innerHTML = `
        <div class="round-index">R${i + 1}</div>
        <div class="round-path"><code>${r.derivedLogic}</code><span>·</span><code>${stableText}</code></div>
        <div class="round-meta"><b>${r.laneCount}</b> logiska rum · lokalt N=128 · M=${r.markedMin === r.markedMax ? r.markedMin : r.markedMin + "–" + r.markedMax} · Grover m=${r.groverMin === r.groverMax ? r.groverMin : r.groverMin + "–" + r.groverMax} · överordnad N=${r.parent.grover.stateCount}, M=${r.parent.grover.markedCount}, m=${r.parent.grover.iterations} · topp <code>${CORE.stateToBits(r.parent.topCanonical)}</code> · ${formatP(r.parent.grover.topProbability)}</div>
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
    $("results").scrollIntoView({ behavior: "smooth", block: "start" });
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
      resultsRunning.classList.remove("completed");
      $("qcdsConclusion").hidden = true;
      $("runProgressText").hidden = false;

      const orb = resultsRunning.querySelector(".result-orb");
      orb.classList.add("spin");
      resultsRunning.querySelector("h3").textContent = "QCDS beräknar …";
      $("runProgressText").textContent = "Beräknar 128 logiska QCDS-rum: sexton balanserade rotationer × åtta uteslutna dimensioner. Webbläsaren kör dessa sekventiellt.";
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
          runState.textContent = `Cykel ${info.cycle + 1}/${maxCycles}: ${info.lanesDone}/${info.lanesTotal} beräknade rum · rotationsbank ${info.bank}/${info.banks}`;
          ROOM?.update(info);
        }
      });

      const last = result.cycles[result.cycles.length - 1];
      runState.textContent =
        `Klart · ${result.cycles.length} rekursiva cykler · 128→8→1 · överordnad Grover m=${last.parent.grover.iterations} · inget fördefinierat måltillstånd.`;
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
      const heading = document.createElement("h3"); heading.textContent = "Kontrollera dina indata.";
      const message = document.createElement("p"); message.textContent = err.message;
      resultsEmpty.append(symbol, heading, message);
      runState.textContent = "Körningen stoppades: " + err.message;
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