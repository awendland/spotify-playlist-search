// Choose a cache name
const cacheName = 'cache-v1';

self.addEventListener("install", event => {
  event.waitUntil(caches.open(cacheName).then((cache) =>
    // Populate this list with the key resources required by the app to run.
    // You can figure out what these are by running Inspecting the page and
    // watching which network requests are made. Paths are relative to the
    // origin.
    cache.addAll([
      "/",
      "app.js"
    ])
  ))
})

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