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

function drawRadarChart() {
  const canvas = document.getElementById('weaknessRadar');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const blockScores = computeBlockScores();
  const entries = Object.entries(blockScores);

  if (!entries.length) {
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || '#aaa';
    ctx.font = '14px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Belum ada data. Kerjakan kuis dulu!', canvas.width/2, canvas.height/2);
    return;
  }

  /* Ambil max 8 blok yang paling banyak dikerjakan */
  const sorted = entries
    .sort((a,b) => b[1].n - a[1].n)
    .slice(0, 8);

  const labels = sorted.map(([k]) => BLOCK_LABELS[k] || k);
  const scores = sorted.map(([,v]) => Math.round(v.sum / v.n)); // 0-100

  const N = labels.length;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const R  = Math.min(cx, cy) - 48;
  const isDark = document.documentElement.classList.contains('dark');

  /* Colors */
  const gridColor  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const labelColor = isDark ? 'rgba(255,255,255,0.7)'  : 'rgba(0,0,0,0.65)';
  const fillColor  = 'rgba(88,204,2,0.22)';
  const strokeColor= '#58cc02';
  const dotColor   = '#58cc02';
  const weakColor  = 'rgba(239,68,68,0.18)';
  const weakStroke = '#ef4444';

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  /* Draw grid circles */
  [20,40,60,80,100].forEach(pct => {
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const angle = (Math.PI * 2 * i / N) - Math.PI / 2;
      const r = R * pct / 100;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.stroke();
    /* Label pct di kanan */
    if (pct < 100) {
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
      ctx.font = '9px Nunito, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(pct + '%', cx + R * pct / 100 * Math.cos(-Math.PI/2) + 3, cy + R * pct / 100 * Math.sin(-Math.PI/2));
    }
  });

  /* Draw axes */
  for (let i = 0; i < N; i++) {
    const angle = (Math.PI * 2 * i / N) - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + R * Math.cos(angle), cy + R * Math.sin(angle));
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /* Draw weak zone (< 60%) */
  ctx.beginPath();
  for (let i = 0; i < N; i++) {
    const angle = (Math.PI * 2 * i / N) - Math.PI / 2;
    const r = R * 60 / 100;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = weakColor;
  ctx.fill();
  ctx.strokeStyle = weakStroke;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.stroke();
  ctx.setLineDash([]);

  /* Draw score polygon */
  ctx.beginPath();
  scores.forEach((s, i) => {
    const angle = (Math.PI * 2 * i / N) - Math.PI / 2;
    const r = R * Math.min(s, 100) / 100;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  /* Dots + labels */
  scores.forEach((s, i) => {
    const angle = (Math.PI * 2 * i / N) - Math.PI / 2;
    const r = R * Math.min(s, 100) / 100;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);

    /* Dot */
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = s < 60 ? weakStroke : dotColor;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    /* Label axis */
    const lx = cx + (R + 28) * Math.cos(angle);
    const ly = cy + (R + 28) * Math.sin(angle);
    ctx.fillStyle = s < 60 ? weakStroke : labelColor;
    ctx.font = `bold 11px Nunito, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labels[i], lx, ly);

    /* Score bubble */
    ctx.fillStyle = s < 60 ? 'rgba(239,68,68,0.85)' : 'rgba(88,204,2,0.85)';
    const bx = cx + (r + 14) * Math.cos(angle);
    const by = cy + (r + 14) * Math.sin(angle);
    ctx.beginPath();
    ctx.arc(bx, by, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s + '%', bx, by);
  });

  /* Legend */
  ctx.font = '10px Nunito, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = weakStroke;
  ctx.fillRect(12, canvas.height - 32, 10, 10);
  ctx.fillStyle = labelColor;
  ctx.fillText('Zona lemah (<60%)', 26, canvas.height - 32);
  ctx.fillStyle = strokeColor;
  ctx.fillRect(12, canvas.height - 16, 10, 10);
  ctx.fillStyle = labelColor;
  ctx.fillText('Akurasi kamu', 26, canvas.height - 16);
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
  /* Observe explain div visibility — saat soal dijawab */
  const explainDiv = document.getElementById('explain');
  if (!explainDiv) return;

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

  /* Hook ke applyAnsweredState untuk load note saat soal dijawab */
  const origApply = window.applyAnsweredState;
  if (origApply && !window.__noteHooked) {
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
      drawRadarChart();
      renderSmartReviewByBlock();
    }, 80);
  };
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

  /* Redraw radar on dark mode toggle */
  const observer = new MutationObserver(() => {
    if (document.getElementById('weaknessRadar')) drawRadarChart();
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

/* Export untuk debugging */
window.clinedLearning = { drawRadarChart, renderSmartReviewByBlock, sm2Update, getSM2Data };
})();
