// KMapp SW v125 -> SELF DESTRUCT: this SW exists only to clean up old caches
// When the browser detects this file changed and updates the SW,
// it will immediately unregister itself, clear all caches, and reload clients
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll())
      .then(clients => clients.forEach(c => c.navigate(c.url)))
  );
});

// Network-only - never serve from cache
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
