// home-agent Service Worker
const CACHE = 'home-agent-v1';
const PRECACHE = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  // API 는 네트워크 우선, 정적은 캐시 우선
  if (new URL(request.url).pathname.startsWith('/api/')) {
    e.respondWith(fetch(request).catch(() => caches.match(request)));
  } else {
    e.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
  }
});

// 푸시 알림
self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : { title: 'home-agent', body: '재고 확인이 필요해요' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/manifest.json',
      badge: '/manifest.json',
      tag: 'home-agent-alert',
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.openWindow('/'));
});
