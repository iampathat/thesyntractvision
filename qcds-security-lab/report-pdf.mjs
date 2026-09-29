// QCDS Security Lab. Author: Patrik Sundblom. Contributor: ChatGPT (OpenAI).
// Vector PDF composition; jsPDF is injected so the same renderer runs in Node and the browser.
import { registerReportFonts } from "./vendor/report-fonts.mjs";
import { runDimensionExperiment } from "./logical-space.mjs?v=1.14.0";

export const REPORT_VERSION = "1.0.0";
const P = {
  ink: "#102B38",
  navy: "#0B202B",
  teal: "#087E8B",
  cyan: "#19ABB3",
  lime: "#BCEB52",
  amber: "#B86E13",
  red: "#B7455C",
  purple: "#7458AF",
  muted: "#526974",
  line: "#D8E3E7",
  pale: "#F0F5F6",
  white: "#FFFFFF",
  gray: "#899CA5",
  green: "#247653",
};
export const SECTORS = [
  {
    id: "application",
    name: "Application & API",
    short: "App / API",
    targets: ["service"],
    color: P.teal,
    question: "Can lower-trust input change trusted processing?",
  },
  {
    id: "identity",
    name: "Identity & access",
    short: "Identity",
    targets: ["identity"],
    color: P.purple,
    question: "Does the correct identity retain the correct authority?",
  },
  {
    id: "data",
    name: "Data & privacy",
    short: "Data",
    targets: ["data"],
    color: P.cyan,
    question: "Can protected information cross its intended boundary?",
  },
  {
    id: "operations",
    name: "Operations & resilience",
    short: "Operations",
    targets: ["action", "availability", "audit", "recovery"],
    color: P.amber,
    question: "Can a harmful action execute, persist or escape detection?",
  },
  {
    id: "supply",
    name: "Supply chain",
    short: "Supply chain",
    targets: ["dependency"],
    color: P.green,
    question: "Can an external component change the trust of the system?",
  },
  {
    id: "ai",
    name: "AI & model context",
    short: "AI / models",
    targets: ["model"],
    color: P.red,
    question: "Can model context or behavior cross an authority boundary?",
  },
];
const color = (hex) => hex.match(/[\da-f]{2}/gi).map((x) => parseInt(x, 16));
const clean = (value) =>
  String(value ?? "")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/→|↗|⇒/g, " > ")
    .replace(/\u2026/g, "...")
    .replace(/★/g, "*")
    .replace(/∅/g, "ABSENT")
    .replace(/[^\x09\x0a\x0d\x20-\xff]/g, "");
const clip = (s, n = 160) =>
  clean(s).length > n
    ? clean(s)
        .slice(0, n - 3)
        .trim() + "..."
    : clean(s);
const number = (n) =>
  typeof n === "string" && /^\d+$/.test(n)
    ? BigInt(n).toLocaleString("en-US")
    : Number(n || 0).toLocaleString("en-US");
const valid = (v) => v.state === "ACTIVE" || v.state === "CONDITIONAL";
const stateOf = (v) => (v.frameworks?.length ? v.state : "EXCLUDED");
const rank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const routeOrder = (a, b) =>
  (rank[a.severity] ?? 4) - (rank[b.severity] ?? 4) ||
  a.id.localeCompare(b.id, undefined, { numeric: true });
const hash = (s) => {
  let n = 2166136261;
  for (const c of String(s)) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return (n >>> 0).toString(16).toUpperCase().padStart(8, "0");
};

export function buildReportData(model, project, { perspective = null } = {}) {
  const vectors = model.attackVectorSpace.vectors.filter(
    (v) => !perspective || v.frameworks.some((f) => f.lens === perspective),
  );
  const surviving = vectors.filter((v) => valid(v) && v.frameworks.length);
  const routeIds = new Set(surviving.map((v) => v.routeFamily));
  const routes = model.routes
    .filter((r) => !perspective || routeIds.has(r.id))
    .slice()
    .sort(routeOrder);
  const counts = {
    total: vectors.length,
    active: 0,
    conditional: 0,
    rejected: 0,
    excluded: 0,
  };
  for (const v of vectors) counts[stateOf(v).toLowerCase()]++;
  const sectors = SECTORS.map((s) => {
    const all = vectors.filter((v) => s.targets.includes(v.target));
    const active = all.filter((v) => stateOf(v) === "ACTIVE").length;
    const conditional = all.filter((v) => stateOf(v) === "CONDITIONAL").length;
    const examples = all
      .filter((v) => valid(v) && v.frameworks.length)
      .sort(routeOrder);
    return {
      ...s,
      total: all.length,
      active,
      conditional,
      retained: active + conditional,
      share: all.length ? (active + conditional) / all.length : 0,
      example: examples[0] || null,
    };
  });
  const frameworks = Object.entries(model.frameworkViews)
    .filter(([name]) => !perspective || name === perspective)
    .map(([name, view]) => ({
      name,
      active: view.active,
      applicable: view.applicable,
      total: view.vectorCount,
      activeCount: view.activeCount,
      conditionalCount: view.conditionalCount,
      categories: Object.entries(view.categories)
        .map(([label, c]) => ({
          label,
          active: c.active,
          conditional: c.conditional,
          total: c.active + c.conditional,
        }))
        .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label)),
    }));
  const groups = new Map();
  for (const v of vectors) {
    if (!groups.has(v.seedId))
      groups.set(v.seedId, {
        id: v.seedId,
        title: v.title,
        active: 0,
        conditional: 0,
        rejected: 0,
        excluded: 0,
        ids: [],
      });
    const g = groups.get(v.seedId);
    g[stateOf(v).toLowerCase()]++;
    g.ids.push(v.id);
  }
  const mechanisms = [...groups.values()].sort(
    (a, b) =>
      b.active + b.conditional - (a.active + a.conditional) ||
      a.id.localeCompare(b.id),
  );
  const records = routes.flatMap((r) =>
    (r.records || []).map((e) => ({
      ...e,
      routeId: r.id,
      routeTitle: r.shortTitle || r.title,
    })),
  );
  const reported = {
    supports: records.filter((r) => r.outcome === "supports").length,
    refutes: records.filter((r) => r.outcome === "refutes").length,
    inconclusive: records.filter((r) => r.outcome === "inconclusive").length,
  };
  return {
    model,
    project,
    perspective,
    vectors,
    surviving,
    routes,
    counts,
    sectors,
    frameworks,
    mechanisms,
    records,
    reported,
    reportId: `QSL-${hash(model.fingerprint)}${perspective ? "-" + hash(perspective).slice(0, 4) : ""}`,
  };
}

