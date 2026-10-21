// UI regression guards for Project Glasswing intro visibility.
// © 2026 Patrik Sundblom. OpenAI / ChatGPT as R&D support.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const html = read("index.html");
const css = read("glasswing-inline.css");
const js = read("intro.js");

test("visible eagle is part of the main lab intro, not an external page", () => {
  assert.match(html, /id="security-intro"/);
  assert.match(html, /class="q-intro-stage glasswing-stage"/);
  assert.match(html, /class="gw-eagle"/);
  assert.match(html, /gw-eagle-glass/);
  assert.match(html, /gw-eagle-rim/);
  assert.match(html, /gw-eagle-node/);
  assert.match(html, /clip-path="url\(#gw-eagle-clip\)"/);
  assert.ok((html.match(/<circle cx=/g) || []).length >= 12, "Internal QCDS nodes must remain visible");
  assert.doesNotMatch(html, /glasswing\.html/);
});

test("glass eagle has high-contrast fill and renders before animation finishes", () => {
  assert.match(html, /stop-opacity="\.98"/);
  assert.match(html, /stroke-width="4"/);
  assert.match(css, /security-intro \.glasswing-intro-art/);
  assert.match(css, /opacity:\s*1/);
  assert.match(css, /gw-stage-visible \.5s/);
  assert.match(css, /@media \(max-width:650px\)/);
  assert.match(html, /gw-neon-bolt-left/);
  assert.match(html, /gw-neon-bolt-right/);
  assert.match(html, /gw-core-bolt/);
  assert.match(html, /gw-defense-halos/);
  assert.match(css, /gw-eagle-left-wing 1\.2s/);
  assert.match(css, /gw-bolt-flow 2\.2s/);
  assert.match(css, /gw-defense-hit 2\.2s/);
  assert.match(read("consumer-ui.js"), /Watch the glass eagle/);
});

test("reduced-motion users get a still eagle rather than an instant skip", () => {
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /gw-intro-out \.25s 3\.15s forwards!important/);
  assert.match(js, /reducedMotion\(\) \? 3400 : 5450/);
  assert.match(js, /\[data-replay-intro\]/);
  assert.match(js, /q-intro-skip/);
});
