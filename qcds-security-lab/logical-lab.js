// QCDS by Patrik Sundblom. Assisted by ChatGPT (OpenAI). LICENSE.md.
import {
  normalizeResearch,
  dimensionMarkdown,
} from "./logical-space.mjs?v=1.11.0";
import { createQuantumPanel } from "./quantum-panel.js?v=1.0.1";
import { comparisonMarkdown } from "./quantum-compare.mjs?v=1.0.0";
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const fmt = (s) => {
  const n = Number(s);
  return n < 1e7 ? n.toLocaleString("en-US") : n.toExponential(2);
};
const percent = (p) => `${(p * 100).toFixed(2)}%`;
const validStates = ["ACTIVE", "CONDITIONAL"];

export function researchLaunch(system, compact = false) {
  return `<section class="logic-launch ${compact ? "compact-launch" : "panel"}"><div class="logic-launch-mark" aria-hidden="true">Q<span>★</span></div><div><span class="eyebrow">DIMENSIONAL INFERENCE · LIVE</span><h2>Change an assumption. Follow the consequences.</h2><p>Walk the logical space of ${esc(system)}. Challenge a control, rotate the dimensions and see which paths still have a basis.</p></div><button class="button primary" data-open-logical>Run dimensional inference <span aria-hidden="true">↗</span></button></section>`;
}

