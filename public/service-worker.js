// Choose a cache name
const cacheName = 'cache-v1';

// Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Open the cache
  event.respondWith(caches.open(cacheName).then((cache) => {
    // Go to the network first
    return fetch(event.request.url).then((fetchedResponse) => {
      cache.put(event.request, fetchedResponse.clone());

      return fetchedResponse;
    }).catch(() => {
      // If the network is unavailable, try cache
      return cache.match(event.request.url);
    });
  }));
});