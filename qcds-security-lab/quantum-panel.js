// QCDS by Patrik Sundblom. Contributor: ChatGPT (OpenAI). LICENSE.md.
import {
  compileOracle,
  openQasm,
  comparisonMarkdown,
  DEFAULT_NOISE,
} from "./quantum-compare.mjs?v=1.0.0";

const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const percent = (value) => `${(value * 100).toFixed(2)}%`;
const count = (value) => Number(value).toLocaleString("en-US");

function chart(result) {
  const rows = [
    ["Classical reference", result.reference.expectedProbability, "reference"],
    ["Ideal circuit", result.ideal.probability, "ideal"],
    [
      "Noisy circuit",
      result.noisy.status === "completed" ? result.noisy.probability : null,
      "noisy",
    ],
  ];
  return `<div class="quantum-bars" role="img" aria-label="Probability of measuring an assignment accepted by this oracle: ${rows.map(([name, p]) => `${name} ${p === null ? "not run" : percent(p)}`).join("; ")}">${rows.map(([name, p, kind]) => `<div class="quantum-bar ${kind}"><div><span>${name}</span><b>${p === null ? "Not run" : percent(p)}</b></div><div class="quantum-track"><span style="width:${p === null ? 0 : Math.max(0, Math.min(100, p * 100))}%"></span></div></div>`).join("")}</div>`;
}

function traceChart(result) {
  const points = (key) =>
    result.trace
      .map(
        (row) =>
          `${38 + (390 * row.iteration) / Math.max(1, result.circuit.iterations)},${139 - row[key] * 112}`,
      )
      .join(" ");
  return `<svg class="quantum-trace" viewBox="0 0 460 176" role="img" aria-label="Selected-subspace probability over ${result.circuit.iterations} Grover iterations"><path d="M38 27V139H428M38 83H428M38 27H428" fill="none" stroke="#304952"/><text x="2" y="31">100%</text><text x="14" y="87">50%</text><text x="20" y="143">0%</text><text x="38" y="164">Iteration 0</text><text x="365" y="164">${result.circuit.iterations}</text><polyline points="${points("ideal")}" fill="none" stroke="#9ae1ff" stroke-width="4"/><polyline points="${points("reference")}" fill="none" stroke="#bcff69" stroke-width="2" stroke-dasharray="5 5"/>${result.noisy.status === "completed" ? `<polyline points="${points("noisy")}" fill="none" stroke="#ffbd69" stroke-width="3"/>` : ""}${result.trace.map((t) => `<circle cx="${38 + (390 * t.iteration) / Math.max(1, result.circuit.iterations)}" cy="${139 - t.ideal * 112}" r="3" fill="#9ae1ff"/>${t.noisy === null ? "" : `<circle cx="${38 + (390 * t.iteration) / Math.max(1, result.circuit.iterations)}" cy="${139 - t.noisy * 112}" r="3" fill="#ffbd69"/>`}`).join("")}</svg><p class="quantum-legend"><span>● Reference</span><span>● Ideal circuit</span><span>● Noisy circuit</span></p>`;
}

