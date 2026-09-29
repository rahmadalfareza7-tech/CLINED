/* LATIHAN MATERI: tombol di tiap blok UAB -> daftar materi -> latihan soal (feedback langsung + pembahasan). */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = v => {
    const k = String(v || '').trim().toUpperCase().replace(/^BLOK\s+/, '').replace(/_/g, ' ');
    return ({ ENDOKRIN: 'ENDOKRINE', PANCAINDRA: 'PANCA INDRA', 'KEDOKTERAN KOMUNITAS': 'KEDKOM', 'KEDOKTERAN KELUARGA': 'KEDKEL', GASTROINTESTINAL: 'GIT', MUSKULO: 'MUSKULOSKELETAL' })[k] || k;
  };
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const stripLetter = t => String(t ?? '').replace(/^\s*[A-Ea-e][.)]\s+/, '');
  const S = { block: '', label: '', pageId: '', packs: [], run: null };

  async function fetchPacks() {
    const r = await fetch('/api/content/packages?module=MAT', { credentials: 'same-origin', cache: 'no-store' });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Error(d.error || 'Gagal memuat latihan materi.');
    return d.packages || [];
  }
  const body = () => $('materiLatihanBody');
  const setHead = (eyebrow, title) => { $('materiLatihanEyebrow').textContent = eyebrow; $('materiLatihanTitle').textContent = title; };

  async function openList(block, label, pageId) {
    if (block) { S.block = block; S.label = label; S.pageId = pageId; }
    S.run = null;
    setHead('UAB • BLOK ' + S.label, 'Latihan Materi');
    if (window.show) window.show('materiLatihanPage');
    body().innerHTML = '<p class="ml-muted">Memuat…</p>';
    try {
      S.packs = (await fetchPacks()).filter(p => norm(p.block) === S.block);
      body().innerHTML = S.packs.length
        ? S.packs.map((p, i) => `<button type="button" class="ml-item" data-ml-start="${i}"><span><b>${esc(p.title)}</b><small>${(p.questions || []).length} soal</small></span><i>Mulai →</i></button>`).join('')
        : '<div class="ml-empty"><b>Belum ada latihan materi</b><small>Latihan untuk blok ini belum ditambahkan.</small></div>';
    } catch (err) { body().innerHTML = `<div class="ml-empty"><b>${esc(err.message)}</b></div>`; }
  }

  function startRun(i) {
    const p = S.packs[i]; if (!p) return;
    const qs = shuffle((p.questions || []).filter(q => q && Array.isArray(q.opsi) && q.opsi.length >= 2)).map(q => {
      const order = shuffle(q.opsi.map((_, k) => k));
      return { soal: q.soal, opsi: order.map(k => stripLetter(q.opsi[k])), orig: order, benar: order.indexOf(q.jawabanBenar), pembahasan: q.pembahasan || '', per: Array.isArray(q.pembahasanPilihan) ? q.pembahasanPilihan : [] };
    });
    if (!qs.length) { body().innerHTML = '<div class="ml-empty"><b>Paket ini tidak berisi soal yang valid.</b></div>'; return; }
    S.run = { idx: i, title: p.title, qs, pos: 0, score: 0, picked: null };
    renderQ();
  }

  function renderQ() {
    const R = S.run, q = R.qs[R.pos], L = 'ABCDE', done = R.picked !== null;
    setHead('LATIHAN • ' + S.label, R.title);
    const explain = done ? [R.picked === q.benar ? '✅ Benar!' : '❌ Kurang tepat.', q.per[q.orig[R.picked]] && R.picked !== q.benar ? `<p><b>Pilihanmu:</b> ${esc(q.per[q.orig[R.picked]])}</p>` : '', (q.pembahasan || q.per[q.orig[q.benar]]) ? `<p><b>Pembahasan:</b> ${esc(q.pembahasan || q.per[q.orig[q.benar]])}</p>` : ''].join('') : '';
    body().innerHTML = `<div class="ml-progress"><i style="width:${Math.round(R.pos / R.qs.length * 100)}%"></i></div>
      <div class="ml-count">Soal ${R.pos + 1} dari ${R.qs.length} • ${R.score} benar</div>
      <div class="ml-question">${esc(q.soal)}</div>
      <div class="ml-options">${q.opsi.map((o, k) => `<button type="button" class="ml-opt${done ? (k === q.benar ? ' ok' : k === R.picked ? ' bad' : '') : ''}" data-ml-pick="${k}" ${done ? 'disabled' : ''}><b>${L[k]}</b><span>${esc(o)}</span></button>`).join('')}</div>
      ${done ? `<div class="ml-explain">${explain}</div><button type="button" class="ml-next" data-ml-next>${R.pos + 1 < R.qs.length ? 'Lanjut →' : 'Lihat hasil'}</button>` : ''}`;
  }

  function renderResult() {
    const R = S.run, pct = Math.round(R.score / R.qs.length * 100);
    setHead('HASIL • ' + S.label, R.title);
    body().innerHTML = `<div class="ml-result"><div class="ml-score">${pct}%</div><b>${R.score} dari ${R.qs.length} soal benar</b><small>${pct >= 80 ? 'Mantap, materi ini sudah kuat! 🎉' : pct >= 60 ? 'Lumayan, ulangi bagian yang masih salah.' : 'Yuk pelajari materinya lagi, lalu coba ulang.'}</small></div>
      <button type="button" class="ml-next" data-ml-again>Ulangi latihan</button>
      <button type="button" class="ml-next ml-alt" data-ml-list>Latihan materi lain</button>`;
  }

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-ml-start],[data-ml-pick],[data-ml-next],[data-ml-again],[data-ml-list],#backFromMateriLatihan,[data-latihan-open]');
    if (!t) return;
    if (t.matches('[data-latihan-open]')) { const sec = t.closest('[data-block-key]'); return openList(norm(sec.dataset.blockKey), (sec.querySelector('h2')?.textContent || sec.dataset.blockKey).replace(/^BLOK\s+/i, ''), sec.id); }
    if (t.dataset.mlStart != null) return startRun(+t.dataset.mlStart);
    if (t.dataset.mlPick != null && S.run && S.run.picked === null) { S.run.picked = +t.dataset.mlPick; if (S.run.picked === S.run.qs[S.run.pos].benar) S.run.score++; return renderQ(); }
    if (t.matches('[data-ml-next]')) { const R = S.run; R.pos++; R.picked = null; return R.pos < R.qs.length ? renderQ() : renderResult(); }
    if (t.matches('[data-ml-again]')) return startRun(S.run.idx);
    if (t.matches('[data-ml-list]')) return openList();
    if (t.id === 'backFromMateriLatihan') { if (S.run) return openList(); if (window.show) window.show(S.pageId || 'uabPage'); }
  });

  function ensureButtons() {
    document.querySelectorAll('section.view[data-block-key]').forEach(sec => {
      if (sec.querySelector('[data-latihan-open]')) return;
      const wrap = document.createElement('div'); wrap.className = 'materi-section latihan-materi-section';
      wrap.innerHTML = '<button type="button" class="materi-button latihan-materi-button" data-latihan-open="1" aria-label="Buka LATIHAN MATERI">LATIHAN MATERI</button>';
      const anchor = sec.querySelector('.materi-section') || sec.querySelector('.exam-page-header');
      if (anchor) anchor.insertAdjacentElement('afterend', wrap); else sec.prepend(wrap);
    });
  }
  ensureButtons();
  window.addEventListener('clined:view-change', ensureButtons);
  window.CLINED_LATIHAN_MATERI = { open: openList };
})();
