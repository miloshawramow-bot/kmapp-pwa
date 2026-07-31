// KMapp Service Worker v47 - network-first for HTML, cache-first for assets, push notifications
const CACHE = 'kmapp-v65';
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
        keys.map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ===== FETCH: network-first for HTML, cache-first for assets =====
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }
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
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
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
      });
    })
  );
});

// ===== PUSH: notification when push message arrives (app closed) =====
self.addEventListener('push', (event) => {
  let data = { title: 'KMapp - Nova poruka', body: 'Imate novu poruku' };
  try {
    if (event.data) data = event.data.json();
  } catch(e) {
    if (event.data) data.body = event.data.text();
  }
  const options = {
    body: data.body || 'Imate novu poruku',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'kmapp-push',
    renotify: true,
    data: { url: data.url || 'https://miloshawramow-bot.github.io/kmapp-pwa/' }
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'KMapp - Nova poruka', options)
  );
});

// ===== NOTIFICATION CLICK: open/focus the app =====
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || 'https://miloshawramow-bot.github.io/kmapp-pwa/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('kmapp-pwa') && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

// ===== MESSAGE: allow page to trigger immediate update =====
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