class Pages {
  constructor(jsPDF, data) {
    this.doc = new jsPDF({
      unit: "pt",
      format: "a4",
      compress: true,
      putOnlyUsedFonts: true,
    });
    registerReportFonts(this.doc);
    this.data = data;
    this.w = 595.28;
    this.h = 841.89;
    this.m = 44;
    this.width = this.w - 88;
    this.bottom = 785;
    this.y = 0;
    this.sections = [];
    this.dark = new Set();
    this.toc = [];
  }
  fill(c) {
    this.doc.setFillColor(...color(c));
  }
  stroke(c) {
    this.doc.setDrawColor(...color(c));
  }
  text(s, x, y, w = 507, size = 10, c = P.ink, bold = false, opts = {}) {
    this.doc.setFont("QCDSReport", bold ? "bold" : "normal");
    this.doc.setFontSize(size);
    this.doc.setTextColor(...color(c));
    const lines = Array.isArray(s)
      ? s.map(clean)
      : this.doc.splitTextToSize(clean(s), w);
    this.doc.text(lines, x, y, { lineHeightFactor: 1.38, ...opts });
    return y + Math.max(1, lines.length) * size * 1.38;
  }
  line(x1, y1, x2, y2, c = P.line, width = 1) {
    this.stroke(c);
    this.doc.setLineWidth(width);
    this.doc.line(x1, y1, x2, y2);
  }
  box(x, y, w, h, fill = P.pale, border = null, r = 9) {
    this.fill(fill);
    if (border) this.stroke(border);
    this.doc.roundedRect(x, y, w, h, r, r, border ? "FD" : "F");
  }
  pill(s, x, y, c = P.teal) {
    this.doc.setFontSize(8);
    const w = this.doc.getTextWidth(clean(s)) + 18;
    this.box(x, y, w, 20, c);
    this.text(s, x + 9, y + 13, w - 16, 8, P.white, true);
    return w;
  }
  page(kicker, title, deck = "", continued = false) {
    if (this.doc.getNumberOfPages() > 1 || this.y !== 0) this.doc.addPage();
    const num = this.doc.getNumberOfPages();
    title = title.replace(/(?: \/ continued)+/g, "");
    this.section = { kicker, title, deck };
    this.sections.push({ page: num, title });
    if (!continued) this.toc.push({ title, page: num });
    this.fill(P.white);
    this.doc.rect(0, 0, this.w, this.h, "F");
    this.fill(P.teal);
    this.doc.rect(0, 0, 8, this.h, "F");
    this.text("Q*  SECURITY LAB", 44, 31, 240, 8, P.ink, true);
    this.text(this.data.reportId, 551, 31, 180, 8, P.muted, false, {
      align: "right",
    });
    this.line(44, 42, 551, 42);
    this.text(kicker.toUpperCase(), 44, 65, 507, 8, P.teal, true);
    this.y = this.text(title, 44, 99, 507, 27, P.ink, true) + 7;
    if (deck) this.y = this.text(deck, 44, this.y, 507, 10, P.muted) + 12;
    return this.y;
  }
  ensure(h) {
    if (this.y + h > this.bottom)
      this.page(
        this.section.kicker,
        this.section.title + " / continued",
        "",
        true,
      );
  }
  paragraph(s, { size = 10, color = P.ink, bold = false, gap = 12 } = {}) {
    this.doc.setFont("QCDSReport", bold ? "bold" : "normal");
    this.doc.setFontSize(size);
    let lines = this.doc.splitTextToSize(clean(s), this.width);
    const lh = size * 1.38;
    while (lines.length) {
      this.ensure(lh + 5);
      let n = Math.max(1, Math.floor((this.bottom - this.y) / lh));
      const part = lines.splice(0, n);
      this.y = this.text(part, 44, this.y, 507, size, color, bold);
      if (lines.length)
        this.page(
          this.section.kicker,
          this.section.title + " / continued",
          "",
          true,
        );
    }
    this.y += gap;
  }
  heading(s) {
    this.ensure(45);
    this.y += 6;
    this.y = this.text(s, 44, this.y, 507, 15, P.ink, true) + 9;
  }
  stat(x, y, w, value, label, accent = P.teal, note = "") {
    this.box(x, y, w, 84, P.pale);
    this.fill(accent);
    this.doc.rect(x, y, 3, 84, "F");
    this.doc.setFont("QCDSReport", "bold");
    let size = 25;
    this.doc.setFontSize(size);
    while (size > 9 && this.doc.getTextWidth(clean(value)) > w - 24) {
      size--;
      this.doc.setFontSize(size);
    }
    this.text(value, x + 13, y + 31, w - 24, size, accent, true);
    this.text(label, x + 13, y + 55, w - 24, 9, P.ink, true);
    if (note) this.text(note, x + 13, y + 70, w - 24, 7.5, P.muted);
  }
  table(headers, rows, widths, { size = 8.5 } = {}) {
    const top = () => {
      this.doc.setFont("QCDSReport", "bold");
      this.doc.setFontSize(8);
      const height = Math.max(
        27,
        ...headers.map(
          (h, i) =>
            this.doc.splitTextToSize(clean(h), widths[i] - 16).length * 11.04 +
            14,
        ),
      );
      this.ensure(height + 15);
      this.fill(P.ink);
      this.doc.rect(44, this.y, 507, height, "F");
      let x = 44;
      headers.forEach((h, i) => {
        this.text(h, x + 8, this.y + 17, widths[i] - 16, 8, P.white, true);
        x += widths[i];
      });
      this.y += height;
    };
    top();
    rows.forEach((row, index) => {
      this.doc.setFont("QCDSReport", "normal");
      this.doc.setFontSize(size);
      let cells = row.map((v, i) => {
        this.doc.setFont("QCDSReport", i === 0 ? "bold" : "normal");
        return this.doc.splitTextToSize(clean(v), widths[i] - 16);
      });
      while (cells.some((c) => c.length)) {
        if (this.y + 28 > this.bottom) {
          this.page(
            this.section.kicker,
            this.section.title + " / continued",
            "",
            true,
          );
          top();
        }
        const lh = size * 1.35,
          maxLines = Math.max(1, Math.floor((this.bottom - this.y - 16) / lh));
        const take = Math.min(
            Math.max(...cells.map((c) => c.length)),
            maxLines,
          ),
          h = Math.max(27, take * lh + 16);
        this.fill(index % 2 ? P.white : P.pale);
        this.doc.rect(44, this.y, 507, h, "F");
        let x = 44;
        cells.forEach((c, i) => {
          this.text(
            c.splice(0, take),
            x + 8,
            this.y + 13,
            widths[i] - 16,
            size,
            i === 0 ? P.ink : P.muted,
            i === 0,
          );
          x += widths[i];
        });
        this.line(44, this.y + h, 551, this.y + h);
        this.y += h;
        if (cells.some((c) => c.length)) {
          this.page(
            this.section.kicker,
            this.section.title + " / continued",
            "",
            true,
          );
          top();
        }
      }
    });
    this.y += 18;
  }
  bars(
    rows,
    { x = 44, y = this.y, w = 507, rowH = 38, labelW = 195, max = null } = {},
  ) {
    max = max ?? Math.max(1, ...rows.map((r) => r.active + r.conditional));
    const bw = w - labelW - 38;
    rows.forEach((r, i) => {
      const yy = y + i * rowH;
      this.text(r.label, x, yy + 10, labelW - 12, 8.3, P.ink, true);
      this.box(x + labelW, yy, bw, 10, P.pale, null, 2);
      const aw = (r.active / max) * bw,
        cw = (r.conditional / max) * bw;
      if (aw) {
        this.fill(P.teal);
        this.doc.rect(x + labelW, yy, aw, 10, "F");
      }
      if (cw) {
        this.fill(P.amber);
        this.doc.rect(x + labelW + aw, yy, cw, 10, "F");
      }
      this.text(
        number(r.active + r.conditional),
        x + w,
        yy + 9,
        32,
        9,
        P.ink,
        true,
        { align: "right" },
      );
    });
    return y + rows.length * rowH;
  }
  footer() {
    const total = this.doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      this.doc.setPage(i);
      const dark = this.dark.has(i);
      this.line(44, 804, 551, 804, dark ? "#36515D" : P.line);
      this.text(
        "Patrik Sundblom  |  QCDS Security Lab  |  " +
          (this.data.project.example ? "Worked example" : "Assessment"),
        44,
        822,
        420,
        7,
        dark ? "#B7CBD2" : P.muted,
      );
      this.text(
        `${String(i).padStart(2, "0")} / ${String(total).padStart(2, "0")}`,
        551,
        822,
        50,
        7,
        dark ? P.white : P.ink,
        true,
        { align: "right" },
      );
    }
  }
}

