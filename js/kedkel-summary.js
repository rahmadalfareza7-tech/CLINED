/* CLINED — Pembaca Interaktif Ringkasan Full Blok KEDKEL (31 Materi) */
(() => {
  'use strict';

  const DONE_KEY = 'clined_kedkel_summary_done_v1';
  const STAR_KEY = 'clined_kedkel_summary_star_v1';
  const FONT_KEY = 'clined_kedkel_summary_font_v1';

  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const readSet = key => {
    try {
      const v = JSON.parse(localStorage.getItem(key) || '[]');
      return new Set(Array.isArray(v) ? v.map(Number).filter(Boolean) : []);
    } catch { return new Set(); }
  };
  const writeSet = (key, set) => {
    try { localStorage.setItem(key, JSON.stringify([...set])); } catch {}
  };

  function fmtInline(text, query) {
    let html = esc(text)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
    const q = String(query || '').trim();
    if (q.length >= 2) {
      const safeQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      html = html.replace(new RegExp(`(${safeQ})(?![^<]*>)`, 'gi'), '<mark class="ks-hl">$1</mark>');
    }
    return html;
  }

  function driveInfo(no) {
    try {
      const topics = window.CLINED_KEDKEL_2026_MATERI?.topics || [];
      return topics.find(t => Number(t.no) === Number(no)) || null;
    } catch { return null; }
  }

  const S = {
    cluster: 'all',
    q: '',
    open: new Set([1]),
    readAll: false,
    font: (() => { try { return localStorage.getItem(FONT_KEY) || 'md'; } catch { return 'md'; } })(),
    done: readSet(DONE_KEY),
    star: readSet(STAR_KEY)
  };

  function ensurePage() {
    let page = $('kedkelSummaryPage');
    if (!page) {
      page = document.createElement('section');
      page.id = 'kedkelSummaryPage';
      page.className = 'view';
      const anchor = $('blokKedkelPage') || document.querySelector('main .view:last-of-type');
      if (anchor?.parentNode) anchor.parentNode.insertBefore(page, anchor.nextSibling);
      else document.body.appendChild(page);
    }
    return page;
  }

  function matchesSearch(t, q) {
    if (!q) return true;
    const hay = [
      String(t.no).padStart(2, '0'),
      t.title,
      t.dosen,
      t.tldr,
      ...(t.highYield || []),
      ...(t.sections || []).flatMap(s => [
        s.heading,
        ...(s.bullets || []),
        ...(s.table?.headers || []),
        ...(s.table?.rows || []).flat()
      ])
    ].join(' ').toLowerCase();
    return hay.includes(q);
  }

  function filteredTopics() {
    const data = window.CLINED_KEDKEL_SUMMARY_DATA;
    const list = data?.TOPICS || [];
    const q = S.q.trim().toLowerCase();
    return list.filter(t => {
      if (S.cluster === 'star' && !S.star.has(t.no)) return false;
      else if (S.cluster === 'todo' && S.done.has(t.no)) return false;
      else if (S.cluster !== 'all' && S.cluster !== 'star' && S.cluster !== 'todo' && t.cluster !== S.cluster) return false;
      return matchesSearch(t, q);
    });
  }

  function topicBodyHTML(t, idx, list) {
    const q = S.q.trim();
    const done = S.done.has(t.no);
    const star = S.star.has(t.no);
    const drv = driveInfo(t.no);
    const prev = idx > 0 ? list[idx - 1] : null;
    const next = idx < list.length - 1 ? list[idx + 1] : null;

    const secs = (t.sections || []).map(sec => {
      const bullets = sec.bullets?.length
        ? `<ul class="ks-ul">${sec.bullets.map(b => `<li>${fmtInline(b, q)}</li>`).join('')}</ul>`
        : '';
      const tbl = sec.table
        ? `<div class="ks-table-wrap"><table class="ks-table"><thead><tr>${sec.table.headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${sec.table.rows.map(r => `<tr>${r.map(c => `<td>${fmtInline(c, q)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
        : '';
      return `<div class="ks-sec"><h4>${fmtInline(sec.heading, q)}</h4>${bullets}${tbl}</div>`;
    }).join('');

    const hy = t.highYield?.length
      ? `<div class="ks-hy"><div class="ks-hy-title">🎯 Poin Ujian &amp; Jembatan Keledai</div><ul>${t.highYield.map(x => `<li>${fmtInline(x, q)}</li>`).join('')}</ul></div>`
      : '';

    const driveBtn = drv?.folderUrl
      ? `<a class="ks-act" href="${esc(drv.folderUrl)}" target="_blank" rel="noopener noreferrer">📂 Slide Drive</a>`
      : '';
    const quizBtn = window.CLINED_MATERI_LATIHAN?.open
      ? `<button type="button" class="ks-act quiz-go" data-ks-quiz="${t.no}">🎯 Latihan Soal Materi Ini</button>`
      : '';

    const navPair = !S.readAll ? `<div class="ks-nav-pair">
      <button type="button" class="ks-nav-btn" data-ks-jump="${prev ? prev.no : ''}" ${prev ? '' : 'disabled'}>‹ ${prev ? `${String(prev.no).padStart(2, '0')}. ${esc(prev.title.slice(0, 22))}${prev.title.length > 22 ? '…' : ''}` : 'Awal'}</button>
      <button type="button" class="ks-nav-btn" data-ks-jump="${next ? next.no : ''}" ${next ? '' : 'disabled'}>${next ? `${String(next.no).padStart(2, '0')}. ${esc(next.title.slice(0, 22))}${next.title.length > 22 ? '…' : ''}` : 'Selesai'} ›</button>
    </div>` : '';

    return `<div class="ks-body">
      <div class="ks-tldr-box"><small>⚡ Inti Cepat (TL;DR)</small>${fmtInline(t.tldr, q)}</div>
      ${secs}
      ${hy}
      <div class="ks-actions">
        <button type="button" class="ks-act${done ? ' done-on' : ''}" data-ks-done="${t.no}">${done ? '✅ Sudah Dipelajari' : '☐ Tandai Dipelajari'}</button>
        <button type="button" class="ks-act${star ? ' star-on' : ''}" data-ks-star="${t.no}">${star ? '⭐ Ditandai' : '☆ Tandai Penting'}</button>
        ${driveBtn}
        ${quizBtn}
      </div>
      ${navPair}
    </div>`;
  }

  function render() {
    const page = ensurePage();
    const data = window.CLINED_KEDKEL_SUMMARY_DATA;
    if (!data) {
      page.innerHTML = '<div class="card"><p>Memuat ringkasan BLOK KEDKEL…</p></div>';
      return;
    }
    const all = data.TOPICS || [];
    const list = filteredTopics();
    const doneCount = S.done.size;
    const pct = all.length ? Math.round((doneCount / all.length) * 100) : 0;
    const totalMin = all.reduce((sum, t) => sum + (Number(t.readMin) || 3), 0);
    const keepQ = document.activeElement?.matches?.('[data-ks-q]');
    const fontCls = S.font === 'lg' ? ' ks-lg' : S.font === 'sm' ? ' ks-sm' : '';

    const chips = [
      ...data.CLUSTERS,
      { id: 'todo', icon: '⏳', label: `Belum (${Math.max(0, all.length - doneCount)})` },
      { id: 'star', icon: '⭐', label: `Ditandai (${S.star.size})` }
    ];

    const cards = list.map((t, idx) => {
      const isOpen = S.readAll || S.open.has(t.no) || (S.q.trim().length >= 2 && list.length <= 5);
      const isDone = S.done.has(t.no);
      const isStar = S.star.has(t.no);
      return `<article class="ks-card${isOpen ? ' open' : ''}${isDone ? ' done' : ''}" data-ks-card="${t.no}">
        <button type="button" class="ks-card-head" data-ks-toggle="${t.no}" aria-expanded="${isOpen}">
          <span class="ks-no">${isDone ? '✓' : String(t.no).padStart(2, '0')}</span>
          <span class="ks-card-main">
            <span class="ks-card-title">${esc(t.icon)} ${fmtInline(t.title, S.q)}</span>
            <span class="ks-card-sub">Materi ${String(t.no).padStart(2, '0')} • ${esc(t.dosen)} • ~${t.readMin} mnt baca</span>
            ${!isOpen ? `<span class="ks-card-tldr">${fmtInline(t.tldr, S.q)}</span>` : ''}
          </span>
          <span class="ks-head-right">
            ${isStar ? '<span class="ks-star-ind" title="Ditandai penting">⭐</span>' : ''}
            <span class="ks-chev" aria-hidden="true">›</span>
          </span>
        </button>
        ${isOpen ? topicBodyHTML(t, idx, list) : ''}
      </article>`;
    }).join('');

    page.innerHTML = `<div class="ks-shell${fontCls}">
      <div class="ks-hero">
        <div class="ks-hero-top">
          <button type="button" class="ks-back" data-ks-back>‹ BLOK KEDKEL</button>
          <div class="ks-tools">
            <button type="button" class="ks-tool-btn${S.font === 'sm' ? ' on' : ''}" data-ks-font="sm" title="Teks kecil">A-</button>
            <button type="button" class="ks-tool-btn${S.font === 'md' ? ' on' : ''}" data-ks-font="md" title="Teks normal">A</button>
            <button type="button" class="ks-tool-btn${S.font === 'lg' ? ' on' : ''}" data-ks-font="lg" title="Teks besar">A+</button>
          </div>
        </div>
        <div>
          <div class="ks-eyebrow">RINGKASAN FULL BLOK • KEDKEL 2026</div>
          <h2>📖 Ringkasan Lengkap 31 Materi</h2>
          <p>Disusun langsung dari seluruh PPT &amp; PDF kuliah Blok Kedokteran Keluarga — ringkas, terstruktur, lengkap dengan tabel perbandingan &amp; poin ujian.</p>
        </div>
        <div class="ks-prog-box">
          <div class="ks-prog-head">
            <span>Progres Belajar: ${doneCount} / ${all.length} materi (${pct}%)</span>
            <span>⏱ ~${totalMin} mnt</span>
          </div>
          <div class="ks-prog-track"><i style="width:${pct}%"></i></div>
        </div>
      </div>

      <div class="ks-controls">
        <input type="search" class="ks-search" data-ks-q placeholder="🔍 Cari materi, dosen, angka, atau istilah (mis. 85 dB, Duvall, PMK 411, AKG)…" value="${esc(S.q)}" autocomplete="off" aria-label="Cari ringkasan materi">
        <div class="ks-chips" role="group" aria-label="Filter klaster materi">
          ${chips.map(c => `<button type="button" class="ks-chip${S.cluster === c.id ? ' on' : ''}" data-ks-cluster="${esc(c.id)}">${c.icon} ${esc(c.label)}</button>`).join('')}
        </div>
        <div class="ks-meta-row">
          <span>Menampilkan ${list.length} dari ${all.length} materi</span>
          <div class="ks-mode-pills">
            <button type="button" class="ks-mini-btn${!S.readAll ? ' on' : ''}" data-ks-mode="cards">📑 Per Materi</button>
            <button type="button" class="ks-mini-btn${S.readAll ? ' on' : ''}" data-ks-mode="all">📜 Buka Semua</button>
          </div>
        </div>
      </div>

      <div class="ks-list">
        ${cards || '<div class="ks-empty"><span>🔎</span><div>Tidak ada materi yang cocok dengan filter ini.</div><button type="button" class="ks-mini-btn" data-ks-reset>Tampilkan Semua Materi</button></div>'}
      </div>
    </div>`;

    if (keepQ) {
      const inp = page.querySelector('[data-ks-q]');
      if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
    }
  }

  function open(topicNo) {
    ensurePage();
    if (topicNo) {
      S.cluster = 'all';
      S.q = '';
      S.readAll = false;
      S.open = new Set([Number(topicNo)]);
    }
    render();
    if (typeof window.show === 'function') window.show('kedkelSummaryPage');
    window.scrollTo(0, 0);
  }

  document.addEventListener('click', e => {
    const t = e.target.closest?.('button');
    if (!t) return;
    if (t.id === 'openRingkasanKedkel') return open();
    const page = $('kedkelSummaryPage');
    if (!page || !page.contains(t)) return;

    if (t.hasAttribute('data-ks-back')) {
      window.show?.($('blokKedkelPage') ? 'blokKedkelPage' : 'home');
      return;
    }
    if (t.dataset.ksFont) {
      S.font = t.dataset.ksFont;
      try { localStorage.setItem(FONT_KEY, S.font); } catch {}
      return render();
    }
    if (t.dataset.ksCluster) {
      S.cluster = t.dataset.ksCluster;
      return render();
    }
    if (t.dataset.ksMode) {
      S.readAll = t.dataset.ksMode === 'all';
      return render();
    }
    if (t.hasAttribute('data-ks-reset')) {
      S.cluster = 'all'; S.q = '';
      return render();
    }
    if (t.dataset.ksToggle) {
      const no = Number(t.dataset.ksToggle);
      if (S.readAll) { S.readAll = false; S.open = new Set([no]); }
      else if (S.open.has(no)) S.open.delete(no);
      else S.open.add(no);
      return render();
    }
    if (t.dataset.ksJump) {
      const no = Number(t.dataset.ksJump);
      if (!no) return;
      S.open = new Set([no]);
      render();
      const card = page.querySelector(`[data-ks-card="${no}"]`);
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (t.dataset.ksDone) {
      const no = Number(t.dataset.ksDone);
      if (S.done.has(no)) S.done.delete(no); else S.done.add(no);
      writeSet(DONE_KEY, S.done);
      return render();
    }
    if (t.dataset.ksStar) {
      const no = Number(t.dataset.ksStar);
      if (S.star.has(no)) S.star.delete(no); else S.star.add(no);
      writeSet(STAR_KEY, S.star);
      return render();
    }
    if (t.dataset.ksQuiz) {
      const no = Number(t.dataset.ksQuiz);
      window.CLINED_MATERI_LATIHAN?.open?.('KEDKEL', 'KEDKEL', 'blokKedkelPage', no);
    }
  });

  document.addEventListener('input', e => {
    if (e.target.matches?.('#kedkelSummaryPage [data-ks-q]')) {
      S.q = e.target.value;
      render();
    }
  });

  window.CLINED_KEDKEL_SUMMARY = { open, render };
})();
