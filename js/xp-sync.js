/* CLINED — setoran XP ke server (buku besar). Antrean disimpan di localStorage, dikirim ulang sampai berhasil. */
(() => {
  'use strict';
  const QK = 'clined_xp_queue_v1', MAX_Q = 400;
  const rd = () => { try { const v = JSON.parse(localStorage.getItem(QK) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
  const wr = v => { try { localStorage.setItem(QK, JSON.stringify(v.slice(-MAX_Q))); } catch {} };
  let busy = false, timer = null, firstQueuedAt = 0;
  const loggedIn = () => { try { return typeof authCurrentUser === 'function' && !!authCurrentUser(); } catch { return false; } };

  function enqueue(kind, ref, amount, block) {
    const a = Math.round(Number(amount));
    if (!ref || !(a > 0)) return;
    const item = { kind: kind || 'quiz', ref: String(ref).slice(0, 80), amount: a };
    if (block) item.block = String(block).trim().slice(0, 60);
    const q = rd(); q.push(item); wr(q);
    if (!firstQueuedAt) firstQueuedAt = Date.now();
    // Jangan biarkan timer terus ter-reset saat user menjawab soal berturut-turut:
    // flush segera jika sudah >= 8 event atau melewati batas tunggu 2.5 detik.
    if (q.length >= 8 || (Date.now() - firstQueuedAt) >= 2500) {
      clearTimeout(timer); timer = null;
      flush();
    } else if (!timer) {
      timer = setTimeout(() => { timer = null; flush(); }, 900);
    }
  }
  async function flush() {
    if (busy || !loggedIn()) return;
    const q = rd(); if (!q.length) { firstQueuedAt = 0; return; }
    busy = true;
    try {
      const batch = q.slice(0, 50);
      const clientId = window.CLINED_ONLINE_SYNC?.clientId || '';
      const r = await fetch('/api/xp', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId, events: batch }) });
      if (r.ok) {
        const d = await r.json().catch(() => ({}));
        if (d?.unlocked100k?.unlocked) window.CLINED_XP_100K?.onUnlock?.(d.unlocked100k);
        const srvXp = Math.round(Number(d?.xpAllTime) || 0);
        if (srvXp > 0) {
          try {
            const locXp = Math.round(Number(JSON.parse(localStorage.getItem('gaster_v11_xp') || '0')) || 0);
            if (srvXp > locXp) {
              localStorage.setItem('gaster_v11_xp', String(srvXp));
              window.renderXP?.();
              window.syncUabStats?.();
            }
          } catch {}
        }
        const rest = rd().slice(batch.length);
        wr(rest);
        if (rest.length) { busy = false; return flush(); }
        firstQueuedAt = 0;
      }
      else if (r.status >= 400 && r.status < 500 && r.status !== 401 && r.status !== 429) {
        wr(rd().slice(batch.length)); // data ditolak, buang agar tidak macet
      }
    } catch {} finally { busy = false; }
  }
  function flushBeacon() {
    try {
      if (!navigator.onLine || !loggedIn()) return;
      const batch = rd().slice(0, 50);
      if (!batch.length) return;
      const clientId = window.CLINED_ONLINE_SYNC?.clientId || '';
      fetch('/api/xp', {
        method: 'POST',
        credentials: 'same-origin',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, events: batch })
      }).catch(() => {});
    } catch {}
  }
  setInterval(flush, 30000);
  window.addEventListener('online', flush);
  window.addEventListener('clined:auth-ready', flush);
  window.addEventListener('pagehide', flushBeacon);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushBeacon();
    else flush();
  });
  setTimeout(flush, 2500);
  window.CLINED_XP = { enqueue, flush };
})();