function icon(p, id, x, y, c, size = 28) {
  const d = p.doc;
  p.stroke(c);
  d.setLineWidth(1.5);
  if (id === "identity") {
    d.circle(x + size / 2, y + 8, 6, "S");
    d.roundedRect(x + 4, y + 18, size - 8, 12, 5, 5, "S");
  } else if (id === "data") {
    d.ellipse(x + size / 2, y + 5, size / 2, 5, "S");
    d.line(x, y + 5, x, y + 25);
    d.line(x + size, y + 5, x + size, y + 25);
    d.ellipse(x + size / 2, y + 25, size / 2, 5, "S");
    d.ellipse(x + size / 2, y + 15, size / 2, 5, "S");
  } else if (id === "application") {
    d.roundedRect(x, y, size, 26, 3, 3, "S");
    p.line(x, y + 7, x + size, y + 7, c);
    p.text("< / >", x + 4, y + 20, size - 8, 9, c, true);
  } else if (id === "supply") {
    d.rect(x, y, 12, 12, "S");
    d.rect(x + 16, y + 16, 12, 12, "S");
    p.line(x + 12, y + 6, x + 22, y + 6, c);
    p.line(x + 22, y + 6, x + 22, y + 16, c);
  } else {
    const points = [
      [0, 14],
      [14, 0],
      [28, 14],
      [14, 28],
      [14, 14],
    ];
    for (const [a, b] of [
      [0, 4],
      [1, 4],
      [2, 4],
      [3, 4],
    ])
      p.line(
        x + points[a][0],
        y + points[a][1],
        x + points[b][0],
        y + points[b][1],
        c,
      );
    points.forEach(([xx, yy]) => {
      p.fill(c);
      d.circle(x + xx, y + yy, 3, "F");
    });
  }
}

