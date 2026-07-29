// KMapp Service Worker - offline-capable PWA
const CACHE_NAME = 'kmapp-v2';
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

// ===== INSTALL: pre-cache static assets =====
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('SW install: some assets failed to cache', err))
  );
});

// ===== ACTIVATE: clean up old caches =====
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ===== FETCH: cache-first for static assets, network-first for everything else =====
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Skip non-GET requests
  if (req.method !== 'GET') return;

  // Skip cross-origin requests (e.g. maps, external APIs)
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) {
    // Try network, fall back to cache for cross-origin
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  // Cache-first for same-origin requests
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        // Update cache in background
        fetch(req).then((res) => {
          if (res && res.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(req, res));
          }
        }).catch(() => {});
        return cached;
      }

      // Not in cache - fetch from network, cache if successful
      return fetch(req).then((res) => {
        if (!res || res.status !== 200 || res.type === 'opaque') {
          return res;
        }
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      }).catch(() => {
        // Offline fallback - serve cached index.html for navigation requests
        if (req.mode === 'navigate') {
          return caches.match('./index.html');
        }
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
