/* BANK SOAL SAYA — pengguna menempel soal + kunci + pembahasan, app membacanya otomatis,
   lalu soal disimpan per deck (tersinkron ke akun), bisa dilatih lewat mesin kuis utama dan diunduh sebagai JSON. */
(() => {
  'use strict';
  const P = window.CLINED_UB_PARSER;
  if (!P) return;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const L5 = 'ABCDE';
  const K_IDX = 'clined_userbank_index_v1', K_PASTE = 'userbank_paste_v1';
  const kd = (id, c) => `clined_userbank_d_${id}_${c}`;
  const MAX_CHUNK = 80000, MAX_TEXT = 4000, MAX_PER_DECK = 600;
  const rd = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : (JSON.parse(v) ?? d); } catch { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
  const toast = (m, e) => (window.showToast ? window.showToast(m, e) : alert(m));
  const uid = () => Math.random().toString(36).slice(2, 8);
  const bytes = s => new Blob([s]).size;
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const norm = t => String(t || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const clip = t => String(t || '').slice(0, MAX_TEXT);

  const EXAMPLE = `1. Seorang laki-laki 45 tahun datang dengan nyeri epigastrium yang memberat setelah makan. Diagnosis paling mungkin?
A. Gastritis akut
B. Ulkus duodenum
C. GERD
D. Pankreatitis kronik
E. Kolesistitis
Jawaban: A
Pembahasan: Nyeri epigastrium yang berhubungan dengan makan mengarah ke gangguan mukosa lambung.
A. Benar, iritasi mukosa lambung memberi nyeri yang memberat setelah makan.
B. Salah, pada ulkus duodenum nyeri biasanya membaik setelah makan.
C. Salah, GERD didominasi rasa panas di dada (heartburn).
D. Salah, nyeri pankreatitis kronik menjalar ke punggung.
E. Salah, kolesistitis nyeri di kuadran kanan atas dan kolik.

2. Sel yang menyekresi HCl adalah...
A. Sel chief
Pembahasan: Salah, sel chief menyekresi pepsinogen.
B. Sel parietal
Pembahasan: Benar, sel parietal menyekresi HCl dan faktor intrinsik.
C. Sel G
Pembahasan: Salah, sel G menyekresi gastrin.
Jawaban: B`;

  /* ───────── penyimpanan ───────── */
  const index = () => { const v = rd(K_IDX, []); return Array.isArray(v) ? v : []; };
  const meta = id => index().find(m => m.id === id) || null;
  function inflate(q) {
    const n = (q.opsi || []).length;
    return { id: q.id || uid(), soal: q.soal || '', opsi: q.opsi || [], jawabanBenar: q.jawabanBenar, pembahasan: q.pembahasan || '', catatanKlinis: q.catatanKlinis || '',
      pembahasanPilihan: Array.isArray(q.pembahasanPilihan) ? q.pembahasanPilihan : Array.from({ length: n }, () => '') };
  }
  function deflate(q) {
    const o = { id: q.id || uid(), soal: clip(q.soal), opsi: q.opsi.map(clip), jawabanBenar: q.jawabanBenar };
    if (q.pembahasan) o.pembahasan = clip(q.pembahasan);
    if (q.catatanKlinis) o.catatanKlinis = clip(q.catatanKlinis);
    if ((q.pembahasanPilihan || []).some(Boolean)) o.pembahasanPilihan = q.opsi.map((_, k) => clip(q.pembahasanPilihan[k] || ''));
    return o;
  }
  function loadDeck(m) {
    let out = [];
    for (let c = 0; c < (m.chunks || 1); c++) { const part = rd(kd(m.id, c), []); if (Array.isArray(part)) out = out.concat(part); }
    return out.map(inflate);
  }
  /* Satu key sinkron dibatasi 100 KB oleh server, jadi deck dipecah per ~80 KB. */
  function saveDeck(m, qs) {
    const chunks = []; let cur = [], size = 2;
    qs.map(deflate).forEach(q => {
      const b = bytes(JSON.stringify(q)) + 1;
      if (cur.length && size + b > MAX_CHUNK) { chunks.push(cur); cur = []; size = 2; }
      cur.push(q); size += b;
    });
    chunks.push(cur);
    for (let c = 0; c < chunks.length; c++) if (!wr(kd(m.id, c), chunks[c])) return false;
    for (let c = chunks.length; c < (m.chunks || 0); c++) localStorage.removeItem(kd(m.id, c));
    const rec = { id: m.id, name: m.name, chunks: chunks.length, n: qs.length, updated: Date.now() };
    return wr(K_IDX, [rec, ...index().filter(x => x.id !== m.id)]);
  }
  function removeDeck(m) {
    for (let c = 0; c < (m.chunks || 1); c++) localStorage.removeItem(kd(m.id, c));
    wr(K_IDX, index().filter(x => x.id !== m.id));
  }
  function addToDeck(deckId, newName, items) {
    let m = deckId && deckId !== '__new' ? meta(deckId) : null, existing = [];
    if (m) existing = loadDeck(m); else m = { id: uid(), name: (newName || 'Deck baru').trim().slice(0, 60) || 'Deck baru', chunks: 0 };
    const seen = new Set(existing.map(q => norm(q.soal)));
    let skipped = 0; const add = [];
    items.forEach(q => { const k = norm(q.soal); if (seen.has(k)) { skipped++; return; } seen.add(k); add.push(inflate(q)); });
    if (existing.length + add.length > MAX_PER_DECK) return { error: `Satu deck maksimal ${MAX_PER_DECK} soal. Buat deck baru untuk sisanya.` };
    if (!saveDeck(m, existing.concat(add))) return { error: 'Penyimpanan penuh atau gagal. Coba hapus deck lama atau unduh backup JSON.' };
    return { id: m.id, added: add.length, skipped };
  }

  /* ───────── JSON ───────── */
  function exportObj(name, qs) {
    return { format: 'clined-userbank', version: 1, name, exportedAt: new Date().toISOString(),
      keterangan: 'jawabanBenar = indeks opsi mulai dari 0 (0 = A, 1 = B, dst).',
      questions: qs.map((q, i) => ({ no: i + 1, soal: q.soal, opsi: q.opsi, jawabanBenar: q.jawabanBenar, pembahasan: q.pembahasan || '',
        pembahasanPilihan: q.opsi.map((_, k) => (q.pembahasanPilihan || [])[k] || ''), catatanKlinis: q.catatanKlinis || '' })) };
  }
  function download(filename, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  const fileSafe = s => String(s || 'bank-soal').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'bank-soal';

  /* ───────── latihan (mesin kuis utama) ───────── */
  function buildQuiz(deck, qs) {
    return qs.map((q, i) => {
      const order = shuffle(q.opsi.map((_, k) => k));
      const per = order.map(k => q.pembahasanPilihan[k] || (k === q.jawabanBenar ? (q.pembahasan || 'Sesuai dengan kunci jawaban.') : 'Bukan jawaban yang paling tepat untuk soal ini.'));
      return { id: `ub:${deck.id}:${q.id}`, bank: 'userbank', source: deck.name, no: i + 1, soal: q.soal, opsi: order.map(k => q.opsi[k]),
        jawabanBenar: order.indexOf(q.jawabanBenar), pembahasan: q.pembahasan || (q.pembahasanPilihan[q.jawabanBenar] || ''), pembahasanPilihan: per, catatanKlinis: q.catatanKlinis || '',
        incomplete: false, selectedAnswer: null, _order: order };
    });
  }
  function startPractice(deckId, count) {
    const m = meta(deckId); if (!m) return;
    const all = loadDeck(m).filter(q => q.opsi.length >= 2 && Number.isInteger(q.jawabanBenar));
    if (!all.length) return toast('Deck ini belum punya soal yang valid.', true);
    const pick = shuffle(all).slice(0, count === 'all' ? all.length : Math.min(all.length, +count || 10));
    quiz = buildQuiz(m, pick); selectedBank = 'userbank'; selectedCount = quiz.length;
    pos = 0; score = 0; streak = 0; sessionXP = 0; lastXPGain = 0; playerHP = 100; enemyHP = 100; wrongCombo = 0;
    answered = false; selectedAnswer = null; flagged = new Set(); timerDuration = 0; timerSeconds = 0; timerDeadline = 0;
    window.__ubLast = { deckId, count };
    try { clearSession(); } catch {}
    show('quiz'); renderQuestion(); startTimer();
  }
  // "Kuis Lagi" setelah latihan bank pribadi mengulang deck yang sama, bukan bank resmi.
  document.addEventListener('click', e => {
    if (!e.target.closest('#againBtn') || typeof selectedBank === 'undefined' || selectedBank !== 'userbank' || !window.__ubLast) return;
    e.preventDefault(); e.stopImmediatePropagation();
    startPractice(window.__ubLast.deckId, window.__ubLast.count);
  }, true);

  /* ───────── UI ───────── */
  const S = { view: 'home', tab: 'paste', draft: [], deckId: '', editing: null, count: '10', newName: '', target: '__new', note: '', ignored: 0 };

  function ensureShell() {
    if (!$('userBankPage')) {
      const sec = document.createElement('section');
      sec.id = 'userBankPage'; sec.className = 'view';
      sec.innerHTML = '<div class="card ub-head"><div class="topline"><button class="back" type="button" data-ub-back>‹ Beranda</button><b id="ubTitle">📚 Bank Soal Saya</b></div></div><div id="userBankBody" class="ub-body"></div>';
      const anchor = $('analytics') || document.querySelector('main .view:last-of-type');
      anchor?.parentNode ? anchor.parentNode.insertBefore(sec, anchor) : document.body.appendChild(sec);
    }
    const materials = $('openMaterialsPage');
    if (materials && !$('userBankBtn')) {
      const b = document.createElement('button');
      b.className = 'card home-materials-card home-materials-link home-quick-tile'; b.id = 'userBankBtn'; b.type = 'button';
      b.setAttribute('aria-label', 'Buka Bank Soal Saya');
      b.innerHTML = '<span class="home-materials-leading"><span class="home-materials-icon">✍️</span><span><b>Buat Soal</b></span></span>';
      materials.insertAdjacentElement('afterend', b);
    }
  }

  const setTitle = (t, back) => { $('ubTitle').textContent = t; document.querySelector('[data-ub-back]').textContent = back; };

  function qCard(q, i, scope) {
    const ok = q.valid !== false && (!q.errors || !q.errors.length);
    return `<article class="ub-q${ok ? '' : ' bad'}">
      <div class="ub-q-top"><span class="ml-pill">${i + 1}</span>${ok ? '<span class="ub-ok">✓ Siap</span>' : `<span class="ub-err">⚠ ${esc(q.errors.join(' • '))}</span>`}${ok && q.warnings?.length ? `<span class="ub-warn">${esc(q.warnings.join(' • '))}</span>` : ''}</div>
      <div class="ub-q-text">${esc(q.soal || '(kosong)')}</div>
      <ol class="ub-opts">${q.opsi.map((o, k) => `<li class="${k === q.jawabanBenar ? 'key' : ''}"><b>${L5[k]}.</b> ${esc(o)}${k === q.jawabanBenar ? ' <em>kunci</em>' : ''}${(q.pembahasanPilihan || [])[k] ? `<small class="ub-po">${esc(q.pembahasanPilihan[k])}</small>` : ''}</li>`).join('')}</ol>
      ${q.pembahasan ? `<div class="ub-expl"><b>Pembahasan:</b> ${esc(q.pembahasan)}</div>` : ''}
      <div class="ub-q-actions"><button type="button" class="secondary" data-ub-edit="${scope}:${i}">✏️ Edit</button><button type="button" class="secondary ub-danger" data-ub-del="${scope}:${i}">🗑 Hapus</button></div>
    </article>`;
  }

  function editorHTML(q, scope, i) {
    const o = q.opsi.slice(); while (o.length < 5) o.push('');
    const per = q.pembahasanPilihan || [];
    const extraOpen = per.some(Boolean) || (q.catatanKlinis || '').trim();
    return `<div class="ub-editor" data-ub-editor="${scope}:${i}">
      <label class="ub-lab" for="ubF-soal">1 · Soal</label><textarea id="ubF-soal" data-ub-f="soal" rows="4" placeholder="Tulis soal…">${esc(q.soal)}</textarea>
      <div class="ub-lab ub-lab-row">2 · Pilihan jawaban <small>Ketuk huruf untuk menandai kunci</small></div>
      ${o.map((t, k) => `<div class="ub-opt-row"><label class="ub-opt-key" aria-label="Jadikan ${L5[k]} sebagai kunci"><input type="radio" name="ubkey" value="${k}" ${q.jawabanBenar === k ? 'checked' : ''}><span class="ub-letter">${L5[k]}</span></label><input type="text" data-ub-o="${k}" value="${esc(t)}" placeholder="Opsi ${L5[k]}${k > 3 ? ' (boleh kosong)' : ''}" aria-label="Opsi ${L5[k]}"></div>`).join('')}
      <label class="ub-lab" for="ubF-pemb">3 · Pembahasan</label><textarea id="ubF-pemb" data-ub-f="pembahasan" rows="3" placeholder="Kenapa jawabannya itu? (disarankan)">${esc(q.pembahasan)}</textarea>
      <details class="ub-more"${extraOpen ? ' open' : ''}><summary>Tambahan (opsional): catatan klinis &amp; pembahasan per opsi</summary>
        <label class="ub-lab" for="ubF-cat">Catatan klinis</label><textarea id="ubF-cat" data-ub-f="catatanKlinis" rows="2">${esc(q.catatanKlinis)}</textarea>
        <div class="ub-lab">Pembahasan per opsi</div>
        ${o.map((t, k) => `<div class="ub-opt-row"><span class="ub-letter">${L5[k]}</span><input type="text" data-ub-p="${k}" value="${esc(per[k] || '')}" placeholder="Kenapa opsi ${L5[k]} benar/salah" aria-label="Pembahasan opsi ${L5[k]}"></div>`).join('')}
      </details>
      <div class="ub-q-actions ub-editor-actions"><button type="button" class="secondary" data-ub-cancel>Batal</button><button type="button" class="primary" data-ub-save-edit="${scope}:${i}">${scope === 'new' ? 'Tambahkan ke daftar' : 'Simpan perubahan'}</button></div>
    </div>`;
  }
  function readEditor(root) {
    const g = f => root.querySelector(`[data-ub-f="${f}"]`).value.trim();
    let opsi = [...root.querySelectorAll('[data-ub-o]')].map(x => x.value.trim());
    const per = [...root.querySelectorAll('[data-ub-p]')].map(x => x.value.trim());
    while (opsi.length && !opsi[opsi.length - 1]) { opsi.pop(); per.pop(); }
    const kr = root.querySelector('input[name="ubkey"]:checked');
    return P.finalize({ soal: g('soal'), opsi, jawabanBenar: kr ? +kr.value : null, pembahasan: g('pembahasan'), catatanKlinis: g('catatanKlinis'), pembahasanPilihan: opsi.map((_, k) => per[k] || '') });
  }

  /* — beranda — */
  function renderHome() {
    setTitle('📚 Bank Soal Saya', '‹ Beranda');
    const decks = index();
    $('userBankBody').innerHTML = `
      <div class="ub-hero"><span class="ub-hero-ico">📚</span><div><b>Buat soalmu sendiri</b><small>Tempel teks soal atau isi manual, lalu latihan.</small></div></div>
      <div class="ub-actions ub-actions-main"><button type="button" class="primary" data-ub-new>➕ Tambah soal</button><button type="button" class="secondary" data-ub-import>⬆️ Impor JSON</button></div>
      <input type="file" id="ubImportFile" accept="application/json,.json" hidden>
      ${decks.length ? `<div class="ub-decks">${decks.map(d => `<div class="ub-deck"><div class="ub-deck-main"><b>${esc(d.name)}</b><small>${d.n} soal • ${new Date(d.updated).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</small></div>
          <div class="ub-deck-btns"><button type="button" class="primary small-btn" data-ub-practice="${esc(d.id)}" ${d.n ? '' : 'disabled'}>Latihan</button><button type="button" class="secondary small-btn" data-ub-open="${esc(d.id)}">Kelola</button></div></div>`).join('')}</div>`
        : '<div class="ub-empty"><span>🗂️</span><b>Belum ada deck</b><small>Ketuk “Tambah soal” untuk membuat deck pertamamu.</small></div>'}
      <p class="ub-note">Soal pribadi tersimpan di akunmu dan tidak ikut ke papan peringkat (tidak memberi XP) maupun statistik soal resmi.</p>`;
  }

  /* — tambah soal — */
  function renderAdd() {
    setTitle('➕ Tambah Soal', S.deckId ? '‹ Deck' : '‹ Bank Soal Saya');
    const decks = index(), valid = S.draft.filter(q => q.valid).length, invalid = S.draft.length - valid;
    const tabs = `<div class="ml-chips"><button type="button" class="ml-chip${S.tab === 'paste' ? ' on' : ''}" data-ub-tab="paste">📋 Tempel teks</button><button type="button" class="ml-chip${S.tab === 'manual' ? ' on' : ''}" data-ub-tab="manual">✍️ Isi manual</button></div>`;
    const paste = S.tab === 'paste' ? `
      <textarea id="ubPaste" class="ub-paste" rows="9" placeholder="Tempel soal di sini…&#10;&#10;1. Teks soal?&#10;A. opsi&#10;B. opsi&#10;C. opsi&#10;D. opsi&#10;Jawaban: B&#10;Pembahasan: …">${esc(rd(K_PASTE, ''))}</textarea>
      <div class="ub-actions"><button type="button" class="primary" data-ub-parse>🔍 Baca teks</button><button type="button" class="secondary small-btn" data-ub-clear>Kosongkan</button></div>
      <details class="ub-more"><summary>Contoh format yang dikenali</summary>
        <pre class="ub-example">${esc(EXAMPLE)}</pre>
        <ul class="ub-tips"><li>Nomor soal, opsi <b>A.</b> / <b>A)</b>, dan baris <b>Jawaban:</b> / <b>Kunci:</b> dikenali otomatis.</li><li>Kunci juga boleh berupa daftar di akhir: <code>Kunci: 1.B 2.C 3.A</code>.</li><li>Opsi bisa ditandai <code>*</code> di depan atau <code>(benar)</code> di belakang.</li><li>Pembahasan per opsi boleh ditulis dengan tiga cara: baris <b>A. Benar, karena …</b> di bawah <code>Pembahasan:</code> (soal 1 di contoh), baris <code>Pembahasan:</code> tepat di bawah tiap opsi (soal 2), atau <code>Pembahasan A: …</code>.</li></ul>
        <button type="button" class="secondary small-btn" data-ub-example>Pakai contoh ini</button></details>` : (S.editing?.scope === 'new' ? '' : '<div class="ub-actions"><button type="button" class="secondary" data-ub-edit="new:0">➕ Mulai isi satu soal</button></div>');
    const editorNew = S.tab === 'manual' && S.editing?.scope === 'new' ? editorHTML(P.finalize({ soal: '', opsi: ['', '', '', ''], jawabanBenar: null, pembahasan: '', catatanKlinis: '', pembahasanPilihan: [] }), 'new', 0) : '';
    const draftHTML = S.draft.length ? `
      <div class="ub-summary"><b>${S.draft.length} soal terbaca</b><span>${valid} siap disimpan${S.draft.filter(q => (q.pembahasanPilihan || []).some(Boolean)).length ? ` • ${S.draft.filter(q => (q.pembahasanPilihan || []).some(Boolean)).length} dengan pembahasan per opsi` : ''}${invalid ? ` • <em class="ub-err">${invalid} perlu diperbaiki</em>` : ''}${S.ignored ? ` • ${S.ignored} baris diabaikan` : ''}</span></div>
      ${S.draft.map((q, i) => S.editing && S.editing.scope === 'draft' && S.editing.i === i ? editorHTML(q, 'draft', i) : qCard(q, i, 'draft')).join('')}
      <div class="ub-save">
        <label class="ub-lab">Simpan ke deck</label>
        <select id="ubTarget"><option value="__new"${S.target === '__new' ? ' selected' : ''}>＋ Deck baru</option>${decks.map(d => `<option value="${esc(d.id)}"${S.target === d.id ? ' selected' : ''}>${esc(d.name)} (${d.n})</option>`).join('')}</select>
        <input type="text" id="ubNewName" maxlength="60" placeholder="Nama deck baru, mis. Blok GIT — Bab 1" value="${esc(S.newName)}" ${S.target === '__new' ? '' : 'hidden'}>
        <div class="ub-actions"><button type="button" class="primary" data-ub-commit ${valid ? '' : 'disabled'}>💾 Simpan ${valid} soal</button><button type="button" class="secondary" data-ub-dl-draft ${valid ? '' : 'disabled'}>⬇️ Unduh JSON</button></div>
        ${invalid ? '<p class="ub-note">Soal yang belum valid tidak ikut disimpan atau diunduh. Ketuk Edit untuk memperbaikinya.</p>' : ''}
      </div>` : '';
    $('userBankBody').innerHTML = `${S.note ? `<div class="ub-info">${esc(S.note)}</div>` : ''}${tabs}${paste}${editorNew}${draftHTML}`;
  }

  /* — kelola deck — */
  function renderDeck() {
    const m = meta(S.deckId); if (!m) { S.view = 'home'; return render(); }
    const qs = loadDeck(m);
    setTitle('📚 ' + m.name, '‹ Bank Soal Saya');
    $('userBankBody').innerHTML = `
      <div class="ub-hero ub-hero-deck"><div><b>${esc(m.name)}</b><small>${qs.length} soal</small></div></div>
      <div class="ub-practice"><label class="ub-lab">Jumlah soal per latihan</label>
        <div class="ml-chips">${['10', '20', '40', 'all'].map(c => `<button type="button" class="ml-chip${S.count === c ? ' on' : ''}" data-ub-count="${c}">${c === 'all' ? 'Semua' : c}</button>`).join('')}</div>
        <button type="button" class="primary" data-ub-practice="${esc(m.id)}" ${qs.length ? '' : 'disabled'}>Mulai latihan</button></div>
      <div class="ub-actions"><button type="button" class="secondary" data-ub-add-to="${esc(m.id)}">➕ Tambah soal</button><button type="button" class="secondary" data-ub-dl-deck>⬇️ Unduh JSON</button></div>
      <div class="ub-actions"><button type="button" class="secondary small-btn" data-ub-rename>✏️ Ganti nama</button><button type="button" class="secondary small-btn ub-danger" data-ub-del-deck>🗑 Hapus deck</button></div>
      ${qs.length ? qs.map((q, i) => { const f = P.finalize({ ...q }); return S.editing && S.editing.scope === 'deck' && S.editing.i === i ? editorHTML(q, 'deck', i) : qCard(f, i, 'deck'); }).join('') : '<div class="ub-empty"><span>📝</span><b>Deck masih kosong</b></div>'}`;
  }

  function render() {
    ensureShell();
    if (S.view === 'add') renderAdd(); else if (S.view === 'deck') renderDeck(); else renderHome();
  }
  const go = (view, extra) => { Object.assign(S, { view, editing: null, note: '' }, extra || {}); render(); window.scrollTo({ top: 0, behavior: 'auto' }); };

  /* ───────── event ───────── */
  document.addEventListener('click', async e => {
    const t = e.target.closest('#userBankBtn,[data-ub-back],[data-ub-new],[data-ub-import],[data-ub-practice],[data-ub-open],[data-ub-tab],[data-ub-parse],[data-ub-clear],[data-ub-example],[data-ub-edit],[data-ub-del],[data-ub-save-edit],[data-ub-cancel],[data-ub-commit],[data-ub-dl-draft],[data-ub-dl-deck],[data-ub-count],[data-ub-add-to],[data-ub-rename],[data-ub-del-deck]');
    if (!t) return;
    const [scope, si] = (t.dataset.ubEdit || t.dataset.ubDel || t.dataset.ubSaveEdit || '').split(':'); const i = +si;
    if (t.id === 'userBankBtn') { S.draft = []; S.deckId = ''; go('home'); return show('userBankPage'); }
    if (t.matches('[data-ub-back]')) {
      if (S.view === 'add') return go(S.deckId ? 'deck' : 'home');
      if (S.view === 'deck') return go('home');
      return show('home');
    }
    if (t.matches('[data-ub-new]')) { S.deckId = ''; S.target = '__new'; return go('add', { tab: 'paste' }); }
    if (t.matches('[data-ub-import]')) return $('ubImportFile').click();
    if (t.dataset.ubPractice) return startPractice(t.dataset.ubPractice, S.count);
    if (t.dataset.ubOpen) return go('deck', { deckId: t.dataset.ubOpen });
    if (t.dataset.ubTab) { S.tab = t.dataset.ubTab; S.editing = null; return render(); }
    if (t.matches('[data-ub-example]')) { try { localStorage.setItem(K_PASTE, JSON.stringify(EXAMPLE)); } catch {} return render(); }
    if (t.matches('[data-ub-clear]')) { try { localStorage.removeItem(K_PASTE); } catch {} S.draft = []; S.ignored = 0; return render(); }
    if (t.matches('[data-ub-parse]')) {
      const txt = $('ubPaste').value; wr(K_PASTE, txt);
      if (!txt.trim()) return toast('Tempel teks soal dulu ya.', true);
      const r = P.parseQuestions(txt);
      if (!r.items.length) return toast('Tidak ada soal yang terbaca. Cek contoh format di bawah kolom.', true);
      S.draft = S.draft.concat(r.items); S.ignored = r.ignored; S.note = `${r.items.length} soal ditambahkan ke daftar di bawah. Periksa lalu simpan.`;
      render(); return $('userBankBody').querySelector('.ub-summary')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (t.dataset.ubEdit) { S.editing = { scope, i }; render(); return; }
    if (t.matches('[data-ub-cancel]')) { S.editing = null; return render(); }
    if (t.dataset.ubSaveEdit) {
      const q = readEditor(t.closest('[data-ub-editor]'));
      if (!q.valid) { toast(q.errors.join(' • '), true); return; }
      if (scope === 'new') { S.draft.push(q); S.editing = { scope: 'new', i: 0 }; toast('Soal ditambahkan ke daftar'); }
      else if (scope === 'draft') { S.draft[i] = q; S.editing = null; }
      else if (scope === 'deck') { const m = meta(S.deckId), qs = loadDeck(m); q.id = qs[i].id; qs[i] = q; if (!saveDeck(m, qs)) toast('Gagal menyimpan perubahan.', true); S.editing = null; }
      return render();
    }
    if (t.dataset.ubDel) {
      if (scope === 'draft') { S.draft.splice(i, 1); S.editing = null; return render(); }
      if (scope === 'deck' && await clinedConfirm({ title: 'Hapus soal ini?', lines: ['Soal akan dihapus dari deck.'], ok: 'Hapus', tone: 'danger' })) { const m = meta(S.deckId), qs = loadDeck(m); qs.splice(i, 1); saveDeck(m, qs); S.editing = null; return render(); }
      return;
    }
    if (t.matches('[data-ub-commit]')) {
      const items = S.draft.filter(q => q.valid), target = $('ubTarget').value;
      const name = ($('ubNewName')?.value || '').trim();
      if (target === '__new' && !name) { toast('Beri nama deck dulu.', true); return $('ubNewName')?.focus(); }
      const r = addToDeck(target, name, items);
      if (r.error) return toast(r.error, true);
      toast(`${r.added} soal disimpan${r.skipped ? `, ${r.skipped} dilewati karena sudah ada` : ''} ✅`);
      S.draft = []; S.ignored = 0; try { localStorage.removeItem(K_PASTE); } catch {}
      return go('deck', { deckId: r.id });
    }
    if (t.matches('[data-ub-dl-draft]')) { const nm = ($('ubNewName')?.value || '').trim() || meta($('ubTarget')?.value)?.name || 'Bank Soal Saya'; download(`${fileSafe(nm)}.json`, exportObj(nm, S.draft.filter(q => q.valid))); return toast('JSON diunduh ✅'); }
    if (t.matches('[data-ub-dl-deck]')) { const m = meta(S.deckId); download(`${fileSafe(m.name)}.json`, exportObj(m.name, loadDeck(m))); return toast('JSON diunduh ✅'); }
    if (t.dataset.ubCount) { S.count = t.dataset.ubCount; return render(); }
    if (t.dataset.ubAddTo) { S.target = t.dataset.ubAddTo; S.draft = []; return go('add', { tab: 'paste', deckId: t.dataset.ubAddTo }); }
    if (t.matches('[data-ub-rename]')) {
      const m = meta(S.deckId), n = (prompt('Nama deck baru:', m.name) || '').trim().slice(0, 60); if (!n) return;
      saveDeck({ ...m, name: n }, loadDeck(m)); return render();
    }
    if (t.matches('[data-ub-del-deck]')) {
      const m = meta(S.deckId);
      if (await clinedConfirm({ title: 'Hapus deck ini?', lines: [`Deck **${m.name}** beserta ${m.n} soal akan dihapus dan tidak bisa dikembalikan.`, 'Unduh JSON dulu kalau perlu.'], ok: 'Hapus deck', tone: 'danger' })) { removeDeck(m); go('home'); }
    }
  });
  document.addEventListener('change', async e => {
    if (e.target.id === 'ubTarget') { S.target = e.target.value; const nn = $('ubNewName'); if (nn) nn.hidden = S.target !== '__new'; }
    if (e.target.id === 'ubImportFile') {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      try {
        if (f.size > 4 * 1024 * 1024) throw Error('File terlalu besar (maks 4 MB).');
        const raw = JSON.parse(await f.text());
        const items = P.normalizeImported(raw);
        if (!items.length) throw Error('Tidak ada soal di file ini.');
        S.draft = items; S.ignored = 0; S.deckId = ''; S.target = '__new'; S.newName = String(raw?.name || f.name.replace(/\.json$/i, '')).slice(0, 60);
        go('add', { tab: 'paste', note: `${items.length} soal dibaca dari ${f.name}. Periksa lalu simpan.` });
      } catch (err) { toast(err.message || 'File JSON tidak valid.', true); }
    }
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'ubPaste') { try { localStorage.setItem(K_PASTE, JSON.stringify(e.target.value)); } catch {} }
    if (e.target.id === 'ubNewName') S.newName = e.target.value;
  });

  window.addEventListener('clined:view-change', () => ensureShell());
  const init = () => ensureShell();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.CLINED_USERBANK = { startPractice, _index: index, _loadDeck: loadDeck, _addToDeck: addToDeck, _exportObj: exportObj };
})();
