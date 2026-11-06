/* Item stats: kumpulkan distribusi jawaban per soal (anonim) dan kirim berkala ke server untuk analisis butir soal.
   Disimpan di key tanpa prefix clined_/gaster_ agar TIDAK ikut tersinkron sebagai data akun. */
(() => {
  'use strict';
  const KEY = 'item_delta_v1', MAX_ITEMS = 300;
  let queue = {}, timer = 0, blockedUntil = 0, flushing = false;
  try { queue = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { queue = {}; }
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(queue)); } catch {} };

  function track(q, good) {
    if (q && q.bank === 'userbank') return;                                               // soal buatan sendiri: jangan dikirim ke server
    let p, ci, src = 'bank';
    if (q && q.stat) { p = q.stat.p; ci = q.stat.ci; src = 'mat'; }                       // Latihan Materi (sudah indeks asli)
    else if (q && Array.isArray(q._order) && q.jawabanBenar != null) {                    // kuis utama (opsi diacak)
      const sel = Number.isInteger(window.selectedAnswer) ? window.selectedAnswer : (typeof selectedAnswer !== 'undefined' ? selectedAnswer : q.selectedAnswer);
      if (!Number.isInteger(sel)) return;
      p = q._order[sel]; ci = q._order[q.jawabanBenar];
    } else return;
    if (!Number.isInteger(p) || !Number.isInteger(ci) || p < 0 || p > 4 || ci < 0 || ci > 4 || !q.id) return;
    const id = String(q.id);
    if (!queue[id] && Object.keys(queue).length >= MAX_ITEMS) return;
    const d = queue[id] || (queue[id] = { id, n: 0, w: 0, o: [0, 0, 0, 0, 0], ci, src, bank: String(q.bank || '').slice(0, 60), s: '' });
    d.n++; if (!good) d.w++; d.o[p]++; d.ci = ci;
    if (!d.s) d.s = String(q.soal || '').replace(/\s+/g, ' ').trim().slice(0, 180);
    persist();
    clearTimeout(timer); timer = setTimeout(flush, 4000);
  }

  async function flush(keepalive = false) {
    if (flushing || Date.now() < blockedUntil) return;
    const ids = Object.keys(queue).slice(0, 50);
    if (!ids.length || navigator.onLine === false) return;
    flushing = true;
    const items = ids.map(id => queue[id]);
    try {
      const r = await fetch('/api/item-stats', { method: 'POST', credentials: 'same-origin', keepalive: keepalive === true,
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) });
      if (r.ok) {
        // kurangi hanya yang sudah terkirim (jawaban baru yang masuk selama request tetap tersimpan)
        items.forEach(sent => {
          const cur = queue[sent.id]; if (!cur) return;
          cur.n -= sent.n; cur.w -= sent.w; cur.o = cur.o.map((c, k) => c - sent.o[k]);
          if (cur.n <= 0) delete queue[sent.id];
        });
        persist();
      } else if (r.status === 401 || r.status === 403) blockedUntil = Date.now() + 10 * 60000;   // belum login
      else if (r.status >= 400 && r.status < 500) { ids.forEach(id => delete queue[id]); persist(); }   // payload ditolak: buang
      else blockedUntil = Date.now() + 2 * 60000;
    } catch { blockedUntil = Date.now() + 2 * 60000; }
    flushing = false;
    if (Object.keys(queue).length) { clearTimeout(timer); timer = setTimeout(flush, 15000); }
  }

  // Persentase benar dari semua pengguna (hanya tampil jika sudah ≥20 jawaban).
  const crowd = new Map();
  async function crowdFor(id) {
    if (crowd.has(id)) return crowd.get(id);
    const p = fetch('/api/item-stats/public?ids=' + encodeURIComponent(id), { credentials: 'same-origin' })
      .then(r => r.ok ? r.json() : null).then(d => d && d.stats && d.stats[id] || null).catch(() => null);
    crowd.set(id, p); return p;
  }
  async function showCrowd(q) {
    if (!q || !q.id || q.bank === 'userbank') return;
    const st = await crowdFor(String(q.id)); if (!st) return;
    const put = () => {
      const box = document.querySelector('.view.active #explain, .view.active .ml-explain'); if (!box) return false;
      box.querySelector('.crowd-stat')?.remove();
      const el = document.createElement('div'); el.className = 'crowd-stat';
      el.textContent = `📊 ${st.correct}% mahasiswa menjawab benar (dari ${st.n} jawaban)`;
      box.insertBefore(el, box.firstChild); return true;
    };
    if (!put()) setTimeout(put, 350);
  }

  // Bungkus fungsi pencatat performa milik app agar semua jalur menjawab ikut terhitung.
  function hook() {
    const orig = window.recordQuestionPerformance;
    if (typeof orig !== 'function' || orig.__itemStats) return false;
    const wrapped = function (q, good) { try { track(q, good); } catch {} try { showCrowd(q); } catch {} return orig.apply(this, arguments); };
    wrapped.__itemStats = true;
    window.recordQuestionPerformance = wrapped;
    return true;
  }
  if (!hook()) window.addEventListener('load', hook);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(true); });
  window.addEventListener('online', () => flush());
  setTimeout(flush, 8000);
  window.CLINED_ITEM_STATS = { track, flush, _queue: () => queue };
})();
