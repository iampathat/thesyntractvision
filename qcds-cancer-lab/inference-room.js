/* QCDS Cancer Lab — inspectable logical inference space.
 * Displays engine-generated lane observations, not decorative/proxy scores.
 * Theory and creation by Patrik Sundblom.
 * R&D support: OpenAI / ChatGPT.
 */
(function (root) {
  "use strict";
  const CORE = root.QCDSCore;
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
    return r < 8 ? "Forward +" + r : "Mirrored +" + (r - 8);
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
    if (!lane) return "This lane has not been computed in the selected pass.";
    return `Rotation ${rotationLabel(lane.rotation)} · true-null: ${CORE.DIMENSIONS[lane.excludedIndex]} · N=${lane.stateCount}, M=${lane.markedCount} · Grover m=${lane.groverIterations} · marked mass ${percent(lane.markedMass)} · highest individual P ${percent(lane.topProbability)} · entropy ${lane.entropyBits.toFixed(3)} bits. These are local oracle measurements, not biological probabilities.`;
  }
  function selectCell(row, col) {
    selected = { excludedIndex: row, bankIndex: col };
    for (let r = 0; r < 8; r++) for (let c = 0; c < 16; c++) {
      cellMatrix[r][c].classList.toggle("selected", r === row && c === col);
    }
    const lane = observationAt(visibleCycle, row, col);
    text("laneLabel", `LANE ${String(col + 1).padStart(2, "0")} / FAMILY ${row + 1}`);
    text("laneDetails", describeLane(lane));
  }
  function renderHeatmap() {
    for (let row = 0; row < 8; row++) for (let col = 0; col < 16; col++) {
      const button = cellMatrix[row][col];
      const lane = observationAt(visibleCycle, row, col);
      button.classList.toggle("computed", Boolean(lane));
      button.style.setProperty("--intensity", lane ? Math.min(.90, .16 + lane.markedMass * .74).toFixed(3) : ".04");
      button.title = lane ? describeLane(lane) : "Awaiting computation";
      button.setAttribute("aria-label", `${CORE.DIMENSIONS[row]} excluded, rotation ${col + 1}: ${lane ? percent(lane.markedMass) + " marked mass" : "not computed"}`);
    }
    selectCell(selected.excludedIndex, selected.bankIndex);
  }
  function drawFunnel(cycle) {
    const holder = byId("familySummary");
    if (!holder) return;
    holder.replaceChildren();
    if (!cycle) {
      text("parentSummary", "Parent Grover will be calculated after all eight family distributions are bound.");
      text("stabilitySummary", "Stability requires multiple independent signals across recursive cycles.");
      return;
    }
    cycle.familyDistributions.forEach((distribution, i) => {
      const top = distribution.reduce((best, value, j) => value > distribution[best] ? j : best, 0);
      const p = distribution[top];
      const row = make("div", "family-row");
      const name = make("span", "", CORE.DIMENSIONS[i]);
      const track = make("div", "family-track");
      const fill = make("i");
      fill.style.width = Math.max(1, p * 100).toFixed(2) + "%";
      track.appendChild(fill);
      row.append(name, track, make("strong", "", CORE.stateToBits(top) + " · " + percent(p)));
      holder.appendChild(row);
    });
    const g = cycle.parent.grover;
    text("parentSummary", `8 family distributions → 1 bound Syntract → fresh Parent Grover: N=${g.stateCount}, M=${g.markedCount}, m=${g.iterations}. Marked mass ${percent(g.markedMass)}; ${cycle.parent.resolved ? "amplified candidate" : "unresolved / no discriminating amplification"}.`);
    const s = cycle.stability;
    text("stabilitySummary", s?.stable
      ? "Recursive stability gate passed (distribution, entropy, top state, top-k and dimension influence). Not medical validation."
      : "Stability gate not passed: " + ((s?.reasons || []).join("; ") || "more recursive evidence required") + ".");
  }
  function showCycle(index) {
    visibleCycle = Number(index) || 0;
    renderHeatmap();
    drawFunnel(finishedCycles[visibleCycle]);
    text("spaceProgress", finishedCycles.length
      ? `PASS ${visibleCycle + 1} / ${finishedCycles.length} · 128 OF 128 LOGICAL LANES INSPECTABLE`
      : "NO COMPUTATION YET");
  }
  function initialize() {
    const board = byId("laneMatrix");
    if (!board) return;
    board.replaceChildren();
    const corner = make("div", "matrix-corner", "NULL ↓  / ROTATION →");
    board.appendChild(corner);
    for (let col = 0; col < 16; col++) board.appendChild(make("div", "matrix-axis", String(col + 1).padStart(2, "0")));
    for (let row = 0; row < 8; row++) {
      board.appendChild(make("div", "matrix-dimension", `${row + 1}. ${CORE.DIMENSIONS[row]}`));
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
    text("spaceProgress", "0 / 128 LOGICAL LANES COMPUTED");
    drawFunnel(null);
    renderHeatmap();
  }
  function update(info) {
    const existing = liveCycles.get(info.cycle) || [];
    if (info.lanes) existing.push(...info.lanes);
    liveCycles.set(info.cycle, existing);
    visibleCycle = info.cycle;
    const total = info.lanesDone;
    text("spaceProgress", `PASS ${info.cycle + 1} · ${total} / 128 LOGICAL LANES COMPUTED`);
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
