/* CLINED — Diskusi per soal (mirip Brainly): komentar tampil di bawah pembahasan, bisa suka / tidak suka. */
(() => {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const BADGE = { admin: '👑 Admin', helper: '🛠️ Helper', mentor: '🙋 Tempat bertanya' };
  const HUES = ['#1cb0f6,#7c5cff', '#ff9600,#ff4b4b', '#58cc02,#00b496', '#ff63a0,#a05aff', '#00b8d9,#3c64e6', '#ffc400,#ff7800'];
  const hue = n => { let h = 0; for (const c of String(n || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return `linear-gradient(135deg,${HUES[h % HUES.length]})`; };
  const ini = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase() || '?';
  const ago = t => { const m = Math.round((Date.now() - t) / 6e4); return m < 1 ? 'baru saja' : m < 60 ? m + ' mnt' : m < 1440 ? Math.floor(m / 60) + ' jam' : m < 43200 ? Math.floor(m / 1440) + ' hr' : new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); };
  const keyOf = (bank, id) => `${bank}|${id}`.replace(/[^A-Za-z0-9_.:|\-]/g, '_').slice(0, 200);
  const toast = (m, e) => window.showToast?.(m, !!e);
  async function api(url, opt = {}) {
    const r = await fetch(url, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...opt, body: opt.body ? JSON.stringify(opt.body) : undefined });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(d.error || `Permintaan gagal (${r.status}).`), { status: r.status });
    return d;
  }
  const SHOW = 3;

  function mount(host, key) {
    if (!host || !key) return;
    const S = { key, list: null, all: false, busy: false, err: '' };
    host._qc = S; host.classList.add('qc');
    const draw = () => {
      if (host._qc !== S) return;
      const n = S.list ? S.list.length : 0, shown = S.list ? (S.all ? S.list : S.list.slice(0, SHOW)) : [];
      const keepTxt = host.querySelector('textarea')?.value || '', hadFocus = document.activeElement === host.querySelector('textarea');
      host.innerHTML = `<div class="qc-head"><b>💬 Diskusi soal</b><span class="qc-n">${S.list ? n : ''}</span></div>
        <div class="qc-compose"><textarea rows="2" maxlength="1000" placeholder="Tulis penjelasanmu…" aria-label="Tulis komentar">${esc(keepTxt)}</textarea><button type="button" class="qc-send" data-qc-send disabled>Kirim</button></div>
        ${S.err ? `<p class="qc-note">${esc(S.err)}</p>` : ''}
        <div class="qc-list">${S.list == null ? (S.err ? '' : '<div class="qc-skel"></div>') : shown.length ? shown.map(row).join('') : '<p class="qc-empty">Belum ada komentar. Jadilah yang pertama berbagi penjelasan.</p>'}</div>
        ${S.list && n > SHOW && !S.all ? `<button type="button" class="qc-more" data-qc-more>Tampilkan ${n - SHOW} komentar lagi</button>` : ''}`;
      const ta = host.querySelector('textarea'), b = host.querySelector('[data-qc-send]');
      b.disabled = !ta.value.trim() || S.busy;
      if (hadFocus) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
    };
    const row = c => `<article class="qc-c" data-id="${esc(c.id)}"><span class="qc-av" style="background:${hue(c.name)}" aria-hidden="true">${esc(ini(c.name))}</span>
      <div class="qc-body"><div class="qc-meta"><b>${esc(c.name)}</b>${(c.badges || []).map(x => `<em class="qc-badge b-${x}">${BADGE[x] || ''}</em>`).join('')}<time>${ago(c.at)}</time></div>
      <p>${esc(c.text)}</p>
      <div class="qc-act"><button type="button" class="qc-v${c.mine === 1 ? ' on up' : ''}" data-qc-vote="1" ${c.own ? 'disabled' : ''} aria-pressed="${c.mine === 1}" aria-label="Suka">👍 <span>${c.up}</span></button>
      <button type="button" class="qc-v${c.mine === -1 ? ' on down' : ''}" data-qc-vote="-1" ${c.own ? 'disabled' : ''} aria-pressed="${c.mine === -1}" aria-label="Tidak suka">👎 <span>${c.down}</span></button>
      ${c.canDelete ? '<button type="button" class="qc-del" data-qc-del>Hapus</button>' : ''}</div></div></article>`;
    host.onclick = async e => {
      const t = e.target.closest('button'); if (!t || !host.contains(t)) return;
      if (t.matches('[data-qc-more]')) { S.all = true; return draw(); }
      if (t.matches('[data-qc-send]')) {
        const ta = host.querySelector('textarea'), text = ta.value.trim(); if (!text || S.busy) return;
        S.busy = true; t.disabled = true;
        try { const d = await api('/api/qcomments', { method: 'POST', body: { key: S.key, text } }); ta.value = ''; S.list = [d.comment, ...(S.list || [])]; S.err = ''; }
        catch (err) { toast(err.message, true); }
        S.busy = false; return draw();
      }
      const art = t.closest('.qc-c'); if (!art) return; const c = (S.list || []).find(x => x.id === art.dataset.id); if (!c) return;
      if (t.matches('[data-qc-vote]')) {
        const v = Number(t.dataset.qcVote), next = c.mine === v ? 0 : v;
        try { const d = await api('/api/qcomments/vote', { method: 'POST', body: { id: c.id, value: next } }); c.up = d.up; c.down = d.down; c.mine = next; draw(); }
        catch (err) { toast(err.message, true); }
      } else if (t.matches('[data-qc-del]')) {
        const ok = await (window.clinedConfirm?.({ title: 'Hapus komentar ini?', ok: 'Ya, hapus', tone: 'danger' }) ?? Promise.resolve(confirm('Hapus komentar ini?')));
        if (!ok) return;
        try { await api('/api/qcomments?id=' + encodeURIComponent(c.id), { method: 'DELETE' }); S.list = S.list.filter(x => x.id !== c.id); draw(); }
        catch (err) { toast(err.message, true); }
      }
    };
    host.oninput = e => { if (e.target.matches('textarea')) { const b = host.querySelector('[data-qc-send]'); if (b) b.disabled = !e.target.value.trim() || S.busy; e.target.style.height = 'auto'; e.target.style.height = Math.min(140, e.target.scrollHeight) + 'px'; } };
    draw();
    api('/api/qcomments?key=' + encodeURIComponent(key)).then(d => { S.list = d.comments || []; S.err = ''; draw(); })
      .catch(e => { S.err = e.status === 401 ? 'Masuk dulu untuk melihat dan menulis diskusi.' : e.status === 400 ? '' : 'Diskusi belum bisa dimuat.'; S.list = S.list || []; draw(); });
  }
  /** Pasang lazy pada <details class="ml-rv-detail" data-qkey> saat dibuka. */
  function lazyDetails(root) {
    (root || document).querySelectorAll('details[data-qkey]').forEach(d => {
      const go = () => { if (!d.open || d.querySelector('.qc')) return; const h = document.createElement('div'); d.appendChild(h); mount(h, d.dataset.qkey); };
      if (d.open) go(); else d.addEventListener('toggle', go);
    });
  }
  window.CLINED_QC = { mount, keyOf, lazyDetails };
})();
