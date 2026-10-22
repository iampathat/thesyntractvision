import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const html=readFileSync(new URL('../update-glasswing.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script,'Updater must include its own executable script.');
function harness({stallRegistration=false,stallCaches=false}={}){
  const callbacks={};
  const elements={
    refresh:{disabled:false,addEventListener:(name,fn)=>{callbacks[name]=fn;}},
    result:{textContent:'',dataset:{}},
    openLab:{href:'',focus(){this.focused=true;}}
  };
  const assigned=[];
  let unregistered=0,removed=[];
  const root='https://iampathat.github.io/thesyntractvision/qcds-security-lab/';
  const reg={scope:root,unregister:async()=>{unregistered++;return true}};
  const ctx={
    document:{getElementById:id=>elements[id]},
    location:{
      href:'https://iampathat.github.io/thesyntractvision/glasswing-refresh.html',
      pathname:'/thesyntractvision/glasswing-refresh.html',
      assign:url=>assigned.push(url)
    },
    navigator:{serviceWorker:{getRegistration:()=>stallRegistration?new Promise(()=>{}):Promise.resolve(reg)}},
    caches:{
      keys:()=>stallCaches?new Promise(()=>{}):Promise.resolve(['unrelated-cache','qcds-security-app-old']),
      delete:name=>{removed.push(name);return Promise.resolve(true)}
    },
    fetch:async()=>({ok:true}),
    AbortController,URL,Date,Promise,Error,
    setTimeout:(fn,delay)=>setTimeout(fn,Math.min(delay,20)),
    clearTimeout,
  };
  runInNewContext(script,ctx);
  return {elements,callbacks,assigned,get unregistered(){return unregistered},removed,root};
}
test('The updater handles normal cached app and opens correct Security Lab path',async()=>{
  const t=harness();
  await t.callbacks.click();
  assert.equal(t.unregistered,1);
  assert.deepEqual(t.removed,['qcds-security-app-old']);
  assert.equal(t.assigned.length,1);
  assert.match(t.assigned[0],/\/thesyntractvision\/qcds-security-lab\/index.html\?skip_intro=1/);
  assert.match(t.assigned[0],/#report$/);
  assert.ok(t.elements.openLab.href.includes('/qcds-security-lab/'));
});
test('A hanging Safari service worker never traps the user on a spinner',async()=>{
  const t=harness({stallRegistration:true});
  await t.callbacks.click();
  assert.equal(t.elements.refresh.disabled,false);
  assert.equal(t.assigned.length,0);
  assert.equal(t.elements.result.dataset.state,'warning');
  assert.match(t.elements.result.textContent,/cache svarade inte helt/i);
  assert.ok(t.elements.openLab.focused);
  assert.ok(t.elements.openLab.href.includes('/qcds-security-lab/index.html'));
});
test('A hanging cache API also gives a direct open link and never touches saved cases',async()=>{
  const t=harness({stallCaches:true});
  await t.callbacks.click();
  assert.equal(t.elements.refresh.disabled,false);
  assert.equal(t.assigned.length,0);
  assert.equal(t.elements.result.dataset.state,'warning');
  assert.equal(t.unregistered,1);
  assert.ok(t.elements.openLab.href.includes('index.html'));
  assert.doesNotMatch(script,/localStorage\.clear|indexedDB\.deleteDatabase|sessionStorage\.clear/);
});
