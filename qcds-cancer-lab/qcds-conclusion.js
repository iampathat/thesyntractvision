/* QCDS Oncology Lab — interpretation of actual computational outcomes.
   Pure result-to-text summary. Does not alter the inference engine.
   © 2026 Patrik Sundblom — R&D support OpenAI / ChatGPT.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.QCDSConclusion = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function percent(value) {
    if (!Number.isFinite(value)) return "unavailable";
    return (value * 100).toFixed(value >= 0.01 ? 2 : 4) + "%";
  }

  function summarize(result, dimensionNames) {
    if (!result || !Array.isArray(result.cycles) || result.cycles.length === 0) {
      throw new Error("QCDS conclusion requires a completed inference result.");
    }
    const input = result.inputMask;
    const logic = result.finalLogic;
    if (typeof input !== "string" || typeof logic !== "string" || input.length !== 8 || logic.length !== 8) {
      throw new Error("QCDS conclusion requires eight-bit input and derived masks.");
    }
    const dimensions = Array.isArray(dimensionNames) && dimensionNames.length === 8
      ? dimensionNames : Array.from({length: 8}, (_, i) => "D" + (i + 1));
    const last = result.cycles[result.cycles.length - 1];
    const parent = last.parent;
    const conditionOnly = !input.includes("?");
    const candidateCount = parent.candidateCount;
    const markedCount = parent.markedCanonical.length;
    const additional = [];
    const retained = [];
    const open = [];
    for (let i = 0; i < 8; i++) {
      if (logic[i] === "?") {
        open.push(dimensions[i]);
      } else if (input[i] === "?") {
        additional.push(dimensions[i] + " = " + logic[i]);
      } else {
        retained.push(dimensions[i] + " = " + logic[i]);
      }
    }
    const verified = Boolean(last.stability?.stable);
    const stability = verified
      ? "The internal numerical stability criteria were met."
      : "The internal numerical stability criteria have not been demonstrated.";
    const modelScope = "This is a conclusion about the current symbolic QCDS model, not a validated finding about a tumor, gene or therapy.";

    if (conditionOnly) {
      return {
        category: "condition_only",
        title: "One state remains — fixed by the input",
        lead: "The specified Condition already fixes state " + input +
          ". QCDS returns the same eight-bit state; it has not discovered a new state or distinguished competing hypotheses.",
        detail: "Output pattern: " + logic + ". All eight dimensions are fixed by the entered Condition; no alternatives were available for the model to resolve. " + stability,
        scope: modelScope
      };
    }

    const newDetail = additional.length
      ? "Newly fixed symbolic dimensions in the derived mask: " + additional.join("; ") + "."
      : "The derived mask did not fix any additional dimensions beyond the original Condition.";
    const remaining = open.length
      ? " Unresolved dimensions: " + open.join(", ") + "."
      : " No dimensions remain open in the shared derived mask.";
    const detail = "Shared model pattern: " + logic + ". " + newDetail + remaining + " " + stability;

    if (!result.finalResolved) {
      return {
        category: "unresolved",
        title: "No discriminating solution from the current oracles",
        lead: "QCDS evaluated the candidate space, but Parent Grover did not isolate a distinct solution. " +
          candidateCount + (candidateCount === 1 ? " compatible model state remains" : " compatible model states remain") +
          " after the Syntract bind; the current rules do not resolve the open dimensions.",
        detail,
        scope: modelScope
      };
    }

    if (markedCount !== 1) {
      return {
        category: "multiple",
        title: markedCount + " model candidates amplified — not a unique solution",
        lead: "QCDS amplified a set of " + markedCount +
          " candidates. The highest-ranked displayed state is " + result.finalState +
          " (" + percent(result.finalProbability) +
          " of the final simulated state distribution), but multiple alternatives remain.",
        detail,
        scope: modelScope
      };
    }

    return {
      category: "candidate",
      title: "QCDS identified one amplified model candidate",
      lead: "The leading candidate is symbolic state " + result.finalState +
        ", with " + percent(result.finalProbability) +
        " of the final Parent-Grover state distribution after " +
        result.cycles.length + (result.cycles.length === 1 ? " recursive pass." : " recursive passes.") +
        " This is a model-selected candidate, not a clinically confirmed solution.",
      detail,
      scope: modelScope
    };
  }

  return { summarize };
});