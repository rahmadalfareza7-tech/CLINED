/* CLINED — setoran XP ke server (buku besar). Antrean disimpan di localStorage, dikirim ulang sampai berhasil. */
(() => {
  'use strict';
  const QK = 'clined_xp_queue_v1', MAX_Q = 400;
  const rd = () => { try { const v = JSON.parse(localStorage.getItem(QK) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
  const wr = v => { try { localStorage.setItem(QK, JSON.stringify(v.slice(-MAX_Q))); } catch {} };
  let busy = false, timer = null;
  const loggedIn = () => { try { return typeof authCurrentUser === 'function' && !!authCurrentUser(); } catch { return false; } };

  function enqueue(kind, ref, amount) {
    const a = Math.round(Number(amount));
    if (!ref || !(a > 0)) return;
    const q = rd(); q.push({ kind: kind || 'quiz', ref: String(ref).slice(0, 80), amount: a }); wr(q);
    clearTimeout(timer); timer = setTimeout(flush, 1500);
  }
  async function flush() {
    if (busy || !loggedIn()) return;
    const q = rd(); if (!q.length) return;
    busy = true;
    try {
      const batch = q.slice(0, 50);
      const r = await fetch('/api/xp', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ events: batch }) });
      if (r.ok) { wr(rd().slice(batch.length)); if (rd().length) { busy = false; return flush(); } }
      else if (r.status >= 400 && r.status < 500 && r.status !== 401 && r.status !== 429) wr(rd().slice(batch.length)); // data ditolak, buang agar tidak macet
    } catch {} finally { busy = false; }
  }
  setInterval(flush, 45000);
  window.addEventListener('online', flush);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) flush(); });
  setTimeout(flush, 4000);
  window.CLINED_XP = { enqueue, flush };
})();
