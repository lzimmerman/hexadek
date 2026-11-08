// Offline support. Network first, so an online player always gets the latest version; each file
// fetched is kept in the cache, which answers when there's no connection.
const CACHE = 'hexadek-v1';
const FILES = ['./', 'index.html', 'themes.js', 'fonts/lexend.css', 'fonts/lexend-latin.woff2',
  'fonts/lexend-latin-ext.woff2', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {   // drop caches from older versions of this file
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // The page and scripts are checked with the server every time: GitHub Pages lets browsers reuse a file for
  // 10 minutes (max-age=600), which kept an old version after a release. Unchanged files cost a small 304.
  const fresh = req.mode === 'navigate' || /\.(html|js|webmanifest)$/.test(new URL(req.url).pathname);
  e.respondWith(fetch(req, fresh ? { cache: 'no-cache' } : undefined).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true })
    .then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