export function createLogicalLab({
  getModel,
  getProject,
  save,
  getFinding,
  notify,
}) {
  const dialog = document.createElement("dialog");
  dialog.id = "logical-lab";
  dialog.setAttribute("aria-labelledby", "logical-title");
  document.body.append(dialog);
  let model,
    config,
    result,
    worker,
    serial = 0,
    savedScroll = 0,
    busy = false;
  const $ = (s) => dialog.querySelector(s);
  const quantum = createQuantumPanel({
    dialog,
    getRun: () => (busy ? null : result),
    onComparison: (comparison) => {
      if (!result) return;
      if (comparison) result.quantumComparison = comparison;
      else delete result.quantumComparison;
    },
  });
  const listVectors = () =>
    model.attackVectorSpace.vectors.filter((v) => v.frameworks.length);
  const focused = () => listVectors().find((v) => v.id === config.focus);
  const dims = () => [
    ...model.conditions.map((d) => ({
      key: d.key,
      label: d.label,
      value: d.value === true ? "1" : d.value === false ? "0" : "?",
    })),
    ...config.dimensions,
  ];
  const valueOf = (d) =>
    config.walk.findLast((w) => w.key === d.key)?.value ?? d.value;
  function persist() {
    getProject().research = normalizeResearch(config);
    save();
  }
  function download(text, name, type) {
    const url = URL.createObjectURL(new Blob([text], { type })),
      a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  function controls() {
    return `<details class="logic-inputs" ${matchMedia("(min-width: 1001px)").matches ? "open" : ""}><summary class="logic-input-summary">Edit mask · ${dims().length} dimensions</summary><div class="logic-section-head"><div><span class="eyebrow">01 / CONDITION FORMATION</span><h3>What do we know?</h3></div><button class="text-button" data-logic="reopen">Reopen this path’s assumptions</button></div><p class="logic-legend"><b>1</b> True <b>0</b> False <b>?</b> Unresolved <b>∅</b> Remove coordinate</p><div class="logic-dimensions">${dims()
      .map(
        (d) =>
          `<label><span title="${esc(d.label)}">${esc(d.label)}</span><select data-logic-dimension="${d.key}" aria-label="${esc(d.label)}">${["1", "0", "?", "ABSENT"].map((v) => `<option value="${v}" ${valueOf(d) === v ? "selected" : ""}>${v === "ABSENT" ? "∅ · Absent" : v}</option>`).join("")}</select></label>`,
      )
      .join(
        "",
      )}</div><p class="logic-note">Your system stays saved. These are comparison assumptions. A removed coordinate deactivates every predicate that needs it.</p><details class="logic-add"><summary>Add a system-specific dimension</summary><form id="logic-dimension-form"><label>A statement that can be checked<input name="label" required maxlength="240" placeholder="For example: the executed recipient matches the approval"></label><label>Current value<select name="value"><option>?</option><option>1</option><option>0</option></select></label><button class="button" type="submit">Add dimension</button></form></details><div class="logic-configuration"><label>Inference flow<select id="logic-mode"><option value="hybrid" ${config.mode === "hybrid" ? "selected" : ""}>Hybrid · parallel views + sequential walk</option><option value="parallel" ${config.mode === "parallel" ? "selected" : ""}>Parallel · independent exclusion lanes</option><option value="sequential" ${config.mode === "sequential" ? "selected" : ""}>Sequential · follow each changed fact</option></select></label><label>Maximum Grover iterations<input id="logic-iterations" type="number" min="0" max="40" value="${config.maxIterations}"></label></div><button class="text-button" data-logic="reset-walk">Restore declared facts</button></details>`;
  }
  function shell() {
    const vector = focused();
    dialog.innerHTML = `<header class="logic-header"><div class="logic-brand">Q<span>★</span></div><div><span class="eyebrow">QCDS DIMENSION ENGINE</span><h2 id="logical-title">${esc(model.input.name)}</h2><p>Same system · return to your current lab step</p></div><button class="button" data-logic="close" aria-label="Close dimensional investigation">Back to lab <span aria-hidden="true">×</span></button></header><div class="logic-scroll"><section class="logic-focus"><div><span class="eyebrow">THE CLAIM UNDER INVESTIGATION</span><h3>Which assumptions keep this path alive?</h3><p>QCDS carries the same claim through conditions, oracles, recursive challenges and evidence.</p></div><label>Attack vector<select id="logic-vector">${listVectors()
      .map(
        (v) =>
          `<option value="${v.id}" ${v.id === config.focus ? "selected" : ""}>${v.id} · ${v.title} · ${v.variantLabel} · ${v.targetLabel}</option>`,
      )
      .join(
        "",
      )}</select></label><p class="logic-path">${esc(vector?.path || "")}</p></section><div class="logic-columns">${controls()}<div class="logic-results" id="logic-results" aria-busy="true"><p class="logic-running" role="status">Constructing the logical space…</p></div></div><footer class="logic-footer">QCDS by Patrik Sundblom · Classical analysis + local circuit simulation · No target scanning or QPU connection</footer></div>`;
  }
  function pulse(r) {
    const a = r.final.amplification,
      pts = a.trace
        .map(
          (t, i) =>
            `${24 + (i / Math.max(1, a.trace.length - 1)) * 432},${90 - t.probability * 65}`,
        )
        .join(" ");
    return `<svg class="logic-amplification" viewBox="0 0 480 120" role="img" aria-label="Ideal Grover probability over ${a.iterationBudget} iterations; selected iteration ${a.iterations}"><path d="M24 20v70h432" fill="none" stroke="#35484f"/><line x1="24" y1="${90 - a.initialProbability * 65}" x2="456" y2="${90 - a.initialProbability * 65}" stroke="#61717c" stroke-dasharray="4 4"/><polyline points="${pts}" fill="none" stroke="#b8ff39" stroke-width="2"/><circle cx="${24 + (a.iterations / Math.max(1, a.trace.length - 1)) * 432}" cy="${90 - a.probability * 65}" r="5" fill="#70e6ef"/><text x="24" y="110">0 iterations</text><text x="375" y="110">${a.iterationBudget} iterations</text></svg>`;
  }
  function map(r) {
    const dots = (r.lanes.length ? r.lanes : r.sequential).slice(0, 16);
    return `<svg class="logic-flow-map" viewBox="0 0 600 160" role="img" aria-label="${r.final.present} coordinates, ${r.lanes.length} independent lanes, ${r.final.markedStates} compatible assignments for the selected vector"><defs><linearGradient id="logic-ray"><stop stop-color="#83f9ed"/><stop offset="1" stop-color="#b8ff39"/></linearGradient></defs><path d="M105 80H200M395 80H480" stroke="url(#logic-ray)" stroke-width="2"/><rect x="12" y="42" width="105" height="78" rx="12"/><text x="64" y="72" text-anchor="middle">MASK</text><text x="64" y="99" text-anchor="middle" class="map-value">${r.final.maskSpace}</text>${dots
      .map((l, i) => {
        const y = 16 + i * (128 / Math.max(1, dots.length - 1));
        return `<path d="M170 80L252 ${y}H330L410 80" fill="none" stroke="${l.focusState?.state === "INACTIVE" ? "#42505f" : "#58adab"}" opacity=".5"/><circle cx="${263 + (i % 2) * 35}" cy="${y}" r="4" fill="${l.focusState?.state === "INACTIVE" ? "#718193" : "#83f9ed"}"/>`;
      })
      .join(
        "",
      )}<rect x="480" y="42" width="108" height="78" rx="12"/><text x="534" y="72" text-anchor="middle">ORACLE</text><text x="534" y="99" text-anchor="middle" class="map-value">${fmt(r.final.markedStates)}</text></svg>`;
  }
  function renderResult() {
    const r = result,
      a = r.final.amplification,
      state = r.final.focusState;
    const labelFor = (key) =>
      r.final.dimensions.find((d) => d.key === key)?.label || key;
    const predicateKeys = [
      ...new Set([
        ...r.focus.requires,
        ...r.focus.requiresAny,
        ...r.recursion.map((c) => c.key),
      ]),
    ];
    const oracleDetails = `<details class="logic-oracle"><summary>Inspect the logical oracle</summary><p><b>All required:</b> ${r.focus.requires.map((key) => esc(labelFor(key))).join(" AND ") || "No mandatory core fact"}.</p>${r.focus.requiresAny.length ? `<p><b>At least one:</b> ${r.focus.requiresAny.map((key) => esc(labelFor(key))).join(" OR ")}.</p>` : ""}${r.recursion.map((c) => `<p><b>Barrier must fail:</b> ${esc(c.label)} = 0.</p>`).join("")}${r.final.witness ? `<p><b>One compatible assignment:</b></p><ul>${predicateKeys.map((key) => `<li>${esc(labelFor(key))}: <b>${r.final.witness[key]}</b></li>`).join("")}</ul><p class="logic-note">This is a logical witness, not an observed event or exploit.</p>` : `<p class="logic-note">${state.state === "INACTIVE" ? "No evaluation is possible without: " + state.inactiveDimensions.map((key) => esc(labelFor(key))).join(", ") : "No assignment satisfies this predicate under the current fixed facts and barriers."}</p>`}</details>`;
    const stateText = {
      ACTIVE: "The declared facts allow this candidate.",
      CONDITIONAL: "This path depends on facts that are still unresolved.",
      REJECTED: "The current facts contradict this path’s predicate.",
      INACTIVE:
        "A required coordinate was removed. This predicate cannot run in this view.",
    }[state.state];
    $("#logic-results").innerHTML =
      `<section class="logic-result-card"><div class="logic-section-head"><div><span class="eyebrow">02 / CONDITIONAL EVOLUTION</span><h3>The space behind ${esc(r.focus.id)}</h3></div><span class="logic-state ${state.state.toLowerCase()}">${state.state}</span></div><p>${stateText}</p>${map(r)}<div class="logic-metrics"><div><b>${r.final.present}</b><span>present coordinates</span></div><div><b>${r.final.maskSpace}</b><span>${fmt(r.final.totalStates)} compatible mask states</span></div><div><b>${fmt(r.final.markedStates)}</b><span>assignments meeting this predicate</span></div></div><p class="logic-note">${r.final.unknown === 0 ? "All present facts are fixed. Reopen an assumption to explore alternatives." : "Only ? coordinates branch. Known 1 / 0 coordinates remain fixed."} The attack catalog and the logical state space are separate.</p>${r.final.unknown === 0 ? '<button class="button" data-logic="reopen">Reopen this path’s assumptions</button>' : ""}<div class="logic-vector-totals"><span><b>${r.final.counts.active}</b> active</span><span><b>${r.final.counts.conditional}</b> conditional</span><span><b>${r.final.counts.rejected}</b> rejected</span><span><b>${r.final.counts.inactive}</b> inactive</span></div>${
        r.changed.length
          ? `<details><summary>${r.changed.length} vectors changed state</summary><div class="logic-changes">${r.changed
              .slice(0, 60)
              .map(
                (v) =>
                  `<button data-logic-focus="${v.id}">${v.id} <span>${v.state}</span></button>`,
              )
              .join(
                "",
              )}</div>${r.changed.length > 60 ? "<small>The JSON export contains every changed vector.</small>" : ""}</details>`
          : ""
      }</section>
      <section class="logic-result-card quantum-card"><span class="eyebrow">EXECUTION / SAME ORACLE</span><h3>Does circuit noise change the answer?</h3><p>Compare the classical prediction with ideal and noisy quantum-circuit simulation. Your selected path and current assumptions stay in scope.</p>${quantum.markup(r)}<details><summary>Explore the ideal formula across the iteration budget</summary><div class="logic-probability"><b>${percent(a.probability)}</b><span>selected-subspace mass at iteration <strong>${a.iterations}</strong><br>initial mass ${percent(a.initialProbability)} · lift ${a.lift.toFixed(2)}×</span></div>${pulse(r)}<p class="logic-note">Exact counts + ideal Grover formula, evaluated classically within ${a.iterationBudget} iterations. This view selects the best value anywhere in that budget. The comparison above defaults to the first ideal peak to avoid unnecessary gates. This is search probability, not the probability of a real vulnerability.</p></details></section>
      <section class="logic-result-card"><span class="eyebrow">03 / RECURSIVE INFERENCE</span><h3>What changes when a dimension disappears?</h3><p>Each row is a separate logical space. Dependent predicates become inactive; the dimension is not converted to ?.</p>${r.lanes.length ? `<div class="logic-lanes">${r.lanes.map((l) => `<details><summary><span>${esc(l.label)}</span><b>${l.counts.inactive} inactive</b></summary><p>${l.present} coordinates · ${l.maskSpace} mask states · selected vector ${l.focusState?.state.toLowerCase()}.</p><p>${l.affected.length} vector states changed. ${l.retained.length} candidates retain a basis in this lane.</p><button class="text-button" data-logic-exclude="${l.excluded}">Follow this reduced space →</button></details>`).join("")}</div>` : '<p class="logic-note">Sequential mode follows your changed facts below. Select Hybrid to also compare independent exclusion lanes.</p>'}<details><summary>Orientation rotation: ${r.rotations.filter((x) => x.agrees).length} / ${r.rotations.length} canonical results agree</summary><p>Dimensions and their predicates rotate together, then results map back to the original keys. In this ideal model, a coordinate reorder should not change the answer. This checks representation stability; it does not establish bias removal or truth.</p></details>${r.sequential.length ? `<details open><summary>Your sequential walk · ${r.sequential.length} changes</summary><ol class="logic-walk">${r.sequential.map((s) => `<li><b>${esc(dims().find((d) => d.key === s.key)?.label)} → ${s.value === "ABSENT" ? "∅" : s.value}</b><span>${s.maskSpace} · ${s.focusState?.state} · ${s.markedStates} marked assignments</span></li>`).join("")}</ol></details>` : ""}</section>
      <section class="logic-result-card logic-next"><span class="eyebrow">LET THE NEXT QUESTION CHANGE THE ORACLE</span><h3>${r.impacts.find((i) => i.decisive) ? "Resolve the fact that splits this path." : "Challenge the protection, then go deeper."}</h3>${r.impacts
        .filter((i) => i.relevant)
        .slice(0, 3)
        .map(
          (i) =>
            `<div class="logic-question"><b>${esc(i.label)}</b><p>If 0: ${fmt(i.zero)} marked assignments. If 1: ${fmt(i.one)}.</p><div><button class="button" data-logic-answer="${i.key}" data-value="0">Compare 0</button><button class="button" data-logic-answer="${i.key}" data-value="1">Compare 1</button></div></div>`,
        )
        .join(
          "",
        )}<p><b>Proposed protection:</b> ${esc(r.focus.control)}</p><p><b>Counter-test:</b> ${esc(r.focus.verify)}</p>${r.recursion.length ? `<ol class="logic-recursion">${r.recursion.map((c) => `<li><span>LAYER ${c.depth} · ${c.value}</span><b>${esc(c.label)}</b><p>${esc(c.test)}</p></li>`).join("")}</ol><p class="logic-note">For this specific path, each modeled barrier must fail (0). A barrier that holds (1) blocks the predicate; ? keeps both outcomes open.</p>` : ""}<button class="button primary" data-logic="seed-control">Challenge this control as a new dimension</button><details class="logic-add"><summary>Define the next control / counter-test</summary><form id="logic-control-form"><label>The protection that should hold<input name="label" required maxlength="240" placeholder="The exact action is authorized at execution time"></label><label>A test that could show it failing<textarea name="test" required maxlength="3000" rows="2" placeholder="Change the approved fixture parameters before execution; compare expected and actual decisions."></textarea></label><button class="button" type="submit">Add the next recursive layer</button></form></details></section>
      <section class="logic-result-card"><span class="eyebrow">04 / TRUTH-ALIGNMENT · SYNTRACT BINDING</span><h3>What did the test actually show?</h3><span class="logic-state">${r.binding.status}</span><p class="logic-note">Observations bind to ${r.focus.id}, these exact dimensions and control predicates. A changed scope archives the old observation. ${r.binding.archivedRecords} archived here.</p>${r.binding.records.map((x) => `<article class="logic-observation"><b>${esc(x.source)} · ${x.outcome}</b><p>${esc(x.observation)}</p></article>`).join("")}<details class="logic-add"><summary>Record an observation for this snapshot</summary><form id="logic-evidence-form"><label>Test / source reference<input name="source" required maxlength="1000"></label><label>Expected result, actual result and counter-test<textarea name="observation" required maxlength="5000" rows="3"></textarea></label><label>Effect on this claim<select name="outcome"><option value="inconclusive">Still inconclusive</option><option value="supports">Supports the claim</option><option value="refutes">Refutes the claim</option></select></label><button class="button" type="submit">Bind observation to this snapshot</button></form></details></section>
      <section class="logic-result-card"><span class="eyebrow">ONE SPACE / FRAMEWORK PROJECTIONS</span><h3>What do STRIDE and OWASP see now?</h3><div class="logic-frameworks">${Object.entries(
        r.frameworks,
      )
        .map(
          ([name, c]) =>
            `<div><b>${esc(name)}</b><span>${c.ACTIVE} active · ${c.CONDITIONAL} conditional</span><small>${c.REJECTED} rejected · ${c.INACTIVE} inactive</small></div>`,
        )
        .join(
          "",
        )}</div><div class="logic-exports"><button class="button primary" data-logic="export-json">Export complete run (.json)</button><button class="button" data-logic="export-md">Export report (.md)</button></div><p class="logic-note">All comparisons, oracle graphs, distribution weights and observations stay inspectable. Candidate counts describe this modeled catalog.</p></section>`;
    $("#logic-results .logic-result-card").insertAdjacentHTML(
      "beforeend",
      oracleDetails,
    );
    $("#logic-results").setAttribute("aria-busy", "false");
    quantum.mount();
    dialog.dispatchEvent(
      new CustomEvent("logical-result", { detail: { status: state.state } }),
    );
  }
  function run() {
    quantum.invalidate();
    if (result) delete result.quantumComparison;
    persist();
    busy = true;
    $("#logic-results").setAttribute("aria-busy", "true");
    $("#logic-results").classList.add("recalculating");
    worker?.terminate();
    worker = new Worker(
      new URL("./logical-worker.mjs?v=1.11.0", import.meta.url),
      { type: "module" },
    );
    const id = ++serial;
    worker.onmessage = ({ data }) => {
      if (data.id !== serial) return;
      busy = false;
      $("#logic-results").classList.remove("recalculating");
      if (data.error) {
        $("#logic-results").innerHTML =
          `<div class="logic-result-card" role="alert"><h3>This run needs attention.</h3><p>${esc(data.error)}</p><button class="button" data-logic="reset-walk">Restore declared facts</button></div>`;
        $("#logic-results").setAttribute("aria-busy", "false");
        return;
      }
      result = data.result;
      config.focus = result.focus.id;
      renderResult();
    };
    worker.onerror = () => {
      busy = false;
      $("#logic-results").classList.remove("recalculating");
      $("#logic-results").setAttribute("aria-busy", "false");
      $("#logic-results").innerHTML =
        '<p class="logic-result-card" role="alert">The worker could not load. Reopen the lab to retry. Your saved investigation is intact.</p>';
    };
    worker.postMessage({ id, model, config });
  }
  function walk(key, value) {
    if (config.walk.length >= 100)
      return notify(
        "This investigation has reached 100 recorded changes. Export it, then restore the declared facts to start a new walk.",
      );
    config.walk.push({ key, value });
    const select = dialog.querySelector(`[data-logic-dimension="${key}"]`);
    if (select) select.value = value;
    run();
  }
  function addControl(label, test) {
    if (config.controls.length >= 32 || dims().length >= 128)
      return notify(
        "Export this investigation before starting another control chain.",
      );
    const key = `x_${crypto.randomUUID()}`;
    config.dimensions.push({ key, label, value: "?" });
    config.controls.push({ id: key, key, vectorId: config.focus, label, test });
    const y = $(".logic-scroll").scrollTop;
    shell();
    $(".logic-scroll").scrollTop = y;
    run();
  }
  function open() {
    model = getModel();
    config = normalizeResearch(getProject().research);
    result = null;
    if (!listVectors().length)
      return notify(
        "Enable a perspective before running dimensional inference.",
      );
    const f = getFinding(),
      options = listVectors();
    if (!options.some((v) => v.id === config.focus))
      config.focus = (
        options.find((v) => v.routeFamily === f && v.state !== "REJECTED") ||
        options.find((v) => v.state !== "REJECTED") ||
        options[0]
      ).id;
    savedScroll = window.scrollY;
    shell();
    dialog.showModal();
    run();
  }
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-open-logical]")) open();
  });
  dialog.addEventListener("close", () => {
    quantum.cancel();
    worker?.terminate();
    serial++;
    busy = false;
    window.scrollTo({ top: savedScroll, behavior: "instant" });
  });
  dialog.addEventListener("change", (e) => {
    const t = e.target;
    if (t.dataset.logicDimension) walk(t.dataset.logicDimension, t.value);
    if (t.id === "logic-mode") {
      config.mode = t.value;
      run();
    }
    if (t.id === "logic-iterations") {
      config.maxIterations = Math.max(0, Math.min(40, Number(t.value) || 0));
      t.value = config.maxIterations;
      run();
    }
    if (t.id === "logic-vector") {
      config.focus = t.value;
      $(".logic-path").textContent = focused().path;
      run();
    }
  });
  dialog.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.logicExclude) return walk(b.dataset.logicExclude, "ABSENT");
    if (b.dataset.logicAnswer)
      return walk(b.dataset.logicAnswer, b.dataset.value);
    if (b.dataset.logicFocus) {
      config.focus = b.dataset.logicFocus;
      $("#logic-vector").value = config.focus;
      $(".logic-path").textContent = focused().path;
      return run();
    }
    switch (b.dataset.logic) {
      case "close":
        dialog.close();
        break;
      case "reopen": {
        const keys = [
          ...new Set([...focused().requires, ...focused().requiresAny]),
        ];
        if (config.walk.length + keys.length > 100)
          return notify("Restore the declared facts to start another walk.");
        keys.forEach((key) => {
          config.walk.push({ key, value: "?" });
          const s = dialog.querySelector(`[data-logic-dimension="${key}"]`);
          if (s) s.value = "?";
        });
        run();
        break;
      }
      case "reset-walk":
        config.walk = [];
        shell();
        run();
        break;
      case "seed-control":
        addControl(
          `Protection holds: ${focused().control}`.slice(0, 240),
          focused().verify,
        );
        break;
      case "export-json":
        if (!busy && result)
          download(
            JSON.stringify(result, null, 2),
            "qcds-dimensional-run.json",
            "application/json",
          );
        break;
      case "export-md":
        if (!busy && result)
          download(
            dimensionMarkdown(result) +
              (result.quantumComparison
                ? "\n\n" + comparisonMarkdown(result.quantumComparison)
                : ""),
            "qcds-dimensional-report.md",
            "text/markdown",
          );
        break;
    }
  });
  dialog.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target,
      data = new FormData(form);
    if (form.id === "logic-dimension-form") {
      if (dims().length >= 128)
        return notify(
          "The browser reference supports 128 logical dimensions per run.",
        );
      config.dimensions.push({
        key: `x_${crypto.randomUUID()}`,
        label: data.get("label").trim(),
        value: data.get("value"),
      });
      shell();
      run();
    }
    if (form.id === "logic-control-form")
      addControl(data.get("label").trim(), data.get("test").trim());
    if (form.id === "logic-evidence-form" && !busy && result) {
      if (config.records.length >= 150)
        return notify(
          "Export this investigation before adding more observations.",
        );
      config.records.push({
        vectorId: result.focus.id,
        bindingKey: result.bindingKey,
        outcome: data.get("outcome"),
        source: data.get("source").trim(),
        observation: data.get("observation").trim(),
        createdAt: new Date().toISOString(),
      });
      run();
    }
  });
  return { open };
}