function radar(p, sectors, cx, cy, r) {
  const d = p.doc,
    angle = (i) => -Math.PI / 2 + (i * Math.PI) / 3,
    pt = (i, v) => [
      cx + Math.cos(angle(i)) * r * v,
      cy + Math.sin(angle(i)) * r * v,
    ];
  for (const level of [0.25, 0.5, 0.75, 1]) {
    const points = sectors.map((s, i) => pt(i, level));
    points.forEach((a, i) => p.line(...a, ...points[(i + 1) % 6], P.line, 0.7));
  }
  sectors.forEach((s, i) => {
    const a = pt(i, 1);
    p.line(cx, cy, ...a, P.line, 0.7);
    const label = pt(i, 1.25);
    p.text(s.short, ...label, 88, 8.5, P.ink, true, {
      align:
        Math.abs(label[0] - cx) < 5
          ? "center"
          : label[0] < cx
            ? "right"
            : "left",
    });
  });
  const vertices = sectors.map((s, i) => pt(i, s.share));
  p.fill("#D7EEF0");
  p.stroke(P.teal);
  d.setLineWidth(2);
  d.lines(
    vertices.map((a, i) => {
      const b = vertices[(i + 1) % 6];
      return [b[0] - a[0], b[1] - a[1]];
    }),
    vertices[0][0],
    vertices[0][1],
    [1, 1],
    "FD",
    true,
  );
  vertices.forEach((a, i) => {
    p.fill(sectors[i].color);
    d.circle(a[0], a[1], 3.5, "F");
  });
  for (const level of [0.25, 0.5, 0.75, 1]) {
    p.text(`${level * 100}%`, cx + 4, cy - r * level - 4, 40, 6.5, P.muted);
  }
}

function cover(p) {
  const { model, project, perspective, counts, reportId } = p.data,
    d = p.doc;
  p.dark.add(1);
  p.fill(P.navy);
  d.rect(0, 0, p.w, p.h, "F");
  p.text("Q*", 44, 78, 100, 44, P.lime, true);
  p.text("SECURITY LAB", 112, 61, 300, 13, P.white, true);
  p.text("DIMENSIONAL THREAT INTELLIGENCE", 112, 79, 350, 8, P.cyan);
  // A vector-only logical space: axes and linked nodes, not a decorative raster.
  const cx = 480,
    cy = 216;
  for (let j = 0; j < 3; j++) {
    p.stroke(["#244552", "#285865", "#39636B"][j]);
    d.setLineWidth(0.8);
    d.ellipse(cx, cy, 116 - j * 18, 54 + j * 22, "S");
  }
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    const x = cx + Math.cos(a) * 106,
      y = cy + Math.sin(a) * 106;
    p.line(cx, cy, x, y, "#234A55", 0.5);
    p.fill(i % 3 === 0 ? P.lime : P.cyan);
    d.circle(x, y, i % 3 === 0 ? 3 : 1.7, "F");
  }
  p.text("SECURITY", 44, 174, 310, 40, P.white, true);
  p.text("ASSESSMENT", 44, 222, 440, 40, P.white, true);
  p.text(
    perspective
      ? `${perspective} perspective report`
      : "From system assumptions to testable attack paths.",
    44,
    261,
    440,
    12,
    "#B7CBD2",
  );
  p.line(44, 291, 551, 291, "#34505B");
  let y =
    p.text(
      model.input.name || "Untitled system",
      44,
      337,
      500,
      25,
      P.white,
      true,
    ) + 18;
  y =
    p.text(clip(model.input.description, 330), 44, y, 474, 11, "#B7CBD2") + 20;
  p.pill(
    project.example
      ? "WORKED EXAMPLE / SYNTHETIC EVIDENCE"
      : "SYSTEM ASSESSMENT",
    44,
    Math.min(y, 470),
    P.teal,
  );
  const metrics = [
    [counts.total, "modeled vectors"],
    [counts.active + counts.conditional, "retain a basis"],
    [p.data.routes.length, "route families"],
  ];
  metrics.forEach(([v, label], i) => {
    const x = 44 + i * 171;
    p.box(x, 529, 158, 88, "#173440");
    p.text(number(v), x + 14, 565, 135, 29, i === 1 ? P.lime : P.white, true);
    p.text(label, x + 14, 592, 135, 9, "#B7CBD2");
  });
  p.text("THE QUESTION", 44, 653, 470, 8, P.cyan, true);
  p.text(
    model.input.attackerGoal ||
      "What unwanted outcome must this system prevent?",
    44,
    678,
    488,
    14,
    P.white,
    true,
  );
  p.text(
    `${reportId}  |  ${new Date(model.generatedAt).toISOString().slice(0, 10)}  |  Engine ${model.version}`,
    44,
    758,
    507,
    8,
    "#B7CBD2",
  );
  p.text(
    "Author: Patrik Sundblom  |  Contributor: ChatGPT (OpenAI)",
    44,
    776,
    507,
    8,
    "#B7CBD2",
  );
  p.y = 1;
}

