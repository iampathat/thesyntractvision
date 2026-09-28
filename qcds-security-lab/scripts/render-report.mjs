// Generate the same PDF as the browser, for release QA or scripted exports.
import { createRequire } from "node:module";
import { writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { newProject, analyze } from "../engine.mjs";
import { createSecurityPdf } from "../report-pdf.mjs";
const require = createRequire(import.meta.url);
const { jsPDF } = require("../vendor/jspdf.umd.min.js");
const scenario = process.argv[2] || "coding";
const output = resolve(
  process.argv[3] || "output/pdf/QCDS-Security-Assessment.pdf",
);
const project = newProject(scenario);
const model = analyze(project.input, project.evidence, project.excludedLenses);
const { doc, summary } = createSecurityPdf(
  jsPDF,
  model,
  project,
  process.argv[4] ? { perspective: process.argv[4] } : {},
);
await mkdir(dirname(output), { recursive: true });
await writeFile(output, Buffer.from(doc.output("arraybuffer")));
console.log(JSON.stringify({ output, ...summary }));
