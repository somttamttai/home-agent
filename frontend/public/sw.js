// home-agent Service Worker
// v2: document 요청은 network-first 로 바꿔서 배포 직후 stale HTML 문제 방지.
const CACHE = 'home-agent-v2';
const PRECACHE = ['/', '/manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // API: 항상 네트워크 (오프라인 시 마지막 캐시 시도)
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  // HTML (네비게이션): network-first → 캐시 fallback
  // 이렇게 해야 새 배포가 나오면 즉시 새 bundle hash 를 가진 index.html 을 받아옴.
  const isDocument =
    request.mode === 'navigate' ||
    request.destination === 'document' ||
    (request.headers.get('accept') || '').includes('text/html');

  if (isDocument) {
    e.respondWith(
      fetch(request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put('/', copy)).catch(() => {});
          return resp;
        })
        .catch(async () => (await caches.match(request)) || caches.match('/')),
    );
    return;
  }

  // 해시가 찍힌 정적 에셋 / 이미지: cache-first
  e.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((resp) => {
          // 성공한 동일 오리진 요청만 캐시
          if (resp && resp.ok && resp.type === 'basic') {
            const copy = resp.clone();
            caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          }
          return resp;
        }),
    ),
  );
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
    }),
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.openWindow('/'));
});
