/* CLINED · Online-Only Connection Guard
   Menampilkan banner status koneksi saat internet terputus (CLINED membutuhkan koneksi online),
   dan otomatis menyinkronkan ulang saat koneksi kembali aktif. */
(() => {
  'use strict';

  const STYLE_ID = 'clined-online-guard-style';
  const BANNER_ID = 'clinedOnlineGuardBanner';
  let banner = null;
  let wasOffline = false;
  let checking = false;

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '#clinedOnlineGuardBanner{position:fixed;left:12px;right:12px;top:max(10px,env(safe-area-inset-top));z-index:2147483500;margin:0 auto;max-width:560px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;border-radius:14px;background:#7f1d1d;color:#fef2f2;border:1.5px solid rgba(254,202,202,.45);box-shadow:0 10px 28px rgba(0,0,0,.32);font:700 13px/1.35 "Plus Jakarta Sans",system-ui,-apple-system,sans-serif}',
      '#clinedOnlineGuardBanner[hidden]{display:none!important}',
      '#clinedOnlineGuardBanner .og-text{flex:1;min-width:0}',
      '#clinedOnlineGuardBanner .og-retry{flex:none;height:32px;padding:0 12px;border-radius:999px;border:0;background:#fef2f2;color:#7f1d1d;font:800 12px/1 inherit;cursor:pointer;white-space:nowrap}',
      '#clinedOnlineGuardBanner .og-retry:disabled{opacity:.65;cursor:default}'
    ].join('');
    document.head.appendChild(style);
  }

  function ensureBanner() {
    if (banner && document.body?.contains(banner)) return banner;
    ensureStyles();
    banner = document.createElement('div');
    banner.id = BANNER_ID;
    banner.setAttribute('role', 'alert');
    banner.setAttribute('aria-live', 'assertive');
    banner.hidden = true;
    banner.innerHTML =
      '<span class="og-text">📡 Tidak ada koneksi internet — CLINED membutuhkan koneksi online agar soal, progres, &amp; leaderboard tetap tersinkronisasi.</span>' +
      '<button type="button" class="og-retry">Coba Sambungkan</button>';
    const retryBtn = banner.querySelector('.og-retry');
    retryBtn.addEventListener('click', () => verifyConnection(true));
    document.body.appendChild(banner);
    return banner;
  }

  function showOfflineBanner() {
    if (!document.body) return;
    const el = ensureBanner();
    el.hidden = false;
    wasOffline = true;
  }

  function hideOfflineBanner(notifyReconnected = false) {
    if (banner) banner.hidden = true;
    if (notifyReconnected && wasOffline) {
      wasOffline = false;
      try { window.showToast?.('✅ Koneksi internet kembali terhubung!'); } catch {}
      try { window.CLINED_ONLINE_SYNC?.sync?.({ force: true }); } catch {}
    }
  }

  async function verifyConnection(manual = false) {
    if (checking) return false;
    checking = true;
    const btn = banner?.querySelector('.og-retry');
    if (btn && manual) {
      btn.disabled = true;
      btn.textContent = 'Memeriksa…';
    }
    try {
      const r = await fetch('/api/health', { method: 'GET', cache: 'no-store', credentials: 'same-origin' });
      if (r.ok || r.status < 500) {
        hideOfflineBanner(true);
        return true;
      }
      showOfflineBanner();
      return false;
    } catch {
      showOfflineBanner();
      return false;
    } finally {
      checking = false;
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Coba Sambungkan';
      }
    }
  }

  function syncState() {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      showOfflineBanner();
    } else if (wasOffline) {
      verifyConnection(false);
    }
  }

  window.addEventListener('offline', showOfflineBanner);
  window.addEventListener('online', () => verifyConnection(false));

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncState, { once: true });
  } else {
    syncState();
  }

  window.CLINED_ONLINE_GUARD = {
    isOnline: () => typeof navigator === 'undefined' ? true : navigator.onLine !== false,
    check: () => verifyConnection(true)
  };
})();
