// The service worker. It keeps a copy of the app's own files, so the app can
// still open when the server cannot be reached.
//
// Rules:
//   - Files of the app (pages, styles, scripts): ask the network first, so a new
//     version shows at once. If the network fails, use the saved copy.
//   - API calls: never saved. Marks, money and health data stay out of the cache,
//     and the app never shows old numbers as if they were current.

const CACHE = 'companion-shell-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name !== CACHE) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const fresh = await fetch(request);
      if (fresh.ok) cache.put(request, fresh.clone());
      return fresh;
    } catch {
      const saved = await cache.match(request);
      return saved ?? new Response('The app is offline and this file was not saved yet.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    }
  })());
});