function summary(p) {
  const a = p.data,
    { counts, routes, model, project } = a;
  p.page(
    "01 / Decision brief",
    "What deserves attention?",
    project.example
      ? "A worked example. Its observations are synthetic demonstrations, not a scan of a real deployment."
      : "A review of the declared system, modeled attack paths and supplied observations.",
  );
  const sy = p.y;
  [
    [counts.active, "Active candidates", P.teal],
    [counts.conditional, "Conditional candidates", P.amber],
    [a.records.length, "Current observations", P.purple],
  ].forEach(([v, l, c], i) => p.stat(44 + i * 174, sy, 159, number(v), l, c));
  p.y = sy + 111;
  p.heading("The practical reading");
  p.paragraph(
    `${number(counts.active + counts.conditional)} of ${number(counts.total)} modeled vector instances retain a basis under this snapshot. They converge into ${routes.length} route families. ${model.searchSpace.unknownMaskDimensions} input facts remain unresolved. Candidate counts describe the model; observations determine what has actually been tested.`,
  );
  p.heading("Priorities for review");
  p.table(
    ["Route / review priority", "Modeled paths", "Evidence state"],
    routes.length
      ? routes.map((r) => [
          `${r.id}  ${r.shortTitle || r.title}\n${r.severity} modeled consequence`,
          number(a.surviving.filter((v) => v.routeFamily === r.id).length),
          r.conditional ? "CONDITIONAL" : r.status,
        ])
      : [
          [
            "No retained route",
            "0",
            "No security conclusion follows from an empty model.",
          ],
        ],
    [272, 83, 152],
  );
  p.paragraph(
    "Priority follows modeled consequence severity, then route ID. It is not a measured likelihood, CVSS score or security grade.",
    { size: 8.5, color: P.muted },
  );
  p.heading("Read this report in order");
  p.paragraph(
    "Scope and assumptions > sector radar > framework breakdowns > illustrated attack paths > controls and counter-tests > QCDS trace > evidence and actions > complete mechanism register.",
    { size: 9.5 },
  );
}

function scope(p) {
  const { model, project, perspective } = p.data;
  p.page(
    "02 / Scope & assumptions",
    "The system under review",
    "A precise scope keeps conclusions attached to the system that was actually described.",
  );
  p.heading("System brief");
  p.paragraph(model.input.description || "No system description was provided.");
  p.heading("Unwanted outcome");
  p.paragraph(model.input.attackerGoal || "No attacker goal was specified.");
  p.table(
    ["Protected asset", "Scope"],
    (model.input.assets?.length
      ? model.input.assets
      : ["No assets declared"]
    ).map((x) => [x, "Declared in this project"]),
    [325, 182],
  );
  const k = model.searchSpace.unknownMaskDimensions;
  p.heading("How large is the current mask?");
  p.paragraph(
    `${model.searchSpace.knownMaskDimensions} facts are fixed at 1 or 0. ${k} are unresolved (?). Only those unresolved coordinates branch: 2^${k} = ${number(model.searchSpace.maskedLogicalStates)} possible input combinations. This is separate from the ${number(p.data.counts.total)} attack-vector instances considered in this report.`,
  );
  p.paragraph(
    `Report view: ${perspective || "All enabled security perspectives"}. Excluded perspectives: ${model.excludedLenses.join(", ") || "none"}.`,
    { size: 9.5 },
  );
  p.paragraph(
    project.example
      ? "Evidence label: this project is a worked example. Synthetic observations are retained as examples and explicitly marked throughout."
      : "Evidence label: observations are user-reported. Their sources and scope are available in the evidence section.",
    { size: 9.5, color: P.muted },
  );
  p.page(
    "02 / Condition formation",
    "The 1 / 0 / ? register",
    "1 = declared true. 0 = declared false. ? = unresolved. A declared value is not independent proof.",
  );
  p.table(
    ["Fact", "Value", "Declared statement"],
    model.conditions.map((c) => [
      c.id,
      c.value === true ? "1 / YES" : c.value === false ? "0 / NO" : "? / OPEN",
      c.label,
    ]),
    [48, 76, 383],
    { size: 9 },
  );
  if (model.clarifications.length) {
    p.heading("Next facts to resolve");
    model.clarifications.forEach((c) =>
      p.paragraph(
        `${c.id} - ${c.question} Affects: ${c.routeIds?.join(", ") || "system context"}.`,
        { size: 9.5 },
      ),
    );
  }
}

function landscape(p) {
  const { sectors, counts } = p.data;
  p.page(
    "03 / Security sectors",
    "The modeled threat landscape",
    "Six target sectors. One underlying vector catalog. Every vector is assigned to one sector by its modeled target.",
  );
  const top = p.y;
  radar(p, sectors, 289, top + 135, 99);
  p.y = top + 301;
  p.paragraph(
    "RADAR: retained candidates / all modeled candidates in each sector, on a 0-100% scale. A higher value means more modeled paths retain a basis. It does not measure the chance of compromise or control maturity.",
    { size: 8.5, color: P.muted, gap: 15 },
  );
  p.table(
    ["Security sector", "Active", "Conditional", "Modeled", "Retained %"],
    sectors.map((s) => [
      s.name,
      number(s.active),
      number(s.conditional),
      number(s.total),
      s.total ? `${Math.round(s.share * 100)}%` : "n/a",
    ]),
    [235, 60, 75, 67, 70],
  );
  p.paragraph(
    `Reconciliation: ${number(counts.total)} total = ${number(counts.active)} active + ${number(counts.conditional)} conditional + ${number(counts.rejected)} rejected + ${number(counts.excluded)} excluded from the enabled views.`,
    { size: 8.5, color: P.muted },
  );
}

