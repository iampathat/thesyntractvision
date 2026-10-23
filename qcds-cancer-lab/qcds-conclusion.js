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
    if (!Number.isFinite(value)) return "ej tillgängligt";
    return (value * 100).toFixed(value >= 0.01 ? 2 : 4) + "%";
  }

  function summarize(result, dimensionNames) {
    if (!result || !Array.isArray(result.cycles) || result.cycles.length === 0) {
      throw new Error("QCDS-slutsatsen kräver en färdig inferenskörning.");
    }
    const input = result.inputMask;
    const logic = result.finalLogic;
    if (typeof input !== "string" || typeof logic !== "string" || input.length !== 8 || logic.length !== 8) {
      throw new Error("QCDS-slutsatsen kräver åttabitarsindata och härledda masker.");
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
      ? "De interna numeriska stabilitetsvillkoren uppfylldes."
      : "De interna numeriska stabilitetsvillkoren har inte påvisats.";
    const modelScope = "Detta är en slutsats från den symboliska QCDS-modellen, inte ett validerat fynd om tumörer, gener eller behandlingar.";

    if (conditionOnly) {
      return {
        category: "condition_only",
        title: "Ett tillstånd återstår – redan bestämt av indata",
        lead: "Det angivna villkoret bestämmer redan tillståndet " + input +
          ". QCDS returnerar samma åttabitarstillstånd och har varken upptäckt ett nytt tillstånd eller skilt mellan konkurrerande hypoteser.",
        detail: "Utmatat mönster: " + logic + ". Alla åtta dimensioner bestäms av indatavillkoret. Det fanns inga alternativ för modellen att avgöra. " + stability,
        scope: modelScope
      };
    }

    const newDetail = additional.length
      ? "Nya bestämda symboliska dimensioner i den härledda masken: " + additional.join("; ") + "."
      : "Den härledda masken bestämde inga fler dimensioner än det ursprungliga villkoret.";
    const remaining = open.length
      ? " Oavgjorda dimensioner: " + open.join(", ") + "."
      : " Inga dimensioner återstår öppna i den gemensamt härledda masken.";
    const detail = "Gemensamt modellmönster: " + logic + ". " + newDetail + remaining + " " + stability;

    if (!result.finalResolved) {
      return {
        category: "unresolved",
        title: "De aktuella oraklen gav ingen särskiljande lösning",
        lead: "QCDS prövade kandidatrummet, men överordnad Grover kunde inte isolera en särskiljande lösning. " +
          candidateCount + (candidateCount === 1 ? " förenligt modelltillstånd återstår" : " förenliga modelltillstånd återstår") +
          " efter Syntract-sammanbindningen; de aktuella reglerna avgör inte de öppna dimensionerna.",
        detail,
        scope: modelScope
      };
    }

    if (markedCount !== 1) {
      return {
        category: "multiple",
        title: markedCount + " modellkandidater förstärktes – ingen unik lösning",
        lead: "QCDS förstärkte en uppsättning med " + markedCount +
          " kandidater. Det högst rankade visade tillståndet är " + result.finalState +
          " (" + percent(result.finalProbability) +
          " av den slutliga simulerade tillståndsfördelningen), men flera alternativ återstår.",
        detail,
        scope: modelScope
      };
    }

    return {
      category: "candidate",
      title: "QCDS identifierade en förstärkt modellkandidat",
      lead: "Den ledande kandidaten är det symboliska tillståndet " + result.finalState +
        ", med " + percent(result.finalProbability) +
        " av den slutliga fördelningen från överordnad Grover efter " +
        result.cycles.length + (result.cycles.length === 1 ? " rekursivt pass." : " rekursiva pass.") +
        " Detta är en modellvald kandidat, inte en kliniskt bekräftad lösning.",
      detail,
      scope: modelScope
    };
  }

  return { summarize };
});