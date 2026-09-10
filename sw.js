const CACHE='clined-web-v40-loading-bounce';
const CORE=['./', './index.html', './apple-touch-icon.png', './assets/clined-logo.png', './assets/delta14-logo.png', './assets/flashcards/brain.svg', './assets/flashcards/ecg.svg', './assets/flashcards/eye.svg', './assets/flashcards/heart.svg', './assets/flashcards/kidney.svg', './assets/flashcards/liver.svg', './assets/flashcards/lung.svg', './assets/flashcards/skin.svg', './assets/normal-values.jpeg', './banks/gaster-2023.json', './banks/manifest.json', './banks/pulmonis-2022.json', './banks/ssp-2021.json', './banks/kedkel-2020.json', './banks/kedkel-2021.json', './banks/kedkel-2022.json', './banks/kedkom-2020.json', './banks/kedkom-2021.json', './css/style.css', './css/motion.css', './favicon-32.png', './icon-192.png', './icon-512.png', './icon.svg', './js/app.js', './js/content-manager.js', './js/auth-gate.js', './js/photo-compress.js', './js/photo-store.js', './js/bank_2021.js', './js/bank_pulmonis.js', './js/question-bank-engine.js', './json/manifest.json', './manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));

// Endpoint GET yang isinya "hampir statis" (bank soal, daftar paket) boleh
// network-first + fallback cache supaya tetap kebuka offline / saat server cold-start lambat.
// Auth, sync, dan foto SENGAJA tidak pernah di-cache (data sesi/privat per user).
const API_CACHEABLE = [/^\/api\/health$/, /^\/api\/banks(\/[a-z0-9_-]+)?$/i, /^\/api\/content\/packages$/];

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin) return;

  if(url.pathname.startsWith('/api/')){
    if(!API_CACHEABLE.some(rx=>rx.test(url.pathname))) return;
    e.respondWith(
      fetch(req).then(res=>{
        if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});}
        return res;
      }).catch(()=>caches.match(req).then(cached=>cached||new Response(JSON.stringify({error:'Tidak ada koneksi dan tidak ada cache tersimpan.'}),{status:503,headers:{'Content-Type':'application/json'}})))
    );
    return;
  }

  // Kode aplikasi, HTML, CSS, dan manifest harus selalu mencoba versi server
  // terlebih dahulu. Cache hanya menjadi fallback offline agar kode lama tidak
  // mengambil alih setelah refresh/deployment baru.
  const liveAsset = /\.(?:html|css|js|mjs|webmanifest)$/i.test(url.pathname) || url.pathname==='/' || url.pathname==='/sw.js';
  if(liveAsset){
    e.respondWith(
      fetch(req).then(res=>{
        if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});}
        return res;
      }).catch(()=>caches.match(req).then(cached=>cached||caches.match('./index.html').then(fallback=>fallback||new Response('Offline',{status:503}))))
    );
    return;
  }

  // Gambar/font/asset besar tetap cache-first untuk pengalaman offline yang cepat.
  e.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(res=>{
    if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});}
    return res;
  }).catch(()=>caches.match('./index.html'))));
});
