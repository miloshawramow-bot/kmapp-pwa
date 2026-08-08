// KMapp Service Worker v200 — improved offline caching + push notifications
const CACHE = 'kmapp-v200';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './js/mammoth.browser.min.js',
  './js/imenik-photos.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/favicon-16.png',
  './icons/beograd-grb.png',
  './assets/beograd-bg.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// API responses to cache for offline use (stale-while-revalidate)
const CACHEABLE_API = ['/getInbox', '/getSent', '/getUsers'];
const OFFLINE_FALLBACK = './index.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS).catch(err => console.warn('SW: some assets failed', err)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter(k => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Skip non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // Navigation requests (HTML pages) — network-first with offline fallback
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => {
          return caches.match('./index.html').then(r => r || caches.match(req)).then(r => r || new Response('Offline', { status: 503 }));
        })
    );
    return;
  }

  // API requests — stale-while-revalidate for cacheable endpoints
  if (url.pathname.includes('/api/')) {
    const apiPath = '/' + url.pathname.split('/').pop();
    if (CACHEABLE_API.includes(apiPath)) {
      event.respondWith(
        caches.open(CACHE).then(async (cache) => {
          const cached = await cache.match(req);
          const networkPromise = fetch(req).then(res => {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          }).catch(() => cached);
          return cached || networkPromise;
        })
      );
      return;
    }
    // Non-cacheable API — network only
    event.respondWith(fetch(req).catch(() => new Response('{"error":"offline"}', { headers: { 'Content-Type': 'application/json' } })));
    return;
  }

  // External resources (Leaflet CDN, OSM tiles, etc.) — cache-first
  if (url.origin !== self.location.origin) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) {
          // Revalidate in background
          fetch(req).then(res => {
            if (res && res.status === 200) caches.open(CACHE).then(cache => cache.put(req, res));
          }).catch(() => {});
          return cached;
        }
        return fetch(req).then(res => {
          if (!res || res.status !== 200) return res;
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(req, clone));
          return res;
        }).catch(() => cached || new Response('', { status: 503 }));
      })
    );
    return;
  }

  // Same-origin static assets — stale-while-revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        fetch(req).then((res) => {
          if (res && res.status === 200) {
            caches.open(CACHE).then((cache) => cache.put(req, res));
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(req).then((res) => {
        if (!res || res.status !== 200) return res;
        const resClone = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, resClone));
        return res;
      }).catch(() => caches.match(OFFLINE_FALLBACK));
    })
  );
});

// ===== BACKGROUND SYNC (retry failed sends when online) =====
self.addEventListener('sync', (event) => {
  if (event.tag === 'retry-send-message') {
    event.waitUntil(
      self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
        clients.forEach(c => c.postMessage({ type: 'RETRY_SEND' }));
      })
    );
  }
});

// ===== PUSH NOTIFICATIONS =====
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received!', event);
  
  let data = { title: 'KMapp', body: 'Nova poruka', url: 'https://kmapp-n37.pages.dev/' };
  try {
    if (event.data) data = event.data.json();
  } catch(e) {
    if (event.data) data.body = event.data.text();
  }
  
  // LOG to server: SW received the push event
  var logPromise = fetch('https://kmapp-n37.pages.dev/api/pushLog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'sw-log', event: 'push-received', detail: (data.title || '') + ': ' + (data.body || '').substring(0, 50) })
  }).catch(function(e) { console.log('[SW] Log failed:', e); });
  
  // MINIMAL notification options — remove anything that might cause silent failure
  var options = {
    body: data.body || 'Nova poruka',
    icon: './icons/icon-192.png',
    tag: 'kmapp-push',
    data: { url: data.url || 'https://kmapp-n37.pages.dev/' }
  };
  
  console.log('[SW] Showing notification:', data.title || 'KMapp', options);
  
  // Show notification — catch any error and log it
  var notifPromise = self.registration.showNotification(data.title || 'KMapp', options)
    .then(function() {
      console.log('[SW] Notification shown successfully');
      // Log success
      return fetch('https://kmapp-n37.pages.dev/api/pushLog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'sw-log', event: 'notification-shown', detail: 'OK' })
      }).catch(function() {});
    })
    .catch(function(err) {
      console.error('[SW] showNotification FAILED:', err);
      // Log failure
      return fetch('https://kmapp-n37.pages.dev/api/pushLog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'sw-log', event: 'showNotification-error', detail: String(err.message || err) })
      }).catch(function() {});
    });
  
  // Notify open clients
  var clientPromise = self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clients) {
    clients.forEach(function(client) {
      client.postMessage({ type: 'push-received', title: data.title, body: data.body });
    });
  });
  
  event.waitUntil(Promise.all([notifPromise, logPromise, clientPromise]));
});

// Clear badge when notification is clicked
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Clear badge
  try {
    if (self.clearAppBadge) { self.clearAppBadge(); }
    else if (self.registration.clearAppBadge) { self.registration.clearAppBadge(); }
  } catch(e) {}
  const targetUrl = (event.notification.data && event.notification.data.url) || 'https://kmapp-n37.pages.dev/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('kmapp') && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', url: targetUrl });
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE });
  }
});
