/* CLINED Mode Simulasi CBT / Tryout Berwaktu Ketat (UAB / UKMPPD)
   Dimuat lazy via js/lazy-loader.js (bundle "cbtTryout").
   Riwayat disimpan & disinkronkan di localStorage "clined_cbt_tryout_v1". */
(() => {
  'use strict';

  const STORAGE_KEY = 'clined_cbt_tryout_v1';
  const PASSING_PCT = 66;
  const LETTERS = ['A', 'B', 'C', 'D', 'E'];

  const PRESETS = [
    { id: 'mini', label: 'Tryout Cepat', count: 25, minutes: 30, desc: '25 soal · 30 menit · Pemanasan ketat' },
    { id: 'uab', label: 'Simulasi UAB', count: 50, minutes: 60, desc: '50 soal · 60 menit · Ritme ujian blok' },
    { id: 'ukmppd', label: 'Tryout UKMPPD', count: 100, minutes: 100, desc: '100 soal · 100 menit · 1 menit/soal' }
  ];

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function normalizeQuestion(raw, bankId, bankMeta, idx) {
    if (!raw || typeof raw !== 'object') return null;
    const soal = String(raw.soal ?? raw.question ?? '').trim();
    const opsiRaw = Array.isArray(raw.opsi) ? raw.opsi : (Array.isArray(raw.pilihan) ? raw.pilihan : (Array.isArray(raw.options) ? raw.options : []));
    const opsi = opsiRaw.map(o => String(o ?? '').trim()).filter(Boolean);
    if (!soal || opsi.length < 2) return null;

    let ans = raw.jawabanBenar ?? raw.jawaban ?? raw.answer;
    if (typeof ans === 'string') {
      const up = ans.trim().toUpperCase();
      const li = LETTERS.indexOf(up);
      ans = li >= 0 ? li : Number(up);
    }
    ans = Number.isInteger(Number(ans)) ? Number(ans) : -1;
    if (ans < 0 || ans >= opsi.length) return null;

    const block = String(raw.block || bankMeta?.block || 'UMUM').trim().toUpperCase() || 'UMUM';
    const topic = String(raw.materiTitle || raw.materi || raw.topic || bankMeta?.name || block).trim();
    return {
      id: String(raw.id || `${bankId || 'bank'}:${idx}`),
      bankId: String(bankId || ''),
      bankName: String(bankMeta?.name || bankId || 'Bank Soal'),
      block,
      topic,
      soal,
      opsi,
      jawabanBenar: ans,
      gambar: raw.gambar || raw.image || '',
      pembahasan: String(raw.pembahasan || raw.pembahasan_klinis || '').trim(),
      pembahasanPilihan: raw.pembahasanPilihan || null
    };
  }

  /** Build a stratified/random CBT exam from normalized pool (pure, testable). */
  function buildExam(pool, requestedCount, { minutes = 60, scope = 'ALL', title = 'Simulasi CBT' } = {}) {
    const valid = (Array.isArray(pool) ? pool : []).filter(q => q && q.soal && Array.isArray(q.opsi) && q.opsi.length >= 2 && Number.isInteger(q.jawabanBenar));
    const count = Math.max(1, Math.min(Number(requestedCount) || 25, valid.length));
    if (!valid.length) return null;

    let chosen = [];
    if (scope === 'ALL') {
      const byBlock = new Map();
      for (const q of shuffle(valid)) {
        const b = q.block || 'UMUM';
        if (!byBlock.has(b)) byBlock.set(b, []);
        byBlock.get(b).push(q);
      }
      const blockKeys = shuffle([...byBlock.keys()]);
      let round = 0;
      while (chosen.length < count) {
        let added = false;
        for (const bk of blockKeys) {
          const list = byBlock.get(bk);
          if (round < list.length && chosen.length < count) {
            chosen.push(list[round]);
            added = true;
          }
        }
        if (!added) break;
        round++;
      }
      chosen = shuffle(chosen);
    } else {
      chosen = shuffle(valid).slice(0, count);
    }

    const durSec = Math.max(60, Math.round((Number(minutes) || Math.max(10, count)) * 60));
    return {
      id: 'cbt_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
      title,
      scope,
      total: chosen.length,
      durationSec: durSec,
      startedAt: Date.now(),
      questions: chosen
    };
  }

  /** Grade a completed CBT exam strictly (pure, testable). */
  function gradeExam(exam, answersMap = {}, flagsMap = {}, elapsedSec = 0) {
    const qs = Array.isArray(exam?.questions) ? exam.questions : [];
    let correct = 0;
    let wrong = 0;
    let blank = 0;
    let flaggedCount = 0;
    const byBlock = new Map();
    const details = [];

    for (let i = 0; i < qs.length; i++) {
      const q = qs[i];
      const sel = answersMap[i];
      const hasSel = sel !== undefined && sel !== null && Number.isInteger(Number(sel));
      const picked = hasSel ? Number(sel) : -1;
      const isFlagged = Boolean(flagsMap[i]);
      if (isFlagged) flaggedCount++;

      let status = 'blank';
      if (picked < 0) blank++;
      else if (picked === q.jawabanBenar) { correct++; status = 'correct'; }
      else { wrong++; status = 'wrong'; }

      const bKey = q.block || 'UMUM';
      if (!byBlock.has(bKey)) byBlock.set(bKey, { block: bKey, total: 0, correct: 0, wrong: 0, blank: 0 });
      const bStat = byBlock.get(bKey);
      bStat.total++;
      if (status === 'correct') bStat.correct++;
      else if (status === 'wrong') bStat.wrong++;
      else bStat.blank++;

      details.push({ index: i, q, picked, status, flagged: isFlagged });
    }

    const total = qs.length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const passed = pct >= PASSING_PCT;
    const blocks = [...byBlock.values()]
      .map(b => ({
        ...b,
        pct: b.total > 0 ? Math.round((b.correct / b.total) * 100) : 0
      }))
      .sort((a, b) => (a.pct - b.pct) || (b.wrong - a.wrong) || a.block.localeCompare(b.block, 'id'));

    const safeElapsed = Math.max(1, Math.min(exam?.durationSec || 86400, Math.round(Number(elapsedSec) || 1)));
    return {
      id: exam?.id || ('cbt_' + Date.now().toString(36)),
      title: exam?.title || 'Simulasi CBT',
      scope: exam?.scope || 'ALL',
      at: Date.now(),
      total,
      correct,
      wrong,
      blank,
      flaggedCount,
      pct,
      passed,
      passingPct: PASSING_PCT,
      elapsedSec: safeElapsed,
      avgSecPerQ: total > 0 ? Math.round(safeElapsed / total) : 0,
      weakestBlock: blocks[0]?.block || null,
      blocks,
      details
    };
  }

  function readHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { runs: [], bestPct: 0, updatedAt: 0 };
      const parsed = JSON.parse(raw);
      const runs = Array.isArray(parsed?.runs) ? parsed.runs : [];
      return {
        runs,
        bestPct: Math.max(Number(parsed?.bestPct) || 0, ...runs.map(r => Number(r?.pct) || 0)),
        updatedAt: Number(parsed?.updatedAt) || 0
      };
    } catch {
      return { runs: [], bestPct: 0, updatedAt: 0 };
    }
  }

  function saveRunToHistory(report) {
    try {
      const cur = readHistory();
      const compact = {
        id: report.id,
        at: report.at,
        title: report.title,
        scope: report.scope,
        total: report.total,
        correct: report.correct,
        wrong: report.wrong,
        blank: report.blank,
        pct: report.pct,
        passed: report.passed,
        elapsedSec: report.elapsedSec,
        weakestBlock: report.weakestBlock,
        blocks: report.blocks.slice(0, 12)
      };
      const runs = [compact, ...cur.runs.filter(r => r && r.id !== compact.id)].slice(0, 40);
      const next = {
        runs,
        bestPct: Math.max(cur.bestPct, compact.pct),
        updatedAt: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    } catch {
      return null;
    }
  }

  function fmtTime(sec) {
    const s = Math.max(0, Math.floor(Number(sec) || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    const pad = n => String(n).padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(r)}` : `${pad(m)}:${pad(r)}`;
  }

  /* ================= UI CONTROLLER ================= */
  const state = {
    mode: 'setup', // 'setup' | 'loading' | 'exam' | 'result'
    scope: 'ALL',
    presetId: 'uab',
    exam: null,
    pos: 0,
    answers: {},
    flags: {},
    remainingSec: 0,
    timerId: null,
    confirmOpen: false,
    report: null,
    reviewFilter: 'all',
    errorMsg: ''
  };

  function getCatalogByBlock() {
    const banks = (typeof window !== 'undefined' && window.BANKS) ? window.BANKS : {};
    const byBlock = new Map();
    let totalCount = 0;
    for (const [id, b] of Object.entries(banks)) {
      if (!b || typeof b !== 'object') continue;
      const cnt = Number(b.count || b.data?.length || 0);
      if (cnt <= 0) continue;
      const blk = String(b.block || 'UMUM').trim().toUpperCase() || 'UMUM';
      if (!byBlock.has(blk)) byBlock.set(blk, { block: blk, count: 0, bankIds: [] });
      const entry = byBlock.get(blk);
      entry.count += cnt;
      entry.bankIds.push(id);
      totalCount += cnt;
    }
    const list = [...byBlock.values()].sort((a, b) => b.count - a.count || a.block.localeCompare(b.block, 'id'));
    return { totalCount, list };
  }

  function stopTimer() {
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  async function loadPoolForScope(scope, targetCount) {
    if (typeof window.CLINED_BANKS_READY === 'function') {
      await window.CLINED_BANKS_READY().catch(() => {});
    }
    const banks = window.BANKS || {};
    const entries = Object.entries(banks).filter(([, b]) => {
      const cnt = Number(b?.count || b?.data?.length || 0);
      if (cnt <= 0) return false;
      if (scope === 'ALL') return true;
      return String(b.block || 'UMUM').trim().toUpperCase() === scope;
    });

    // Pick enough banks to cover targetCount (and spread across blocks in ALL mode)
    let toLoad = [];
    if (scope === 'ALL') {
      const byBlk = new Map();
      for (const [id, b] of shuffle(entries)) {
        const blk = String(b.block || 'UMUM').toUpperCase();
        if (!byBlk.has(blk)) byBlk.set(blk, []);
        byBlk.get(blk).push([id, b]);
      }
      const keys = shuffle([...byBlk.keys()]);
      let est = 0;
      let round = 0;
      while (est < targetCount * 2 && toLoad.length < 10) {
        let added = false;
        for (const k of keys) {
          const arr = byBlk.get(k);
          if (round < arr.length && toLoad.length < 10) {
            toLoad.push(arr[round]);
            est += Number(arr[round][1].count || arr[round][1].data?.length || 0);
            added = true;
          }
        }
        if (!added) break;
        round++;
      }
    } else {
      let est = 0;
      for (const item of shuffle(entries)) {
        toLoad.push(item);
        est += Number(item[1].count || item[1].data?.length || 0);
        if (est >= targetCount * 1.6 && toLoad.length >= 2) break;
      }
    }

    const loader = typeof window.CLINED_ENSURE_BANK_LOADED === 'function' ? window.CLINED_ENSURE_BANK_LOADED : null;
    await Promise.allSettled(toLoad.map(async ([id, b]) => {
      if (Array.isArray(b.data) && b.data.length > 0) return;
      if (loader) {
        await loader(id);
        return;
      }
      if (b.staticUrl) {
        const r = await fetch(b.staticUrl, { credentials: 'same-origin' });
        if (r.ok) {
          const arr = await r.json();
          if (Array.isArray(arr)) { b.data = arr; b.loaded = true; }
        }
      }
    }));

    const pool = [];
    const seen = new Set();
    for (const [id, b] of toLoad) {
      const arr = Array.isArray(b.data) ? b.data : [];
      arr.forEach((raw, idx) => {
        const q = normalizeQuestion(raw, id, b, idx);
        if (!q) return;
        const fp = q.soal.slice(0, 120).toLowerCase();
        if (seen.has(fp)) return;
        seen.add(fp);
        pool.push(q);
      });
    }
    return pool;
  }

  async function startTryout() {
    const preset = PRESETS.find(p => p.id === state.presetId) || PRESETS[1];
    state.errorMsg = '';
    state.mode = 'loading';
    render();
    try {
      const pool = await loadPoolForScope(state.scope, preset.count);
      if (!pool.length) {
        state.mode = 'setup';
        state.errorMsg = 'Belum ada soal yang bisa dimuat untuk cakupan ini. Pastikan koneksi internet aktif lalu coba lagi.';
        render();
        return;
      }
      const actualCount = Math.min(preset.count, pool.length);
      const scaledMin = Math.max(5, Math.round((preset.minutes / preset.count) * actualCount));
      const scopeLabel = state.scope === 'ALL' ? 'Campuran Semua Blok' : `Blok ${state.scope}`;
      const exam = buildExam(pool, actualCount, {
        minutes: scaledMin,
        scope: state.scope,
        title: `${preset.label} • ${scopeLabel}`
      });
      if (!exam) throw new Error('Gagal menyusun paket soal CBT.');

      state.exam = exam;
      state.pos = 0;
      state.answers = {};
      state.flags = {};
      state.remainingSec = exam.durationSec;
      state.confirmOpen = false;
      state.report = null;
      state.mode = 'exam';
      render();
      startTimer();
    } catch (err) {
      state.mode = 'setup';
      state.errorMsg = err?.message || 'Gagal menyiapkan simulasi CBT.';
      render();
    }
  }

  function startTimer() {
    stopTimer();
    state.timerId = setInterval(() => {
      if (state.mode !== 'exam') return stopTimer();
      state.remainingSec = Math.max(0, state.remainingSec - 1);
      const badge = document.getElementById('cbtTimerBadge');
      if (badge) {
        badge.textContent = `⏱ ${fmtTime(state.remainingSec)}`;
        badge.classList.toggle('warn', state.remainingSec <= 600 && state.remainingSec > 300);
        badge.classList.toggle('danger', state.remainingSec <= 300);
      }
      if (state.remainingSec <= 0) {
        stopTimer();
        submitExam(true);
      }
    }, 1000);
  }

  function submitExam(autoTimeout = false) {
    if (!state.exam) return;
    stopTimer();
    const elapsedSec = Math.max(1, state.exam.durationSec - state.remainingSec);
    const report = gradeExam(state.exam, state.answers, state.flags, elapsedSec);
    report.autoTimeout = Boolean(autoTimeout);
    state.report = report;
    state.confirmOpen = false;
    state.reviewFilter = 'all';
    state.mode = 'result';
    saveRunToHistory(report);

    try {
      if (typeof window.addXP === 'function' && report.correct > 0) {
        const xp = Math.min(180, Math.max(15, report.correct * 2 + (report.passed ? 25 : 0)));
        const res = window.addXP(xp, `Simulasi CBT • ${report.pct}%`, { kind: 'quiz', ref: `cbt:${report.id}`, silent: true });
        if (res?.gained > 0 && typeof window.showXPPopup === 'function') {
          window.showXPPopup(res.gained, `Simulasi CBT • ${report.pct}%`, !!res.leveledUp);
        }
      }
      window.recordDailyQuestion?.();
    } catch {}

    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderSetup(host) {
    const cat = getCatalogByBlock();
    const hist = readHistory();
    const selPreset = PRESETS.find(p => p.id === state.presetId) || PRESETS[1];
    const scopePoolCount = state.scope === 'ALL'
      ? cat.totalCount
      : (cat.list.find(x => x.block === state.scope)?.count || 0);

    const scopeChips = [
      `<button type="button" class="cbt-chip${state.scope === 'ALL' ? ' active' : ''}" data-cbt-scope="ALL">🌐 Semua Blok ala UKMPPD (${cat.totalCount})</button>`,
      ...cat.list.map(b => `<button type="button" class="cbt-chip${state.scope === b.block ? ' active' : ''}" data-cbt-scope="${esc(b.block)}">${esc(b.block)} (${b.count})</button>`)
    ].join('');

    const presetCards = PRESETS.map(p => `
      <button type="button" class="cbt-preset-btn${state.presetId === p.id ? ' active' : ''}" data-cbt-preset="${p.id}">
        <b>${esc(p.label)}</b>
        <span>${p.count} Soal · ${p.minutes} Menit</span>
        <small>${esc(p.desc)}</small>
      </button>
    `).join('');

    const historyHtml = hist.runs.length
      ? hist.runs.slice(0, 6).map(r => {
          const dt = r.at ? new Date(r.at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
          return `<div class="cbt-history-row">
            <div>
              <b>${esc(r.title || 'Simulasi CBT')}</b>
              <div style="font-size:.76rem;color:var(--muted,#64748b)">${esc(dt)} · ${r.correct}/${r.total} benar · ${fmtTime(r.elapsedSec)}${r.weakestBlock ? ` · Terlemah: ${esc(r.weakestBlock)}` : ''}</div>
            </div>
            <span class="cbt-pass-badge ${r.passed ? 'pass' : 'fail'}">${r.pct}% ${r.passed ? 'LULUS' : 'ULANG'}</span>
          </div>`;
        }).join('')
      : '<div style="font-size:.84rem;color:var(--muted,#64748b)">Belum ada riwayat Simulasi CBT. Mulai ujian pertamamu untuk memetakan kelemahan per sistem organ!</div>';

    host.innerHTML = `
      <div class="cbt-root">
        <div class="cbt-hero">
          <span class="cbt-hero-kicker">🩺 MODE UJIAN KETAT • STANDAR UKMPPD / UAB</span>
          <h3>Simulasi CBT Berwaktu Ketat</h3>
          <p>Uji ketahanan klinismu dalam suasana ujian sesungguhnya: timer hitung mundur penuh, tanda ragu-ragu, tanpa bocoran jawaban di tengah jalan, dan rapor kelemahan per sistem organ setelah submit.</p>
          <div class="cbt-rules-list">
            <div class="cbt-rule-pill"><b>🔒 Zero Spoiler</b><small>Pembahasan baru terbuka setelah ujian dikumpulkan.</small></div>
            <div class="cbt-rule-pill"><b>⏱ Auto-Submit</b><small>Ujian otomatis selesai tepat saat waktu habis (00:00).</small></div>
            <div class="cbt-rule-pill"><b>📊 Rapor Sistem Organ</b><small>Urutan blok terlemah + cetak / simpan PDF.</small></div>
          </div>
        </div>

        ${state.errorMsg ? `<div class="cbt-card" style="border-color:#ef4444;color:#dc2626;font-weight:700">⚠️ ${esc(state.errorMsg)}</div>` : ''}

        <div class="cbt-card">
          <div class="cbt-section-label">1. Pilih Cakupan Sistem Organ / Blok</div>
          <div class="cbt-scope-grid">${scopeChips}</div>

          <div class="cbt-section-label" style="margin-top:18px">2. Pilih Paket Waktu &amp; Jumlah Soal</div>
          <div class="cbt-preset-grid">${presetCards}</div>

          <div class="cbt-start-bar">
            <div class="cbt-pool-info">
              Tersedia <b>${scopePoolCount.toLocaleString('id')}</b> soal pada cakupan terpilih · Standar kelulusan: <b>≥ ${PASSING_PCT}%</b>
            </div>
            <button type="button" class="cbt-btn-primary" id="cbtStartBtn" ${scopePoolCount <= 0 ? 'disabled' : ''}>
              ▶ Mulai ${esc(selPreset.label)} (${Math.min(selPreset.count, Math.max(1, scopePoolCount))} Soal)
            </button>
          </div>
        </div>

        <div class="cbt-card">
          <div class="cbt-section-label">Riwayat Tryout Tersinkron (${hist.runs.length} sesi${hist.bestPct ? ` · Rekor ${hist.bestPct}%` : ''})</div>
          <div class="cbt-history-list">${historyHtml}</div>
        </div>

        <div class="cbt-disclaimer-note">
          ⚖️ <strong>Catatan Edukasi Medis:</strong> Simulasi CBT CLINED disusun khusus untuk latihan mahasiswa kedokteran (persiapan UAB/UKMPPD) dan bukan merupakan standar kelulusan resmi kampus maupun panduan keputusan klinis pasien. <a href="legal.html#disclaimer" target="_blank" rel="noopener">Baca Disclaimer Medis</a>.
        </div>
      </div>
    `;

    host.querySelectorAll('[data-cbt-scope]').forEach(btn => {
      btn.addEventListener('click', () => { state.scope = btn.dataset.cbtScope; render(); });
    });
    host.querySelectorAll('[data-cbt-preset]').forEach(btn => {
      btn.addEventListener('click', () => { state.presetId = btn.dataset.cbtPreset; render(); });
    });
    host.querySelector('#cbtStartBtn')?.addEventListener('click', startTryout);
  }

  function renderLoading(host) {
    host.innerHTML = `
      <div class="cbt-root">
        <div class="cbt-card" style="text-align:center;padding:42px 20px">
          <div style="font-size:2.4rem;margin-bottom:8px">🩺</div>
          <h3 style="margin:0 0 6px">Menyiapkan Paket Soal CBT…</h3>
          <p style="margin:0;color:var(--muted,#64748b);font-size:.9rem">Mengacak soal klinis lintas blok dan menyiapkan lembar ujian berwaktu ketat.</p>
        </div>
      </div>
    `;
  }

  function renderExam(host) {
    const ex = state.exam;
    if (!ex) return;
    const q = ex.questions[state.pos];
    const picked = state.answers[state.pos];
    const isFlagged = Boolean(state.flags[state.pos]);
    const answeredCount = Object.keys(state.answers).length;
    const flaggedCount = Object.values(state.flags).filter(Boolean).length;
    const unansweredCount = ex.total - answeredCount;
    const timerCls = state.remainingSec <= 300 ? ' danger' : (state.remainingSec <= 600 ? ' warn' : '');

    const optionsHtml = q.opsi.map((opt, idx) => `
      <button type="button" class="cbt-opt-btn${picked === idx ? ' selected' : ''}" data-cbt-opt="${idx}">
        <span class="cbt-opt-letter">${LETTERS[idx] || idx + 1}</span>
        <span>${esc(opt)}</span>
      </button>
    `).join('');

    const paletteHtml = ex.questions.map((_, i) => {
      const cls = ['cbt-pal-num'];
      if (state.flags[i]) cls.push('flagged');
      else if (state.answers[i] !== undefined) cls.push('answered');
      if (i === state.pos) cls.push('current');
      return `<button type="button" class="${cls.join(' ')}" data-cbt-jump="${i}" aria-label="Soal nomor ${i + 1}">${i + 1}</button>`;
    }).join('');

    const modalHtml = state.confirmOpen ? `
      <div class="cbt-modal-backdrop" id="cbtConfirmModal" role="dialog" aria-modal="true" aria-labelledby="cbtConfirmTitle">
        <div class="cbt-modal-card">
          <h3 id="cbtConfirmTitle" style="margin:0 0 6px">Kumpulkan Jawaban CBT?</h3>
          <p style="margin:0;font-size:.86rem;color:var(--muted,#64748b)">Setelah dikumpulkan, jawaban terkunci dan pembahasan lengkap serta rapor sistem organ akan langsung dibuka.</p>
          <div class="cbt-modal-stats">
            <div class="cbt-modal-stat"><b style="color:#0d9488">${answeredCount}</b><small>Terjawab</small></div>
            <div class="cbt-modal-stat"><b style="color:#ef4444">${unansweredCount}</b><small>Kosong</small></div>
            <div class="cbt-modal-stat"><b style="color:#f59e0b">${flaggedCount}</b><small>Ragu-ragu</small></div>
          </div>
          <div class="cbt-modal-actions">
            <button type="button" class="cbt-btn-secondary" id="cbtCancelSubmit">Periksa Lagi</button>
            <button type="button" class="cbt-btn-primary" id="cbtConfirmSubmit">✓ Ya, Kumpulkan Sekarang</button>
          </div>
        </div>
      </div>
    ` : '';

    host.innerHTML = `
      <div class="cbt-root">
        <div class="cbt-exam-topbar">
          <div class="cbt-timer-badge${timerCls}" id="cbtTimerBadge" aria-live="off">⏱ ${fmtTime(state.remainingSec)}</div>
          <div class="cbt-topbar-meta">
            <span>Soal <b>${state.pos + 1}/${ex.total}</b></span>
            <span>·</span>
            <span>Terjawab <b>${answeredCount}</b></span>
            ${flaggedCount > 0 ? `<span>· 🚩 <b>${flaggedCount}</b></span>` : ''}
          </div>
          <button type="button" class="cbt-btn-danger" id="cbtOpenSubmitBtn">Selesai &amp; Kumpulkan</button>
        </div>

        <div class="cbt-exam-layout">
          <div class="cbt-card">
            <div class="cbt-q-head">
              <span class="cbt-q-badge">Soal #${state.pos + 1} · ${esc(q.block)}</span>
              <button type="button" class="cbt-flag-btn${isFlagged ? ' flagged' : ''}" id="cbtFlagBtn">
                ${isFlagged ? '🚩 Ditandai Ragu-ragu' : '⚑ Tandai Ragu-ragu'}
              </button>
            </div>
            ${q.gambar ? `<img class="cbt-q-img" src="${esc(q.gambar)}" alt="Ilustrasi soal klinis">` : ''}
            <p class="cbt-q-stem">${esc(q.soal)}</p>
            <div class="cbt-options">${optionsHtml}</div>
            <div class="cbt-nav-footer">
              <button type="button" class="cbt-btn-secondary" id="cbtPrevBtn" ${state.pos === 0 ? 'disabled' : ''}>‹ Sebelumnya</button>
              <button type="button" class="cbt-btn-primary" id="cbtNextBtn">
                ${state.pos + 1 < ex.total ? 'Selanjutnya ›' : 'Selesai & Kumpulkan ✓'}
              </button>
            </div>
          </div>

          <aside class="cbt-card cbt-palette-card" aria-label="Navigasi nomor soal">
            <div class="cbt-section-label">Navigasi Soal (${answeredCount}/${ex.total})</div>
            <div class="cbt-palette-grid">${paletteHtml}</div>
            <div class="cbt-palette-legend">
              <span><i class="cbt-leg-dot cbt-leg-ans"></i>Terjawab</span>
              <span><i class="cbt-leg-dot cbt-leg-flg"></i>Ragu-ragu</span>
              <span><i class="cbt-leg-dot cbt-leg-emp"></i>Kosong</span>
            </div>
          </aside>
        </div>
        ${modalHtml}
      </div>
    `;

    host.querySelectorAll('[data-cbt-opt]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.answers[state.pos] = Number(btn.dataset.cbtOpt);
        render();
      });
    });
    host.querySelectorAll('[data-cbt-jump]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.pos = Number(btn.dataset.cbtJump);
        render();
      });
    });
    host.querySelector('#cbtFlagBtn')?.addEventListener('click', () => {
      state.flags[state.pos] = !state.flags[state.pos];
      render();
    });
    host.querySelector('#cbtPrevBtn')?.addEventListener('click', () => {
      if (state.pos > 0) { state.pos--; render(); }
    });
    host.querySelector('#cbtNextBtn')?.addEventListener('click', () => {
      if (state.pos + 1 < ex.total) { state.pos++; render(); }
      else { state.confirmOpen = true; render(); }
    });
    host.querySelector('#cbtOpenSubmitBtn')?.addEventListener('click', () => {
      state.confirmOpen = true;
      render();
    });
    host.querySelector('#cbtCancelSubmit')?.addEventListener('click', () => {
      state.confirmOpen = false;
      render();
    });
    host.querySelector('#cbtConfirmSubmit')?.addEventListener('click', () => submitExam(false));
  }

  function renderResult(host) {
    const r = state.report;
    if (!r) return;

    const organRows = r.blocks.map(b => {
      const cls = b.pct < 50 ? 'weak' : (b.pct < PASSING_PCT ? 'mid' : 'strong');
      const statusText = b.pct < 50 ? 'Prioritas Tinggi' : (b.pct < PASSING_PCT ? 'Perlu Penguatan' : 'Aman (≥ 66%)');
      return `
        <div class="cbt-organ-row">
          <div class="cbt-organ-head">
            <b>${esc(b.block)}</b>
            <span>${b.correct}/${b.total} benar (<b>${b.pct}%</b>) · <small>${statusText}</small></span>
          </div>
          <div class="cbt-organ-bar"><div class="cbt-organ-fill ${cls}" style="width:${b.pct}%"></div></div>
        </div>
      `;
    }).join('');

    const weakBlocks = r.blocks.filter(b => b.pct < PASSING_PCT).slice(0, 3);
    const recommendation = weakBlocks.length
      ? `Fokuskan sesi belajar berikutnya pada blok <strong>${weakBlocks.map(b => esc(b.block)).join(', ')}</strong> — gunakan menu <em>Smart Review</em> atau <em>Latihan Materi</em> sebelum mengulang tryout.`
      : 'Seluruh sistem organ melampaui ambang batas 66%! Pertahankan ritme dengan menaikkan paket soal atau melatih kasus klinis di <em>Meja Jaga IGD</em>.';

    const filtered = r.details.filter(d => {
      if (state.reviewFilter === 'wrong') return d.status === 'wrong';
      if (state.reviewFilter === 'blank') return d.status === 'blank';
      if (state.reviewFilter === 'flagged') return d.flagged;
      return true;
    });

    const reviewHtml = filtered.map(d => {
      const q = d.q;
      const statusCls = d.status === 'correct' ? 'is-correct' : (d.status === 'wrong' ? 'is-wrong' : 'is-blank');
      const statusLbl = d.status === 'correct' ? '✓ Benar' : (d.status === 'wrong' ? '✕ Salah' : '○ Tidak Dijawab');
      const myAnsTxt = d.picked >= 0 ? `${LETTERS[d.picked]}. ${q.opsi[d.picked]}` : '— (kosong)';
      const keyTxt = `${LETTERS[q.jawabanBenar]}. ${q.opsi[q.jawabanBenar]}`;
      let extraPilihan = '';
      if (q.pembahasanPilihan && typeof q.pembahasanPilihan === 'object') {
        const lines = Object.entries(q.pembahasanPilihan).map(([k, v]) => `${k}. ${v}`).join('\n');
        if (lines) extraPilihan = `\n\nAnalisis Opsi:\n${lines}`;
      }
      const explainBody = (q.pembahasan || 'Pembahasan ringkas belum tersedia untuk soal ini.') + extraPilihan;

      return `
        <article class="cbt-rev-item ${statusCls}">
          <div class="cbt-q-head" style="margin-bottom:8px">
            <span class="cbt-q-badge">#${d.index + 1} · ${esc(q.block)} · ${statusLbl}${d.flagged ? ' · 🚩 Ragu-ragu' : ''}</span>
            <small style="color:var(--muted,#64748b)">${esc(q.bankName)}</small>
          </div>
          <p class="cbt-q-stem" style="margin-bottom:10px;font-size:.95rem">${esc(q.soal)}</p>
          <div style="font-size:.86rem;display:flex;flex-direction:column;gap:4px">
            <div><strong>Jawabanmu:</strong> ${esc(myAnsTxt)}</div>
            <div style="color:#0f766e"><strong>Kunci Jawaban:</strong> ${esc(keyTxt)}</div>
          </div>
          <div class="cbt-rev-explain"><strong>Pembahasan:</strong>\n${esc(explainBody)}</div>
        </article>
      `;
    }).join('') || '<div style="font-size:.88rem;color:var(--muted,#64748b);padding:12px 0">Tidak ada soal pada filter ini.</div>';

    host.innerHTML = `
      <div class="cbt-root">
        <div class="cbt-score-hero">
          <div>
            <div style="font-size:.76rem;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8;font-weight:800">${esc(r.title)}${r.autoTimeout ? ' · WAKTU HABIS' : ''}</div>
            <div class="cbt-score-big">${r.pct}%</div>
            <div style="font-size:.86rem;color:#cbd5e1;margin-top:4px">${r.correct} benar dari ${r.total} soal · Durasi ${fmtTime(r.elapsedSec)} (~${r.avgSecPerQ} dtk/soal)</div>
          </div>
          <span class="cbt-pass-badge ${r.passed ? 'pass' : 'fail'}">
            ${r.passed ? '🏆 LULUS STANDAR UKMPPD (≥ 66%)' : '⚠️ PERLU PENGUATAN (< 66%)'}
          </span>
        </div>

        <div class="cbt-kpi-grid">
          <div class="cbt-kpi"><b style="color:#10b981">${r.correct}</b><small>Benar</small></div>
          <div class="cbt-kpi"><b style="color:#ef4444">${r.wrong}</b><small>Salah</small></div>
          <div class="cbt-kpi"><b style="color:#f59e0b">${r.blank}</b><small>Kosong</small></div>
          <div class="cbt-kpi"><b>${r.flaggedCount}</b><small>Ditandai Ragu</small></div>
        </div>

        <div class="cbt-card">
          <div class="cbt-section-label">📊 Rapor Kelemahan per Sistem Organ / Blok (Terlemah di Atas)</div>
          <div class="cbt-organ-list">${organRows}</div>
          <div class="cbt-disclaimer-note" style="margin-top:14px">💡 ${recommendation}</div>
        </div>

        <div class="cbt-report-actions">
          <button type="button" class="cbt-btn-primary" id="cbtNewBtn">🔄 Tryout Baru</button>
          <button type="button" class="cbt-btn-secondary" id="cbtPrintBtn">🖨 Cetak / Simpan PDF</button>
          <button type="button" class="cbt-btn-secondary" id="cbtHomeBtn">‹ Beranda</button>
        </div>

        <div class="cbt-card">
          <div class="cbt-section-label">📖 Pembahasan Lengkap (${filtered.length} soal ditampilkan)</div>
          <div class="cbt-review-filters">
            <button type="button" class="cbt-chip${state.reviewFilter === 'all' ? ' active' : ''}" data-cbt-filter="all">Semua (${r.total})</button>
            <button type="button" class="cbt-chip${state.reviewFilter === 'wrong' ? ' active' : ''}" data-cbt-filter="wrong">Salah (${r.wrong})</button>
            <button type="button" class="cbt-chip${state.reviewFilter === 'blank' ? ' active' : ''}" data-cbt-filter="blank">Kosong (${r.blank})</button>
            <button type="button" class="cbt-chip${state.reviewFilter === 'flagged' ? ' active' : ''}" data-cbt-filter="flagged">Ragu-ragu (${r.flaggedCount})</button>
          </div>
          <div>${reviewHtml}</div>
        </div>
      </div>
    `;

    host.querySelector('#cbtNewBtn')?.addEventListener('click', () => {
      state.mode = 'setup';
      state.exam = null;
      state.report = null;
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    host.querySelector('#cbtPrintBtn')?.addEventListener('click', () => window.print());
    host.querySelector('#cbtHomeBtn')?.addEventListener('click', () => window.show?.('home', { force: true }));
    host.querySelectorAll('[data-cbt-filter]').forEach(btn => {
      btn.addEventListener('click', () => { state.reviewFilter = btn.dataset.cbtFilter; render(); });
    });
  }

  function render() {
    const host = document.getElementById('cbtTryoutHost');
    if (!host) return;
    if (state.mode === 'loading') return renderLoading(host);
    if (state.mode === 'exam') return renderExam(host);
    if (state.mode === 'result') return renderResult(host);
    return renderSetup(host);
  }

  function open() {
    const page = document.getElementById('cbtTryoutPage');
    if (page && !page.classList.contains('active')) {
      window.show?.('cbtTryoutPage', { force: true });
      window.scrollTo(0, 0);
    }
    if (state.mode !== 'exam') {
      state.mode = state.report ? 'result' : 'setup';
    }
    render();
    if (typeof window.CLINED_BANKS_READY === 'function') {
      window.CLINED_BANKS_READY().then(() => { if (state.mode === 'setup') render(); }).catch(() => {});
    }
  }

  window.addEventListener('clined:view-change', e => {
    if (e.detail !== 'cbtTryoutPage' && state.mode === 'exam') {
      // Pause timer while user navigates away; resumes if they reopen
      stopTimer();
    } else if (e.detail === 'cbtTryoutPage' && state.mode === 'exam' && !state.timerId && state.remainingSec > 0) {
      startTimer();
    }
  });

  window.CLINED_CBT_TRYOUT = {
    open,
    buildExam,
    gradeExam,
    readHistory,
    normalizeQuestion,
    PASSING_PCT
  };
})();
