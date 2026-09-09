/* Admin content controls: UAB JSON import + UPI advanced question creator. */
(() => {
  const request = async (path, options = {}) => {
    const r = await fetch(path, { credentials:'same-origin', headers:{'Content-Type':'application/json', ...(options.headers||{})}, ...options });
    const text = await r.text(); let d={}; try { d=text?JSON.parse(text):{}; } catch {}
    if (!r.ok) throw Error(d.error || `Permintaan gagal (${r.status}).`);
    return d;
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const message = (host,text,bad=false) => { const out=host.querySelector('[data-content-message]'); if(out){out.textContent=text;out.classList.toggle('is-error',bad);} };
  const UAB_BLOCKS = [
    ['BM1','BM1'],['BM2','BM2'],['HNC','HNC'],['MP1','MP1'],['MP2','MP2'],['MPT','MPT'],
    ['MUSKULOSKELETAL','Muskuloskeletal'],['RESPIRATORY','Respiratory'],['KARDIOLOGI','Kardiologi'],['HEMATOLOGI','Hematologi'],['GIT','GIT'],['FORENSIK','Forensik'],
    ['GINJAL','Ginjal'],['ENDOKRINE','Endokrin'],['REPRODUKSI','Reproduksi'],['SSP','SSP'],['PANCA INDRA','Panca Indra'],['KEDKOM','KEDKOM'],['KEDKEL','KEDKEL'],['MULSIS','Mulsis']
  ];
  const UPI_BLOCKS = [
    ['BM1','BM1'],['BM2','BM2'],['HNC','HNC'],['MP1','MP1'],['MP2','MP2'],['MPT','MPT'],
    ['MUSKULOSKELETAL','Muskuloskeletal'],['RESPIRATORY','Respiratory'],['KARDIOLOGI','Kardiologi'],['HEMATOLOGI','Hematologi'],['GIT','Gastrointestinal'],['FORENSIK','Forensik'],
    ['GINJAL','Ginjal'],['ENDOKRINE','Endokrin'],['REPRODUKSI','Reproduksi'],['SSP','SSP'],['PANCA INDRA','Panca Indra'],['KEDKOM','Kedokteran Komunitas'],['KEDKEL','Kedokteran Keluarga'],['MULSIS','Mulsis']
  ];
  const blockOptions = list => list.map(([value,label])=>`<option value="${esc(value)}">${esc(label)}</option>`).join('');

  function removeAdminControls(){ ['adminContentWorkspace','adminLoginsPanel'].forEach(id=>document.getElementById(id)?.remove()); }

  function parseUabJson(raw){
    let parsed; try { parsed=JSON.parse(raw); } catch { throw Error('File JSON tidak valid.'); }
    if(Array.isArray(parsed)) return parsed;
    if(parsed && Array.isArray(parsed.questions)) return parsed.questions;
    if(parsed && Array.isArray(parsed.data)) return parsed.data;
    throw Error('Format JSON tidak dikenali. Gunakan array soal atau object dengan properti "questions".');
  }

  function imageToDataUrl(file){
    if(!file) return Promise.reject(Error('Pilih gambar terlebih dahulu.'));
    if(!file.type.startsWith('image/')) return Promise.reject(Error('File harus berupa gambar.'));
    if(file.size>8*1024*1024) return Promise.reject(Error('Ukuran gambar maksimal 8 MB.'));
    if(typeof window.upiReadImageAsDataUrl==='function') return window.upiReadImageAsDataUrl(file);
    return new Promise((resolve,reject)=>{const r=new FileReader();r.onerror=()=>reject(Error('Gagal membaca gambar.'));r.onload=()=>resolve(r.result);r.readAsDataURL(file);});
  }

  function install(user){
    if(!user || user.role!=='admin'){ removeAdminControls(); return; }
    window.CLINED_CURRENT_USER_ID = user.id;
    const account=document.querySelector('#accountPage .account-form'); if(!account) return;

    if(!document.getElementById('adminContentWorkspace')){
      const box=document.createElement('section'); box.id='adminContentWorkspace'; box.className='account-auth-card admin-content-workspace';
      box.innerHTML=`
        <div class="account-auth-top"><div><span class="account-auth-kicker">ADMIN • CONTENT MANAGER</span><h3>Kelola Konten</h3><p>UAB dan UPI dipisahkan supaya alur input sesuai jenis kontennya.</p></div><span class="account-security-badge secure">ADMIN</span></div>
        <div class="admin-content-tabs" role="tablist" aria-label="Jenis konten admin">
          <button type="button" class="admin-panel-tab selected" data-content-tab="uab">UAB</button>
          <button type="button" class="admin-panel-tab" data-content-tab="upi">UPI</button>
        </div>

        <div data-content-panel="uab">
          <div class="admin-content-intro"><b>Import Bank Soal UAB</b><span>Upload JSON yang sudah terformat, lalu tentukan soal masuk ke blok mana.</span></div>
          <form data-admin-uab-form class="admin-content-form">
            <label>Blok tujuan</label><select name="block" required>${blockOptions(UAB_BLOCKS)}</select>
            <label>Judul paket <small>(opsional)</small></label><input name="title" maxlength="160" placeholder="Contoh: UAB KEDKOM 2026">
            <label>File JSON</label><div class="admin-file-picker"><input id="adminUabJsonFile" name="file" type="file" accept=".json,application/json" required hidden><label for="adminUabJsonFile" class="admin-file-btn" role="button">Pilih file JSON</label><span class="admin-file-selected" data-uab-file-meta>Belum ada file dipilih.</span></div>
            
            <button class="account-action account-save" type="submit">Import ke Blok UAB</button>
            <p class="muted" data-content-message></p>
          </form>
        </div>

        <div data-content-panel="upi" hidden>
          <div class="admin-content-intro"><b>Create Question UPI</b><span>Mode advanced untuk admin: pilih blok, materi, gambar, pertanyaan, jawaban, lalu publikasikan ke semua pengguna.</span></div>
          <form data-admin-upi-form class="admin-content-form">
            <label>Blok tujuan</label><select name="block" required>${blockOptions(UPI_BLOCKS)}</select>
            <label>Materi</label><select name="material" required><option value="Histology">Histology</option><option value="Patologi Anatomi">Patologi Anatomi</option></select>
            <label>Judul/topik <small>(opsional)</small></label><input name="title" maxlength="160" placeholder="Contoh: Histology — Jaringan epitel">
            <label>Gambar soal</label><div class="admin-file-picker"><input id="adminUpiImageFile" name="image" type="file" accept="image/*" required hidden><label for="adminUpiImageFile" class="admin-file-btn" role="button">Pilih gambar</label><span class="admin-file-selected" data-upi-file-meta>Belum ada gambar dipilih.</span></div>
            <div class="upi-create-preview admin-upi-preview" data-admin-upi-preview hidden><img alt="Preview gambar"></div>
            <label>Question</label><textarea name="question" rows="4" maxlength="1000" placeholder="Tulis pertanyaan…" required></textarea>
            <label>Answer</label><textarea name="answer" rows="4" maxlength="1000" placeholder="Tulis jawaban…" required></textarea>
            <button class="account-action account-save" type="submit">Publikasikan Question UPI</button>
            <p class="muted" data-content-message></p>
          </form>
        </div>

        <div class="admin-materials-section">
          <div class="admin-content-intro"><b>Link Materi UAB per Blok</b><span>Atur link materi yang akan muncul pada tombol MATERI di setiap blok.</span></div>
          <form data-admin-material-form class="admin-content-form admin-material-form">
            <label>Blok tujuan</label><select name="block" required>${blockOptions(UAB_BLOCKS)}</select>
            <label>Link materi</label><input name="url" type="url" inputmode="url" placeholder="https://..." required>
            <div class="admin-material-current" data-material-current>Belum ada link tersimpan.</div>
            <div class="admin-material-actions"><button class="account-action account-save" type="submit">Simpan Link Materi</button><button class="admin-delete-btn danger clined-compact-action" data-delete-material type="button">Hapus Link</button></div>
            <p class="muted" data-material-message></p>
          </form>
        </div>`;
      account.append(box);

      const materialForm=box.querySelector('[data-admin-material-form]'), materialCurrent=box.querySelector('[data-material-current]'), materialMessage=box.querySelector('[data-material-message]'), materialDelete=box.querySelector('[data-delete-material]');
      let materialMap={};
      const loadMaterials=async()=>{try{const d=await request('/api/materials');materialMap=Object.fromEntries((d.materials||[]).map(x=>[String(x.block).toUpperCase(),x.url]));const b=materialForm.elements.block.value.toUpperCase(),url=materialMap[b]||'';materialForm.elements.url.value=url;materialCurrent.textContent=url?`Tersimpan: ${url}`:'Belum ada link tersimpan.';}catch(e){materialMessage.textContent=e.message||'Gagal memuat link materi.';}};
      materialForm.elements.block.addEventListener('change',loadMaterials);
      materialForm.addEventListener('submit',async e=>{e.preventDefault();try{const block=materialForm.elements.block.value,url=materialForm.elements.url.value.trim();const d=await request(`/api/admin/materials/${encodeURIComponent(block)}`,{method:'PUT',body:JSON.stringify({url})});materialMessage.textContent=d.message||'Link materi tersimpan.';await loadMaterials();await hydrateMaterials();}catch(e){materialMessage.textContent=e.message||'Gagal menyimpan link materi.';}});
      materialDelete.addEventListener('click',async()=>{const block=materialForm.elements.block.value;if(!confirm(`Hapus link materi ${block}?`))return;try{const d=await request(`/api/admin/materials/${encodeURIComponent(block)}`,{method:'DELETE'});materialMessage.textContent=d.message||'Link materi dihapus.';await loadMaterials();await hydrateMaterials();}catch(e){materialMessage.textContent=e.message||'Gagal menghapus link materi.';}});
      loadMaterials();

      const uabForm=box.querySelector('[data-admin-uab-form]'), uabFile=uabForm.elements.file, uabMeta=box.querySelector('[data-uab-file-meta]');
      uabFile.addEventListener('change',()=>{const f=uabFile.files?.[0];uabMeta.textContent=f?`${f.name} • ${(f.size/1024).toFixed(1)} KB`:'Belum ada file dipilih.';});
      uabForm.addEventListener('submit',async e=>{
        e.preventDefault(); const f=uabForm.elements.file.files?.[0]; if(!f){message(box,'Pilih file JSON terlebih dahulu.',true);return;}
        try{
          const raw=await f.text(); const questions=parseUabJson(raw); const block=uabForm.elements.block.value;
          if(!Array.isArray(questions)||!questions.length) throw Error('File JSON tidak berisi soal.');
          const title=(uabForm.elements.title.value.trim()||`UAB ${block} — ${f.name.replace(/\.json$/i,'')}`).slice(0,160);
          const normalized=questions.map((q,i)=>({...q,id:String(q?.id||`${block.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-${i+1}`)}));
          const validation=window.CLINED_BANK_ENGINE?.validateBank?.(normalized); if(validation && !validation.ok) throw Error(validation.errors.slice(0,4).join(' '));
          const data=await request('/api/content/packages',{method:'POST',body:JSON.stringify({module:'UAB',title,block,questions:normalized})});
          message(box,`${data.package?.title||title} berhasil diimport ke blok ${block} (${normalized.length} soal).`); uabForm.reset(); uabMeta.textContent='Belum ada file dipilih.';
          await hydrateUab();
        }catch(err){message(box,err.message||'Import UAB gagal.',true);}
      });

      const upiForm=box.querySelector('[data-admin-upi-form]'), upiImage=upiForm.elements.image, upiPreview=box.querySelector('[data-admin-upi-preview]'), upiFileMeta=box.querySelector('[data-upi-file-meta]');
      upiImage.addEventListener('change',()=>{const f=upiImage.files?.[0];upiFileMeta.textContent=f?`${f.name} • ${(f.size/1024).toFixed(1)} KB`:'Belum ada gambar dipilih.';if(!f){upiPreview.hidden=true;return;}upiPreview.innerHTML=`<img alt="Preview gambar" src="${esc(URL.createObjectURL(f))}">`;upiPreview.hidden=false;});
      upiForm.addEventListener('submit',async e=>{
        e.preventDefault(); const f=upiForm.elements.image.files?.[0];
        try{
          const block=upiForm.elements.block.value, material=upiForm.elements.material.value, question=upiForm.elements.question.value.trim(), answer=upiForm.elements.answer.value.trim();
          if(!f||!question||!answer) throw Error('Lengkapi gambar, question, dan answer.');
          const image=await imageToDataUrl(f), id=`admin-upi-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
          const title=(upiForm.elements.title.value.trim()||`${material} — ${block}`).slice(0,160);
          const q={id,soal:question,opsi:['Benar','Salah'],jawabanBenar:0,pembahasan:answer,image,material};
          const data=await request('/api/content/packages',{method:'POST',body:JSON.stringify({module:'UPI',title,block,questions:[q]})});
          message(box,`Question berhasil dipublikasikan ke UPI • ${block}.`); upiForm.reset(); upiPreview.hidden=true; await hydrateUpi();
        }catch(err){message(box,err.message||'Publikasi UPI gagal.',true);}
      });

      box.querySelectorAll('[data-content-tab]').forEach(tab=>tab.addEventListener('click',()=>{
        box.querySelectorAll('[data-content-tab]').forEach(x=>x.classList.toggle('selected',x===tab));
        box.querySelectorAll('[data-content-panel]').forEach(p=>p.hidden=p.dataset.contentPanel!==tab.dataset.contentTab);
      }));
    }

    if(!document.getElementById('adminLoginsPanel')){
      const logins=document.createElement('section'); logins.id='adminLoginsPanel'; logins.className='account-auth-card';
      logins.innerHTML=`<div class="account-auth-top"><div><span class="account-auth-kicker">ADMIN • AKTIVITAS & PENGGUNA</span><h3>Aktivitas akun & role</h3><p>Riwayat login/logout dan perubahan role pengguna.</p></div><span class="account-security-badge secure" data-activity-count>0</span></div><div class="admin-panel-tabs" role="tablist"><button type="button" class="admin-panel-tab selected" data-admin-tab="activity">Aktivitas</button><button type="button" class="admin-panel-tab" data-admin-tab="users">Pengguna <span class="admin-tab-count" data-user-count>0</span></button></div><div data-admin-panel="activity"><div class="admin-activity-toolbar"><button type="button" class="admin-delete-btn danger clined-compact-action" data-reset-activity>Reset aktivitas login/logout</button></div><div data-activity-list class="muted">Memuat…</div></div><p class="muted" data-content-message></p><div data-admin-panel="users" hidden><div class="admin-users-scroll"><div data-users-list class="muted">Memuat…</div></div></div>`;
      account.append(logins);
      const renderActivity=async()=>{const list=logins.querySelector('[data-activity-list]'),badge=logins.querySelector('[data-activity-count]');try{const d=await request('/api/admin/activity');const rows=d.activities||[];badge.textContent=rows.length;const userCount=Number(d.userCount||0);const userCountEl=logins.querySelector('[data-user-count]');if(userCountEl)userCountEl.textContent=userCount;const labels={login:'Login',logout:'Logout',role_changed:'Role diubah'};list.innerHTML=rows.length?`<div class="admin-activity-list">${rows.map(a=>`<article class="admin-activity-row"><div class="admin-activity-icon">${a.action==='login'?'↪':a.action==='logout'?'↩':'⚙'}</div><div class="admin-activity-main"><b>${esc(a.user?.name||'Akun dihapus')} <small>@${esc(a.user?.username||'-')}</small></b><span>${labels[a.action]||esc(a.action)}${a.action==='role_changed'&&a.metadata?.to?` • ${esc(a.metadata.from||'—')} → ${esc(a.metadata.to)}`:''}</span></div><time>${new Date(a.createdAt).toLocaleString('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</time></article>`).join('')}</div>`:'<p class="muted">Belum ada aktivitas akun.</p>';}
catch(e){list.textContent=e.message||'Gagal memuat aktivitas.';}};
      logins.querySelector('[data-reset-activity]').addEventListener('click',async()=>{if(!confirm('Reset semua aktivitas login/logout? Riwayat perubahan role tidak akan dihapus.'))return;const btn=logins.querySelector('[data-reset-activity]');btn.disabled=true;try{const d=await request('/api/admin/activity',{method:'DELETE',body:JSON.stringify({})});message(logins,d.message||'Aktivitas berhasil direset.');await renderActivity();}catch(e){message(logins,e.message||'Reset aktivitas gagal.',true);}finally{btn.disabled=false;}});
      const renderUsers=async()=>{const list=logins.querySelector('[data-users-list]');try{const d=await request('/api/admin/users');const users=d.users||[];const userCountEl=logins.querySelector('[data-user-count]');if(userCountEl)userCountEl.textContent=users.length;list.innerHTML=users.length?`<div class="admin-users-list">${users.map(u=>`<div class="admin-user-row"><div><b>${esc(u.name)}</b><small>@${esc(u.username)}${u.lastLoginAt?` • login terakhir ${new Date(u.lastLoginAt).toLocaleString('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}`:''}</small></div><div class="admin-user-actions"><select class="admin-role-select" data-role-user="${esc(u.id)}"><option value="student" ${u.role==='student'?'selected':''}>Student</option><option value="admin" ${u.role==='admin'?'selected':''}>Admin</option></select>${u.id!==window.CLINED_CURRENT_USER_ID?`<button type="button" class="admin-delete-btn danger clined-compact-action" data-delete-user="${esc(u.id)}">Hapus</button>`:''}</div></div>`).join('')}</div>`:'<p class="muted">Belum ada pengguna.</p>';
      list.querySelectorAll('[data-delete-user]').forEach(btn=>btn.addEventListener('click',async()=>{if(!confirm('Hapus pengguna ini? Data akun yang tersimpan akan dihapus. Konten publik yang dibuat akun ini tetap dipertahankan.'))return;btn.disabled=true;try{const d=await request(`/api/admin/users/${encodeURIComponent(btn.dataset.deleteUser)}`,{method:'DELETE'});message(logins,d.message||'Pengguna berhasil dihapus.');await renderUsers();await renderActivity();}catch(e){message(logins,e.message||'Pengguna gagal dihapus.',true);}finally{btn.disabled=false;}}));list.querySelectorAll('[data-role-user]').forEach(sel=>sel.addEventListener('change',async()=>{const old=sel.dataset.previous||sel.value;sel.disabled=true;try{const d=await request(`/api/admin/users/${encodeURIComponent(sel.dataset.roleUser)}/role`,{method:'PATCH',body:JSON.stringify({role:sel.value})});message(logins,d.message||'Role berhasil diperbarui.');await renderActivity();await renderUsers();}catch(e){sel.value=old;message(logins,e.message||'Role gagal diperbarui.',true);}finally{sel.disabled=false;}}));list.querySelectorAll('.admin-role-select').forEach(s=>s.dataset.previous=s.value);}catch(e){list.textContent=e.message||'Gagal memuat pengguna.';}};
      logins.querySelectorAll('[data-admin-tab]').forEach(tab=>tab.addEventListener('click',async()=>{logins.querySelectorAll('[data-admin-tab]').forEach(x=>x.classList.toggle('selected',x===tab));logins.querySelectorAll('[data-admin-panel]').forEach(x=>x.hidden=x.dataset.adminPanel!==tab.dataset.adminTab);if(tab.dataset.adminTab==='users')await renderUsers();}));
      renderActivity(); setInterval(renderActivity,60000);
    }
  }

  async function hydrateMaterials(){try{const d=await request('/api/materials');const map=Object.fromEntries((d.materials||[]).map(x=>[String(x.block).toLowerCase(),x.url]));document.querySelectorAll('[data-external-material]').forEach(a=>{const section=a.closest('[data-block-key]');if(!section)return;const block=String(section.dataset.blockKey||'').toLowerCase();if(map[block])a.href=map[block];a.target='_blank';a.rel='noopener noreferrer';});}catch(e){console.warn('Material links unavailable',e);}}
  async function hydrateGlobalBanks(){try{const catalog=await request('/api/banks');for(const item of catalog.banks||[]){try{const d=await request(`/api/banks/${encodeURIComponent(item.id)}`),b=d.bank;if(b&&Array.isArray(b.questions)&&b.questions.length)window.CLINED_BANK_ENGINE?.registerBank({id:b.id,name:b.name,block:b.block,version:b.version,schema:b.schema_version,data:b.questions},{persist:true,source:'server-global'});}catch(e){console.warn('Global bank sync failed:',item?.id,e);}}window.renderBanks?.();window.renderCounts?.();}catch(e){console.warn('Global bank catalog unavailable',e);}}
  async function hydrateUpi(){try{const data=await request('/api/content/packages?module=UPI'),existing=window.upiGetCustomCards?.()||[],known=new Set(existing.map(c=>c.id));const fallback='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="640" height="360"%3E%3Crect width="100%25" height="100%25" fill="%23007aff"/%3E%3Ctext x="50%25" y="50%25" fill="white" font-size="32" text-anchor="middle" dominant-baseline="middle"%3EUPI%3C/text%3E%3C/svg%3E';const additions=[];for(const p of data.packages||[])for(const q of p.questions||[]){const id=`server-upi-${p.id}-${q.id}`;if(!known.has(id))additions.push({id,block:p.block||'SSP',material:q.material||'Histology',topic:p.title,image:q.image||fallback,prompt:q.soal,answer:q.pembahasan||q.answer||'Tidak ada pembahasan.',explanation:p.visibility==='public'?'Paket UPI publik.':'Paket UPI pribadi.'});}if(additions.length&&window.upiSaveCustomCards){window.upiSaveCustomCards(existing.concat(additions));window.upiRenderBlockSelector?.();}}catch(e){console.warn('UPI sync failed',e);}}
  async function hydrateUab(){try{const data=await request('/api/content/packages?module=UAB');for(const p of data.packages||[])try{window.CLINED_BANK_ENGINE?.registerBank({id:`server-uab-${p.id}`,name:p.title,block:p.block||'UAB',version:1,schema:p.schema_version||'1.0',data:p.questions},{persist:true,source:'server-admin'});}catch{}window.renderBanks?.();window.renderCounts?.();}catch(e){console.warn('UAB sync failed',e);}}
  async function boot(){try{const d=await request('/api/auth/me');if(d.user){install(d.user);await Promise.all([hydrateMaterials(),hydrateGlobalBanks(),hydrateUpi(),hydrateUab()]);}else removeAdminControls();}catch(e){removeAdminControls();}}
  window.addEventListener('load',boot,{once:true}); setInterval(boot,15000);
})();
