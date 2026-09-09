/* Adds role-aware content controls without replacing CLINED's learning UI. */
(() => {
  const request = async (path, options = {}) => { const r = await fetch(path, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(options.headers||{}) }, ...options }); const text = await r.text(); let d={}; try { d=text?JSON.parse(text):{}; } catch { d={}; } if (!r.ok) throw Error(d.error || `Permintaan gagal (${r.status}).`); return d; };
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const message = (host, text, bad = false) => { const out = host.querySelector('[data-content-message]'); if (out) { out.textContent = text; out.style.color = bad ? '#ff3b30' : ''; } };
  function removeAdminControls() {
    ['adminUabComposer','adminPublicPackageComposer','adminLoginsPanel'].forEach(id => document.getElementById(id)?.remove());
  }
  function install(user) {
    if (!user || user.role !== 'admin') { removeAdminControls(); return; }
    if (user.role === 'admin' && !document.getElementById('adminUabComposer')) {
      const account = document.querySelector('#accountPage .account-form'); if (!account) return;
      const box = document.createElement('section'); box.id = 'adminUabComposer'; box.className = 'account-auth-card';
      box.innerHTML = `<div class="account-auth-top"><div><span class="account-auth-kicker">ADMIN • KONTEN GLOBAL</span><h3>Kelola Soal untuk Semua Pengguna</h3><p>Perubahan bank global disimpan di Neon. Pengguna lain akan menerima versi terbaru saat membuka/memuat ulang CLINED.</p></div><span class="account-security-badge secure">ADMIN</span></div>
      <form data-global-bank-form><label>Bank soal global</label><select name="bank" required></select><label>Daftar soal (JSON)</label><textarea name="questions" rows="12" required placeholder='[{"id":"q-001","soal":"...","opsi":["A","B"],"jawabanBenar":0,"pembahasan":"..."}]'></textarea><button class="account-action account-save" type="submit">Update untuk Semua Pengguna</button><p class="muted" data-content-message></p></form>`;
      account.append(box);
      const form=box.querySelector('form'), select=form.elements.bank, textarea=form.elements.questions;
      const loadBanks=async()=>{try{const data=await request('/api/admin/banks');select.innerHTML=(data.banks||[]).map(b=>`<option value="${b.id}">${b.name} • v${b.version}</option>`).join(''); const b=data.banks?.[0]; if(b)textarea.value=JSON.stringify(b.questions||[],null,2);}catch(e){message(box,e.message||'Bank admin gagal dimuat.',true);}};
      select.addEventListener('change',async()=>{try{const data=await request('/api/admin/banks');const b=(data.banks||[]).find(x=>x.id===select.value);textarea.value=JSON.stringify(b?.questions||[],null,2);}catch(e){message(box,e.message||'Bank gagal dimuat.',true);}});
      form.addEventListener('submit',async event=>{event.preventDefault();try{const questions=JSON.parse(textarea.value);const data=await request(`/api/admin/banks/${encodeURIComponent(select.value)}`,{method:'PATCH',body:JSON.stringify({questions})});message(box,`${data.bank.name} v${data.bank.version} berhasil diperbarui untuk semua pengguna.`);await hydrateGlobalBanks();await loadBanks();}catch(error){message(box,error.message||'Format soal tidak valid.',true);}});
      loadBanks();

      const legacy = document.createElement('section'); legacy.id='adminPublicPackageComposer'; legacy.className='account-auth-card'; legacy.innerHTML=`<div class="account-auth-top"><div><span class="account-auth-kicker">ADMIN • PAKET PUBLIK</span><h3>Input Paket UAB / UPI</h3><p>Paket tambahan publik tersimpan di server dan tersedia bagi seluruh pengguna.</p></div><span class="account-security-badge secure">ADMIN</span></div><form data-uab-form><label>Modul</label><select name="module"><option value="UAB">UAB — ujian akhir blok</option><option value="UPI">UPI — katalog publik</option></select><label>Judul paket</label><input name="title" maxlength="160" required placeholder="UAB SSP 2026"><label>Blok</label><input name="block" maxlength="80" required placeholder="SSP"><label>Daftar soal (JSON)</label><textarea name="questions" rows="8" required placeholder='[{"id":"uab-ssp-001","soal":"...","opsi":["A","B"],"jawabanBenar":0,"pembahasan":"..."}]'></textarea><button class="account-action account-save" type="submit">Publikasikan Paket</button><p class="muted" data-content-message></p></form>`; account.append(legacy);
      legacy.querySelector('form').addEventListener('submit',async event=>{event.preventDefault();const f=new FormData(event.currentTarget),module=f.get('module');try{await request('/api/content/packages',{method:'POST',body:JSON.stringify({module,title:f.get('title'),block:f.get('block'),questions:JSON.parse(f.get('questions'))})});event.currentTarget.reset();message(legacy,`${module} berhasil dipublikasikan untuk seluruh pengguna.`);}catch(error){message(legacy,error.message||'Format paket tidak valid.',true);}});

      const logins = document.createElement('section'); logins.id='adminLoginsPanel'; logins.className='account-auth-card';
      logins.innerHTML = `<div class="account-auth-top"><div><span class="account-auth-kicker">ADMIN • AKTIVITAS & PENGGUNA</span><h3>Aktivitas akun & role</h3><p>Riwayat login/logout dan perubahan role terbaru. Kamu juga bisa mengganti role akun pengguna dari sini.</p></div><span class="account-security-badge secure" data-activity-count>0</span></div>
      <div class="admin-panel-tabs" role="tablist" aria-label="Admin activity views">
        <button type="button" class="admin-panel-tab selected" data-admin-tab="activity">Aktivitas</button>
        <button type="button" class="admin-panel-tab" data-admin-tab="users">Pengguna</button>
      </div>
      <div data-admin-panel="activity"><div data-activity-list class="muted">Memuat…</div></div><p class="muted" data-content-message></p>
      <div data-admin-panel="users" hidden><div data-users-list class="muted">Memuat…</div></div>`;
      account.append(logins);

      const renderActivity = async () => {
        const list=logins.querySelector('[data-activity-list]'), badge=logins.querySelector('[data-activity-count]');
        try {
          const data=await request('/api/admin/activity');
          const rows=data.activities||[];
          badge.textContent=rows.length;
          const actionLabel={login:'Login',logout:'Logout',role_changed:'Role diubah'};
          list.innerHTML=rows.length
            ? `<div class="admin-activity-list">${rows.map(a=>`<article class="admin-activity-row">
                <div class="admin-activity-icon">${a.action==='login'?'↪':a.action==='logout'?'↩':'⚙'}</div>
                <div class="admin-activity-main"><b>${esc(a.user?.name||'Akun dihapus')} <small>@${esc(a.user?.username||'-')}</small></b>
                <span>${actionLabel[a.action]||esc(a.action)}${a.action==='role_changed'&&a.metadata?.to?` • ${esc(a.metadata.from||'—')} → ${esc(a.metadata.to)}`:''}</span></div>
                <time>${new Date(a.createdAt).toLocaleString('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</time>
              </article>`).join('')}</div>`
            : '<p class="muted">Belum ada aktivitas akun.</p>';
        } catch(e) { list.textContent=e.message||'Gagal memuat aktivitas.'; }
      };

      const renderUsers = async () => {
        const list=logins.querySelector('[data-users-list]');
        try {
          const data=await request('/api/admin/users');
          const users=data.users||[];
          list.innerHTML=users.length
            ? `<div class="admin-users-list">${users.map(u=>`<div class="admin-user-row">
                <div><b>${esc(u.name)}</b><small>@${esc(u.username)}</small></div>
                <select class="admin-role-select" data-role-user="${esc(u.id)}" aria-label="Role @${esc(u.username)}">
                  <option value="student" ${u.role==='student'?'selected':''}>Student</option>
                  <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
                </select>
              </div>`).join('')}</div>`
            : '<p class="muted">Belum ada pengguna yang tercatat.</p>';
          list.querySelectorAll('[data-role-user]').forEach(sel=>sel.addEventListener('change',async()=>{
            const id=sel.dataset.roleUser, role=sel.value;
            sel.disabled=true;
            try {
              const data=await request(`/api/admin/users/${encodeURIComponent(id)}/role`,{method:'PATCH',body:JSON.stringify({role})});
              message(logins, data.message||'Role berhasil diperbarui.');
              await renderActivity(); await renderUsers();
            } catch(e) {
              sel.value=sel.dataset.previous||'student';
              message(logins,e.message||'Role gagal diperbarui.',true);
            } finally { sel.disabled=false; }
          }));
          list.querySelectorAll('.admin-role-select').forEach(s=>s.dataset.previous=s.value);
        } catch(e) { list.textContent=e.message||'Gagal memuat pengguna.'; }
      };

      logins.querySelectorAll('[data-admin-tab]').forEach(tab=>tab.addEventListener('click',async()=>{
        logins.querySelectorAll('[data-admin-tab]').forEach(x=>x.classList.toggle('selected',x===tab));
        logins.querySelectorAll('[data-admin-panel]').forEach(x=>x.hidden=x.dataset.adminPanel!==tab.dataset.adminTab);
        if(tab.dataset.adminTab==='users') await renderUsers();
      }));
      renderActivity(); setInterval(renderActivity,60_000);

    }
  }
  async function hydrateGlobalBanks() {
    const catalog = await request('/api/banks');
    for (const item of catalog.banks || []) {
      try {
        const data = await request(`/api/banks/${encodeURIComponent(item.id)}`);
        const bank = data.bank;
        if (bank && Array.isArray(bank.questions) && bank.questions.length) {
          window.CLINED_BANK_ENGINE?.registerBank({id: bank.id, name: bank.name, block: bank.block, version: bank.version, schema: bank.schema_version, data: bank.questions}, {persist:true, source:'server-global'});
        }
      } catch (e) {
        console.warn('Global bank sync failed:', item?.id, e);
      }
    }
    window.renderBanks?.(); window.renderCounts?.();
  }

  async function hydrateUpi() { const data = await request('/api/content/packages?module=UPI'), existing = window.upiGetCustomCards?.() || []; const known = new Set(existing.map(card => card.id)); const fallbackImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="640" height="360"%3E%3Crect width="100%25" height="100%25" fill="%23007aff"/%3E%3Ctext x="50%25" y="50%25" fill="white" font-size="32" text-anchor="middle" dominant-baseline="middle"%3EUPI%3C/text%3E%3C/svg%3E'; const additions = []; for (const pack of data.packages || []) for (const question of pack.questions || []) { const id = `server-upi-${pack.id}-${question.id}`; if (!known.has(id)) additions.push({ id, block: pack.block || 'SSP', material: 'Imported UPI', topic: pack.title, image: question.image || fallbackImage, prompt: question.soal, answer: question.pembahasan || question.answer || 'Tidak ada pembahasan.', explanation: pack.visibility === 'public' ? 'Paket UPI publik.' : 'Paket UPI pribadi.' }); } if (additions.length && window.upiSaveCustomCards) { window.upiSaveCustomCards(existing.concat(additions)); window.upiRenderBlockSelector?.(); } }
  async function hydrateUab() { const data = await request('/api/content/packages?module=UAB'); for (const pack of data.packages || []) { try { window.CLINED_BANK_ENGINE?.registerBank({ id: `server-uab-${pack.id}`, name: pack.title, block: pack.block || 'UAB', version: 1, schema: pack.schema_version || '1.0', data: pack.questions }, { persist: true, source: 'server-admin' }); } catch {} } window.renderBanks?.(); window.renderCounts?.(); }
  async function boot() { try { const data = await request('/api/auth/me'); if (data.user) { install(data.user); await Promise.all([hydrateGlobalBanks(), hydrateUpi(), hydrateUab()]); } else { removeAdminControls(); } } catch {} }
  window.addEventListener('load', boot, { once: true }); setInterval(boot, 15_000);
})();
