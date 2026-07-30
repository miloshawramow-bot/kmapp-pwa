// KMapp Service Worker v23 - network-first for HTML, cache-first for assets
const CACHE = 'kmapp-v28';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './js/mammoth.browser.min.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/favicon-16.png'
];

// ===== INSTALL: pre-cache static assets, force immediate activation =====
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('SW install: some assets failed to cache', err))
  );
});

// ===== ACTIVATE: delete ALL old caches, claim all clients, force reload =====
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.map((k) => caches.delete(k))  // Delete ALL old caches including v1, v2
      ))
      .then(() => self.clients.claim())
  );
});

// ===== FETCH: network-first for HTML, cache-first for assets =====
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Skip non-GET requests
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Cross-origin: try network, fall back to cache
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  // Navigation requests (HTML pages) → NETWORK FIRST
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Cache the fresh HTML
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => {
          // Offline: serve from cache
          return caches.match('./index.html');
        })
    );
    return;
  }

  // Static assets → CACHE FIRST (with background update)
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        // Update cache in background
        fetch(req).then((res) => {
          if (res && res.status === 200) {
            caches.open(CACHE).then((cache) => cache.put(req, res));
          }
        }).catch(() => {});
        return cached;
      }

      // Not in cache - fetch from network
      return fetch(req).then((res) => {
        if (!res || res.status !== 200) return res;
        const resClone = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, resClone));
        return res;
      });
    })
  );
});

// ===== MESSAGE: allow page to trigger immediate update =====
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
