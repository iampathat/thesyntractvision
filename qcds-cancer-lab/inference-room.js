/* QCDS Oncology Lab — inspectable logical inference space.
 * Displays engine-generated lane observations, not decorative/proxy scores.
 * Theory and creation by Patrik Sundblom.
 * R&D support: OpenAI / ChatGPT.
 */
(function (root) {
  "use strict";
  const CORE = root.QCDSCore;
  const NAMES = root.CancerLabKnowledge?.dimensions?.map(d=>d.name) || CORE.DIMENSIONS;
  const byId = id => document.getElementById(id);
  const cellMatrix = [];
  const liveCycles = new Map();
  let finishedCycles = [];
  let visibleCycle = 0;
  let selected = { bankIndex: 0, excludedIndex: 0 };

  function percent(value) {
    return Number.isFinite(value) ? (100 * value).toFixed(2) + "%" : "—";
  }
  function text(id, value) { if (byId(id)) byId(id).textContent = value; }
  function rotationLabel(bank) {
    const r = bank % 16;
    return r < 8 ? "Framåt +" + r : "Spegelvänt +" + (r - 8);
  }
  function make(tag, cls, value) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (value != null) el.textContent = value;
    return el;
  }

  function observationAt(cycle, row, col) {
    const observations = finishedCycles[cycle]?.laneObservations || liveCycles.get(cycle) || [];
    return observations.find(v => v.excludedIndex === row && v.bankIndex === col);
  }
  function describeLane(lane) {
    if (!lane) return "Detta logiska rum har inte beräknats i det valda passet.";
    return `Rotation ${rotationLabel(lane.rotation)} · utesluten dimension: ${NAMES[lane.excludedIndex]} · N=${lane.stateCount}, M=${lane.markedCount} · Grover m=${lane.groverIterations} · markerad massa ${percent(lane.markedMass)} · högsta enskilda sannolikhet ${percent(lane.topProbability)} · entropi ${lane.entropyBits.toFixed(3)} bitar. Detta är lokala orakelmått, inte biologiska sannolikheter.`;
  }
  function selectCell(row, col) {
    selected = { excludedIndex: row, bankIndex: col };
    for (let r = 0; r < 8; r++) for (let c = 0; c < 16; c++) {
      cellMatrix[r][c].classList.toggle("selected", r === row && c === col);
    }
    const lane = observationAt(visibleCycle, row, col);
    text("laneLabel", `RUM ${String(col + 1).padStart(2, "0")} / FAMILJ ${row + 1}`);
    text("laneDetails", describeLane(lane));
  }
  function renderHeatmap() {
    for (let row = 0; row < 8; row++) for (let col = 0; col < 16; col++) {
      const button = cellMatrix[row][col];
      const lane = observationAt(visibleCycle, row, col);
      button.classList.toggle("computed", Boolean(lane));
      button.style.setProperty("--intensity", lane ? Math.min(.90, .16 + lane.markedMass * .74).toFixed(3) : ".04");
      button.title = lane ? describeLane(lane) : "Inväntar beräkning";
      button.setAttribute("aria-label", `${NAMES[row]} utesluten, rotation ${col + 1}: ${lane ? percent(lane.markedMass) + " markerad massa" : "inte beräknad"}`);
    }
    selectCell(selected.excludedIndex, selected.bankIndex);
  }
  function drawFunnel(cycle) {
    const holder = byId("familySummary");
    if (!holder) return;
    holder.replaceChildren();
    if (!cycle) {
      text("parentSummary", "Överordnad Grover beräknas när alla åtta familjefördelningar har bundits samman.");
      text("stabilitySummary", "Stabilitet kräver flera samstämmiga signaler genom rekursiva cykler.");
      return;
    }
    const topPeaks = cycle.familyDistributions.map(distribution => Math.max(...distribution));
    const scalePeak = Math.max(...topPeaks, 1e-12);
    cycle.familyDistributions.forEach((distribution, i) => {
      const top = distribution.reduce((best, value, j) => value > distribution[best] ? j : best, 0);
      const p = distribution[top];
      const row = make("div", "family-row");
      const name = make("span", "", NAMES[i]);
      const track = make("div", "family-track");
      const fill = make("i");
      fill.style.width = Math.max(2, p / scalePeak * 100).toFixed(2) + "%";
      track.appendChild(fill);
      row.append(name, track, make("strong", "", CORE.stateToBits(top) + " · " + percent(p)));
      holder.appendChild(row);
    });
    const g = cycle.parent.grover;
    text("parentSummary", `8 familjefördelningar → 1 sammanbunden Syntract → ny överordnad Grover: N=${g.stateCount}, M=${g.markedCount}, m=${g.iterations}. Markerad massa ${percent(g.markedMass)}; ${cycle.parent.resolved ? "förstärkt kandidat" : "olöst / ingen särskiljande förstärkning"}.`);
    const s = cycle.stability;
    text("stabilitySummary", s?.stable
      ? "De rekursiva stabilitetsvillkoren uppfylldes (fördelning, entropi, toppresultat, topp-k och dimensionspåverkan). Det är ingen medicinsk validering."
      : "Stabilitetsvillkoren uppfylldes inte: " + ((s?.reasons || []).join("; ") || "ytterligare rekursiv information behövs") + ".");
  }
  function showCycle(index) {
    visibleCycle = Number(index) || 0;
    renderHeatmap();
    drawFunnel(finishedCycles[visibleCycle]);
    text("spaceProgress", finishedCycles.length
      ? `PASS ${visibleCycle + 1} / ${finishedCycles.length} · 128 AV 128 LOGISKA RUM KAN GRANSKAS`
      : "ÄNNU INGEN BERÄKNING");
  }
  function initialize() {
    const board = byId("laneMatrix");
    if (!board) return;
    board.replaceChildren();
    const corner = make("div", "matrix-corner", "UTESLUTNING ↓ / ROTATION →");
    board.appendChild(corner);
    for (let col = 0; col < 16; col++) board.appendChild(make("div", "matrix-axis", String(col + 1).padStart(2, "0")));
    for (let row = 0; row < 8; row++) {
      board.appendChild(make("div", "matrix-dimension", `${row + 1}. ${NAMES[row]}`));
      cellMatrix[row] = [];
      for (let col = 0; col < 16; col++) {
        const button = make("button", "lane-cell");
        button.type = "button";
        button.style.setProperty("--intensity", ".04");
        button.addEventListener("click", () => selectCell(row, col));
        board.appendChild(button);
        cellMatrix[row][col] = button;
      }
    }
    const selector = byId("spaceCycle");
    if (selector) selector.addEventListener("change", event => showCycle(event.target.value));
    renderHeatmap();
  }
  function start() {
    finishedCycles = [];
    liveCycles.clear();
    visibleCycle = 0;
    const selector = byId("spaceCycle");
    if (selector) { selector.replaceChildren(); selector.disabled = true; }
    text("spaceProgress", "0 / 128 LOGISKA RUM BERÄKNADE");
    drawFunnel(null);
    renderHeatmap();
  }
  function update(info) {
    const existing = liveCycles.get(info.cycle) || [];
    if (info.lanes) existing.push(...info.lanes);
    liveCycles.set(info.cycle, existing);
    visibleCycle = info.cycle;
    const total = info.lanesDone;
    text("spaceProgress", `PASS ${info.cycle + 1} · ${total} / 128 LOGISKA RUM BERÄKNADE`);
    renderHeatmap();
  }
  function finish(result) {
    finishedCycles = result.cycles || [];
    const selector = byId("spaceCycle");
    if (selector) {
      selector.replaceChildren();
      finishedCycles.forEach((_, i) => {
        const opt = make("option", "", "Pass " + (i + 1));
        opt.value = String(i);
        selector.appendChild(opt);
      });
      selector.disabled = false;
      selector.value = String(Math.max(0, finishedCycles.length - 1));
    }
    showCycle(Math.max(0, finishedCycles.length - 1));
  }
  root.QCDSInferenceRoom = { initialize, start, update, finish };
})(globalThis);