function frameworks(p) {
  const fs = p.data.frameworks;
  p.page(
    "04 / Framework projections",
    "Different questions. Same evidence.",
    "Framework counts overlap: a vector may appear in several frameworks and categories. Never add these totals as if they were unique vulnerabilities.",
  );
  p.y =
    p.bars(
      fs.map((f) => ({
        label: f.name,
        active: f.activeCount,
        conditional: f.conditionalCount,
      })),
      { y: p.y + 6, rowH: 45, labelW: 182 },
    ) + 25;
  p.paragraph(
    "TEAL = active candidates    AMBER = conditional candidates. A disabled or non-applicable framework has no visible candidates in this report.",
    { size: 8.5, color: P.muted },
  );
  p.table(
    ["Perspective", "Active", "Conditional", "Enabled / applicable"],
    fs.map((f) => [
      f.name,
      number(f.activeCount),
      number(f.conditionalCount),
      `${f.active ? "Yes" : "No"} / ${f.applicable ? "Yes" : "No"}`,
    ]),
    [224, 70, 75, 138],
  );
  const desired = p.data.perspective
    ? fs
    : fs.filter((f) => ["STRIDE", "OWASP / AppSec"].includes(f.name));
  desired.forEach((f) => {
    p.page(
      "04 / " + f.name,
      f.name === "STRIDE"
        ? "STRIDE: six threat categories"
        : f.name + " breakdown",
      "Counts of surviving vector instances mapped to each category. Multi-category mappings are intentionally retained.",
    );
    if (!f.categories.length) {
      p.paragraph(
        "No surviving vector is mapped to this framework under the current scope.",
      );
      return;
    }
    const max = Math.max(1, ...f.categories.map((c) => c.total));
    for (let start = 0; start < f.categories.length; start += 12) {
      if (start)
        p.page(
          "04 / " + f.name,
          f.name + " / continued",
          "The same category scale is retained on every page.",
          true,
        );
      const part = f.categories.slice(start, start + 12);
      p.y = p.bars(part, { y: p.y + 4, rowH: 43, labelW: 274, max }) + 14;
    }
    p.paragraph(
      "TEAL = active  |  AMBER = conditional. Category labels follow the mappings in this engine snapshot. A mapping is an analytical perspective, not evidence of a successful exploit.",
      { size: 8.5, color: P.muted },
    );
  });
}

function vectorPath(p, vector, x, y, w, accent) {
  const labels = [
    ["ENTRY", vector.variantLabel],
    ["MECHANISM", vector.mechanism],
    ["TARGET", vector.targetLabel],
    ["CONSEQUENCE", vector.consequence],
  ];
  const gap = 14,
    nw = (w - gap * 3) / 4,
    heights = labels.map(([, s]) => {
      p.doc.setFontSize(8);
      return p.doc.splitTextToSize(clean(s), nw - 14).length * 11 + 30;
    }),
    h = Math.max(77, ...heights);
  labels.forEach(([k, s], i) => {
    const xx = x + i * (nw + gap);
    if (i < 3) {
      p.line(xx + nw, y + h / 2, xx + nw + gap, y + h / 2, accent, 1.5);
      p.line(
        xx + nw + gap - 4,
        y + h / 2 - 3,
        xx + nw + gap,
        y + h / 2,
        accent,
        1.5,
      );
      p.line(
        xx + nw + gap - 4,
        y + h / 2 + 3,
        xx + nw + gap,
        y + h / 2,
        accent,
        1.5,
      );
    }
    p.box(xx, y, nw, h, P.white, P.line, 5);
    p.text(k, xx + 7, y + 15, nw - 14, 6.5, accent, true);
    p.text(s, xx + 7, y + 31, nw - 14, 8, P.ink);
  });
  return y + h;
}

function atlas(p) {
  p.data.sectors.forEach((s, i) => {
    if (i % 2 === 0)
      p.page(
        "05 / Attack-path atlas",
        i === 0
          ? "See the boundary being challenged"
          : "Attack-path atlas / " + (i / 2 + 1),
        "One representative surviving vector per sector, selected by modeled consequence severity. Paths are hypotheses until tested.",
      );
    const v = s.example,
      top = p.y;
    p.ensure(274);
    icon(p, s.id, 44, p.y, s.color);
    p.text(s.name, 87, p.y + 14, 450, 17, P.ink, true);
    p.text(
      `${s.retained} retained / ${s.total} modeled`,
      87,
      p.y + 33,
      450,
      8.5,
      s.color,
      true,
    );
    p.y += 55;
    p.y = p.text(s.question, 44, p.y, 507, 10, P.muted) + 8;
    if (!v) {
      p.box(44, p.y, 507, 72, P.pale);
      p.text(
        "No surviving vector in this sector",
        58,
        p.y + 25,
        470,
        12,
        P.ink,
        true,
      );
      p.text(
        "Review the declared target, conditions and enabled perspectives before drawing a conclusion.",
        58,
        p.y + 45,
        470,
        9,
        P.muted,
      );
      p.y += 102;
      return;
    }
    p.text(`${v.id} / ${v.state} / ${v.title}`, 44, p.y, 507, 9, s.color, true);
    p.y += 18;
    p.y = vectorPath(p, v, 44, p.y, 507, s.color) + 19;
    p.y = p.text("CONTROL  " + v.control, 44, p.y, 507, 9, P.ink) + 9;
    p.y = p.text("COUNTER-TEST  " + v.verify, 44, p.y, 507, 9, P.muted) + 22;
    if (i % 2 === 0) {
      p.line(44, p.y, 551, p.y);
      p.y += 26;
    }
  });
}

function routeCards(p) {
  if (!p.data.routes.length) {
    p.page("06 / Investigation register", "No retained route");
    p.paragraph(
      "No route currently retains a basis. Inspect the scope and unknowns before interpreting this as assurance.",
    );
    return;
  }
  for (const r of p.data.routes) {
    p.page(
      "06 / Investigation register / " + r.id,
      r.shortTitle || r.title,
      r.path,
    );
    p.pill(r.id, 44, p.y, P.ink);
    p.text(
      `${r.severity} MODELED CONSEQUENCE`,
      100,
      p.y + 14,
      440,
      8.5,
      P.red,
      true,
    );
    p.y += 43;
    const sy = p.y;
    p.stat(
      44,
      sy,
      246,
      number(p.data.surviving.filter((v) => v.routeFamily === r.id).length),
      "Surviving vector instances",
    );
    p.stat(
      305,
      sy,
      246,
      (r.records || []).length,
      "Current observations",
      P.purple,
    );
    p.y = sy + 108;
    for (const [label, text] of [
      ["Basis", r.why],
      ["Control", r.control],
      ["Challenge", r.bypass],
      ["Counter-test", r.verify],
    ]) {
      p.ensure(40);
      p.paragraph(label.toUpperCase(), {
        size: 7.5,
        color: P.teal,
        bold: true,
        gap: 3,
      });
      p.paragraph(text, { size: 9.5, gap: 10 });
    }
    p.paragraph(
      `Evidence state: ${r.conditional ? "CONDITIONAL" : r.status}. Perspectives: ${r.hitLenses.join(", ")}.`,
      { size: 8.5, color: P.muted },
    );
  }
}

