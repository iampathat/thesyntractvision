// Generate the same PDF as the browser, for review or reproducible examples.
// Usage: node scripts/export-example.mjs portal /absolute/path/report.pdf
import {readFile,writeFile} from 'node:fs/promises';
import '../dist/vendor/jspdf.umd.min.js';
import {analyze} from '../dist/core/engine.mjs';
import {EXAMPLES,loadExample} from '../dist/guided-work.js';
import {createSecurityPdf} from '../dist/report-pdf.mjs';
const [key='portal', output] = process.argv.slice(2);
if (!EXAMPLES[key] || !output) throw Error('Usage: node scripts/export-example.mjs portal /absolute/path/report.pdf');
const fonts=Object.fromEntries(await Promise.all(['Regular','Bold'].map(async style=>[
  style.toLowerCase(),new Uint8Array(await readFile(new URL(`../dist/vendor/QCDSReportSans-${style}.ttf`,import.meta.url)))
])));
const project=loadExample(key),model=analyze(project.input,project.evidence,project.excludedLenses);
const {doc,summary}=createSecurityPdf(globalThis.jspdf.jsPDF,model,project,{fonts});
await writeFile(output,new Uint8Array(doc.output('arraybuffer')));
console.log(JSON.stringify({output,...summary},null,2));
