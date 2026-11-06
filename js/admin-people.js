/* CLINED — Panel admin: Pengguna & Aktivitas (v98). Kartu ringkas, filter, aksi besar untuk jempol. */
(() => {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ROLES = { student: ['🎓', 'Student'], helper: ['🛠️', 'Helper'], admin: ['👑', 'Admin'] };
  const HUES = ['#1cb0f6,#7c5cff', '#ff9600,#ff4b4b', '#58cc02,#00b496', '#ff63a0,#a05aff', '#00b8d9,#3c64e6', '#ffc400,#ff7800'];
  const hue = n => { let h = 0; for (const c of String(n || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return `linear-gradient(135deg,${HUES[h % HUES.length]})`; };
  const ini = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase() || '?';
  const rel = t => {
    if (!t) return 'belum pernah login';
    const m = Math.round((Date.now() - new Date(t)) / 6e4);
    if (m < 1) return 'baru saja'; if (m < 60) return m + ' menit lalu'; if (m < 1440) return Math.floor(m / 60) + ' jam lalu';
    if (m < 43200) return Math.floor(m / 1440) + ' hari lalu';
    return new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  const hm = t => new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const dayKey = t => { const d = new Date(t), n = new Date(); return d.toDateString() === n.toDateString() ? 'Hari ini' : new Date(n - 864e5).toDateString() === d.toDateString() ? 'Kemarin' : d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }); };

  function mount(host, { request, confirm, selfId }) {
    const S = { tab: 'users', users: null, acts: null, q: '', role: 'all', filter: 'all', open: null, timer: null, busy: new Set() };
    host.classList.add('ap');
    host.innerHTML = `<div class="ap-hero"><div class="ap-hero-t"><span class="ap-kick">ADMIN</span><h3>Pengguna & aktivitas</h3></div><div class="ap-stats" data-ap-stats></div></div>
      <div class="ap-tabs" role="tablist"><button type="button" role="tab" data-ap-tab="users" class="on">👥 Pengguna</button><button type="button" role="tab" data-ap-tab="acts">🕘 Aktivitas</button></div>
      <p class="ap-msg" data-ap-msg role="status" aria-live="polite"></p>
      <div data-ap-body></div>`;
    const $ = sel => host.querySelector(sel);
    const msg = (t, bad) => { const m = $('[data-ap-msg]'); m.textContent = t || ''; m.className = 'ap-msg' + (t ? (bad ? ' bad' : ' ok') : ''); if (t) { clearTimeout(msg.t); msg.t = setTimeout(() => { m.textContent = ''; m.className = 'ap-msg'; }, 4000); } };

    const stats = () => {
      const u = S.users || [], c = r => u.filter(x => x.role === r).length;
      $('[data-ap-stats]').innerHTML = S.users ? `<span><b>${u.length}</b>Pengguna</span><span><b>${c('admin')}</b>Admin</span><span><b>${c('helper')}</b>Helper</span><span><b>${u.filter(x => x.isMentor).length}</b>Mentor</span>` : '';
    };

    /* ───── Pengguna ───── */
    const usersHTML = () => {
      if (S.users == null) return '<div class="ap-skel"></div><div class="ap-skel"></div><div class="ap-skel"></div>';
      const q = S.q.trim().toLowerCase();
      const rows = S.users.filter(u => (S.role === 'all' || (S.role === 'mentor' ? u.isMentor : u.role === S.role)) && (!q || u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)));
      const chips = [['all', 'Semua'], ['admin', '👑 Admin'], ['helper', '🛠️ Helper'], ['mentor', '🙋 Mentor'], ['student', '🎓 Student']];
      return `<div class="ap-searchbox"><input type="search" data-ap-q placeholder="Cari nama atau username…" value="${esc(S.q)}" autocomplete="off" aria-label="Cari pengguna"></div>
        <div class="ap-chips" role="group" aria-label="Filter role">${chips.map(([k, l]) => `<button type="button" data-ap-role="${k}" class="${S.role === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        <div class="ap-count">${rows.length} pengguna</div>
        <div class="ap-list">${rows.length ? rows.map(userCard).join('') : '<div class="ap-empty"><span>🫥</span>Tidak ada pengguna yang cocok.</div>'}</div>`;
    };
    const userCard = u => {
      const open = S.open === u.id, me = u.id === selfId, busy = S.busy.has(u.id);
      const tags = `<em class="ap-tag r-${esc(u.role)}">${ROLES[u.role]?.[0] || ''} ${ROLES[u.role]?.[1] || esc(u.role)}</em>${u.isMentor ? '<em class="ap-tag r-mentor">🙋 Tempat bertanya</em>' : ''}`;
      return `<article class="ap-user${open ? ' open' : ''}${busy ? ' busy' : ''}">
        <button type="button" class="ap-user-head" data-ap-open="${esc(u.id)}" aria-expanded="${open}">
          <span class="ap-av" style="background:${hue(u.name)}">${esc(ini(u.name))}</span>
          <span class="ap-user-main"><b>${esc(u.name)}${me ? ' <small class="ap-you">kamu</small>' : ''}</b><small>@${esc(u.username)} • ${rel(u.lastLoginAt)}</small><span class="ap-tags">${tags}</span></span>
          <span class="ap-chev" aria-hidden="true">›</span></button>
        ${open ? `<div class="ap-user-body">
          <div class="ap-lbl">Role</div>
          <div class="ap-seg" role="group" aria-label="Ubah role">${Object.entries(ROLES).map(([k, [i, l]]) => `<button type="button" data-ap-setrole="${k}" data-uid="${esc(u.id)}" class="${u.role === k ? 'on' : ''}" ${u.role === k || busy || (me && k !== 'admin') ? 'disabled' : ''}>${i} ${l}</button>`).join('')}</div>
          <label class="ap-switch"><span><b>🙋 Tempat bertanya</b><small>Bisa dichat siapa saja tanpa berteman. Boleh dobel dengan role lain.</small></span><input type="checkbox" data-ap-mentor="${esc(u.id)}" ${u.isMentor ? 'checked' : ''} ${busy ? 'disabled' : ''}><i aria-hidden="true"></i></label>
          ${me ? '<p class="ap-note">Akun yang sedang dipakai tidak bisa diturunkan atau dihapus.</p>' : `<button type="button" class="ap-danger" data-ap-del="${esc(u.id)}" data-name="${esc(u.name)}" ${busy ? 'disabled' : ''}>🗑️ Hapus pengguna</button>`}
        </div>` : ''}</article>`;
    };

    /* ───── Aktivitas ───── */
    const LBL = { login: ['↪', 'Login', 'login'], logout: ['↩', 'Logout', 'logout'], role_changed: ['⚙️', 'Role diubah', 'role'] };
    const actsHTML = () => {
      if (S.acts == null) return '<div class="ap-skel"></div><div class="ap-skel"></div><div class="ap-skel"></div>';
      const rows = S.acts.filter(a => S.filter === 'all' || (LBL[a.action]?.[2] || 'other') === S.filter);
      const chips = [['all', 'Semua'], ['login', '↪ Login'], ['logout', '↩ Logout'], ['role', '⚙️ Role']];
      let last = '', html = '';
      rows.forEach(a => {
        const d = dayKey(a.createdAt); if (d !== last) { html += `<div class="ap-day">${esc(d)}</div>`; last = d; }
        const l = LBL[a.action] || ['•', a.action, 'other'];
        const extra = a.action === 'role_changed' && a.metadata?.to ? `<span class="ap-chg">${esc(a.metadata.from || '—')}<i>→</i>${esc(a.metadata.to)}</span>` : '';
        html += `<article class="ap-act k-${l[2]}"><span class="ap-act-ico" aria-hidden="true">${l[0]}</span><div class="ap-act-main"><b>${esc(a.user?.name || 'Akun dihapus')}</b><small>@${esc(a.user?.username || '-')} • ${esc(l[1])}</small>${extra}</div><time>${hm(a.createdAt)}</time></article>`;
      });
      return `<div class="ap-chips" role="group" aria-label="Filter aktivitas">${chips.map(([k, l]) => `<button type="button" data-ap-filter="${k}" class="${S.filter === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        <div class="ap-list">${rows.length ? html : '<div class="ap-empty"><span>🍃</span>Belum ada aktivitas.</div>'}</div>
        <button type="button" class="ap-danger ghost" data-ap-reset>Reset riwayat login/logout</button>
        <p class="ap-note">Menampilkan 200 aktivitas terbaru. Login/logout admin tidak dicatat di sini. Riwayat perubahan role tidak ikut terhapus saat reset.</p>`;
    };

    const draw = () => {
      const body = $('[data-ap-body]'), keep = document.activeElement?.matches?.('[data-ap-q]');
      body.innerHTML = S.tab === 'users' ? usersHTML() : actsHTML();
      if (keep) { const e = body.querySelector('[data-ap-q]'); e?.focus(); e?.setSelectionRange(e.value.length, e.value.length); }
      stats();
    };
    const loadUsers = async () => { try { S.users = (await request('/api/admin/users')).users || []; } catch (e) { S.users = S.users || []; msg(e.message || 'Gagal memuat pengguna.', true); } };
    const loadActs = async () => { try { S.acts = (await request('/api/admin/activity')).activities || []; } catch (e) { S.acts = S.acts || []; msg(e.message || 'Gagal memuat aktivitas.', true); } };
    const refresh = async () => { await Promise.all([loadUsers(), loadActs()]); draw(); };

    host.addEventListener('click', async e => {
      const t = e.target.closest('button'); if (!t || !host.contains(t)) return;
      if (t.dataset.apTab) { S.tab = t.dataset.apTab; host.querySelectorAll('[data-ap-tab]').forEach(b => b.classList.toggle('on', b === t)); draw(); return; }
      if (t.dataset.apRole) { S.role = t.dataset.apRole; draw(); return; }
      if (t.dataset.apFilter) { S.filter = t.dataset.apFilter; draw(); return; }
      if (t.dataset.apOpen) { S.open = S.open === t.dataset.apOpen ? null : t.dataset.apOpen; draw(); return; }
      if (t.dataset.apSetrole) {
        const id = t.dataset.uid, role = t.dataset.apSetrole, u = S.users.find(x => x.id === id); if (!u) return;
        if (role === 'admin' && !(await confirm({ title: `Jadikan ${u.name} sebagai Admin?`, text: 'Admin punya akses penuh ke pengelolaan konten dan pengguna.', ok: 'Ya, jadikan admin' }))) return;
        S.busy.add(id); draw();
        try { const d = await request(`/api/admin/users/${encodeURIComponent(id)}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }); msg(d.message || 'Role diperbarui.'); await refresh(); }
        catch (err) { msg(err.message || 'Role gagal diperbarui.', true); } finally { S.busy.delete(id); draw(); }
        return;
      }
      if (t.dataset.apDel) {
        if (!(await confirm({ title: `Hapus ${t.dataset.name}?`, text: 'Data akun yang tersimpan dihapus. Konten publik yang dibuat akun ini tetap dipertahankan.', ok: 'Ya, hapus', tone: 'danger' }))) return;
        const id = t.dataset.apDel; S.busy.add(id); draw();
        try { const d = await request(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' }); S.open = null; msg(d.message || 'Pengguna dihapus.'); await refresh(); }
        catch (err) { msg(err.message || 'Pengguna gagal dihapus.', true); } finally { S.busy.delete(id); draw(); }
        return;
      }
      if (t.hasAttribute('data-ap-reset')) {
        if (!(await confirm({ title: 'Reset semua riwayat login/logout?', text: 'Riwayat perubahan role tidak akan dihapus.', ok: 'Ya, reset', tone: 'danger' }))) return;
        t.disabled = true;
        try { const d = await request('/api/admin/activity', { method: 'DELETE', body: JSON.stringify({}) }); msg(d.message || 'Riwayat direset.'); await loadActs(); } catch (err) { msg(err.message || 'Reset gagal.', true); }
        draw();
      }
    });
    host.addEventListener('change', async e => {
      const cb = e.target.closest('[data-ap-mentor]'); if (!cb) return;
      const id = cb.dataset.apMentor, u = S.users.find(x => x.id === id); if (!u) return;
      S.busy.add(id); cb.disabled = true;
      try { const d = await request(`/api/admin/users/${encodeURIComponent(id)}/role`, { method: 'PATCH', body: JSON.stringify({ mentor: cb.checked }) }); u.isMentor = cb.checked; msg(d.message || 'Tersimpan.'); }
      catch (err) { cb.checked = !cb.checked; msg(err.message || 'Gagal menyimpan.', true); }
      finally { S.busy.delete(id); draw(); }
    });
    host.addEventListener('input', e => { if (e.target.matches('[data-ap-q]')) { S.q = e.target.value; draw(); } });

    draw(); refresh();
    // Segarkan aktivitas tiap menit, hanya saat panel masih ada di halaman & tab Aktivitas dibuka.
    S.timer = setInterval(() => { if (!host.isConnected) return clearInterval(S.timer); if (S.tab === 'acts' && !document.hidden) loadActs().then(draw); }, 60000);
    return { refresh };
  }
  window.CLINED_ADMIN_PEOPLE = { mount };
})();
