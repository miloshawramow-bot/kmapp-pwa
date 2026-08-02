// KMapp SW v4 — SELF-DESTRUCT STUB
// Replaces old sw4.js. Clears ALL caches, unregisters self, forces reload to clear.html
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
      .then(() => self.clients.matchAll({ includeUncontrolled: true, type: 'window' }))
      .then(clients => {
        clients.forEach(c => {
          try { c.navigate(c.url.split('?')[0] + '?fresh=' + Date.now()); } catch(e) {}
        });
      })
      .then(() => self.registration.unregister())
  );
});

// Network-only — never serve from cache
self.addEventListener('fetch', (event) => {
  if (event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request).catch(() => new Response('Reload the page', { status: 503, headers: { 'Content-Type': 'text/html' } }))
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
