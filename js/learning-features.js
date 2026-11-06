/* ============================================================
   CLINED LEARNING FEATURES v1
   1. Weakness Radar Chart (per blok)
   2. SM-2 Spaced Repetition + Smart Review per Blok
   3. Catatan pribadi per soal
   ============================================================ */
(function(){
'use strict';

/* ── Storage keys ── */
const KEY_SM2   = 'clined_sm2_v1';      // SM-2 data per soal id
const KEY_NOTES = 'clined_notes_v1';    // catatan per soal id

/* ── Helpers ── */
const getSM2Data  = () => { try { return JSON.parse(localStorage.getItem(KEY_SM2)||'{}'); } catch { return {}; } };
const saveSM2Data = d => localStorage.setItem(KEY_SM2, JSON.stringify(d));
const getNotes    = () => { try { return JSON.parse(localStorage.getItem(KEY_NOTES)||'{}'); } catch { return {}; } };
const saveNotes   = d => localStorage.setItem(KEY_NOTES, JSON.stringify(d));

/* ═══════════════════════════════════════════════════════
   FITUR 1: WEAKNESS RADAR CHART
   ═══════════════════════════════════════════════════════ */

/* Map block → label display */
const BLOCK_LABELS = {
  GINJAL:    'Ginjal',
  ENDOKRINE: 'Endokrin',
  KEDKEL:    'Ked. Keluarga',
  KEDKOM:    'Ked. Komunitas',
  MUSKULOSKELETAL: 'Musku',
  KARDIOLOGI:'Kardio',
  PULMONOLOGI:'Pulmo',
  NEUROLOGI: 'Neuro',
  GASTRO:    'Gastro',
  PSIKIATRI: 'Psikiatri',
  OTHER:     'Lainnya',
};

function computeBlockScores() {
  /* Akurasi per blok dari riwayat kuis, dibobot jumlah soal (bukan rata-rata persen antar sesi). */
  try {
    const hist = JSON.parse(localStorage.getItem('gaster_v8_history') || '[]');
    const blocks = {};
    hist.forEach(h => {
      let block = '';
      if (h.block) block = String(h.block).replace(/^BLOK\s+/i, '').toUpperCase();          // Latihan Materi
      else if (h.bank && typeof window.blockForBank === 'function') block = window.blockForBank(h.bank);
      else if (h.bank && typeof BANKS !== 'undefined' && BANKS[h.bank]) block = String(BANKS[h.bank].block || '').replace(/^BLOK\s+/i, '').toUpperCase();
      if (block === 'MUSKULO') block = 'MUSKULOSKELETAL';
      if (!block || block === 'OTHER') return;
      const total = Number(h.validTotal ?? h.total) || 0;
      if (!total) return;
      const correct = Number.isFinite(Number(h.correct)) && h.correct != null ? Number(h.correct) : Math.round(total * Number(h.pct || 0) / 100);
      if (!blocks[block]) blocks[block] = { correct: 0, total: 0, n: 0, last: 0 };
      blocks[block].correct += Math.min(correct, total);
      blocks[block].total += total;
      blocks[block].n++;
      blocks[block].last = Math.max(blocks[block].last, Date.parse(h.date || h.timestamp || '') || 0);
    });
    return blocks;
  } catch { return {}; }
}

function blockDisplay(key) {
  if (BLOCK_LABELS[key]) return BLOCK_LABELS[key];
  const t = String(key || '').toLowerCase().replace(/_/g, ' ');
  return t.length <= 4 ? t.toUpperCase() : t.replace(/\b\w/g, c => c.toUpperCase());
}

/* Tingkat penguasaan per ambang akurasi. Dipakai untuk warna bar + label singkat. */
function scoreLevel(pct) {
  if (pct < 60) return { tier: 'weak', label: 'Perlu diperkuat', color: '#ef4444' };
  if (pct < 80) return { tier: 'mid', label: 'Cukup', color: '#f5a524' };
  return { tier: 'ok', label: 'Kuat', color: '#58cc02' };
}

function blockPageId(key) {
  const sec = [...document.querySelectorAll('section.view[data-block-key]')]
    .find(el => String(el.dataset.blockKey).trim().toUpperCase() === String(key).toUpperCase());
  return sec ? sec.id : '';
}

/* Weakness Radar: ringkasan + peringkat blok (paling lemah dulu) + tombol latihan.
   Dipakai di Analitik Belajar dan Clinical Dashboard lewat targetId berbeda. */
function renderWeaknessRadar(targetId = 'weaknessRadar') {
  const target = document.getElementById(targetId);
  if (!target) return;

  const scores = computeBlockScores();
  const all = Object.entries(scores).map(([key, v]) => ({ key, ...v, pct: Math.round(v.correct / v.total * 100) }));
  if (!all.length) {
    target.innerHTML = `<div class="weakness-radar-empty"><span class="wr-empty-ico">🕸️</span><b>Belum ada data</b><small>Kerjakan beberapa kuis dulu, nanti peta kelemahanmu muncul di sini.</small></div>`;
    return;
  }
  all.sort((a, b) => a.pct - b.pct || b.total - a.total);
  const list = all.slice(0, 8);
  const weakN = all.filter(x => x.pct < 60).length;
  const midN = all.filter(x => x.pct >= 60 && x.pct < 80).length;
  const okN = all.length - weakN - midN;
  const tot = all.reduce((n, x) => n + x.total, 0);
  const avg = Math.round(all.reduce((n, x) => n + x.correct, 0) / tot * 100);
  const focus = all[0], fl = scoreLevel(focus.pct);

  const rows = list.map((v, i) => {
    const lv = scoreLevel(v.pct), pid = blockPageId(v.key);
    return `<div class="wr-row wr-${lv.tier}">
      <span class="wr-rank">${i + 1}</span>
      <div class="wr-main">
        <div class="wr-row-top">
          <span class="wr-label">${esc(blockDisplay(v.key))}</span>
          <span class="wr-pct">${v.pct}%</span>
        </div>
        <div class="wr-track" aria-hidden="true">
          <div class="wr-fill" style="width:${Math.max(4, Math.min(100, v.pct))}%"></div>
          <div class="wr-target" style="left:60%"></div>
        </div>
        <div class="wr-foot">
          <small class="wr-meta"><span class="wr-badge">${lv.label}</span>${v.total} soal • ${v.n} sesi</small>
          ${pid && lv.tier !== 'ok' ? `<button type="button" class="wr-go" data-wr-block="${esc(pid)}">Latihan</button>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');

  target.innerHTML = `
    <div class="wr-summary">
      <div class="wr-avg"><b>${avg}%</b><small>rata-rata</small></div>
      <div class="wr-chips">
        <span class="wr-chip wr-weak"><i></i>${weakN} lemah</span>
        <span class="wr-chip wr-mid"><i></i>${midN} cukup</span>
        <span class="wr-chip wr-ok"><i></i>${okN} kuat</span>
      </div>
    </div>
    <div class="wr-focus wr-${fl.tier}">
      <span class="wr-focus-ico">${focus.pct < 60 ? '🎯' : focus.pct < 80 ? '📈' : '🏆'}</span>
      <span>${focus.pct < 80 ? 'Fokus berikutnya: ' : 'Semua blok sudah kuat. Terendah: '}<b>${esc(blockDisplay(focus.key))}</b> (${focus.pct}%)</span>
    </div>
    <div class="weakness-radar-list">${rows}</div>
    <div class="wr-legend">
      <span><i class="wr-dot wr-weak"></i>&lt; 60% perlu diperkuat</span>
      <span><i class="wr-dot wr-mid"></i>60–79% cukup</span>
      <span><i class="wr-dot wr-ok"></i>≥ 80% kuat</span>
      <span class="wr-legend-line"><i class="wr-tick"></i>target 60%</span>
    </div>`;
}

document.addEventListener('click', e => {
  const btn = e.target.closest('[data-wr-block]');
  if (btn && typeof window.show === 'function') window.show(btn.dataset.wrBlock);
});

/* esc() lokal (fallback bila esc global app.js belum ter-load duluan). */
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}


/* ═══════════════════════════════════════════════════════
   FITUR 2: SM-2 SPACED REPETITION + SMART REVIEW PER BLOK
   ═══════════════════════════════════════════════════════ */

/*
  SM-2 Algorithm:
  - EF (easiness factor): default 2.5, min 1.3
  - interval: 1 → 6 → EF×prev_interval
  - q (quality): 0-5 berdasarkan jawaban
    0-2 = salah → reset interval ke 1, turunkan EF
    3   = benar tapi sulit → interval tidak naik
    4   = benar → normal
    5   = benar sangat mudah → bonus EF
*/
function sm2Update(soalId, quality) {
  /* quality: 0=salah, 3=benar susah, 4=benar, 5=benar mudah */
  const data = getSM2Data();
  const now = Date.now();
  let card = data[soalId] || { ef: 2.5, interval: 1, repetitions: 0, nextDue: now };

  if (quality < 3) {
    /* Salah → reset */
    card.repetitions = 0;
    card.interval = 1;
  } else {
    /* Benar */
    if (card.repetitions === 0) card.interval = 1;
    else if (card.repetitions === 1) card.interval = 6;
    else card.interval = Math.round(card.interval * card.ef);

    card.repetitions++;
  }

  /* Update EF */
  card.ef = Math.max(1.3, card.ef + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  card.nextDue = now + card.interval * 86400000;
  card.lastQuality = quality;
  card.lastSeen = now;

  data[soalId] = card;
  saveSM2Data(data);
  return card;
}

function getSM2DueIds(limit = 20) {
  const data = getSM2Data();
  const now = Date.now();
  return Object.entries(data)
    .filter(([, c]) => c.nextDue <= now)
    .sort((a, b) => a[1].nextDue - b[1].nextDue)
    .slice(0, limit)
    .map(([id]) => id);
}

/* Render Smart Review per Blok */
function renderSmartReviewByBlock() {
  const box = document.getElementById('smartReviewByBlock');
  if (!box) return;

  const wrong = JSON.parse(localStorage.getItem('gaster_v8_wrong_stats') || '[]');
  if (!wrong.length) {
    box.innerHTML = '<div class="empty">Belum ada data. Kerjakan kuis dulu.</div>';
    return;
  }

  /* Group by block */
  const byBlock = {};
  wrong.forEach(q => {
    if (!q || !q.jawabanBenar == null) return;
    let block = 'OTHER';
    if (typeof BANKS !== 'undefined' && BANKS[q.bank]) {
      block = BANKS[q.bank].block || 'OTHER';
    } else if (typeof STATIC_BANK_META !== 'undefined') {
      const meta = STATIC_BANK_META.find(m => m.id === q.bank);
      if (meta) block = (meta.block || 'OTHER').replace(/^BLOK\s+/i, '');
    }
    if (!byBlock[block]) byBlock[block] = [];
    byBlock[block].push(q);
  });

  const sm2 = getSM2Data();
  const now = Date.now();

  box.innerHTML = Object.entries(byBlock)
    .sort((a,b) => b[1].length - a[1].length)
    .map(([block, qs]) => {
      const label = BLOCK_LABELS[block] || block;
      const due = qs.filter(q => {
        const c = sm2[q.id];
        return !c || c.nextDue <= now;
      }).length;
      const total = qs.length;
      const pct = Math.round(due / total * 100);
      const urgentClass = due > 0 ? 'sr-block-urgent' : 'sr-block-ok';

      return `<div class="sr-block-row ${urgentClass}">
        <div class="sr-block-info">
          <b>${label}</b>
          <small>${due} soal due • ${total} total perlu review</small>
        </div>
        <div class="sr-block-right">
          <div class="sr-due-badge">${due}</div>
          <button class="sr-start-btn" data-block="${block}" ${!due ? 'disabled' : ''}>
            ${due ? 'Review' : '✓ Lunas'}
          </button>
        </div>
      </div>`;
    }).join('');

  /* Bind start buttons */
  box.querySelectorAll('.sr-start-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => startSmartReviewBlock(btn.dataset.block));
  });
}

function startSmartReviewBlock(block) {
  try {
    const wrong = JSON.parse(localStorage.getItem('gaster_v8_wrong_stats') || '[]');
    const sm2 = getSM2Data();
    const now = Date.now();

    /* Filter: blok ini + SM-2 due */
    const due = wrong.filter(q => {
      if (!q || q.jawabanBenar == null) return false;
      let qBlock = 'OTHER';
      if (typeof BANKS !== 'undefined' && BANKS[q.bank]) qBlock = BANKS[q.bank].block || 'OTHER';
      else if (typeof STATIC_BANK_META !== 'undefined') {
        const meta = STATIC_BANK_META.find(m => m.id === q.bank);
        if (meta) qBlock = (meta.block || 'OTHER').replace(/^BLOK\s+/i, '');
      }
      if (qBlock !== block) return false;
      const c = sm2[q.id];
      return !c || c.nextDue <= now;
    });

    if (!due.length) { if (typeof showToast === 'function') showToast('Tidak ada soal due untuk blok ini.'); return; }

    /* Build quiz array menggunakan resolveQuestionRef yang sudah ada */
    const rows = due.slice(0, 15).map(q => {
      if (typeof resolveQuestionRef === 'function') {
        const ref = resolveQuestionRef(q.id);
        return ref && typeof rawToQuiz === 'function' ? rawToQuiz(ref.bankId, ref.idx) : null;
      }
      return null;
    }).filter(Boolean);

    if (!rows.length) { if (typeof showToast === 'function') showToast('Soal tidak tersedia, coba muat bank dulu.'); return; }

    /* Inject ke quiz engine yang sudah ada */
    window.__srBlock = block; // flag untuk update SM-2 setelah jawab
    quiz = rows;
    selectedBank = rows[0].bank;
    selectedCount = rows.length;
    pos = 0; score = 0; streak = 0; sessionXP = 0; lastXPGain = 0;
    playerHP = 100; enemyHP = 100; wrongCombo = 0;
    answered = false; selectedAnswer = null; flagged = new Set();
    timerDuration = 0; timerSeconds = 0; timerDeadline = 0;
    if (typeof clearSession === 'function') clearSession();
    if (typeof show === 'function') show('quiz');
    if (typeof renderQuestion === 'function') renderQuestion();
    if (typeof startTimer === 'function') startTimer();
  } catch(e) { console.error('startSmartReviewBlock error', e); }
}

/* Hook ke answer() untuk update SM-2 */
function hookSM2ToAnswer() {
  const origAnswer = window.answer;
  if (!origAnswer || window.__sm2Hooked) return;
  window.__sm2Hooked = true;

  window.answer = function(i) {
    origAnswer.apply(this, arguments);
    /* Setelah answer dipanggil, cek apakah benar/salah */
    setTimeout(() => {
      try {
        const q = quiz && quiz[pos];
        if (!q || q.jawabanBenar == null) return;
        const good = i === q.jawabanBenar;
        /* quality: 0=salah, 4=benar */
        const quality = good ? 4 : 0;
        sm2Update(q.id, quality);
      } catch(e) {}
    }, 50);
  };
}

/* ═══════════════════════════════════════════════════════
   FITUR 3: CATATAN PRIBADI PER SOAL
   ═══════════════════════════════════════════════════════ */

function loadNoteForQuestion(soalId) {
  const notes = getNotes();
  const input = document.getElementById('soalNoteInput');
  const status = document.getElementById('soalNoteStatus');
  if (!input) return;

  input.value = notes[soalId] || '';
  if (status) status.textContent = notes[soalId] ? '✓ Ada catatan tersimpan' : '';
  input.dataset.soalId = soalId;
}

function saveNoteForQuestion() {
  const input = document.getElementById('soalNoteInput');
  const status = document.getElementById('soalNoteStatus');
  if (!input) return;

  const soalId = input.dataset.soalId;
  if (!soalId) return;

  const text = input.value.trim();
  const notes = getNotes();

  if (text) {
    notes[soalId] = text;
    if (status) { status.textContent = '✓ Tersimpan!'; status.className = 'soal-note-status ok'; }
  } else {
    delete notes[soalId];
    if (status) { status.textContent = 'Catatan dihapus'; status.className = 'soal-note-status'; }
  }
  saveNotes(notes);
  setTimeout(() => { if (status) status.textContent = text ? '✓ Ada catatan tersimpan' : ''; }, 1800);
}

function hookNoteToExplain() {
  /* Elemen quiz sudah tersedia di app.html; jangan hentikan hook hanya karena timing DOM */
  const explainDiv = document.getElementById('explain');

  /* Save button */
  const saveBtn = document.getElementById('soalNoteSave');
  if (saveBtn) saveBtn.addEventListener('click', saveNoteForQuestion);

  /* Auto-save on blur textarea */
  const input = document.getElementById('soalNoteInput');
  if (input) {
    input.addEventListener('blur', saveNoteForQuestion);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveNoteForQuestion(); }
    });
  }

  /* Hook applyAnsweredState setelah fungsi utama tersedia */
  if (!window.__noteHooked) {
    const installNoteHook = () => {
      if (window.__noteHooked) return true;

      const origApply = window.applyAnsweredState;
      if (typeof origApply !== 'function') return false;

      window.__noteHooked = true;
      window.applyAnsweredState = function() {
        origApply.apply(this, arguments);
        try {
          const q = quiz && quiz[pos];
          if (q) {
            loadNoteForQuestion(q.id);
            const wrap = document.getElementById('soalNoteWrap');
            if (wrap) wrap.style.display = 'block';
          }
        } catch(e) {}
      };
      return true;
    };

    installNoteHook();

    if (!window.__noteHookTimer) {
      window.__noteHookTimer = setInterval(() => {
        if (installNoteHook()) {
          clearInterval(window.__noteHookTimer);
          window.__noteHookTimer = null;
        }
      }, 100);
    }
  }
}

