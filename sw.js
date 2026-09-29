/* のりもの あそび（ゲーム集）のオフライン用。
   ゲームを足したら CORE に1行足すと、最初からオフラインで遊べる。
   ネットにつながっているときは いつも最新を使うので、更新はすぐ反映される。 */
const CACHE = 'norimono-hub-v9';
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
  './games/common/core.js',
  './games/nakamawake/nakama-data.js',
  './games/nakamawake/nakamawake.js',
  './games/minicar/index.html',
  './games/kazu/index.html',
  './games/kazu/style.css',
  './games/kazu/kazu.js'
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

// ネットにつながっていれば いつも最新を出し、その内容を保存しておく。
// つながらないとき（オフライン）だけ、保存しておいた内容を出す。
// （保存を先に出すと、新しい版に しても 1回目は古い画面が出てしまうため）
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => { });
      }
      return res;
    }).catch(() =>
      caches.match(e.request, { ignoreSearch: true })
        .then((hit) => hit || (e.request.mode === 'navigate' ? caches.match('./index.html') : undefined))
        .then((hit) => hit || Response.error())
    )
  );
});
