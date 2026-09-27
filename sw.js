/* オフラインで遊べるようにするための仕組み（Service Worker）
 * ファイルを更新したら、下の CACHE の番号（v1 → v2 …）を上げると確実に反映されます。 */
const CACHE = 'norimono-v3';
const FILES = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './vehicles.js',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// vehicles.js に書いた画像・音のファイルも保存しておく
try {
  importScripts('./vehicles.js');
  if (self.VEHICLES) {
    self.VEHICLES.forEach((v) => {
      if (v.image) FILES.push('./' + v.image);
      if (v.sound) FILES.push('./' + v.sound);
    });
  }
} catch (e) { }

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(FILES.map((f) => cache.add(f).catch(() => null)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 保存したものをすぐ使い、裏で新しいものに更新する
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req, { ignoreSearch: true }).then((cached) => {
        const net = fetch(req)
          .then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; })
          .catch(() => cached);
        return cached || net;
      })
    )
  );
});
