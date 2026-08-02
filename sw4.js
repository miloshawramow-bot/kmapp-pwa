// ===== KMapp Service Worker — FINAL STABLE VERSION =====
// One SW to rule them all. No cache-busting tricks. No version churn.

const CACHE = 'kmapp-v163';
const VERSION = 'v163';

// Only pre-cache SMALL essential files. Large data files (imenik-data.js 3.8MB,
// akti-data.js 1.5MB, pelceri-data.js 51KB) are cached on-demand via fetch handler.
const PRECACHE = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './js/mammoth.browser.min.js',
  './js/loader.js',
  './js/tap-sound.js',
  './js/misc.js',
  './js/weather.js',
  './js/app-core.js',
  './js/app-akti.js',
  './js/app-imenik.js',
  './js/app-mapa.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png',
  './icons/apple-touch-icon.png'
];

// ===== INSTALL: cache small files only, skip waiting =====
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE).catch(() => {}))
  );
  self.skipWaiting();
});

// ===== ACTIVATE: delete old caches, claim clients =====
// NO postMessage — that caused infinite reload loops.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ===== FETCH: network-first for HTML, stale-while-revalidate for assets =====
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // let browser handle cross-origin

  // HTML: always network-first (get latest version)
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then((cache) => cache.put('./index.html', clone));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Everything else: stale-while-revalidate (serve cached, update in background)
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// ===== PUSH NOTIFICATIONS =====
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e) { data = { body: event.data ? event.data.text() : '' }; }
  event.waitUntil(
    self.registration.showNotification(data.title || 'KMapp', {
      body: data.body || '',
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      data: data.url || './'
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data || './'));
});

// ===== MESSAGE: handle update skip from page =====
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
