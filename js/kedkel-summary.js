/* CLINED — Pembaca Editorial 3D Ramah Mata: Ringkasan Full Blok KEDKEL (34 Materi • Jadwal TA 2026–2027) */
(() => {
  'use strict';

  const DONE_KEY = 'clined_kedkel_summary_done_v2';
  const STAR_KEY = 'clined_kedkel_summary_star_v2';
  const LEGACY_DONE_KEY = 'clined_kedkel_summary_done_v1';
  const LEGACY_STAR_KEY = 'clined_kedkel_summary_star_v1';
  const FONT_KEY = 'clined_kedkel_summary_font_v1';
  const THEME_KEY = 'clined_kedkel_summary_theme_v1';

  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const readIdSet = (key, legacyKey) => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        const v = JSON.parse(raw);
        return new Set(Array.isArray(v) ? v.map(String).filter(Boolean) : []);
      }
      if (legacyKey) {
        const leg = JSON.parse(localStorage.getItem(legacyKey) || '[]');
        if (Array.isArray(leg) && leg.length) {
          const migrated = new Set(leg.map(n => 'd' + String(Number(n)).padStart(2, '0')).filter(x => x !== 'dNaN'));
          localStorage.setItem(key, JSON.stringify([...migrated]));
          return migrated;
        }
      }
    } catch {}
    return new Set();
  };
  const writeIdSet = (key, set) => {
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

  function driveInfo(driveNo) {
    if (!driveNo) return null;
    try {
      const topics = window.CLINED_KEDKEL_2026_MATERI?.TOPICS || window.CLINED_KEDKEL_2026_MATERI?.topics || [];
      return topics.find(t => Number(t.no) === Number(driveNo)) || null;
    } catch { return null; }
  }

  function defaultTheme() {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'paper' || saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return document.documentElement.classList.contains('dark') ? 'dark' : 'paper';
  }

  const S = {
    viewBy: 'week', // 'week' | 'cluster'
    theme: defaultTheme(), // 'paper' | 'light' | 'dark'
    showAgenda: false,
    filter: 'all', // 'all' | 'w1'..'w5' | clusterId | 'todo' | 'star'
    q: '',
    open: new Set(['d06']),
    font: (() => { try { return localStorage.getItem(FONT_KEY) || 'md'; } catch { return 'md'; } })(),
    done: readIdSet(DONE_KEY, LEGACY_DONE_KEY),
    star: readIdSet(STAR_KEY, LEGACY_STAR_KEY)
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
      'minggu ' + t.week,
      'm' + t.week,
      t.schedule,
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
      if (S.filter === 'star' && !S.star.has(t.id)) return false;
      else if (S.filter === 'todo' && S.done.has(t.id)) return false;
      else if (S.filter.startsWith('w')) {
        const w = Number(S.filter.slice(1));
        if (Number(t.week) !== w) return false;
      } else if (S.filter !== 'all' && S.filter !== 'star' && S.filter !== 'todo') {
        if (t.cluster !== S.filter) return false;
      }
      return matchesSearch(t, q);
    });
  }

  function formatBulletItem(b, q) {
    const m = String(b).match(/^\*\*([^*]+)\*\*:\s*(.+)$/);
    if (m) {
      return `<li><span class="ks-li-key">${fmtInline(m[1], q)}</span><span class="ks-li-sep"> — </span><span class="ks-li-val">${fmtInline(m[2], q)}</span></li>`;
    }
    return `<li><span class="ks-li-val">${fmtInline(b, q)}</span></li>`;
  }

  function topicBodyHTML(t, idx, list) {
    const q = S.q.trim();
    const done = S.done.has(t.id);
    const star = S.star.has(t.id);
    const drv = driveInfo(t.driveNo);
    const prev = idx > 0 ? list[idx - 1] : null;
    const next = idx < list.length - 1 ? list[idx + 1] : null;

    const secs = (t.sections || []).map((sec, sIdx) => {
      const bullets = sec.bullets?.length
        ? `<ul class="ks-ul">${sec.bullets.map(b => formatBulletItem(b, q)).join('')}</ul>`
        : '';
      const tbl = sec.table
        ? `<div class="ks-table-wrap"><table class="ks-table"><thead><tr>${sec.table.headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${sec.table.rows.map(r => `<tr>${r.map(c => `<td>${fmtInline(c, q)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
        : '';
      return `<section class="ks-sec">
        <div class="ks-sec-head">
          <span class="ks-sec-num">${String(sIdx + 1).padStart(2, '0')}</span>
          <h4>${fmtInline(sec.heading, q)}</h4>
        </div>
        ${bullets}
        ${tbl}
      </section>`;
    }).join('');

    const hy = t.highYield?.length
      ? `<aside class="ks-hy"><div class="ks-hy-title">Poin Ujian &amp; Jembatan Keledai</div><ul>${t.highYield.map(x => `<li>${fmtInline(x, q)}</li>`).join('')}</ul></aside>`
      : '';

    const driveBtn = drv?.folderUrl
      ? `<a class="ks-act" href="${esc(drv.folderUrl)}" target="_blank" rel="noopener noreferrer">📂 Slide Drive</a>`
      : '';

    const navPair = `<div class="ks-nav-pair">
      <button type="button" class="ks-nav-btn" data-ks-jump="${prev ? esc(prev.id) : ''}" ${prev ? '' : 'disabled'}>‹ ${prev ? `${String(prev.no).padStart(2, '0')}. ${esc(prev.title.slice(0, 22))}${prev.title.length > 22 ? '…' : ''}` : 'Awal'}</button>
      <button type="button" class="ks-nav-btn" data-ks-jump="${next ? esc(next.id) : ''}" ${next ? '' : 'disabled'}>${next ? `${String(next.no).padStart(2, '0')}. ${esc(next.title.slice(0, 22))}${next.title.length > 22 ? '…' : ''}` : 'Selesai'} ›</button>
    </div>`;

    return `<div class="ks-body">
      <div class="ks-tldr-box"><small>Inti Cepat</small><p>${fmtInline(t.tldr, q)}</p></div>
      <div class="ks-sections">${secs}</div>
      ${hy}
      <div class="ks-actions">
        <button type="button" class="ks-act${done ? ' done-on' : ''}" data-ks-done="${esc(t.id)}">${done ? '✓ Sudah Dipelajari' : '○ Tandai Dipelajari'}</button>
        <button type="button" class="ks-act${star ? ' star-on' : ''}" data-ks-star="${esc(t.id)}">${star ? '★ Ditandai' : '☆ Tandai'}</button>
        ${driveBtn}
        <button type="button" class="ks-act ks-act-collapse" data-ks-close="${esc(t.id)}">▴ Perkecil Materi</button>
      </div>
      ${navPair}
    </div>`;
  }

  function renderCard(t, idx, list) {
    const isOpen = S.open.has(t.id);
    const isDone = S.done.has(t.id);
    const isStar = S.star.has(t.id);
    const extraBadge = t.isScheduleExtra ? '<span class="ks-new-pill">Jadwal 26/27</span>' : '';

    return `<article class="ks-card${isOpen ? ' open' : ''}${isDone ? ' done' : ''}" data-ks-card="${esc(t.id)}">
      <button type="button" class="ks-card-head" data-ks-toggle="${esc(t.id)}" aria-expanded="${isOpen}">
        <span class="ks-no">${isDone ? '✓' : String(t.no).padStart(2, '0')}</span>
        <span class="ks-card-main">
          <span class="ks-card-title">${fmtInline(t.title, S.q)}</span>
          <span class="ks-card-meta">
            <span class="ks-wk-tag">M${t.week}</span>
            <span>${fmtInline(t.schedule || '', S.q)}</span>
            ${extraBadge}
          </span>
          <span class="ks-card-sub">${esc(t.dosen)} · ~${t.readMin} mnt baca</span>
          ${!isOpen ? `<span class="ks-card-tldr">${fmtInline(t.tldr, S.q)}</span>` : ''}
        </span>
        <span class="ks-head-right">
          ${isStar ? '<span class="ks-star-ind" title="Ditandai penting">★</span>' : ''}
          <span class="ks-toggle-pill">${isOpen ? 'Tutup ▴' : 'Baca ▾'}</span>
        </span>
      </button>
      ${isOpen ? topicBodyHTML(t, idx, list) : ''}
    </article>`;
  }

  function renderListHTML(list, data) {
    if (!list.length) {
      return '<div class="ks-empty"><div>Tidak ada materi yang cocok dengan filter ini.</div><button type="button" class="ks-btn3d" data-ks-reset>Tampilkan Semua Materi</button></div>';
    }
    const useWeekGroups = S.viewBy === 'week' && !S.q.trim() && S.filter !== 'star' && S.filter !== 'todo';
    if (!useWeekGroups) {
      return list.map((t, idx) => renderCard(t, idx, list)).join('');
    }
    const weekMap = new Map((data.WEEKS || []).map(w => [w.id, w]));
    const html = [];
    let currentWeek = null;
    const countByWeek = new Map();
    for (const t of list) {
      countByWeek.set(t.week, (countByWeek.get(t.week) || 0) + 1);
    }
    list.forEach((t, idx) => {
      if (t.week !== currentWeek) {
        currentWeek = t.week;
        const wm = weekMap.get(t.week);
        if (wm) {
          const cnt = countByWeek.get(t.week) || 0;
          html.push(`<div class="ks-week-hdr">
            <div class="ks-week-hdr-top">
              <span class="ks-week-title">${esc(wm.label)} <span class="ks-week-dates">· ${esc(wm.dates)}</span></span>
              <span class="ks-week-cnt">${cnt} materi</span>
            </div>
            <div class="ks-week-agenda">${esc(wm.agenda)}</div>
          </div>`);
        }
      }
      html.push(renderCard(t, idx, list));
    });
    return html.join('');
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
    const doneCount = all.filter(t => S.done.has(t.id)).length;
    const starCount = all.filter(t => S.star.has(t.id)).length;
    const openInListCount = list.filter(t => S.open.has(t.id)).length;
    const allOpen = list.length > 0 && openInListCount === list.length;
    const pct = all.length ? Math.round((doneCount / all.length) * 100) : 0;
    const totalMin = all.reduce((sum, t) => sum + (Number(t.readMin) || 3), 0);
    const keepQ = document.activeElement?.matches?.('[data-ks-q]');
    const fontCls = S.font === 'lg' ? ' ks-lg' : S.font === 'sm' ? ' ks-sm' : '';

    let chips;
    if (S.viewBy === 'week') {
      const weekCounts = new Map();
      for (const t of all) {
        weekCounts.set(t.week, (weekCounts.get(t.week) || 0) + 1);
      }
      chips = [
        { id: 'all', label: `Semua (${all.length})` },
        ...(data.WEEKS || []).map(w => ({
          id: `w${w.id}`,
          label: `${w.short} (${weekCounts.get(w.id) || 0})`
        })),
        { id: 'todo', label: `Belum (${Math.max(0, all.length - doneCount)})` },
        { id: 'star', label: `Ditandai (${starCount})` }
      ];
    } else {
      chips = [
        ...(data.CLUSTERS || []).map(c => ({ id: c.id, label: c.label })),
        { id: 'todo', label: `Belum (${Math.max(0, all.length - doneCount)})` },
        { id: 'star', label: `Ditandai (${starCount})` }
      ];
    }

    const milestones = data.SCHEDULE_META?.milestones || [];
    const agendaDetailHTML = S.showAgenda ? `<div class="ks-agenda-grid">
      ${milestones.map(m => {
        const isExam = /ujian|uper/i.test(m.label);
        return `<div class="ks-agenda-item${isExam ? ' exam' : ''}">
          <div class="ks-agenda-lbl">${esc(m.label)}</div>
          <div class="ks-agenda-dt">${esc(m.date)}</div>
          <div class="ks-agenda-note">${esc(m.note || '')}</div>
        </div>`;
      }).join('')}
    </div>` : '';

    page.dataset.ksTheme = S.theme;

    page.innerHTML = `<div class="ks-shell${fontCls}" data-theme="${esc(S.theme)}">
      <header class="ks-masthead">
        <div class="ks-masthead-top">
          <button type="button" class="ks-btn3d ks-back" data-ks-back>‹ BLOK KEDKEL</button>
        </div>

        <div class="ks-title-wrap">
          <div class="ks-eyebrow">RINGKASAN FULL BLOK · KEDKEL TA 2026–2027</div>
          <h2>Ringkasan Lengkap ${all.length} Materi</h2>
          <p>Disusun urut sesuai Jadwal Blok Kedokteran Keluarga (Minggu 1–5) — lengkap dengan tabel ringkas, angka wajib, dan poin ujian.</p>
        </div>

        <div class="ks-prefs-bar">
          <div class="ks-pref-group" role="group" aria-label="Tema warna baca">
            <span class="ks-pref-lbl">Tema Baca:</span>
            <button type="button" class="ks-btn3d ks-btn-sm${S.theme === 'paper' ? ' on' : ''}" data-ks-theme="paper">Kertas</button>
            <button type="button" class="ks-btn3d ks-btn-sm${S.theme === 'light' ? ' on' : ''}" data-ks-theme="light">Terang</button>
            <button type="button" class="ks-btn3d ks-btn-sm${S.theme === 'dark' ? ' on' : ''}" data-ks-theme="dark">Malam</button>
          </div>
          <div class="ks-pref-group" role="group" aria-label="Ukuran huruf bacaan">
            <span class="ks-pref-lbl">Ukuran Teks:</span>
            <button type="button" class="ks-btn3d ks-btn-sm${S.font === 'sm' ? ' on' : ''}" data-ks-font="sm">Kecil</button>
            <button type="button" class="ks-btn3d ks-btn-sm${S.font === 'md' ? ' on' : ''}" data-ks-font="md">Normal</button>
            <button type="button" class="ks-btn3d ks-btn-sm${S.font === 'lg' ? ' on' : ''}" data-ks-font="lg">Besar</button>
          </div>
        </div>

        <div class="ks-prog-box">
          <div class="ks-prog-head">
            <span>Progres belajar <strong>${doneCount}/${all.length}</strong> (${pct}%)</span>
            <span>~${totalMin} mnt total</span>
          </div>
          <div class="ks-prog-track"><i style="width:${pct}%"></i></div>
        </div>

        <div class="ks-agenda-bar">
          <button type="button" class="ks-btn3d ks-agenda-toggle" data-ks-agenda aria-expanded="${S.showAgenda}">
            <span class="ks-agenda-summary"><strong>Jadwal Ujian:</strong> Prak. Farma 12 Nov · Pleno 20 Nov · <strong>UAB 24 Nov</strong> · UPER 26 Nov</span>
            <span class="ks-agenda-caret">${S.showAgenda ? 'Tutup ▴' : 'Detail ▾'}</span>
          </button>
          ${agendaDetailHTML}
        </div>
      </header>

      <div class="ks-controls">
        <div class="ks-search-wrap">
          <span class="ks-search-ico" aria-hidden="true">⌕</span>
          <input type="search" class="ks-search" data-ks-q placeholder="Cari materi, dosen, istilah, atau angka (mis. 85 dB, PMK 411, SnNout, Duvall, pMDI)…" value="${esc(S.q)}" autocomplete="off" aria-label="Cari ringkasan materi">
        </div>

        <div class="ks-switch-row">
          <div class="ks-btn-row" role="group" aria-label="Urutkan tampilan">
            <button type="button" class="ks-btn3d${S.viewBy === 'week' ? ' on' : ''}" data-ks-view="week">Per Minggu</button>
            <button type="button" class="ks-btn3d${S.viewBy === 'cluster' ? ' on' : ''}" data-ks-view="cluster">Per Klaster</button>
          </div>
          <div class="ks-btn-row">
            <button type="button" class="ks-btn3d ks-btn-sm${!allOpen && openInListCount === 0 ? ' on' : ''}" data-ks-expand="none">Tutup Semua</button>
            <button type="button" class="ks-btn3d ks-btn-sm${allOpen ? ' on' : ''}" data-ks-expand="all">Buka Semua</button>
          </div>
        </div>

        <div class="ks-chips" role="group" aria-label="Filter materi">
          ${chips.map(c => `<button type="button" class="ks-chip${S.filter === c.id ? ' on' : ''}" data-ks-filter="${esc(c.id)}">${esc(c.label)}</button>`).join('')}
        </div>

        <div class="ks-meta-row">
          <span>Menampilkan ${list.length} dari ${all.length} materi</span>
        </div>
      </div>

      <div class="ks-list">
        ${renderListHTML(list, data)}
      </div>
    </div>`;

    if (keepQ) {
      const inp = page.querySelector('[data-ks-q]');
      if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
    }
  }

  function resolveTopicId(topicKey) {
    const topics = window.CLINED_KEDKEL_SUMMARY_DATA?.TOPICS || [];
    if (!topicKey) return null;
    const str = String(topicKey);
    const byId = topics.find(t => t.id === str);
    if (byId) return byId.id;
    const num = Number(topicKey);
    if (!Number.isNaN(num)) {
      const byDrive = topics.find(t => Number(t.driveNo) === num);
      if (byDrive) return byDrive.id;
      const byNo = topics.find(t => Number(t.no) === num);
      if (byNo) return byNo.id;
    }
    return null;
  }

  function open(topicKey) {
    ensurePage();
    if (topicKey) {
      const id = resolveTopicId(topicKey);
      if (id) {
        S.filter = 'all';
        S.q = '';
        S.open = new Set([id]);
      }
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
    if (t.dataset.ksTheme) {
      S.theme = t.dataset.ksTheme;
      try { localStorage.setItem(THEME_KEY, S.theme); } catch {}
      return render();
    }
    if (t.dataset.ksFont) {
      S.font = t.dataset.ksFont;
      try { localStorage.setItem(FONT_KEY, S.font); } catch {}
      return render();
    }
    if (t.hasAttribute('data-ks-agenda')) {
      S.showAgenda = !S.showAgenda;
      return render();
    }
    if (t.dataset.ksView) {
      if (S.viewBy !== t.dataset.ksView) {
        S.viewBy = t.dataset.ksView;
        S.filter = 'all';
      }
      return render();
    }
    if (t.dataset.ksFilter) {
      S.filter = t.dataset.ksFilter;
      return render();
    }
    if (t.dataset.ksExpand) {
      if (t.dataset.ksExpand === 'all') {
        filteredTopics().forEach(item => S.open.add(item.id));
      } else {
        S.open.clear();
      }
      return render();
    }
    if (t.hasAttribute('data-ks-reset')) {
      S.filter = 'all'; S.q = '';
      return render();
    }
    if (t.dataset.ksToggle) {
      const id = t.dataset.ksToggle;
      if (S.open.has(id)) S.open.delete(id);
      else S.open.add(id);
      return render();
    }
    if (t.dataset.ksClose) {
      const id = t.dataset.ksClose;
      S.open.delete(id);
      render();
      const card = page.querySelector(`[data-ks-card="${id}"]`);
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    if (t.dataset.ksJump) {
      const id = t.dataset.ksJump;
      if (!id) return;
      S.open = new Set([id]);
      render();
      const card = page.querySelector(`[data-ks-card="${id}"]`);
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (t.dataset.ksDone) {
      const id = t.dataset.ksDone;
      if (S.done.has(id)) S.done.delete(id); else S.done.add(id);
      writeIdSet(DONE_KEY, S.done);
      return render();
    }
    if (t.dataset.ksStar) {
      const id = t.dataset.ksStar;
      if (S.star.has(id)) S.star.delete(id); else S.star.add(id);
      writeIdSet(STAR_KEY, S.star);
      return render();
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
