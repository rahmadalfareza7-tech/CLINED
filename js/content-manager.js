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
          <div class="admin-content-intro"><b>Analisis butir soal (Psikometri &amp; Validasi Kunci)</b><span>Statistik distribusi jawaban dari semua pengguna. Tanda <b>⚠ Kunci mencurigakan</b> muncul bila ada pengecoh (distraktor) yang lebih banyak dipilih mahasiswa dibanding kunci jawaban.</span></div>
          <div data-items-kpis class="ia-kpis"></div>
          <div class="ia-toolbar">
            <div class="acm-grid">
              <div class="acm-field"><label>Minimal jawaban</label><select data-items-min><option value="1">≥ 1 jawaban</option><option value="5" selected>≥ 5 jawaban</option><option value="10">≥ 10 jawaban</option><option value="30">≥ 30 jawaban</option><option value="100">≥ 100 jawaban</option></select></div>
              <div class="acm-field"><label>Sumber soal</label><select data-items-source><option value="">Semua sumber</option><option value="bank">Bank Soal UAB</option><option value="mat">Latihan Materi</option></select></div>
            </div>
            <div class="acm-grid">
              <div class="acm-field"><label>Cari teks / bank / ID</label><input type="search" data-items-search placeholder="Ketik potongan soal, nama bank, atau ID…"></div>
              <div class="acm-field"><label>Urutkan</label><select data-items-sort><option value="suspect">⚠ Prioritas Kunci Mencurigakan</option><option value="wrong_desc">% Salah Tertinggi (Tersulit)</option><option value="n_desc">Paling Banyak Dijawab</option><option value="easy_desc">% Benar Tertinggi (Termudah)</option></select></div>
            </div>
            <div class="ia-chips" data-items-flags role="tablist" aria-label="Filter kategori analisis"></div>
          </div>
          <div data-items-list class="ia-list"><p class="muted">Memuat…</p></div>
        </div>

        <div class="acm-panel" data-content-panel="uab">
          <div class="admin-content-intro"><b>Import bank soal UAB</b><span>Upload JSON yang sudah terformat, lalu tentukan soal masuk ke blok mana.</span></div>
          <form data-admin-uab-form class="admin-content-form acm-form">
            <div class="acm-grid">
              <div class="acm-field"><label>Blok tujuan</label><select name="block" required>${blockOptions(UAB_BLOCKS)}</select></div>
              <div class="acm-field"><label>Judul paket <small>(opsional)</small></label><input name="title" maxlength="160" placeholder="Contoh: UAB KEDKOM 2026"></div>
            </div>
            <div class="acm-field"><label>File JSON <small>(maks 1 MB)</small></label><div class="admin-file-picker"><input id="adminUabJsonFile" name="file" type="file" accept=".json,application/json" required hidden><label for="adminUabJsonFile" class="admin-file-btn" role="button">Pilih file JSON</label><span class="admin-file-selected" data-uab-file-meta>Belum ada file dipilih.</span></div></div>
            <button class="account-action account-save acm-submit" type="submit">Import ke blok UAB</button>
            <p class="acm-note muted" data-content-message role="status"></p>
          </form>
        </div>

        <div class="acm-panel" data-content-panel="manage" hidden>
          <div class="admin-content-intro"><b>Kelola semua bank soal UAB</b><span>Kelola bank soal bawaan server maupun hasil import web: ganti nama bank, pindah blok, sembunyikan/publikasikan, serta edit atau hapus soal.</span></div>
          <div class="admin-uab-manage acm-form" data-uab-manage>
            <div class="acm-grid">
              <div class="acm-field"><label>Blok soal</label><select data-uab-delete-block>${blockOptions(UAB_BLOCKS)}</select></div>
              <div class="acm-field"><label>Sumber / status</label><select data-uab-source-filter><option value="all">Semua bank (Global + Import)</option><option value="global">🌐 Bank Global (Server)</option><option value="package">📥 Import Website</option><option value="hidden">🙈 Tersembunyi saja</option></select></div>
            </div>
            <div class="acm-field"><label>Cari nama bank / soal / ID</label><input type="search" data-uab-search placeholder="Ketik nama bank, blok, potongan soal, atau ID…"></div>
            <div data-uab-packages class="admin-uab-packages"><p class="muted">Memuat semua bank soal UAB…</p></div>
          </div>
        </div>

        <div class="acm-panel" data-content-panel="latihan" hidden>
          <div class="admin-content-intro"><b>Latihan Materi</b><span>Tambah soal latihan per materi. Muncul di tombol LATIHAN MATERI pada blok UAB yang dipilih.</span></div>
          <form data-admin-latihan-form class="admin-content-form acm-form">
            <div class="acm-grid">
              <div class="acm-field"><label>Blok tujuan</label><select name="block" required>${blockOptions(UAB_BLOCKS)}</select></div>
              <div class="acm-field"><label>Judul materi</label><input name="title" maxlength="160" required placeholder="Contoh: Anatomi Jantung"></div>
            </div>
            <div class="acm-field"><label>File JSON <small>(maks 1 MB)</small></label><div class="admin-file-picker"><input id="adminLatihanJsonFile" name="file" type="file" accept=".json,application/json" required hidden><label for="adminLatihanJsonFile" class="admin-file-btn" role="button">Pilih file JSON</label><span class="admin-file-selected" data-latihan-file-meta>Belum ada file dipilih.</span></div></div>
            <button class="account-action account-save acm-submit" type="submit">Tambah ke Latihan Materi</button>
            <p class="acm-note muted" data-content-message role="status"></p>
          </form>
          <div class="admin-content-intro" style="margin-top:14px"><b>Latihan yang sudah ada</b><span>Buka paket untuk melihat, mengedit, atau menghapus soal di dalamnya.</span></div>
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
        if(f.size > 1024 * 1024){message(box,'Ukuran file terlalu besar (maksimal 1 MB).',true);return;}
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
      const uabSourceFilter=box.querySelector('[data-uab-source-filter]');
      const uabSearchInput=box.querySelector('[data-uab-search]');
      const normalizeBlock = value => {
        const k=String(value||'').trim().toUpperCase().replace(/^BLOK\s+/,'').replace(/_/g,' ').replace(/\s+/g,' ');
        if(k==='ENDO'||k==='ENDOKRIN')return 'ENDOKRINE';
        if(k==='PANCAINDRA')return 'PANCA INDRA';
        if(k==='KEDOKTERAN KOMUNITAS'||k==='KEDOKOM')return 'KEDKOM';
        if(k==='KEDOKTERAN KELUARGA')return 'KEDKEL';
        if(k==='GASTRO'||k==='GASTROINTESTINAL')return 'GIT';
        if(k==='MUSKULO')return 'MUSKULOSKELETAL';
        if(k==='RESPIRASI')return 'RESPIRATORY';
        if(k==='KARDIO'||k==='KARDIOVASKULAR')return 'KARDIOLOGI';
        return k;
      };
      const syncAllBanksAfterChange = async () => {
        try { await window.CLINED_BANKS_READY?.({ force: true }); } catch {}
        try { await hydrateGlobalBanks(); } catch {}
        try { await hydrateUab({ full: false, force: true }); } catch {}
        scheduleSyncUabNodeStates();
      };
      const openBankMetaModal = (item, { onSaved } = {}) => {
        document.querySelector('.acm-meta-layer')?.remove();
        const normBlk = normalizeBlock(item.block);
        const hasBlk = UAB_BLOCKS.some(([v]) => normalizeBlock(v) === normBlk);
        const extraOpt = (!hasBlk && normBlk) ? `<option value="${esc(normBlk)}" selected>${esc(normBlk)}</option>` : '';
        const blkOpts = extraOpt + UAB_BLOCKS.map(([v, label]) => `<option value="${esc(v)}"${normalizeBlock(v) === normBlk ? ' selected' : ''}>${esc(label)}</option>`).join('');
        const isGlobal = item.kind === 'global';
        const isMat = item.kind === 'mat';
        const layer = document.createElement('div');
        layer.className = 'cdlg-layer acm-meta-layer';
        layer.innerHTML = `<div class="cdlg-card acm-meta-modal" role="dialog" aria-modal="true" aria-labelledby="acmMetaT">
          <div class="cdlg-head"><span class="cdlg-ico" aria-hidden="true">✏️</span><h3 class="cdlg-title" id="acmMetaT">Kelola Info ${isMat ? 'Latihan Materi' : 'Bank Soal'}</h3></div>
          <div class="cdlg-body">
            <div class="acm-bank-badges">
              <span class="acm-bank-badge ${isGlobal ? 'global' : 'pkg'}">${isGlobal ? '🌐 Bank Global (Server)' : isMat ? '📘 Latihan Materi' : '📥 Import Website'}</span>
              <span class="acm-bank-badge">${esc(item.questionCount)} soal</span>
            </div>
            <div class="acm-field">
              <label for="acmMetaName">Nama ${isMat ? 'Paket Materi' : 'Bank Soal'}</label>
              <input id="acmMetaName" type="text" maxlength="160" value="${esc(item.title)}" placeholder="Masukkan nama bank soal…">
            </div>
            <div class="acm-field">
              <label for="acmMetaBlock">Blok Tujuan</label>
              <select id="acmMetaBlock">${blkOpts}</select>
            </div>
            <label class="acm-meta-toggle">
              <div>
                <b>Publikasikan ke semua mahasiswa</b>
                <small>Matikan untuk menyembunyikan sementara tanpa menghapus soal.</small>
              </div>
              <input id="acmMetaPub" type="checkbox" ${item.published ? 'checked' : ''}>
            </label>
          </div>
          <div class="cdlg-actions">
            <button type="button" class="secondary" data-meta-cancel>Batal</button>
            <button type="button" class="primary" data-meta-save>💾 Simpan Perubahan</button>
          </div>
        </div>`;
        const close = () => { layer.classList.remove('show'); setTimeout(() => layer.remove(), 220); };
        const nameInp = layer.querySelector('#acmMetaName');
        const blockSel = layer.querySelector('#acmMetaBlock');
        const pubChk = layer.querySelector('#acmMetaPub');
        const saveBtn = layer.querySelector('[data-meta-save]');
        layer.addEventListener('click', async e => {
          if (e.target === layer || e.target.closest('[data-meta-cancel]')) return close();
          if (!e.target.closest('[data-meta-save]')) return;
          const nextName = String(nameInp.value || '').trim();
          const nextBlock = String(blockSel.value || '').trim();
          const nextPub = !!pubChk.checked;
          if (!nextName) { if (typeof showToast === 'function') showToast('Nama bank soal tidak boleh kosong.', true); nameInp.focus(); return; }
          saveBtn.disabled = true; saveBtn.textContent = 'Menyimpan…';
          try {
            let d;
            if (isGlobal) {
              d = await request(`/api/admin/banks/${encodeURIComponent(item.id)}`, {
                method: 'PATCH',
                body: JSON.stringify({ name: nextName, block: nextBlock, published: nextPub })
              });
            } else {
              d = await request(`/api/content/packages/${encodeURIComponent(item.id)}`, {
                method: 'PATCH',
                body: JSON.stringify({ title: nextName, block: nextBlock, visibility: nextPub ? 'public' : 'private' })
              });
            }
            close();
            if (typeof showToast === 'function') showToast(d.message || 'Info bank soal diperbarui ✅', false);
            await syncAllBanksAfterChange();
            if (onSaved) await onSaved();
          } catch (err) {
            saveBtn.disabled = false; saveBtn.textContent = '💾 Simpan Perubahan';
            if (typeof showToast === 'function') showToast(err.message || 'Gagal menyimpan perubahan.', true);
          }
        });
        document.body.appendChild(layer);
        requestAnimationFrame(() => { layer.classList.add('show'); nameInp.focus(); nameInp.select(); });
      };

      const refreshUabDeleteOptions = allItems => {
        if(!uabDeleteBlock)return;
        const current=String(uabDeleteBlock.value||'*').toUpperCase();
        const counts=new Map();
        (allItems||[]).forEach(p=>{const b=normalizeBlock(p.block);if(b)counts.set(b,(counts.get(b)||0)+1);});
        uabDeleteBlock.innerHTML=`<option value="*">Semua blok UAB (${(allItems||[]).length} bank)</option>`+UAB_BLOCKS.map(([value,label])=>{const n=counts.get(normalizeBlock(value))||0;return `<option value="${esc(value)}">${esc(label)}${n?` • ${n} bank`:''}</option>`;}).join('');
        if(current==='*'||UAB_BLOCKS.some(([v])=>String(v).toUpperCase()===current))uabDeleteBlock.value=current;
      };
      let cachedUabItems=[];
      const globalQuestionsCache=new Map();
      const bankPageLimits=new Map();
      const bankInlineFilter=new Map();

      const renderBankQuestionsInto = (detailsEl, item) => {
        const listHost = detailsEl.querySelector('[data-bank-qlist]');
        if (!listHost) return;
        const isGlobal = item.kind === 'global';
        const allQs = isGlobal ? globalQuestionsCache.get(item.id) : item.questions;
        if (!Array.isArray(allQs)) {
          listHost.innerHTML = '<p class="muted" style="padding:10px">Memuat daftar soal…</p>';
          return;
        }
        const globalSearch = String(uabSearchInput?.value || '').trim().toLowerCase();
        const localSearch = String(bankInlineFilter.get(item.id) || '').trim().toLowerCase();
        const term = localSearch || globalSearch;
        const filtered = term ? allQs.filter(q => `${q.id || ''} ${q.soal || ''}`.toLowerCase().includes(term)) : allQs;
        const limit = bankPageLimits.get(item.id) || 60;
        const shown = filtered.slice(0, limit);
        const filterBar = `<div class="acm-q-filter-bar"><input type="search" data-bank-qfilter="${esc(item.id)}" value="${esc(bankInlineFilter.get(item.id) || '')}" placeholder="Filter soal di dalam ${esc(item.title)} (${allQs.length} soal)…"></div>`;
        const rowsHtml = shown.length ? shown.map((q, i) => `<div class="admin-uab-question-row">
          <div><b>${i + 1}. ${esc(q.soal || 'Soal tanpa teks')}</b><small>${esc(q.id || 'ID tidak tersedia')}</small></div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button type="button" class="secondary clined-compact-action" data-edit-uab-question="${esc(item.id)}" data-bank-kind="${esc(item.kind)}" data-question-id="${esc(q.id)}">✏️ Edit</button>
            <button type="button" class="admin-delete-btn danger clined-compact-action" data-delete-uab-question="${esc(item.id)}" data-bank-kind="${esc(item.kind)}" data-question-id="${esc(q.id)}">Hapus</button>
          </div>
        </div>`).join('') : `<p class="muted" style="padding:10px">${term ? 'Tidak ada soal yang cocok di bank ini.' : 'Bank ini belum memiliki soal.'}</p>`;
        const moreHtml = filtered.length > shown.length ? `<button type="button" class="secondary acm-q-more-btn" data-bank-qmore="${esc(item.id)}">Muat lebih banyak (${filtered.length - shown.length} soal tersisa)</button>` : '';
        listHost.innerHTML = filterBar + rowsHtml + moreHtml;

        const qf = listHost.querySelector('[data-bank-qfilter]');
        if (qf) {
          qf.addEventListener('input', () => {
            bankInlineFilter.set(item.id, qf.value);
            renderBankQuestionsInto(detailsEl, item);
            const nextInp = detailsEl.querySelector('[data-bank-qfilter]');
            if (nextInp) { nextInp.focus(); nextInp.setSelectionRange(nextInp.value.length, nextInp.value.length); }
          });
        }
        listHost.querySelector('[data-bank-qmore]')?.addEventListener('click', () => {
          bankPageLimits.set(item.id, limit + 100);
          renderBankQuestionsInto(detailsEl, item);
        });
        listHost.querySelectorAll('[data-edit-uab-question]').forEach(btn => btn.addEventListener('click', e => {
          e.preventDefault(); e.stopPropagation();
          const kind = btn.dataset.bankKind;
          const targetId = btn.dataset.editUabQuestion;
          const qid = btn.dataset.questionId;
          const payload = kind === 'global'
            ? { bankId: targetId, qid, onSaved: async () => { globalQuestionsCache.delete(targetId); await syncAllBanksAfterChange(); await renderUabPackages(); } }
            : { packageId: targetId, qid, onSaved: async () => { await syncAllBanksAfterChange(); await renderUabPackages(); } };
          window.clinedEditQuestion?.(payload);
        }));
        listHost.querySelectorAll('[data-delete-uab-question]').forEach(btn => btn.addEventListener('click', async e => {
          e.preventDefault(); e.stopPropagation();
          const kind = btn.dataset.bankKind;
          const targetId = btn.dataset.deleteUabQuestion;
          const qid = btn.dataset.questionId;
          if (!(await clinedConfirm({ title: 'Hapus soal ini?', lines: ['Soal akan dihapus permanen dari bank soal untuk semua pengguna.'], ok: 'Ya, hapus', tone: 'danger' }))) return;
          btn.disabled = true;
          try {
            const url = kind === 'global'
              ? `/api/admin/banks/${encodeURIComponent(targetId)}/questions/${encodeURIComponent(qid)}`
              : `/api/content/packages?packageId=${encodeURIComponent(targetId)}&questionId=${encodeURIComponent(qid)}`;
            const d = await request(url, { method: 'DELETE' });
            if (kind === 'global') globalQuestionsCache.delete(targetId);
            if (typeof showToast === 'function') showToast(d.message || 'Soal dihapus.', false);
            await syncAllBanksAfterChange();
            await renderUabPackages();
          } catch (err) {
            if (typeof showToast === 'function') showToast(err.message || 'Gagal menghapus soal.', true);
            btn.disabled = false;
          }
        }));
      };

      const renderUabPackagesList=()=>{
        if(!uabPackagesHost)return;
        const rawSelected=String(uabDeleteBlock?.value||'*');
        const selectedBlock=normalizeBlock(rawSelected);
        const showAll=rawSelected==='*';
        const srcMode=String(uabSourceFilter?.value||'all');
        const qTerm=String(uabSearchInput?.value||'').trim().toLowerCase();
        const items=cachedUabItems
          .filter(p=>showAll||normalizeBlock(p.block)===selectedBlock)
          .filter(p=>{
            if(srcMode==='global') return p.kind==='global';
            if(srcMode==='package') return p.kind==='package';
            if(srcMode==='hidden') return !p.published;
            return true;
          })
          .filter(p=>{
            if(!qTerm) return true;
            if(`${p.title||''} ${p.block||''} ${p.id||''}`.toLowerCase().includes(qTerm)) return true;
            const qs = p.kind==='global' ? globalQuestionsCache.get(p.id) : p.questions;
            if(Array.isArray(qs)) return qs.some(q=>`${q.id||''} ${q.soal||''}`.toLowerCase().includes(qTerm));
            return false;
          });
        if(!items.length){
          uabPackagesHost.innerHTML=`<div class="admin-uab-empty"><b>${qTerm?'Tidak ada bank atau soal yang cocok dengan pencarian.':'Belum ada bank soal di filter ini.'}</b><span>Ganti filter blok/sumber atau tekan refresh untuk memuat data terbaru.</span><button type="button" class="account-action" data-refresh-uab-delete>↻ Refresh semua bank</button></div>`;
          uabPackagesHost.querySelector('[data-refresh-uab-delete]')?.addEventListener('click',renderUabPackages);
          return;
        }
        const globalN = items.filter(x => x.kind === 'global').length;
        const pkgN = items.filter(x => x.kind === 'package').length;
        uabPackagesHost.innerHTML=`<div class="admin-uab-result-count">${items.length} bank ditemukan (${globalN} global • ${pkgN} import web)</div>`+items.map(p=>{
          const isGlobal = p.kind === 'global';
          return `<details class="admin-uab-package${p.published ? '' : ' is-hidden'}" data-bank-key="${esc(p.kind)}:${esc(p.id)}">
            <summary>
              <span>
                <div class="acm-bank-badges">
                  <span class="acm-bank-badge ${isGlobal ? 'global' : 'pkg'}">${isGlobal ? '🌐 Bank Global' : '📥 Import Web'}</span>
                  ${p.published ? '' : '<span class="acm-bank-badge hidden-flag">🙈 Tersembunyi</span>'}
                </div>
                <b>${esc(p.title)}</b>
                <small>${esc(p.block||'—')} • ${p.questionCount} soal • <code>${esc(p.id)}</code></small>
              </span>
              <div class="acm-bank-actions">
                <button type="button" class="acm-bank-act edit" data-edit-bank-meta="${esc(p.id)}" data-bank-kind="${esc(p.kind)}" title="Ganti nama bank, pindah blok, atau ubah status">✏️ Ubah Nama / Blok</button>
                <button type="button" class="acm-bank-act vis${p.published ? '' : ' is-off'}" data-toggle-bank-vis="${esc(p.id)}" data-bank-kind="${esc(p.kind)}" title="${p.published ? 'Sembunyikan sementara dari mahasiswa' : 'Publikasikan kembali ke mahasiswa'}">${p.published ? '👁️ Publik' : '🙈 Sembunyi'}</button>
                <button type="button" class="acm-bank-act danger" data-delete-uab-package="${esc(p.id)}" data-bank-kind="${esc(p.kind)}" title="Hapus permanen bank soal ini">🗑️ Hapus</button>
              </div>
            </summary>
            <div class="admin-uab-question-list" data-bank-qlist><p class="muted" style="padding:10px">Klik untuk memuat soal…</p></div>
          </details>`;
        }).join('');

        const byKey = new Map(items.map(x => [`${x.kind}:${x.id}`, x]));
        uabPackagesHost.querySelectorAll('details[data-bank-key]').forEach(det => {
          const item = byKey.get(det.dataset.bankKey);
          if (!item) return;
          det.addEventListener('toggle', async () => {
            if (!det.open) return;
            if (item.kind === 'global' && !globalQuestionsCache.has(item.id)) {
              const listHost = det.querySelector('[data-bank-qlist]');
              if (listHost) listHost.innerHTML = '<p class="muted" style="padding:10px">Memuat soal dari server…</p>';
              try {
                const res = await request(`/api/admin/banks/${encodeURIComponent(item.id)}`);
                globalQuestionsCache.set(item.id, Array.isArray(res.bank?.questions) ? res.bank.questions : []);
              } catch (err) {
                if (listHost) listHost.innerHTML = `<p class="muted" style="padding:10px">${esc(err.message || 'Gagal memuat soal.')}</p>`;
                return;
              }
            }
            renderBankQuestionsInto(det, item);
          });
        });

        uabPackagesHost.querySelectorAll('[data-edit-bank-meta]').forEach(btn => btn.addEventListener('click', e => {
          e.preventDefault(); e.stopPropagation();
          const item = byKey.get(`${btn.dataset.bankKind}:${btn.dataset.editBankMeta}`);
          if (item) openBankMetaModal(item, { onSaved: renderUabPackages });
        }));

        uabPackagesHost.querySelectorAll('[data-toggle-bank-vis]').forEach(btn => btn.addEventListener('click', async e => {
          e.preventDefault(); e.stopPropagation();
          const item = byKey.get(`${btn.dataset.bankKind}:${btn.dataset.toggleBankVis}`);
          if (!item) return;
          const nextPub = !item.published;
          btn.disabled = true;
          try {
            let d;
            if (item.kind === 'global') {
              d = await request(`/api/admin/banks/${encodeURIComponent(item.id)}`, { method: 'PATCH', body: JSON.stringify({ published: nextPub }) });
            } else {
              d = await request(`/api/content/packages/${encodeURIComponent(item.id)}`, { method: 'PATCH', body: JSON.stringify({ visibility: nextPub ? 'public' : 'private' }) });
            }
            if (typeof showToast === 'function') showToast(nextPub ? `"${item.title}" dipublikasikan 👁️` : `"${item.title}" disembunyikan 🙈`, false);
            await syncAllBanksAfterChange();
            await renderUabPackages();
          } catch (err) {
            if (typeof showToast === 'function') showToast(err.message || 'Gagal mengubah visibilitas.', true);
            btn.disabled = false;
          }
        }));

        uabPackagesHost.querySelectorAll('[data-delete-uab-package]').forEach(btn => btn.addEventListener('click', async e => {
          e.preventDefault(); e.stopPropagation();
          const kind = btn.dataset.bankKind;
          const id = btn.dataset.deleteUabPackage;
          const item = byKey.get(`${kind}:${id}`);
          const label = item?.title || id;
          if (!(await clinedConfirm({
            title: `Hapus bank "${label}"?`,
            lines: [kind === 'global' ? 'Bank global beserta seluruh soalnya akan dihapus permanen dari server.' : 'Seluruh paket import beserta semua soalnya akan dihapus permanen.'],
            ok: 'Ya, hapus bank',
            tone: 'danger'
          }))) return;
          btn.disabled = true;
          try {
            const url = kind === 'global'
              ? `/api/admin/banks/${encodeURIComponent(id)}`
              : `/api/content/packages?packageId=${encodeURIComponent(id)}`;
            const d = await request(url, { method: 'DELETE' });
            if (kind === 'global') globalQuestionsCache.delete(id);
            if (typeof showToast === 'function') showToast(d.message || 'Bank soal dihapus.', false);
            await syncAllBanksAfterChange();
            await renderUabPackages();
          } catch (err) {
            if (typeof showToast === 'function') showToast(err.message || 'Gagal menghapus bank.', true);
            btn.disabled = false;
          }
        }));
      };
      const renderUabPackages=async()=>{
        if(!uabPackagesHost)return;
        try{
          const [globalRes, pkgRes] = await Promise.all([
            request('/api/admin/banks?meta=1').catch(() => ({ banks: [] })),
            request('/api/content/packages?module=UAB&includeHidden=1').catch(() => ({ packages: [] }))
          ]);
          const globals = (globalRes.banks || []).map(b => ({
            kind: 'global',
            id: String(b.id),
            title: String(b.name || b.id),
            block: String(b.block || 'OTHER'),
            published: b.published !== false,
            questionCount: Number(b.question_count || 0),
            updatedAt: b.updated_at
          }));
          const pkgs = (pkgRes.packages || []).map(p => {
            const qs = Array.isArray(p.questions) ? p.questions : [];
            return {
              kind: 'package',
              id: String(p.id),
              title: String(p.title || p.id),
              block: String(p.block || 'OTHER'),
              published: p.visibility === 'public',
              questionCount: qs.length,
              questions: qs,
              updatedAt: p.updated_at
            };
          });
          cachedUabItems = [...globals, ...pkgs].sort((a, b) =>
            normalizeBlock(a.block).localeCompare(normalizeBlock(b.block), 'id') ||
            a.title.localeCompare(b.title, 'id')
          );
          refreshUabDeleteOptions(cachedUabItems);
          renderUabPackagesList();
        }catch(e){
          uabPackagesHost.innerHTML=`<div class="admin-uab-empty is-error"><b>Gagal memuat daftar bank soal.</b><span>${esc(e.message||'Terjadi kesalahan.')}</span><button type="button" class="account-action" data-refresh-uab-delete>↻ Coba lagi</button></div>`;
          uabPackagesHost.querySelector('[data-refresh-uab-delete]')?.addEventListener('click',renderUabPackages);
        }
      };
      uabDeleteBlock?.addEventListener('change',renderUabPackagesList);
      uabSourceFilter?.addEventListener('change',renderUabPackagesList);
      uabSearchInput?.addEventListener('input',renderUabPackagesList);
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
          const d=await request('/api/content/packages?module=MAT&includeHidden=1');
          const f=latihanFilter.value; const rows=(d.packages||[]).filter(p=>f==='*'||normalizeBlock(p.block)===normalizeBlock(f));
          latihanList.innerHTML=rows.length?rows.map(p=>{
            const qs=Array.isArray(p.questions)?p.questions:[];
            const pub=p.visibility==='public';
            return `<details class="admin-uab-package${pub?'':' is-hidden'}"><summary><span><div class="acm-bank-badges"><span class="acm-bank-badge pkg">📘 Latihan Materi</span>${pub?'':'<span class="acm-bank-badge hidden-flag">🙈 Tersembunyi</span>'}</div><b>${esc(p.title)}</b><small>${esc(p.block||'-')} • ${qs.length} soal</small></span><div class="acm-bank-actions"><button type="button" class="acm-bank-act edit" data-edit-latihan-meta="${esc(p.id)}">✏️ Ubah Nama / Blok</button><button type="button" class="acm-bank-act vis${pub?'':' is-off'}" data-toggle-latihan-vis="${esc(p.id)}">${pub?'👁️ Publik':'🙈 Sembunyi'}</button><button type="button" class="acm-bank-act danger" data-del-latihan="${esc(p.id)}">🗑️ Hapus</button></div></summary><div class="admin-uab-question-list">${qs.length?qs.map((q,i)=>`<div class="admin-uab-question-row"><div><b>${i+1}. ${esc(q.soal||'Soal tanpa teks')}</b><small>${esc(q.id||'ID tidak tersedia')}</small></div><div style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" class="secondary clined-compact-action" data-edit-mat-question="${esc(p.id)}" data-question-id="${esc(q.id)}">✏️ Edit</button><button type="button" class="admin-delete-btn danger clined-compact-action" data-delete-mat-question="${esc(p.id)}" data-question-id="${esc(q.id)}">Hapus</button></div></div>`).join(''):'<p class="muted">Paket ini belum memiliki soal.</p>'}</div></details>`;
          }).join(''):'<p class="muted">Belum ada latihan materi.</p>';
          const matMap = new Map(rows.map(p => [String(p.id), { kind: 'mat', id: String(p.id), title: String(p.title || p.id), block: String(p.block || 'OTHER'), published: p.visibility === 'public', questionCount: Array.isArray(p.questions) ? p.questions.length : 0 }]));
          latihanList.querySelectorAll('[data-edit-latihan-meta]').forEach(b => b.addEventListener('click', e => {
            e.preventDefault(); e.stopPropagation();
            const item = matMap.get(b.dataset.editLatihanMeta);
            if (item) openBankMetaModal(item, { onSaved: renderLatihanList });
          }));
          latihanList.querySelectorAll('[data-toggle-latihan-vis]').forEach(b => b.addEventListener('click', async e => {
            e.preventDefault(); e.stopPropagation();
            const item = matMap.get(b.dataset.toggleLatihanVis);
            if (!item) return;
            const nextPub = !item.published;
            b.disabled = true;
            try {
              await request(`/api/content/packages/${encodeURIComponent(item.id)}`, { method: 'PATCH', body: JSON.stringify({ visibility: nextPub ? 'public' : 'private' }) });
              if (typeof showToast === 'function') showToast(nextPub ? `"${item.title}" dipublikasikan 👁️` : `"${item.title}" disembunyikan 🙈`, false);
              await renderLatihanList(); scheduleSyncUabNodeStates();
            } catch (err) {
              if (typeof showToast === 'function') showToast(err.message || 'Gagal mengubah visibilitas.', true);
              b.disabled = false;
            }
          }));
          latihanList.querySelectorAll('[data-edit-mat-question]').forEach(b=>b.addEventListener('click',e=>{
            e.preventDefault();e.stopPropagation();
            window.clinedEditQuestion?.({packageId:b.dataset.editMatQuestion,qid:b.dataset.questionId,onSaved:renderLatihanList});
          }));
          latihanList.querySelectorAll('[data-delete-mat-question]').forEach(b=>b.addEventListener('click',async e=>{
            e.preventDefault();e.stopPropagation();
            if(!(await clinedConfirm({title:'Hapus soal latihan materi ini?',ok:'Ya, lanjut',tone:'danger'})))return;
            try{await request(`/api/content/packages?packageId=${encodeURIComponent(b.dataset.deleteMatQuestion)}&questionId=${encodeURIComponent(b.dataset.questionId)}`,{method:'DELETE'});message(box,'Soal latihan dihapus.');await renderLatihanList();}catch(err){message(box,err.message||'Gagal menghapus soal.',true);}
          }));
          latihanList.querySelectorAll('[data-del-latihan]').forEach(b=>b.addEventListener('click',async e=>{
            e.preventDefault();e.stopPropagation();
            if(!(await clinedConfirm({title:'Hapus paket latihan ini?',ok:'Ya, lanjut',tone:'danger'})))return;
            try{await request('/api/content/packages/'+encodeURIComponent(b.dataset.delLatihan),{method:'DELETE'});message(box,'Paket latihan dihapus.');await renderLatihanList();scheduleSyncUabNodeStates();}catch(err){message(box,err.message||'Gagal menghapus.',true);}
          }));
        }catch(err){latihanList.innerHTML=`<p class="muted">${esc(err.message||'Gagal memuat daftar.')}</p>`;}
      };
      latihanFilter.addEventListener('change',renderLatihanList);
      latihanForm.elements.file.addEventListener('change',()=>{const f=latihanForm.elements.file.files?.[0];latihanMeta.textContent=f?`${f.name} • ${(f.size/1024).toFixed(1)} KB`:'Belum ada file dipilih.';});
      latihanForm.addEventListener('submit',async e=>{
        e.preventDefault(); const f=latihanForm.elements.file.files?.[0]; if(!f){message(box,'Pilih file JSON terlebih dahulu.',true);return;}
        if(f.size > 1024 * 1024){message(box,'Ukuran file terlalu besar (maksimal 1 MB).',true);return;}
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

      const FLAG_TXT={suspect_key:'⚠ Kunci mencurigakan',very_hard:'🔥 Sangat sulit (≥70% salah)',hard:'Sulit (≥50% salah)',too_easy:'✓ Terlalu mudah (≤5% salah)'};
      const FLAG_CHIPS=[['all','Semua'],['suspect_key','⚠ Kunci Mencurigakan'],['very_hard','🔥 Sangat Sulit'],['hard','Sulit'],['too_easy','✓ Terlalu Mudah']];
      let iaCache={items:[],totals:{items:0,answers:0},minN:5},iaFlag='all',iaPreviews=new Map();
      const formatBankDisplay=it=>{
        const raw=String(it.bank||'').trim();
        if(!raw) return it.source==='mat'?'Latihan Materi':'Bank Soal';
        try{ if(window.BANKS?.[raw]?.name) return window.BANKS[raw].name; }catch{}
        return raw.replace(/^server-uab-/i,'UAB ').replace(/[-_]+/g,' ').toUpperCase();
      };
      const openQuestionByItemId=async(itemId,onSaved)=>{
        try{
          const d=await request(`/api/admin/question-reports/${encodeURIComponent(itemId)}/question`);
          window.clinedEditQuestion?.({packageId:d.packageId,bankId:d.bankId,qid:d.questionId||d.question?.id||itemId,onSaved:async q=>{
            iaPreviews.delete(itemId);
            if(onSaved)await onSaved(q);
          }});
        }catch(err){if(typeof showToast==='function')showToast(err.message||'Soal belum bisa diedit langsung.',true);}
      };
      const renderItemsView=()=>{
        const host=box.querySelector('[data-items-list]'),kpisEl=box.querySelector('[data-items-kpis]'),flagsEl=box.querySelector('[data-items-flags]');
        if(!host)return;
        const all=iaCache.items||[];
        const suspectN=all.filter(x=>(x.flags||[]).includes('suspect_key')).length;
        const hardN=all.filter(x=>(x.flags||[]).includes('very_hard')||(x.flags||[]).includes('hard')).length;
        if(kpisEl){
          kpisEl.innerHTML=`
            <div class="ia-kpi"><b>${Number(iaCache.totals?.items||0).toLocaleString('id-ID')}</b><span>Soal Terekam</span></div>
            <div class="ia-kpi ok"><b>${Number(iaCache.totals?.answers||0).toLocaleString('id-ID')}</b><span>Total Jawaban</span></div>
            <div class="ia-kpi ${suspectN?'danger':''}"><b>${suspectN}</b><span>⚠ Kunci Mencurigakan</span></div>
            <div class="ia-kpi ${hardN?'warn':''}"><b>${hardN}</b><span>Soal Sulit</span></div>`;
        }
        const counts={all:all.length};
        FLAG_CHIPS.slice(1).forEach(([f])=>{counts[f]=all.filter(x=>(x.flags||[]).includes(f)).length;});
        if(flagsEl){
          flagsEl.innerHTML=FLAG_CHIPS.map(([f,label])=>`<button type="button" class="ia-chip${iaFlag===f?' on':''}" data-ia-flag="${f}">${label} <i>${counts[f]||0}</i></button>`).join('');
        }
        const q=String(box.querySelector('[data-items-search]')?.value||'').trim().toLowerCase();
        const sort=box.querySelector('[data-items-sort]')?.value||'suspect';
        let list=all.filter(it=>{
          if(iaFlag!=='all' && !(it.flags||[]).includes(iaFlag)) return false;
          if(!q) return true;
          return `${it.id||''} ${it.bank||''} ${formatBankDisplay(it)} ${it.snippet||''}`.toLowerCase().includes(q);
        });
        list=list.slice().sort((a,b)=>{
          if(sort==='suspect'){
            const sa=(a.flags||[]).includes('suspect_key')?1:0, sb=(b.flags||[]).includes('suspect_key')?1:0;
            if(sb!==sa) return sb-sa;
            return b.wrongRate-a.wrongRate || b.n-a.n;
          }
          if(sort==='n_desc') return b.n-a.n || b.wrongRate-a.wrongRate;
          if(sort==='easy_desc') return a.wrongRate-b.wrongRate || b.n-a.n;
          return b.wrongRate-a.wrongRate || b.n-a.n;
        });
        if(!all.length){
          host.innerHTML=`<div class="admin-uab-empty"><b>Belum ada soal dengan minimal ${esc(iaCache.minN)} jawaban.</b><span>Total saat ini: ${iaCache.totals?.answers||0} jawaban dari ${iaCache.totals?.items||0} soal. Turunkan filter "Minimal jawaban" ke ≥ 1 jawaban untuk melihat semua data yang sudah masuk.</span></div>`;
          return;
        }
        if(!list.length){
          host.innerHTML=`<div class="admin-uab-empty"><b>Tidak ada soal yang cocok dengan filter ini.</b><span>Coba ganti kategori chip atau kata kunci pencarian.</span></div>`;
          return;
        }
        host.innerHTML=`<div class="ia-meta-bar"><span>Menampilkan <b>${list.length}</b> dari ${all.length} soal (min. ${iaCache.minN} jawaban)</span>${isAdmin&&iaCache.totals?.items?`<button type="button" class="ia-btn danger" data-ia-reset-all>🗑️ Reset Semua Statistik</button>`:''}</div>`+list.map((it,idx)=>{
          const tot=Math.max(1,it.n);
          const isSuspect=(it.flags||[]).includes('suspect_key');
          const correctPct=Math.max(0,Math.round((100-it.wrongRate)*10)/10);
          const pillTone=it.wrongRate>=70?'bad':it.wrongRate>=50?'mid':'good';
          const prev=iaPreviews.get(it.id);
          const bars=it.optCounts.slice(0,5).map((c,k)=>{
            const pct=Math.round(c/tot*100);
            const isKey=k===it.correctIdx;
            const isTrap=!isKey && k===it.topWrongIdx && c>0 && (isSuspect || pct>=35);
            const optTxt=prev?.question?.opsi?.[k];
            return `<div class="ia-opt-row${isKey?' is-key':isTrap?' is-trap':''}">
              <span class="ia-opt-let" title="${isKey?'Kunci Jawaban':isTrap?'Pengecoh Terbanyak':'Pilihan'}">${'ABCDE'[k]}</span>
              <div class="ia-opt-track"><i class="ia-opt-fill" style="width:${Math.max(pct,c>0?3:0)}%"></i></div>
              <span class="ia-opt-val">${pct}% <small>(${c})</small>${isKey?' ✓':isTrap?' ⚠':''}</span>
              ${optTxt?`<div class="ia-opt-text">${esc(optTxt)}</div>`:''}
            </div>`;
          }).join('');
          const flags=(it.flags||[]).map(f=>`<span class="ia-flag ${esc(f)}">${FLAG_TXT[f]||esc(f)}</span>`).join('');
          const trapHint=isSuspect && it.topWrongIdx>=0
            ? `<span class="ia-flag suspect_key">Pengecoh ${'ABCDE'[it.topWrongIdx]} dipilih ${it.topWrongShare}% vs Kunci ${'ABCDE'[it.correctIdx]} (${Math.round((it.optCounts[it.correctIdx]||0)/tot*100)}%)</span>`
            : '';
          return `<article class="ia-card${isSuspect?' is-suspect':''}" data-ia-id="${esc(it.id)}">
            <div class="ia-card-top">
              <div class="ia-bank-wrap">
                <span class="ia-rank">#${idx+1}</span>
                <span class="ia-src-badge ${it.source==='mat'?'mat':''}">${it.source==='mat'?'Latihan Materi':'Bank UAB'}</span>
                <span class="ia-bank-name">${esc(formatBankDisplay(it))}</span>
              </div>
              <div class="ia-stats-pills">
                <span class="ia-pill">${it.n} jawaban</span>
                <span class="ia-pill ${pillTone}">${it.wrongRate}% salah • ${correctPct}% benar</span>
              </div>
            </div>
            <p class="ia-snippet">${esc(prev?.question?.soal||it.snippet||'(tanpa teks)')}</p>
            ${flags||trapHint?`<div class="ia-flags">${flags}${trapHint}</div>`:''}
            <div class="ia-opts">${bars}</div>
            ${prev?.question?.pembahasan?`<div class="ia-preview"><b>Pembahasan Kunci (${'ABCDE'[it.correctIdx]}) • ${esc(prev.bankName||'')}</b><div>${esc(prev.question.pembahasan)}</div></div>`:prev?.error?`<div class="ia-preview"><b>Info</b><div>${esc(prev.error)}</div></div>`:''}
            <div class="ia-card-foot">
              <span class="ia-qid">ID: ${esc(it.id)}</span>
              <div class="ia-actions">
                <button type="button" class="ia-btn" data-item-preview="${esc(it.id)}">${prev?'🙈 Tutup Detail':'👁️ Lihat Opsi & Pembahasan'}</button>
                <button type="button" class="ia-btn primary" data-item-edit="${esc(it.id)}">✏️ Edit Soal &amp; Kunci</button>
                ${isAdmin?`<button type="button" class="ia-btn danger" data-item-reset="${esc(it.id)}">↺ Reset</button>`:''}
              </div>
            </div>
          </article>`;
        }).join('');
      };
      const renderItemsList=async()=>{
        const host=box.querySelector('[data-items-list]'); if(!host)return;
        host.innerHTML='<p class="muted">Memuat analisis butir soal…</p>';
        try{
          const min=box.querySelector('[data-items-min]').value,src=box.querySelector('[data-items-source]').value;
          const d=await request(`/api/admin/item-stats?min=${encodeURIComponent(min)}${src?`&source=${src}`:''}`);
          iaCache={items:d.items||[],totals:d.totals||{items:0,answers:0},minN:d.minN||min};
          renderItemsView();
        }catch(err){host.innerHTML=`<p class="muted">${esc(err.message||'Gagal memuat analisis.')}</p>`;}
      };
      box.querySelector('[data-content-panel="items"]')?.addEventListener('click',async e=>{
        const flagBtn=e.target.closest('[data-ia-flag]');
        if(flagBtn){iaFlag=flagBtn.dataset.iaFlag;renderItemsView();return;}
        const prevBtn=e.target.closest('[data-item-preview]');
        if(prevBtn){
          const id=prevBtn.dataset.itemPreview;
          if(iaPreviews.has(id)){iaPreviews.delete(id);renderItemsView();return;}
          prevBtn.disabled=true;prevBtn.textContent='Memuat…';
          try{
            const d=await request(`/api/admin/question-reports/${encodeURIComponent(id)}/question`);
            iaPreviews.set(id,d);
          }catch(err){
            iaPreviews.set(id,{error:err.message||'Detail soal tidak ditemukan di server (mungkin bank statis lokal).'});
          }
          renderItemsView();
          return;
        }
        const editBtn=e.target.closest('[data-item-edit]');
        if(editBtn){openQuestionByItemId(editBtn.dataset.itemEdit,renderItemsList);return;}
        const resetBtn=e.target.closest('[data-item-reset]');
        if(resetBtn){
          if(!(await clinedConfirm({title:'Reset statistik jawaban untuk soal ini?',ok:'Ya, reset',tone:'danger'})))return;
          try{await request(`/api/admin/item-stats?id=${encodeURIComponent(resetBtn.dataset.itemReset)}`,{method:'DELETE'});renderItemsList();}catch(err){if(typeof showToast==='function')showToast(err.message||'Gagal mereset.',true);}
          return;
        }
        if(e.target.closest('[data-ia-reset-all]')){
          if(!(await clinedConfirm({title:'Reset SEMUA statistik analisis butir soal? Tindakan ini tidak bisa dibatalkan.',ok:'Ya, reset semua',tone:'danger'})))return;
          try{await request('/api/admin/item-stats',{method:'DELETE'});renderItemsList();}catch(err){if(typeof showToast==='function')showToast(err.message||'Gagal mereset semua statistik.',true);}
        }
      });

      const RP_CAT={key:'Kunci salah',typo:'Salah ketik',ambiguous:'Ambigu',explanation:'Pembahasan keliru',other:'Lainnya'};
      const RP_ST=[['new','Baru'],['checked','Diperiksa'],['fixed','Diperbaiki'],['dismissed','Ditolak']];
      let rpStatus='new';
      const rpTabBtn=box.querySelector('[data-content-tab="reports"]');
      const updateReportTabBadge=counts=>{
        if(!rpTabBtn)return;
        const openN=Number(counts?.new||0);
        rpTabBtn.innerHTML=openN>0?`Laporan Soal <span class="rp-badge" style="margin-left:4px;background:rgba(239,68,68,.18);color:#ef4444">${openN}</span>`:'Laporan Soal';
      };
      const rpSetStatus=async(qid,status)=>{await request(`/api/admin/question-reports/${encodeURIComponent(qid)}`,{method:'PATCH',body:JSON.stringify({status})});};
      const renderReports=async()=>{
        const host=box.querySelector('[data-rp-list]'),filt=box.querySelector('[data-rp-filter]'); if(!host)return;
        host.innerHTML='<p class="muted">Memuat…</p>';
        try{
          const d=await request(`/api/admin/question-reports?status=${rpStatus}`);
          updateReportTabBadge(d.counts);
          filt.innerHTML=RP_ST.map(([k,l])=>`<button type="button" class="ml-chip${k===rpStatus?' on':''}" data-rp-st="${k}">${l} <i style="font-style:normal;opacity:.7">${(d.counts||{})[k]||0}</i></button>`).join('');
          if(!d.items.length){host.innerHTML='<p class="muted">Tidak ada laporan di status ini. 🎉</p>';return;}
          host.innerHTML=d.items.map(it=>{
            const cats=Object.keys(it.cats||{}).map(c=>`<span class="rp-badge">${esc(RP_CAT[c]||c)}</span>`).join(' ');
            const notes=(it.notes||[]).map(n=>`<li>${esc(n)}</li>`).join('');
            const open=rpStatus==='new'||rpStatus==='checked';
            return `<div class="admin-uab-package rp-card" data-rp-q="${esc(it.question_id)}"><div class="rp-top"><b>${it.reporters||it.reports} pelapor</b><span class="muted">${esc(it.bank||it.source)}</span></div>
              <p class="rp-snippet">${esc(it.snippet||'(tanpa teks)')}</p><div class="rp-cats">${cats}</div>${notes?`<ul class="rp-notes">${notes}</ul>`:''}
              <div class="rp-actions"><button type="button" class="secondary" data-rp-edit>✏️ Edit soal</button>${open?`<button type="button" class="secondary" data-rp-do="checked">Diperiksa</button><button type="button" class="secondary" data-rp-do="fixed">✓ Selesai</button><button type="button" class="secondary" data-rp-do="dismissed">Tolak</button>`:`<button type="button" class="secondary" data-rp-do="new">Buka lagi</button>`}</div><div data-rp-editor></div></div>`;
          }).join('');
        }catch(err){host.innerHTML=`<p class="muted">${esc(err.message||'Gagal memuat laporan.')}</p>`;}
      };
      request('/api/admin/question-reports?status=new').then(d=>updateReportTabBadge(d?.counts)).catch(()=>{});
      const rpEditor=async(card)=>{
        const qid=card.dataset.rpQ,slot=card.querySelector('[data-rp-editor]');
        if(slot.innerHTML){slot.innerHTML='';return;}
        slot.innerHTML='<p class="muted">Memuat soal…</p>';
        try{
          const d=await request(`/api/admin/question-reports/${encodeURIComponent(qid)}/question`),q=d.question,L='ABCDEF';
          slot.innerHTML=`<div class="rp-editor"><p class="muted">Sumber: ${esc(d.bankName||d.bankId||d.packageId)}</p>
            <label>Soal</label><textarea rows="4" data-f="soal">${esc(q.soal)}</textarea>
            <label>Pilihan jawaban <small>(pilih huruf = kunci)</small></label>
            ${q.opsi.map((o,i)=>`<div class="rp-opt"><label class="rp-key"><input type="radio" name="k-${esc(qid)}" value="${i}" ${q.jawabanBenar===i?'checked':''}><span>${L[i]}</span></label><input type="text" data-o="${i}" value="${esc(o)}"></div>`).join('')}
            <label>Pembahasan</label><textarea rows="5" data-f="pembahasan">${esc(q.pembahasan||'')}</textarea>
            <div class="acm-actions"><button type="button" class="secondary" data-rp-cancel>Batal</button><button type="button" class="account-action acm-submit" data-rp-save data-bank="${esc(d.bankId||'')}" data-pkg="${esc(d.packageId||'')}" data-real-qid="${esc(d.questionId||q.id||qid)}">Simpan &amp; tandai diperbaiki</button></div></div>`;
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
            const targetQid=save.dataset.realQid||qid;
            const endpoint=save.dataset.pkg
              ? `/api/content/packages/${encodeURIComponent(save.dataset.pkg)}/questions/${encodeURIComponent(targetQid)}`
              : `/api/admin/banks/${encodeURIComponent(save.dataset.bank)}/questions/${encodeURIComponent(targetQid)}`;
            await request(endpoint,{method:'PATCH',body:JSON.stringify({soal:ed.querySelector('[data-f=soal]').value,opsi,jawabanBenar:Number(k.value),pembahasan:ed.querySelector('[data-f=pembahasan]').value})});
            await rpSetStatus(qid,'fixed');
            message(box,'Soal diperbaiki dan dipublikasikan. Pengguna menerima versi baru saat memuat ulang.');renderReports();
          }catch(err){save.disabled=false;message(box,err.message||'Gagal menyimpan.',true);}
        }
      });
      box.querySelectorAll('[data-items-min],[data-items-source]').forEach(el=>el.addEventListener('change',renderItemsList));
      box.querySelector('[data-items-search]')?.addEventListener('input',renderItemsView);
      box.querySelector('[data-items-sort]')?.addEventListener('change',renderItemsView);
      box.querySelectorAll('[data-content-tab]').forEach(tab=>tab.addEventListener('click',()=>{
        box.querySelectorAll('[data-content-tab]').forEach(x=>{x.classList.toggle('selected',x===tab);x.setAttribute('aria-selected',x===tab?'true':'false');});
        try{tab.scrollIntoView({inline:'center',block:'nearest',behavior:'smooth'});}catch{}
        box.querySelectorAll('[data-content-panel]').forEach(p=>p.hidden=p.dataset.contentPanel!==tab.dataset.contentTab);
        if(tab.dataset.contentTab==='manage')renderUabPackages();
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
  const canonicalBlockName = value => {
    if(typeof window.CLINED_CANONICAL_BLOCK==='function') return window.CLINED_CANONICAL_BLOCK(value);
    const v=String(value||'').trim().replace(/^BLOK\s+/i,'').replace(/_/g,' ').replace(/\s+/g,' ').toUpperCase();
    if(!v)return 'OTHER';
    if(v==='KEDOKTERAN KOMUNITAS'||v==='KEDOKOM')return 'KEDKOM';
    if(v==='KEDOKTERAN KELUARGA'||v==='KEDKEL')return 'KEDKEL';
    if(v==='MUSKULO'||v==='MUSKULOSKELETAL')return 'MUSKULOSKELETAL';
    if(v==='ENDO'||v==='ENDOKRIN'||v==='ENDOKRINE')return 'ENDOKRINE';
    if(v==='RESPIRASI'||v==='RESPIRATORY')return 'RESPIRATORY';
    if(v==='KARDIO'||v==='KARDIOVASKULAR'||v==='KARDIOLOGI')return 'KARDIOLOGI';
    if(v==='GASTRO'||v==='GASTROINTESTINAL'||v==='GIT')return 'GIT';
    if(v==='PANCAINDRA'||v==='PANCA INDRA')return 'PANCA INDRA';
    return v;
  };
  const refreshBankUI = () => {
    if(typeof window.CLINED_REFRESH_BANK_UI==='function'){
      window.CLINED_REFRESH_BANK_UI();
    }else{
      window.renderBanks?.();
      window.renderCounts?.();
    }
  };
  async function hydrateGlobalBanks(){try{
    const catalog=await request('/api/banks');
    const liveIds=new Set();
    for(const item of catalog.banks||[]){
      const id=String(item.id);
      liveIds.add(id);
      const block=canonicalBlockName(item.block||'OTHER');
      const serverVersion=Number(item.version||1);
      const serverCount=Number(item.count||0);
      const existing=window.BANKS?.[id];
      if(existing) {
        existing.name=String(item.name||existing.name||id);
        existing.block=block;
        existing.serverVersion=serverVersion;
        if(serverVersion>Number(existing.staticVersion||0) && serverCount>0){
          existing.count=serverCount;
          if(existing.loaded && existing.source==='static') existing.loaded=false;
        }else{
          existing.count=Math.max(Number(existing.count||0),serverCount);
        }
      } else if(window.BANKS) {
        // Metadata only: the question payload is fetched on demand by the quiz engine.
        window.BANKS[id]={name:String(item.name||id),count:serverCount,block,data:[],loaded:false,version:serverVersion,serverVersion,source:'server'};
      }
      if(window.CLINED_BANK_ENGINE?.banks?.[id]){
        window.CLINED_BANK_ENGINE.banks[id].name=String(item.name||id);
        window.CLINED_BANK_ENGINE.banks[id].block=block;
        window.CLINED_BANK_ENGINE.banks[id].count=window.BANKS?.[id]?.count ?? serverCount;
      }
    }
    if(window.BANKS && Array.isArray(catalog.banks)){
      for(const existingId of Object.keys(window.BANKS)){
        if(existingId.startsWith('server-uab-') || existingId.startsWith('user-')) continue;
        if(!liveIds.has(existingId)){
          delete window.BANKS[existingId];
          if(window.CLINED_BANK_ENGINE?.banks?.[existingId]) delete window.CLINED_BANK_ENGINE.banks[existingId];
        }
      }
    }
    refreshBankUI();
  }catch(e){console.warn('Global bank catalog unavailable',e);}}
  async function hydrateUpi(){try{const data=await request('/api/content/packages?module=UPI'),existing=window.upiGetCustomCards?.()||[],known=new Set(existing.map(c=>c.id));const fallback='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="640" height="360"%3E%3Crect width="100%25" height="100%25" fill="%23007aff"/%3E%3Ctext x="50%25" y="50%25" fill="white" font-size="32" text-anchor="middle" dominant-baseline="middle"%3EUPI%3C/text%3E%3C/svg%3E';const additions=[];for(const p of data.packages||[])for(const q of p.questions||[]){const id=`server-upi-${p.id}-${q.id}`;if(!known.has(id))additions.push({id,block:p.block||'SSP',material:q.material||'Histology',topic:p.title,image:q.image||fallback,prompt:q.soal,answer:q.pembahasan||q.answer||'Tidak ada pembahasan.',explanation:p.visibility==='public'?'Paket UPI publik.':'Paket UPI pribadi.'});}if(additions.length&&window.upiSaveCustomCards){window.upiSaveCustomCards(existing.concat(additions));window.upiRenderBlockSelector?.();}}catch(e){console.warn('UPI sync failed',e);}}
  let uabMetaPromise=null, uabFullPromise=null, uabMetaDone=false, uabFullDone=false;
  async function hydrateUab(options={}){
    const full=options?.full!==false;
    const force=Boolean(options?.force);
    if(!full && !force && uabMetaPromise) return uabMetaPromise;
    if(!full && !force && (uabMetaDone || uabFullDone)) return;
    if(full && !force && uabFullPromise) return uabFullPromise;
    const job=(async()=>{
      try{
        const endpoint=full?'/api/content/packages?module=UAB':'/api/content/packages?module=UAB&meta=1';
        const data=await request(endpoint);
        const pkgs=Array.isArray(data.packages)?data.packages:[];
        const liveIds=new Set();
        for(const p of pkgs){
          const bankId=`server-uab-${p.id}`;
          liveIds.add(bankId);
          const block=canonicalBlockName(p.block||'UAB');
          const count=full?(Array.isArray(p.questions)?p.questions.length:0):Number(p.question_count||0);
          if(full){
            const rawQs=Array.isArray(p.questions)?p.questions:[];
            const safeQs=rawQs.map((q,i)=>({...q,id:String(q?.id||`${bankId}-${i+1}`)}));
            try{
              window.CLINED_BANK_ENGINE?.registerBank({id:bankId,name:p.title,block,version:1,schema:p.schema_version||'1.0',data:safeQs},{persist:true,source:'server-admin'});
            }catch(regErr){
              console.warn('Fallback register UAB bank',bankId,regErr);
              if(window.BANKS){
                window.BANKS[bankId]={name:String(p.title||bankId),block,count:safeQs.length,data:safeQs,loaded:true,version:1,schema:p.schema_version||'1.0',source:'server-admin'};
              }
              if(window.CLINED_BANK_ENGINE?.banks){
                window.CLINED_BANK_ENGINE.banks[bankId]={name:String(p.title||bankId),block,version:1,count:safeQs.length,source:'server-admin'};
              }
            }
            if(window.BANKS?.[bankId]){
              window.BANKS[bankId].count=safeQs.length;
              window.BANKS[bankId].loaded=true;
            }
          }else if(window.BANKS){
            const prev=window.BANKS[bankId];
            if(!prev || !prev.loaded || !Array.isArray(prev.data) || !prev.data.length){
              window.BANKS[bankId]={name:String(p.title||bankId),block,count,data:[],loaded:false,version:1,schema:p.schema_version||'1.0',source:'server-admin'};
            }else{
              prev.name=String(p.title||prev.name||bankId);
              prev.block=block;
              prev.count=prev.data.length||count;
            }
            if(window.CLINED_BANK_ENGINE?.banks){
              window.CLINED_BANK_ENGINE.banks[bankId]={name:String(p.title||bankId),block,version:1,count,source:'server-admin'};
            }
          }
        }
        if(window.BANKS){
          for(const existingId of Object.keys(window.BANKS)){
            if(existingId.startsWith('server-uab-') && !liveIds.has(existingId)) delete window.BANKS[existingId];
          }
        }
        if(window.CLINED_BANK_ENGINE?.banks){
          for(const existingId of Object.keys(window.CLINED_BANK_ENGINE.banks)){
            if(existingId.startsWith('server-uab-') && !liveIds.has(existingId)) delete window.CLINED_BANK_ENGINE.banks[existingId];
          }
        }
        if(full) uabFullDone=true;
        else uabMetaDone=true;
        refreshBankUI();
        await syncUabNodeStates();
      }catch(e){
        console.warn('UAB sync failed',e);
      }finally{
        if(full){ if(uabFullPromise===job) uabFullPromise=null; }
        else{ if(uabMetaPromise===job) uabMetaPromise=null; }
      }
    })();
    if(full){ uabFullPromise=job; }
    else{ uabMetaPromise=job; }
    await job;
  }
  window.CLINED_HYDRATE_UAB=hydrateUab;

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
      const canonicalBlock=canonicalBlockName;
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
      try{const BANKS=window.BANKS||{};Object.values(BANKS).forEach(b=>{if(b.block&&(Number(b.count||0)>0||(b.data||[]).length>0))addActive(b.block);});}catch{}
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
  let bootInFlight=null;
  let nodeSyncTimer=null;
  function scheduleSyncUabNodeStates(){
    clearTimeout(nodeSyncTimer);
    nodeSyncTimer=setTimeout(()=>syncUabNodeStates().catch(()=>{}),300);
  }
  async function boot(options={}){
    const force=Boolean(options?.force);
    if(bootInFlight && !force) return bootInFlight;
    const job=(async()=>{
      try{
        const d=await request('/api/auth/me');
        if(d.user){
          const uid=String(d.user.id);
          if(bootState===uid && !force) return;
          install(d.user);
          await Promise.all([hydrateMaterials(),hydrateGlobalBanks(),hydrateUab({full:false,force})]);
          bootState=uid;
        }else{
          bootState='logged-out';
          removeAdminControls();
        }
      }catch(e){
        bootState='unknown';
        removeAdminControls();
      }
    })();
    bootInFlight=job;
    try{await job;}finally{if(bootInFlight===job)bootInFlight=null;}
  }
  if(document.readyState==='complete') boot().catch(()=>{});
  else window.addEventListener('load',()=>boot().catch(()=>{}),{once:true});
  window.addEventListener('clined:auth-ready',()=>boot({force:true}).catch(()=>{}),{passive:true});
  let upiLoaded=false;
  window.addEventListener('clined:view-change',async e=>{
    const view=e.detail;
    if(view==='uabPage' && !uabFullDone){await hydrateUab({full:true});}
    if(view==='upiPage' && !upiLoaded){upiLoaded=true;await hydrateUpi();}
  });
  // Metadata-only request; never download all UAB questions just to mark nodes active.
  window.addEventListener('clined:bank-engine-ready',scheduleSyncUabNodeStates);
  // Debounced because hydrateUab registers multiple banks and each registration emits bank-updated.
  window.addEventListener('clined:bank-updated',scheduleSyncUabNodeStates);
})();
