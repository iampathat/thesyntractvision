// Project Glasswing v1.18 — one landing, one optional single-bird film, one working lab.
// Theory and creation by Patrik Sundblom, with OpenAI / ChatGPT as R&D support.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const read = name => readFileSync(new URL("../"+name,import.meta.url),"utf8");
const blob = name => readFileSync(new URL("../"+name,import.meta.url));
const index = read("index.html"), entry = read("enter.html");
const freshLanding = read("glasswing-start.html");
const cleanLanding = read("glasswing-v120.html");
const stage = read("glasswing-mesh-stage-v123.js"), stageCss=read("glasswing-rig-stage-v121.css");
const vector=read("glasswing-original-traced-v123.svg"), gpu=read("glasswing-mesh-v123.js"), theme=read("glasswing-theme-v121.css");
const consumer=read("consumer-ui-stage-v118.js"), app=read("app-stage-v118.js");
const gateway=read("open-glasswing-116.html"), worker=read("sw.js");

test("approved artwork and unbroken one-piece eagle are real WebP assets",()=>{
  for(const [name,minimum] of [["glasswing-approved.webp",50000],["glasswing-flight.webp",25000],["glasswing-mark.webp",12000]]){
    const file=blob(name);
    assert.ok(file.length>minimum,name+" is unexpectedly small");
    assert.equal(file.subarray(0,4).toString(),"RIFF");
    assert.equal(file.subarray(8,12).toString(),"WEBP");
  }
});
test("canonical page offers Enter and Watch, separate from the actual app",()=>{
  assert.match(index,/id="gw-landing"/);
  assert.match(index,/data-enter-lab/);
  assert.match(index,/data-watch-intro/);
  assert.match(index,/id="gw-film"/);
  assert.match(index,/<div id="app">/);
  assert.match(index,/data-entry="landing"/);
  assert.match(index,/glasswing-approved\.webp\?v=1\.18\.0/);
  assert.match(index,/glasswing-rig-stage-v121\.css/);
  assert.match(index,/glasswing-mesh-stage-v123\.js/);
  assert.doesNotMatch(index,/id="security-intro"/);
});
test("new cache-independent URL renders exactly the same canonical landing",()=>{
  assert.equal(freshLanding,index);
  assert.equal(cleanLanding,index);
  assert.match(cleanLanding,/glasswing-mesh-stage-v123\.js/);
  assert.match(freshLanding,/data-enter-lab/);
  assert.match(freshLanding,/data-watch-intro/);
});

