import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('offline cache serves navigations, versioned workers and PDFs without crossing app scope',async()=>{
  const root='https://example.test/qcds-security-lab/';
  const handlers={},cache=new Map(),deleted=[];let network=true,claimed=false,skip=false;
  const paths=['index.html','quantum-worker.mjs','vendor/jspdf.umd.min.js'];
  const storage={addAll:async requests=>{for(const request of requests)cache.set(request.url,new Response(request.url));},match:async key=>cache.get(key)?.clone()};
  const sandbox={URL,Request,Response,
    self:{location:{href:root+'sw.js'},addEventListener:(type,fn)=>handlers[type]=fn,clients:{claim:async()=>claimed=true},skipWaiting:()=>skip=true},
    caches:{open:async()=>storage,keys:async()=>['other-app','qcds-security-app-1.13.0','qcds-security-app-1.14.0'],delete:async key=>deleted.push(key)},
    fetch:async request=>{if(!network)throw new Error('offline');return new Response(JSON.stringify(paths));}
  };
  vm.runInNewContext(await readFile(new URL('../sw.js',import.meta.url),'utf8'),sandbox);
  let pending;handlers.install({waitUntil:p=>pending=p});await pending;
  assert.equal(skip,false,'installation must wait for user-approved update');
  handlers.activate({waitUntil:p=>pending=p});await pending;
  assert.equal(claimed,true);assert.deepEqual(deleted,['qcds-security-app-1.13.0']);
  network=false;
  for(const suffix of ['?v=1.14.0','quantum-worker.mjs?v=1.1.0','vendor/jspdf.umd.min.js']){
    handlers.fetch({request:new Request(root+suffix),respondWith:p=>pending=p});
    assert.equal((await pending).status,200);
  }
  let intercepted=false;handlers.fetch({request:new Request('https://example.test/another-app/'),respondWith:()=>intercepted=true});
  assert.equal(intercepted,false);
  handlers.message({data:{type:'ACTIVATE_UPDATE'}});assert.equal(skip,true);
});
