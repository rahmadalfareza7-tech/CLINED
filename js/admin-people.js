/* CLINED — Panel admin: Pengguna & Aktivitas (v99). Kartu ringkas, filter, status online, aksi besar untuk jempol. */
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
  const joinedDate = t => t ? new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const hm = t => new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const dayKey = t => { const d = new Date(t), n = new Date(); return d.toDateString() === n.toDateString() ? 'Hari ini' : new Date(n - 864e5).toDateString() === d.toDateString() ? 'Kemarin' : d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }); };

  function mount(host, { request, confirm, selfId }) {
    const S = { tab: 'users', users: null, acts: null, q: '', aq: '', role: 'all', sort: 'role', filter: 'all', open: null, timer: null, busy: new Set(), refreshing: false, lastBodyHtml: '', lastStatsHtml: '', resetCodes: {} };
    host.classList.add('ap');
    host.innerHTML = `<div class="ap-hero"><div class="ap-hero-top"><div class="ap-hero-t"><span class="ap-kick">ADMIN</span><h3>Pengguna &amp; aktivitas</h3></div><button type="button" class="ap-refresh" data-ap-refresh aria-label="Segarkan data" title="Segarkan data">↻</button></div><div class="ap-stats" data-ap-stats></div></div>
      <div class="ap-tabs" role="tablist"><button type="button" role="tab" data-ap-tab="users" class="on">👥 Pengguna</button><button type="button" role="tab" data-ap-tab="acts">🕘 Aktivitas</button></div>
      <p class="ap-msg" data-ap-msg role="status" aria-live="polite"></p>
      <div data-ap-body></div>`;
    const $ = sel => host.querySelector(sel);
    const msg = (t, bad) => { const m = $('[data-ap-msg]'); m.textContent = t || ''; m.className = 'ap-msg' + (t ? (bad ? ' bad' : ' ok') : ''); if (t) { clearTimeout(msg.t); msg.t = setTimeout(() => { m.textContent = ''; m.className = 'ap-msg'; }, 4000); } };

    const stats = () => {
      const u = S.users || [], c = r => u.filter(x => x.role === r).length;
      const onlineNow = u.filter(x => x.online).length;
      const activeToday = u.filter(x => x.online || (x.lastLoginAt && (Date.now() - new Date(x.lastLoginAt).getTime()) < 864e5)).length;
      const nextStats = S.users ? `<span><b>${onlineNow}</b>Online</span><span><b>${u.length}</b>Pengguna</span><span><b>${activeToday}</b>Aktif 24j</span><span><b>${c('admin')}</b>Admin</span><span><b>${c('helper')}</b>Helper</span><span><b>${u.filter(x => x.isMentor).length}</b>Mentor</span>` : '';
      if (nextStats !== S.lastStatsHtml) { S.lastStatsHtml = nextStats; $('[data-ap-stats]').innerHTML = nextStats; }
    };

    /* ───── Pengguna ───── */
    const usersHTML = () => {
      if (S.users == null) return '<div class="ap-skel"></div><div class="ap-skel"></div><div class="ap-skel"></div>';
      const q = S.q.trim().toLowerCase();
      const rows = S.users
        .filter(u => {
          const roleOk = S.role === 'all' || (S.role === 'online' ? !!u.online : S.role === 'mentor' ? u.isMentor : u.role === S.role);
          const textOk = !q || u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
          return roleOk && textOk;
        })
        .slice()
        .sort((a, b) => {
          if (S.sort === 'online') return (Number(!!b.online) - Number(!!a.online)) || (new Date(b.lastLoginAt || 0).getTime() - new Date(a.lastLoginAt || 0).getTime()) || a.name.localeCompare(b.name, 'id');
          if (S.sort === 'xp') return (Number(b.xpTotal) || 0) - (Number(a.xpTotal) || 0) || a.name.localeCompare(b.name, 'id');
          if (S.sort === 'login') return (new Date(b.lastLoginAt || 0).getTime() - new Date(a.lastLoginAt || 0).getTime()) || a.name.localeCompare(b.name, 'id');
          return 0;
        });
      const chips = [['all', 'Semua'], ['online', '🟢 Online'], ['admin', '👑 Admin'], ['helper', '🛠️ Helper'], ['mentor', '🙋 Mentor'], ['student', '🎓 Student']];
      const sorts = [['role', 'Default'], ['online', '🟢 Online dulu'], ['xp', '⚡ XP Tertinggi'], ['login', '🕒 Login Terbaru']];
      return `<div class="ap-searchbox"><input type="search" data-ap-q placeholder="Cari nama atau username…" value="${esc(S.q)}" autocomplete="off" aria-label="Cari pengguna"></div>
        <div class="ap-chips" role="group" aria-label="Filter role">${chips.map(([k, l]) => `<button type="button" data-ap-role="${k}" class="${S.role === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        <div class="ap-chips" role="group" aria-label="Urutkan pengguna" style="margin-top:4px">${sorts.map(([k, l]) => `<button type="button" data-ap-sort="${k}" class="${S.sort === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        <div class="ap-count">${rows.length} pengguna</div>
        <div class="ap-list">${rows.length ? rows.map(userCard).join('') : '<div class="ap-empty"><span>🫥</span>Tidak ada pengguna yang cocok.</div>'}</div>`;
    };
    const userCard = u => {
      const open = S.open === u.id, me = u.id === selfId, busy = S.busy.has(u.id);
      const rc = S.resetCodes[u.id] || null;
      const xpNum = Number(u.xpTotal) || 0;
      const xpBadge = xpNum > 0 ? `<em class="ap-tag">⚡ ${xpNum.toLocaleString('id-ID')} XP</em>` : '';
      const onlineTag = u.online ? ' • <span class="ap-on">● online</span>' : '';
      const nc = u.nameColor ? ` data-name-color="${esc(u.nameColor)}"` : '';
      const tags = `<em class="ap-tag r-${esc(u.role)}">${ROLES[u.role]?.[0] || ''} ${ROLES[u.role]?.[1] || esc(u.role)}</em>${u.isMentor ? '<em class="ap-tag r-mentor">🙋 Tempat bertanya</em>' : ''}${xpBadge}`;
      return `<article class="ap-user${open ? ' open' : ''}${busy ? ' busy' : ''}">
        <button type="button" class="ap-user-head" data-ap-open="${esc(u.id)}" aria-expanded="${open}">
          <span class="ap-av${u.online ? ' on' : ''}${u.avatarDeco ? ' has-deco' : ''}" style="${u.avatarUrl ? '' : `background:${hue(u.name)}`}">${u.avatarUrl ? `<img class="ap-av-img" src="${esc(u.avatarUrl)}" alt="">` : esc(ini(u.name))}${u.avatarDeco ? `<img class="avatar-deco-img" src="${esc(u.avatarDeco)}" alt="">` : ''}</span>
          <span class="ap-user-main"><b${nc}>${esc(u.name)}${me ? ' <small class="ap-you">kamu</small>' : ''}</b><small>@${esc(u.username)} • ${rel(u.lastLoginAt)}${onlineTag}</small><span class="ap-tags">${tags}</span></span>
          <span class="ap-chev" aria-hidden="true">›</span></button>
        ${open ? `<div class="ap-user-body">
          <div class="ap-user-meta"><span>📅 Bergabung ${esc(joinedDate(u.createdAt))}</span><span>⚡ ${xpNum.toLocaleString('id-ID')} XP</span></div>
          <div class="ap-lbl">Role</div>
          <div class="ap-seg" role="group" aria-label="Ubah role">${Object.entries(ROLES).map(([k, [i, l]]) => `<button type="button" data-ap-setrole="${k}" data-uid="${esc(u.id)}" class="${u.role === k ? 'on' : ''}" ${u.role === k || busy || (me && k !== 'admin') ? 'disabled' : ''}>${i} ${l}</button>`).join('')}</div>
          <label class="ap-switch"><span><b>🙋 Tempat bertanya</b><small>Bisa dichat siapa saja tanpa berteman. Boleh dobel dengan role lain.</small></span><input type="checkbox" data-ap-mentor="${esc(u.id)}" ${u.isMentor ? 'checked' : ''} ${busy ? 'disabled' : ''}><i aria-hidden="true"></i></label>
          ${me ? '<p class="ap-note">Akun yang sedang dipakai tidak bisa diturunkan atau dihapus.</p>' : `
            <button type="button" class="ap-reset-btn" data-ap-resetcode="${esc(u.id)}" data-name="${esc(u.name)}" data-user="${esc(u.username)}" ${busy ? 'disabled' : ''}>🔑 Buat Kode Reset Password</button>
            ${rc ? `<div class="ap-reset-box">
              <div class="ap-reset-head"><span>Kode Reset Sekali Pakai</span><small>Berlaku ${esc(rc.expiresMinutes || 30)} menit</small></div>
              <div class="ap-reset-code">${esc(rc.code)}</div>
              <div class="ap-reset-actions">
                <button type="button" class="ap-copy-btn primary" data-ap-copydm="${esc(u.id)}">📋 Salin Pesan DM</button>
                <button type="button" class="ap-copy-btn" data-ap-copycode="${esc(u.id)}">Salin Kode</button>
              </div>
            </div>` : ''}
            <button type="button" class="ap-danger" data-ap-del="${esc(u.id)}" data-name="${esc(u.name)}" ${busy ? 'disabled' : ''}>🗑️ Hapus pengguna</button>`}
        </div>` : ''}</article>`;
    };

    /* ───── Aktivitas ───── */
    const LBL = { login: ['↪', 'Login', 'login'], logout: ['↩', 'Logout', 'logout'], role_changed: ['⚙️', 'Role diubah', 'role'], question_edited: ['✏️', 'Edit soal', 'edit'], admin_reset_code: ['🔑', 'Kode reset dibuat', 'role'], password_reset: ['🔐', 'Password direset', 'login'] };
    const actExtra = a => {
      if (a.action === 'role_changed') {
        const m = a.metadata || {};
        const parts = [];
        if (m.targetUsername) parts.push(`@${m.targetUsername}`);
        if (m.from && m.to && m.from !== m.to) parts.push(`${m.from} → ${m.to}`);
        if (typeof m.mentorTo === 'boolean' && m.mentorFrom !== m.mentorTo) parts.push(`Tempat bertanya: ${m.mentorTo ? 'aktif' : 'nonaktif'}`);
        return parts.length ? `<span class="ap-chg">${esc(parts.join(' • '))}</span>` : '';
      }
      if (a.action === 'admin_reset_code' && a.metadata?.targetUsername) {
        return `<span class="ap-chg">@${esc(a.metadata.targetUsername)} • berlaku ${esc(a.metadata.expiresMinutes || 30)}m</span>`;
      }
      if (a.action === 'password_reset') {
        return '<span class="ap-chg">Menggunakan kode reset Admin</span>';
      }
      if (a.action === 'question_edited' && a.metadata?.questionId) {
        return `<span class="ap-chg">${esc(a.metadata.bank || a.metadata.source || 'Bank')} • ${esc(a.metadata.questionId)}</span>`;
      }
      if (a.action === 'login' && a.metadata?.via === 'register') {
        return '<span class="ap-chg">Akun baru mendaftar</span>';
      }
      return '';
    };
    const actsHTML = () => {
      if (S.acts == null) return '<div class="ap-skel"></div><div class="ap-skel"></div><div class="ap-skel"></div>';
      const aq = S.aq.trim().toLowerCase();
      const rows = S.acts.filter(a => {
        const catOk = S.filter === 'all' || (LBL[a.action]?.[2] || 'other') === S.filter;
        if (!catOk) return false;
        if (!aq) return true;
        const hay = `${a.user?.name || ''} ${a.user?.username || ''} ${a.metadata?.username || ''} ${a.metadata?.targetUsername || ''} ${a.metadata?.bank || ''} ${a.metadata?.questionId || ''}`.toLowerCase();
        return hay.includes(aq);
      });
      const hasLoginLogs = S.acts.some(a => a.action === 'login' || a.action === 'logout');
      const chips = [['all', 'Semua'], ['login', '↪ Login'], ['logout', '↩ Logout'], ['role', '⚙️ Role'], ['edit', '✏️ Edit Soal']];
      let last = '', html = '';
      rows.forEach(a => {
        const d = dayKey(a.createdAt); if (d !== last) { html += `<div class="ap-day">${esc(d)}</div>`; last = d; }
        const l = LBL[a.action] || ['•', a.action, 'other'];
        const uname = a.user?.username || a.metadata?.username || '-';
        const extra = actExtra(a);
        html += `<article class="ap-act k-${l[2]}"><span class="ap-act-ico" aria-hidden="true">${l[0]}</span><div class="ap-act-main"><b>${esc(a.user?.name || 'Akun dihapus')}</b><small>@${esc(uname)} • ${esc(l[1])}</small>${extra}</div><time>${hm(a.createdAt)}</time></article>`;
      });
      return `<div class="ap-searchbox"><input type="search" data-ap-aq placeholder="Cari aktivitas, username, atau soal…" value="${esc(S.aq)}" autocomplete="off" aria-label="Cari aktivitas"></div>
        <div class="ap-chips" role="group" aria-label="Filter aktivitas">${chips.map(([k, l]) => `<button type="button" data-ap-filter="${k}" class="${S.filter === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        <div class="ap-count">${rows.length} aktivitas</div>
        <div class="ap-list">${rows.length ? html : '<div class="ap-empty"><span>🍃</span>Belum ada aktivitas.</div>'}</div>
        <button type="button" class="ap-danger ghost" data-ap-reset ${hasLoginLogs ? '' : 'disabled'}>Reset riwayat login/logout</button>
        <p class="ap-note">Menampilkan 200 aktivitas terbaru. Login/logout admin tidak dicatat di sini. Riwayat perubahan role &amp; edit soal tidak ikut terhapus saat reset.</p>`;
    };

    const draw = () => {
      const body = $('[data-ap-body]'), nextBodyHtml = S.tab === 'users' ? usersHTML() : actsHTML();
      if (nextBodyHtml !== S.lastBodyHtml) {
        S.lastBodyHtml = nextBodyHtml;
        const keepQ = document.activeElement?.matches?.('[data-ap-q]'), keepAQ = document.activeElement?.matches?.('[data-ap-aq]');
        body.innerHTML = nextBodyHtml;
        if (keepQ) { const e = body.querySelector('[data-ap-q]'); e?.focus(); e?.setSelectionRange(e.value.length, e.value.length); }
        else if (keepAQ) { const e = body.querySelector('[data-ap-aq]'); e?.focus(); e?.setSelectionRange(e.value.length, e.value.length); }
      }
      stats();
    };
    const loadUsers = async () => { try { S.users = (await request('/api/admin/users')).users || []; } catch (e) { S.users = S.users || []; msg(e.message || 'Gagal memuat pengguna.', true); } };
    const loadActs = async () => { try { S.acts = (await request('/api/admin/activity')).activities || []; } catch (e) { S.acts = S.acts || []; msg(e.message || 'Gagal memuat aktivitas.', true); } };
    const refresh = async () => {
      const btn = $('[data-ap-refresh]');
      if (btn) btn.classList.add('spin');
      await Promise.all([loadUsers(), loadActs()]);
      if (btn) btn.classList.remove('spin');
      draw();
    };
    const copyText = async (text, okMsg) => {
      try {
        await navigator.clipboard.writeText(text);
        msg(okMsg);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); msg(okMsg); } catch { msg('Gagal menyalin otomatis. Salin manual ya.', true); }
        ta.remove();
      }
    };

    host.addEventListener('click', async e => {
      const t = e.target.closest('button'); if (!t || !host.contains(t)) return;
      if (t.hasAttribute('data-ap-refresh')) { if (!S.refreshing) { S.refreshing = true; refresh().finally(() => { S.refreshing = false; }); } return; }
      if (t.dataset.apTab) { S.tab = t.dataset.apTab; host.querySelectorAll('[data-ap-tab]').forEach(b => b.classList.toggle('on', b === t)); draw(); return; }
      if (t.dataset.apRole) { S.role = t.dataset.apRole; draw(); return; }
      if (t.dataset.apSort) { S.sort = t.dataset.apSort; draw(); return; }
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
      if (t.dataset.apResetcode) {
        const id = t.dataset.apResetcode, name = t.dataset.name || 'Pengguna', username = t.dataset.user || '';
        if (!(await confirm({ title: `Buat kode reset untuk ${name}?`, text: `Kode sekali pakai berlaku 30 menit untuk akun @${username}. Kode sebelumnya (jika ada) akan diganti.`, ok: 'Ya, buat kode' }))) return;
        S.busy.add(id); draw();
        try {
          const d = await request(`/api/admin/users/${encodeURIComponent(id)}/reset-code`, { method: 'POST', body: JSON.stringify({}) });
          S.resetCodes[id] = { code: d.code, expiresMinutes: d.expiresMinutes || 30, username: d.username || username, name: d.name || name };
          msg(`Kode reset untuk @${d.username || username} siap dikirim via DM @clined.id.`);
          await loadActs();
        } catch (err) { msg(err.message || 'Gagal membuat kode reset.', true); }
        finally { S.busy.delete(id); draw(); }
        return;
      }
      if (t.dataset.apCopydm) {
        const rc = S.resetCodes[t.dataset.apCopydm];
        if (!rc) return;
        const dm = `Halo ${rc.name} (@${rc.username}), ini kode reset password CLINED kamu:\n\n${rc.code}\n\nMasukkan kode tersebut di menu "Lupa password?" pada halaman Login CLINED. Kode berlaku ${rc.expiresMinutes} menit dan hanya bisa dipakai 1 kali ya.`;
        copyText(dm, 'Pesan DM siap tempel ke Instagram!');
        return;
      }
      if (t.dataset.apCopycode) {
        const rc = S.resetCodes[t.dataset.apCopycode];
        if (!rc) return;
        copyText(rc.code, `Kode ${rc.code} disalin!`);
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
        if (!(await confirm({ title: 'Reset semua riwayat login/logout?', text: 'Riwayat perubahan role & edit soal tidak akan dihapus.', ok: 'Ya, reset', tone: 'danger' }))) return;
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
    host.addEventListener('input', e => {
      if (e.target.matches('[data-ap-q]')) { S.q = e.target.value; draw(); }
      else if (e.target.matches('[data-ap-aq]')) { S.aq = e.target.value; draw(); }
    });

    draw(); refresh();
    let tick = 0;
    S.timer = setInterval(() => {
      if (!host.isConnected) return clearInterval(S.timer);
      if (document.hidden) return;
      tick++;
      if (S.tab === 'users') loadUsers().then(draw);
      else if (S.tab === 'acts' && tick % 3 === 0) loadActs().then(draw);
    }, 20000);
    document.addEventListener('visibilitychange', () => {
      if (!host.isConnected || document.hidden) return;
      (S.tab === 'users' ? loadUsers() : loadActs()).then(draw);
    });
    return { refresh };
  }
  window.CLINED_ADMIN_PEOPLE = { mount };
})();
