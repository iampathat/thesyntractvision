// QCDS by Patrik Sundblom. Versioned offline application cache, scoped to this app.
const VERSION='1.14.1';
const PREFIX='qcds-security-app-';
const CACHE=PREFIX+VERSION;
const root=new URL('./',self.location.href);
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const response=await fetch(new URL('offline-assets.json',root),{cache:'no-store'});
  if(!response.ok)throw new Error('Offline asset list unavailable');
  const paths=await response.json();
  const cache=await caches.open(CACHE);
  await cache.addAll(paths.map(path=>new Request(new URL(path,root),{cache:'reload'})));
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==root.origin||!url.pathname.startsWith(root.pathname))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const key=new URL(url);key.search='';key.hash='';
    if(key.pathname===root.pathname)key.pathname+='index.html';
    const cached=await cache.match(key.href);
    if(cached)return cached;
    return fetch(event.request);
  })());
});
