// Project Glasswing v1.25.3 — cinematic wingbeats and a single real landing.
// Theory and creation by Patrik Sundblom — OpenAI / ChatGPT R&D support.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const read=n=>readFileSync(new URL("../"+n,import.meta.url),"utf8");
const index=read("index.html"),entry=read("enter.html");
const landing=read("glasswing-v125.html"),oldWelcome=read("glasswing-start.html");
const js=read("glasswing-screen-v125.js"),css=read("glasswing-screen-v125.css");
const consumer=read("consumer-ui-stage-v118.js"),app=read("app-stage-v118.js");
const build=read("scripts/build-web.mjs"),worker=read("sw.js");
const video=readFileSync(new URL("../glasswing-flight-v125.mp4",import.meta.url));

test("every existing entry and fresh URL serves the identical complete landing",()=>{
  for(const p of ["enter.html","glasswing-start.html","glasswing-v120.html","glasswing-v123.html","glasswing-v124.html","glasswing-v125.html"]) {
    assert.equal(read(p),index,p);
  }
  assert.match(index,/id="gw-landing"/);
  assert.match(index,/id="gw-film"/);
  assert.match(index,/data-enter-lab/);
  assert.match(index,/data-watch-intro/);
  assert.match(index,/class="gw-landing-art"/);
  assert.match(index,/data-entry="landing"/);
  assert.match(index,/data-release="1\.25\.3"/);
});
test("landing preserves ALL of the originally approved eagle instead of cropping it",()=>{
  assert.match(index,/glasswing-approved\.webp\?v=1\.25\.0/);
  assert.match(css,/\.gw-landing-art img \{[^}]*object-fit:contain/);
  assert.match(css,/aspect-ratio:1672\/941/);
  assert.match(css,/@media\(max-width:720px\)/);
  assert.match(css,/\.gw-landing-actions\{width:100%;display:grid;grid-template-columns:1fr/);
});
test("actual user-reference cinematic video contains moving frames and is shipped",()=>{
  assert.match(index,/id="gw-film-video"/);
  assert.match(index,/glasswing-flight-v125\.mp4/);
  assert.ok(video.length>1_000_000);
  assert.equal(video.subarray(4,8).toString(),"ftyp");
  assert.ok(video.includes(Buffer.from("moov")));
  assert.match(build,/'\.mp4'/);
  assert.match(worker,/const VERSION = '1\.25\.3'/);
});
test("no sliced wing images, warped geometry or second ghost bird are loaded",()=>{
  assert.doesNotMatch(index,/glasswing-mesh-v12|glasswing-rig-v121|glasswing-cinematic-v120\.css|gw-film-flight|gw-film-background|gw-film-arc/);
  assert.doesNotMatch(index,/glasswing-original-traced-v122\.svg/);
  assert.doesNotMatch(js,/GlasswingMeshRig|canvas\.getContext|DOMParser|sessionStorage\.(getItem|setItem)/);
  assert.doesNotMatch(css,/\.gw-film-ground-art|\.gw-film-arc|\.gw-film-particles/);
  assert.match(css,/\.gw-film-video \{[^}]*object-fit:contain/);
});
test("full-size intro is a separate fixed fullscreen overlay, never embedded in the workspace",()=>{
  assert.match(css,/#gw-landing,#gw-film\{position:fixed;inset:0/);
  assert.match(index,/<div id="app">/);
  assert.match(consumer,/class="gw-lab-heading"/);
  assert.doesNotMatch(consumer,/gw-home-poster|gw-home-feature/);
  assert.match(app,/glasswing-brand-mark/);
  assert.match(index,/data-film-skip/);
  assert.match(index,/playsinline/);
  assert.match(index,/glasswing-screen-v125\.js/);
  assert.match(index,/glasswing-screen-v125\.css/);
});
test("service-worker refresh preserves stored investigations",()=>{
  assert.doesNotMatch(js,/localStorage\.(removeItem|clear)|indexedDB\.deleteDatabase|caches\.delete|unregister\(\)/);
  assert.match(js,/if\(landing\)landing\.hidden=false/);
  assert.match(js,/setBlocked\(!!landing\)/);
  assert.match(js,/video\.addEventListener\('ended',conclude\)/);
});

function simulate(){
  const handlers={},vh={},calls={play:0,pause:0},values=new Set();
  const app={inert:false,querySelector:()=>({focus(){}})};
  const landing={hidden:true,querySelector:()=>({focus(){}})};
  const film={hidden:true,classList:{add:x=>values.add(x),remove:x=>values.delete(x),contains:x=>values.has(x)},querySelector:()=>({focus(){}})};
  const video={currentTime:0,muted:false,addEventListener:(k,fn)=>vh[k]=fn,
    play:()=>{calls.play++;return Promise.resolve();},pause:()=>{calls.pause++;}};
  const body={classList:{toggle:(k,v)=>values.has(k)?(v?null:values.delete(k)):(v?values.add(k):null)}};
  const doc={body,getElementById:id=>({"gw-landing":landing,"gw-film":film,"gw-film-video":video,"app":app})[id]||null,
    addEventListener:(kind,fn)=>{handlers[kind]=fn}};
  let lastTimer=null; const box={document:doc,location:{assign(){}},console,
    setTimeout:(fn)=>{lastTimer=fn;return 1},clearTimeout:()=>{}};
  vm.runInNewContext(js,box,{timeout:2000});
  const click=selector=>handlers.click({target:{closest:q=>q===selector?{}:null},preventDefault(){}});
  return{landing,film,video,app,calls,click,vh,runTimer:()=>lastTimer?.(),values};
}
test("entry is visible on first/repeat visits; Watch intro starts true video and Skip returns",()=>{
  const v=simulate();
  assert.equal(v.landing.hidden,false);
  assert.equal(v.app.inert,true);
  assert.equal(v.film.hidden,true);
  v.click('[data-watch-intro],[data-replay-intro]');
  assert.equal(v.calls.play,1);
  assert.equal(v.film.hidden,false);
  assert.equal(v.landing.hidden,true);
  v.click('[data-film-skip]');
  assert.equal(v.landing.hidden,false);
  assert.equal(v.film.hidden,true);
  v.click('[data-enter-lab]');
  assert.equal(v.app.inert,false);
  assert.equal(v.landing.hidden,true);
});
test("movie ending shows transition then returns to landing, without another intro gate",()=>{
  const v=simulate();
  v.click('[data-watch-intro],[data-replay-intro]');
  v.vh.ended();
  assert.equal(v.values.has("gw-film-ending"),true);
  v.runTimer();
  assert.equal(v.film.hidden,true);
  assert.equal(v.landing.hidden,false);
});

test("Home artwork is always bounded and mobile layout never relies on image intrinsic size",()=>{
  assert.match(css,/\.consumer-home \.gw-lab-heading-mark\s*\{[^}]*width:clamp\(/);
  assert.match(css,/\.consumer-home \.gw-lab-heading-main\s*\{[^}]*display:flex/);
  assert.match(css,/\.consumer-home \.gw-lab-heading-buttons\s*\{[^}]*display:flex/);
  assert.match(css,/@media\(max-width:700px\)/);
  assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(index,/glasswing-screen-v125\.css\?v=1\.25\.3/);
  assert.match(consumer,/class="gw-lab-heading-mark"/);
});

test("Home image stays 76px when an offline CSS cache is missing or stale",()=>{
  assert.match(consumer,/class="gw-lab-heading-mark"[^>]*width="76" height="76"/);
  assert.match(consumer,/style="[^"]*max-width:76px;max-height:76px/);
  assert.match(index,/id="gw-home-layout-safety"/);
  assert.match(index,/#app \.consumer-home img\.gw-lab-heading-mark\s*\{/);
  assert.match(index,/width:76px!important;height:76px!important/);
  assert.match(index,/\.gw-home-feature,[\s\S]*?display:none!important/);
  assert.match(index,/@media \(max-width:520px\)/);
  assert.match(index,/href="\.\/glasswing-screen-v125\.css\?v=1\.25\.3"/);
});
test("offline worker refreshes styles/scripts online and retains offline fallback",()=>{
  assert.match(worker,/req\.destination === 'style'/);
  assert.match(worker,/req\.destination === 'script'/);
  assert.match(worker,/await fetch\(req, \{cache:'no-store'\}\)/);
  assert.match(worker,/await cache\.put\(key\.href, fresh\.clone\(\)\)/);
  assert.match(worker,/const saved = await cache\.match\(key\.href\)/);
});


test("Refresh app appears on landing only, with intact recovery route",()=>{
  assert.match(index,/<a class="gw-refresh-link" href="\.\/update-lab\.html"/);
  assert.match(css,/\.gw-landing-footer \.gw-refresh-link/);
  assert.doesNotMatch(consumer,/href="\.\/update-lab\.html">Refresh app/);
  assert.match(consumer,/data-app-install/);
  assert.match(index,/data-release="1\.25\.3"/);
  assert.match(worker,/const VERSION = '1\.25\.3'/);
});

test("Mobile investigation pages have only one fixed bottom nav and no obscured text",()=>{
  assert.match(css,/body\.glasswing-visual \.question-position\s*\{\s*position:static/);
  assert.match(css,/body\.glasswing-visual \.question-navigation\s*\{\s*position:static/);
  assert.match(css,/body\.glasswing-visual \.consumer-bottom-nav\s*\{/);
  assert.match(css,/background:#071a2b/);
  assert.match(css,/backdrop-filter:none/);
  assert.match(css,/body\.glasswing-visual\.investigation-mode \.app-body>main\s*\{/);
  assert.match(css,/margin:16px auto calc\(87px/);
  assert.match(css,/grid-template-columns:minmax\(0,auto\) minmax\(0,1fr\)/);
});

test("Home cannot mount the deprecated oversized eagle artwork",()=>{
  assert.match(css,/\.consumer-home img\[src\*="glasswing-approved\.webp"\]/);
  assert.match(consumer,/width="76" height="76"/);
});
