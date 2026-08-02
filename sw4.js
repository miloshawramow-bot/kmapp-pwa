// KMapp SW v4 — SELF-DESTRUCT STUB
// This replaces the old sw4.js. When the PWA updates to this,
// it clears ALL caches, unregisters itself, and forces a clean reload.
const CACHE = 'kmapp-destruct';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ includeUncontrolled: true }))
      .then(clients => {
        clients.forEach(c => c.navigate(c.url));
      })
      .then(() => self.registration.unregister())
  );
});

self.addEventListener('fetch', (event) => {
  // Always go to network, bypass cache completely
  if (event.request.method === 'GET') {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
  }
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
