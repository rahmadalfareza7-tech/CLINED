/* CLINED Lazy Module Loader: defers heavy secondary features (Resep, MedCalc, Admin) until needed. */
(() => {
  'use strict';
  const pending = new Map();
  const loaded = new Set();

  function loadStyle(href, appendEnd) {
    return new Promise(resolve => {
      if (document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) return resolve();
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve();
      };
      // iOS/iPadOS WebKit PWA kadang tidak memicu link.onload saat cache SW aktif;
      // batas 2,5 detik memastikan loader tidak pernah macet di layar putih.
      const timer = setTimeout(finish, 2500);
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = href;
      l.onload = finish;
      l.onerror = finish;
      const anchor = appendEnd ? null : document.getElementById('clinedDesignSystemCss');
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
      scripts: ['js/kedkel-summary-data.js?v=4', 'js/kedkel-summary.js?v=8']
    },
    igd: {
      appendEnd: true,
      styles: ['css/meja-jaga-igd.css?v=14'],
      scripts: ['js/meja-jaga-igd-data.js?v=3', 'js/meja-jaga-igd-gen.js?v=1', 'js/meja-jaga-igd.js?v=16']
    },
    rujukLangka: {
      appendEnd: true,
      styles: ['css/rujuk-langka.css?v=3'],
      scripts: ['js/rujuk-langka-data.js?v=2', 'js/rujuk-langka.js?v=5']
    },
    blokLysis: {
      appendEnd: true,
      styles: ['css/blok-lysis.css?v=3'],
      scripts: ['js/blok-lysis.js?v=3']
    },
    cbtTryout: {
      appendEnd: true,
      styles: ['css/cbt-tryout.css?v=1'],
      scripts: ['js/cbt-tryout.js?v=1']
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
      await Promise.all((b.styles || []).map(href => loadStyle(href, !!b.appendEnd)));
      for (const src of (b.scripts || [])) await loadScript(src);
      loaded.add(name);
    })().catch(err => {
      pending.delete(name);
      throw err;
    });
    pending.set(name, p);
    return p;
  }

  function showIgdLoadingUI() {
    try {
      const page = document.getElementById('mejaJagaIgdPage');
      page?.classList.remove('motion-page-enter');
      if (page && !page.classList.contains('active')) {
        window.show?.('mejaJagaIgdPage', { force: true });
        window.scrollTo(0, 0);
      }
      const host = document.getElementById('mejaJagaIgdHost');
      if (host && !host.querySelector('#igd')) {
        host.innerHTML = `<div style="min-height:360px;border-radius:22px;padding:36px 20px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;background:radial-gradient(ellipse at 50% 25%,#0f1d36 0%,#060a12 100%);color:#f1f5f9;border:2px solid #1e3352;box-shadow:0 16px 40px rgba(0,0,0,.55)">
          <div style="font-size:2.4rem;line-height:1">🚑</div>
          <div style="font-weight:900;font-size:1.15rem;letter-spacing:.04em">MEMBUKA MEJA JAGA IGD…</div>
          <div style="font-size:.86rem;color:#94a3b8;max-width:340px">Menyiapkan berkas pasien, loket triase, dan panduan klinis.</div>
        </div>`;
      }
    } catch {}
  }

  function showIgdErrorUI(err) {
    try {
      const host = document.getElementById('mejaJagaIgdHost');
      if (host && !host.querySelector('#igd')) {
        const msg = (err && err.message) ? String(err.message) : 'Koneksi terputus saat memuat Meja Jaga IGD.';
        host.innerHTML = `<div style="min-height:360px;border-radius:22px;padding:32px 20px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;background:radial-gradient(ellipse at 50% 25%,#1a1024 0%,#060a12 100%);color:#f1f5f9;border:2px solid #7f1d1d">
          <div style="font-size:2.2rem;line-height:1">⚠️</div>
          <div style="font-weight:900;font-size:1.1rem">Gagal memuat Meja Jaga IGD</div>
          <div style="font-size:.84rem;color:#cbd5e1;max-width:360px">${msg.replace(/[<>&]/g, '')}</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:6px">
            <button type="button" id="igdRetryLoadBtn" style="padding:10px 18px;border-radius:12px;border:0;background:#10b981;color:#fff;font-weight:900;cursor:pointer">Muat Ulang</button>
            <button type="button" id="igdFailHomeBtn" style="padding:10px 18px;border-radius:12px;border:1.5px solid #334155;background:#0f172a;color:#e2e8f0;font-weight:800;cursor:pointer">‹ Beranda CLINED</button>
          </div>
        </div>`;
        host.querySelector('#igdRetryLoadBtn')?.addEventListener('click', () => window.CLINED_IGD.open());
        host.querySelector('#igdFailHomeBtn')?.addEventListener('click', () => window.show?.('home', { force: true }));
      }
    } catch {}
  }

  function showRujukLangkaLoadingUI() {
    try {
      const page = document.getElementById('rujukLangkaPage');
      page?.classList.remove('motion-page-enter');
      if (page && !page.classList.contains('active')) {
        window.show?.('rujukLangkaPage', { force: true });
        window.scrollTo(0, 0);
      }
      const host = document.getElementById('rujukLangkaHost');
      if (host && !host.querySelector('#rl-root')) {
        host.innerHTML = `<div style="min-height:360px;border-radius:22px;padding:36px 20px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;background:radial-gradient(ellipse at 50% 20%,#e9f7f1 0%,#f7faf9 100%);color:#1e293b;border:2px solid #cbe5d8;box-shadow:0 16px 36px rgba(15,23,42,.08)">
          <div style="font-size:2.4rem;line-height:1">🏥</div>
          <div style="font-weight:900;font-size:1.15rem;letter-spacing:.03em;color:#0f5132">MEMBUKA RUJUK LANGKA…</div>
          <div style="font-size:.86rem;color:#475569;max-width:340px">Menyiapkan 42 topik klinis &amp; 4.850+ kosakata medis berbasis popularitas Google Search.</div>
        </div>`;
      }
    } catch {}
  }

  function showRujukLangkaErrorUI(err) {
    try {
      const host = document.getElementById('rujukLangkaHost');
      if (host && !host.querySelector('#rl-root')) {
        const msg = (err && err.message) ? String(err.message) : 'Koneksi terputus saat memuat Rujuk Langka.';
        host.innerHTML = `<div style="min-height:360px;border-radius:22px;padding:32px 20px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;background:#fff5f5;color:#1e293b;border:2px solid #fecaca">
          <div style="font-size:2.2rem;line-height:1">⚠️</div>
          <div style="font-weight:900;font-size:1.1rem;color:#991b1b">Gagal memuat Rujuk Langka</div>
          <div style="font-size:.84rem;color:#475569;max-width:360px">${msg.replace(/[<>&]/g, '')}</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:6px">
            <button type="button" id="rlRetryLoadBtn" style="padding:10px 18px;border-radius:12px;border:0;background:#46c45a;color:#fff;font-weight:900;cursor:pointer">Muat Ulang</button>
            <button type="button" id="rlFailBackBtn" style="padding:10px 18px;border-radius:12px;border:1.5px solid #cbd5e1;background:#fff;color:#334155;font-weight:800;cursor:pointer">‹ Mini Games</button>
          </div>
        </div>`;
        host.querySelector('#rlRetryLoadBtn')?.addEventListener('click', () => window.CLINED_RUJUK_LANGKA.open());
        host.querySelector('#rlFailBackBtn')?.addEventListener('click', () => window.show?.('miniGamesPage', { force: true }));
      }
    } catch {}
  }

  function showBlokLysisLoadingUI() {
    try {
      const page = document.getElementById('blokLysisPage');
      page?.classList.remove('motion-page-enter');
      if (page && !page.classList.contains('active')) {
        window.show?.('blokLysisPage', { force: true });
        window.scrollTo(0, 0);
      }
      const host = document.getElementById('blokLysisHost');
      if (host && !host.querySelector('#bl-root')) {
        host.innerHTML = `<div style="min-height:360px;border-radius:22px;padding:36px 20px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;background:radial-gradient(ellipse at 50% 20%,#263f8c 0%,#1b285c 100%);color:#f8fafc;border:2px solid rgba(140,180,255,.3);box-shadow:0 16px 40px rgba(10,18,46,.5)">
          <div style="font-size:2.4rem;line-height:1">🧬</div>
          <div style="font-weight:900;font-size:1.15rem;letter-spacing:.04em;color:#fde047">MEMBUKA BLOK LYSIS…</div>
          <div style="font-size:.86rem;color:#cbd5e1;max-width:340px">Menyiapkan preparat Wright-Giemsa 8×8, monitor ECG, dan papan peringkat tersinkron.</div>
        </div>`;
      }
    } catch {}
  }

  function showBlokLysisErrorUI(err) {
    try {
      const host = document.getElementById('blokLysisHost');
      if (host && !host.querySelector('#bl-root')) {
        const msg = (err && err.message) ? String(err.message) : 'Koneksi terputus saat memuat Blok Lysis.';
        host.innerHTML = `<div style="min-height:360px;border-radius:22px;padding:32px 20px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;background:radial-gradient(ellipse at 50% 25%,#2b1736 0%,#151a36 100%);color:#f8fafc;border:2px solid #991b1b">
          <div style="font-size:2.2rem;line-height:1">⚠️</div>
          <div style="font-weight:900;font-size:1.1rem">Gagal memuat Blok Lysis</div>
          <div style="font-size:.84rem;color:#cbd5e1;max-width:360px">${msg.replace(/[<>&]/g, '')}</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:6px">
            <button type="button" id="blRetryLoadBtn" style="padding:10px 18px;border-radius:12px;border:0;background:#38bdf8;color:#0f172a;font-weight:900;cursor:pointer">Muat Ulang</button>
            <button type="button" id="blFailBackBtn" style="padding:10px 18px;border-radius:12px;border:1.5px solid #475569;background:#1e293b;color:#e2e8f0;font-weight:800;cursor:pointer">‹ Mini Games</button>
          </div>
        </div>`;
        host.querySelector('#blRetryLoadBtn')?.addEventListener('click', () => window.CLINED_BLOK_LYSIS.open());
        host.querySelector('#blFailBackBtn')?.addEventListener('click', () => window.show?.('miniGamesPage', { force: true }));
      }
    } catch {}
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

  function injectIgdPlaceholders() {
    const grid = document.querySelector('#studyTools .study-tool-grid');
    if (grid && !document.getElementById('igdStudyToolBtn')) {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'study-tool';
      tile.id = 'igdStudyToolBtn';
      tile.innerHTML = '<span>🚑</span><b>Meja Jaga IGD</b><small>Game: temukan kesalahan fatal di resep</small>';
      grid.insertBefore(tile, grid.firstChild);
    }
  }

  // Stubs so callers work seamlessly before or after bundle loads
  if (!window.CLINED_IGD) {
    window.CLINED_IGD = {
      open: () => {
        showIgdLoadingUI();
        return load('igd')
          .then(() => window.CLINED_IGD?.open?.())
          .catch(e => {
            showIgdErrorUI(e);
            window.showToast?.(e.message, true);
          });
      }
    };
  }
  if (!window.CLINED_RUJUK_LANGKA) {
    window.CLINED_RUJUK_LANGKA = {
      open: () => {
        showRujukLangkaLoadingUI();
        return load('rujukLangka')
          .then(() => window.CLINED_RUJUK_LANGKA?.open?.())
          .catch(e => {
            showRujukLangkaErrorUI(e);
            window.showToast?.(e.message, true);
          });
      }
    };
  }
  if (!window.CLINED_BLOK_LYSIS) {
    window.CLINED_BLOK_LYSIS = {
      open: () => {
        showBlokLysisLoadingUI();
        return load('blokLysis')
          .then(() => window.CLINED_BLOK_LYSIS?.open?.())
          .catch(e => {
            showBlokLysisErrorUI(e);
            window.showToast?.(e.message, true);
          });
      }
    };
  }
  if (!window.CLINED_CBT_TRYOUT) {
    window.CLINED_CBT_TRYOUT = {
      open: () => {
        try {
          const page = document.getElementById('cbtTryoutPage');
          if (page && !page.classList.contains('active')) {
            window.show?.('cbtTryoutPage', { force: true });
            window.scrollTo(0, 0);
          }
          const host = document.getElementById('cbtTryoutHost');
          if (host && !host.querySelector('.cbt-root')) {
            host.innerHTML = '<div class="card" style="text-align:center;padding:34px 20px"><div style="font-size:2rem;margin-bottom:6px">🩺</div><b>Membuka Simulasi CBT Berwaktu Ketat…</b></div>';
          }
        } catch {}
        return load('cbtTryout')
          .then(() => window.CLINED_CBT_TRYOUT?.open?.())
          .catch(e => window.showToast?.(e?.message || 'Gagal memuat Simulasi CBT.', true));
      }
    };
  }
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

  function syncMiniGamesHub() {
    const st = document.getElementById('mgIgdStatus');
    if (st) {
      try {
        const svRaw = localStorage.getItem('clined_igd_session_v1');
        let setDone = false;
        if (svRaw) {
          const sv = JSON.parse(svRaw);
          if (sv && !sv.clearedAt && Array.isArray(sv.queue) && sv.queue.length && sv.i < sv.queue.length) {
            st.textContent = `● Shift aktif · Berkas ${sv.i + 1}/${sv.queue.length}`;
            st.classList.add('active-shift');
            setDone = true;
          }
        }
        if (!setDone) {
          st.classList.remove('active-shift');
          const pRaw = localStorage.getItem('clined_igd_v2');
          if (pRaw) {
            const p = JSON.parse(pRaw);
            const cleared = [1, 2, 3, 4, 5].filter(n => p?.done?.[n]).length;
            const bestVals = Object.values(p?.best || {}).filter(Boolean);
            const top = bestVals.length ? Math.max(...bestVals) : 0;
            if (cleared > 0 || top > 0) {
              st.textContent = `${cleared}/5 Malam · Rekor ${top}`;
              setDone = true;
            }
          }
          if (!setDone) st.textContent = 'Siap dimainkan';
        }
      } catch {
        st.textContent = 'Siap dimainkan';
      }
    }

    const rl = document.getElementById('mgRlStatus');
    if (rl) {
      try {
        const raw = localStorage.getItem('clined_rujuk_langka_v1') || localStorage.getItem('rujuklangka:v2');
        if (raw) {
          const d = JSON.parse(raw);
          const wibToday = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
          const todayRec = d?.scored?.[wibToday];
          const allRecs = [...Object.values(d?.scored || {}), ...Object.values(d?.archive || {})].filter(r => r && r.done);
          if (todayRec && todayRec.done) {
            rl.textContent = `✓ Hari ini · ${Number(todayRec.score ?? todayRec.total) || 0} poin`;
            rl.classList.add('active-shift');
          } else if (allRecs.length) {
            const best = Math.max(...allRecs.map(r => Number(r.score ?? r.total) || 0));
            rl.textContent = `${allRecs.length} ronde · Rekor ${best}`;
            rl.classList.remove('active-shift');
          } else {
            rl.textContent = 'Siap dimainkan';
            rl.classList.remove('active-shift');
          }
        } else {
          rl.textContent = 'Siap dimainkan';
          rl.classList.remove('active-shift');
        }
      } catch {
        rl.textContent = 'Siap dimainkan';
        rl.classList.remove('active-shift');
      }
    }

    const bl = document.getElementById('mgBlStatus');
    if (bl) {
      try {
        let activeText = '';
        const sessRaw = localStorage.getItem('clined_blok_lysis_session_v1');
        if (sessRaw) {
          const sv = JSON.parse(sessRaw);
          if (sv && !sv.over && !sv.clearedAt && Array.isArray(sv.board) && sv.board.length === 8 && (Number(sv.score) > 0 || Number(sv.moves) > 0)) {
            activeText = `● Permainan aktif · ${(Number(sv.score) || 0).toLocaleString('id')}`;
          }
        }
        if (activeText) {
          bl.textContent = activeText;
          bl.classList.add('active-shift');
        } else {
          bl.classList.remove('active-shift');
          const stRaw = localStorage.getItem('clined_blok_lysis_v1');
          const stData = stRaw ? JSON.parse(stRaw) : null;
          const best = Math.max(0, Math.floor(Number(stData?.best) || 0));
          const games = Math.max(0, Math.floor(Number(stData?.games) || 0));
          if (best > 0) {
            bl.textContent = `♛ Rekor ${best.toLocaleString('id')}${games > 0 ? ` · ${games} main` : ''}`;
          } else {
            bl.textContent = 'Siap dimainkan';
          }
        }
      } catch {
        bl.textContent = 'Siap dimainkan';
        bl.classList.remove('active-shift');
      }
    }
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest?.('button, [data-open-medcalc], [data-open-igd], [data-open-rujuk-langka], [data-open-blok-lysis], [data-open-cbt-tryout], [data-open-minigames]');
    if (!btn) return;
    if (btn.id === 'miniGamesBtn' || btn.dataset.openMinigames != null) {
      e.preventDefault();
      syncMiniGamesHub();
      try { window.show?.('miniGamesPage'); window.scrollTo(0, 0); } catch {}
      return;
    }
    if (btn.id === 'cbtMenuBtn' || btn.id === 'openCbtTryoutBtn' || btn.dataset.openCbtTryout != null) {
      e.preventDefault();
      window.CLINED_CBT_TRYOUT.open();
      return;
    }
    if (btn.id === 'igdMenuBtn' || btn.id === 'igdStudyToolBtn' || btn.dataset.openIgd != null) {
      e.preventDefault();
      if (!loaded.has('igd')) window.showToast?.('Membuka Meja Jaga IGD…');
      window.CLINED_IGD.open();
      return;
    }
    if (btn.id === 'mgCardRujukLangka' || btn.dataset.openRujukLangka != null) {
      e.preventDefault();
      if (!loaded.has('rujukLangka')) window.showToast?.('Membuka Rujuk Langka…');
      window.CLINED_RUJUK_LANGKA.open();
      return;
    }
    if (btn.id === 'mgCardBlokLysis' || btn.dataset.openBlokLysis != null) {
      e.preventDefault();
      window.CLINED_BLOK_LYSIS.open();
      return;
    }
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
    'css/chat.css?v=3',
    'css/qcomments.css?v=2',
    'css/insights.css?v=7',
    'css/content-ergonomic.css?v=9'
  ];

  function boot() {
    injectMedCalcPlaceholders();
    injectIgdPlaceholders();
    syncMiniGamesHub();
    maybePreloadAdmin();
    requestAnimationFrame(() => { SECONDARY_STYLES.forEach(loadStyle); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  window.addEventListener('clined:auth-ready', () => { maybePreloadAdmin(); syncMiniGamesHub(); });
  window.addEventListener('clined:sync-applied', syncMiniGamesHub);
  window.addEventListener('clined:view-change', e => {
    if (e.detail === 'miniGamesPage') syncMiniGamesHub();
    if (e.detail === 'mejaJagaIgdPage' && !loaded.has('igd') && !pending.has('igd')) {
      window.CLINED_IGD.open(); // mis. dibuka ulang dari hash/riwayat: muat bundle lalu pasang game
    }
    if (e.detail === 'rujukLangkaPage' && !loaded.has('rujukLangka') && !pending.has('rujukLangka')) {
      window.CLINED_RUJUK_LANGKA.open();
    }
    if (e.detail === 'blokLysisPage' && !loaded.has('blokLysis') && !pending.has('blokLysis')) {
      window.CLINED_BLOK_LYSIS.open();
    }
    if (e.detail === 'cbtTryoutPage' && !loaded.has('cbtTryout') && !pending.has('cbtTryout')) {
      window.CLINED_CBT_TRYOUT.open();
    }
    if (e.detail === 'blokKedkelPage') {
      load('resep').catch(() => {});
      load('ringkasanKedkel').catch(() => {});
    }
  });

  window.CLINED_LAZY = { load, isLoaded: n => loaded.has(n) };
})();
