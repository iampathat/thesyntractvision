/* Clinical reference UI: accessible, text-first explainers.
 * No biomedical claim or source text is fed into the QCDS numerical engine.
 * Copyright (c) 2026 Patrik Sundblom. All Rights Reserved.
 */
(function(root) {
  "use strict";
  const K = root.CancerLabKnowledge;
  const Q = root.QCDSCore;
  if (!K || !Q) throw new Error("Kunskapsbanken eller QCDS-kärnan kunde inte laddas");
  const $ = id => document.getElementById(id);
  const element = (tag, className, value) => {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (value !== undefined) e.textContent = String(value);
    return e;
  };
  let lastFocus = null;
  let currentTab = "oracles";

  function maskDescription(mask) {
    if (!/^[01?]{8}$/.test(mask)) return "Ogiltig mask. Ange exakt åtta tecken med värdena 0 / 1 / ?.";
    const bindings = [];
    for (let i = 0; i < mask.length; i++) {
      if (mask[i] !== "?") bindings.push("P" + (i + 1) + " = " + mask[i] + " (oroterade indata: " + Q.DIMENSIONS[i] + ")");
    }
    return bindings.length ? bindings.join("; ") : "Alla åtta orakelpositioner är öppna. Ingen position är låst.";
  }

  function addField(host, heading, value) {
    if (!value) return;
    const section = element("section", "clinical-field");
    section.append(element("h4", "", heading), element("p", "", value));
    host.appendChild(section);
  }

  function open(kind, index, override) {
    const bank = kind === "dimension" ? K.dimensions : kind === "oracle" ? K.oracles : K.methods;
    const item = bank[index];
    if (!item) return;
    lastFocus = document.activeElement;
    const content = $("clinicalBody");
    content.replaceChildren();
    content.append(element("div", "reference-type", kind === "oracle" ? "ORAKEL · FORSKNINGSHYPOTES" : kind === "dimension" ? "DIMENSION · EGENSKAPSDEFINITION" : "QCDS · TEKNISK DEFINITION"));
    content.append(element("h2", "", item.name));
    content.append(element("p", "reference-intro", item.summary));
    if (kind === "oracle") {
      const mask = override?.mask || root.CancerLabOracleState?.()[index] || item.mask || "????????";
      addField(content, "Aktuell QCDS-mask", mask);
      addField(content, "Formella positionsvillkor", maskDescription(mask));
      addField(content, "Viktig begränsning i kopplingen", "Detta är fasta positionsvillkor. Sexton rotationer flyttar de semantiska dimensionerna genom positionerna. Namnet på en biologisk signalväg innebär inte att samma genkoppling bevaras i varje rotation. Den biologiska texten nedan är en förklaring, inte något som kodas i masken.");
    }
    if (kind === "dimension") {
      addField(content, "Modellindex / tillstånd", "D" + (index + 1) + " · " + (override?.value ?? "?") + " · " + (override?.value === "?" || override?.value === undefined ? "Oavgjord bit" : "Fast symbolisk bit, inte ett provresultat"));
      addField(content, "Vetenskapligt område", item.type);
    }
    if (item.category) addField(content, "Klassificering", item.category);
    addField(content, kind === "method" ? "Implementering / modelltolkning" : "Molekylärt och biologiskt sammanhang", item.biology);
    addField(content, "Relevanta gener / mekanismer (exempel)", item.genes);
    addField(content, "Data och mätmetoder som krävs för klinisk tolkning", item.evidence);
    addField(content, "Tolkningens begränsningar", item.limitations || item.caution);
    if (item.question) addField(content, "Fråga innan oraklet kan prövas vetenskapligt", item.question);

    if (kind === "oracle") {
      const box = element("div", "reference-alert");
      box.append(element("strong", "", "Inte en validerad klinisk regel"), element("p", "", "Namnet och den äldre masken är två separata illustrationer. Att ändra masken påverkar simuleringen, inte någon bevisad orsaksmekanism eller biomarkörtolkning. Inga patientdata har laddats."));
      content.appendChild(box);
    }
    if (item.sourceKeys && item.sourceKeys.length) {
      const section = element("section", "clinical-sources");
      section.append(element("h4", "", "Vetenskapliga källor"));
      const ul = element("ul");
      for (const key of item.sourceKeys) {
        const src = K.sources[key];
        if (!src) continue;
        const li = element("li");
        const a = element("a", "", src.label);
        a.href = src.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        li.appendChild(a);
        ul.appendChild(li);
      }
      section.appendChild(ul);
      content.appendChild(section);
    } else {
      addField(content, "Källstatus", "Algoritmförklaringen utgår från den aktuella QCDS-implementeringen i Oncology Lab. Ingen extern klinisk validering påstås.");
    }
    $("clinicalOverlay").hidden = false;
    document.body.classList.add("clinical-open");
    $("clinicalClose").focus();
  }

  function close() {
    $("clinicalOverlay").hidden = true;
    document.body.classList.remove("clinical-open");
    if (lastFocus && lastFocus.isConnected) lastFocus.focus();
  }

  function renderDimensionReference(mask) {
    const target = $("dimensionReference");
    if (!target) return;
    target.replaceChildren();
    K.dimensions.forEach((d, index) => {
      const row = element("div", "dimension-reference-item");
      const title = element("div", "dimension-reference-title");
      title.append(element("strong", "", "D" + (index + 1) + " · " + d.name), element("small", "", d.type));
      const state = element("code", "dimension-current-value", mask[index]);
      state.title = "Aktuellt symboliskt tillstånd, inte ett kliniskt resultat";
      const b = element("button", "explain-button", "?");
      b.type = "button";
      b.setAttribute("aria-label", "Förklara " + d.name);
      b.title = "Förklara domain meaning and model limitations";
      b.addEventListener("click", () => open("dimension", index, {value: mask[index]}));
      row.append(title, state, b);
      target.appendChild(row);
    });
  }

  function renderLibrary() {
    const bank = K[currentTab === "oracles" ? "oracles" : currentTab === "dimensions" ? "dimensions" : "methods"];
    const query = ($("knowledgeSearch")?.value || "").trim().toLowerCase();
    const list = $("knowledgeItems");
    if (!list) return;
    list.replaceChildren();
    const kind = currentTab === "oracles" ? "oracle" : currentTab === "dimensions" ? "dimension" : "method";
    bank.forEach((item, index) => {
      const haystack = [item.name, item.summary, item.genes, item.biology, item.category, item.type].join(" ").toLowerCase();
      if (query && !haystack.includes(query)) return;
      const button = element("button", "knowledge-item");
      button.type = "button";
      const main = element("span");
      main.append(element("strong", "", item.name), element("small", "", item.summary));
      const rhs = element("span", "knowledge-arrow", "Öppna förklaring →");
      button.append(main, rhs);
      button.addEventListener("click", () => open(kind, index));
      list.appendChild(button);
    });
    if (!list.childElementCount) list.append(element("p", "knowledge-empty", "Inga träffar. Prova en signalväg, gen eller ett modellbegrepp."));
  }

  function initialize() {
    const overlay = $("clinicalOverlay");
    if (!overlay) return;
    $("clinicalClose").addEventListener("click", close);
    overlay.addEventListener("click", event => { if (event.target === overlay) close(); });
    document.addEventListener("keydown", event => {
      if (overlay.hidden) return;
      if (event.key === "Escape") { event.preventDefault(); close(); return; }
      if (event.key === "Tab") {
        const focusable = [...overlay.querySelectorAll('button:not([disabled]),a[href],input:not([disabled])')];
        if (!focusable.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
    document.querySelectorAll("[data-explain]").forEach(btn => btn.addEventListener("click", () => {
      const i = K.methods.findIndex(m => m.id === btn.dataset.explain);
      if (i >= 0) open("method", i);
    }));
    document.querySelectorAll("[data-ref-tab]").forEach(btn => btn.addEventListener("click", () => {
      currentTab = btn.dataset.refTab;
      document.querySelectorAll("[data-ref-tab]").forEach(tab => {
        const active = tab === btn;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-selected", active ? "true" : "false");
      });
      renderLibrary();
    }));
    $("knowledgeSearch")?.addEventListener("input", renderLibrary);
    renderLibrary();
  }
  root.CancerLabClinicalUI = Object.freeze({initialize,open,renderDimensionReference,maskDescription});
})(globalThis);
