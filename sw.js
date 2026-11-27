const SW_VERSION = 'v260-online-only-hardening-ci';
const CACHE = 'clined-web-' + SW_VERSION;
const CORE = [
  './app.html',
  './index.html',
  './css/landing.css',
  './css/polish.css',
  './css/design-system.css',
  './css/desktop.css',
  './css/clined-ui-fixes.css',
  './css/clined-inline-extracted.css',
  './css/duel-native.css',
  './css/home-ergonomic.css',
  './css/latihan-materi.css',
  './css/style.css',
  './css/motion.css',
  './css/meja-jaga-igd.css',
  './css/rujuk-langka.css',
  './css/blok-lysis.css',
  './js/error-monitor.js',
  './js/online-guard.js',
  './js/floating-nav.js',
  './js/update-notice.js',
  './js/online-sync.js',
  './js/ability-classifier.js',
  './js/champion-tags.js',
  './js/kedkel-2026-materi.js',
  './js/landing.js',
  './js/pwa-install.js',
  './js/app.js',
  './js/inline-boot.js',
  './js/content-manager.js',
  './js/auth-gate.js',
  './js/lazy-loader.js',
  './js/meja-jaga-igd-data.js',
  './js/meja-jaga-igd-gen.js',
  './js/meja-jaga-igd.js',
  './js/rujuk-langka-data.js',
  './js/rujuk-langka.js',
  './js/blok-lysis.js',
  './js/latihan-materi.js',
  './js/onboarding.js',
  './js/userbank-parser.js',
  './js/userbank.js',
  './js/usage.js',
  './js/social.js',
  './js/xp-sync.js',
  './js/photo-compress.js',
  './js/photo-store.js',
  './js/question-bank-engine.js',
  './assets/fonts/igd/nunito-600.woff2',
  './assets/fonts/igd/caveat-700.woff2',
  './apple-touch-icon.png',
  './assets/clined-logo.png',
  './assets/flashcards/brain.svg',
  './assets/flashcards/ecg.svg',
  './assets/flashcards/eye.svg',
  './assets/flashcards/heart.svg',
  './assets/flashcards/kidney.svg',
  './assets/flashcards/liver.svg',
  './assets/flashcards/lung.svg',
  './assets/flashcards/skin.svg',
  './assets/normal-values.jpeg',
  './favicon-32.png',
  './icon-192.png',
  './icon-512.png',
  './icon.svg',
  './manifest.webmanifest'
];

const ONLINE_REQUIRED_HTML = `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CLINED — Koneksi Internet Diperlukan</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#0f172a;color:#f8fafc;font:600 15px/1.55 system-ui,-apple-system,sans-serif;text-align:center}.card{max-width:420px;background:#1e293b;border:1px solid rgba(148,163,184,.28);border-radius:20px;padding:26px 22px;box-shadow:0 18px 40px rgba(0,0,0,.35)}h1{margin:0 0 8px;font-size:21px;color:#38bdf8}p{margin:0 0 18px;color:#cbd5e1;font-size:14px}a{display:inline-block;padding:11px 20px;border-radius:12px;background:#22c55e;color:#052e16;font-weight:800;text-decoration:none}</style>
</head><body><main class="card"><h1>📡 Koneksi Internet Diperlukan</h1><p>CLINED adalah aplikasi belajar online dan tidak tersedia dalam mode offline. Sambungkan internet untuk membuka soal, progres akun, dan leaderboard.</p><a href="./app.html">Coba Muat Ulang</a></main></body></html>`;

function fetchWithTimeout(req, opts, timeoutMs = 6000) {
  if (typeof AbortController === 'undefined') return fetch(req, opts);
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(req, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(id));
}

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.allSettled(
      CORE.map(u =>
        fetch(new Request(u, { cache: 'reload' }))
          .then(res => (res.ok ? c.put(u, res) : undefined))
      )
    );
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      try { w.postMessage({ type: 'SW_ACTIVATED', version: SW_VERSION }); } catch {}
    }
  })());
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING' || e.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (e.data?.type === 'GET_SW_VERSION') {
    try { e.source?.postMessage?.({ type: 'SW_VERSION', version: SW_VERSION }); } catch {}
  }
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // CLINED adalah aplikasi online: endpoint /api/ selalu jaringan langsung (tidak pernah disajikan dari cache offline).
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(req).catch(() =>
        new Response(JSON.stringify({ error: 'CLINED membutuhkan koneksi internet. Periksa jaringanmu lalu coba lagi.' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
        })
      )
    );
    return;
  }

  // Kode aplikasi, HTML, CSS, dan manifest selalu ambil versi server terbaru (network-first).
  // Cache shell hanya menjadi pengaman saat jaringan mobile lambat/timeout agar iOS/iPadOS PWA tidak layar putih.
  const isHtmlNav = req.mode === 'navigate' || /\.html$/i.test(url.pathname) || url.pathname === '/';
  const liveAsset = isHtmlNav || /\.(?:css|js|mjs|webmanifest)$/i.test(url.pathname) || url.pathname === '/sw.js';
  if (liveAsset) {
    e.respondWith(
      fetchWithTimeout(req, { cache: 'no-store' }, 6000).then(res => {
        if (res.ok && url.pathname !== '/sw.js') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(async () => {
        const exact = await caches.match(req);
        if (exact) return exact;
        const ignored = await caches.match(req, { ignoreSearch: true });
        if (ignored) return ignored;
        if (isHtmlNav) {
          return new Response(ONLINE_REQUIRED_HTML, {
            status: 503,
            headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
          });
        }
        return new Response('Koneksi internet diperlukan.', { status: 503 });
      })
    );
    return;
  }

  // Gambar & font statis memakai cache-first agar muat halaman lebih cepat saat online.
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => new Response('', { status: 503 })))
  );
});

// ───── Web Push (notifikasi chat) ─────
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch {}
  const title = d.title || 'CLINED';
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (wins.some(c => c.visibilityState === 'visible' && c.focused)) return;
    await self.registration.showNotification(title, {
      body: d.body || 'Pesan baru',
      tag: d.tag || 'chat',
      renotify: true,
      icon: './icon-192.png',
      badge: './favicon-32.png',
      data: { url: d.url || './app.html' },
      timestamp: Date.now()
    });
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || './app.html', self.registration.scope).href;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const id = new URL(url).searchParams.get('chat');
    for (const c of wins) {
      if (c.url.startsWith(self.registration.scope)) {
        try { await c.focus(); } catch {}
        c.postMessage({ type: 'open-chat', id });
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
