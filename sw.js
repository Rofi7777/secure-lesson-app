const CACHE_NAME = 'lingoverse-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/js/config.js',
  '/js/translations.js',
  '/js/data.js',
  '/js/utils.js',
  '/js/api.js',
  '/js/i18n.js',
  '/js/pinyin.js',
  '/js/auth.js',
  '/js/learning-tracker.js',
  '/js/views/platform.js',
  '/js/views/tutoring.js',
  '/js/views/storybook.js',
  '/js/views/ai-tutor.js',
  '/js/views/admin.js',
  '/js/app.js',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API calls, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API calls: always network
  if (url.hostname === 'generativelanguage.googleapis.com' ||
      url.hostname.includes('supabase')) {
    return;
  }

  // CDN resources: network-first with cache fallback
  if (url.hostname !== location.hostname) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Local static assets: cache-first, update in background
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
