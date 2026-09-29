/* のりもの あそび（ゲーム集）のオフライン用。
   ゲームを足したら CORE に1行足すと、最初からオフラインで遊べる。 */
const CACHE = 'norimono-hub-v5';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './back.js',
  './icons/menu-180.png',
  './icons/menu-192.png',
  './icons/menu-512.png',
  './atekko.html',
  './app.js',
  './style.css',
  './vehicles.js',
  './games/nakamawake/index.html',
  './games/nakamawake/style.css',
  './games/nakamawake/core.js',
  './games/nakamawake/nakama-data.js',
  './games/nakamawake/nakamawake.js',
  './games/minicar/index.html'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // 1つ欠けても全体が失敗しないように個別に入れる
      .then((c) => Promise.all(CORE.map((u) => c.add(u).catch(() => { }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => { });
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
