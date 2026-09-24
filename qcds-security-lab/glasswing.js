import {
  GLASSWING_VERSION,
  CONDITION_DEFS,
  SCENARIOS,
  projectFromScenario,
  runGlasswing,
} from "./glasswing.mjs?v=1.0.0";

const $ = (selector) => document.querySelector(selector);
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );

const LAB_STORAGE = "qcds-security-lab:workspace:v1";
let project = projectFromScenario("portal");
let lastRun = null;

function tri(value) {
  return value === true ? "1" : value === false ? "0" : "?";
}
function fromTri(value) {
  return value === "1" ? true : value === "0" ? false : null;
}
function statusClass(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("refuted")) return "status-refuted";
  if (s.includes("supported")) return "status-supported";
  if (s.includes("conflict")) return "status-conflict";
  if (s.includes("conditional") || s.includes("context")) return "status-conditional";
  return "status-hypothesis";
}
function metric(label, value, note = "") {
  return `<div class="metric"><span>${esc(label)}</span><strong>${esc(value)}</strong>${note ? `<small>${esc(note)}</small>` : ""}</div>`;
}
function renderConditions() {
  $("#condition-grid").innerHTML = CONDITION_DEFS.map(
    ([key, label], index) => `
      <label class="condition-card">
        <span class="condition-id">C${index + 1}</span>
        <span class="condition-label">${esc(label)}</span>
        <select data-condition="${esc(key)}" aria-label="C${index + 1}: ${esc(label)}">
          <option value="1" ${project.input.flags[key] === true ? "selected" : ""}>1 · yes</option>
          <option value="0" ${project.input.flags[key] === false ? "selected" : ""}>0 · no</option>
          <option value="?" ${project.input.flags[key] == null ? "selected" : ""}>? · unresolved</option>
        </select>
      </label>`,
  ).join("");
}
function syncForm() {
  $("#system-name").value = project.input.name || "";
  $("#system-description").value = project.input.description || "";
  $("#attacker-goal").value = project.input.attackerGoal || "";
  $("#assets").value = (project.input.assets || []).join("\n");
  renderConditions();
}
function readForm() {
  project.input.name = $("#system-name").value.trim() || "Untitled system";
  project.input.description = $("#system-description").value.trim();
  project.input.attackerGoal = $("#attacker-goal").value.trim();
  project.input.assets = $("#assets").value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 100);
  document.querySelectorAll("[data-condition]").forEach((select) => {
    project.input.flags[select.dataset.condition] = fromTri(select.value);
  });
  project.example = false;
  project.updatedAt = new Date().toISOString();
}
function routeCard(route, mode) {
  const details =
    mode === "baseline"
      ? `<p>${esc(route.path)}</p>`
      : `<p>${esc(route.path)}</p>
         <div class="route-step"><b>Control</b><span>${esc(route.control)}</span></div>
         <div class="route-step"><b>Challenge</b><span>${esc(route.challenge)}</span></div>
         <div class="route-step"><b>Counter-test</b><span>${esc(route.counterTest)}</span></div>`;
  return `
    <article class="route-card">
      <div class="route-topline">
        <span class="route-id">${esc(route.id)}</span>
        <span class="route-status ${statusClass(route.status)}">${esc(route.status)}</span>
      </div>
      <h4>${esc(route.title)}</h4>
      ${details}
      <div class="route-meta">
        <span>${Number(route.attackVectorCount || 0).toLocaleString("en-US")} vector instances</span>
        <span>${route.missing?.length ? `${route.missing.length} unresolved requirement${route.missing.length === 1 ? "" : "s"}` : "required conditions present"}</span>
      </div>
    </article>`;
}
function traceList(items) {
  return `<ol class="trace-list">${items.map((item) => `<li>${esc(item)}</li>`).join("")}</ol>`;
}
function renderTrack(track) {
  const extra =
    track.id === "qcds"
      ? `
        <div class="fabric-strip">
          ${metric("Generated fabric", Number(track.metrics.generatedVectorsTotal || 0).toLocaleString("en-US"))}
          ${metric("Surviving vectors", Number(track.metrics.generatedVectorsVisible || 0).toLocaleString("en-US"))}
          ${metric("Mask space", track.metrics.maskedLogicalSpace || "1")}
        </div>
        <details class="deep-panel">
          <summary>Rotation, dimension walk & Oracles</summary>
          <div class="deep-grid">
            <section>
              <h5>Perspective rotation</h5>
              ${track.rotation
                .map(
                  (run) =>
                    `<p><b>${esc(run.name)}</b><br><span>${run.lost.length ? `Loses ${esc(run.lost.join(", "))}` : "No current route family is lost"}</span></p>`,
                )
                .join("")}
            </section>
            <section>
              <h5>Material dimension walks</h5>
              ${
                track.dimensions.length
                  ? track.dimensions
                      .slice(0, 8)
                      .map(
                        (run) =>
                          `<p><b>${esc(run.id)} · ${esc(run.label)}</b><br><span>${run.weakened.length ? `Weakens ${esc(run.weakened.join(", "))}` : "Route family stable"} · ${run.activeToConditional} vectors become conditional</span></p>`,
                      )
                      .join("")
                  : "<p>No declared true dimension materially weakens the current route families.</p>"
              }
            </section>
            <section>
              <h5>Oracles</h5>
              ${track.oracles
                .map(
                  (oracle) =>
                    `<p><b>${esc(oracle.name)} · ${esc(oracle.state)}</b><br><span>${esc(oracle.detail)}</span></p>`,
                )
                .join("")}
            </section>
          </div>
        </details>`
      : "";
  return `
    <section class="mode-card mode-${esc(track.id)}">
      <div class="mode-head">
        <div>
          <span class="eyebrow">${esc(track.eyebrow)}</span>
          <h3>${esc(track.name)}</h3>
        </div>
        <span class="mode-index">${track.id === "baseline" ? "01" : track.id === "agentic" ? "02" : "03"}</span>
      </div>
      <p class="mode-explanation">${esc(track.explanation)}</p>
      <div class="metrics-grid">
        ${metric("Route families", track.metrics.routeFamilies)}
        ${metric("Recursive branches", track.metrics.recursiveBranches)}
        ${metric("Perspective comparisons", track.metrics.perspectiveComparisons)}
        ${metric("Dimension comparisons", track.metrics.dimensionComparisons)}
        ${metric("Evidence-bound", track.metrics.evidenceBoundRoutes)}
        ${metric("Open questions", track.metrics.unresolvedQuestions)}
      </div>
      ${extra}
      <div class="mode-trace">
        <h4>What this mode actually does</h4>
        ${traceList(track.trace)}
      </div>
      <div class="route-list">
        ${track.routes.length ? track.routes.map((route) => routeCard(route, track.id)).join("") : '<p class="empty">No current route family survives the declared conditions. That is not a safety conclusion.</p>'}
      </div>
    </section>`;
}
function renderRun() {
  if (!lastRun) return;
  const qcds = lastRun.tracks.find((track) => track.id === "qcds");
  $("#run-summary").innerHTML = `
    <div class="summary-copy">
      <span class="eyebrow">RUN COMPLETE</span>
      <h2>${esc(lastRun.system.name)}</h2>
      <p><b>Attacker goal:</b> ${esc(lastRun.system.attackerGoal || "Not specified")}</p>
    </div>
    <div class="summary-numbers">
      ${metric("Core coordinates", lastRun.conditions.length)}
      ${metric("Unknown dimensions", qcds.metrics.unresolvedQuestions)}
      ${metric("Generated candidates", Number(qcds.metrics.generatedVectorsTotal || 0).toLocaleString("en-US"))}
      ${metric("Surviving", Number(qcds.metrics.generatedVectorsVisible || 0).toLocaleString("en-US"))}
    </div>`;
  $("#comparison-grid").innerHTML = lastRun.tracks.map(renderTrack).join("");
  const notices = lastRun.comparison.notices;
  $("#comparison-note").innerHTML = `
    <strong>Read the comparison correctly.</strong>
    <span>${esc(notices[0])} ${esc(notices[1])}</span>`;
  $("#results").hidden = false;
  $("#results").scrollIntoView({ behavior: "smooth", block: "start" });
}
function runExperiment() {
  readForm();
  lastRun = runGlasswing(project);
  renderRun();
  $("#run-button").textContent = "Run Glasswing again";
}
function loadScenario(id) {
  project = projectFromScenario(id);
  syncForm();
  lastRun = null;
  $("#results").hidden = true;
}
function loadActiveLabCase() {
  try {
    const saved = JSON.parse(localStorage.getItem(LAB_STORAGE));
    const current = saved?.cases?.[saved.caseId];
    if (!current?.input) throw new Error("No saved Security Lab case found in this browser.");
    project = structuredClone(current);
    syncForm();
    $("#scenario").value = "current";
    $("#load-status").textContent = `Loaded active Security Lab case: ${project.input.name}`;
  } catch (error) {
    $("#load-status").textContent = error.message || "Could not load the active Security Lab case.";
  }
}
function exportRun() {
  if (!lastRun) runExperiment();
  const payload = {
    ...lastRun,
    model: undefined,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `project-glasswing-${Date.now()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function initScenarioMenu() {
  $("#scenario").innerHTML = [
    `<option value="current">Active Security Lab case</option>`,
    ...SCENARIOS.map(
      (scenario) =>
        `<option value="${esc(scenario.id)}">${esc(scenario.label)}</option>`,
    ),
  ].join("");
  $("#scenario").value = "portal";
}
function init() {
  $("#version").textContent = `Glasswing ${GLASSWING_VERSION}`;
  initScenarioMenu();
  syncForm();
  $("#scenario").addEventListener("change", (event) => {
    if (event.target.value === "current") loadActiveLabCase();
    else loadScenario(event.target.value);
  });
  $("#load-active").addEventListener("click", loadActiveLabCase);
  $("#run-button").addEventListener("click", runExperiment);
  $("#export-button").addEventListener("click", exportRun);
  $("#condition-grid").addEventListener("change", () => {
    $("#results").hidden = true;
  });
}
init();
