/* LATIHAN MATERI
   Tombol di tiap blok UAB -> daftar materi -> latihan soal (feedback langsung + pembahasan per opsi).
   v2: UI selaras dengan kuis utama, resume yang konsisten, terhubung ke streak harian / soal salah / riwayat. */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const L = 'ABCDE';
  const KEY_RESUME = 'clined_materi_resume_v2';
  const KEY_BEST = 'clined_materi_best_v1';
  const KEY_CACHE = 'materi_packs_cache_v1'; // tanpa prefix clined_ agar tidak ikut tersinkron ke server
  const KEY_FLAGS = 'clined_materi_flags_v1';
  const KEY_LAST = 'clined_materi_last_v1';
  const KEY_QTIME = 'clined_qtime_v1';
  const KEY_LEGACY = 'clined_materi_resume';
  const KEY_HIST = 'gaster_v8_history';

  const norm = v => {
    const k = String(v || '').trim().toUpperCase().replace(/^BLOK\s+/, '').replace(/_/g, ' ');
    return ({ ENDOKRIN: 'ENDOKRINE', PANCAINDRA: 'PANCA INDRA', 'KEDOKTERAN KOMUNITAS': 'KEDKOM', 'KEDOKTERAN KELUARGA': 'KEDKEL', GASTROINTESTINAL: 'GIT', MUSKULO: 'MUSKULOSKELETAL' })[k] || k;
  };
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const stripLetter = t => String(t ?? '').replace(/^\s*[A-Ea-e][.)]\s+/, '');
  const stripTruth = t => String(t ?? '').replace(/^\s*(BENAR|SALAH)\s*[.:—-]?\s*/i, '').trim();

  const readJSON = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } };
  const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

  const S = { block: '', label: '', pageId: '', packs: [], run: null, token: 0, offline: false, q: '', lf: 'all', lim: 12 };
  const fold = t => String(t ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

  /* ---------- storage ---------- */
  const packKey = p => String(p.id ?? p.title ?? '');
  const stateKey = (block, pk) => `${block}|${pk}`;
  const allResume = () => { const r = readJSON(KEY_RESUME, {}); return r && typeof r === 'object' && !Array.isArray(r) ? r : {}; };
  const getResume = key => allResume()[key] || null;
  const putResume = (key, st) => { const r = allResume(); r[key] = st; writeJSON(KEY_RESUME, r); };
  const dropResume = key => { const r = allResume(); if (key in r) { delete r[key]; writeJSON(KEY_RESUME, r); } };
  const allLast = () => { const r = readJSON(KEY_LAST, {}); return r && typeof r === 'object' && !Array.isArray(r) ? r : {}; };
  const getLast = key => allLast()[key] || null;
  const putLast = (key, v) => { const r = allLast(); r[key] = v; writeJSON(KEY_LAST, r); };
  const getBest = key => (readJSON(KEY_BEST, {}) || {})[key] || null;
  const putBest = (key, v) => { const b = readJSON(KEY_BEST, {}) || {}; b[key] = v; writeJSON(KEY_BEST, b); };
  try { localStorage.removeItem(KEY_LEGACY); localStorage.removeItem('clined_materi_packs_cache_v1'); } catch {} // format lama tidak bisa dipetakan dengan aman

  const allFlags = () => { const f = readJSON(KEY_FLAGS, {}); return f && typeof f === 'object' && !Array.isArray(f) ? f : {}; };
  const flagId = (pk, rid) => `${S.block}|${pk}|${rid}`;
  function toggleFlag(q) {
    const f = allFlags(), id = flagId(q.pk, q.rid);
    if (f[id]) delete f[id]; else f[id] = { block: S.block, pk: q.pk, rid: q.rid, at: Date.now() };
    writeJSON(KEY_FLAGS, f);
    return !!f[id];
  }
  const isFlagged = q => !!allFlags()[flagId(q.pk, q.rid)];
  function recordTime(q, secs, good) {
    const all = readJSON(KEY_QTIME, {}) || {};
    const b = all[S.block] || { n: 0, sum: 0, fastWrong: 0, slow: 0 };
    b.n++; b.sum += secs;
    if (!good && secs < 6) b.fastWrong++;   // salah + sangat cepat = kemungkinan asal tebak
    if (secs > 90) b.slow++;
    all[S.block] = b;
    writeJSON(KEY_QTIME, all);
  }
  const getPack = i => i === 'flag' ? S.flagPack : S.packs[i];

  /* ---------- data ---------- */
  async function fetchPacks() {
    try {
      const r = await fetch('/api/content/packages?module=MAT', { credentials: 'same-origin', cache: 'no-store' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw Object.assign(Error(d.error || 'Gagal memuat latihan materi.'), { server: true });
      const packages = d.packages || [];
      writeJSON(KEY_CACHE, { at: Date.now(), packages });
      S.offline = false;
      return packages;
    } catch (err) {
      if (err && err.server) throw err;
      const c = readJSON(KEY_CACHE, null); // hanya untuk kegagalan jaringan
      if (c && Array.isArray(c.packages)) { S.offline = true; return c.packages; }
      throw Error('Tidak bisa terhubung. Periksa koneksi internet lalu coba lagi.');
    }
  }

  const validQuestions = p => (p.questions || []).filter(q =>
    q && q.soal && Array.isArray(q.opsi) && q.opsi.length >= 2 &&
    Number.isInteger(q.jawabanBenar) && q.jawabanBenar >= 0 && q.jawabanBenar < q.opsi.length);

  function buildQ(pack, q, order) {
    const per = Array.isArray(q.pembahasanPilihan) ? q.pembahasanPilihan : [];
    return {
      rid: q.id,
      pk: q._pk || packKey(pack),
      id: `mat:${q._pk || packKey(pack)}:${q.id}`,
      soal: q.soal,
      opsi: order.map(k => stripLetter(q.opsi[k])),
      orig: order,
      benar: order.indexOf(q.jawabanBenar),
      pembahasan: q.pembahasan || '',
      catatan: q.catatanKlinis || '',
      per: order.map(k => stripTruth(per[k] || ''))
    };
  }

  /* ---------- view helpers ---------- */
  const body = () => $('materiLatihanBody');
  const page = () => $('materiLatihanPage');
  function setHead(eyebrow, title, back) {
    $('materiLatihanEyebrow').textContent = eyebrow;
    $('materiLatihanTitle').textContent = title;
    const b = $('backFromMateriLatihan'); if (b && back) b.textContent = back;
  }
  function setRunning(on) {
    page()?.classList.toggle('ml-running', !!on);
    document.body.classList.toggle('quiz-context', !!on); // sembunyikan floating nav saat mengerjakan
  }
  const grade = pct => pct >= 80 ? ['🏆', 'Mantap! Materi ini sudah kuat.'] : pct >= 60 ? ['👍', 'Lumayan, ulangi bagian yang masih salah.'] : ['📖', 'Yuk pelajari materinya lagi, lalu coba ulang.'];

  /* ---------- list ---------- */
  async function openList(block, label, pageId) {
    if (block) { if (block !== S.block) { S.q = ''; S.lf = 'all'; S.lim = 12; } S.block = block; S.label = label; S.pageId = pageId; }
    if (!S.block) { window.show?.('home'); return; }
    S.run = null;
    const token = ++S.token;
    setRunning(false);
    setHead('UAB • BLOK ' + S.label, 'Latihan Materi', '‹ BLOK ' + S.label);
    window.show?.('materiLatihanPage');
    body().innerHTML = '<div class="ml-skeleton"></div><div class="ml-skeleton"></div><div class="ml-skeleton"></div>';
    try {
      const packs = (await fetchPacks()).filter(p => norm(p.block) === S.block);
      if (token !== S.token) return;
      S.packs = packs;
      buildFlagPack();
      renderList();
    } catch (err) {
      if (token !== S.token) return;
      body().innerHTML = `<div class="ml-empty"><span class="ml-empty-icon">⚠️</span><b>${esc(err.message)}</b><button type="button" class="secondary small-btn" data-ml-retry>Coba lagi</button></div>`;
    }
  }

  function buildFlagPack() {
    const f = allFlags(), qs = [];
    S.packs.forEach(p => validQuestions(p).forEach(q => {
      if (f[`${S.block}|${packKey(p)}|${q.id}`]) qs.push({ ...q, _pk: packKey(p) });
    }));
    S.flagPack = qs.length ? { id: '__flagged', title: 'Soal Ditandai', questions: qs } : null;
  }

  function renderList() {
    const packs = S.packs;
    if (!packs.length) {
      body().innerHTML = '<div class="ml-empty"><span class="ml-empty-icon">📝</span><b>Belum ada latihan materi</b><small>Latihan untuk blok ini belum ditambahkan.</small></div>';
      return;
    }
    const totalQ = packs.reduce((n, p) => n + validQuestions(p).length, 0);
    const cnt = { all: packs.length, new: 0, prog: 0, done: 0 };
    const rows = packs.map((p, i) => {
      const key = stateKey(S.block, packKey(p));
      const n = validQuestions(p).length;
      const st = getResume(key), best = getBest(key), lastRes = getLast(key);
      const inProg = st && Array.isArray(st.seq) && st.seq.length;
      const meta = [`${n} soal`];
      if (best) meta.push(`✓ Selesai`, `Terbaik ${best.pct}%`);
      const pct = inProg ? Math.round(Math.min(st.pos, st.seq.length) / st.seq.length * 100) : 0;
      const status = inProg ? 'prog' : best ? 'done' : 'new';
      cnt[status]++;
      return `<div class="ml-row" data-ml-title="${esc(fold(p.title))}" data-ml-status="${status}">
        <button type="button" class="ml-item${inProg ? ' in-progress' : ''}${best ? ' mastered' : ''}" data-ml-start="${i}" ${n ? '' : 'disabled'}>
          <span class="ml-item-num">${best ? '✓' : i + 1}</span>
          <span class="ml-item-main"><b>${esc(p.title)}</b><small>${meta.join(' • ')}</small>
            ${inProg ? `<span class="ml-item-bar"><i style="width:${pct}%"></i></span>` : ''}</span>
          <span class="ml-item-cta">${inProg ? `Lanjut ${Math.min(st.pos + 1, st.seq.length)}/${st.seq.length}` : best ? 'Ulangi' : 'Mulai'} ›</span>
        </button>
        ${inProg || lastRes ? `<div class="ml-row-links">${lastRes ? `<button type="button" class="ml-restart" data-ml-review="${i}">Tinjau hasil terakhir (${lastRes.pct}%)</button>` : ''}${inProg ? `<button type="button" class="ml-restart" data-ml-restart="${i}">Mulai dari awal</button>` : ''}</div>` : ''}
      </div>`;
    }).join('');
    const showLf = [cnt.new, cnt.prog, cnt.done].filter(Boolean).length >= 2;
    if (!showLf) S.lf = 'all';
    body().innerHTML = `${S.offline ? '<div class="ml-note">📡 Mode offline • menampilkan data terakhir yang tersimpan.</div>' : ''}
      <div class="ml-hero"><span class="ml-hero-icon">📝</span><div><b>${packs.length} materi • ${totalQ} soal</b><small>Jawab, lihat pembahasan tiap pilihan, kumpulkan XP.</small></div></div>
      <div class="ml-toolbar">
        <div class="ml-search"><span class="ml-search-ico" aria-hidden="true">🔍</span><input type="search" id="mlSearch" class="ml-search-input" placeholder="Cari materi…" value="${esc(S.q)}" autocomplete="off" enterkeyhint="search" aria-label="Cari materi"><button type="button" class="ml-search-clear" data-ml-clear aria-label="Hapus pencarian" hidden>✕</button></div>
        ${showLf ? `<div class="ml-chips ml-lf" role="tablist" aria-label="Filter status">${[['all', 'Semua'], ['new', 'Belum'], ['prog', 'Berjalan'], ['done', 'Selesai']].filter(([k]) => k === 'all' || cnt[k]).map(([k, l]) => `<button type="button" class="ml-chip${S.lf === k ? ' on' : ''}" data-ml-lf="${k}">${l} <i>${cnt[k]}</i></button>`).join('')}</div>` : ''}
      </div>
      <div class="ml-search-info" id="mlSearchInfo" hidden></div>
      ${S.flagPack ? `<button type="button" class="ml-item ml-flagrow" data-ml-start="flag"><span class="ml-item-num">⭐</span><span class="ml-item-main"><b>Soal Ditandai</b><small>${S.flagPack.questions.length} soal yang kamu tandai</small></span><span class="ml-item-cta">Latih ›</span></button>` : ''}
      <div class="ml-list" id="mlList">${rows}</div>
      <button type="button" class="secondary ml-more" id="mlMore" data-ml-more hidden></button>
      <div class="ml-empty" id="mlNoMatch" hidden><span class="ml-empty-icon">🔎</span><b>Materi tidak ditemukan</b><small>Coba kata kunci lain.</small></div>`;
    applySearch();
  }

  /* filter tanpa render ulang agar fokus keyboard tidak hilang */
  function applySearch() {
    const list = $('mlList'); if (!list) return;
    const terms = fold(S.q).split(' ').filter(Boolean);
    const searching = terms.length > 0 || S.lf !== 'all';
    let hits = 0, shown = 0;
    list.querySelectorAll('.ml-row').forEach(r => {
      const t = r.dataset.mlTitle || '';
      const hit = terms.every(w => t.includes(w)) && (S.lf === 'all' || r.dataset.mlStatus === S.lf);
      if (hit) hits++;
      const vis = hit && (searching || shown < S.lim);
      r.hidden = !vis; if (vis) shown++;
    });
    const total = list.querySelectorAll('.ml-row').length;
    const info = $('mlSearchInfo'), none = $('mlNoMatch'), clr = document.querySelector('.ml-search-clear'), more = $('mlMore');
    if (clr) clr.hidden = !S.q;
    if (info) { info.hidden = !searching || !hits; info.textContent = `${hits} dari ${total} materi`; }
    if (none) none.hidden = !(searching && !hits);
    if (more) { const left = hits - shown; more.hidden = searching || left <= 0; more.textContent = `Tampilkan ${Math.min(left, 12)} lagi (${left} tersisa)`; }
    document.querySelectorAll('.ml-lf .ml-chip').forEach(c => c.classList.toggle('on', c.dataset.mlLf === S.lf));
  }

  /* ---------- run ---------- */
  function makeRun(pack, opts = {}) {
    const key = stateKey(S.block, packKey(pack));
    const valid = validQuestions(pack);
    const byId = new Map(valid.map(q => [String(q.id), q]));
    let qs, ans, pos;
    const saved = opts.saved || (opts.fresh || opts.subset ? null : getResume(key));
    if (saved && Array.isArray(saved.seq)) {
      qs = []; ans = [];
      saved.seq.forEach((s, idx) => {
        const q = byId.get(String(s.id)); if (!q) return;
        const order = Array.isArray(s.order) && s.order.length === q.opsi.length && s.order.every(k => Number.isInteger(k) && k >= 0 && k < q.opsi.length) ? s.order : shuffle(q.opsi.map((_, k) => k));
        qs.push(buildQ(pack, q, order));
        const a = Array.isArray(saved.ans) ? saved.ans[idx] : null;
        ans.push(Number.isInteger(a) && a >= 0 && a < q.opsi.length ? a : null);
      });
      pos = Math.max(0, Math.min(Number(saved.pos) || 0, qs.length - 1));
    }
    if (!qs || !qs.length) {
      const source = opts.subset ? opts.subset : shuffle(valid);
      qs = source.map(q => buildQ(pack, q, shuffle(q.opsi.map((_, k) => k))));
      ans = qs.map(() => null); pos = 0;
    }
    return { key, pack, title: pack.title, qs, ans, pos, xp: 0, persist: !opts.subset && !opts.saved, resumed: !!saved && qs.length > 0 };
  }

  function startRun(i, opts = {}) {
    const pack = getPack(i); if (!pack) return;
    if (!validQuestions(pack).length) {
      body().innerHTML = '<div class="ml-empty"><span class="ml-empty-icon">⚠️</span><b>Paket ini tidak berisi soal yang valid.</b></div>';
      return;
    }
    if (opts.fresh) dropResume(stateKey(S.block, packKey(pack)));
    S.run = makeRun(pack, opts);
    S.run.idx = i;
    setRunning(true);
    renderQ();
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  const scoreOf = R => R.qs.reduce((n, q, i) => n + (R.ans[i] === q.benar ? 1 : 0), 0);
  const streakOf = (R, upto) => { let s = 0; for (let i = upto; i >= 0; i--) { if (R.ans[i] != null && R.ans[i] === R.qs[i].benar) s++; else break; } return s; };

  function save(R) {
    if (!R.persist) return;
    putResume(R.key, {
      block: S.block, label: S.label, pageId: S.pageId, packKey: packKey(R.pack), title: R.title,
      pos: R.pos, ans: R.ans, updated: Date.now(),
      seq: R.qs.map(q => ({ id: q.rid, order: q.orig }))
    });
  }

  function renderQ() {
    const R = S.run, q = R.qs[R.pos], picked = R.ans[R.pos], done = picked != null;
    if (!done && R.t0Pos !== R.pos) { R.t0 = Date.now(); R.t0Pos = R.pos; }
    const score = scoreOf(R), st = streakOf(R, done ? R.pos : R.pos - 1);
    const fl = isFlagged(q);
    setHead('LATIHAN • BLOK ' + S.label, R.title, '‹ Daftar materi');

    const explain = done ? explainHTML(q, picked, false) : '';
    const commentKey = window.CLINED_QC?.keyOf('latihan-materi-' + S.block, q.id);
    const left = R.ans.filter(x => x == null).length;
    const others = left - (done ? 0 : 1);
    body().innerHTML = `<div class="card ml-card">
        <div class="ml-top">
          <span class="ml-pill">Soal ${R.pos + 1} / ${R.qs.length}</span>
          <span class="ml-live"><button type="button" class="ml-flag${fl ? ' on' : ''}" data-ml-flag aria-pressed="${fl}" aria-label="Tandai soal">${fl ? '★' : '☆'}</button><span>✓ ${score} benar</span>${st > 1 ? `<span class="ml-fire">🔥 ${st} beruntun</span>` : ''}</span>
        </div>
        <div class="ml-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${R.qs.length}" aria-valuenow="${R.qs.length - left}"><i style="width:${Math.round((R.qs.length - left) / R.qs.length * 100)}%"></i></div>
        <div class="ml-nav" id="mlNav" aria-label="Navigasi soal">${R.qs.map((qq, i) => { const a = R.ans[i]; const c = i === R.pos ? ' cur' : ''; const st2 = a == null ? '' : a === qq.benar ? ' ok' : ' bad'; return `<button type="button" class="ml-dot${c}${st2}" data-ml-goto="${i}" aria-label="Soal ${i + 1}">${i + 1}</button>`; }).join('')}</div>
        <div class="ml-question">${esc(q.soal)}</div>
        <div class="ml-options">${q.opsi.map((o, k) => `<button type="button" class="ml-opt${done ? (k === q.benar ? ' ok' : k === picked ? ' bad' : '') : ''}" data-ml-pick="${k}" ${done ? 'disabled' : ''}><span class="ml-letter">${L[k]}</span><span class="ml-opt-text">${esc(o)}</span></button>`).join('')}</div>
        ${explain}
        ${done ? '<div class="qcomments-slot" data-materi-qcomments></div>' : ''}
      </div>
      ${left > 0 && left < R.qs.length ? `<button type="button" class="ml-finish-early" data-ml-finish>Akhiri latihan (${left} soal belum dijawab)</button>` : ''}
      <div class="ml-dock"><div class="ml-dock-row">
        ${R.pos > 0 ? '<button type="button" class="secondary ml-prev" data-ml-prev>Sebelumnya</button>' : ''}
        ${done ? `<button type="button" class="primary ml-next" data-ml-next>${left > 0 ? 'Lanjut' : 'Lihat hasil 🏁'}</button>` : `<button type="button" class="secondary ml-skip" data-ml-skip ${others > 0 ? '' : 'disabled'}>Lewati</button>`}
      </div></div>`;
    if (done && commentKey) {
      window.CLINED_QC?.mount(body().querySelector('[data-materi-qcomments]'), commentKey);
    }
    const nav = $('mlNav'), cur = nav?.querySelector('.cur');
    if (nav && cur) nav.scrollLeft = Math.max(0, cur.offsetLeft - nav.clientWidth / 2 + cur.clientWidth / 2);
  }

  function explainHTML(q, picked, review) {
    const unanswered = picked == null, good = picked === q.benar;
    return `<div class="explain ml-explain">
      <div class="explain-title ${unanswered ? 'skip' : good ? 'ok' : 'bad'}">${unanswered ? '⏭️ Belum dijawab' : good ? '✅ Benar!' : '❌ Kurang tepat'}</div>
      ${q.pembahasan ? `<div class="main-explain"><b>🎯 Konsep inti:</b> ${esc(q.pembahasan)}</div>` : ''}
      ${q.catatan ? `<div class="clinical-note"><b>🩺 Catatan klinis:</b> ${esc(q.catatan)}</div>` : ''}
      ${!review && !good ? '<button type="button" class="ml-mini-btn" data-ml-material>📖 Buka materi blok ini</button>' : ''}
      ${q.opsi.map((o, k) => {
        const ok = k === q.benar;
        const text = q.per[k] || (ok ? (q.pembahasan || 'Sesuai dengan konsep yang diuji.') : 'Opsi ini tidak paling sesuai dengan temuan pada soal.');
        return `<div class="option-review ml-review ${ok ? 'is-correct' : 'is-wrong'}${k === picked ? ' is-picked' : ''}">
          <div class="option-review-head"><b>${L[k]}. ${esc(o)}</b><span>${ok ? '✓ KUNCI' : k === picked ? '✕ PILIHANMU' : '✕ BUKAN KUNCI'}</span></div>
          <div class="option-review-text">${esc(text)}</div></div>`;
      }).join('')}
      ${review ? '' : '<button type="button" class="ml-report" data-ml-report>🚩 Laporkan soal ini (salah / ambigu)</button>'}
      ${window.clinedCanEditQuestions?.() ? '<button type="button" class="ml-report ml-edit" data-ml-edit>✏️ Edit jawaban & pembahasan</button>' : ''}
    </div>`;
  }

  /* ---------- navigasi antar soal ---------- */
  function nextUnanswered(R, from) {
    for (let i = from + 1; i < R.qs.length; i++) if (R.ans[i] == null) return i;
    for (let i = 0; i < from; i++) if (R.ans[i] == null) return i;
    return -1;
  }
  function go(i) {
    const R = S.run; if (!R || i < 0 || i >= R.qs.length) return;
    R.pos = i; save(R); renderQ(); window.scrollTo({ top: 0, behavior: 'auto' });
  }
  function skip() {
    const R = S.run; if (!R || R.ans[R.pos] != null) return;
    const t = nextUnanswered(R, R.pos);
    if (t < 0) { window.showToast?.('Ini satu-satunya soal yang belum dijawab.'); return; }
    go(t);
  }
  async function finishEarly() {
    const R = S.run; if (!R) return;
    const left = R.ans.filter(x => x == null).length;
    if (!left) return finish();
    if (await clinedConfirm({ title: 'Akhiri latihan sekarang?', icon: '🏁', lines: [`**${left} soal** belum dijawab dan akan dihitung salah.`], ok: 'Akhiri latihan', cancel: 'Lanjut mengerjakan' })) finish();
  }

  function pick(k) {
    const R = S.run; if (!R || R.ans[R.pos] != null) return;
    const q = R.qs[R.pos];
    if (!Number.isInteger(k) || k < 0 || k >= q.opsi.length) return;
    R.ans[R.pos] = k;
    const good = k === q.benar;
    try { recordTime(q, Math.min(180, Math.max(1, Math.round((Date.now() - (R.t0 || Date.now())) / 1000))), good); } catch {}
    const streak = streakOf(R, R.pos);
    try {
      const gain = good ? 20 + Math.min(30, Math.max(0, (streak - 1) * 5)) : 5;
      R.xp += gain;
      window.addXP?.(gain, good ? (streak > 1 ? `Latihan Materi • streak ${streak} 🔥` : 'Latihan Materi • benar') : 'Tetap semangat—jawaban salah', { kind: 'materi', ref: q.id });
    } catch {}
    // sambungkan ke sistem utama: target harian, statistik kemampuan, daftar soal salah
    const rec = { stat: { p: q.orig[k], ci: q.orig[q.benar] }, id: q.id, bank: 'Latihan Materi', soal: q.soal, opsi: q.opsi, jawabanBenar: q.benar, pembahasan: q.pembahasan, pembahasanPilihan: q.per, catatanKlinis: q.catatan };
    try { window.recordDailyQuestion?.(); } catch {}
    try { window.recordQuestionPerformance?.(rec, good); } catch {}
    if (!good) { try { window.recordWrong?.(rec); } catch {} }
    try { if (good) navigator.vibrate?.(15); else navigator.vibrate?.([30, 40, 30]); } catch {}
    save(R);
    renderQ();
    // pastikan pembahasan terlihat di layar kecil
    requestAnimationFrame(() => document.querySelector('.ml-explain')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  }

  function flagCurrent() {
    const R = S.run; if (!R) return;
    const on = toggleFlag(R.qs[R.pos]);
    window.showToast?.(on ? '⭐ Soal ditandai' : 'Tanda dihapus');
    renderQ();
  }

  function editCurrent() {
    const R = S.run; if (!R) return;
    const q = R.qs[R.pos];
    window.clinedEditQuestion?.({ packageId: q.pk, qid: q.rid, onSaved: raw => {
      const nq = buildQ({ id: q.pk }, { ...raw, _pk: q.pk }, q.orig);
      R.qs[R.pos] = nq;
      renderQ();
    } });
  }
  function reportCurrent() {
    const R = S.run; if (!R) return;
    const q = R.qs[R.pos];
    const text = `[Laporan soal CLINED]\nBlok: ${S.label}\nMateri: ${R.title}\nID soal: ${q.id}\nSoal: ${q.soal}\nMasalah: (tulis: kunci salah / ambigu / typo / lainnya)`;
    window.clinedReportQuestion({ id: q.id, source: 'mat', bank: `${S.label} • ${R.title}`, soal: q.soal, text });
  }
  function next() {
    const R = S.run; if (!R || R.ans[R.pos] == null) return;
    const t = nextUnanswered(R, R.pos);
    if (t >= 0) return go(t);
    finish();
  }

  function finish() {
    const R = S.run, score = scoreOf(R), total = R.qs.length, pct = Math.round(score / total * 100);
    let record = false;
    if (R.persist) {
      dropResume(R.key);
      const prev = getBest(R.key);
      if (!prev || pct > prev.pct) { putBest(R.key, { pct, score, total, at: Date.now() }); record = !!prev; }
    }
    const h = readJSON(KEY_HIST, []);
    if (Array.isArray(h)) {
      h.unshift({ date: new Date().toISOString(), score, correct: score, total, pct, validTotal: total, block: S.block, bank: 'MAT', bankName: `Latihan Materi • ${R.title}`, mode: 'study', duration: null, reason: 'complete' });
      writeJSON(KEY_HIST, h.slice(0, 50));
      try { window.renderCounts?.(); } catch {}
    }
    const skipped = R.ans.filter(x => x == null).length;
    if (R.persist) putLast(R.key, { ans: R.ans, seq: R.qs.map(q => ({ id: q.rid, order: q.orig })), pct, score, total, at: Date.now() });
    R.done = { score, total, pct, record, skipped };
    renderResult();
  }

  function renderResult() {
    const R = S.run, { score, total, pct, record, skipped = 0 } = R.done, wrong = total - score, [emoji, msg] = grade(pct);
    setHead('HASIL • BLOK ' + S.label, R.title, '‹ Daftar materi');
    body().innerHTML = `<div class="card ml-result">
        <div class="ml-result-emoji">${emoji}</div>
        <div class="eyebrow">HASIL LATIHAN</div>
        <div class="ml-score">${pct}%</div>
        <p class="muted">${score} dari ${total} soal benar</p>
        <div class="grade-pill">${esc(msg)}</div>
        ${record ? '<div class="ml-record">🎉 Rekor baru untuk materi ini!</div>' : ''}
        <div class="ml-stats">
          <div><b>${score}</b><span>Benar</span></div>
          <div><b>${wrong - skipped}</b><span>Salah</span></div>
          ${skipped ? `<div><b>${skipped}</b><span>Dilewati</span></div>` : ''}
          <div><b>+${R.xp}</b><span>XP</span></div>
        </div>
      </div>
      <div class="ml-actions">
        <button type="button" class="${wrong ? 'secondary' : 'primary'}" data-ml-review-now>🔍 Tinjau jawaban</button>
        ${wrong ? '<button type="button" class="primary" data-ml-wrong>❌ Ulangi soal yang salah</button>' : ''}
        <button type="button" class="secondary" data-ml-again>🔄 Ulangi latihan</button>
        <button type="button" class="secondary" data-ml-list>Latihan materi lain</button>
      </div>`;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  /* ---------- tinjau jawaban ---------- */
  function statusOf(R, i) { const a = R.ans[i]; return a == null ? 'skip' : a === R.qs[i].benar ? 'ok' : 'bad'; }
  function renderReview(filter = 'all') {
    const R = S.run; if (!R) return;
    R.reviewing = true; S.rvFilter = filter;
    setRunning(false);
    setHead('TINJAU • BLOK ' + S.label, R.title, R.from === 'result' ? '‹ Hasil' : '‹ Daftar materi');
    const cnt = { all: R.qs.length, bad: 0, skip: 0 };
    R.qs.forEach((_, i) => { const st = statusOf(R, i); if (st !== 'ok') cnt[st]++; });
    const chip = (k, label) => `<button type="button" class="ml-chip${filter === k ? ' on' : ''}" data-ml-filter="${k}">${label} (${cnt[k]})</button>`;
    const label = { ok: '✓ Benar', bad: '✕ Salah', skip: '⏭ Dilewati' };
    const items = R.qs.map((q, i) => ({ q, i, st: statusOf(R, i) })).filter(x => filter === 'all' || x.st === filter);
    body().innerHTML = `<div class="ml-chips">${chip('all', 'Semua')}${chip('bad', 'Salah')}${cnt.skip ? chip('skip', 'Dilewati') : ''}</div>
      ${items.length ? items.map(({ q, i, st }) => {
        const picked = R.ans[i];
        return `<article class="card ml-rv ml-rv-${st}">
          <div class="ml-top"><span class="ml-pill">Soal ${i + 1}</span><span class="ml-rv-badge ${st}">${label[st]}</span></div>
          <div class="ml-question ml-rv-q">${esc(q.soal)}</div>
          <div class="ml-options">${q.opsi.map((o, k) => `<div class="ml-opt ml-opt-static${k === q.benar ? ' ok' : k === picked ? ' bad' : ''}"><span class="ml-letter">${L[k]}</span><span class="ml-opt-text">${esc(o)}${k === q.benar ? ' <em class="ml-tag">Kunci</em>' : k === picked ? ' <em class="ml-tag">Jawabanmu</em>' : ''}</span></div>`).join('')}</div>
          <details class="ml-rv-detail" data-qkey="${window.CLINED_QC?.keyOf('latihan-materi-' + S.block, q.id) || ''}"><summary>Lihat pembahasan</summary>${explainHTML(q, picked, true)}</details>
        </article>`;
      }).join('') : '<div class="ml-empty"><span class="ml-empty-icon">🎉</span><b>Tidak ada soal di kategori ini</b></div>'}`;
    window.CLINED_QC?.lazyDetails(body());
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
  function startReview(i) {
    const pack = getPack(i); if (!pack) return;
    const last = getLast(stateKey(S.block, packKey(pack)));
    if (!last || !Array.isArray(last.seq)) return;
    const R = makeRun(pack, { saved: last });
    if (!R.qs.length) { window.showToast?.('Soal pada hasil ini sudah tidak tersedia.', true); return; }
    R.idx = i; R.from = 'list'; R.done = { score: scoreOf(R), total: R.qs.length, pct: last.pct, skipped: R.ans.filter(x => x == null).length };
    S.run = R; renderReview('all');
  }

  function retryWrong() {
    const R = S.run; if (!R) return;
    const ids = new Set(R.qs.filter((q, i) => R.ans[i] !== q.benar).map(q => String(q.rid)));
    const subset = validQuestions(R.pack).filter(q => ids.has(String(q.id)));
    if (!subset.length) return;
    S.run = makeRun(R.pack, { subset: shuffle(subset) });
    S.run.idx = R.idx;
    setRunning(true);
    renderQ();
  }

  /* ---------- events ---------- */
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-ml-start],[data-ml-restart],[data-ml-retry],[data-ml-pick],[data-ml-next],[data-ml-again],[data-ml-wrong],[data-ml-list],[data-ml-clear],[data-ml-goto],[data-ml-prev],[data-ml-skip],[data-ml-finish],[data-ml-review-now],[data-ml-review],[data-ml-filter],[data-ml-lf],[data-ml-more],[data-ml-flag],[data-ml-material],[data-ml-report],[data-ml-edit],[data-ml-edit],[data-ml-resume-home],[data-ml-discard-home],#backFromMateriLatihan,[data-latihan-open]');
    if (!t) return;
    if (t.matches('[data-latihan-open]')) {
      const sec = t.closest('[data-block-key]');
      return openList(norm(sec.dataset.blockKey), (sec.querySelector('h2')?.textContent || sec.dataset.blockKey).replace(/^BLOK\s+/i, ''), sec.id);
    }
    if (t.dataset.mlLf != null) { S.lf = t.dataset.mlLf; return applySearch(); }
    if (t.matches('[data-ml-more]')) { S.lim += 12; return applySearch(); }
    if (t.dataset.mlStart != null) return startRun(t.dataset.mlStart === 'flag' ? 'flag' : +t.dataset.mlStart);
    if (t.dataset.mlRestart != null) return startRun(+t.dataset.mlRestart, { fresh: true });
    if (t.matches('[data-ml-clear]')) { S.q = ''; const i = $('mlSearch'); if (i) { i.value = ''; i.focus(); } return applySearch(); }
    if (t.dataset.mlGoto != null) return go(+t.dataset.mlGoto);
    if (t.matches('[data-ml-prev]')) return go(S.run.pos - 1);
    if (t.matches('[data-ml-skip]')) return skip();
    if (t.matches('[data-ml-finish]')) return finishEarly();
    if (t.matches('[data-ml-review-now]')) { S.run.from = 'result'; return renderReview('all'); }
    if (t.dataset.mlReview != null) return startReview(+t.dataset.mlReview);
    if (t.dataset.mlFilter) return renderReview(t.dataset.mlFilter);
    if (t.matches('[data-ml-flag]')) return flagCurrent();
    if (t.matches('[data-ml-material]')) return window.show?.(S.pageId || 'home');
    if (t.matches('[data-ml-report]')) return reportCurrent();
    if (t.matches('[data-ml-edit]')) return editCurrent();
    if (t.matches('[data-ml-retry]')) return openList();
    if (t.dataset.mlPick != null) return pick(+t.dataset.mlPick);
    if (t.matches('[data-ml-next]')) return next();
    if (t.matches('[data-ml-again]')) return startRun(S.run.idx, { fresh: true });
    if (t.matches('[data-ml-wrong]')) return retryWrong();
    if (t.matches('[data-ml-list]')) return openList();
    if (t.matches('[data-ml-resume-home]')) return window.CLINED_LATIHAN_MATERI?.resume?.(t.dataset.key);
    if (t.matches('[data-ml-discard-home]')) { dropResume(t.dataset.key); renderHomeResume(); return; }
    if (t.id === 'backFromMateriLatihan') {
      if (S.run?.reviewing && S.run.from === 'result') { S.run.reviewing = false; return renderResult(); }
      if (S.run) return openList();          // dari soal -> daftar materi
      window.show?.(S.pageId || 'uabPage');  // dari daftar -> halaman blok
    }
  });

  document.addEventListener('input', e => {
    if (e.target.id !== 'mlSearch') return;
    S.q = e.target.value; applySearch();
  });
  document.addEventListener('keydown', e => {
    if (e.target.id !== 'mlSearch') return;
    if (e.key === 'Escape' && S.q) { e.preventDefault(); S.q = ''; e.target.value = ''; applySearch(); }
    if (e.key === 'Enter') e.target.blur();   // tutup keyboard HP
  });

  // Pintasan keyboard: A–E / 1–5 untuk memilih, Enter untuk lanjut.
  document.addEventListener('keydown', e => {
    if (!S.run || !page()?.classList.contains('active') || S.run.done || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const R = S.run, answered = R.ans[R.pos] != null;
    if (S.run.reviewing) return;
    if (e.key === 'ArrowLeft' && R.pos > 0) { e.preventDefault(); return go(R.pos - 1); }
    if (e.key === 'ArrowRight' && R.pos < R.qs.length - 1) { e.preventDefault(); return go(R.pos + 1); }
    const k = 'abcde'.indexOf(e.key.toLowerCase());
    const n = /^[1-5]$/.test(e.key) ? +e.key - 1 : -1;
    if (!answered && (k >= 0 || n >= 0)) { e.preventDefault(); pick(k >= 0 ? k : n); }
    else if (answered && e.key === 'Enter' && e.target.tagName !== 'BUTTON') { e.preventDefault(); next(); }
  });

  /* ---------- tombol di halaman blok & kartu lanjutkan di beranda ---------- */
  function ensureButtons() {
    document.querySelectorAll('section.view[data-block-key]').forEach(sec => {
      if (sec.querySelector('[data-latihan-open]')) return;
      const wrap = document.createElement('div');
      wrap.className = 'materi-section latihan-materi-section';
      wrap.innerHTML = '<button type="button" class="materi-button latihan-materi-button" data-latihan-open="1" aria-label="Buka LATIHAN SOAL PER MATERI"><span class="ml-btn-icon" aria-hidden="true">📝</span>LATIHAN SOAL PER MATERI</button>';
      const anchor = sec.querySelector('.materi-section') || sec.querySelector('.exam-page-header');
      if (anchor) anchor.insertAdjacentElement('afterend', wrap); else sec.prepend(wrap);
    });
  }

  function renderHomeResume() {
    const home = $('home'); if (!home) return;
    let card = $('materiLatihanResumeCard');
    /* v75: kartu lanjutkan tidak ditampilkan di beranda; progres ada di halaman Latihan Materi */
    card?.remove(); return;
    const entries = Object.entries(allResume())
      .filter(([, s]) => s && s.title && s.block && Array.isArray(s.seq) && s.seq.length)
      .sort((a, b) => (b[1].updated || 0) - (a[1].updated || 0));
    if (!entries.length) { card?.remove(); return; }
    const [key, s] = entries[0];
    if (!card) {
      card = document.createElement('section');
      card.id = 'materiLatihanResumeCard';
      card.className = 'card resume-card materi-latihan-resume-card';
      const ref = $('examLauncher');
      if (ref && ref.parentNode) ref.parentNode.insertBefore(card, ref); else home.appendChild(card);
    }
    const total = s.seq.length, pos = Math.min(Number(s.pos) || 0, total - 1);
    const answered = (s.ans || []).filter(a => a != null).length;
    card.innerHTML = `<div class="section-title">📝 Lanjutkan Latihan</div>
      <div class="ml-resume-info"><b>${esc(s.title)}</b><small>BLOK ${esc(s.label || s.block)} • Soal ${pos + 1} dari ${total}</small></div>
      <div class="ml-progress"><i style="width:${Math.round(answered / total * 100)}%"></i></div>
      <div class="resume-actions">
        <button class="primary" type="button" data-ml-resume-home data-key="${esc(key)}">Lanjutkan</button>
        <button class="secondary small-btn resume-del" type="button" data-ml-discard-home data-key="${esc(key)}" aria-label="Hapus latihan tersimpan" title="Hapus">🗑</button>
      </div>`;
  }

  ensureButtons();
  renderHomeResume();
  window.addEventListener('clined:view-change', e => {
    ensureButtons();
    renderHomeResume();
    // reload di #materiLatihanPage tanpa konteks -> kembali ke beranda, bukan halaman kosong
    if (e.detail === 'materiLatihanPage' && !S.block) window.show?.('home');
    if (e.detail !== 'materiLatihanPage') page()?.classList.remove('ml-running');
  });

  window.CLINED_LATIHAN_MATERI = {
    open: openList,
    resume: async function (key) {
      const r = allResume();
      const k = key && r[key] ? key : Object.keys(r).sort((a, b) => (r[b].updated || 0) - (r[a].updated || 0))[0];
      const s = r[k]; if (!s) return false;
      await openList(s.block, s.label || s.block, s.pageId || 'home');
      const i = s.packKey === '__flagged' ? (S.flagPack ? 'flag' : -1) : S.packs.findIndex(p => packKey(p) === s.packKey);
      if (i === -1) { dropResume(k); renderHomeResume(); return false; }
      startRun(i);
      return true;
    }
  };
})();
