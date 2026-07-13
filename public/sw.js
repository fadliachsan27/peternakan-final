// Service Worker - Peternakan SKD Zoonosis PWA
// Bump this version any time precached files change, to force an update.
const CACHE_VERSION = 'v7';
const STATIC_CACHE = `skd-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `skd-runtime-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// Core "app shell" files needed for the app to boot while offline.
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/pengajuan.html',
  '/offline.html',
  '/manifest.json',
  '/css/custom.css',
  '/js/api.js',
  '/js/layout.js',
  '/js/dashboard.js',
  '/js/map.js',
  '/js/kasus.js',
  '/js/pengajuan-public.js',
  '/js/pengajuan-admin.js',
  '/js/pengaturan.js',
  '/js/hando-modal.js',
  '/admin/login.html',
  '/admin/dashboard.html',
  '/admin/kasus.html',
  '/admin/pengajuan.html',
  '/admin/pengaturan.html',
  '/admin/tindakan.html',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-512.png',
  '/favicon.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => console.warn('[SW] Gagal precache:', url, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isHeavyAsset(url) {
  return (
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname === '/favicon.ico'
  );
}

function isAppCode(url) {
  return url.pathname.startsWith('/css/') || url.pathname.startsWith('/js/');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isApiRequest(url)) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(
          JSON.stringify({ status: 'error', message: 'Tidak ada koneksi internet.' }),
          { headers: { 'Content-Type': 'application/json' }, status: 503 }
        )
      )
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  if (isAppCode(url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  if (isHeavyAsset(url) || request.destination === 'image' || request.destination === 'font') {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request))
  );
});
