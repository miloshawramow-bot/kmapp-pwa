// ===== KMapp Service Worker — MINIMAL (push only, NO caching) =====
// Caching removed — it caused stale file issues on mobile devices.
// The app works fine without offline caching. Push notifications only.

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

// On activate: delete ALL old caches (cleanup from previous SW versions)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); })
  );
  self.skipWaiting();
});
