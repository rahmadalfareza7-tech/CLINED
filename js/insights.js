/* CLINED — Clinical Dashboard, Soal Sering Salah, Smart Review (v2).
   Memakai data yang sama dengan app.js (riwayat, performa per soal, daftar salah, SM-2) tetapi dihitung ulang dengan benar. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const L5 = 'ABCDEF';
  const blockOf = bank => { try { return blockForBank(bank) || 'OTHER'; } catch { return 'OTHER'; } };
  const blockName = b => (window.clinedLearning?.blockDisplay?.(b)) || (typeof blockLabel === 'function' ? blockLabel(b) : b);
  const bankName = id => { try { return BANKS[id]?.name || id || 'Soal'; } catch { return id || 'Soal'; } };
  const rd = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
  const DAY = 86400000;
  const agoText = iso => {
    const t = Date.parse(iso || ''); if (!t) return '';
    const d = Math.floor((Date.now() - t) / DAY);
    return d <= 0 ? 'hari ini' : d === 1 ? 'kemarin' : d < 30 ? `${d} hari lalu` : `${Math.floor(d / 30)} bln lalu`;
  };
  const pctOf = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const lvl = p => (p < 60 ? 'weak' : p < 80 ? 'mid' : 'ok');
  const reliability = n => (n < 20 ? ['sedikit', 'Data masih sedikit'] : n < 60 ? ['cukup', 'Data cukup'] : ['andal', 'Data andal']);

  /* ───────── analitik inti ───────── */
  function histEntries() { return (rd(KEY.hist, []) || []).filter(h => h && Number(h.validTotal ?? h.total) > 0); }
  const hScore = h => Math.min(Number(h.validTotal ?? h.total) || 0, Number(h.score ?? h.correct ?? Math.round((Number(h.validTotal ?? h.total) || 0) * (Number(h.pct) || 0) / 100)) || 0);
  const hTotal = h => Number(h.validTotal ?? h.total) || 0;

  function overall() {
    const h = histEntries(), tot = h.reduce((a, x) => a + hTotal(x), 0), cor = h.reduce((a, x) => a + hScore(x), 0);
    const now = Date.now(), win = (from, to) => h.filter(x => { const t = Date.parse(x.date || x.timestamp || ''); return t >= now - to * DAY && t < now - from * DAY; });
    const sum = list => ({ t: list.reduce((a, x) => a + hTotal(x), 0), c: list.reduce((a, x) => a + hScore(x), 0) });
    const w1 = sum(win(0, 7)), w0 = sum(win(7, 14));
    const delta = w1.t >= 5 && w0.t >= 5 ? pctOf(w1.c, w1.t) - pctOf(w0.c, w0.t) : null;
    return { sessions: h.length, total: tot, correct: cor, acc: pctOf(cor, tot), delta, last7: w1 };
  }
  function dailyTrend(days = 14) {
    const h = histEntries(), out = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('sv-SE');           // YYYY-MM-DD lokal
      const rows = h.filter(x => { const t = new Date(x.date || x.timestamp || 0); return !isNaN(t) && t.toLocaleDateString('sv-SE') === key; });
      const t = rows.reduce((a, x) => a + hTotal(x), 0), c = rows.reduce((a, x) => a + hScore(x), 0);
      out.push({ d, n: t, acc: t ? pctOf(c, t) : null });
    }
    return out;
  }
  function blockStats() {
    const cb = window.clinedLearning?.computeBlockScores?.() || {};
    return Object.entries(cb).map(([key, v]) => ({ key, name: blockName(key), total: v.total, correct: v.correct, acc: pctOf(v.correct, v.total), n: v.n, last: v.last }))
      .sort((a, b) => a.acc - b.acc);
  }
  function questionStats() {
    const qs = rd(KEY.qstats, {}) || {}, out = [];
    for (const [id, v] of Object.entries(qs)) {
      const att = Number(v?.attempts || 0), cor = Number(v?.correct || 0);
      if (att) out.push({ id, att, cor, acc: cor / att, bank: v.bank, last: v.lastAnswered });
    }
    return out;
  }

  /* ───────── daftar soal: salah / review ───────── */
  const wrongAll = () => (rd(KEY.wrong, []) || []).filter(q => q && q.id != null);
  const activeWrong = () => wrongAll().filter(q => !q.mastered);
  function saveWrong(list) { localStorage.setItem(KEY.wrong, JSON.stringify(list)); try { window.CLINED_SYNC?.markSet?.(KEY.wrong); } catch {} }
  function patchWrong(id, fn) { const w = wrongAll(), i = w.findIndex(x => x.id === id); if (i < 0) return; fn(w[i]); saveWrong(w); }

  function smartRows() {
    const now = Date.now(), sm2 = rd('clined_sm2_v1', {}) || {}, qstat = new Map(questionStats().map(x => [x.id, x]));
    const rows = new Map();
    const add = (id, q, extra) => {
      if (!q || q.jawabanBenar == null || !Array.isArray(q.opsi)) return;
      const r = rows.get(id) || { id, q, wrong: 0, last: '', reasons: [], due: false, pr: 0 };
      Object.assign(r, extra(r)); rows.set(id, r);
    };
    for (const w of activeWrong()) {
      add(w.id, w, r => {
        const age = w.lastWrong ? Math.max(0, (now - Date.parse(w.lastWrong)) / DAY) : 14;
        return { wrong: Number(w.wrong) || 1, last: w.lastWrong || '', pr: r.pr + (Number(w.wrong) || 1) * 4 + Math.min(age, 14) * 0.55, reasons: [...r.reasons, `Salah ${Number(w.wrong) || 1}×`, ...(age >= 3 ? [`${Math.floor(age)} hari tak diulang`] : [])] };
      });
    }
    for (const [id, c] of Object.entries(sm2)) {
      if (!c || Number(c.nextDue) > now) continue;
      let q = rows.get(id)?.q, bank;
      if (!q) { try { const ref = resolveQuestionRef(id); if (ref) { q = rawToQuiz(ref.bankId, ref.idx); bank = ref.bankId; } } catch {} }
      if (!q) continue;
      const late = Math.max(0, (now - Number(c.nextDue)) / DAY);
      add(id, q, r => ({ due: true, pr: r.pr + 6 + Math.min(late, 7) * 0.5, reasons: [...r.reasons, 'Jatuh tempo ulang'] }));
    }
    for (const s of qstat.values()) {
      if (rows.has(s.id) || s.att < 3 || s.acc >= 0.5) continue;      // soal “bandel” yang belum tercatat di daftar salah
      let q; try { const ref = resolveQuestionRef(s.id); if (ref) q = rawToQuiz(ref.bankId, ref.idx); } catch {}
      if (q) add(s.id, q, r => ({ pr: (1 - s.acc) * 8 + s.att * 0.3, reasons: [`Akurasi ${Math.round(s.acc * 100)}% (${s.cor}/${s.att})`] }));
    }
    return [...rows.values()].sort((a, b) => b.pr - a.pr);
  }

  /* ───────── SOAL SERING SALAH ───────── */
  const W = { block: 'all', sort: 'freq', mastered: false, open: new Set(), limit: 30 };
  const blockOfRec = q => { const b = blockOf(q.bank); return b && b !== 'OTHER' ? b : 'OTHER'; };

  function renderWrongNew() {
    const all = wrongAll(), act = all.filter(q => !q.mastered), mast = all.length - act.length;
    const kp = $('wrongSummary'), fl = $('wrongFilters'), box = $('wrongList'), dock = $('wrongDock');
    if (!kp || !box) return;
    if (!all.length) {
      kp.innerHTML = ''; fl.innerHTML = ''; dock.hidden = true;
      box.innerHTML = emptyHTML('🎉', 'Belum ada soal yang salah', 'Soal yang kamu jawab salah otomatis tersimpan di sini, dikelompokkan per blok.', 'Mulai kuis', 'uabPage');
      return;
    }
    const base = W.mastered ? all.filter(q => q.mastered) : act;
    const counts = {}; base.forEach(q => { const b = blockOfRec(q); counts[b] = (counts[b] || 0) + 1; });
    if (W.block !== 'all' && !counts[W.block]) W.block = 'all';
    const list = base.filter(q => W.block === 'all' || blockOfRec(q) === W.block);
    const maxW = act.reduce((m, q) => Math.max(m, Number(q.wrong) || 0), 0);
    kp.innerHTML = kpi('Aktif', act.length, 'weak') + kpi('Terbanyak', maxW + '×', 'mid') + kpi('Dikuasai', mast, 'ok');

    const chips = [`<button type="button" class="ins-chip${W.block === 'all' ? ' on' : ''}" data-ins-block="all">Semua <i>${base.length}</i></button>`]
      .concat(Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([b, n]) => `<button type="button" class="ins-chip${W.block === b ? ' on' : ''}" data-ins-block="${E(b)}">${E(b === 'OTHER' ? 'Lainnya' : blockName(b))} <i>${n}</i></button>`));
    fl.innerHTML = `<div class="ins-chiprow" role="tablist" aria-label="Filter blok">${chips.join('')}</div>
      <div class="ins-tools"><div class="ins-seg" role="radiogroup" aria-label="Urutkan"><button type="button" role="radio" aria-checked="${W.sort === 'freq'}" class="${W.sort === 'freq' ? 'on' : ''}" data-ins-sort="freq">Terbanyak</button><button type="button" role="radio" aria-checked="${W.sort === 'recent'}" class="${W.sort === 'recent' ? 'on' : ''}" data-ins-sort="recent">Terbaru</button></div>
      ${mast || W.mastered ? `<button type="button" class="ins-chip${W.mastered ? ' on' : ''}" data-ins-mastered>✓ Dikuasai <i>${mast}</i></button>` : ''}</div>`;

    list.sort((a, b) => W.sort === 'recent' ? Date.parse(b.lastWrong || 0) - Date.parse(a.lastWrong || 0) : (Number(b.wrong) || 0) - (Number(a.wrong) || 0) || Date.parse(b.lastWrong || 0) - Date.parse(a.lastWrong || 0));
    const shown = list.slice(0, W.limit);
    const groups = new Map(); shown.forEach(q => { const b = W.block === 'all' ? blockOfRec(q) : '_'; (groups.get(b) || groups.set(b, []).get(b)).push(q); });
    const orderedGroups = [...groups.entries()].sort((a, b) => Math.max(...b[1].map(x => +x.wrong || 0)) - Math.max(...a[1].map(x => +x.wrong || 0)));
    box.innerHTML = orderedGroups.map(([b, items]) => `${b !== '_' ? `<div class="ins-group"><b>${E(b === 'OTHER' ? 'Lainnya' : blockName(b))}</b><span>${counts[b] || items.length} soal</span></div>` : ''}${items.map(wrongItem).join('')}`).join('')
      + (list.length > shown.length ? `<button type="button" class="secondary ins-more" data-ins-more>Tampilkan ${Math.min(30, list.length - shown.length)} lagi (${list.length - shown.length} tersisa)</button>` : '')
      || emptyHTML('🔎', 'Tidak ada soal di filter ini', '', '', '');
    dock.hidden = !list.length || W.mastered;
    dock.innerHTML = `<button type="button" class="primary" data-ins-practice>🎯 Latih ${Math.min(list.length, 20)} soal${W.block !== 'all' ? ' ' + E(blockName(W.block)) : ''}</button>`;
    dock._ids = list.map(q => q.id);
  }
  function wrongItem(q) {
    const open = W.open.has(q.id), n = Number(q.wrong) || 1, hot = n >= 4 ? 'hot' : n >= 2 ? 'warm' : '';
    return `<article class="ins-item${open ? ' open' : ''}${q.mastered ? ' done' : ''}" data-id="${E(q.id)}">
      <button type="button" class="ins-item-head" data-ins-toggle aria-expanded="${open}">
        <span class="ins-badge ${hot}">${q.mastered ? '✓' : n + '×'}</span>
        <span class="ins-item-main"><span class="ins-meta">${E(bankName(q.bank))} • ${agoText(q.lastWrong) || '—'}</span><span class="ins-q">${E(q.soal)}</span></span>
        <span class="ins-chev" aria-hidden="true">›</span></button>
      ${open ? `<div class="ins-detail"><ul class="ins-opts">${(q.opsi || []).map((o, i) => `<li class="${i === q.jawabanBenar ? 'ok' : ''}"><b>${L5[i]}</b><span>${E(o)}</span>${i === q.jawabanBenar ? '<em>Kunci</em>' : ''}</li>`).join('')}</ul>
        ${q.pembahasan ? `<p class="ins-pemb">${E(q.pembahasan)}</p>` : ''}
        <div class="ins-actions"><button type="button" class="secondary" data-ins-one>🎯 Latih soal ini</button>${q.mastered ? '<button type="button" class="secondary" data-ins-unmaster>↩︎ Kembalikan</button>' : '<button type="button" class="secondary" data-ins-master>✓ Sudah paham</button>'}</div></div>` : ''}
    </article>`;
  }

  /* ───────── SMART REVIEW ───────── */
  function renderSmartReviewNew() {
    const kp = $('smartReviewSummary'), box = $('smartReviewList'), dock = $('smartReviewDock'); if (!kp || !box) return;
    const rows = smartRows(), due = rows.filter(r => r.due).length, hot = rows.filter(r => r.wrong >= 3).length, mast = wrongAll().filter(q => q.mastered).length;
    if (!rows.length) {
      kp.innerHTML = ''; dock.hidden = true;
      box.innerHTML = emptyHTML('🧠', 'Belum ada yang perlu direview', 'Soal yang salah masuk ke sini otomatis, lalu muncul lagi sesuai jadwal ulang sampai kamu menguasainya.', 'Kerjakan kuis', 'uabPage');
      return;
    }
    kp.innerHTML = kpi('Perlu direview', rows.length, 'weak') + kpi('Jatuh tempo', due, 'mid') + kpi('Dikuasai', mast, 'ok');
    const top = rows.slice(0, 15), maxPr = Math.max(...top.map(r => r.pr), 1);
    box.innerHTML = `<p class="ins-note">Diurutkan dari yang paling rawan terlupa. Dua kali benar berturut-turut = dikuasai.</p>` + top.map((r, i) => `<article class="ins-item sr"><div class="ins-sr-rank">${i + 1}</div><div class="ins-item-main"><span class="ins-meta">${E(bankName(r.q.bank))}</span><span class="ins-q">${E(r.q.soal)}</span>
      <span class="ins-tags">${[...new Set(r.reasons)].slice(0, 3).map(t => `<em>${E(t)}</em>`).join('')}</span><i class="ins-pr" style="--w:${Math.round(r.pr / maxPr * 100)}%"></i></div></article>`).join('');
    dock.hidden = false;
    $('smartReviewStartBtn').textContent = `Mulai review (${Math.min(top.length, 15)} soal)`;
    dock._rows = top;
  }
  function startSmartReviewNew() {
    const rows = smartRows().slice(0, 15);
    if (!rows.length) return window.showToast?.('Belum ada soal yang perlu direview.');
    window.CLINED_startCustomQuiz(rows.map(r => r.q), { shuffleList: false, limit: 15 });
  }

  /* ───────── CLINICAL DASHBOARD ───────── */
  function pickScope() {
    // Jika blok terpilih belum punya data tapi blok lain punya, pindah otomatis ke blok yang paling banyak dikerjakan.
    try {
      const sel = dashboardBlock(), st = clinicalAbilityStats(sel);
      if (st.some(x => x[2] > 0)) return sel;
      const bs = blockStats().sort((a, b) => b.total - a.total)[0];
      if (bs && bs.key !== sel) { const ids = dashboardBlockIds(); if (ids.includes(bs.key)) { setDashboardBlock(bs.key); renderDashboardBlockOptions(); return bs.key; } }
      return sel;
    } catch { return undefined; }
  }
  function renderDashboardNew() {
    try { renderDashboardBlockOptions(); } catch {}
    const scope = pickScope(), o = overall(), bs = blockStats(), qs = questionStats();
    const [relKey, relText] = reliability(o.total);
    const xp = Number(rd(KEY.xp, 0)) || 0;

    // KPI
    const delta = o.delta == null ? '' : `<small class="cd-delta ${o.delta >= 0 ? 'up' : 'down'}">${o.delta >= 0 ? '▲' : '▼'} ${Math.abs(o.delta)} poin</small>`;
    const kEl = $('dashboardStats');
    if (kEl) kEl.innerHTML = `
      <div class="cd-kpi big ${o.total ? lvl(o.acc) : ''}"><span>Akurasi</span><b>${o.total ? o.acc + '%' : '—'}</b>${delta || `<small>${o.total ? `${o.correct}/${o.total} benar` : 'belum ada data'}</small>`}</div>
      <div class="cd-kpi"><span>Soal dijawab</span><b>${o.total}</b><small>${o.sessions} sesi</small></div>
      <div class="cd-kpi"><span>7 hari</span><b>${o.last7.t}</b><small>${o.last7.t ? pctOf(o.last7.c, o.last7.t) + '% benar' : 'soal'}</small></div>
      <div class="cd-kpi"><span>Clinical XP</span><b>${xp}</b><small>total</small></div>`;

    // Headline otomatis
    const weak = bs.filter(b => b.total >= 10 && b.acc < 80)[0], hl = $('cdHeadline');
    if (hl) {
      let msg, tone = 'info';
      if (!o.total) msg = 'Belum ada data. Kerjakan satu kuis dan analisismu langsung muncul di sini.';
      else if (weak) { tone = lvl(weak.acc); msg = `Fokus berikutnya: <b>${E(weak.name)}</b> — akurasi ${weak.acc}% dari ${weak.total} soal.`; }
      else if (bs.length) { tone = 'ok'; msg = 'Semua blok yang cukup datanya sudah kuat (≥ 80%). Pertahankan dengan review berkala.'; }
      else msg = 'Data per blok belum cukup (butuh minimal 10 soal per blok).';
      hl.className = 'cd-headline ' + tone;
      hl.innerHTML = `<div>${msg}</div><span class="cd-rel ${relKey}" title="Makin banyak soal, makin akurat analisis">${relText} • ${o.total} soal</span>`;
    }

    // Radar kemampuan + peta blok
    try { renderRadarChart('dashboardRadarChart', 'dashboardRadarLegend', scope || dashboardBlock()); } catch {}
    try { window.clinedLearning?.renderWeaknessRadar?.('dashboardWeaknessRadar'); } catch {}

    // Tren 14 hari
    const tr = dailyTrend(14), tEl = $('cdTrend');
    if (tEl) {
      const any = tr.some(x => x.n);
      tEl.innerHTML = any ? `<div class="cd-bars" role="img" aria-label="Akurasi harian 14 hari terakhir">${tr.map(x => `<div class="cd-bar" title="${x.d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}: ${x.n ? x.acc + '% (' + x.n + ' soal)' : 'tidak belajar'}"><i class="${x.n ? lvl(x.acc) : 'none'}" style="height:${x.n ? Math.max(8, x.acc) : 4}%"></i><small>${x.d.getDate()}</small></div>`).join('')}</div>
        <p class="cd-trend-note">${tr.filter(x => x.n).length} dari 14 hari kamu belajar • ${tr.reduce((a, x) => a + x.n, 0)} soal</p>`
        : '<div class="ins-empty-sm">Belum ada aktivitas dalam 14 hari terakhir.</div>';
    }

    // Rekomendasi yang bisa ditindaklanjuti
    const rows = smartRows(), due = rows.filter(r => r.due).length, stubborn = qs.filter(x => x.att >= 3 && x.acc < 0.5).length;
    const recs = [];
    if (rows.length) recs.push(`<button type="button" class="cd-rec hot" data-cd-go="smart"><span class="ico">🧠</span><span class="tx"><b>${rows.length} soal perlu direview</b><small>${due ? due + ' jatuh tempo' : 'paling rawan terlupa'}</small></span><span class="go">Mulai ›</span></button>`);
    if (weak) recs.push(`<button type="button" class="cd-rec" data-cd-go="block" data-key="${E(weak.key)}"><span class="ico">🎯</span><span class="tx"><b>Perkuat ${E(weak.name)}</b><small>akurasi ${weak.acc}% • ${weak.total} soal</small></span><span class="go">Latihan ›</span></button>`);
    if (stubborn) recs.push(`<button type="button" class="cd-rec" data-cd-go="wrong"><span class="ico">❌</span><span class="tx"><b>${stubborn} soal “bandel”</b><small>dicoba ≥ 3× tapi akurasi < 50%</small></span><span class="go">Lihat ›</span></button>`);
    recs.push(`<button type="button" class="cd-rec" data-cd-go="smart10"><span class="ico">⚡</span><span class="tx"><b>Smart 10</b><small>10 soal campuran untuk pemanasan</small></span><span class="go">Mulai ›</span></button>`);
    const rEl = $('dashboardRecommendations'); if (rEl) rEl.innerHTML = recs.join('');
  }

  /* ───────── util tampilan ───────── */
  function kpi(label, val, tone) { return `<div class="ins-kpi ${tone || ''}"><b>${val}</b><span>${E(label)}</span></div>`; }
  function emptyHTML(ico, title, text, btn, go) {
    return `<div class="ins-empty"><div class="ins-empty-ico">${ico}</div><b>${E(title)}</b>${text ? `<p>${E(text)}</p>` : ''}${btn ? `<button type="button" class="primary" data-ins-go="${E(go)}">${E(btn)}</button>` : ''}</div>`;
  }

  /* ───────── event ───────── */
  document.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.insGo) return window.show(t.dataset.insGo);
    const view = document.querySelector('.view.active')?.id;
    if (view === 'wrong') {
      const item = t.closest('.ins-item');
      if (t.matches('[data-ins-block]')) { W.block = t.dataset.insBlock; W.limit = 30; return renderWrongNew(); }
      if (t.matches('[data-ins-sort]')) { W.sort = t.dataset.insSort; return renderWrongNew(); }
      if (t.matches('[data-ins-mastered]')) { W.mastered = !W.mastered; W.block = 'all'; W.limit = 30; return renderWrongNew(); }
      if (t.matches('[data-ins-more]')) { W.limit += 30; return renderWrongNew(); }
      if (t.matches('[data-ins-toggle]')) { const id = item.dataset.id; W.open.has(id) ? W.open.delete(id) : W.open.add(id); return renderWrongNew(); }
      if (t.matches('[data-ins-master]')) { patchWrong(item.dataset.id, q => { q.mastered = true; q.ok = Math.max(2, Number(q.ok) || 0); }); window.showToast?.('Ditandai sudah paham ✓'); return renderWrongNew(); }
      if (t.matches('[data-ins-unmaster]')) { patchWrong(item.dataset.id, q => { delete q.mastered; q.ok = 0; }); return renderWrongNew(); }
      if (t.matches('[data-ins-one]')) return window.CLINED_practiceWrong([item.dataset.id]);
      if (t.matches('[data-ins-practice]')) return window.CLINED_practiceWrong($('wrongDock')._ids || []);
    }
    if (t.matches('[data-cd-go]')) {
      const go = t.dataset.cdGo;
      if (go === 'smart') { renderSmartReviewNew(); return window.show('smartReview'); }
      if (go === 'wrong') { W.block = 'all'; W.sort = 'freq'; renderWrongNew(); return window.show('wrong'); }
      if (go === 'smart10') return typeof startSmart10 === 'function' && startSmart10();
      if (go === 'block') { const pid = window.clinedLearning?.blockPageId?.(t.dataset.key); return window.show(pid || 'uabPage'); }
    }
  });

  /* ───────── pasang menggantikan versi lama ───────── */
  window.renderWrong = renderWrongNew;
  window.renderSmartReview = renderSmartReviewNew;
  window.renderClinicalDashboard = renderDashboardNew;
  window.startSmartReview = startSmartReviewNew;
  const bind = () => { const b = $('smartReviewStartBtn'); if (b) b.onclick = startSmartReviewNew; };
  bind();
  window.addEventListener('clined:view-change', ev => {
    if (ev.detail === 'wrong') renderWrongNew();
    if (ev.detail === 'smartReview') renderSmartReviewNew();
    if (ev.detail === 'clinicalDashboard') renderDashboardNew();
  });
  window.CLINED_INSIGHTS = { overall, blockStats, smartRows, dailyTrend };
})();
