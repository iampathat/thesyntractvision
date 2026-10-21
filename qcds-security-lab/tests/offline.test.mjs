import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('offline cache serves navigations, versioned workers and PDFs without crossing app scope',async()=>{
  const root='https://example.test/qcds-security-lab/';
  const worker=await readFile(new URL('../sw.js',import.meta.url),'utf8');
  const version=/const VERSION\s*=\s*['"]([^'"]+)['"]/.exec(worker)?.[1];
  assert.ok(version,'Service worker declares an offline cache version');
  const handlers={},cache=new Map(),deleted=[];let network=true,claimed=false,skip=false;
  const paths=['index.html','quantum-worker.mjs','vendor/jspdf.umd.min.js'];
  const storage={addAll:async requests=>{for(const request of requests)cache.set(request.url,new Response(request.url));},match:async key=>cache.get(key)?.clone()};
  const sandbox={URL,Request,Response,
    self:{location:{href:root+'sw.js'},addEventListener:(type,fn)=>handlers[type]=fn,clients:{claim:async()=>claimed=true},skipWaiting:()=>skip=true},
    caches:{open:async()=>storage,keys:async()=>['other-app','qcds-security-app-1.13.0',`qcds-security-app-${version}`],delete:async key=>deleted.push(key)},
    fetch:async request=>{if(!network)throw new Error('offline');return new Response(JSON.stringify(paths));}
  };
  vm.runInNewContext(worker,sandbox);
  let pending;handlers.install({waitUntil:p=>pending=p});await pending;
  assert.equal(skip,false,'installation must wait for user-approved update');
  handlers.activate({waitUntil:p=>pending=p});await pending;
  assert.equal(claimed,true);assert.deepEqual(deleted,['qcds-security-app-1.13.0']);
  network=false;
  for(const suffix of [`?v=${version}`,'quantum-worker.mjs?v=1.1.0','vendor/jspdf.umd.min.js']){
    handlers.fetch({request:new Request(root+suffix),respondWith:p=>pending=p});
    assert.equal((await pending).status,200);
  }
  let intercepted=false;handlers.fetch({request:new Request('https://example.test/another-app/'),respondWith:()=>intercepted=true});
  assert.equal(intercepted,false);
  handlers.message({data:{type:'ACTIVATE_UPDATE'}});assert.equal(skip,true);
});


test('manual app refresh is accessible without deleting investigation storage',async()=>{
  const refresh=await readFile(new URL('../refresh.html',import.meta.url),'utf8');
  const home=await readFile(new URL('../consumer-ui.js',import.meta.url),'utf8');
  assert.match(refresh,/id="refresh"/);
  assert.match(refresh,/navigator\.serviceWorker\.getRegistrations\(\)/);
  assert.match(refresh,/reg\.scope===expected/);
  assert.match(refresh,/reg=>reg\.unregister\(\)/);
  assert.doesNotMatch(refresh,/localStorage\.(clear|removeItem)\(/);
  assert.doesNotMatch(refresh,/indexedDB\.deleteDatabase/);
  assert.match(home,/href="\.\/refresh\.html"/);
});
