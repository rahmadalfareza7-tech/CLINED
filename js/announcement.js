/* CLINED — Pengumuman floating (tampil untuk semua pengguna) + editor admin (tab "Pengumuman"). */
(() => {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const THEMES = {
    biru: ['#e8f6ff', '#12394f', '#1cb0f6'], hijau: ['#eafbd9', '#1f4a0e', '#58cc02'], oranye: ['#fff1de', '#5a3300', '#ff9600'],
    merah: ['#ffe9e9', '#5c1414', '#ff4b4b'], ungu: ['#f1eaff', '#3a1f73', '#7c5cff'], gelap: ['#1f2933', '#f4f6f7', '#1cb0f6']
  };
  const ICONS = ['📣', '📢', '🎉', '⚠️', '🔥', '📚', '🩺', '🗓️', '✨', '💡', '🚀', '❤️'];
  const SEEN = 'clined_ann_seen_v1';
  const rd = () => { try { return JSON.parse(localStorage.getItem(SEEN) || '{}') || {}; } catch { return {}; } };
  const wr = v => { try { localStorage.setItem(SEEN, JSON.stringify(v)); } catch {} };
  const colors = st => st.theme === 'kustom' ? [st.bg, st.fg, st.accent] : (THEMES[st.theme] || THEMES.biru);

  /* kartu (dipakai tampilan publik & pratinjau admin) */
  function cardHTML(a, st, opts = {}) {
    const [bg, fg, ac] = colors(st);
    const btn = st.buttonLabel && st.buttonUrl ? `<a class="ann-btn" href="${esc(st.buttonUrl)}" ${/^https:/i.test(st.buttonUrl) ? 'target="_blank" rel="noopener noreferrer"' : ''} data-ann-link>${esc(st.buttonLabel)}</a>` : '';
    return `<div class="ann-card ann-${st.size === 'compact' ? 'compact' : 'normal'}${a.priority === 'urgent' ? ' urgent' : ''}" style="--ann-bg:${bg};--ann-fg:${fg};--ann-ac:${ac}" role="${a.priority === 'urgent' ? 'alert' : 'status'}">
      <span class="ann-ico" aria-hidden="true">${esc(st.icon || '📣')}</span>
      <div class="ann-copy"><b>${esc(a.title)}</b><p>${esc(a.body)}</p>${btn}</div>
      ${st.dismissible !== false && !opts.preview ? '<button type="button" class="ann-x" data-ann-x aria-label="Tutup pengumuman">✕</button>' : ''}</div>`;
  }

  /* ───────── tampilan publik ───────── */
  let queue = [], showing = false;
  const keyOf = a => `${a.id}:${new Date(a.updated_at || a.created_at).getTime()}`;
  function showNext() {
    if (showing) return;
    const a = queue.shift(); if (!a) return;
    const st = a.style || {};
    showing = true;
    const layer = document.createElement('div');
    layer.className = `ann-layer pos-${st.position === 'bottom' ? 'bottom' : 'top'}`;
    layer.innerHTML = cardHTML(a, st);
    document.body.appendChild(layer);
    requestAnimationFrame(() => requestAnimationFrame(() => layer.classList.add('show')));
    let timer = null;
    const close = (remember = true) => {
      clearTimeout(timer);
      if (remember && (st.repeat || 'once') === 'once') { const s = rd(); s[keyOf(a)] = Date.now(); wr(s); }
      layer.classList.remove('show');
      setTimeout(() => { layer.remove(); showing = false; setTimeout(showNext, 400); }, 320);
    };
    layer.addEventListener('click', e => {
      if (e.target.closest('[data-ann-x]')) return close(true);
      const l = e.target.closest('[data-ann-link]');
      if (l) { const h = l.getAttribute('href') || ''; if (h.startsWith('/') || h.startsWith('#')) { e.preventDefault(); close(true); location.href = h; } else close(true); }
    });
    if (st.autoHide > 0) timer = setTimeout(() => close(true), st.autoHide * 1000);
  }
  async function load() {
    try {
      const r = await fetch('/api/announcements', { credentials: 'same-origin', cache: 'no-store' });
      if (!r.ok) return;
      const seen = rd(), d = await r.json();
      const fresh = (d.announcements || []).filter(a => a.style && (a.style.repeat === 'always' || !seen[keyOf(a)]));
      const ids = new Set(queue.map(x => x.id));
      fresh.slice(0, 3).forEach(a => { if (!ids.has(a.id)) queue.push(a); });
      showNext();
    } catch {}
  }
  const start = () => setTimeout(load, 1500);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !showing) load(); });

  /* ───────── editor admin ───────── */
  const role = () => { try { return window.authCurrentUser?.()?.role || ''; } catch { return ''; } };
  let list = [], editing = null; // editing = null | {} (baru) | announcement
  const toLocal = v => { if (!v) return ''; const d = new Date(v); const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
  async function api(url, opt = {}) {
    const r = await fetch(url, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...opt, body: opt.body ? JSON.stringify(opt.body) : undefined });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || `Permintaan gagal (${r.status}).`);
    return d;
  }
  const panel = () => document.querySelector('#adminContentWorkspace [data-content-panel="ann"]');
  const msg = (t, bad) => { const m = panel()?.querySelector('[data-ann-msg]'); if (m) { m.textContent = t; m.className = 'muted' + (bad ? ' ann-bad' : ''); } };
  const STATE = { live: ['Tayang', 'ok'], draft: ['Draf', ''], scheduled: ['Terjadwal', 'wait'], expired: ['Berakhir', 'off'] };
  const stateOf = a => { const now = Date.now(), t = v => v ? new Date(v).getTime() : 0; return !a.published ? 'draft' : a.expires_at && t(a.expires_at) <= now ? 'expired' : a.starts_at && t(a.starts_at) > now ? 'scheduled' : 'live'; };
  function readForm() {
    const p = panel(), g = k => p.querySelector(`[data-ann-f="${k}"]`);
    const theme = p.querySelector('[data-ann-theme].on')?.dataset.annTheme || 'biru';
    const st = { icon: g('icon').value.trim() || '📣', theme, position: g('position').value, size: g('size').value, repeat: g('repeat').value, dismissible: g('dismissible').checked, autoHide: Number(g('autoHide').value), buttonLabel: g('buttonLabel').value, buttonUrl: g('buttonUrl').value };
    if (theme === 'kustom') { st.bg = g('bg').value; st.fg = g('fg').value; st.accent = g('accent').value; }
    return { title: g('title').value.trim(), body: g('body').value.trim(), priority: g('priority').value, starts_at: g('starts').value ? new Date(g('starts').value).toISOString() : null, expires_at: g('ends').value ? new Date(g('ends').value).toISOString() : null, style: st };
  }
  function preview() {
    const p = panel(); if (!p || !p.querySelector('[data-ann-form]')) return;
    const f = readForm(); const host = p.querySelector('[data-ann-preview]');
    const st = f.style.theme === 'kustom' ? f.style : f.style;
    host.innerHTML = cardHTML({ title: f.title || 'Judul pengumuman', body: f.body || 'Isi pengumuman tampil di sini.', priority: f.priority }, st, { preview: true });
  }
  function formHTML(a) {
    const st = a.style || {}, th = st.theme || 'biru', c = (k, d) => esc(st[k] || d);
    const sel = (opts, cur) => opts.map(([v, l]) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${l}</option>`).join('');
    return `<div class="ann-form" data-ann-form>
      <h4>${a.id ? 'Edit pengumuman' : 'Pengumuman baru'}</h4>
      <div class="ann-preview" data-ann-preview></div>
      <label>Judul <input type="text" data-ann-f="title" maxlength="120" value="${esc(a.title || '')}" placeholder="mis. Jadwal UAB berubah"></label>
      <label>Isi <textarea data-ann-f="body" rows="3" maxlength="2000" placeholder="Tulis pengumuman…">${esc(a.body || '')}</textarea></label>
      <div class="ann-row"><span>Ikon</span><input type="text" data-ann-f="icon" maxlength="4" value="${esc(st.icon || '📣')}" class="ann-icon-in" aria-label="Ikon"><div class="ann-icons">${ICONS.map(i => `<button type="button" data-ann-ico="${i}">${i}</button>`).join('')}</div></div>
      <div class="ann-row"><span>Warna</span><div class="ann-themes">${[...Object.keys(THEMES), 'kustom'].map(k => `<button type="button" class="${k === th ? 'on' : ''}" data-ann-theme="${k}" style="${k === 'kustom' ? '' : `background:${THEMES[k][0]};border-color:${THEMES[k][2]}`}" title="${k}">${k === 'kustom' ? '🎨' : ''}<i style="background:${k === 'kustom' ? '#999' : THEMES[k][2]}"></i></button>`).join('')}</div></div>
      <div class="ann-custom" data-ann-custom ${th === 'kustom' ? '' : 'hidden'}><label>Latar <input type="color" data-ann-f="bg" value="${c('bg', '#e8f6ff')}"></label><label>Teks <input type="color" data-ann-f="fg" value="${c('fg', '#12394f')}"></label><label>Aksen <input type="color" data-ann-f="accent" value="${c('accent', '#1cb0f6')}"></label></div>
      <div class="ann-grid">
        <label>Posisi <select data-ann-f="position">${sel([['top', 'Atas (meluncur dari atas)'], ['bottom', 'Bawah']], st.position || 'top')}</select></label>
        <label>Ukuran <select data-ann-f="size">${sel([['normal', 'Normal'], ['compact', 'Ringkas']], st.size || 'normal')}</select></label>
        <label>Ditampilkan <select data-ann-f="repeat">${sel([['once', 'Sekali per perangkat'], ['always', 'Tiap aplikasi dibuka']], st.repeat || 'once')}</select></label>
        <label>Tutup otomatis <select data-ann-f="autoHide">${sel([[0, 'Tidak'], [5, '5 detik'], [8, '8 detik'], [12, '12 detik'], [20, '20 detik'], [30, '30 detik']], st.autoHide || 0)}</select></label>
        <label>Prioritas <select data-ann-f="priority">${sel([['low', 'Rendah'], ['normal', 'Normal'], ['high', 'Tinggi'], ['urgent', 'Mendesak']], a.priority || 'normal')}</select></label>
        <label class="ann-check"><input type="checkbox" data-ann-f="dismissible" ${st.dismissible === false ? '' : 'checked'}> Bisa ditutup pengguna</label>
        <label>Teks tombol <input type="text" data-ann-f="buttonLabel" maxlength="24" value="${esc(st.buttonLabel || '')}" placeholder="opsional, mis. Lihat jadwal"></label>
        <label>Tautan tombol <input type="text" data-ann-f="buttonUrl" maxlength="300" value="${esc(st.buttonUrl || '')}" placeholder="https://… atau /halaman"></label>
        <label>Mulai tayang <input type="datetime-local" data-ann-f="starts" value="${toLocal(a.starts_at)}"></label>
        <label>Berakhir <input type="datetime-local" data-ann-f="ends" value="${toLocal(a.expires_at)}"></label>
      </div>
      <div class="ann-actions"><button type="button" class="secondary" data-ann-cancel>Batal</button><button type="button" class="secondary" data-ann-save="draft">Simpan draf</button><button type="button" class="primary" data-ann-save="live">Simpan &amp; tayangkan</button></div></div>`;
  }
  function render() {
    const p = panel(); if (!p) return;
    const rows = list.map(a => { const [lbl, cls] = STATE[stateOf(a)]; const st = a.style || {}; return `<div class="ann-item"><span class="ann-item-ico">${esc(st.icon || '📣')}</span><div class="ann-item-who"><b>${esc(a.title)}</b><small><i class="ann-chip ${cls}">${lbl}</i> ${a.priority === 'urgent' ? '• mendesak ' : ''}${a.expires_at ? '• sampai ' + new Date(a.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : ''}</small></div>
      <div class="ann-item-act"><button type="button" class="secondary" data-ann-edit="${esc(a.id)}">Edit</button><button type="button" class="secondary" data-ann-toggle="${esc(a.id)}">${a.published ? 'Tarik' : 'Tayangkan'}</button><button type="button" class="secondary danger" data-ann-del="${esc(a.id)}">Hapus</button></div></div>`; }).join('');
    p.innerHTML = `<div class="admin-content-intro"><b>Pengumuman floating</b><span>Muncul meluncur dari atas untuk semua pengguna. Atur warna, ikon, tombol, dan jadwal.</span></div>
      <p class="muted" data-ann-msg></p>
      ${editing ? formHTML(editing) : '<button type="button" class="primary" data-ann-new>＋ Pengumuman baru</button>'}
      <div class="ann-list">${rows || '<p class="muted">Belum ada pengumuman.</p>'}</div>`;
    if (editing) preview();
  }
  async function loadAdmin() {
    if (role() !== 'admin') { const p = panel(); if (p) p.innerHTML = '<p class="muted">Hanya admin yang dapat mengelola pengumuman.</p>'; return; }
    try { list = (await api('/api/admin/announcements')).announcements || []; render(); } catch (e) { msg(e.message, true); }
  }
  document.addEventListener('click', async e => {
    if (e.target.closest?.('[data-content-tab="ann"]')) { setTimeout(loadAdmin, 60); return; }
    const p = panel(); if (!p || !p.contains(e.target)) return;
    const t = e.target.closest('button'); if (!t) return;
    if (t.matches('[data-ann-new]')) { editing = {}; return render(); }
    if (t.matches('[data-ann-cancel]')) { editing = null; return render(); }
    if (t.matches('[data-ann-edit]')) { editing = list.find(a => a.id === t.dataset.annEdit) || null; return render(); }
    if (t.matches('[data-ann-ico]')) { p.querySelector('[data-ann-f="icon"]').value = t.dataset.annIco; return preview(); }
    if (t.matches('[data-ann-theme]')) { p.querySelectorAll('[data-ann-theme]').forEach(b => b.classList.toggle('on', b === t)); p.querySelector('[data-ann-custom]').hidden = t.dataset.annTheme !== 'kustom'; return preview(); }
    try {
      if (t.matches('[data-ann-toggle]')) { const a = list.find(x => x.id === t.dataset.annToggle); await api('/api/admin/announcements', { method: 'POST', body: { action: a.published ? 'draft' : 'publish', id: a.id } }); return loadAdmin(); }
      if (t.matches('[data-ann-del]')) { if (!(await (window.clinedConfirm?.({ title: 'Hapus pengumuman ini?', ok: 'Hapus', tone: 'danger' }) ?? true))) return; await api('/api/admin/announcements/' + t.dataset.annDel, { method: 'DELETE' }); return loadAdmin(); }
      if (t.matches('[data-ann-save]')) {
        const f = readForm(); if (!f.title || !f.body) return msg('Judul dan isi wajib diisi.', true);
        t.disabled = true;
        const publish = t.dataset.annSave === 'live';
        if (editing?.id) { await api('/api/admin/announcements/' + editing.id, { method: 'PATCH', body: { ...f, published: publish } }); }
        else await api('/api/admin/announcements', { method: 'POST', body: { ...f, published: publish } });
        editing = null; msg(publish ? 'Tayang ✅' : 'Draf tersimpan.'); return loadAdmin();
      }
    } catch (err) { msg(err.message, true); t.disabled = false; }
  });
  document.addEventListener('input', e => { if (e.target.closest?.('[data-ann-form]')) preview(); });
  document.addEventListener('change', e => { if (e.target.closest?.('[data-ann-form]')) preview(); });
  window.CLINED_ANN = { cardHTML };
})();