/* ═══════════════════════════════════════════════════════
   HOOK KE renderAnalytics
   ═══════════════════════════════════════════════════════ */
function hookToAnalytics() {
  const origRender = window.renderAnalytics;
  if (!origRender || window.__analyticsHooked) return;
  window.__analyticsHooked = true;

  window.renderAnalytics = function() {
    origRender.apply(this, arguments);
    /* Tunggu DOM update */
    setTimeout(() => {
      renderWeaknessRadar('weaknessRadar');
      renderSmartReviewByBlock();
    }, 80);
  };

  /* Clinical Dashboard punya bagian Weakness Radar sendiri (blok kedua). */
  const origDashboard = window.renderClinicalDashboard;
  if (origDashboard && !window.__dashboardWeaknessHooked) {
    window.__dashboardWeaknessHooked = true;
    window.renderClinicalDashboard = function() {
      origDashboard.apply(this, arguments);
      renderWeaknessRadar('dashboardWeaknessRadar');
    };
  }
}

/* ═══════════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════════ */
function init() {
  hookToAnalytics();
  hookSM2ToAnswer();
  hookNoteToExplain();

  /* Hide note wrap by default */
  const wrap = document.getElementById('soalNoteWrap');
  if (wrap) wrap.style.display = 'none';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

/* Export untuk debugging */
window.clinedLearning = { renderWeaknessRadar, renderSmartReviewByBlock, sm2Update, getSM2Data, computeBlockScores, blockDisplay, scoreLevel, blockPageId, getSM2DueIds };
})();
