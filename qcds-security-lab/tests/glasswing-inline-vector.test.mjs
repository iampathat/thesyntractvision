import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {glasswingEmblem} from '../glasswing-emblem.mjs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const shell=read('app-stage-v118.js'), lab=read('logical-lab.js'), home=read('consumer-ui-stage-v118.js');
const css=read('glasswing-unified-shell-v127.css'), html=read('index.html'), worker=read('sw.js');
test('Glasswing logo is real background-free SVG, not an embedded square image',()=>{
 const a=glasswingEmblem('gw-sidebar-emblem'),b=glasswingEmblem('gw-sidebar-emblem');
 assert.match(a,/<svg[^>]+class="gw-sidebar-emblem glasswing-emblem"/);
 assert.match(a,/viewBox="0 0 320 210"/);
 assert.match(a,/fill="url\(#gw-emblem-1-wing\)"/);
 assert.match(a,/<use href="#gw-emblem-1-lwing"/);
 assert.match(a,/linearGradient/);
 assert.match(a,/circle/);
 assert.doesNotMatch(a,/<image\b|data:image|base64|<rect[^>]+fill=/i);
 assert.notEqual(a,b,'IDs must be unique when multiple SVGs appear on the same page');
 assert.match(b,/id="gw-emblem-2-wing"/);
});
test('Active navigation, lab, launcher, and empty case all use shared vector icon',()=>{
 assert.match(shell,/glasswingEmblem\('gw-sidebar-emblem'\)/);
 assert.match(lab,/glasswingEmblem\('logic-brand-mark'\)/);
 assert.match(lab,/glasswingEmblem\('gw-launch-emblem'\)/);
 assert.match(home,/glasswingEmblem\('gw-empty-mark'\)/);
 for(const [name,value] of [['app',shell],['lab',lab],['home',home]]){
   assert.doesNotMatch(value,/glasswing-mark\.webp/,name+' must not embed the background photograph');
 }
 assert.doesNotMatch(html,/glasswing-mark\.webp/, 'boot splash is typographic rather than an ugly photograph');
});
test('Mobile menus and lab icons never use object-fit cover, circular crop or dark photo box',()=>{
 assert.match(css,/body\.glasswing-visual #app \.sidebar \.brand\.glasswing-brand \.glasswing-brand-mark\s*\{/);
 assert.match(css,/body\.glasswing-visual #app \.sidebar \.brand\.glasswing-brand \.glasswing-brand-mark \.gw-sidebar-emblem\s*\{/);
 assert.match(css,/body\.glasswing-visual #logical-lab svg\.logic-brand-mark\s*\{/);
 assert.match(css,/body\.glasswing-visual \.glasswing-emblem\s*\{/);
 assert.match(css,/background:transparent!important/);
 assert.match(css,/border:0!important/);
 assert.match(css,/overflow:visible!important/);
});
test('Favicon, release and offline cache align to transparent inline symbol',()=>{
 const favicon=read('assets/favicon.svg');
 assert.match(favicon,/viewBox="0 0 64 48"/);
 assert.doesNotMatch(favicon,/rect width="64" height="64" rx="15" fill="#b8ff39"/);
 assert.match(html,/data-release="1\.27\.3"/);
 assert.match(worker,/const VERSION = '1\.27\.3'/);
 assert.match(worker,/glasswing-emblem\.mjs/);
});
