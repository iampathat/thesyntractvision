// Glasswing inference comparison UI contract — inference inputs and metrics unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const app=read('app-stage-v118.js');
const css=read('glasswing-unified-shell-v127.css');
const html=read('index.html');
const sw=read('sw.js');
const comparison=app.slice(app.indexOf('function glasswingView()'),app.indexOf('function view()'));
test('Comparison still computes the three original inference projections',()=>{
 assert.match(comparison,/result = runGlasswing\(project\(\)\)/);
 assert.match(comparison,/result\.tracks\.map\(/);
 assert.match(comparison,/m\.routeFamilies/);
 assert.match(comparison,/m\.generatedVectorsVisible/);
 assert.match(comparison,/m\.perspectiveComparisons/);
 assert.match(comparison,/m\.dimensionComparisons/);
 assert.match(comparison,/m\.recursiveBranches/);
 assert.match(comparison,/m\.evidenceBoundRoutes/);
 assert.match(comparison,/What this track actually does/);
 assert.match(comparison,/Example paths/);
});
test('Metrics are semantic, compact and visually differentiated',()=>{
 assert.match(comparison,/class="glasswing-track-explainer"/);
 assert.match(comparison,/class="glasswing-metrics"/);
 assert.match(comparison,/class="glasswing-metric /);
 assert.match(comparison,/position<2\?'glasswing-metric-primary'/);
 assert.match(css,/\.glasswing-metrics\s*\{[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/\.glasswing-metric dd\s*\{[\s\S]*?font-variant-numeric:tabular-nums/);
 assert.match(css,/\.glasswing-metric dt\s*\{[\s\S]*?font-size:11px/);
});
test('Only comparison route receives the editorial redesign',()=>{
 assert.match(app,/classList\.toggle\("comparison-mode", state\.route === "comparison"\)/);
 assert.match(css,/body\.glasswing-visual\.comparison-mode #app #view article\.glasswing-track/);
 assert.match(css,/@media\(max-width:860px\)/);
 assert.match(css,/@media\(max-width:560px\)/);
 assert.match(css,/background:#071d30!important/);
 assert.match(css,/padding-bottom:calc\(133px \+ env\(safe-area-inset-bottom,0px\)\)!important/);
 assert.match(css,/glasswing-details summary/);
 assert.match(css,/glasswing-context/);
});
test('Honest comparison caveat remains visible and explicit',()=>{
 assert.match(comparison,/Not a benchmark of independent AI models/);
 assert.match(comparison,/more candidate paths do not prove vulnerability/);
});
test('Published HTML and service worker force updated design bundle',()=>{
 assert.match(html,/data-release="1\.27\.3"/);
 assert.match(html,/glasswing-unified-shell-v127\.css\?v=1\.27\.3/);
 assert.match(html,/app-stage-v118\.js\?v=1\.27\.3/);
 assert.match(sw,/const VERSION = '1\.27\.3'/);
});
