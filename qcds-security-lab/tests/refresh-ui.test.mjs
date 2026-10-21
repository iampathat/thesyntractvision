// Project Glasswing / Security Lab recovery UI behavioral regression tests.
// Theory and creation by Patrik Sundblom; OpenAI / ChatGPT research support.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const markup = readFileSync(new URL('../refresh-tools.html',import.meta.url),'utf8');
const script = markup.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script,'Refresh tools must have executable browser logic');
const ROOT='https://example.test/qcds-security-lab/';

function store(items) {
  const map=new Map(Object.entries(items));
  return {
    get length(){return map.size;},
    key(index){return [...map.keys()][index]??null;},
    getItem(key){return map.get(key)??null;},
    removeItem(key){map.delete(key);},
    has(key){return map.has(key);},
    snapshot(){return Object.fromEntries(map);}
  };
}

function ui({approved=false,registrationHangs=false,fastTimers=false}={}) {
  const eventHandlers={};
  const buttons={};
  let unregisterCount=0;
  let confirmCount=0;
  const cacheNames=new Set(['qcds-security-app-previous','other-app-cache']);
  const deleted=[];
  const navigations=[];
  for(const name of ['refresh','reset','backup','status','openLab','launchHint']){
    buttons[name]={
      id:name,disabled:false,textContent:'',dataset:{},
      href:'',classList:{isHidden:true,remove(name){if(name==='hidden')this.isHidden=false;}},
      focus(){this.focused=true;},
      addEventListener:(event,handler)=>{eventHandlers[name+':'+event]=handler;}
    };
  }
  const local=store({
    'qcds-security-lab:workspace:v1':'{"caseId":"case-example"}',
    'qcds-security-lab:preferences':'private',
    'other-product:case':'keep-me'
  });
  const session=store({
    'qcds-security-lab:place:v1':'{"question":2}',
    'other-product:session':'keep-me'
  });
  const registration={scope:ROOT,unregister:async()=>{unregisterCount++;return true;}};
  const serviceWorker={
    getRegistration:()=>registrationHangs?new Promise(()=>{}):Promise.resolve(registration)
  };
  const cache={
    keys:async()=>[...cacheNames],
    delete:async name=>{deleted.push(name);return cacheNames.delete(name);}
  };
  const windowObj={confirm:()=>{confirmCount++;return approved;},caches:cache};
  const location={href:ROOT+'refresh-tools.html',replace:target=>navigations.push(target)};
  const dom={getElementById:id=>buttons[id]};
  vm.runInNewContext(script,{
    window:windowObj,document:dom,navigator:{serviceWorker},caches:cache,
    localStorage:local,sessionStorage:session,location,
    URL,Promise,Date,AbortController,
    setTimeout:(callback,delay)=>setTimeout(callback,fastTimers?1:delay),clearTimeout,
    fetch:async()=>({ok:true,status:200})
  },{timeout:2000});
  return {
    press:id=>eventHandlers[id+':click'](),
    local,session,deleted,navigations,
    get unregisterCount(){return unregisterCount;},
    get confirmCount(){return confirmCount;},
    status:buttons.status,
    button:buttons
  };
}

test('normal refresh reloads app but preserves all browser investigations and other products',async()=>{
  const x=ui();
  await x.press('refresh');
  assert.equal(x.local.has('qcds-security-lab:workspace:v1'),true);
  assert.equal(x.local.has('qcds-security-lab:preferences'),true);
  assert.equal(x.session.has('qcds-security-lab:place:v1'),true);
  assert.equal(x.local.has('other-product:case'),true);
  assert.deepEqual(x.deleted,['qcds-security-app-previous']);
  assert.equal(x.unregisterCount,1);
  assert.equal(x.navigations.length,0,'Refresh must not navigate without the user clicking Open');
  assert.equal(x.button.openLab.classList.isHidden,false);
  assert.match(x.button.openLab.href,/\.\/index\.html\?updated=/);
});

test('canceling full reset removes nothing and does not navigate',async()=>{
  const x=ui({approved:false});
  await x.press('reset');
  assert.equal(x.confirmCount,1);
  assert.equal(x.local.has('qcds-security-lab:workspace:v1'),true);
  assert.equal(x.session.has('qcds-security-lab:place:v1'),true);
  assert.deepEqual(x.deleted,[]);
  assert.equal(x.unregisterCount,0);
  assert.equal(x.navigations.length,0);
  assert.match(x.status.textContent,/cancelled/i);
});

test('confirmed full reset deletes only Security Lab state and cache',async()=>{
  const x=ui({approved:true});
  await x.press('reset');
  assert.equal(x.confirmCount,1);
  assert.equal(x.local.has('qcds-security-lab:workspace:v1'),false);
  assert.equal(x.local.has('qcds-security-lab:preferences'),false);
  assert.equal(x.session.has('qcds-security-lab:place:v1'),false);
  assert.equal(x.local.has('other-product:case'),true);
  assert.equal(x.session.has('other-product:session'),true);
  assert.deepEqual(x.deleted,['qcds-security-app-previous']);
  assert.equal(x.unregisterCount,1);
  assert.equal(x.navigations.length,0);
  assert.equal(x.button.openLab.classList.isHidden,false);
  assert.match(x.button.openLab.href,/\.\/index\.html\?updated=/);
});

test('stuck service worker lookup times out and shows a retryable error',async()=>{
  const x=ui({registrationHangs:true,fastTimers:true});
  await x.press('refresh');
  assert.match(x.status.textContent,/timed out/i);
  assert.equal(x.button.refresh.disabled,false);
  assert.equal(x.local.has('qcds-security-lab:workspace:v1'),true);
  assert.equal(x.navigations.length,0);
});
