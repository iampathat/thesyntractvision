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


test("glass eagle is permanently visible on Home — not just the timed intro", () => {
  const home=read("consumer-ui.js");
  const style=read("consumer.css");
  const bird=read("glass-eagle.svg");
  const page=read("index.html");
  assert.match(home, /class="consumer-eagle"/);
  assert.match(home, /class="consumer-eagle-art"/);
  assert.match(home, /src="\.\/glass-eagle\.svg\?v=1\.14\.8"/);
  assert.doesNotMatch(home, /class="consumer-orbit"/);
  assert.match(style, /\.consumer-eagle-art\s*\{/);
  assert.match(style, /\.consumer-home \.consumer-hero/);
  assert.match(style, /flex-direction:column-reverse/);
  assert.match(page, /consumer\.css\?v=1\.14\.8/);
  assert.match(bird, /<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(bird, /<animateTransform/g);
  assert.match(bird, /values="-9 448 240;10 448 240;-9 448 240"/);
  assert.match(bird, /values="9 512 240;-10 512 240;9 512 240"/);
  assert.match(bird, /gw-neon-bolt-left/);
  assert.match(bird, /gw-neon-bolt-right/);
  assert.match(bird, /gw-wing-nodes/);
  assert.match(bird, /@keyframes gw-lightning/);
  assert.match(bird, /prefers-reduced-motion/);
});
