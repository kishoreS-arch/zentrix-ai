const CACHE_NAME = 'zentrix-pwa-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-512.png',
  '/zentrix-logo.png'
];

// INSTALL: Cache static shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .catch(err => console.warn('Cache install error:', err))
  );
  self.skipWaiting(); // Activate immediately
});

// ACTIVATE: Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim(); // Take control immediately
});

// FETCH: Network-first strategy with cache fallback
self.addEventListener('fetch', event => {
  const { request } = event;

  // Skip non-GET and cross-origin (Firebase, API, Google etc.)
  if (request.method !== 'GET') return;
  
  const url = new URL(request.url);
  
  // Only cache our own origin assets
  if (url.origin !== self.location.origin) return;
  
  // Skip Firebase Auth requests — never cache these
  if (url.pathname.includes('/__/auth/')) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        // Successful network response — update cache in background
        if (response && response.status === 200 && response.type === 'basic') {
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, clonedResponse);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed — serve from cache
        return caches.match(request)
          .then(cached => {
            if (cached) return cached;
            // For navigation requests (page loads), serve the app shell
            if (request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            return new Response('Offline', { status: 503 });
          });
      })
  );
});
