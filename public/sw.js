// IMPORTANT: Increment version number to force cache invalidation for installed PWAs
const CACHE_NAME = 'xalt-moments-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Delete ALL old caches, including v1 and any previous versions
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete everything except the current cache
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Network-first strategy: always fetch fresh code from the server, never serve stale cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    // Try network first; only fall back to cache if offline
    fetch(event.request).then((response) => {
      // Cache the fresh response for next time
      if (response && response.status === 200 && response.type === 'basic') {
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
      }
      return response;
    }).catch(() => {
      // Only use cache as fallback when offline
      return caches.match(event.request);
    })
  );
});
