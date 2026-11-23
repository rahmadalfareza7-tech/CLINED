/* CLINED Lazy Module Loader: defers heavy secondary features (Resep, MedCalc, Admin) until needed. */
(() => {
  'use strict';
  const pending = new Map();
  const loaded = new Set();

  function loadStyle(href) {
    return new Promise(resolve => {
      if (document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) return resolve();
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = href;
      l.onload = resolve;
      l.onerror = resolve;
      const anchor = document.getElementById('clinedDesignSystemCss');
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(l, anchor);
      else document.head.appendChild(l);
    });
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`Gagal memuat modul ${src}`));
      document.body.appendChild(s);
    });
  }

  const BUNDLES = {
    medcalc: {
      styles: ['css/med-calc.css?v=4'],
      scripts: ['js/med-calc.js?v=2']
    },
    resep: {
      styles: [],
      scripts: ['js/resep-data.js?v=7', 'js/resep-core.js?v=9', 'js/resep-editor.js?v=1', 'js/resep.js?v=17']
    },
    ringkasanKedkel: {
      styles: ['css/kedkel-summary.css?v=5'],
      scripts: ['js/kedkel-summary-data.js?v=4', 'js/kedkel-summary.js?v=7']
    },
    admin: {
      styles: ['css/admin-people.css?v=5'],
      scripts: ['js/admin-people.js?v=10', 'js/question-editor.js?v=1']
    }
  };

  function load(name) {
    if (loaded.has(name)) return Promise.resolve();
    if (pending.has(name)) return pending.get(name);
    const b = BUNDLES[name];
    if (!b) return Promise.resolve();
    const p = (async () => {
      await Promise.all((b.styles || []).map(loadStyle));
      for (const src of (b.scripts || [])) await loadScript(src);
      loaded.add(name);
    })().catch(err => {
      pending.delete(name);
      throw err;
    });
    pending.set(name, p);
    return p;
  }

  function injectMedCalcPlaceholders() {
    const nvBtn = document.getElementById('normalValuesHeaderBtn');
    if (nvBtn && nvBtn.parentNode && !document.getElementById('medCalcHeaderBtn')) {
      const btn = document.createElement('button');
      btn.id = 'medCalcHeaderBtn';
      btn.className = 'icon-btn';
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Kalkulator Medis & Dosis Anak');
      btn.setAttribute('title', 'Kalkulator Medis & Dosis Anak');
      btn.textContent = '🧮';
      nvBtn.parentNode.insertBefore(btn, nvBtn);
    }
    const grid = document.querySelector('#studyTools .study-tool-grid');
    if (grid && !document.getElementById('medCalcStudyToolBtn')) {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'study-tool';
      tile.id = 'medCalcStudyToolBtn';
      tile.innerHTML = '<span>🧮</span><b>Kalkulator Medis</b><small>Dosis Anak, Infus, eGFR &amp; GCS</small>';
      grid.appendChild(tile);
    }
  }

  // Stubs so callers work seamlessly before or after bundle loads
  if (!window.CLINED_MEDCALC) {
    window.CLINED_MEDCALC = {
      open: (tab = 'peds') => load('medcalc').then(() => window.CLINED_MEDCALC?.open?.(tab)).catch(e => window.showToast?.(e.message, true)),
      close: () => {}
    };
  }
  if (!window.CLINED_RESEP) {
    window.CLINED_RESEP = {
      open: () => load('resep').then(() => window.CLINED_RESEP?.open?.()).catch(e => window.showToast?.(e.message, true))
    };
  }
  if (!window.CLINED_KEDKEL_SUMMARY) {
    window.CLINED_KEDKEL_SUMMARY = {
      open: no => load('ringkasanKedkel').then(() => window.CLINED_KEDKEL_SUMMARY?.open?.(no)).catch(e => window.showToast?.(e.message, true))
    };
  }
  if (!window.CLINED_ADMIN_PEOPLE) {
    window.CLINED_ADMIN_PEOPLE = {
      mount: (host, opts) => load('admin').then(() => window.CLINED_ADMIN_PEOPLE?.mount?.(host, opts)).catch(() => {})
    };
  }
  if (!window.clinedEditQuestion) {
    window.clinedEditQuestion = t => load('admin').then(() => window.clinedEditQuestion?.(t)).catch(e => window.showToast?.(e.message, true));
  }
  if (!window.clinedCanEditQuestions) {
    window.clinedCanEditQuestions = () => {
      try { const r = window.authCurrentUser?.()?.role; return r === 'admin' || r === 'helper'; } catch { return false; }
    };
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest?.('button, [data-open-medcalc]');
    if (!btn) return;
    if ((btn.id === 'medCalcHeaderBtn' || btn.id === 'medCalcStudyToolBtn' || btn.dataset.openMedcalc != null) && !loaded.has('medcalc')) {
      e.preventDefault();
      window.CLINED_MEDCALC.open(btn.dataset.openMedcalc || 'peds');
      return;
    }
    if (btn.id === 'openResepKedkel' && !loaded.has('resep')) {
      e.preventDefault();
      window.showToast?.('Membuka Latihan Resep…');
      window.CLINED_RESEP.open();
      return;
    }
    if (btn.id === 'openRingkasanKedkel' && !loaded.has('ringkasanKedkel')) {
      e.preventDefault();
      window.showToast?.('Membuka Ringkasan Full Blok KEDKEL…');
      window.CLINED_KEDKEL_SUMMARY.open();
    }
  });

  function maybePreloadAdmin() {
    try {
      const r = window.authCurrentUser?.()?.role;
      if (r === 'admin' || r === 'helper') load('admin').catch(() => {});
    } catch {}
  }

  const SECONDARY_STYLES = [
    'css/userbank.css?v=3',
    'css/chat.css?v=2',
    'css/qcomments.css?v=2',
    'css/insights.css?v=7',
    'css/content-ergonomic.css?v=9'
  ];

  function boot() {
    injectMedCalcPlaceholders();
    maybePreloadAdmin();
    requestAnimationFrame(() => { SECONDARY_STYLES.forEach(loadStyle); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  window.addEventListener('clined:auth-ready', maybePreloadAdmin);
  window.addEventListener('clined:view-change', e => {
    if (e.detail === 'blokKedkelPage') {
      load('resep').catch(() => {});
      load('ringkasanKedkel').catch(() => {});
    }
  });

  window.CLINED_LAZY = { load, isLoaded: n => loaded.has(n) };
})();
