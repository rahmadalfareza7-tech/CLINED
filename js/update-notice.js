/* CLINED — pemberitahuan "versi baru tersedia" + muat ulang otomatis saat aman (tidak sedang mengerjakan soal). */
(() => {
  'use strict';
  if (!('serviceWorker' in navigator)) return;

  const APP_SW_VERSION = 'v252-mobile-gameplay-landscape-fix';
  const BUSY_VIEWS = new Set(['quiz', 'duelPage', 'flashcards', 'clinicalQuestPage', 'mejaJagaIgdPage', 'studyTimerPage', 'userBankPage']);
  let seenController = !!navigator.serviceWorker.controller;
  let pending = false, dismissed = false, reloading = false, banner = null, poll = null, lastCheck = 0;
  let detectedVersion = '';
  const watchedRegs = new WeakSet();

  const activeView = () => document.querySelector('.view.active')?.id || '';
  function isBusyView(v) {
    if (!v) return false;
    if (v === 'materiLatihanPage') {
      return Boolean(document.getElementById('materiLatihanPage')?.classList.contains('ml-running'));
    }
    return BUSY_VIEWS.has(v);
  }
  function isSafe() {
    if (document.visibilityState !== 'visible') return false;
    if (isBusyView(activeView())) return false;
    if (document.querySelector('.cdlg-layer, .rq-layer, .stc-layer')) return false;
    for (const el of document.querySelectorAll('textarea, input[type=text], input[type=search]')) {
      if (el.offsetParent !== null && el.value && el.value.length > 0) return false;
    }
    return true;
  }
  function render(mode) {
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'upd-banner';
      banner.setAttribute('role', 'status');
      banner.setAttribute('aria-live', 'polite');
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
  function hide() {
    if (banner) {
      banner.classList.remove('show');
      const b = banner;
      banner = null;
      setTimeout(() => b.remove(), 300);
    }
  }
  function doReload(force) {
    if (reloading) return;
    const now = Date.now();
    const last = Number(sessionStorage.getItem('clined_upd_at') || 0);
    const lastVer = sessionStorage.getItem('clined_upd_ver') || '';
    const isDifferentVer = Boolean(detectedVersion && detectedVersion !== lastVer);
    const minCooldown = isDifferentVer ? 8_000 : 45_000;
    if (!force && now - last < minCooldown) return;
    reloading = true;
    try {
      const v = activeView();
      if (v) sessionStorage.setItem('clined_last_view_v1', v);
      window.dispatchEvent(new Event('clined:before-sync-flush'));
      window.dispatchEvent(new CustomEvent('clined:before-reload', { detail: v }));
      sessionStorage.setItem('clined_upd_at', String(now));
      if (detectedVersion) sessionStorage.setItem('clined_upd_ver', detectedVersion);
    } catch {}
    location.reload();
  }
  function tick() {
    if (!pending || reloading) return;
    if (isSafe()) {
      if (!banner || !banner.querySelector('.upd-tx')?.textContent.startsWith('Memperbarui')) render('auto');
      clearInterval(poll);
      poll = null;
      setTimeout(() => { if (isSafe()) doReload(false); else pollStart(); }, 900);
    } else if (!dismissed && !banner) {
      render('busy');
    }
  }
  function pollStart() {
    if (!poll) poll = setInterval(tick, 1200);
  }
  function onNewVersion(ver = '') {
    if (ver) detectedVersion = ver;
    if (pending) { tick(); return; }
    pending = true;
    dismissed = false;
    tick();
    pollStart();
  }

  function promoteWaiting(worker) {
    if (!worker) return;
    try { worker.postMessage({ type: 'SKIP_WAITING' }); } catch {}
  }

  function watchRegistration(reg) {
    if (!reg) return;
    if (reg.waiting && navigator.serviceWorker.controller) {
      promoteWaiting(reg.waiting);
      onNewVersion();
    }
    if (watchedRegs.has(reg)) return;
    watchedRegs.add(reg);
    reg.addEventListener('updatefound', () => {
      const installing = reg.installing;
      if (!installing) return;
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          promoteWaiting(installing);
          onNewVersion();
        }
      });
    });
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!seenController) { seenController = true; return; }
    onNewVersion();
  });

  navigator.serviceWorker.addEventListener('message', e => {
    const t = e.data?.type;
    const ver = e.data?.version;
    if ((t === 'SW_ACTIVATED' || t === 'SW_VERSION') && ver && ver !== APP_SW_VERSION) {
      seenController = true;
      onNewVersion(ver);
    }
  });

  function check(force = false) {
    const now = Date.now();
    if (!force && now - lastCheck < 30_000) return;
    lastCheck = now;
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(reg => {
      watchRegistration(reg);
      return reg.update();
    }).catch(() => {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (!reg) return;
        watchRegistration(reg);
        return reg.update();
      }).catch(() => {});
    });
    try {
      navigator.serviceWorker.controller?.postMessage?.({ type: 'GET_SW_VERSION' });
    } catch {}
  }

  if (document.readyState === 'complete') setTimeout(() => check(true), 400);
  else window.addEventListener('load', () => setTimeout(() => check(true), 400), { once: true });

  window.addEventListener('pageshow', () => { check(true); if (pending) tick(); });
  window.addEventListener('online', () => { check(true); if (pending) tick(); });
  window.addEventListener('focus', () => { check(false); if (pending) tick(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      check(false);
      if (pending) tick();
    }
  });
  setInterval(() => check(true), 5 * 60_000);
  window.addEventListener('clined:view-change', () => { if (pending) tick(); });
  window.CLINED_UPDATE = {
    version: APP_SW_VERSION,
    check: () => check(true),
    pending: () => pending
  };
})();
