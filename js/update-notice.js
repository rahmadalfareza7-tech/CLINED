/* CLINED — pemberitahuan "versi baru tersedia" + muat ulang otomatis saat aman (tidak sedang mengerjakan soal). */
(() => {
  'use strict';
  if (!('serviceWorker' in navigator)) return;
  const BUSY_VIEWS = new Set(['quiz', 'duelPage', 'materiLatihanPage', 'flashcards', 'clinicalQuestPage', 'studyTimerPage', 'userBankPage']);
  let seenController = !!navigator.serviceWorker.controller;
  let pending = false, dismissed = false, reloading = false, banner = null, poll = null, lastCheck = 0;

  const activeView = () => document.querySelector('.view.active')?.id || '';
  function isSafe() {
    if (document.visibilityState !== 'visible') return false;
    if (BUSY_VIEWS.has(activeView())) return false;
    if (document.querySelector('.cdlg-layer, .rq-layer, .stc-layer')) return false;       // ada dialog terbuka
    for (const el of document.querySelectorAll('textarea, input[type=text], input[type=search]')) {
      if (el.offsetParent !== null && el.value && el.value.length > 0) return false;      // ada isian yang belum dikirim
    }
    return true;
  }
  function render(mode) {
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'upd-banner'; banner.setAttribute('role', 'status'); banner.setAttribute('aria-live', 'polite');
      document.body.appendChild(banner);
      banner.addEventListener('click', e => {
        if (e.target.closest('[data-upd-now]')) doReload(true);
        if (e.target.closest('[data-upd-later]')) { dismissed = true; hide(); }
      });
    }
    banner.innerHTML = mode === 'busy'
      ? '<span class="upd-ico" aria-hidden="true">🔄</span><span class="upd-tx">Versi baru siap</span><button type="button" class="upd-btn" data-upd-now>Muat ulang</button><button type="button" class="upd-x" data-upd-later aria-label="Nanti saja">✕</button>'
      : '<span class="upd-ico" aria-hidden="true">🔄</span><span class="upd-tx">Memperbarui aplikasi…</span>';
    requestAnimationFrame(() => banner && banner.classList.add('show'));
  }
  function hide() { if (banner) { banner.classList.remove('show'); const b = banner; banner = null; setTimeout(() => b.remove(), 300); } }
  function doReload(force) {
    if (reloading) return;
    const last = Number(sessionStorage.getItem('clined_upd_at') || 0);
    if (!force && Date.now() - last < 60_000) return;             // cegah putaran muat ulang
    reloading = true;
    try { sessionStorage.setItem('clined_upd_at', String(Date.now())); } catch {}
    location.reload();
  }
  function tick() {
    if (!pending || reloading) return;
    if (isSafe()) {
      if (!banner || !banner.querySelector('.upd-tx')?.textContent.startsWith('Memperbarui')) render('auto');
      clearInterval(poll); poll = null;
      setTimeout(() => { if (isSafe()) doReload(false); else { pollStart(); } }, 1400);
    } else if (!dismissed && !banner) render('busy');
  }
  function pollStart() { if (!poll) poll = setInterval(tick, 1500); }
  function onNewVersion() { if (pending) return; pending = true; dismissed = false; tick(); pollStart(); }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!seenController) { seenController = true; return; }     // klaim pertama setelah instalasi awal: bukan pembaruan
    onNewVersion();
  });

  function check() {
    const now = Date.now(); if (now - lastCheck < 5 * 60_000) return; lastCheck = now;
    navigator.serviceWorker.getRegistration().then(r => r && r.update()).catch(() => {});
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { check(); if (pending) tick(); } });
  setInterval(() => { lastCheck = 0; check(); }, 30 * 60_000);
  window.addEventListener('clined:view-change', () => { if (pending) tick(); });
  window.CLINED_UPDATE = { check: () => { lastCheck = 0; check(); }, pending: () => pending };
})();
