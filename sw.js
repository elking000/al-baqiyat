const CACHE_NAME = 'baqiyat-v20';
const RUNTIME_CACHE = 'baqiyat-runtime-v12';
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/fonts/quran.otf',
  '/quran-lines.json',
  '/pages-meta.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME && k !== RUNTIME_CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // بيانات الشيت وApps Script: شبكة فقط دائماً — لا تُخزَّن لتبقى بيانات الصفحات ودفتر العزاء حية
  if (url.hostname === 'docs.google.com' || url.hostname === 'script.google.com') {
    e.respondWith(fetch(e.request));
    return;
  }

  // مانيفست ديناميكي: التطبيق المثبت من صفحة فقيد يفتح على نفس الصفحة مباشرة (إصلاح آيفون)
  // (نفس مخرجات دالة الخادم /api/manifest — هذه النسخة تخدم الزيارات التي يعمل فيها الـ Service Worker)
  if (url.origin === self.location.origin && (url.pathname === '/manifest.webmanifest' || url.pathname === '/api/manifest')) {
    const mSlug = url.searchParams.get('page') || '';
    const dynManifest = {
      name: mSlug ? 'صدقة جارية' : 'منصة الباقيات',
      short_name: mSlug ? 'صدقة جارية' : 'الباقيات',
      id: mSlug ? ('/?page=' + encodeURIComponent(mSlug)) : '/',
      start_url: mSlug ? ('/?page=' + encodeURIComponent(mSlug)) : '/',
      scope: '/',
      display: 'standalone',
      background_color: '#f8f9fa',
      theme_color: '#0f4c3a',
      orientation: 'portrait',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
      ]
    };
    e.respondWith(new Response(JSON.stringify(dynManifest), { headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' } }));
    return;
  }

  // صور المصحف المصوّر (مصحف المدينة): الكاش أولاً وتُحفظ أثناء القراءة
  if (url.hostname === 'raw.githubusercontent.com') {
    e.respondWith(
      caches.open(RUNTIME_CACHE).then((cache) =>
        cache.match(e.request).then((cached) => {
          if (cached) return cached;
          return fetch(e.request).then((res) => {
            if (res && res.status === 200) cache.put(e.request, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

  // نفس النطاق: الكاش أولاً، وما ليس مخزناً يُجلب من الشبكة ويُحفظ
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy));
          }
          return res;
        });
      })
    );
    return;
  }

  // باقي الطلبات الخارجية (خطوط جوجل وصور الضيوف وQR): الكاش أولاً كأفضل جهد ثم الشبكة
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
