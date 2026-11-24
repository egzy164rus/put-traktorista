/* Версионированный автономный кэш; сохранения пользователя не трогаем. */
const CACHE = 'put-traktorista-pwa-v5';
const ASSETS = ['./manifest.webmanifest', './icon/icon-192.png', './icon/icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // GitHub Pages отдаёт Cache-Control: max-age=600: нельзя допустить, чтобы
    // новый service worker сохранил старую HTML-страницу из HTTP-кэша.
    const html = await fetch('./index.html?release=5', {cache:'no-store'});
    if (!html.ok) throw new Error('Не удалось загрузить новую версию игры');
    await cache.put('./', html.clone());
    await cache.put('./index.html', html);
    await cache.addAll(ASSETS.map(url => new Request(url, {cache:'reload'})));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('put-traktorista-pwa-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url), root = new URL(self.registration.scope);
  if (url.origin !== root.origin || !url.pathname.startsWith(root.pathname)) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(new Request(request, {cache:'no-store'}));
        if (response.ok) {
          const copy = response.clone();
          try { const cache = await caches.open(CACHE); await cache.put('./index.html', copy); } catch (_) {}
        }
        return response;
      } catch (_) {
        const cached = await caches.match('./index.html');
        return cached || Response.error();
      }
    })());
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
});
