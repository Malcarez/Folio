/* Folio offline support. Rebuilt with a new version stamp whenever Folio changes. */
const VERSION = 'b1a4cbdeb033';
const APP = 'folio-app-' + VERSION, FONTS = 'folio-fonts';
const FILES = ['./', './index.html', './manifest.webmanifest', './icons/folio.svg', './icons/icon-192.png', './icons/icon-512.png',
  './icons/maskable-192.png', './icons/maskable-512.png', './icons/apple-touch-icon.png', './icons/icon-32.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(APP).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))));
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('folio-app-') && k !== APP) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // The app itself: always from the offline copy, so Folio opens instantly with or without internet.
    e.respondWith((async () => {
      const c = await caches.open(APP);
      const hit = req.mode === 'navigate' ? await c.match('./index.html') : await c.match(req, { ignoreSearch: true });
      return hit || fetch(req);
    })());
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    // Fonts: use the saved copy, refresh it in the background when online.
    e.respondWith((async () => {
      const c = await caches.open(FONTS); const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })());
  }
  // Anything else (for example a local AI server) goes straight to the network.
});
