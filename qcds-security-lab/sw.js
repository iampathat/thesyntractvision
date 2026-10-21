// QCDS Security Lab — offline-first app cache with user-approved updates.
// Copyright © 2026 Patrik Sundblom. R&D support: OpenAI / ChatGPT.
const VERSION = '1.24.0';
const PREFIX = 'qcds-security-app-';
const CACHE = PREFIX + VERSION;
const root = new URL('./', self.location.href);

self.addEventListener('install', event => event.waitUntil((async () => {
  const manifest = await fetch(new URL('offline-assets.json', root), {cache:'no-store'});
  if (!manifest.ok) throw new Error('Offline asset list unavailable');
  const paths = await manifest.json();
  const cache = await caches.open(CACHE);
  await cache.addAll(paths.map(path => new Request(new URL(path, root), {cache:'reload'})));
  // Do not call skipWaiting here. The user must approve updates via Update app.
})()));

self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const key of await caches.keys()) {
    if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
  }
  await self.clients.claim();
})()));

self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== root.origin ||
      !url.pathname.startsWith(root.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = new URL(url);
    key.search = '';
    key.hash = '';
    if (key.pathname === root.pathname) key.pathname += 'index.html';
    // Navigations must try the deployed application first. A cache-first HTML
    // shell trapped users on older splash and refresh pages indefinitely.
    // Static files remain offline-first, keeping an installed release coherent.
    const isDocument = req.mode === 'navigate' ||
      key.pathname === root.pathname + 'index.html' ||
      key.pathname === root.pathname + 'enter.html' ||
      key.pathname === root.pathname + 'open-glasswing-116.html';
    if (isDocument) {
      try {
        const fresh = await fetch(req, {cache:'no-store'});
        if (fresh.ok) return fresh;
      } catch { /* Offline: fall back to versioned local assets. */ }
      const cachedDocument = await cache.match(key.href);
      return cachedDocument || Response.error();
    }
    const cached = await cache.match(key.href);
    return cached || fetch(req);
  })());
});
