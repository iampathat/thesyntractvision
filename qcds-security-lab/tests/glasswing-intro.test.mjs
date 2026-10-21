// Project Glasswing v1.26.0 — one intro, one workspace and in-app updates.
// Theory and creation by Patrik Sundblom — OpenAI / ChatGPT R&D support.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read = name => readFileSync(new URL('../'+name,import.meta.url),'utf8');
const index=read('index.html');
const js=read('glasswing-screen-v125.js');
const css=read('glasswing-screen-v125.css');
const worker=read('sw.js');
const consumer=read('consumer-ui-stage-v118.js');
const app=read('app-stage-v118.js');
const installer=read('app-install.js');
const update=read('update-lab.html');
const style=read('style.css'),consumerStyle=read('consumer.css');
const film=readFileSync(new URL('../glasswing-flight-v125.mp4',import.meta.url));

test('exactly one intro launches directly into the real Security Lab',()=>{
  assert.match(index,/id="gw-film"/);
  assert.doesNotMatch(index,/id="gw-landing"/);
  assert.doesNotMatch(index,/gw-landing-shell|gw-landing-actions/);
  assert.match(index,/data-entry="intro"/);
  assert.match(index,/data-release="1\.26\.0"/);
  assert.match(index,/id="gw-film-video"/);
  assert.match(index,/playsinline muted autoplay/);
  assert.match(index,/data-film-skip/);
  assert.match(index,/src="\.\/app-stage-v118\.js\?v=1\.26\.0"/);
  assert.match(index,/glasswing-screen-v125\.js\?v=1\.26\.0/);
  assert.match(index,/glasswing-screen-v125\.css\?v=1\.26\.0/);
  assert.match(js,/video\.addEventListener\('ended',finish\)/);
  assert.doesNotMatch(js,/showLanding|fromLanding/);
});
test('approved flight video is present; only one intro artwork surface',()=>{
  assert.ok(film.length>1_000_000);
  assert.equal(film.subarray(4,8).toString(),'ftyp');
  assert.ok(film.includes(Buffer.from('moov')));
  assert.match(index,/glasswing-flight-v125\.mp4/);
  assert.match(css,/object-fit:contain!important;object-position:center!important/);
  assert.doesNotMatch(consumer,/data-open-landing|>Landing</);
});
test('all legacy entrance URLs redirect to the one canonical intro',()=>{
  const aliases=['enter.html','glasswing-start.html','glasswing-v120.html',
    'glasswing-v123.html','glasswing-v124.html','glasswing-v125.html',
    'glasswing-v122.html','open-glasswing-116.html'];
  for(const p of aliases){
    const s=read(p);
    assert.match(s,/location\.replace\(target\.href\)/,p);
    assert.match(s,/new URL\('\.\/index\.html',location\.href\)/,p);
    assert.doesNotMatch(s,/gw-landing-shell|glasswing-film-v125/,p);
  }
  assert.match(update,/index\.html\?skip_intro=1&settings=1#home/);
  assert.doesNotMatch(update,/id="reset"|id="refresh"/);
});
function simulate(search=''){
  const events={},videoEvents={},calls={play:0,pause:0,focus:0};
  const classes=new Set();
  const film={hidden:false,classList:{
      add:name=>classes.add(name),remove:name=>classes.delete(name),
      contains:name=>classes.has(name)
    },querySelector:()=>({hidden:true,textContent:''})};
  const video={currentTime:0,muted:false,playsInline:false,
    play(){calls.play++;return Promise.resolve()},
    pause(){calls.pause++},
    addEventListener:(name,fn)=>videoEvents[name]=fn};
  const app={inert:false};
  const body={classList:{toggle(name,active){if(active)classes.add(name);else classes.delete(name)}}};
  const doc={body,getElementById:id=>({
      'gw-film':film,'gw-film-video':video,'app':app
    })[id]||null,addEventListener:(name,fn)=>events[name]=fn};
  let timer=null;
  vm.runInNewContext(js,{
    document:doc,location:{search},URLSearchParams,
    setTimeout:fn=>{timer=fn;return 1},
    clearTimeout:()=>{},console
  },{timeout:2000});
  function click(selector){
    events.click({target:{closest:query=>query===selector?{isConnected:false}:null},
      preventDefault(){}});
  }
  return{film,video,app,calls,click,videoEvents,classes,finishTimer:()=>timer?.()};
}
test('intro autoplays muted and goes straight into app after finishing',()=>{
  const x=simulate();
  assert.equal(x.film.hidden,false);
  assert.equal(x.app.inert,true);
  assert.equal(x.video.muted,true);
  assert.equal(x.calls.play,1);
  x.videoEvents.ended();
  x.finishTimer();
  assert.equal(x.film.hidden,true);
  assert.equal(x.app.inert,false);
});
test('skip or replay intro does not return to any landing page',()=>{
  const x=simulate();
  x.click('[data-film-skip],[data-enter-lab]');
  assert.equal(x.film.hidden,true);
  assert.equal(x.app.inert,false);
  x.click('[data-watch-intro],[data-replay-intro]');
  assert.equal(x.film.hidden,false);
  assert.equal(x.app.inert,true);
  assert.equal(x.calls.play,2);
  x.click('[data-film-skip],[data-enter-lab]');
  assert.equal(x.app.inert,false);
});
test('refresh deep link goes directly to app settings without another intro',()=>{
  const x=simulate('?skip_intro=1&settings=1');
  assert.equal(x.film.hidden,true);
  assert.equal(x.app.inert,false);
  assert.equal(x.calls.play,0);
  assert.match(app,/data-app-settings/);
  assert.match(installer,/id='gw-settings-dialog'/);
  assert.match(installer,/data-app-refresh/);
  assert.match(installer,/location\.replace\(url\.href\)/);
  assert.doesNotMatch(installer,/localStorage\.(?:clear|removeItem)|indexedDB\.deleteDatabase/);
  assert.match(worker,/const VERSION = '1\.26\.0'/);
});
test('mobile has one opaque bottom bar and question controls are in the content',()=>{
  const occurrence=(app.match(/\$\{investigating \? questionNavigation\(\) : ""\}/g)||[]).length;
  assert.equal(occurrence,1);
  const navigation=app.indexOf('${investigating ? questionNavigation() : ""}');
  const footer=app.indexOf('<footer class="main-footer">');
  const closingMain=app.indexOf('</main>',footer);
  assert.ok(navigation>=0&&navigation<footer&&footer<closingMain);
  assert.match(css,/body\.glasswing-visual #app \.question-navigation\s*\{\s*position:static!important/);
  assert.match(css,/body\.glasswing-visual #app \.consumer-bottom-nav\s*\{/);
  assert.match(css,/background:#061e32!important/);
  assert.match(index,/id="gw-critical-layout-v126"/);
});
test('one cohesive icy-blue design and no oversized Home eagle',()=>{
  assert.match(css,/--gw-ice:#8ce9ff/);
  assert.match(css,/body\.glasswing-visual \.consumer-bottom-nav a\[aria-current\]/);
  assert.match(css,/background:#153c57!important/);
  assert.match(css,/\.gw-settings-dialog \{/);
  assert.match(css,/object-fit:contain!important;object-position:center!important/);
  assert.match(consumer,/class="gw-lab-heading-mark"[^>]*width="76" height="76"/);
  assert.doesNotMatch(consumer,/data-open-landing|href="\.\/update-lab\.html"/);
});

test('source base styles do not retain the old green navigation backgrounds',()=>{
  assert.doesNotMatch(style,/#1b251a|#3d4936/);
  assert.doesNotMatch(consumerStyle,/#263729|#1b2b26|#18262c|#1b2a24/);
  assert.match(style,/background: #102c43/);
  assert.match(consumerStyle,/background:#153c57/);
  assert.match(index,/style\.css\?v=1\.26\.0/);
  assert.match(index,/consumer\.css\?v=1\.26\.0/);
});
