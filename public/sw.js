const CACHE_NAME = 'hdy-static-v2';
const STATIC_ASSETS = [
  '/offline.html',
  '/manifest.webmanifest',
  '/diambars/manifest.webmanifest',
  '/pwa/icon-192',
  '/pwa/icon-512',
  '/pwa/diambars-icon-192',
  '/pwa/diambars-icon-512'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline.html')));
    return;
  }

  const isStatic =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/diambars/manifest.webmanifest' ||
    url.pathname.startsWith('/pwa/') ||
    url.pathname === '/offline.html';

  if (!isStatic) return;

  event.respondWith(caches.match(request).then(cached => {
    if (cached) return cached;
    return fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    });
  }));
});
