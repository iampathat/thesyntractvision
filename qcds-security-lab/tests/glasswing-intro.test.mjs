// Project Glasswing Security Lab visual and navigation contracts.
// Theory and creation by Patrik Sundblom.
// with OpenAI / ChatGPT as research & development support.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = name => readFileSync(new URL("../" + name, import.meta.url), "utf8");
const html=read("index.html");
const intro=read("intro.js");
const css=read("glasswing-cinematic.css");
const consumer=read("consumer-ui.js");
const theme=read("consumer.css");
const app=read("app.js");
const eagle=read("glass-eagle.svg");

test("QCDS Security Lab intro plays cinematic eagle to upper-left logo and title",()=>{
  assert.match(html,/id="security-intro"/);
  assert.match(html,/glasswing-cinematic/);
  assert.match(html,/class="glasswing-flight-eagle"/);
  assert.match(html,/class="glasswing-poster-scene"/);
  assert.match(html,/class="glasswing-brand-corner"/);
  assert.match(html,/class="glasswing-title-reveal"/);
  assert.match(html,/<h1>QCDS<\/h1><p>Security Lab<\/p>/);
  assert.match(css,/@keyframes gw-cine-eagle-flight/);
  assert.match(css,/translate3d\(calc\(-41vw \+ 115px\)/);
  assert.match(css,/@keyframes gw-cine-title/);
  assert.match(intro,/reducedMotion\(\) \? 3600 : 6350/);
  assert.match(intro,/\[data-replay-intro\]/);
  assert.match(intro,/q-intro-skip/);
});

test("same angular eagle appears in persistent Home and navigation logo",()=>{
  assert.match(consumer,/class="glasswing-approved-banner"/);
  assert.match(consumer,/glasswing-approved\.webp\?v=1\.15\.0/);
  assert.match(consumer,/Watch the glass eagle/);
  assert.match(app,/class="glasswing-brand-mark"/);
  assert.match(app,/glasswing-approved\.webp\?v=1\.15\.0/);
  assert.match(theme,/\.brand\.glasswing-brand/);
  assert.match(theme,/\.glasswing-brand-mark/);
  assert.doesNotMatch(consumer,/class="consumer-orbit"/);
});

test("eagle is actual standalone SVG: sharp geometry, two flapping wings, luminous nodes",()=>{
  assert.match(eagle,/viewBox="0 0 960 500"/);
  assert.match(eagle,/gw-eagle-glass/);
  assert.match(eagle,/gw-eagle-rim/);
  assert.match(eagle,/gw-eagle-node/);
  assert.match(eagle,/gw-neon-bolt-left/);
  assert.match(eagle,/gw-neon-bolt-right/);
  assert.match(eagle,/gw-core-bolt/);
  assert.match(eagle,/gw-eagle-clip/);
  assert.ok((eagle.match(/<circle /g)||[]).length>=12);
  assert.ok((eagle.match(/<animateTransform /g)||[]).length>=2);
  assert.match(eagle,/@keyframes gw-arcs/);
  assert.match(eagle,/prefers-reduced-motion:reduce/);
});

test("intro has a still-frame option and no separate Glasswing page",()=>{
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(html,/Enter Security Lab/);
  assert.match(html,/Theory and creation by Patrik Sundblom/);
  assert.doesNotMatch(html,/glasswing\.html/);
});
