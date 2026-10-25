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

// Take over from older service workers right away so fixes (like the auth
// bypass below) apply without closing every tab
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

// Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Let the browser handle the Spotify sign-in redirects and any API calls
  // that shouldn't be cached
  const url = new URL(event.request.url)
  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/.netlify/functions/auth-')
  ) {
    return
  }
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