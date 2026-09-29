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
  /* Hitung akurasi per blok dari riwayat kuis */
  try {
    const hist = JSON.parse(localStorage.getItem('gaster_v8_history') || '[]');
    const blocks = {};

    hist.forEach(h => {
      if (!h.bank) return;
      /* Cari block dari BANKS (global) atau STATIC_BANK_META */
      let block = 'OTHER';
      if (typeof BANKS !== 'undefined' && BANKS[h.bank]) {
        block = BANKS[h.bank].block || 'OTHER';
      } else if (typeof STATIC_BANK_META !== 'undefined') {
        const meta = STATIC_BANK_META.find(m => m.id === h.bank);
        if (meta) block = (meta.block || 'OTHER').replace(/^BLOK\s+/i, '');
      }
      if (!blocks[block]) blocks[block] = { sum: 0, n: 0 };
      blocks[block].sum += Number(h.pct || 0);
      blocks[block].n++;
    });

    return blocks;
  } catch { return {}; }
}

/* Tingkat penguasaan per ambang akurasi. Dipakai untuk warna bar + label singkat. */
function scoreLevel(pct) {
  if (pct < 60) return { tier: 'weak', label: 'Perlu diperkuat', color: '#ef4444' };
  if (pct < 80) return { tier: 'mid', label: 'Cukup', color: '#f5a524' };
  return { tier: 'ok', label: 'Kuat', color: '#58cc02' };
}

/* Render Weakness Radar sebagai daftar bar horizontal (HTML/CSS, bukan canvas).
   Dipakai di halaman Analitik Belajar maupun Clinical Dashboard lewat targetId berbeda. */
function renderWeaknessRadar(targetId = 'weaknessRadar') {
  const target = document.getElementById(targetId);
  if (!target) return;

  const blockScores = computeBlockScores();
  const entries = Object.entries(blockScores)
    .sort((a, b) => (a[1].sum / a[1].n) - (b[1].sum / b[1].n)) // paling lemah dulu
    .slice(0, 8);

  if (!entries.length) {
    target.innerHTML = `<div class="weakness-radar-empty">📊 Belum ada data.<br>Kerjakan beberapa kuis dulu untuk melihat peta kelemahanmu di sini.</div>`;
    return;
  }

  const rows = entries.map(([key, v]) => {
    const label = BLOCK_LABELS[key] || key;
    const pct = Math.round(v.sum / v.n);
    const lv = scoreLevel(pct);
    return `<div class="wr-row wr-${lv.tier}">
      <div class="wr-row-top">
        <span class="wr-label">${esc(label)}</span>
        <span class="wr-pct">${pct}%</span>
      </div>
      <div class="wr-track">
        <div class="wr-fill" style="width:${Math.max(4, Math.min(100, pct))}%"></div>
        <div class="wr-target" style="left:60%"></div>
      </div>
      <small class="wr-meta">${v.n} percobaan • ${lv.label}</small>
    </div>`;
  }).join('');

  target.innerHTML = `<div class="weakness-radar-list">${rows}</div>
    <div class="wr-legend">
      <span><i class="wr-dot wr-weak"></i>Di bawah 60% — perlu diperkuat</span>
      <span><i class="wr-dot wr-ok"></i>80% ke atas — sudah kuat</span>
    </div>`;
}

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
            ${due ? 'Review →' : '✓ Lunas'}
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
window.clinedLearning = { renderWeaknessRadar, renderSmartReviewByBlock, sm2Update, getSM2Data };
})();