function resultsMarkup(r) {
  const c = r.circuit,
    noisy = r.noisy.status === "completed";
  const sampled = (name, s) =>
    `<tr><th scope="row">${name}</th><td>${count(s.hits)} / ${count(s.shots)}</td><td>${percent(s.successRate)}</td><td>${s.interval95.map(percent).join("–")}</td></tr>`;
  const top = [...r.distribution]
    .sort((a, b) => (b.noisy ?? b.ideal) - (a.noisy ?? a.ideal))
    .slice(0, 16);
  const delta = noisy
    ? (r.noisy.probability - r.ideal.probability) * 100
    : null;
  return `<div class="quantum-result-heading"><span class="eyebrow">COMPLETED · LOCAL SIMULATION</span><h4>Same question. Measurable difference.</h4><p>${c.qubits} qubits · ${c.iterations} Grover iteration${c.iterations === 1 ? "" : "s"} · ${count(c.metrics.twoQubitGates)} two-qubit gates</p></div>${chart(r)}<p class="quantum-verdict"><b>Ideal circuit agrees with the reference.</b> ${noisy ? `With the selected noise, success mass changes by <strong>${delta >= 0 ? "+" : "−"}${Math.abs(delta).toFixed(2)} percentage points</strong>.` : esc(r.noisy.reason)}</p><p class="logic-note">These percentages describe measuring an assignment accepted by your oracle. They do not measure the chance of a real attack. The classical reference predicts ideal Grover behaviour from exact counts; it is not a classical search success benchmark.</p>
    <details><summary>What happened at each iteration?</summary>${traceChart(r)}<p class="logic-note">${esc(c.iterationSelection)}. More iterations can reduce success. The reference and ideal curves should overlap.</p></details>
    <details><summary>Simulated measurements · ${count(r.noise.shots)} samples</summary><p class="logic-note">Bars show calculated probability. Samples mimic repeated measurements; the seed makes them reproducible. The intervals describe sampling uncertainty only.</p><div class="quantum-table-wrap" tabindex="0" role="region" aria-label="Simulated measurement counts"><table><thead><tr><th>Execution</th><th>Accepted / shots</th><th>Sample rate</th><th>95% interval</th></tr></thead><tbody>${sampled("Ideal", r.ideal.sample)}${noisy ? sampled("Noisy", r.noisy.sample) : ""}</tbody></table></div></details>
    <details><summary>Inspect scope, circuit & verification</summary><p><b>${c.fullMarkedStates} / ${c.fullMaskStates}</b> full-mask assignments satisfy this predicate before amplification. The reduced register contains ${c.markedCount} accepted outcomes in ${r.distribution.length} states.</p><p><b>${c.metrics.gates} gates · depth ${c.metrics.depth} · ${c.metrics.auxiliaryQubits} auxiliary qubits.</b> H / X / RZ / CX on an all-to-all logical circuit. Hardware routing is not included.</p><p class="logic-note">${esc(c.reduction)} ${c.factoredDimensions.length} unresolved coordinates factor out; ${c.fixedDimensions.length} are fixed. No interacting coordinate is silently dropped.</p><ol class="quantum-coordinates">${c.keys.map((key, i) => `<li><code>q[${i}]</code> ${esc(c.labels[i])}</li>`).join("")}</ol><p class="logic-note">One-qubit depolarizing λ: ${percent(r.noise.single)}. Two-qubit λ: ${percent(r.noise.two)}. Readout flip rate: ${percent(r.noise.readout)}. These are chosen model parameters, not device calibration or measured gate infidelity. T1/T2, idle noise and crosstalk are not modeled.</p><p class="logic-note">Largest ideal/reference discrepancy in this run: ${r.ideal.maxReferenceError.toExponential(2)}. The simulator is independently checked against Qiskit 2.1.2 and Aer 0.17.1 on five published fixtures. This individual run is local JavaScript, not an Aer or QPU job.</p><a class="text-link" href="./QUANTUM_EXECUTION.md" target="_blank" rel="noopener">Read the model and reproduce the checks ↗</a></details>
    <details><summary>Inspect measurement outcomes</summary><p class="logic-note">${r.distribution.length > 16 ? "Showing the 16 most likely outcomes. Every outcome is in the JSON export." : "Every reduced-register outcome is shown."} The rightmost bit is q[0]. ✓ means accepted by the oracle.</p><div class="quantum-table-wrap" tabindex="0" role="region" aria-label="Measurement outcome probabilities"><table><thead><tr><th>Bits</th><th>Oracle</th><th>Ideal</th><th>Noisy</th></tr></thead><tbody>${top.map((x) => `<tr><th scope="row"><code>${x.bits}</code></th><td>${x.marked ? "✓" : "—"}</td><td>${percent(x.ideal)}</td><td>${x.noisy === null ? "Not run" : percent(x.noisy)}</td></tr>`).join("")}</tbody></table></div></details>
    <div class="quantum-exports"><button class="button" type="button" data-quantum-export="json">Save comparison JSON</button><button class="button" type="button" data-quantum-export="qasm">Save circuit QASM</button><button class="text-button" type="button" data-quantum-export="md">Save readable report</button></div><p class="logic-note">Export includes all gates, probabilities, noise settings, samples and this exact scope. Changing an assumption clears this comparison.</p>`;
}

