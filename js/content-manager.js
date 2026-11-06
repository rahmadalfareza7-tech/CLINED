/* Admin content controls: UAB JSON import + UPI advanced question creator. */
(() => {
  const request = async (path, options = {}) => {
    const r = await fetch(path, { cache:'no-store', credentials:'same-origin', headers:{'Content-Type':'application/json', ...(options.headers||{})}, ...options });
    const text = await r.text(); let d={}; try { d=text?JSON.parse(text):{}; } catch {}
    if (!r.ok) throw Error(d.error || `Permintaan gagal (${r.status}).`);
    return d;
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const message = (host,text,bad=false) => { const out=host.querySelector('[data-content-panel]:not([hidden]) [data-content-message]')||host.querySelector('[data-content-message]'); if(out){out.textContent=text;out.classList.toggle('is-error',bad);} };
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

  const LETTERS = ['A','B','C','D','E','F'];

  function normalizeRawQuestion(q){
    if(!q || typeof q!=='object') return q;
    // Sudah format standar (punya 'soal' + 'opsi' array) — biarkan apa adanya.
    if(typeof q.soal==='string' && Array.isArray(q.opsi)) return q;
    // Format alternatif: id_soal/pertanyaan/pilihan_jawaban/jawaban_benar/pembahasan_klinis
    if(q.pertanyaan || q.pilihan_jawaban){
      const pj = q.pilihan_jawaban || {};
      const usedLetters = LETTERS.filter(L=>pj[L]!=null && String(pj[L]).trim()!=='');
      const opsi = usedLetters.map(L=>`${L}. ${pj[L]}`);
      const correctLetter = String(q.jawaban_benar||'').trim().toUpperCase();
      const jawabanBenar = usedLetters.indexOf(correctLetter);
      const pembahasanKlinis = q.pembahasan_klinis || {};
      const pembahasanPilihan = usedLetters.map(L=>pembahasanKlinis[L]||'');
      const pembahasan = pembahasanKlinis[correctLetter] || pembahasanPilihan[jawabanBenar] || '';
      return {
        id: String(q.id_soal ?? q.id ?? ''),
        soal: q.pertanyaan || '',
        opsi,
        jawabanBenar,
        pembahasan,
        pembahasanPilihan
      };
    }
    return q;
  }

  function parseUabJson(raw){
    let parsed; try { parsed=JSON.parse(raw); } catch { throw Error('File JSON tidak valid.'); }
    let list;
    if(Array.isArray(parsed)) list=parsed;
    else if(parsed && Array.isArray(parsed.questions)) list=parsed.questions;
    else if(parsed && Array.isArray(parsed.data)) list=parsed.data;
    else throw Error('Format JSON tidak dikenali. Gunakan array soal atau object dengan properti "questions".');
    return list.map(normalizeRawQuestion);
  }

  function imageToDataUrl(file){
    if(!file) return Promise.reject(Error('Pilih gambar terlebih dahulu.'));
    if(!file.type.startsWith('image/')) return Promise.reject(Error('File harus berupa gambar.'));
    if(file.size>8*1024*1024) return Promise.reject(Error('Ukuran gambar maksimal 8 MB.'));
    if(typeof window.upiReadImageAsDataUrl==='function') return window.upiReadImageAsDataUrl(file);
    return new Promise((resolve,reject)=>{const r=new FileReader();r.onerror=()=>reject(Error('Gagal membaca gambar.'));r.onload=()=>resolve(r.result);r.readAsDataURL(file);});
  }

  function install(user){
    const isAdmin = !!user && user.role==='admin';
    const isHelper = !!user && user.role==='helper';
    if(!isAdmin && !isHelper){ removeAdminControls(); return; }
    window.CLINED_CURRENT_USER_ID = user.id;
    const account=document.querySelector('#accountPage .account-form'); if(!account) return;

    if(!document.getElementById('adminContentWorkspace')){
      const box=document.createElement('section'); box.id='adminContentWorkspace'; box.className='account-auth-card admin-content-workspace';
      box.innerHTML=`
        <div class="account-auth-top"><div><span class="account-auth-kicker">${isAdmin?'ADMIN':'HELPER'} • CONTENT MANAGER</span><h3>Kelola Konten</h3><p>UAB dan UPI dipisahkan supaya alur input sesuai jenis kontennya.</p></div><span class="account-security-badge secure">${isAdmin?'ADMIN':'HELPER'}</span></div>
        <div class="admin-content-tabs" role="tablist" aria-label="Jenis konten admin">
          <button type="button" class="admin-panel-tab selected" role="tab" data-content-tab="uab">Import UAB</button>
          <button type="button" class="admin-panel-tab" role="tab" data-content-tab="manage">Kelola soal</button>
          <button type="button" class="admin-panel-tab" role="tab" data-content-tab="latihan">Latihan Materi</button>
          <button type="button" class="admin-panel-tab" role="tab" data-content-tab="upi">UPI</button>
          <button type="button" class="admin-panel-tab" role="tab" data-content-tab="materi">Materi</button>
          <button type="button" class="admin-panel-tab" role="tab" data-content-tab="ninja">Ninja Nerd</button>
          <button type="button" class="admin-panel-tab" role="tab" data-content-tab="reports">Laporan Soal</button>
          <button type="button" class="admin-panel-tab" role="tab" data-content-tab="glossary">Glosarium</button>
          <button type="button" class="admin-panel-tab" role="tab" data-content-tab="usage">Statistik</button>
          <button type="button" class="admin-panel-tab" role="tab" data-content-tab="ann">Pengumuman</button>
          <button type="button" class="admin-panel-tab" role="tab" data-content-tab="items">Analisis Soal</button>
        </div>

        <div class="acm-panel" data-content-panel="glossary" hidden></div>
        <div class="acm-panel" data-content-panel="usage" hidden></div>
        <div class="acm-panel" data-content-panel="ann" hidden></div>

        <div class="acm-panel" data-content-panel="reports" hidden>
          <div class="admin-content-intro"><b>Laporan soal dari mahasiswa</b><span>Soal dengan laporan terbanyak ada di atas. Buka editor untuk memperbaiki kunci atau teks, lalu laporan otomatis ditandai selesai.</span></div>
          <div class="rp-filter" data-rp-filter role="tablist"></div>
          <div data-rp-list class="admin-uab-packages"><p class="muted">Memuat…</p></div>
          <p class="acm-message" data-content-message role="status"></p>
        </div>

        <div class="acm-panel" data-content-panel="items" hidden>
          <div class="admin-content-intro"><b>Analisis butir soal</b><span>Statistik anonim dari semua pengguna. Soal diurutkan dari tingkat salah tertinggi. Tanda ⚠ berarti ada pilihan salah yang lebih sering dipilih daripada kunci, jadi kunci mungkin keliru atau soal ambigu.</span></div>
          <div class="acm-grid">
            <div class="acm-field"><label>Minimal jumlah jawaban</label><select data-items-min><option value="5">5</option><option value="10" selected>10</option><option value="30">30</option><option value="100">100</option></select></div>
            <div class="acm-field"><label>Sumber</label><select data-items-source><option value="">Semua</option><option value="bank">Bank soal</option><option value="mat">Latihan Materi</option></select></div>
          </div>
          <div data-items-list class="admin-uab-packages"><p class="muted">Memuat…</p></div>
        </div>

        <div class="acm-panel" data-content-panel="uab">
          <div class="admin-content-intro"><b>Import bank soal UAB</b><span>Upload JSON yang sudah terformat, lalu tentukan soal masuk ke blok mana.</span></div>
          <form data-admin-uab-form class="admin-content-form acm-form">
            <div class="acm-grid">
              <div class="acm-field"><label>Blok tujuan</label><select name="block" required>${blockOptions(UAB_BLOCKS)}</select></div>
              <div class="acm-field"><label>Judul paket <small>(opsional)</small></label><input name="title" maxlength="160" placeholder="Contoh: UAB KEDKOM 2026"></div>
            </div>
            <div class="acm-field"><label>File JSON</label><div class="admin-file-picker"><input id="adminUabJsonFile" name="file" type="file" accept=".json,application/json" required hidden><label for="adminUabJsonFile" class="admin-file-btn" role="button">Pilih file JSON</label><span class="admin-file-selected" data-uab-file-meta>Belum ada file dipilih.</span></div></div>
            <button class="account-action account-save acm-submit" type="submit">Import ke blok UAB</button>
            <p class="acm-note muted" data-content-message role="status"></p>
          </form>
        </div>

        <div class="acm-panel" data-content-panel="manage" hidden>
          <div class="admin-content-intro"><b>Kelola soal UAB</b><span>Pilih blok, buka bank yang ingin dicek, lalu hapus soal yang salah atau duplikat.</span></div>
          <div class="admin-uab-manage acm-form" data-uab-manage>
            <div class="acm-field"><label>Blok soal</label><select data-uab-delete-block>${blockOptions(UAB_BLOCKS)}</select></div>
            <div data-uab-packages class="admin-uab-packages"><p class="muted">Memuat bank UAB…</p></div>
          </div>
        </div>

        <div class="acm-panel" data-content-panel="latihan" hidden>
          <div class="admin-content-intro"><b>Latihan Materi</b><span>Tambah soal latihan per materi. Muncul di tombol LATIHAN MATERI pada blok UAB yang dipilih.</span></div>
          <form data-admin-latihan-form class="admin-content-form acm-form">
            <div class="acm-grid">
              <div class="acm-field"><label>Blok tujuan</label><select name="block" required>${blockOptions(UAB_BLOCKS)}</select></div>
              <div class="acm-field"><label>Judul materi</label><input name="title" maxlength="160" required placeholder="Contoh: Anatomi Jantung"></div>
            </div>
            <div class="acm-field"><label>File JSON</label><div class="admin-file-picker"><input id="adminLatihanJsonFile" name="file" type="file" accept=".json,application/json" required hidden><label for="adminLatihanJsonFile" class="admin-file-btn" role="button">Pilih file JSON</label><span class="admin-file-selected" data-latihan-file-meta>Belum ada file dipilih.</span></div></div>
            <button class="account-action account-save acm-submit" type="submit">Tambah ke Latihan Materi</button>
            <p class="acm-note muted" data-content-message role="status"></p>
          </form>
          <div class="admin-content-intro" style="margin-top:14px"><b>Latihan yang sudah ada</b><span>Hapus paket yang salah atau duplikat.</span></div>
          <div class="acm-field"><label>Filter blok</label><select data-latihan-filter><option value="*">Semua blok</option>${blockOptions(UAB_BLOCKS)}</select></div>
          <div data-latihan-list class="admin-uab-packages"><p class="muted">Memuat…</p></div>
        </div>

        <div class="acm-panel" data-content-panel="upi" hidden>
          <div class="admin-content-intro"><b>Buat soal UPI</b><span>Pilih blok dan materi, unggah gambar, tulis pertanyaan dan jawaban, lalu publikasikan ke semua pengguna.</span></div>
          <form data-admin-upi-form class="admin-content-form acm-form">
            <div class="acm-grid">
              <div class="acm-field"><label>Blok tujuan</label><select name="block" required>${blockOptions(UPI_BLOCKS)}</select></div>
              <div class="acm-field"><label>Materi</label><select name="material" required><option value="Histology">Histology</option><option value="Patologi Anatomi">Patologi Anatomi</option><option value="Patologi Klinik">Patologi Klinik</option><option value="Mikrobiologi">Mikrobiologi</option><option value="Fisiologi">Fisiologi</option><option value="Parasitologi">Parasitologi</option></select></div>
            </div>
            <div class="acm-field"><label>Judul atau topik <small>(opsional)</small></label><input name="title" maxlength="160" placeholder="Contoh: Histology — Jaringan epitel"></div>
            <div class="acm-field"><label>Gambar soal</label><div class="admin-file-picker"><input id="adminUpiImageFile" name="image" type="file" accept="image/*" required hidden><label for="adminUpiImageFile" class="admin-file-btn" role="button">Pilih gambar</label><span class="admin-file-selected" data-upi-file-meta>Belum ada gambar dipilih.</span></div></div>
            <div class="upi-create-preview admin-upi-preview" data-admin-upi-preview hidden><img alt="Preview gambar"></div>
            <div class="acm-field"><label>Pertanyaan</label><textarea name="question" rows="3" maxlength="1000" placeholder="Tulis pertanyaan…" required></textarea></div>
            <div class="acm-field"><label>Jawaban</label><textarea name="answer" rows="3" maxlength="1000" placeholder="Tulis jawaban…" required></textarea></div>
            <button class="account-action account-save acm-submit" type="submit">Publikasikan soal UPI</button>
            <p class="acm-note muted" data-content-message role="status"></p>
          </form>
        </div>

        <div class="acm-panel admin-materials-section" data-content-panel="materi" hidden>
          <div class="admin-content-intro"><b>Link materi UAB per blok</b><span>Link ini muncul pada tombol Materi di setiap blok.</span></div>
          <form data-admin-material-form class="admin-content-form admin-material-form acm-form">
            <div class="acm-field"><label>Blok tujuan</label><select name="block" required>${blockOptions(UAB_BLOCKS)}</select></div>
            <div class="acm-field"><label>Link materi</label><input name="url" type="url" inputmode="url" placeholder="https://..." required></div>
            <div class="admin-material-current" data-material-current>Belum ada link tersimpan.</div>
            <div class="acm-actions admin-material-actions"><button class="account-action account-save" type="submit">Simpan link</button><button class="account-action material-delete-action" data-delete-material type="button">Hapus link</button></div>
            <p class="acm-note muted" data-material-message role="status"></p>
          </form>
        </div>

        <div class="acm-panel admin-materials-section" data-content-panel="ninja" hidden>
          <div class="admin-content-intro"><b>Link Ninja Nerd per blok</b><span>Masukkan link playlist YouTube Ninja Nerd untuk tiap blok.</span></div>
          <form data-admin-youtube-form class="admin-content-form admin-material-form acm-form">
            <div class="acm-field"><label>Blok tujuan</label><select name="block" required>${blockOptions(UAB_BLOCKS)}</select></div>
            <div class="acm-field"><label>Link playlist YouTube</label><input name="url" type="url" inputmode="url" placeholder="https://www.youtube.com/playlist?..." required></div>
            <div class="admin-material-current" data-youtube-current>Belum ada link tersimpan.</div>
            <div class="acm-actions admin-material-actions"><button class="account-action account-save" type="submit">Simpan link</button><button class="account-action material-delete-action" data-delete-youtube type="button">Hapus link</button></div>
            <p class="acm-note muted" data-youtube-message role="status"></p>
          </form>
        </div>
        </div>`;
      account.append(box);

      const materialForm=box.querySelector('[data-admin-material-form]'), materialCurrent=box.querySelector('[data-material-current]'), materialMessage=box.querySelector('[data-material-message]'), materialDelete=box.querySelector('[data-delete-material]');
      let materialMap={};
      const loadMaterials=async()=>{try{const d=await request('/api/materials');materialMap=Object.fromEntries((d.materials||[]).map(x=>[String(x.block).toUpperCase(),x.url]));const b=materialForm.elements.block.value.toUpperCase(),url=materialMap[b]||'';materialForm.elements.url.value=url;materialCurrent.textContent=url?`Tersimpan: ${url}`:'Belum ada link tersimpan.';}catch(e){materialMessage.textContent=e.message||'Gagal memuat link materi.';}};
      materialForm.elements.block.addEventListener('change',loadMaterials);
      materialForm.addEventListener('submit',async e=>{e.preventDefault();try{const block=materialForm.elements.block.value,url=materialForm.elements.url.value.trim();const d=await request(`/api/admin/materials/${encodeURIComponent(block)}`,{method:'PUT',body:JSON.stringify({url})});materialMessage.textContent=d.message||'Link materi tersimpan.';await loadMaterials();await hydrateMaterials();}catch(e){materialMessage.textContent=e.message||'Gagal menyimpan link materi.';}});
      materialDelete.addEventListener('click',async()=>{const block=materialForm.elements.block.value;if(!(await clinedConfirm({title:`Hapus link materi ${block}?`,ok:'Ya, lanjut',tone:'danger'})))return;try{const d=await request(`/api/admin/materials/${encodeURIComponent(block)}`,{method:'DELETE'});materialMessage.textContent=d.message||'Link materi dihapus.';await loadMaterials();await hydrateMaterials();}catch(e){materialMessage.textContent=e.message||'Gagal menghapus link materi.';}});
      loadMaterials();

      const youtubeForm=box.querySelector('[data-admin-youtube-form]'), youtubeCurrent=box.querySelector('[data-youtube-current]'), youtubeMessage=box.querySelector('[data-youtube-message]'), youtubeDelete=box.querySelector('[data-delete-youtube]');
      let youtubeMap={};
      const loadYoutube=async()=>{try{const d=await request('/api/youtube');youtubeMap=Object.fromEntries((d.links||[]).map(x=>[String(x.block).toUpperCase(),x.url]));const b=youtubeForm.elements.block.value.toUpperCase(),url=youtubeMap[b]||'';youtubeForm.elements.url.value=url;youtubeCurrent.textContent=url?`Tersimpan: ${url}`:'Belum ada link tersimpan.';}catch(e){youtubeMessage.textContent=e.message||'Gagal memuat link Ninja Nerd.';}};
      youtubeForm.elements.block.addEventListener('change',loadYoutube);
      youtubeForm.addEventListener('submit',async e=>{e.preventDefault();try{const block=youtubeForm.elements.block.value,url=youtubeForm.elements.url.value.trim();const d=await request(`/api/admin/youtube/${encodeURIComponent(block)}`,{method:'PUT',body:JSON.stringify({url})});youtubeMessage.textContent=d.message||'Link Ninja Nerd tersimpan.';await loadYoutube();}catch(e){youtubeMessage.textContent=e.message||'Gagal menyimpan link Ninja Nerd.';}});
      youtubeDelete.addEventListener('click',async()=>{const block=youtubeForm.elements.block.value;if(!(await clinedConfirm({title:`Hapus link Ninja Nerd ${block}?`,ok:'Ya, lanjut',tone:'danger'})))return;try{const d=await request(`/api/admin/youtube/${encodeURIComponent(block)}`,{method:'DELETE'});youtubeMessage.textContent=d.message||'Link Ninja Nerd dihapus.';await loadYoutube();}catch(e){youtubeMessage.textContent=e.message||'Gagal menghapus link Ninja Nerd.';}});
      loadYoutube();

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

      const uabPackagesHost=box.querySelector('[data-uab-packages]');
      const uabDeleteBlock=box.querySelector('[data-uab-delete-block]');
      const normalizeBlock = value => {
        const k=String(value||'').trim().toUpperCase().replace(/^BLOK\s+/,'').replace(/_/g,' ');
        if(k==='ENDOKRIN')return 'ENDOKRINE';
        if(k==='PANCAINDRA')return 'PANCA INDRA';
        if(k==='KEDOKTERAN KOMUNITAS')return 'KEDKOM';
        if(k==='KEDOKTERAN KELUARGA')return 'KEDKEL';
        if(k==='GASTROINTESTINAL')return 'GIT';
        if(k==='MUSKULO')return 'MUSKULOSKELETAL';
        return k;
      };
      const refreshUabDeleteOptions = allPackages => {
        if(!uabDeleteBlock)return;
        const current=String(uabDeleteBlock.value||'').toUpperCase();
        const counts=new Map();
        (allPackages||[]).forEach(p=>{const b=normalizeBlock(p.block);if(b)counts.set(b,(counts.get(b)||0)+1);});
        uabDeleteBlock.innerHTML=`<option value="*">Semua blok UAB</option>`+UAB_BLOCKS.map(([value,label])=>{const n=counts.get(normalizeBlock(value))||0;return `<option value="${esc(value)}">${esc(label)}${n?` • ${n} bank`:''}</option>`;}).join('');
        if(current==='*'||UAB_BLOCKS.some(([v])=>String(v).toUpperCase()===current))uabDeleteBlock.value=current;
      };
      const renderUabPackages=async()=>{
        if(!uabPackagesHost)return;
        try{
          const d=await request('/api/content/packages?module=UAB');
          const allPackages=Array.isArray(d.packages)?d.packages:[];
          refreshUabDeleteOptions(allPackages);
          const rawSelected=String(uabDeleteBlock?.value||'*');
          const selectedBlock=normalizeBlock(rawSelected);
          const showAll=rawSelected==='*';
          const packages=showAll?allPackages:allPackages.filter(p=>normalizeBlock(p.block)===selectedBlock);
          if(!packages.length){
            uabPackagesHost.innerHTML=`<div class="admin-uab-empty"><b>Belum ada bank UAB di blok ini.</b><span>Kalau kamu baru selesai import, tekan refresh untuk memuat data terbaru.</span><button type="button" class="account-action" data-refresh-uab-delete>↻ Refresh bank UAB</button></div>`;
            uabPackagesHost.querySelector('[data-refresh-uab-delete]')?.addEventListener('click',renderUabPackages);
            return;
          }
          uabPackagesHost.innerHTML=`<div class="admin-uab-result-count">${packages.length} bank ditemukan</div>`+packages.map(p=>{
            const qs=Array.isArray(p.questions)?p.questions:[];
            return `<details class="admin-uab-package"><summary><span><b>${esc(p.title)}</b><small>${esc(p.block||'—')} • ${qs.length} soal</small></span><button type="button" class="admin-delete-btn danger clined-compact-action" data-delete-uab-package="${esc(p.id)}">Hapus bank</button></summary><div class="admin-uab-question-list">${qs.length?qs.map((q,i)=>`<div class="admin-uab-question-row"><div><b>${i+1}. ${esc(q.soal||'Soal tanpa teks')}</b><small>${esc(q.id||'ID tidak tersedia')}</small></div><button type="button" class="admin-delete-btn danger clined-compact-action" data-delete-uab-question="${esc(p.id)}" data-question-id="${esc(q.id)}">Hapus soal</button></div>`).join(''):`<p class="muted">Bank ini belum memiliki soal.</p>`}</div></details>`;
          }).join('');
          uabPackagesHost.querySelectorAll('[data-delete-uab-question]').forEach(btn=>btn.addEventListener('click',async e=>{
            e.preventDefault();e.stopPropagation();
            if(!(await clinedConfirm({title:'Hapus soal UAB ini? Tindakan ini tidak dapat dibatalkan.',ok:'Ya, lanjut',tone:'danger'})))return;
            btn.disabled=true;
            try{const d=await request(`/api/content/packages?packageId=${encodeURIComponent(btn.dataset.deleteUabQuestion)}&questionId=${encodeURIComponent(btn.dataset.questionId)}`,{method:'DELETE'});if(typeof showToast==='function')showToast(d.message||'Soal UAB dihapus.',false);await hydrateUab();await renderUabPackages();}
            catch(e){if(typeof showToast==='function')showToast(e.message||'Gagal menghapus soal.',true);btn.disabled=false;}
          }));
          uabPackagesHost.querySelectorAll('[data-delete-uab-package]').forEach(btn=>btn.addEventListener('click',async e=>{
            e.preventDefault();e.stopPropagation();
            if(!(await clinedConfirm({title:'Hapus seluruh bank UAB beserta semua soalnya? Tindakan ini tidak dapat dibatalkan.',ok:'Ya, lanjut',tone:'danger'})))return;
            btn.disabled=true;
            try{const d=await request(`/api/content/packages?packageId=${encodeURIComponent(btn.dataset.deleteUabPackage)}`,{method:'DELETE'});if(typeof showToast==='function')showToast(d.message||'Bank UAB dihapus.',false);await hydrateUab();await renderUabPackages();}
            catch(e){if(typeof showToast==='function')showToast(e.message||'Gagal menghapus bank.',true);btn.disabled=false;}
          }));
        }catch(e){
          uabPackagesHost.innerHTML=`<div class="admin-uab-empty is-error"><b>Gagal memuat bank UAB.</b><span>${esc(e.message||'Terjadi kesalahan.')}</span><button type="button" class="account-action" data-refresh-uab-delete>↻ Coba lagi</button></div>`;
          uabPackagesHost.querySelector('[data-refresh-uab-delete]')?.addEventListener('click',renderUabPackages);
        }
      };
      uabDeleteBlock?.addEventListener('change',renderUabPackages);
      renderUabPackages();

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

      // ── Latihan Materi (module MAT) ──
      const latihanForm=box.querySelector('[data-admin-latihan-form]'),latihanMeta=box.querySelector('[data-latihan-file-meta]'),latihanList=box.querySelector('[data-latihan-list]'),latihanFilter=box.querySelector('[data-latihan-filter]');
      const renderLatihanList=async()=>{
        try{
          const d=await request('/api/content/packages?module=MAT&meta=1');
          const f=latihanFilter.value; const rows=(d.packages||[]).filter(p=>f==='*'||String(p.block||'').toUpperCase()===f);
          latihanList.innerHTML=rows.length?rows.map(p=>`<div class="admin-uab-package"><div><b>${esc(p.title)}</b><small>${esc(p.block||'-')} • ${Number(p.question_count||0)} soal</small></div><button type="button" class="account-action material-delete-action" data-del-latihan="${esc(p.id)}">Hapus</button></div>`).join(''):'<p class="muted">Belum ada latihan materi.</p>';
          latihanList.querySelectorAll('[data-del-latihan]').forEach(b=>b.addEventListener('click',async()=>{
            if(!(await clinedConfirm({title:'Hapus paket latihan ini?',ok:'Ya, lanjut',tone:'danger'})))return;
            try{await request('/api/content/packages/'+encodeURIComponent(b.dataset.delLatihan),{method:'DELETE'});message(box,'Paket latihan dihapus.');await renderLatihanList();}catch(err){message(box,err.message||'Gagal menghapus.',true);}
          }));
        }catch(err){latihanList.innerHTML=`<p class="muted">${esc(err.message||'Gagal memuat daftar.')}</p>`;}
      };
      latihanFilter.addEventListener('change',renderLatihanList);
      latihanForm.elements.file.addEventListener('change',()=>{const f=latihanForm.elements.file.files?.[0];latihanMeta.textContent=f?`${f.name} • ${(f.size/1024).toFixed(1)} KB`:'Belum ada file dipilih.';});
      latihanForm.addEventListener('submit',async e=>{
        e.preventDefault(); const f=latihanForm.elements.file.files?.[0]; if(!f){message(box,'Pilih file JSON terlebih dahulu.',true);return;}
        try{
          const block=latihanForm.elements.block.value,title=latihanForm.elements.title.value.trim().slice(0,160);
          if(!title)throw Error('Judul materi wajib diisi.');
          const questions=parseUabJson(await f.text()); if(!Array.isArray(questions)||!questions.length)throw Error('File JSON tidak berisi soal.');
          const slug=(block+'-'+title).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
          const normalized=questions.map((q,i)=>({...q,id:String(q?.id||`${slug}-${i+1}`)}));
          const validation=window.CLINED_BANK_ENGINE?.validateBank?.(normalized); if(validation && !validation.ok) throw Error(validation.errors.slice(0,4).join(' '));
          await request('/api/content/packages',{method:'POST',body:JSON.stringify({module:'MAT',title,block,questions:normalized})});
          message(box,`"${title}" ditambahkan ke ${block} (${normalized.length} soal).`); latihanForm.reset(); latihanMeta.textContent='Belum ada file dipilih.';
          await renderLatihanList(); scheduleSyncUabNodeStates();
        }catch(err){message(box,err.message||'Gagal menambah latihan.',true);}
      });
      renderLatihanList();

      const FLAG_TXT={suspect_key:'⚠ Kunci mencurigakan',very_hard:'Sangat sulit',hard:'Sulit',too_easy:'Terlalu mudah'};
      const renderItemsList=async()=>{
        const host=box.querySelector('[data-items-list]'); if(!host)return;
        host.innerHTML='<p class="muted">Memuat…</p>';
        try{
          const min=box.querySelector('[data-items-min]').value,src=box.querySelector('[data-items-source]').value;
          const d=await request(`/api/admin/item-stats?min=${encodeURIComponent(min)}${src?`&source=${src}`:''}`);
          if(!d.items.length){host.innerHTML=`<p class="muted">Belum ada soal dengan minimal ${esc(min)} jawaban. Total terekam: ${d.totals.answers} jawaban dari ${d.totals.items} soal.</p>`;return;}
          host.innerHTML=`<p class="muted">${d.items.length} soal ditampilkan • total terekam ${d.totals.answers} jawaban dari ${d.totals.items} soal.</p>`+d.items.map(it=>{
            const tot=Math.max(1,it.n);
            const bars=it.optCounts.slice(0,5).map((c,k)=>{const pct=Math.round(c/tot*100);const ok=k===it.correctIdx;return `<div style="display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:800;margin-top:3px"><span style="width:14px">${'ABCDE'[k]}</span><div style="flex:1;height:8px;border-radius:99px;background:rgba(127,127,127,.18);overflow:hidden"><i style="display:block;height:100%;width:${pct}%;background:${ok?'#58cc02':'#ef4444'}"></i></div><span style="width:62px;text-align:right">${pct}%${ok?' ✓':''}</span></div>`;}).join('');
            const flags=it.flags.map(f=>`<span style="font-size:11px;font-weight:900;padding:2px 8px;border-radius:99px;background:${f==='suspect_key'?'rgba(239,68,68,.14)':'rgba(127,127,127,.16)'}">${FLAG_TXT[f]||esc(f)}</span>`).join(' ');
            return `<div class="admin-uab-package" style="display:block;padding:12px;margin-top:8px"><div style="display:flex;justify-content:space-between;gap:8px;font-weight:900;font-size:13px"><span>${esc(it.bank||it.source)} • ${it.n} jawaban</span><span>${it.wrongRate}% salah</span></div><p style="margin:6px 0;font-size:13px">${esc(it.snippet||'(tanpa teks)')}</p>${flags?`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px">${flags}</div>`:''}${bars}<small class="muted" style="display:block;margin-top:6px;word-break:break-all">ID: ${esc(it.id)}</small></div>`;
          }).join('');
        }catch(err){host.innerHTML=`<p class="muted">${esc(err.message||'Gagal memuat analisis.')}</p>`;}
      };

      const RP_CAT={key:'Kunci salah',typo:'Salah ketik',ambiguous:'Ambigu',explanation:'Pembahasan keliru',other:'Lainnya'};
      const RP_ST=[['new','Baru'],['checked','Diperiksa'],['fixed','Diperbaiki'],['dismissed','Ditolak']];
      let rpStatus='new';
      const rpSetStatus=async(qid,status)=>{await request(`/api/admin/question-reports/${encodeURIComponent(qid)}`,{method:'PATCH',body:JSON.stringify({status})});};
      const renderReports=async()=>{
        const host=box.querySelector('[data-rp-list]'),filt=box.querySelector('[data-rp-filter]'); if(!host)return;
        host.innerHTML='<p class="muted">Memuat…</p>';
        try{
          const d=await request(`/api/admin/question-reports?status=${rpStatus}`);
          filt.innerHTML=RP_ST.map(([k,l])=>`<button type="button" class="ml-chip${k===rpStatus?' on':''}" data-rp-st="${k}">${l} <i style="font-style:normal;opacity:.7">${(d.counts||{})[k]||0}</i></button>`).join('');
          if(!d.items.length){host.innerHTML='<p class="muted">Tidak ada laporan di status ini. 🎉</p>';return;}
          host.innerHTML=d.items.map(it=>{
            const cats=Object.keys(it.cats||{}).map(c=>`<span class="rp-badge">${esc(RP_CAT[c]||c)}</span>`).join(' ');
            const notes=(it.notes||[]).map(n=>`<li>${esc(n)}</li>`).join('');
            const open=rpStatus==='new'||rpStatus==='checked';
            return `<div class="admin-uab-package rp-card" data-rp-q="${esc(it.question_id)}"><div class="rp-top"><b>${it.reporters||it.reports} pelapor</b><span class="muted">${esc(it.bank||it.source)}</span></div>
              <p class="rp-snippet">${esc(it.snippet||'(tanpa teks)')}</p><div class="rp-cats">${cats}</div>${notes?`<ul class="rp-notes">${notes}</ul>`:''}
              <div class="rp-actions">${it.source==='bank'?`<button type="button" class="secondary" data-rp-edit>✏️ Edit soal</button>`:''}${open?`<button type="button" class="secondary" data-rp-do="checked">Diperiksa</button><button type="button" class="secondary" data-rp-do="dismissed">Tolak</button>`:`<button type="button" class="secondary" data-rp-do="new">Buka lagi</button>`}</div><div data-rp-editor></div></div>`;
          }).join('');
        }catch(err){host.innerHTML=`<p class="muted">${esc(err.message||'Gagal memuat laporan.')}</p>`;}
      };
      const rpEditor=async(card)=>{
        const qid=card.dataset.rpQ,slot=card.querySelector('[data-rp-editor]');
        if(slot.innerHTML){slot.innerHTML='';return;}
        slot.innerHTML='<p class="muted">Memuat soal…</p>';
        try{
          const d=await request(`/api/admin/question-reports/${encodeURIComponent(qid)}/question`),q=d.question,L='ABCDEF';
          slot.innerHTML=`<div class="rp-editor"><p class="muted">Bank: ${esc(d.bankName||d.bankId)}</p>
            <label>Soal</label><textarea rows="4" data-f="soal">${esc(q.soal)}</textarea>
            <label>Pilihan jawaban <small>(pilih huruf = kunci)</small></label>
            ${q.opsi.map((o,i)=>`<div class="rp-opt"><label class="rp-key"><input type="radio" name="k-${esc(qid)}" value="${i}" ${q.jawabanBenar===i?'checked':''}><span>${L[i]}</span></label><input type="text" data-o="${i}" value="${esc(o)}"></div>`).join('')}
            <label>Pembahasan</label><textarea rows="5" data-f="pembahasan">${esc(q.pembahasan||'')}</textarea>
            <div class="acm-actions"><button type="button" class="secondary" data-rp-cancel>Batal</button><button type="button" class="account-action acm-submit" data-rp-save data-bank="${esc(d.bankId)}">Simpan &amp; tandai diperbaiki</button></div></div>`;
        }catch(err){slot.innerHTML=`<p class="muted">${esc(err.message||'Gagal memuat soal.')}</p>`;}
      };
      box.querySelector('[data-content-panel="reports"]')?.addEventListener('click',async e=>{
        const st=e.target.closest('[data-rp-st]'); if(st){rpStatus=st.dataset.rpSt;return renderReports();}
        const card=e.target.closest('[data-rp-q]'); if(!card)return;
        const qid=card.dataset.rpQ;
        if(e.target.closest('[data-rp-edit]'))return rpEditor(card);
        if(e.target.closest('[data-rp-cancel]')){card.querySelector('[data-rp-editor]').innerHTML='';return;}
        const act=e.target.closest('[data-rp-do]');
        if(act){try{await rpSetStatus(qid,act.dataset.rpDo);message(box,'Status laporan diperbarui.');renderReports();}catch(err){message(box,err.message||'Gagal memperbarui.',true);}return;}
        const save=e.target.closest('[data-rp-save]');
        if(save){
          const ed=card.querySelector('.rp-editor'),opsi=[...ed.querySelectorAll('[data-o]')].map(i=>i.value.trim()),k=ed.querySelector('input[type=radio]:checked');
          if(!k){message(box,'Pilih huruf kunci jawaban dulu.',true);return;}
          save.disabled=true;
          try{
            await request(`/api/admin/banks/${encodeURIComponent(save.dataset.bank)}/questions/${encodeURIComponent(qid)}`,{method:'PATCH',body:JSON.stringify({soal:ed.querySelector('[data-f=soal]').value,opsi,jawabanBenar:Number(k.value),pembahasan:ed.querySelector('[data-f=pembahasan]').value})});
            await rpSetStatus(qid,'fixed');
            message(box,'Soal diperbaiki dan dipublikasikan. Pengguna menerima versi baru saat memuat ulang.');renderReports();
          }catch(err){save.disabled=false;message(box,err.message||'Gagal menyimpan.',true);}
        }
      });
      box.querySelectorAll('[data-items-min],[data-items-source]').forEach(el=>el.addEventListener('change',renderItemsList));
      box.querySelectorAll('[data-content-tab]').forEach(tab=>tab.addEventListener('click',()=>{
        box.querySelectorAll('[data-content-tab]').forEach(x=>{x.classList.toggle('selected',x===tab);x.setAttribute('aria-selected',x===tab?'true':'false');});
        try{tab.scrollIntoView({inline:'center',block:'nearest',behavior:'smooth'});}catch{}
        box.querySelectorAll('[data-content-panel]').forEach(p=>p.hidden=p.dataset.contentPanel!==tab.dataset.contentTab);
        if(tab.dataset.contentTab==='latihan')renderLatihanList();
        if(tab.dataset.contentTab==='items')renderItemsList();
        if(tab.dataset.contentTab==='reports')renderReports();
      }));
    }

    if(isAdmin && !document.getElementById('adminLoginsPanel')){
      const logins=document.createElement('section'); logins.id='adminLoginsPanel'; logins.className='account-auth-card';
      account.append(logins);
      window.CLINED_ADMIN_PEOPLE?.mount(logins,{request,confirm:o=>clinedConfirm(o),selfId:window.CLINED_CURRENT_USER_ID});
    }
  }

  async function hydrateMaterials(){try{const d=await request('/api/materials');const defaults={GINJAL:'https://drive.google.com/drive/folders/1kLKbjFQ4Gxk3GT64FTH-CXFmuK8MrWD2?usp=drive_link',KEDKOM:'https://drive.google.com/drive/folders/19natRdSWTwk3ms0FbGlQA8Tmnv2YgwJE?usp=drive_link','PANCA INDRA':'https://app.notion.com/p/PANCA-INDRA-3846dad3e946802d8f4ad7f4c6dc042f?source=copy_link'};const map=Object.assign({},defaults,Object.fromEntries((d.materials||[]).map(x=>[String(x.block).toUpperCase(),x.url])));
    // Update [data-external-material] anchors (blok dengan link hardcoded di HTML)
    document.querySelectorAll('[data-external-material]').forEach(a=>{const section=a.closest('[data-block-key]');if(!section)return;const block=String(section.dataset.blockKey||'').toUpperCase();if(map[block]){a.href=map[block];}a.target='_blank';a.rel='noopener noreferrer';});
    // Re-render [data-materi-section] elements (blok yang fetch on-demand, mis: GINJAL, PANCA INDRA)
    document.querySelectorAll('[data-materi-section]').forEach(host=>{const block=String(host.dataset.materiSection||'').toUpperCase();const url=map[block];if(url){host.innerHTML=`<a class="materi-button" href="${url.replace(/"/g,'&quot;')}" target="_blank" rel="noopener noreferrer" aria-label="Buka MATERI PPT">MATERI PPT</a>`;}else{host.innerHTML='';}});
    // Refresh halaman Materials kalau sedang aktif
    if(typeof window.renderMaterialsPage==='function' && document.getElementById('materialsPage')?.classList.contains('active')){window.renderMaterialsPage();}
  }catch(e){console.warn('Material links unavailable',e);}}
  async function hydrateGlobalBanks(){try{
    const catalog=await request('/api/banks');
    for(const item of catalog.banks||[]){
      const id=String(item.id);
      const existing=window.BANKS?.[id];
      if(existing) { existing.count=Math.max(Number(existing.count||0),Number(item.count||0)); existing.name=String(item.name||existing.name||id); existing.block=String(item.block||existing.block||'OTHER'); existing.serverVersion=Number(item.version||existing.serverVersion||0); continue; }
      // Metadata only: the question payload is fetched on demand by the quiz engine.
      if(window.BANKS) window.BANKS[id]={name:String(item.name||id),count:Number(item.count||0),block:String(item.block||'OTHER'),data:[],loaded:false,version:Number(item.version||1)};
    }
    window.renderBanks?.();window.renderCounts?.();
  }catch(e){console.warn('Global bank catalog unavailable',e);}}
  async function hydrateUpi(){try{const data=await request('/api/content/packages?module=UPI'),existing=window.upiGetCustomCards?.()||[],known=new Set(existing.map(c=>c.id));const fallback='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="640" height="360"%3E%3Crect width="100%25" height="100%25" fill="%23007aff"/%3E%3Ctext x="50%25" y="50%25" fill="white" font-size="32" text-anchor="middle" dominant-baseline="middle"%3EUPI%3C/text%3E%3C/svg%3E';const additions=[];for(const p of data.packages||[])for(const q of p.questions||[]){const id=`server-upi-${p.id}-${q.id}`;if(!known.has(id))additions.push({id,block:p.block||'SSP',material:q.material||'Histology',topic:p.title,image:q.image||fallback,prompt:q.soal,answer:q.pembahasan||q.answer||'Tidak ada pembahasan.',explanation:p.visibility==='public'?'Paket UPI publik.':'Paket UPI pribadi.'});}if(additions.length&&window.upiSaveCustomCards){window.upiSaveCustomCards(existing.concat(additions));window.upiRenderBlockSelector?.();}}catch(e){console.warn('UPI sync failed',e);}}
  async function hydrateUab(){try{const data=await request('/api/content/packages?module=UAB');for(const p of data.packages||[])try{window.CLINED_BANK_ENGINE?.registerBank({id:`server-uab-${p.id}`,name:p.title,block:p.block||'UAB',version:1,schema:p.schema_version||'1.0',data:p.questions},{persist:true,source:'server-admin'});}catch{}window.renderBanks?.();window.renderCounts?.();await syncUabNodeStates();}catch(e){console.warn('UAB sync failed',e);}}

  // Map node button ID → block name (uppercase, same as BANKS block field)
  const UAB_NODE_BLOCK_MAP={
    'openBlokBm1':'BM1','openBlokBm2':'BM2','openBlokHnc':'HNC',
    'openBlokMp1':'MP1','openBlokMp2':'MP2','openBlokMpt':'MPT',
    'openBlokMuskuloskeletal':'MUSKULOSKELETAL','openBlokRespiratory':'RESPIRATORY',
    'openBlokKardiologi':'KARDIOLOGI','openBlokHematologi':'HEMATOLOGI',
    'openBlokGit':'GIT','openBlokForensik':'FORENSIK','openBlokGinjal':'GINJAL',
    'openBlokEndokrine':'ENDOKRINE','openBlokReproduksi':'REPRODUKSI',
    'openBlokSsp':'SSP','openBlokPancaIndra':'PANCA INDRA',
    'openBlokKedkom':'KEDKOM','openBlokKedkel':'KEDKEL','openBlokMulsis':'MULSIS'
  };

  async function syncUabNodeStates(){
    try{
      // Kumpulkan blok yang punya soal: dari server UAB packages + global banks + local BANKS
      const activeBlocks=new Set();
      const canonicalBlock=(value)=>{
        const v=String(value||'').trim().toUpperCase().replace(/\s+/g,' ');
        if(v==='KEDOKTERAN KOMUNITAS'||v==='KEDOKOM')return 'KEDKOM';
        if(v==='KEDOKTERAN KELUARGA'||v==='KEDKEL')return 'KEDKEL';
        if(v==='MUSKULO'||v==='MUSKULOSKELETAL')return 'MUSKULOSKELETAL';
        if(v==='ENDO'||v==='ENDOKRIN')return 'ENDOKRINE';
        if(v==='RESPIRASI')return 'RESPIRATORY';
        if(v==='KARDIO'||v==='KARDIOVASKULAR')return 'KARDIOLOGI';
        if(v==='GASTRO'||v==='GASTROINTESTINAL')return 'GIT';
        return v;
      };
      const addActive=(value)=>{const b=canonicalBlock(value);if(b)activeBlocks.add(b);};
      // 1. Server UAB packages
      try{const d=await request('/api/content/packages?module=UAB&meta=1');(d.packages||[]).forEach(p=>{if(p.block&&Number(p.question_count||0)>0)addActive(p.block);});}catch{}
      try{const d=await request('/api/content/packages?module=MAT&meta=1');(d.packages||[]).forEach(p=>{if(p.block&&Number(p.question_count||0)>0)addActive(p.block);});}catch{}
      // 1a. Fallback: baca bank soal utama dari endpoint /api/banks.
      // Ini memastikan bank lama seperti KEDKOM dan KEDKEL tetap terdeteksi.
      try{
        const d=await request('/api/banks');
        (d.banks||[]).forEach(b=>{
          const count=Number(b.count||b.question_count||b.total_questions||0);
          if(b.block&&count>0)addActive(b.block);
        });
      }catch{}

      // 1b. A block is active when it has either a material or Ninja Nerd link.
      // This is intentionally independent of question availability.
      try{const [md,yd]=await Promise.all([request('/api/materials'),request('/api/youtube')]);
        (md.materials||[]).forEach(x=>{if(x.block&&x.url)addActive(x.block);});
        (yd.links||[]).forEach(x=>{if(x.block&&x.url)addActive(x.block);});
      }catch{}
      // 2. Local BANKS object (kedkel, kedkom, SSP, dll yang hardcoded di app.js)
      try{const BANKS=window.BANKS||{};Object.values(BANKS).forEach(b=>{if(b.block&&(b.data||[]).length)addActive(b.block);});}catch{}
      // 3. CLINED_BANK_ENGINE.banks (bank_*.js yang load via engine, sudah include block info)
      try{const eb=window.CLINED_BANK_ENGINE?.banks||{};Object.values(eb).forEach(b=>{if(b.block&&b.count>0)addActive(b.block);});}catch{}
      // Static banks may expose only an id/name rather than a normalized block field.
      try{Object.entries(window.BANKS||{}).forEach(([id,b])=>{
        const hint=String(id+' '+(b?.name||'')).toUpperCase();
        if(/KEDKOM|KEDOKTERAN KOMUNITAS/.test(hint)&&Number(b?.count||b?.data?.length||0)>0)addActive('KEDKOM');
        if(/KEDKEL|KEDOKTERAN KELUARGA/.test(hint)&&Number(b?.count||b?.data?.length||0)>0)addActive('KEDKEL');
      });}catch{}
      // Update node state from live availability (bank soal OR materi OR Ninja Nerd).
      Object.entries(UAB_NODE_BLOCK_MAP).forEach(([nodeId,block])=>{
        const btn=document.getElementById(nodeId); if(!btn)return;
        const hasBank=activeBlocks.has(canonicalBlock(block));
        if(hasBank){
          btn.classList.add('active-node');
          btn.classList.remove('locked-node');
          btn.removeAttribute('aria-label');
        }else{
          btn.classList.remove('active-node');
          btn.classList.add('locked-node');
          btn.setAttribute('aria-label',`${block} terkunci`);
        }
      });
    }catch(e){console.warn('syncUabNodeStates failed',e);}
  }
  let bootState='unknown';
  let nodeSyncTimer=null;
  function scheduleSyncUabNodeStates(){
    clearTimeout(nodeSyncTimer);
    nodeSyncTimer=setTimeout(()=>syncUabNodeStates().catch(()=>{}),300);
  }
  async function boot(){
    try{
      const d=await request('/api/auth/me');
      if(d.user){
        if(bootState===String(d.user.id)) return;
        bootState=String(d.user.id);
        install(d.user);
        await Promise.all([hydrateMaterials(),hydrateGlobalBanks()]);
      }else{
        bootState='logged-out';
        removeAdminControls();
      }
    }catch(e){removeAdminControls();}
  }
  window.addEventListener('load',boot,{once:true});
  window.addEventListener('clined:auth-ready',()=>boot().catch(()=>{}),{passive:true});
  let uabLoaded=false, upiLoaded=false;
  window.addEventListener('clined:view-change',async e=>{
    const view=e.detail;
    if(view==='uabPage' && !uabLoaded){uabLoaded=true;await hydrateUab();}
    if(view==='upiPage' && !upiLoaded){upiLoaded=true;await hydrateUpi();}
  });
  // Metadata-only request; never download all UAB questions just to mark nodes active.
  window.addEventListener('clined:bank-engine-ready',scheduleSyncUabNodeStates);
  // Debounced because hydrateUab registers multiple banks and each registration emits bank-updated.
  window.addEventListener('clined:bank-updated',scheduleSyncUabNodeStates);
})();