function inference(p) {
  const m = p.data.model;
  p.page(
    "07 / QCDS inference",
    "Follow what changes. Keep the scope.",
    "Condition Formation > Conditional Evolution > Recursive Inference > Truth-Alignment Verification.",
  );
  const cards = [
    [
      "01",
      "Condition Formation",
      `${m.searchSpace.knownMaskDimensions} fixed facts; ${m.searchSpace.unknownMaskDimensions} unresolved. Only ? coordinates branch.`,
    ],
    [
      "02",
      "Conditional Evolution",
      `${m.searchSpace.generatedAttackVectors} vector instances tested against the declared conditions and enabled frameworks.`,
    ],
    [
      "03",
      "Recursive Inference",
      `${m.recursive.length} route clusters carry control, bypass and counter-test questions forward.`,
    ],
    [
      "04",
      "Truth-Alignment Verification",
      `${p.data.records.length} observations attached to current route snapshots. Old-scope records remain separate.`,
    ],
  ];
  cards.forEach(([n, t, s]) => {
    p.ensure(100);
    p.box(44, p.y, 507, 85, P.pale);
    p.text(n, 60, p.y + 34, 50, 23, P.teal, true);
    p.text(t, 112, p.y + 25, 420, 12, P.ink, true);
    p.text(s, 112, p.y + 46, 420, 9, P.muted);
    p.y += 101;
  });
  p.paragraph(
    "The base comparison below makes a fact unresolved (?). It keeps that coordinate present. The dimensional workbench can additionally remove a coordinate entirely (ABSENT), which deactivates predicates that require it.",
    { size: 9, color: P.muted },
  );
  p.page(
    "07 / Sensitivity",
    "Which assumptions carry the result?",
    "Independent comparisons set one declared true fact to ?. The input snapshot remains saved.",
  );
  p.table(
    ["Fact changed to ?", "Vectors becoming conditional", "Vectors removed"],
    m.dimensions.length
      ? m.dimensions.map((d) => [
          `${d.id} / ${d.label || m.conditions.find((c) => c.key === d.key)?.label}`,
          number(d.vectorImpact?.activeToConditional?.length),
          number(d.vectorImpact?.removed?.length),
        ])
      : [["No true facts available", "0", "0"]],
    [317, 100, 90],
  );
  if (p.data.project.research) {
    const run = runDimensionExperiment(m, p.data.project.research),
      a = run.final.amplification;
    p.page(
      "07 / Dimensional experiment",
      "The saved logical-space experiment",
      "Actual saved comparison assumptions, including excluded coordinates and recursive controls.",
    );
    const y = p.y;
    p.stat(44, y, 159, run.final.present, "Present coordinates");
    p.stat(218, y, 159, number(run.final.totalStates), "Mask combinations");
    p.stat(392, y, 159, number(run.final.markedStates), "Oracle-marked states");
    p.y = y + 111;
    p.paragraph(
      `Selected vector: ${run.focus.id}. Predicate state: ${run.final.focusState.state}. ${run.lanes.length} independent lanes; ${run.rotations.filter((r) => r.agrees).length}/${run.rotations.length} canonical rotations agree.`,
    );
    const plotY = p.y + 30,
      plotH = 115,
      plotW = 450;
    p.line(66, plotY, 66, plotY + plotH);
    p.line(66, plotY + plotH, 516, plotY + plotH);
    for (let i = 1; i < a.trace.length; i++) {
      const prev = a.trace[i - 1],
        now = a.trace[i];
      p.line(
        66 + ((i - 1) / Math.max(1, a.trace.length - 1)) * plotW,
        plotY + (1 - prev.probability) * plotH,
        66 + (i / Math.max(1, a.trace.length - 1)) * plotW,
        plotY + (1 - now.probability) * plotH,
        P.teal,
        1.8,
      );
    }
    p.text("100%", 44, plotY, 30, 7, P.muted);
    p.text("0%", 44, plotY + plotH, 30, 7, P.muted);
    p.text("Iteration 0", 66, plotY + plotH + 16, 140, 8, P.muted);
    p.text(
      "Iteration " + a.iterationBudget,
      516,
      plotY + plotH + 16,
      140,
      8,
      P.muted,
      false,
      { align: "right" },
    );
    p.y = plotY + plotH + 44;
    p.paragraph(
      `Ideal Grover subspace mass: ${(a.probability * 100).toFixed(2)}% at iteration ${a.iterations}; finite budget ${a.iterationBudget}. Exact symbolic counts and a classical evaluation of the ideal formula. This is search probability, not vulnerability probability.`,
      { size: 9 },
    );
    p.table(
      ["Coordinate", "Value"],
      run.final.dimensions.map((d) => [d.label, d.value]),
      [407, 100],
    );
    if (run.recursion.length) {
      p.heading("Recursive control predicates");
      run.recursion.forEach((c) =>
        p.paragraph(
          `Layer ${c.depth}: ${c.label} = ${c.value}. Counter-test: ${c.test}`,
          { size: 9 },
        ),
      );
    }
    p.paragraph(
      `Snapshot binding: ${run.binding.status}. ${run.binding.records.length} current observations; ${run.binding.archivedRecords} archived from other assumptions.`,
      { size: 9 },
    );
  }
}