export function createQuantumPanel({ dialog, getRun, onComparison }) {
  let worker,
    serial = 0,
    current = null,
    expanded = false;
  const options = {
    iterations: "",
    single: DEFAULT_NOISE.single * 100,
    two: DEFAULT_NOISE.two * 100,
    readout: DEFAULT_NOISE.readout * 100,
    shots: 4096,
    seed: 173,
  };
  const panel = () => dialog.querySelector("#quantum-panel");
  function cancel() {
    worker?.terminate();
    worker = null;
    serial++;
  }
  function invalidate() {
    expanded = panel()?.open ?? expanded;
    cancel();
    current = null;
    const el = panel();
    if (el) {
      el.querySelector("fieldset")?.setAttribute("disabled", "");
      el.querySelector("[data-quantum-status]").textContent =
        "Assumptions changed. Preparing the new scope…";
      el.querySelector("[data-quantum-results]").replaceChildren();
    }
  }
  function markup(run) {
    let c, error;
    try {
      c = compileOracle(run);
    } catch (e) {
      error = e.message;
    }
    const scope = error
      ? `<p role="note">${esc(error)}</p>`
      : c.qubits
        ? `<p class="quantum-scope"><b>${c.qubits} interacting qubits</b> represent this predicate. ${c.factoredDimensions.length ? `${c.factoredDimensions.length} other unresolved coordinates factor out.` : "Fixed facts stay fixed."} ${c.qubits > 6 ? "Only the ideal circuit fits this browser; the noisy run will be explicitly marked as not run." : ""}</p>`
        : `<p>The current facts make this predicate constant. There are no unresolved oracle coordinates to amplify.</p><button class="button" type="button" data-logic="reopen">Reopen this path’s assumptions</button>`;
    return `<details id="quantum-panel" class="quantum-panel" ${expanded ? "open" : ""}><summary>Compare classical, ideal & noisy execution</summary><div class="quantum-body"><p>Keep the question and assumptions identical. Run the actual circuit, then see what the selected noise changes.</p>${scope}<form id="quantum-form"><fieldset ${!c?.qubits ? "disabled" : ""}><details class="quantum-settings"><summary>Adjust iterations, noise & samples</summary><div class="quantum-fields"><label>Grover iterations<input name="iterations" type="number" min="0" max="40" step="1" value="${options.iterations}" placeholder="Auto · first ideal peak"></label><label>One-qubit depolarizing λ (%)<input name="single" type="number" min="0" max="100" step="any" value="${options.single}" required></label><label>Two-qubit depolarizing λ (%)<input name="two" type="number" min="0" max="100" step="any" value="${options.two}" required></label><label>Readout flip rate (%)<input name="readout" type="number" min="0" max="100" step="any" value="${options.readout}" required></label><label>Simulated shots<input name="shots" type="number" min="128" max="16384" step="1" value="${options.shots}" required></label><label>Sample seed<input name="seed" type="number" min="0" max="4294967295" step="1" value="${options.seed}" required></label></div><p class="logic-note">Empty iterations uses the first ideal peak within your iteration budget. The same count is used for all three executions. Set all noise to 0 to check the ideal limit.</p></details><button class="button primary quantum-run" type="submit">Run the execution comparison <span aria-hidden="true">→</span></button></fieldset></form><p class="logic-note">CPU simulation · up to 8 ideal / 6 noisy qubits, with a gate budget · no QPU connection</p><p class="quantum-status" data-quantum-status role="status" aria-live="polite"></p><div data-quantum-results></div></div></details>`;
  }
  function mount() {
    const el = panel();
    if (!el) return;
    el.addEventListener("toggle", () => {
      expanded = el.open;
    });
    const form = el.querySelector("form"),
      status = el.querySelector("[data-quantum-status]"),
      output = el.querySelector("[data-quantum-results]");
    form.addEventListener("change", (e) => {
      if (!(e.target.name in options)) return;
      options[e.target.name] = e.target.value;
      if (current) {
        current = null;
        onComparison(null);
        output.replaceChildren();
        status.textContent =
          "Settings changed. Run the comparison to calculate the new result.";
      }
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const run = getRun();
      if (!run) return;
      const data = new FormData(form);
      for (const key of Object.keys(options)) options[key] = data.get(key);
      cancel();
      current = null;
      onComparison(null);
      output.replaceChildren();
      status.textContent = "Executing the same oracle gate by gate…";
      output.setAttribute("aria-busy", "true");
      form.querySelector("fieldset").disabled = true;
      const id = ++serial,
        bindingKey = run.bindingKey;
      const finish = () => {
        form.querySelector("fieldset").disabled = false;
        output.setAttribute("aria-busy", "false");
        worker?.terminate();
        worker = null;
      };
      try {
        worker = new Worker(
          new URL("./quantum-worker.mjs?v=1.0.0", import.meta.url),
          { type: "module" },
        );
        worker.onmessage = ({ data }) => {
          if (
            id !== serial ||
            data.id !== id ||
            getRun()?.bindingKey !== bindingKey
          )
            return;
          finish();
          if (data.error) {
            status.textContent = data.error;
            return;
          }
          current = data.result;
          onComparison(current);
          status.textContent =
            "Comparison complete. The results below belong to this exact scope.";
          output.innerHTML = resultsMarkup(current);
        };
        worker.onerror = () => {
          if (id !== serial) return;
          finish();
          status.textContent =
            "The circuit worker could not run. Reload the lab and try again; your saved system is intact.";
        };
        worker.postMessage({
          id,
          run,
          options: {
            ...(options.iterations === ""
              ? {}
              : { iterations: Number(options.iterations) }),
            noise: {
              single: Number(options.single) / 100,
              two: Number(options.two) / 100,
              readout: Number(options.readout) / 100,
            },
            shots: Number(options.shots),
            seed: Number(options.seed),
          },
        });
      } catch (error) {
        finish();
        status.textContent = error.message;
      }
    });
    el.addEventListener("click", (e) => {
      const kind = e.target.closest("[data-quantum-export]")?.dataset
        .quantumExport;
      if (!kind || !current) return;
      const contents =
        kind === "json"
          ? JSON.stringify(current, null, 2)
          : kind === "qasm"
            ? openQasm(current.circuit, current.circuit.gates)
            : comparisonMarkdown(current);
      const url = URL.createObjectURL(
        new Blob([contents], {
          type: kind === "json" ? "application/json" : "text/plain",
        }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `qcds-execution-comparison.${kind}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    });
  }
  return { markup, mount, invalidate, cancel };
}
