// ─────────────────────────────────────────────────────────────
//  SERVICE WORKER · guarda l'app al mòbil perquè funcioni offline
//  ⚠️ Cada cop que pugis canvis a GitHub, augmenta VERSION
//     perquè els mòbils descarreguin la versió nova.
// ─────────────────────────────────────────────────────────────
const VERSION = 'v1.0.0';
const CACHE = 'marinedex-' + VERSION;
const RUNTIME = 'marinedex-runtime';

const CORE = [
  './', './index.html', './manifest.webmanifest',
  './css/styles.css',
  './js/app.js', './js/store.js', './js/config.js',
  './js/data/species.js', './js/data/badges.js', './js/data/countries.js',
  './vendor/leaflet/leaflet.js', './vendor/leaflet/leaflet.css', './vendor/topojson-client.min.js',
  './data/world-50m.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png',
];
const FB_VERSION = '10.12.2';
const EXTERNAL = [
  `https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-app.js`,
  `https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-firestore.js`,
  'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Outfit:wght@300;400;500;600;700&display=swap',
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE);
    const rt = await caches.open(RUNTIME);
    await Promise.all(EXTERNAL.map(u => fetch(u, { mode: 'cors' }).then(r => r.ok && rt.put(u, r)).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE && k !== RUNTIME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Pàgina: sempre respon amb l'index guardat (funciona sense cobertura)
  if (req.mode === 'navigate' && url.origin === location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match('./index.html');
      const network = fetch(req).then(r => { if (r.ok) cache.put('./index.html', r.clone()); return r; }).catch(() => null);
      return cached || (await network) || new Response('Sense connexió', { status: 503 });
    })());
    return;
  }

  // Fitxers de l'app: memòria primer, i s'actualitza en segon pla
  if (url.origin === location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req, { ignoreSearch: true });
      const network = fetch(req).then(r => { if (r.ok) cache.put(req, r.clone()); return r; }).catch(() => null);
      return cached || (await network) || new Response('', { status: 504 });
    })());
    return;
  }

  // SDK de Firebase i tipografies: memòria primer
  if (url.hostname === 'www.gstatic.com' || url.hostname.endsWith('fonts.googleapis.com') || url.hostname === 'fonts.gstatic.com') {
    event.respondWith((async () => {
      const cache = await caches.open(RUNTIME);
      const cached = await cache.match(req);
      if (cached) return cached;
      try { const r = await fetch(req); if (r.ok || r.type === 'opaque') cache.put(req, r.clone()); return r; }
      catch { return new Response('', { status: 504 }); }
    })());
  }
  // La resta (Firestore) va directa a la xarxa
});