function evidence(p) {
  const { records, model, project, routes } = p.data;
  p.page(
    "08 / Evidence & ownership",
    "From a candidate to a decision",
    project.example
      ? "Synthetic worked observations are visibly labeled. They demonstrate the workflow and do not certify a real system."
      : "User-reported observations are separated from hypotheses and from observations attached to earlier scopes.",
  );
  if (!records.length)
    p.paragraph(
      "No observation is bound to a retained route in this snapshot. The findings remain hypotheses or conditional routes.",
    );
  for (const e of records) {
    p.ensure(100);
    p.pill(
      `${e.routeId} / ${e.outcome.toUpperCase()}`,
      44,
      p.y,
      e.outcome === "supports"
        ? P.red
        : e.outcome === "refutes"
          ? P.teal
          : P.amber,
    );
    p.y += 39;
    p.paragraph(e.source, { bold: true, size: 11, gap: 8 });
    p.paragraph(e.observation, { size: 10 });
    p.paragraph(
      `Recorded: ${e.createdAt}. ${project.example ? "SYNTHETIC WORKED EXAMPLE." : "User-reported source."}`,
      { size: 8.5, color: P.muted },
    );
    p.line(44, p.y, 551, p.y);
    p.y += 23;
  }
  p.heading("Action register");
  p.table(
    ["Route", "Owner / status", "Next action"],
    routes.map((r) => {
      const saved = project.actions?.[r.id],
        a = saved?.fingerprint === model.fingerprint ? saved : null;
      return [
        r.id,
        a ? `${a.owner || "Unassigned"}\n${a.status}` : "Unassigned\nOpen",
        a?.note || r.verify,
      ];
    }),
    [46, 124, 337],
  );
  p.paragraph(
    `Archived route observations outside this snapshot: ${model.archivedEvidence?.length || 0}. Evidence from a different scope is not silently reused. Retain the project JSON to inspect its provenance and timestamps.`,
    { size: 9, color: P.muted },
  );
}

function register(p) {
  p.page(
    "09 / Complete mechanism register",
    "The catalog behind the charts",
    "Every modeled instance in this report is counted once below, grouped by mechanism. A mechanism may span multiple route variants, targets and framework mappings.",
  );
  p.table(
    ["Mechanism / identifier", "Active", "Cond.", "Rejected", "Excluded"],
    p.data.mechanisms.map((g) => [
      `${g.title}\n${g.id}`,
      number(g.active),
      number(g.conditional),
      number(g.rejected),
      number(g.excluded),
    ]),
    [277, 57, 57, 59, 57],
    { size: 8 },
  );
  const c = p.data.counts;
  p.paragraph(
    `TOTAL: ${number(c.total)} modeled instances. ${number(c.active)} active, ${number(c.conditional)} conditional, ${number(c.rejected)} rejected, ${number(c.excluded)} excluded. The report's sector table and this register reconcile to the same total.`,
    { bold: true, size: 9.5 },
  );
  p.page(
    "10 / Method & provenance",
    "Keep the reasoning inspectable",
    "A report snapshot, a reproducible analysis and a separate evidence trail.",
  );
  p.heading("What the charts count");
  p.paragraph(
    "The sector radar shows retained / modeled candidates. Stacked bars show active and conditional vector counts. Framework categories overlap. Severity is a modeled consequence priority, not measured exploit likelihood. None of these chart values is a security certification.",
    { size: 10 },
  );
  p.heading("Reproduce this assessment");
  p.paragraph(
    "Export the project JSON from the same run. It preserves the input snapshot, complete vector-instance register, framework mappings, evidence provenance and action history. Reimport it into the Security Lab to recalculate the analysis. The PDF is the human-readable companion.",
    { size: 10 },
  );
  p.heading("Snapshot and implementation");
  p.paragraph(
    `Engine ${p.data.model.version}. PDF renderer ${REPORT_VERSION}. Snapshot ${p.data.reportId}. Generated from the saved system description, declared facts, enabled frameworks, attack-vector catalog and scoped observations. The report does not perform a target scan or independently verify the supplied evidence.`,
    { size: 9 },
  );
  p.paragraph(
    "Sector assignment uses the modeled target: service -> Application & API; identity -> Identity & access; data -> Data & privacy; action / availability / audit / recovery -> Operations & resilience; dependency -> Supply chain; model -> AI & model context. Radar values are retained / modeled candidates in each sector.",
    { size: 9 },
  );
  p.paragraph(
    "QCDS by Patrik Sundblom. Assistant contributor: ChatGPT (OpenAI). Security Lab commercial license: https://iampathat.github.io/thesyntractvision/qcds-security-lab/LICENSE.md. Earlier QCDS materials retain their original license grants.",
    { size: 8.5, color: P.muted },
  );
}

export function createSecurityPdf(jsPDF, model, project, options = {}) {
  const data = buildReportData(model, project, options),
    p = new Pages(jsPDF, data);
  p.doc.setProperties({
    title: `${model.input.name} - QCDS Security Assessment`,
    subject: options.perspective || "Threat model, controls and evidence",
    author: "Patrik Sundblom",
    creator: "QCDS Security Lab - contributor ChatGPT (OpenAI)",
    keywords: "QCDS, STRIDE, OWASP, security, threat model",
  });
  cover(p);
  summary(p);
  scope(p);
  landscape(p);
  frameworks(p);
  atlas(p);
  routeCards(p);
  inference(p);
  evidence(p);
  register(p);
  p.footer();
  return {
    doc: p.doc,
    summary: {
      reportId: data.reportId,
      pages: p.doc.getNumberOfPages(),
      counts: data.counts,
      sectorTotal: data.sectors.reduce((n, s) => n + s.total, 0),
      mechanismTotal: data.mechanisms.reduce((n, g) => n + g.ids.length, 0),
    },
  };
}
