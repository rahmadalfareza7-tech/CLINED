/* STUDY PLUS: Latihan Hari Ini, Countdown & Rencana Belajar, Tren/Heatmap, Analisis Waktu, Pengingat, Backup.
   Semua data disimpan di localStorage dengan prefix clined_ sehingga ikut tersinkron ke akun oleh online-sync.js. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const K_PLAN = 'clined_exam_plan_v1', K_REM = 'clined_reminder_v1', K_QTIME = 'clined_qtime_v1', K_HIST = 'gaster_v8_history';
  const rd = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : (JSON.parse(v) ?? d); } catch { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
  const L = () => window.clinedLearning || {};
  const dayKey = d => { const x = d instanceof Date ? d : new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
  const todayCount = () => { try { return Number(streakData().counts[dayKey(new Date())] || 0); } catch { return 0; } };
  const toast = (m, e) => (window.showToast ? window.showToast(m, e) : alert(m));

  /* ───────── Latihan Hari Ini ───────── */
  function blockOfBank(bank) {
    try {
      if (typeof window.blockForBank === 'function') return String(window.blockForBank(bank) || '').replace(/^BLOK\s+/i, '').toUpperCase();
      return String(BANKS[bank]?.block || '').replace(/^BLOK\s+/i, '').toUpperCase();
    } catch { return ''; }
  }
  function buildToday(limit = 15) {
    const out = [], seen = new Set(), src = { due: 0, weak: 0, wrong: 0 };
    const add = (id, tag) => {
      if (!id || seen.has(id) || out.length >= limit) return;
      try {
        const ref = resolveQuestionRef(id); if (!ref) return;
        const q = rawToQuiz(ref.bankId, ref.idx); if (!q || q.jawabanBenar == null) return;
        seen.add(id); out.push(q); src[tag]++;
      } catch {}
    };
    try { (L().getSM2DueIds?.(8) || []).forEach(id => add(id, 'due')); } catch {}
    try {
      const sc = L().computeBlockScores?.() || {};
      const weak = Object.entries(sc).map(([k, v]) => [k, v.correct / v.total]).filter(([, a]) => a < 0.8).sort((a, b) => a[1] - b[1]).slice(0, 2).map(x => x[0]);
      const wrong = rd('gaster_v8_wrong_stats', []).filter(q => q && q.jawabanBenar != null);
      wrong.filter(q => weak.includes(blockOfBank(q.bank))).sort((a, b) => Number(b.wrong || 1) - Number(a.wrong || 1)).forEach(q => add(q.id, 'weak'));
    } catch {}
    try { (typeof getSmartReviewRows === 'function' ? getSmartReviewRows(10) : []).forEach(q => add(q.id, 'wrong')); } catch {}
    return { rows: out, src };
  }
  function startToday() {
    const { rows } = buildToday();
    if (!rows.length) { toast('Belum ada soal untuk hari ini. Kerjakan beberapa kuis dulu ya.', true); return; }
    quiz = rows; selectedBank = rows[0].bank; selectedCount = rows.length;
    pos = 0; score = 0; streak = 0; sessionXP = 0; lastXPGain = 0; playerHP = 100; enemyHP = 100; wrongCombo = 0;
    answered = false; selectedAnswer = null; flagged = new Set(); timerDuration = 0; timerSeconds = 0; timerDeadline = 0;
    try { clearSession(); } catch {}
    show('quiz'); renderQuestion(); startTimer();
  }

  /* ───────── Rencana belajar ───────── */
  const plan = () => { const p = rd(K_PLAN, null); return p && p.date && Number.isFinite(Date.parse(p.date)) ? p : null; };
  const daysLeft = p => Math.ceil((new Date(p.date + 'T23:59:59') - new Date()) / 86400000);
  function computePlan(p) {
    const left = Math.max(1, daysLeft(p));
    const sc = L().computeBlockScores?.() || {};
    const rows = Object.entries(sc).map(([k, v]) => ({ key: k, acc: v.correct / v.total, total: v.total })).sort((a, b) => a.acc - b.acc);
    // kebutuhan: tiap blok di bawah 80% butuh soal tambahan sebanding dengan selisihnya (min 20)
    const need = rows.filter(r => r.acc < 0.8).map(r => ({ ...r, need: Math.max(20, Math.ceil((0.8 - r.acc) * 150)) }));
    const totalNeed = need.reduce((n, r) => n + r.need, 0);
    const perDay = Math.min(80, Math.max(10, Math.ceil((totalNeed || 30) / left)));
    let split = need.slice(0, 3).map(r => ({ ...r, share: Math.round(perDay * r.need / Math.max(1, need.slice(0, 3).reduce((n, x) => n + x.need, 0))) }));
    return { left, perDay, split, totalNeed, hasData: rows.length > 0 };
  }

  /* ───────── Analisis waktu (Latihan Materi) ───────── */
  function timeRows() {
    const t = rd(K_QTIME, {}) || {};
    return Object.entries(t).filter(([, v]) => v && v.n).map(([k, v]) => ({ key: k, n: v.n, avg: Math.round(v.sum / v.n), fastWrong: v.fastWrong || 0, slow: v.slow || 0 })).sort((a, b) => b.avg - a.avg);
  }

  /* ───────── Tren mingguan + heatmap ───────── */
  function weeklyTrend(weeks = 8) {
    const hist = rd(K_HIST, []); const now = new Date(); now.setHours(0, 0, 0, 0);
    const start = new Date(now); start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // Senin minggu ini
    const buckets = Array.from({ length: weeks }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() - (weeks - 1 - i) * 7); return { d, correct: 0, total: 0 }; });
    (Array.isArray(hist) ? hist : []).forEach(h => {
      const t = Date.parse(h.date || h.timestamp || ''); if (!t) return;
      const idx = buckets.findIndex((b, i) => t >= b.d.getTime() && (i === weeks - 1 || t < buckets[i + 1].d.getTime()));
      const tot = Number(h.validTotal ?? h.total) || 0; if (idx < 0 || !tot) return;
      const c = h.correct != null && Number.isFinite(Number(h.correct)) ? Number(h.correct) : Math.round(tot * Number(h.pct || 0) / 100);
      buckets[idx].correct += Math.min(c, tot); buckets[idx].total += tot;
    });
    return buckets.map(b => ({ label: `${b.d.getDate()}/${b.d.getMonth() + 1}`, pct: b.total ? Math.round(b.correct / b.total * 100) : null, total: b.total }));
  }
  /* Kalender bulanan: gabung 3 sumber (log permanen, streak 120 hari, riwayat skor) ambil nilai terbesar per hari */
  const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const SPV = { off: 0, pick: '' };
  function dayCounts() {
    const out = {};
    const add = (k, n) => { n = Number(n) || 0; if (/^\d{4}-\d\d-\d\d$/.test(k) && n > (out[k] || 0)) out[k] = n; };
    try { const lg = rd('clined_study_log_v1', {}); Object.entries(lg || {}).forEach(([k, v]) => add(k, v)); } catch {}
    try { Object.entries(streakData().counts || {}).forEach(([k, v]) => add(k, v)); } catch {}
    try {
      const sum = {};
      (rd(K_HIST, []) || []).forEach(h => { const t = Date.parse(h.date || h.timestamp || ''); if (!t) return; const k = dayKey(new Date(t)); sum[k] = (sum[k] || 0) + (Number(h.validTotal ?? h.total) || 0); });
      Object.entries(sum).forEach(([k, v]) => add(k, v));
    } catch {}
    return out;
  }
  function heatmapHTML() {
    const counts = dayCounts(), today = new Date(); today.setHours(0, 0, 0, 0);
    const base = new Date(today.getFullYear(), today.getMonth() + SPV.off, 1);
    const y = base.getFullYear(), m = base.getMonth(), nDays = new Date(y, m + 1, 0).getDate();
    const lead = (base.getDay() + 6) % 7, tk = dayKey(today), pl = plan(), ek = pl?.date || '';
    let cells = '<i class="sp-cell sp-blank"></i>'.repeat(lead), total = 0, active = 0;
    for (let d = 1; d <= nDays; d++) {
      const dt = new Date(y, m, d), k = dayKey(dt), n = Number(counts[k] || 0), fut = dt > today;
      if (n) { total += n; active++; }
      const lv = n === 0 ? 0 : n < 5 ? 1 : n < 15 ? 2 : n < 30 ? 3 : 4;
      cells += `<button type="button" class="sp-day sp-l${lv}${k === tk ? ' today' : ''}${k === ek ? ' exam' : ''}${fut ? ' fut' : ''}${SPV.pick === k ? ' pick' : ''}" data-sp-day="${k}" aria-label="${d} ${MONTHS[m]} ${y}: ${n} soal"><span>${d}</span>${n ? `<small>${n}</small>` : ''}</button>`;
    }
    const pk = SPV.pick, pn = pk ? Number(counts[pk] || 0) : null;
    const pickTxt = pk ? `<p class="sp-cal-pick"><b>${new Date(pk + 'T00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</b>: ${pn ? pn + ' soal dikerjakan' : 'belum ada soal'}${pk === ek ? ' · 🎯 hari ujian' : ''}</p>` : '';
    return `<div class="sp-cal"><div class="sp-cal-head"><button type="button" class="sp-cal-nav" data-sp-mo="-1" aria-label="Bulan sebelumnya">‹</button><b>${MONTHS[m]} ${y}</b><button type="button" class="sp-cal-nav" data-sp-mo="1" aria-label="Bulan berikutnya" ${SPV.off >= 0 ? 'disabled' : ''}>›</button></div>
      <div class="sp-cal-dow">${['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(x => `<span>${x}</span>`).join('')}</div>
      <div class="sp-cal-grid">${cells}</div>
      <p class="sp-cal-sum">${active ? `${active} hari belajar · ${total} soal bulan ini` : 'Belum ada soal bulan ini'}</p>${pickTxt}
      <div class="sp-heat-legend"><span>Sedikit</span><i class="sp-cell sp-l0"></i><i class="sp-cell sp-l1"></i><i class="sp-cell sp-l2"></i><i class="sp-cell sp-l3"></i><i class="sp-cell sp-l4"></i><span>Banyak</span></div></div>`;
  }
  function trendHTML() {
    const t = weeklyTrend(8);
    if (!t.some(x => x.pct != null)) return '<div class="sp-empty">Belum cukup data.</div>';
    const known = t.filter(x => x.pct != null), last = known[known.length - 1], prev = known[known.length - 2];
    const diff = prev ? last.pct - prev.pct : null;
    const bars = t.map(x => `<div class="sp-bar"><b>${x.pct == null ? '' : x.pct + '%'}</b><div class="sp-bar-track"><i style="height:${x.pct == null ? 0 : Math.max(4, x.pct)}%" class="${x.pct == null ? '' : x.pct < 60 ? 'weak' : x.pct < 80 ? 'mid' : 'ok'}"></i></div><small>${x.label}</small></div>`).join('');
    return `<div class="sp-bars">${bars}</div>${diff == null ? '' : `<p class="sp-trend-note ${diff >= 0 ? 'up' : 'down'}">${diff >= 0 ? '📈 Naik' : '📉 Turun'} ${Math.abs(diff)} poin dibanding minggu sebelumnya</p>`}`;
  }

  /* ───────── Backup ───────── */
  const backupKey = k => /^(gaster_|clined_(?!account_profile|google_form_url|schema_version|migrated_at|menu|active_user_id|sync_cursor)|medicalRpg|medical_rpg|current_block|last_worked|dashboard_block|alpha5_)/.test(k) && !/auth|password|session|token|sync_queue|last_activity/i.test(k);
  function exportBackup() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && backupKey(k)) data[k] = localStorage.getItem(k); }
    const blob = new Blob([JSON.stringify({ app: 'CLINED', version: 1, exportedAt: new Date().toISOString(), data })], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `clined-backup-${dayKey(new Date())}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('Backup diunduh ✅');
  }
  async function importBackup(file) {
    try {
      if (!file || file.size > 8 * 1024 * 1024) throw Error('File terlalu besar atau tidak ada.');
      const j = JSON.parse(await file.text());
      if (!j || j.app !== 'CLINED' || !j.data || typeof j.data !== 'object') throw Error('Bukan file backup CLINED.');
      const keys = Object.keys(j.data).filter(k => backupKey(k) && typeof j.data[k] === 'string' && j.data[k].length < 2e6);
      if (!keys.length) throw Error('Backup kosong.');
      if (!(await clinedConfirm({ title: 'Pulihkan data dari backup?', icon: '♻️', tone: 'info', lines: [`**${keys.length} data** dari backup tanggal ${String(j.exportedAt || '').slice(0, 10)} akan dipulihkan.`, 'Data yang sama di perangkat ini akan ditimpa.'], ok: 'Pulihkan' }))) return;
      keys.forEach(k => localStorage.setItem(k, j.data[k]));
      toast('Backup dipulihkan. Memuat ulang…'); setTimeout(() => location.reload(), 900);
    } catch (e) { toast(e.message || 'Gagal memulihkan backup.', true); }
  }

  /* ───────── Pengingat (lokal, saat app terbuka) ───────── */
  const rem = () => Object.assign({ on: false, time: '19:00', last: '' }, rd(K_REM, {}));
  function checkReminder() {
    const r = rem(); if (!r.on || !('Notification' in window) || Notification.permission !== 'granted') return;
    const now = new Date(), [h, m] = r.time.split(':').map(Number), today = dayKey(now);
    if (r.last === today || todayCount() >= 5) return;
    if (now.getHours() * 60 + now.getMinutes() < h * 60 + m) return;
    r.last = today; wr(K_REM, r);
    const title = 'Waktunya belajar 📚', opts = { body: 'Selesaikan target 5 soal hari ini untuk menjaga streak 🔥', icon: 'icon-192.png', tag: 'clined-daily' };
    navigator.serviceWorker?.getRegistration?.().then(reg => reg ? reg.showNotification(title, opts) : new Notification(title, opts)).catch(() => { try { new Notification(title, opts); } catch {} });
  }
  async function toggleReminder(on) {
    const r = rem();
    if (on) {
      if (!('Notification' in window)) { toast('Browser ini tidak mendukung notifikasi.', true); return false; }
      const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      if (perm !== 'granted') { toast('Izin notifikasi ditolak.', true); return false; }
    }
    r.on = on; wr(K_REM, r); return on;
  }

  /* ───────── UI ───────── */
  function ensureShell() {
    if (!$('studyPlusPage')) {
      const sec = document.createElement('section');
      sec.id = 'studyPlusPage'; sec.className = 'view';
      sec.innerHTML = '<div class="card sp-card"><div class="topline"><button class="back" data-home type="button">‹ Beranda</button><b>🗓️ Rencana Belajar</b></div><div id="studyPlusBody"></div></div>';
      const anchor = $('analytics') || document.querySelector('main .view:last-of-type');
      anchor?.parentNode ? anchor.parentNode.insertBefore(sec, anchor) : document.body.appendChild(sec);
      sec.querySelector('[data-home]').addEventListener('click', () => { show('home'); try { renderCounts(); } catch {} });
    }
    const grid = $('menuSectionContent');
    if (grid && !$('studyPlusBtn')) {
      const b = document.createElement('button');
      b.className = 'secondary menu-item'; b.id = 'studyPlusBtn'; b.type = 'button';
      b.innerHTML = '<span class="menu-icon">🗓️</span><span>Rencana Belajar</span>';
      grid.appendChild(b);
    }
  }

  function renderTodayCard() {
    /* v74: kartu Latihan Hari Ini dihilangkan; kalender/countdown ujian tampil di strip atas (gantikan Target) */
    const old = $('todayPracticeCard'); if (old) old.remove();
    const d = $('duoCalDays'), l = $('duoCalLbl'), btn = $('duoCalBtn'), ico = $('duoCalIco');
    if (d && l) {
      const p = plan();
      const MO = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
      if (ico) { if (p) { const dt = new Date(p.date + 'T00:00'); ico.innerHTML = `<i class="cal-mo">${MO[dt.getMonth()]}</i><i class="cal-dy">${dt.getDate()}</i>`; } else ico.textContent = '📅'; }
      if (btn) { const n0 = p ? daysLeft(p) : null; btn.dataset.urg = n0 == null ? 'none' : n0 < 0 ? 'past' : n0 <= 7 ? 'soon' : n0 <= 30 ? 'near' : 'far'; }
      if (!p) { d.textContent = '＋'; l.textContent = 'Atur ujian'; if (btn) btn.title = 'Atur tanggal ujian'; }
      else {
        const n = daysLeft(p);
        d.textContent = n > 0 ? String(n) : (n === 0 ? '0' : '—');
        l.textContent = n > 0 ? 'Hari lagi' : (n === 0 ? 'Hari ini!' : 'Atur ulang');
        if (btn) btn.title = (p.name || 'Ujian') + ' • ' + new Date(p.date + 'T00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      }
    }
    return;
    const home = $('home'), ref = $('dailyHomeCard'); if (!home || !ref) return;
    let card = $('todayPracticeCard');
    if (!card) { card = document.createElement('section'); card.id = 'todayPracticeCard'; card.className = 'card sp-today'; ref.parentNode.insertBefore(card, ref); }
    const { rows, src } = buildToday(), p = plan();
    const chips = [src.due && `🔁 ${src.due} jatuh tempo`, src.weak && `🎯 ${src.weak} blok lemah`, src.wrong && `❌ ${src.wrong} sering salah`].filter(Boolean).join(' • ');
    const cd = p ? `<button type="button" class="sp-cd" data-sp-open><b>${Math.max(0, daysLeft(p))}</b><span>hari lagi<br><small>${esc(p.name || 'Ujian')}</small></span></button>` : `<button type="button" class="sp-cd sp-cd-empty" data-sp-open><b>＋</b><span>Atur tanggal<br><small>ujian</small></span></button>`;
    card.innerHTML = `<div class="sp-today-main"><div class="section-title">⚡ Latihan Hari Ini</div>
      <p class="sp-today-sub">${rows.length ? `${rows.length} soal dipilihkan otomatis` : 'Belum ada soal. Kerjakan kuis dulu agar app bisa memilihkan.'}</p>
      <button type="button" class="primary sp-start" data-sp-today ${rows.length ? '' : 'disabled'}>Mulai</button></div>${cd}`;
  }

  function renderPage() {
    const body = $('studyPlusBody'); if (!body) return;
    const p = plan(), pl = p ? computePlan(p) : null, tc = todayCount();
    const planHTML = p ? `
      <div class="sp-cd-big"><b>${Math.max(0, pl.left)}</b><span>hari menuju <b>${esc(p.name || 'ujian')}</b><small>${new Date(p.date + 'T00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</small></span></div>
      ${pl.left <= 0 ? '<p class="sp-note">Tanggal ujian sudah lewat. Atur tanggal baru di bawah.</p>' : pl.hasData ? `
        <div class="sp-goal"><div class="sp-goal-top"><span>Target hari ini</span><b>${Math.min(tc, pl.perDay)} / ${pl.perDay} soal</b></div><div class="sp-track"><i style="width:${Math.min(100, Math.round(tc / pl.perDay * 100))}%"></i></div></div>
        ${pl.split.length ? `<div class="sp-split"><div class="sp-sub">Fokus per blok (dari blok terlemah)</div>${pl.split.map(r => `<div class="sp-split-row"><span>${esc(L().blockDisplay?.(r.key) || r.key)}<small>akurasi ${Math.round(r.acc * 100)}%</small></span><b>${r.share} soal/hari</b></div>`).join('')}</div>` : '<p class="sp-note">Semua blok sudah ≥ 80% ✨</p>'}` : ''}` : '';
    const tr = timeRows();
    const timeHTML = tr.length ? `<div class="sp-time">${tr.map(r => `<div class="sp-time-row"><span>${esc(L().blockDisplay?.(r.key) || r.key)}<small>${r.n} soal</small></span><span class="sp-time-avg">${r.avg} dtk<small>rata-rata</small></span><span class="sp-time-flags">${r.fastWrong ? `<em class="warn" title="Salah dan dijawab &lt; 6 detik">⚡ ${r.fastWrong} asal tebak?</em>` : ''}${r.slow ? `<em title="Butuh &gt; 90 detik">🐢 ${r.slow} lambat</em>` : ''}${!r.fastWrong && !r.slow ? '<em class="ok">✓ wajar</em>' : ''}</span></div>`).join('')}</div>
      <p class="sp-note">⚡ salah &amp; &lt; 6 dtk • 🐢 &gt; 90 dtk</p>` : '<div class="sp-empty">Belum ada data waktu.</div>';
    const r = rem();
    const formHTML = `<div class="sp-form"><input type="text" id="spExamName" maxlength="40" placeholder="Nama ujian (mis. UAB Blok GIT)" value="${esc(p?.name || '')}"><input type="date" id="spExamDate" min="${dayKey(new Date())}" value="${esc(p?.date || '')}"><div class="sp-form-btns"><button type="button" class="primary small-btn" data-sp-save>Simpan</button>${p ? '<button type="button" class="secondary small-btn sp-del" data-sp-clear>Hapus</button>' : ''}</div></div>`;
    body.innerHTML = `
      <div class="sp-block sp-hero">${planHTML}
        ${p ? `<details class="sp-edit"><summary>✏️ Ubah ujian</summary>${formHTML}</details>` : formHTML}</div>
      <div class="sp-block"><div class="sp-h">📈 Tren Akurasi</div>${trendHTML()}</div>
      <div class="sp-block"><div class="sp-h">🗓️ Kalender Belajar</div>${heatmapHTML()}</div>
      <div class="sp-block"><div class="sp-h">⏱️ Waktu per Soal</div>${timeHTML}</div>
      <div class="sp-block sp-settings"><div class="sp-h">⚙️ Pengaturan</div>
        <div class="sp-remrow"><label class="sp-switch"><input type="checkbox" id="spRemOn" ${r.on ? 'checked' : ''}><span>Pengingat harian</span></label><input type="time" id="spRemTime" value="${esc(r.time)}" aria-label="Jam pengingat"></div>
        <div class="sp-actions"><button type="button" class="secondary small-btn" data-sp-tour>🧭 Tutorial</button><button type="button" class="secondary small-btn" data-sp-export>⬇️ Backup</button><button type="button" class="secondary small-btn" data-sp-import>⬆️ Pulihkan</button></div>
        <input type="file" id="spImportFile" accept="application/json,.json" hidden></div>`;
  }

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-sp-day],[data-sp-mo],[data-sp-today],[data-sp-tour],[data-sp-open],[data-sp-save],[data-sp-clear],[data-sp-export],[data-sp-import],#studyPlusBtn');
    if (!t) return;
    if (t.matches('[data-sp-mo]')) { SPV.off = Math.min(0, SPV.off + Number(t.dataset.spMo)); SPV.pick = ''; return renderPage(); }
    if (t.matches('[data-sp-day]')) { SPV.pick = SPV.pick === t.dataset.spDay ? '' : t.dataset.spDay; return renderPage(); }
    if (t.matches('[data-sp-today]')) return startToday();
    if (t.matches('[data-sp-tour]')) { show('home'); return setTimeout(() => window.CLINED_ONBOARDING?.start(), 400); }
    if (t.matches('[data-sp-open],#studyPlusBtn')) { renderPage(); return show('studyPlusPage'); }
    if (t.matches('[data-sp-save]')) {
      const date = $('spExamDate').value, name = $('spExamName').value.trim();
      if (!date) return toast('Pilih tanggal ujian dulu.', true);
      wr(K_PLAN, { date, name }); toast('Rencana disimpan ✅'); renderPage(); renderTodayCard(); return;
    }
    if (t.matches('[data-sp-clear]')) { localStorage.removeItem(K_PLAN); renderPage(); renderTodayCard(); return; }
    if (t.matches('[data-sp-export]')) return exportBackup();
    if (t.matches('[data-sp-import]')) return $('spImportFile').click();
  });
  document.addEventListener('change', async e => {
    if (e.target.id === 'spImportFile') { await importBackup(e.target.files[0]); e.target.value = ''; }
    if (e.target.id === 'spRemOn') { const ok = await toggleReminder(e.target.checked); if (!ok) e.target.checked = false; }
    if (e.target.id === 'spRemTime' && /^\d\d:\d\d$/.test(e.target.value)) { const r = rem(); r.time = e.target.value; r.last = ''; wr(K_REM, r); }
  });

  function init() { ensureShell(); renderTodayCard(); checkReminder(); }
  window.addEventListener('clined:view-change', e => {
    ensureShell();
    if (e.detail === 'home') renderTodayCard();
    if (e.detail === 'studyPlusPage') renderPage();
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { renderTodayCard(); checkReminder(); } });
  setInterval(checkReminder, 60000);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.CLINED_STUDY_PLUS = { startToday, buildToday, computePlan, exportBackup, renderTodayCard };
})();
