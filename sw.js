// Service worker: guarda o app em cache para funcionar offline.
// Estratégia "stale-while-revalidate": responde do cache e atualiza em segundo plano.
const CACHE = 'gym-v2';
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const ASSETS = ['./', 'index.html', 'styles.css', 'app.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (url.origin !== location.origin && !FONT_HOSTS.includes(url.hostname)) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req, { ignoreSearch: url.origin === location.origin });
      const net = fetch(req)
        .then((res) => { if (res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res; })
        .catch(() => hit);
      return hit || net;
    })
  );
});