test("approved original eagle is actually vector-traced, not a hand-drawn substitute or bitmap",()=>{
  assert.match(index,/glasswing-original-traced-v122\.svg\?v=1\.23\.0/);
  assert.match(index,/glasswing-mesh-v123\.js/);
  assert.match(index,/glasswing-mesh-stage-v123\.js/);
  assert.match(index,/id="gw-film"/);
  assert.doesNotMatch(index,/gw-eagle-wing-left|gw-eagle-wing-right|gw-eagle-body/);
  assert.match(vector,/<svg\b/);
  assert.match(vector,/viewBox="0 0 960 502"/);
  assert.doesNotMatch(vector,/<image\b|<foreignObject\b|<script\b/);
  assert.ok((vector.match(/<path d="M\d+ \d+ \d+ \d+ \d+ \d+Z" fill="#[a-f0-9]{6}"/g)||[]).length >= 20000);
  assert.match(gpu,/gl\.TRIANGLES/);
  assert.match(gpu,/a_pos/);
  assert.match(gpu,/44\.0\*lPhase\*left/);
  assert.match(gpu,/43\.0\*rPhase\*right/);
  assert.match(gpu,/smoothstep\(325\.0,415\.0,source\.y\)/);
  assert.doesNotMatch(gpu,/vec2 turn\(|wingAngle|mix\(p,turn/);
  assert.match(gpu,/head/);
  assert.match(gpu,/Independent small talon curls/);
  assert.match(gpu,/shared boundary identically/);
  assert.match(gpu,/WebGL/);
  assert.match(stage,/GlasswingMeshRig/);
  assert.doesNotMatch(stage,/DOMParser|gw-vector-inline|gw-eagle-playing/);
  assert.match(stageCss,/gw-rig-camera-flight/);
  assert.match(stageCss,/prefers-reduced-motion:reduce/);
});
test("crystal-blue design tokens and panels replace the previous green accent system",()=>{
  assert.match(theme,/--acid:#8de7ff/);
  assert.match(theme,/--app-accent:#85dfff/);
  assert.match(theme,/\.quantum-card/);
  assert.match(theme,/\.logic-launch/);
  assert.match(theme,/\.sidebar/);
  for(const file of ["style.css","consumer.css","logical-lab.css","quantum-panel.css"]){
    const css=read(file);
    assert.doesNotMatch(css,/#b8ff39|#b8ff55|#c5ff5c|#bcff69|#c4ff70/i,file);
  }
  assert.match(index,/data-release="1\.23\.0"/);
});
test("working Home contains real investigations and only a compact brand header",()=>{
  assert.match(consumer,/class="gw-lab-heading"/);
  assert.match(consumer,/data-action="new"/);
  assert.match(consumer,/Continue investigation/);
  assert.match(consumer,/data-watch-intro/);
  assert.match(consumer,/data-open-landing/);
  assert.match(consumer,/Current position: step/);
  assert.doesNotMatch(consumer,/gw-home-poster|gw-home-feature|glasswing-approved-banner/);
  assert.match(app,/consumer-ui-stage-v118\.js/);
  assert.match(app,/glasswing-brand-mark/);
});
test("direct-entry route is the full app with optional film, not another splash",()=>{
  assert.match(entry,/data-entry="direct"/);
  assert.match(entry,/id="gw-film"/);
  assert.doesNotMatch(entry,/id="gw-landing"/);
  assert.match(entry,/app-stage-v118\.js/);
  assert.match(index,/app-stage-v118\.js/);
  assert.match(gateway,/url=\.\/\?welcome=1/);
  assert.doesNotMatch(gateway,/unregister|caches\.delete|getRegistrations/);
  assert.match(worker,/const VERSION = '1\.23\.0'/);
  assert.match(worker,/req\.mode === 'navigate'/);
});
test("session entry and film are independent of saved case storage",()=>{
  assert.match(stage,/sessionStorage\.setItem\("qcds-security-lab:entered-session"/);
  assert.doesNotMatch(stage,/localStorage\.(clear|removeItem)/);
  assert.doesNotMatch(stage,/indexedDB\.deleteDatabase/);
  assert.match(stage,/forceLanding/);
  assert.match(stage,/data-replay-intro/);
  assert.match(stage,/data-film-skip/);
  assert.match(stage,/location\.assign\("\.\/\?welcome=1"\)/);
});

// Execute the actual stage script against a tiny browser model. This catches
// regressions that string-only static checks would miss.
function makeRuntime({landingPresent=true,direct=false,sessionEntered=false}={}){
  const listeners={};
  const classes=()=>{const values=new Set();return{
    add:x=>values.add(x),remove:x=>values.delete(x),
    toggle:(x,on)=>on?values.add(x):values.delete(x),
    contains:x=>values.has(x)
  }};
  const focused={value:null}, button=(kind)=>({focus:()=>{focused.value=kind;}});
  const landing=landingPresent?{hidden:false,querySelector:()=>button("enter")}:null;
  const film={hidden:true,classList:classes(),dataset:{},offsetWidth:100,querySelector:()=>button("skip")};
  const app={inert:false,removeAttribute:()=>{},querySelector:()=>button("workspace")};
  const body={dataset:{entry:direct?"direct":"landing"},classList:classes()};
  const stored=new Map(sessionEntered?[["qcds-security-lab:entered-session","1"]]:[]);
  const timers=new Map();let nextTimer=1,locAssigned=null;
  const sandbox={
    document:{body,getElementById:k=>({"gw-landing":landing,"gw-film":film,"app":app})[k]||null,
      addEventListener:(k,fn)=>{listeners[k]=fn;}},
    window:{matchMedia:()=>({matches:false})},
    sessionStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)},
    location:{hash:"",search:"",assign:u=>{locAssigned=u;}},
    URLSearchParams,setTimeout:(fn,ms)=>{const id=nextTimer++;timers.set(id,{fn,ms});return id;},
    clearTimeout:id=>timers.delete(id)
  };
  vm.runInNewContext(stage,sandbox,{timeout:3000});
  const click=kind=>{
    const selector=kind==="enter"?"[data-enter-lab]":
      kind==="watch"?"[data-watch-intro],[data-replay-intro]":
      kind==="skip"?"[data-film-skip]":"[data-open-landing]";
    const clicked=button(kind);
    listeners.click({target:{closest:s=>s===selector?clicked:null},preventDefault:()=>{}});
  };
  return {landing,film,app,body,stored,timers,focused,click,get assigned(){return locAssigned;}};
}
test("Enter opens workspace immediately; intro is optional and returns to app",()=>{
  const v=makeRuntime();
  assert.equal(v.landing.hidden,false);
  assert.equal(v.app.inert,true);
  assert.equal(v.film.hidden,true);
  v.click("enter");
  assert.equal(v.landing.hidden,true);
  assert.equal(v.app.inert,false);
  assert.equal(v.stored.get("qcds-security-lab:entered-session"),"1");
  v.click("watch");
  assert.equal(v.film.hidden,false);
  assert.equal(v.film.classList.contains("gw-film-playing"),true);
  v.click("skip");
  assert.equal(v.film.hidden,true);
  assert.equal(v.app.inert,false);
});
test("Watch intro from landing returns to landing, not a second gate",()=>{
  const v=makeRuntime();
  v.click("watch");
  assert.equal(v.landing.hidden,true);
  assert.equal(v.film.hidden,false);
  v.click("skip");
  assert.equal(v.landing.hidden,false);
  assert.equal(v.app.inert,true);
  v.click("enter");
  assert.equal(v.app.inert,false);
});
test("repeat visits and direct-entry pages do not auto-show the landing",()=>{
  const returning=makeRuntime({sessionEntered:true});
  assert.equal(returning.landing.hidden,true);
  assert.equal(returning.app.inert,false);
  const direct=makeRuntime({landingPresent:false,direct:true});
  assert.equal(direct.app.inert,false);
  direct.click("watch");
  assert.equal(direct.film.hidden,false);
  direct.click("skip");
  assert.equal(direct.app.inert,false);
});

test("wing tips move smoothly without separating the original eagle from its shoulders",()=>{
  const shader=gpu.slice(gpu.indexOf("const VS ="),gpu.indexOf("const FS ="));
  assert.match(shader,/leftTip = 1\.0 - smoothstep\(84\.0,492\.0,source\.x\)/);
  assert.match(shader,/rightTip = smoothstep\(584\.0,933\.0,source\.x\)/);
  assert.match(shader,/float left = wingMask \* leftTip \* u_motion/);
  assert.match(shader,/float right = wingMask \* rightTip \* u_motion/);
  assert.match(shader,/pos\.y -= 44\.0\*lPhase\*left \+ 43\.0\*rPhase\*right/);
  assert.match(shader,/headWeight=exp\(-dot\(hd,hd\)\*2\.55\)/);
  assert.doesNotMatch(shader,/turn\(|mix\(p,turn/);
  assert.doesNotMatch(index,/gw-film-ground-art|gw-vector-wing|gw-eagle-wing-left/);
});
