const CACHE = 'uploader-v1';
const ASSETS = ['/', '/index.html', '/src/app.js', '/manifest.webmanifest', '/src/icon.png'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS))));
self.addEventListener('fetch', (e) => e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request))));
