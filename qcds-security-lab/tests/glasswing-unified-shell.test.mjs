// Regression tests for one Project Glasswing product shell.
// These source-level contracts complement the model tests and user visual QA.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const html=read('index.html'), app=read('app-stage-v118.js'), css=read('glasswing-unified-shell-v127.css');
const worker=read('sw.js'), intro=read('glasswing-screen-v125.js'), lab=read('logical-lab.js'), install=read('app-install.js');
test('one authoritative visual layer loads AFTER all inherited styles',()=>{
  const last=html.indexOf('glasswing-unified-shell-v127.css?v=1.27.0');
  const prior=html.indexOf('glasswing-screen-v125.css');
  assert.ok(prior>0&&last>prior);
  assert.match(worker,/glasswing-unified-shell-v127\.css/);
  assert.match(html,/data-release="1\.27\.0"/);
  assert.match(worker,/const VERSION = '1\.27\.0'/);
  assert.match(html,/app-stage-v118\.js\?v=1\.27\.0/);
});
test('desktop and Fold/mobile have explicit non-overflowing widths',()=>{
  assert.match(css,/margin-left:242px!important/);
  assert.match(css,/max-width:1190px\) and \(min-width:1025px/);
  assert.match(css,/@media \(max-width:1024px\)/);
  assert.match(css,/width:100%!important/);
  assert.match(css,/margin:0!important/);
  assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css,/padding:19px clamp\(16px,4vw,25px\) calc\(160px/);
  assert.doesNotMatch(css,/body\.glasswing-visual #app \.app-body \{\s*width:calc\(100% - 242px\)/);
});
test('header settings stays visible on mobile rather than rendering a blank rectangle',()=>{
  assert.match(app,/class="button small plain-button gw-settings-header" data-app-settings/);
  assert.match(app,/aria-label="Settings and updates"/);
  assert.match(css,/\.gw-settings-header \.icon\s*\{\s*display:block!important/);
  assert.match(css,/#app \.top-actions \.gw-settings-header \.icon/);
  assert.doesNotMatch(app,/gw-what-header|gw-guide-header/);
});
test('primary navigation is simple, advanced work is nested, and guide is independent',()=>{
  const nav=app.slice(app.indexOf('<nav aria-label="Workspace">'),app.indexOf('</nav>',app.indexOf('<nav aria-label="Workspace">')));
  for(const text of ['Home','My investigations','Worked examples','CURRENT INVESTIGATION','Investigate · five steps','Results & explanation','Reports & PDF','Explore & learn']){
    assert.ok(nav.includes(text),text);
  }
  assert.match(nav,/gw-investigation-nav/);
  assert.match(nav,/consumer-nav-more/);
  assert.doesNotMatch(nav,/gw-nav-guide|gw-guide-header/);
  assert.match(app,/data-action="system-guide-pdf"/);
  assert.match(app,/No investigation is required/);
});
test('intro plays only by first entry or request; update cannot strand it over app',()=>{
  assert.match(intro,/qcds-glasswing-entered/);
  assert.match(intro,/skip_intro/);
  assert.match(intro,/glasswing_refresh/);
  assert.match(intro,/playDeadline=setTimeout\(finish,4800\)/);
  assert.doesNotMatch(html,/playsinline muted autoplay/);
  assert.match(html,/id="gw-film"[^>]*hidden/);
  assert.match(install,/data-replay-intro/);
  assert.match(install,/getRegistration\(ROOT\.href\)/);
  assert.match(install,/const bounded=async/);
  assert.doesNotMatch(install,/localStorage\.clear|indexedDB\.deleteDatabase/);
});
test('dimension workbench is branded as Project Glasswing, not a second Q-star product',()=>{
  assert.match(lab,/class="logic-brand-mark"/);
  assert.doesNotMatch(lab,/class="logic-brand">Q<span>★<\/span>/);
  assert.match(css,/#logical-lab \.logic-brand-mark/);
});
