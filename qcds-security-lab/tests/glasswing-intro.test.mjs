// Project Glasswing v1.16 — contracts for the REAL approved eagle artwork.
// Theory and creation by Patrik Sundblom.
// with OpenAI / ChatGPT as research & development support.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read = name => readFileSync(new URL("../" + name, import.meta.url),"utf8");
const image = name => readFileSync(new URL("../" + name, import.meta.url));
const page=read("index.html"),intro=read("intro.js"),visual=read("glasswing-experience.css");
const home=read("consumer-ui.js"),app=read("app.js"),gateway=read("open-glasswing-116.html");

test("the approved full-size WebP remains real and all three eagle assets exist",()=>{
  for(const [name,min] of [["glasswing-approved.webp",50000],["glasswing-flight.webp",25000],["glasswing-mark.webp",12000]]){
    const data=image(name);
    assert.ok(data.length>min,name+" unexpectedly small");
    assert.equal(data.subarray(0,4).toString(),"RIFF",name);
    assert.equal(data.subarray(8,12).toString(),"WEBP",name);
  }
});

test("Home integrates original approved artwork above real investigation controls",()=>{
  assert.match(home,/class="gw-home-feature"/);
  assert.match(home,/class="gw-home-poster"/);
  assert.match(home,/glasswing-approved\.webp\?v=1\.16\.0/);
  assert.match(home,/data-action="new"/);
  assert.match(home,/data-replay-intro/);
  assert.match(home,/PROJECT GLASSWING/);
  assert.match(home,/class="gw-home-fabric"/);
  assert.doesNotMatch(home,/class="consumer-orbit"/);
  assert.doesNotMatch(home,/class="glasswing-approved-card"/);
});

test("cinematic intro uses the transparent original eagle, not an entire poster inside the bird",()=>{
  assert.match(page,/id="security-intro"/);
  assert.match(page,/class="gw-intro-flight"/);
  assert.match(page,/gw-eagle-wing-left/);
  assert.match(page,/gw-eagle-wing-right/);
  assert.match(page,/gw-eagle-body/);
  assert.match(page,/glasswing-flight\.webp\?v=1\.16\.0/);
  assert.match(page,/glasswing-mark\.webp\?v=1\.16\.0/);
  assert.match(page,/class="gw-defense-pulses"/);
  assert.match(visual,/@keyframes gw-cinema-left-flap/);
  assert.match(visual,/@keyframes gw-cinema-right-flap/);
  assert.match(visual,/@keyframes gw-cinema-swoop/);
  assert.match(visual,/@keyframes gw-defense-spark/);
  assert.match(intro,/reducedMotion\(\) \? 4200 : 6750/);
  assert.match(intro,/\[data-replay-intro\]/);
  assert.match(intro,/q-intro-skip/);
});

test("real eagle appears in persistent navigation and the visual theme loads last",()=>{
  assert.match(app,/glasswing-brand-mark/);
  assert.match(app,/glasswing-mark\.webp\?v=1\.16\.0/);
  assert.match(visual,/\.brand\.glasswing-brand/);
  assert.match(visual,/\.gw-home-feature/);
  assert.match(visual,/body\.glasswing-visual/);
  assert.match(page,/glasswing-experience\.css\?v=1\.16\.0/);
  assert.match(page,/class="glasswing-visual"/);
  assert.match(page,/data-release="1\.16\.0"/);
  assert.match(visual,/prefers-reduced-motion:reduce/);
});

test("new entry point upgrades only app-owned caches and preserves user data",()=>{
  assert.match(gateway,/glasswing-approved\.webp\?v=1\.16\.0/);
  assert.match(gateway,/getRegistrations\(\)/);
  assert.match(gateway,/reg\.scope===root\.href/);
  assert.match(gateway,/x\.startsWith\('qcds-security-app-'\)/);
  assert.match(gateway,/glasswing-experience\.css\?v=1\.16\.0/);
  assert.doesNotMatch(gateway,/localStorage\.(clear|removeItem)/);
  assert.doesNotMatch(gateway,/indexedDB\.deleteDatabase/);
  assert.match(page,/Enter Security Lab/);
  assert.match(page,/Theory and creation by Patrik Sundblom/);
});
