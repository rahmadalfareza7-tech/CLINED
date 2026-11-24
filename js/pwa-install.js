/* CLINED — PWA Download / Add to Home Screen (Android, Desktop & iOS Safari) */
(() => {
  'use strict';

  let deferredPrompt = null;

  const isStandalone = () =>
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    window.matchMedia?.('(display-mode: fullscreen)')?.matches ||
    window.navigator?.standalone === true;

  const isIOS = () =>
    /iphone|ipad|ipod/i.test(navigator.userAgent || '') ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const isInAppBrowser = () =>
    /instagram|fban|fbav|line|whatsapp|tiktok|wv\b/i.test(navigator.userAgent || '');

  function buttons() {
    return Array.from(document.querySelectorAll('[data-pwa-install]'));
  }

  function syncButtons() {
    const installed = isStandalone();
    buttons().forEach(btn => {
      btn.hidden = installed;
      if (!installed) {
        btn.setAttribute('data-pwa-ready', deferredPrompt ? '1' : '0');
      }
    });
  }

  // Register SW if not yet registered (ensures beforeinstallprompt works on index.html too)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(r => r && r.update()).catch(() => {});
    }, { once: true });
  }

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    syncButtons();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    syncButtons();
    closeModal();
    window.showToast?.('CLINED berhasil dipasang di Homescreen! 🎉');
  });

  function ensureStyles() {
    if (document.getElementById('clinedPwaModalCss')) return;
    const style = document.createElement('style');
    style.id = 'clinedPwaModalCss';
    style.textContent = `
      .pwa-modal-backdrop {
        position: fixed; inset: 0; z-index: 2147483050;
        background: rgba(15, 23, 42, 0.56);
        backdrop-filter: blur(4px);
        display: grid; place-items: center; padding: 16px;
        animation: pwaFade .18s ease;
      }
      @keyframes pwaFade { from { opacity: 0; } to { opacity: 1; } }
      .pwa-modal-card {
        width: min(100%, 400px);
        border-radius: 22px;
        border: 2px solid var(--line, #dbe4de);
        border-bottom: 5px solid var(--line, #cbd5e1);
        background: var(--card, #ffffff);
        color: var(--text, #1c282e);
        padding: 18px 18px 16px;
        display: grid; gap: 13px;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.22);
        font-family: inherit;
      }
      :root.dark .pwa-modal-card, body.dark .pwa-modal-card {
        background: #172329; color: #f4fafc; border-color: #2d3d44;
      }
      .pwa-modal-head {
        display: flex; align-items: center; gap: 12px;
      }
      .pwa-modal-ico {
        width: 48px; height: 48px; border-radius: 14px; flex: none;
        overflow: hidden; border: 2px solid var(--line, #dbe4de);
      }
      .pwa-modal-ico img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .pwa-modal-head h3 { margin: 0; font-size: 17px; font-weight: 900; line-height: 1.2; }
      .pwa-modal-head p { margin: 3px 0 0; font-size: 12.5px; opacity: .76; font-weight: 600; }
      .pwa-steps {
        margin: 0; padding: 0; list-style: none; display: grid; gap: 8px;
      }
      .pwa-steps li {
        display: grid; grid-template-columns: 26px minmax(0, 1fr); gap: 10px;
        align-items: start; padding: 9px 11px; border-radius: 13px;
        background: var(--surface, #f1f5f3);
        font-size: 13px; line-height: 1.48; font-weight: 600;
      }
      :root.dark .pwa-steps li, body.dark .pwa-steps li { background: #1f2e36; }
      .pwa-step-num {
        width: 26px; height: 26px; border-radius: 8px;
        background: #58cc02; color: #fff;
        display: grid; place-items: center; font-size: 12.5px; font-weight: 900;
      }
      .pwa-modal-close {
        min-height: 44px; width: 100%; border-radius: 14px;
        border: 2px solid #46a302; border-bottom: 4px solid #3c8d00;
        background: #58cc02; color: #fff;
        font: inherit; font-size: 14px; font-weight: 900; cursor: pointer;
      }
      .pwa-modal-close:active { transform: translateY(2px); border-bottom-width: 2px; }
    `;
    document.head.appendChild(style);
  }

  function closeModal() {
    document.getElementById('clinedPwaInstallModal')?.remove();
  }

  function openGuideModal() {
    ensureStyles();
    closeModal();
    const ios = isIOS();
    const inApp = isInAppBrowser();
    let subtitle = 'Pasang CLINED ke layar utama HP/PC agar bisa dibuka 1 ketukan seperti aplikasi.';
    let steps = [];

    if (inApp) {
      subtitle = 'Kamu membuka CLINED dari browser dalam aplikasi (Instagram / WhatsApp / LINE).';
      steps = [
        'Ketuk ikon menu <b>⋮</b> atau <b>⋯</b> di pojok kanan atas lalu pilih <b>Buka di Chrome / Safari</b>.',
        'Setelah terbuka di Chrome / Safari, ketuk lagi tombol <b>⬇ Download</b>.',
        'Pilih <b>Install / Tambah ke Layar Utama</b> — ikon CLINED langsung muncul di Homescreen!'
      ];
    } else if (ios) {
      subtitle = 'Di iPhone / iPad (Safari), pemasangan ke Homescreen dilakukan lewat tombol Bagikan:';
      steps = [
        'Ketuk ikon <b>Bagikan (Share) ⬆️</b> di bilah bawah Safari.',
        'Geser ke bawah lalu pilih <b>Tambah ke Layar Utama</b> (<i>Add to Home Screen</i>).',
        'Ketuk <b>Tambah</b> (<i>Add</i>) di kanan atas — CLINED langsung tampil di Homescreen!'
      ];
    } else {
      steps = [
        'Ketuk ikon menu browser <b>⋮</b> (pojok kanan atas) atau ikon <b>⊕ Install</b> di kolom alamat.',
        'Pilih <b>Install aplikasi</b> atau <b>Tambahkan ke Layar Utama</b> (<i>Add to Home screen</i>).',
        'Ketuk <b>Install / Tambah</b> — ikon CLINED langsung terpasang di Homescreen!'
      ];
    }

    const wrap = document.createElement('div');
    wrap.id = 'clinedPwaInstallModal';
    wrap.className = 'pwa-modal-backdrop';
    wrap.innerHTML = `<div class="pwa-modal-card" role="dialog" aria-modal="true" aria-label="Download CLINED ke Homescreen">
      <div class="pwa-modal-head">
        <span class="pwa-modal-ico"><img src="icon-192.png" alt="CLINED"></span>
        <div>
          <h3>Download CLINED ke Homescreen</h3>
          <p>${subtitle}</p>
        </div>
      </div>
      <ol class="pwa-steps">
        ${steps.map((s, i) => `<li><span class="pwa-step-num">${i + 1}</span><span>${s}</span></li>`).join('')}
      </ol>
      <button type="button" class="pwa-modal-close" data-pwa-close>Mengerti</button>
    </div>`;

    wrap.addEventListener('click', e => {
      if (e.target === wrap || e.target.closest('[data-pwa-close]')) closeModal();
    });
    document.body.appendChild(wrap);
  }

  async function triggerInstall() {
    if (isStandalone()) {
      window.showToast?.('CLINED sudah terpasang di Homescreen kamu! ✅');
      syncButtons();
      return;
    }
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        deferredPrompt = null;
        syncButtons();
        if (choice?.outcome === 'accepted') {
          window.showToast?.('Memasang CLINED ke Homescreen… 🚀');
        }
        return;
      } catch {}
    }
    openGuideModal();
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest?.('[data-pwa-install]');
    if (!btn) return;
    e.preventDefault();
    triggerInstall();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncButtons, { once: true });
  } else {
    syncButtons();
  }

  window.CLINED_PWA_INSTALL = { trigger: triggerInstall, isStandalone };
})();
