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
const entry=read("enter.html"),legacyIntro=read("intro.js"),directIntro=read("intro-direct-v117.js");
const directApp=read("app-direct-v117.js"), directHome=read("consumer-ui-direct-v117.js");
const serviceWorker=read("sw.js");

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
  assert.match(intro,/reducedMotion\(\) \? 2900 : 6750/);
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
  assert.match(page,/data-release="1\.17\.0"/);
  assert.match(visual,/prefers-reduced-motion:reduce/);
});

test("the actual app is the first and only entrance, with optional replay",()=>{
  assert.match(entry, /<div id="app">/);
  assert.match(entry, /app-direct-v117\.js/);
  assert.match(entry, /intro-direct-v117\.js/);
  assert.match(entry, /id="direct-entrance"/);
  assert.match(entry, /security-intro:not\(\[data-open="true"\]\)\{display:none!important\}/);
  assert.match(page, /app-direct-v117\.js/);
  assert.match(page, /intro-direct-v117\.js/);
  assert.match(legacyIntro,/original\.remove\(\)/);
  assert.match(legacyIntro,/data-replay-intro/);
  assert.doesNotMatch(legacyIntro,/start\(current\)/);
  assert.equal(directIntro,legacyIntro);
  assert.match(directApp,/consumer-ui-direct-v117\.js/);
  assert.match(directHome,/class="gw-home-feature"/);
  assert.match(directHome,/glasswing-approved\.webp\?v=1\.16\.0/);
});

test("old launch page redirects without touching service workers or saved investigations",()=>{
  assert.match(gateway,/<meta http-equiv="refresh" content="0;url=\.\/enter\.html">/);
  assert.match(gateway,/location\.replace\("\.\/enter\.html"/);
  assert.match(gateway,/Open QCDS Security Lab/);
  assert.doesNotMatch(gateway,/getRegistrations|unregister\(\)|caches\.delete/);
  assert.doesNotMatch(gateway,/localStorage\.(clear|removeItem)/);
  assert.doesNotMatch(gateway,/indexedDB\.deleteDatabase/);
});

test("new service worker retries live navigation before offline cache fallback",()=>{
  assert.match(serviceWorker,/const VERSION = '1\.17\.0'/);
  assert.match(serviceWorker,/req\.mode === 'navigate'/);
  assert.match(serviceWorker,/fetch\(req, \{cache:'no-store'\}\)/);
  assert.match(serviceWorker,/cachedDocument \|\| Response\.error\(\)/);
  assert.match(serviceWorker,/cached \|\| fetch\(req\)/);
});
