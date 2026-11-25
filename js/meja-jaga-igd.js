/* CLINED · Meja Jaga IGD — game edukasi: periksa berkas resep/SOAP/instruksi, sorot kesalahan fatal, cap ACC/TOLAK.
   Dimuat lazy via js/lazy-loader.js (bundle "igd"). Progres (skor terbaik, berkas yang pernah tepat) disimpan di
   localStorage "clined_igd_v1" dan tersinkron antar perangkat (merge max-deep di lib/sync-merge.mjs & js/online-sync.js). */
(() => {
  'use strict';
  const KEY = 'clined_igd_v1';

  /* ================= PROGRES (sinkron multi-perangkat) ================= */
  const Progress = {
    read(){
      try {
        const v = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          return { best:+v.best||0, bestOk:+v.bestOk||0, runs:+v.runs||0, perfect:+v.perfect||0,
                   solved:(v.solved && typeof v.solved === 'object' && !Array.isArray(v.solved)) ? v.solved : {}, at:+v.at||0 };
        }
      } catch (e) {}
      return { best:0, bestOk:0, runs:0, perfect:0, solved:{}, at:0 };
    },
    write(p){ try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {} },
    /* Catat hasil satu shift. Mengembalikan id berkas yang baru pertama kali tepat (untuk XP sekali per berkas). */
    record({ score, ok, total, lives, solvedIds }){
      const p = Progress.read();
      const isBest = score > p.best;
      const newIds = [];
      (solvedIds || []).forEach(id => { if (id && !p.solved[id] && !newIds.includes(id)) newIds.push(id); });
      newIds.forEach(id => { p.solved[id] = 1; });
      p.best = Math.max(p.best, score|0);
      p.bestOk = Math.max(p.bestOk, ok|0);
      p.runs += 1;
      if (total > 0 && ok >= total && lives > 0) p.perfect += 1;
      p.at = Date.now();
      Progress.write(p);
      const bits = [];
      if (isBest && score > 0) bits.push('<b>Rekor baru!</b>');
      else bits.push('Rekor terbaik: <b>' + p.best + '</b>');
      if (newIds.length) bits.push('+' + newIds.length + ' berkas baru dikuasai (+' + (newIds.length * 15) + ' XP)');
      return { p, isBest, newIds, html:'<p class="igd-record">' + bits.join(' · ') + '</p>' };
    },
    statsHtml(totalDocs){
      const p = Progress.read();
      if (!p.runs) return '';
      const solved = Object.keys(p.solved).length;
      return '<span>Rekor <b>' + p.best + '</b></span><span>Shift <b>' + p.runs + '</b></span><span>Berkas dikuasai <b>'
        + Math.min(solved, totalDocs) + '/' + totalDocs + '</b></span>';
    }
  };

  const MARKUP = `<div class="igd" id="igd">
  <svg width="0" height="0" style="position:absolute" aria-hidden="true">
    <filter id="igd-rough"><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="3" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="3"/></filter>
  </svg>

  <header class="hud">
    <div class="hud-brand">&#10010; MEJA JAGA IGD<small>SHIFT MALAM</small></div>
    <div class="hud-item"><span class="lbl">Jam</span><b id="igd-clock">22:00</b></div>
    <div class="hud-item"><span class="lbl">Berkas</span><b id="igd-count">1/8</b></div>
    <div class="hud-item"><span class="lbl">Skor</span><b id="igd-score">0</b></div>
    <div class="hud-item"><span class="lbl">Nyawa pasien</span><b class="lives" id="igd-lives"><span class="cross">&#10010;</span><span class="cross">&#10010;</span><span class="cross">&#10010;</span></b></div>
    <div class="hud-btns">
      <button class="mini-btn" data-act="book">Panduan <kbd>B</kbd></button>
      <button class="mini-btn" data-act="mute" id="igd-mute">Suara: nyala</button>
    </div>
  </header>
  <div class="timebar"><i id="igd-timefill"></i></div>

  <main class="desk">
    <aside class="chart" id="igd-chart"></aside>

    <section class="mat"><article class="paper" id="igd-paper"></article></section>

    <aside class="tray">
      <div class="marker-card">
        <div class="pen"></div>
        <b>Stabilo merah</b><br>
        Klik satu baris di berkas untuk menyorot bagian yang salah.
        <button class="mini-btn" data-act="clear">Hapus sorotan</button>
      </div>
      <button class="stamp stamp-tolak" id="igd-tolak" data-act="tolak">
        <span class="knob"></span><span class="base"><b>TOLAK</b><kbd>T</kbd></span>
      </button>
      <button class="stamp stamp-acc" id="igd-acc" data-act="acc">
        <span class="knob"></span><span class="base"><b>ACC</b><kbd>A</kbd></span>
      </button>
    </aside>
  </main>

  <footer class="console" id="igd-console"></footer>

  <aside class="book" id="igd-book" aria-label="Panduan lengkap">
    <div class="book-top">
      <button class="close" data-act="closebook">Tutup</button>
      <h2>Panduan Lengkap</h2>
      <span class="warn">Waktu tetap berjalan saat kamu membaca!</span>
      <input type="search" id="igd-search" placeholder="Cari obat, indikasi, nilai lab, cairan…" autocomplete="off" aria-label="Cari di panduan">
      <nav class="tabs" id="igd-tabs"></nav>
    </div>
    <div class="book-body" id="igd-book-body"></div>
  </aside>

  <section class="screen" id="igd-title">
    <div class="folder">
      <h1>MEJA JAGA <em>IGD</em></h1>
      <p class="igd-lead">Tiap berkas terlihat 95% normal. Tapi kadang, satu kesalahan fatal terselip di dalamnya. Kamu dokter jaga malam ini. Jangan sampai ada yang lolos.</p>
      <ol class="steps">
        <li>Baca <b>kartu pasien</b>, lalu bandingkan dengan berkas yang masuk.</li>
        <li>Ada yang salah? <b>Sorot</b> barisnya dengan stabilo merah, lalu cap <b>TOLAK</b>.</li>
        <li>Semua aman? Langsung cap <b>ACC</b>. Menolak berkas yang benar juga merugikan pasien.</li>
      </ol>
      <label class="igd-opt"><input type="checkbox" id="igd-relax"> Mode santai (tanpa timer)</label>
      <button class="igd-btn" data-act="start">Mulai shift malam</button>
      <div class="igd-stats" id="igd-stats"></div>
      <p class="fine">Game edukasi dengan kasus yang disederhanakan. Bukan pengganti pedoman klinis atau keputusan tenaga medis. Pintasan: T tolak · A ACC · B panduan · Enter lanjut.</p>
    </div>
  </section>

  <section class="screen" id="igd-end" hidden></section>
</div>`;

  function createGame(){
  const host = document.getElementById('mejaJagaIgdHost');
  if (!host) return null;
  host.innerHTML = MARKUP;
  const root = host.querySelector('#igd');
  const q = s => root.querySelector(s);
  const E = {
    clock:q('#igd-clock'), count:q('#igd-count'), score:q('#igd-score'), lives:q('#igd-lives'),
    fill:q('#igd-timefill'), bar:q('.timebar'), chart:q('#igd-chart'), paper:q('#igd-paper'),
    con:q('#igd-console'), title:q('#igd-title'), end:q('#igd-end'), book:q('#igd-book'),
    acc:q('#igd-acc'), tolak:q('#igd-tolak'), tray:q('.tray'), mat:q('.mat'), mute:q('#igd-mute')
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const shuffle = a => { for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };

  /* ================= SUARA ================= */
  const Sfx = (() => {
    let ctx = null, muted = false;
    const ac = () => ctx || (ctx = new (window.AudioContext || window.webkitAudioContext)());
    const noise = dur => { const c=ac(), b=c.createBuffer(1,Math.floor(c.sampleRate*dur),c.sampleRate), d=b.getChannelData(0);
      for (let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*(1-i/d.length); return b; };
    const tone = (type,f1,f2,dur,vol) => { if(muted) return; const c=ac(), t=c.currentTime, o=c.createOscillator(), g=c.createGain();
      o.type=type; o.frequency.setValueAtTime(f1,t); if(f2) o.frequency.exponentialRampToValueAtTime(f2,t+dur);
      g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.001,t+dur); o.connect(g).connect(c.destination); o.start(t); o.stop(t+dur+.02); };
    return {
      unlock(){ try{ ac().resume(); }catch(e){} },
      thud(){ if(muted) return; try{
        tone('sine',150,40,.22,.9);
        const c=ac(), n=c.createBufferSource(), f=c.createBiquadFilter(), g=c.createGain();
        n.buffer=noise(.09); f.type='lowpass'; f.frequency.value=1500; g.gain.value=.5; n.connect(f).connect(g).connect(c.destination); n.start();
      }catch(e){} },
      squeak(){ if(muted) return; try{
        const c=ac(), n=c.createBufferSource(), f=c.createBiquadFilter(), g=c.createGain();
        n.buffer=noise(.14); f.type='bandpass'; f.frequency.value=2600; f.Q.value=3; g.gain.value=.25; n.connect(f).connect(g).connect(c.destination); n.start();
      }catch(e){} },
      good(){ try{ tone('triangle',660,null,.12,.25); setTimeout(()=>tone('triangle',880,null,.18,.25),110); }catch(e){} },
      bad(){ try{ tone('sawtooth',130,90,.35,.22); }catch(e){} },
      toggle(){ muted = !muted; return muted; }
    };
  })();

  /* ================= DATA ================= */
  const TYPES = {
    resep:    { title:'RESEP', prefix:'RSP', cls:'t-resep', signLabel:'Paraf dokter' },
    soap:     { title:'CATATAN KOAS · SOAP', prefix:'SOAP', cls:'t-soap', signLabel:'Koas jaga' },
    instruksi:{ title:'LEMBAR INSTRUKSI OBAT', prefix:'INS', cls:'t-ins', signLabel:'DPJP' }
  };

  const DOCS = [
    { id:'asma-propranolol', type:'resep', sign:'dr. Anindya', flaw:'l2',
      pt:{nama:'Tn. Budi Santoso', umur:'34 th / L', bb:'68 kg', dx:'Asma persisten sedang, keluhan berdebar', alergi:'Tidak ada', cat:'Asma sejak SMA, sering kambuh malam hari'},
      sections:[{lines:[
        {id:'l1', t:'R/ Salbutamol inhaler 100 mcg', s:'S prn 2 puff bila sesak'},
        {id:'l2', t:'R/ Propranolol tab 40 mg', s:'S 2 dd tab I (untuk berdebar)'},
        {id:'l3', t:'R/ Budesonid inhaler 200 mcg', s:'S 2 dd 1 puff, kumur setelah pakai'}]}],
      why:'Propranolol adalah beta-blocker non-selektif. Pada pasien asma obat ini bisa memicu bronkospasme berat. Perlu alternatif lain atau konsul dulu.' },

    { id:'anak-pct-dewasa', type:'resep', sign:'dr. Rahmat', flaw:'l1',
      pt:{nama:'An. Raka Pratama', umur:'5 th / L', bb:'15 kg', dx:'Demam 2 hari, ISPA', alergi:'Tidak ada', cat:''},
      sections:[{lines:[
        {id:'l1', t:'R/ Paracetamol tab 500 mg', s:'S 4 dd tab I'},
        {id:'l2', t:'R/ Ambroksol sirup 15 mg/5 mL', s:'S 3 dd 1/2 sdt'},
        {id:'l3', t:'R/ NaCl 0,9% tetes hidung', s:'S 3 dd 2 tetes tiap lubang'}]}],
      why:'Dosis wajar paracetamol anak 10–15 mg/kgBB per kali, jadi kira-kira 150–225 mg untuk 15 kg. Tablet 500 mg adalah dosis dewasa (±33 mg/kgBB per kali) dan berisiko merusak hati.' },

    { id:'furosemid-gram', type:'instruksi', sign:'dr. Hendra, Sp.PD', flaw:'l2',
      pt:{nama:'Ny. Rukmini', umur:'67 th / P', bb:'60 kg', dx:'Gagal jantung dekompensasi, edema paru', alergi:'Tidak ada', cat:''},
      sections:[{lines:[
        {id:'l1', cols:['O₂ nasal kanul','3 L/menit','Inhalasi','Kontinu']},
        {id:'l2', cols:['Furosemid','40 gram','IV','Bolus, sekali']},
        {id:'l3', cols:['Monitor urin','> 0,5 mL/kgBB/jam','—','Tiap 1 jam']}]}],
      why:'Kesalahan satuan. 40 gram sama dengan 40.000 mg, yaitu 1.000 kali dosis normal. Seharusnya furosemid 40 mg IV.' },

    { id:'stemi-aman', type:'soap', sign:'c. Dimas', flaw:null,
      pt:{nama:'Ny. Sari Wulandari', umur:'58 th / P', bb:'62 kg', dx:'Nyeri dada akut', alergi:'Tidak ada', cat:'Hipertensi, tidak rutin minum obat'},
      sections:[
        {h:'S · Subjective', lines:[
          {id:'s1', t:'Nyeri dada kiri menjalar ke lengan kiri selama 40 menit, keringat dingin.'},
          {id:'s2', t:'Riwayat hipertensi 5 tahun, tidak rutin berobat. Tidak ada alergi obat.'}]},
        {h:'O · Objective', lines:[
          {id:'o1', t:'TD 150/90, N 96, RR 20, SpO₂ 97% udara ruang.'},
          {id:'o2', t:'EKG: elevasi segmen ST di V1–V4.'}]},
        {h:'A · Assessment', lines:[{id:'a1', t:'STEMI anterior.'}]},
        {h:'P · Plan', lines:[
          {id:'p1', t:'Aspirin 320 mg kunyah dan clopidogrel 300 mg loading.'},
          {id:'p2', t:'O₂ tidak diperlukan (SpO₂ 97%). Pasang IV line, konsul Sp.JP untuk reperfusi.'}]}],
      why:'Aman. Antiplatelet ganda dengan dosis loading dan rencana reperfusi sesuai untuk STEMI. Oksigen tidak perlu bila saturasi normal. Dosis tidak berlebihan dan tidak ada alergi.' },

    { id:'alergi-penisilin', type:'resep', sign:'dr. Anindya', flaw:'l1',
      pt:{nama:'Tn. Dimas Aditya', umur:'27 th / L', bb:'72 kg', dx:'Tonsilofaringitis bakterial', alergi:'PENISILIN (anafilaksis, 2019)', cat:''},
      sections:[{lines:[
        {id:'l1', t:'R/ Amoksisilin tab 500 mg', s:'S 3 dd tab I'},
        {id:'l2', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p demam'},
        {id:'l3', t:'R/ Klorheksidin 0,2% obat kumur', s:'S 2 dd kumur'}]}],
      why:'Amoksisilin termasuk golongan penisilin. Pasien punya riwayat anafilaksis penisilin, jadi obat ini kontraindikasi.' },

    { id:'kaptopril-hamil', type:'soap', sign:'c. Nadia', flaw:'p1',
      pt:{nama:'Ny. Dewi Lestari', umur:'29 th / P', bb:'66 kg', dx:'Hipertensi dalam kehamilan, G2P1A0 hamil 20 minggu', alergi:'Tidak ada', cat:''},
      sections:[
        {h:'S · Subjective', lines:[{id:'s1', t:'Sakit kepala 3 hari. Hamil 20 minggu, ANC teratur.'}]},
        {h:'O · Objective', lines:[
          {id:'o1', t:'TD 156/98, ulang 15 menit: 160/100. Proteinuria negatif.'},
          {id:'o2', t:'DJJ 148 x/menit, TFU sesuai usia kehamilan.'}]},
        {h:'A · Assessment', lines:[{id:'a1', t:'Hipertensi dalam kehamilan tanpa proteinuria.'}]},
        {h:'P · Plan', lines:[
          {id:'p1', t:'Kaptopril 12,5 mg, 3 dd tab I.'},
          {id:'p2', t:'Edukasi tanda bahaya, kontrol ANC 1 minggu lagi.'}]}],
      why:'ACE inhibitor (kaptopril) kontraindikasi pada kehamilan karena bisa merusak ginjal janin. Pilihan yang lazim adalah metildopa, nifedipin, atau labetalol.' },

    { id:'metformin-aki', type:'instruksi', sign:'dr. Hendra, Sp.PD', flaw:'l3',
      pt:{nama:'Tn. Hartono', umur:'55 th / L', bb:'70 kg', dx:'DM tipe 2 dengan AKI', alergi:'Tidak ada', cat:'Kreatinin 4,2 mg/dL, eGFR ±15'},
      sections:[{lines:[
        {id:'l1', cols:['NaCl 0,9%','500 mL','IV','Habis dalam 4 jam']},
        {id:'l2', cols:['Insulin reguler','4 unit','SC','Bila GDS > 250']},
        {id:'l3', cols:['Metformin','500 mg','PO','3 × sehari']}]}],
      why:'Metformin tidak boleh diberikan bila eGFR < 30 karena risiko asidosis laktat. Pasien ini eGFR-nya sekitar 15.' },

    { id:'diare-aman', type:'soap', sign:'c. Bayu', flaw:null,
      pt:{nama:'An. Nadia Putri', umur:'2 th / P', bb:'12 kg', dx:'Diare akut', alergi:'Tidak ada', cat:''},
      sections:[
        {h:'S · Subjective', lines:[{id:'s1', t:'Diare cair 6 kali sejak kemarin, muntah 1 kali, masih mau minum.'}]},
        {h:'O · Objective', lines:[{id:'o1', t:'Suhu 37,8, mata sedikit cekung, turgor kembali lambat, CRT 2 detik.'}]},
        {h:'A · Assessment', lines:[{id:'a1', t:'Diare akut dehidrasi ringan–sedang, tanpa tanda disentri.'}]},
        {h:'P · Plan', lines:[
          {id:'p1', t:'Oralit 75 mL/kgBB dalam 3 jam (±900 mL).'},
          {id:'p2', t:'Zinc 20 mg 1 kali sehari selama 10 hari.'},
          {id:'p3', t:'Antibiotik tidak diindikasikan. Edukasi tanda bahaya.'}]}],
      why:'Aman. Oralit 75 × 12 kg = 900 mL, zinc 20 mg untuk usia ≥ 6 bulan, dan antibiotik memang tidak perlu pada diare cair tanpa tanda disentri.' },

    { id:'dispepsia-aman', type:'resep', sign:'dr. Rahmat', flaw:null,
      pt:{nama:'Tn. Agus Wibowo', umur:'41 th / L', bb:'75 kg', dx:'Dispepsia', alergi:'Tidak ada', cat:''},
      sections:[{lines:[
        {id:'l1', t:'R/ Omeprazol cap 20 mg', s:'S 1 dd cap I sebelum makan pagi'},
        {id:'l2', t:'R/ Antasida DOEN tab', s:'S 3 dd tab I kunyah, 1 jam sesudah makan'},
        {id:'l3', t:'R/ Domperidon tab 10 mg', s:'S 3 dd tab I sebelum makan'}]}],
      why:'Aman. Obat dan dosisnya lazim untuk dispepsia dewasa, tanpa alergi maupun kontraindikasi.' },

    { id:'nsaid-perdarahan', type:'resep', sign:'dr. Anindya', flaw:'l2',
      pt:{nama:'Tn. Slamet Riyadi', umur:'62 th / L', bb:'65 kg', dx:'Hematemesis melena e.c. tukak lambung', alergi:'Tidak ada', cat:'Hb 8,1 g/dL, sering minum obat nyeri sendiri'},
      sections:[{lines:[
        {id:'l1', t:'R/ Pantoprazol inj 40 mg', s:'S 2 dd 1 vial IV'},
        {id:'l2', t:'R/ Natrium diklofenak tab 50 mg', s:'S 3 dd tab I (nyeri lutut)'},
        {id:'l3', t:'R/ Sukralfat sirup', s:'S 3 dd C I sebelum makan'}]}],
      why:'Diklofenak adalah NSAID. Obat ini memperburuk perdarahan saluran cerna dan harus dihindari pada pasien yang sedang berdarah dari tukak lambung.' },

    { id:'fraktur-aman', type:'instruksi', sign:'dr. Wulan, Sp.OT', flaw:null,
      pt:{nama:'Ny. Lina Marlina', umur:'45 th / P', bb:'55 kg', dx:'Fraktur radius distal, nyeri sedang–berat', alergi:'Tidak ada', cat:''},
      sections:[{lines:[
        {id:'l1', cols:['Paracetamol infus','1 gram','IV drip 15 menit','Tiap 6 jam, maks 4 g/hari']},
        {id:'l2', cols:['Ondansetron','4 mg','IV','Bila mual, maks 3×/hari']},
        {id:'l3', cols:['Imobilisasi bidai','Posisi netral','—','Sampai konsul Sp.OT']}]}],
      why:'Aman. Paracetamol 1 gram untuk BB > 50 kg dengan batas harian jelas, ondansetron dosis lazim, dan tidak ada alergi.' },

    { id:'identitas-salah', type:'resep', sign:'dr. Rahmat', flaw:'id', ident:'Ny. Maya Kusuma, 13 th / P',
      pt:{nama:'Ny. Maya Kusuma', umur:'31 th / P', bb:'58 kg', dx:'ISK tanpa komplikasi, tidak hamil', alergi:'Tidak ada', cat:''},
      sections:[{lines:[
        {id:'l1', t:'R/ Siprofloksasin tab 500 mg', s:'S 2 dd tab I, 3 hari'},
        {id:'l2', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p nyeri'},
        {id:'l3', t:'R/ Edukasi: banyak minum air putih', s:''}]}],
      why:'Identitas tidak cocok dengan kartu pasien (umur tertulis 13 th, seharusnya 31 th). Berkas harus ditolak dan diverifikasi ulang karena berisiko salah pasien atau salah dosis.' }
  ];

/* Data obat bagian A: analgesik, antibiotik, saluran cerna */
const DRUGS_A = [
 {n:'Paracetamol', alt:'Asetaminofen', cls:'Analgesik-antipiretik', ind:'Nyeri ringan–sedang, demam.',
  d:'500–1.000 mg PO/IV tiap 6 jam. Maks 4 g/hari (maks 3 g/hari bila alkoholik kronik, gangguan hati, atau malnutrisi).',
  a:'10–15 mg/kgBB/kali tiap 4–6 jam. Maks 60 mg/kgBB/hari. IV: 15 mg/kgBB/kali (BB < 33 kg), tiap 6 jam.',
  ki:'Gangguan hati berat, hipersensitivitas.', es:'Jarang pada dosis terapi. Overdosis: hepatotoksik (antidot N-asetilsistein).'},
 {n:'Ibuprofen', cls:'NSAID', ind:'Nyeri, demam, inflamasi.',
  d:'200–400 mg PO tiap 6–8 jam sesudah makan. Maks 1.200 mg/hari tanpa pengawasan.',
  a:'5–10 mg/kgBB/kali tiap 6–8 jam (usia ≥ 6 bulan). Maks 40 mg/kgBB/hari.',
  ki:'Ulkus/perdarahan saluran cerna aktif, gagal ginjal berat, gagal jantung berat, trimester 3 kehamilan, dehidrasi berat, asma sensitif aspirin.',
  es:'Dispepsia, perdarahan lambung, gangguan ginjal, retensi cairan.'},
 {n:'Natrium diklofenak', cls:'NSAID', ind:'Nyeri sedang, artritis, kolik ginjal.',
  d:'50 mg PO 2–3 kali/hari sesudah makan. Maks 150 mg/hari.',
  a:'1–3 mg/kgBB/hari terbagi 2–3 dosis (hanya bila perlu, usia > 1 tahun).',
  ki:'Ulkus/perdarahan saluran cerna, gagal ginjal berat, gagal jantung berat, penyakit jantung iskemik, trimester 3.',
  es:'Nyeri lambung, perdarahan GI, peningkatan risiko kardiovaskular, gangguan ginjal.'},
 {n:'Ketorolak', cls:'NSAID injeksi', ind:'Nyeri akut sedang–berat jangka pendek (maks 5 hari).',
  d:'10–30 mg IV/IM tiap 6–8 jam. Maks 90 mg/hari (60 mg/hari pada usia > 65 th atau BB < 50 kg).',
  a:'0,5 mg/kgBB IV/IM per kali (maks 15 mg), tiap 6–8 jam.',
  ki:'Perdarahan GI, gangguan ginjal sedang–berat, risiko perdarahan, hamil/menyusui, asma sensitif NSAID.',
  es:'Perdarahan GI, gangguan ginjal, nyeri lambung.'},
 {n:'Tramadol', cls:'Opioid lemah', ind:'Nyeri sedang–berat.',
  d:'50–100 mg PO/IV tiap 6–8 jam. Maks 400 mg/hari.',
  a:'1–2 mg/kgBB/kali tiap 6–8 jam (usia > 12 tahun; hindari pada anak lebih kecil).',
  ki:'Epilepsi tidak terkontrol, intoksikasi alkohol/opioid/psikotropik, pemakai MAOI, gagal napas.',
  es:'Mual, pusing, mengantuk, konstipasi, kejang pada dosis tinggi, sindrom serotonin.'},
 {n:'Morfin', cls:'Opioid kuat', ind:'Nyeri berat, nyeri dada iskemik, edema paru (sesuai protokol).',
  d:'2–4 mg IV pelan, ulang tiap 5–15 menit sesuai respons (titrasi). IM/SC 5–10 mg tiap 4 jam.',
  a:'0,05–0,1 mg/kgBB IV tiap 4 jam (titrasi).',
  ki:'Depresi napas, cedera kepala dengan peningkatan TIK, abdomen akut tanpa diagnosis, asma akut, obstruksi usus.',
  es:'Depresi napas, mual, konstipasi, hipotensi, bradikardia. Antidot: nalokson.'},
 {n:'Amoksisilin', cls:'Antibiotik penisilin', ind:'ISPA bakterial, faringitis, otitis media, ISK ringan, pneumonia komunitas ringan.',
  d:'500 mg PO tiap 8 jam (atau 875 mg tiap 12 jam).',
  a:'25–50 mg/kgBB/hari terbagi 3 dosis; dosis tinggi 80–90 mg/kgBB/hari terbagi 2 untuk otitis media.',
  ki:'Alergi penisilin/beta-laktam (terutama riwayat anafilaksis), mononukleosis infeksiosa.',
  es:'Diare, mual, ruam, reaksi alergi hingga anafilaksis.'},
 {n:'Ampisilin–sulbaktam', cls:'Antibiotik penisilin + penghambat beta-laktamase', ind:'Infeksi intra-abdomen, kulit/jaringan lunak, pneumonia aspirasi.',
  d:'1,5–3 g IV tiap 6 jam.',
  a:'100–200 mg/kgBB/hari (komponen ampisilin) terbagi 4 dosis.',
  ki:'Alergi penisilin, riwayat ikterus kolestatik akibat obat ini.',
  es:'Diare, ruam, flebitis, peningkatan enzim hati.'},
 {n:'Seftriakson', cls:'Sefalosporin generasi 3', ind:'Meningitis, pneumonia berat, sepsis, demam tifoid, infeksi intra-abdomen.',
  d:'1–2 g IV tiap 12–24 jam. Meningitis: 2 g tiap 12 jam.',
  a:'50–100 mg/kgBB/hari 1–2 dosis (maks 4 g/hari). Meningitis: 100 mg/kgBB/hari.',
  ki:'Alergi sefalosporin/anafilaksis penisilin berat; hindari pada neonatus hiperbilirubinemia dan jangan dicampur kalsium IV pada neonatus.',
  es:'Diare, ruam, flebitis, eosinofilia, biliary sludge.'},
 {n:'Sefotaksim', cls:'Sefalosporin generasi 3', ind:'Sepsis, meningitis, pneumonia berat.',
  d:'1–2 g IV tiap 8 jam.',
  a:'100–200 mg/kgBB/hari terbagi 3–4 dosis.',
  ki:'Alergi sefalosporin.', es:'Diare, ruam, flebitis.'},
 {n:'Siprofloksasin', cls:'Fluorokuinolon', ind:'ISK, diare infeksius, infeksi tulang/sendi.',
  d:'500 mg PO tiap 12 jam (IV 400 mg tiap 8–12 jam). ISK tanpa komplikasi 3 hari.',
  a:'Umumnya dihindari pada anak < 18 tahun; bila perlu 10–20 mg/kgBB/dosis tiap 12 jam.',
  ki:'Hamil, menyusui, riwayat tendinopati akibat kuinolon, usia < 18 tahun (relatif), miastenia gravis.',
  es:'Mual, pusing, ruptur tendon, perpanjangan QT, fotosensitivitas.'},
 {n:'Levofloksasin', cls:'Fluorokuinolon', ind:'Pneumonia komunitas, ISK komplikata, sinusitis.',
  d:'500–750 mg PO/IV tiap 24 jam.',
  a:'Hindari rutin pada anak; keputusan oleh dokter spesialis.',
  ki:'Hamil/menyusui, riwayat tendinopati, perpanjangan QT, epilepsi.', es:'Mual, ruam, tendinitis, QT memanjang, gangguan glukosa darah.'},
 {n:'Metronidazol', cls:'Antiprotozoa/anaerob', ind:'Infeksi anaerob, amebiasis, giardiasis, infeksi intra-abdomen.',
  d:'500 mg PO/IV tiap 8 jam.',
  a:'7,5–10 mg/kgBB/kali tiap 8 jam (maks 500 mg/kali).',
  ki:'Hipersensitivitas; hindari alkohol selama dan 48 jam sesudah pengobatan; hati-hati pada penyakit SSP.',
  es:'Rasa logam, mual, neuropati, urine gelap.'},
 {n:'Gentamisin', cls:'Aminoglikosida', ind:'Sepsis gram negatif, infeksi berat (kombinasi).',
  d:'3–5 mg/kgBB IV/IM tiap 24 jam (sesuaikan fungsi ginjal).',
  a:'5–7,5 mg/kgBB/hari 1–3 dosis (sesuaikan fungsi ginjal).',
  ki:'Gangguan ginjal berat tanpa penyesuaian, miastenia gravis, hamil.',
  es:'Nefrotoksik, ototoksik; perlu pantau kreatinin.'},
 {n:'Azitromisin', cls:'Makrolida', ind:'Pneumonia atipikal, infeksi saluran napas, tifoid ringan, IMS tertentu.',
  d:'500 mg PO 1 kali/hari selama 3 hari.',
  a:'10 mg/kgBB 1 kali/hari selama 3 hari (maks 500 mg).',
  ki:'Alergi makrolida, gangguan hati berat, riwayat QT panjang.', es:'Mual, diare, nyeri perut, perpanjangan QT.'},
 {n:'Omeprazol', cls:'Penghambat pompa proton', ind:'Dispepsia, GERD, tukak lambung, profilaksis ulkus stres.',
  d:'20–40 mg PO 1 kali/hari sebelum makan pagi.',
  a:'0,7–1 mg/kgBB/hari 1 dosis (maks 20–40 mg).',
  ki:'Hipersensitivitas PPI.', es:'Sakit kepala, diare, hipomagnesemia (pemakaian lama), risiko fraktur dan infeksi C. difficile.'},
 {n:'Pantoprazol', cls:'Penghambat pompa proton', ind:'Perdarahan saluran cerna atas, tukak lambung, GERD.',
  d:'40 mg PO/IV 1–2 kali/hari. Perdarahan GI akut: 80 mg IV bolus lalu 40 mg tiap 12 jam.',
  a:'1 mg/kgBB/hari (maks 40 mg) IV/PO, bila ada indikasi.',
  ki:'Hipersensitivitas PPI.', es:'Sakit kepala, diare, nyeri perut.'},
 {n:'Ondansetron', cls:'Antiemetik (antagonis 5-HT3)', ind:'Mual muntah (gastroenteritis, kemoterapi, pascaoperasi).',
  d:'4–8 mg IV/PO tiap 8 jam. Maks 24 mg/hari.',
  a:'0,1–0,15 mg/kgBB/dosis (maks 4 mg) tiap 8 jam.',
  ki:'Sindrom QT panjang, pemakai apomorfin.', es:'Sakit kepala, konstipasi, perpanjangan QT.'},
 {n:'Domperidon', cls:'Antiemetik prokinetik', ind:'Mual muntah, dispepsia akibat gangguan pengosongan lambung.',
  d:'10 mg PO tiap 8 jam sebelum makan. Maks 30 mg/hari.',
  a:'0,25–0,5 mg/kgBB/dosis tiap 8 jam, bila diperlukan.',
  ki:'Perdarahan GI, obstruksi mekanik, prolaktinoma, perpanjangan QT, gangguan hati sedang–berat.', es:'Mulut kering, sakit kepala, QT memanjang, peningkatan prolaktin.'},
 {n:'Oralit (WHO/ORS)', cls:'Rehidrasi oral', ind:'Dehidrasi pada diare akut.',
  d:'Dewasa: 200–400 mL tiap BAB cair atau sesuai derajat dehidrasi.',
  a:'Tanpa dehidrasi: 50–100 mL (< 2 th) atau 100–200 mL (2–10 th) tiap BAB. Dehidrasi ringan–sedang: 75 mL/kgBB dalam 3 jam.',
  ki:'Dehidrasi berat dengan syok (butuh IV), ileus, muntah tak terkendali.', es:'Muntah (ulang pelan-pelan sedikit demi sedikit).'},
 {n:'Zinc', cls:'Suplemen mineral', ind:'Diare akut anak.',
  d:'—',
  a:'< 6 bulan: 10 mg/hari; ≥ 6 bulan: 20 mg/hari, selama 10 hari.',
  ki:'Hipersensitivitas.', es:'Mual, muntah ringan.'}
];

/* Data obat bagian B: kardiovaskular, napas, endokrin, emergensi, neuro */
const DRUGS_B = [
 {n:'Aspirin', cls:'Antiplatelet', ind:'Sindrom koroner akut, pencegahan sekunder kardiovaskular, stroke iskemik.',
  d:'SKA: 160–320 mg kunyah (loading), lanjut 80–100 mg/hari.',
  a:'Tidak dianjurkan rutin pada anak (risiko sindrom Reye).',
  ki:'Perdarahan aktif, ulkus peptikum aktif, alergi aspirin/asma sensitif NSAID, anak dengan infeksi virus.',
  es:'Dispepsia, perdarahan GI, tinnitus pada dosis tinggi.'},
 {n:'Klopidogrel', cls:'Antiplatelet', ind:'SKA, pasca-PCI/stent, stroke iskemik.',
  d:'Loading 300–600 mg PO, lanjut 75 mg/hari.',
  a:'Tidak untuk penggunaan rutin anak.',
  ki:'Perdarahan aktif, gangguan hati berat.', es:'Perdarahan, memar, diare.'},
 {n:'Nitrogliserin (ISDN/GTN)', cls:'Nitrat', ind:'Angina, nyeri dada iskemik, edema paru kardiogenik.',
  d:'GTN SL 0,4–0,6 mg tiap 5 menit (maks 3 dosis). ISDN SL 5 mg. Infus GTN 5–200 mcg/menit titrasi.',
  a:'Penggunaan pada anak oleh spesialis.',
  ki:'Hipotensi (TDS < 90), infark ventrikel kanan, pemakai PDE-5 inhibitor (sildenafil, tadalafil) dalam 24–48 jam, stenosis aorta berat.',
  es:'Sakit kepala, pusing, hipotensi, takikardia refleks.'},
 {n:'Furosemid', cls:'Diuretik loop', ind:'Edema paru, gagal jantung dekompensasi, edema nefrotik/sirosis.',
  d:'20–80 mg IV bolus (dosis awal 40 mg), ulang sesuai respons. PO 20–80 mg/hari.',
  a:'0,5–2 mg/kgBB/dosis IV/PO tiap 6–12 jam.',
  ki:'Anuria, hipovolemia berat, hipokalemia berat, hiponatremia berat.', es:'Hipokalemia, hiponatremia, dehidrasi, ototoksik dosis tinggi cepat, hiperurisemia.'},
 {n:'Kaptopril', cls:'ACE inhibitor', ind:'Hipertensi, gagal jantung.',
  d:'12,5–50 mg PO 2–3 kali/hari. Krisis hipertensi: 12,5–25 mg SL/PO.',
  a:'0,3–0,5 mg/kgBB/dosis tiap 8 jam.',
  ki:'Hamil, riwayat angioedema, stenosis arteri renalis bilateral, hiperkalemia.', es:'Batuk kering, hiperkalemia, hipotensi, angioedema.'},
 {n:'Amlodipin', cls:'Penghambat kanal kalsium', ind:'Hipertensi, angina.',
  d:'5–10 mg PO 1 kali/hari.', a:'0,06–0,3 mg/kgBB/hari 1 dosis (maks 10 mg).',
  ki:'Syok kardiogenik, stenosis aorta berat.', es:'Edema tungkai, sakit kepala, flushing.'},
 {n:'Nifedipin', cls:'Penghambat kanal kalsium', ind:'Hipertensi dalam kehamilan, tokolitik, hipertensi.',
  d:'10 mg PO (lepas cepat) bila perlu; dosis rumatan 10–20 mg tiap 8–12 jam. Hindari SL pada hipertensi biasa.',
  a:'0,25–0,5 mg/kgBB/dosis, pada hipertensi anak oleh dokter.',
  ki:'Syok kardiogenik, stenosis aorta berat, infark miokard akut (lepas cepat).', es:'Sakit kepala, flushing, takikardia refleks, edema.'},
 {n:'Metildopa', cls:'Antihipertensi sentral', ind:'Hipertensi dalam kehamilan.',
  d:'250–500 mg PO 2–3 kali/hari (maks 3 g/hari).', a:'10–40 mg/kgBB/hari terbagi 2–4 dosis.',
  ki:'Penyakit hati aktif, depresi berat, feokromositoma.', es:'Mengantuk, mulut kering, anemia hemolitik (Coombs positif), gangguan hati.'},
 {n:'Propranolol', cls:'Beta-blocker non-selektif', ind:'Hipertensi, takikardia supraventrikular, tirotoksikosis, profilaksis migrain.',
  d:'10–40 mg PO 2–3 kali/hari.', a:'0,5–1 mg/kgBB/hari terbagi 2–3 dosis.',
  ki:'Asma/PPOK bronkospastik, blok AV derajat 2–3, bradikardia berat, syok kardiogenik, gagal jantung akut.',
  es:'Bradikardia, bronkospasme, hipoglikemia tersamar, lelah.'},
 {n:'Bisoprolol', cls:'Beta-blocker selektif β1', ind:'Hipertensi, gagal jantung kronik, angina.',
  d:'1,25–10 mg PO 1 kali/hari.', a:'Tidak rutin untuk anak.',
  ki:'Blok AV derajat 2–3, bradikardia berat, syok kardiogenik, asma berat.', es:'Bradikardia, lelah, pusing, ekstremitas dingin.'},
 {n:'Amiodaron', cls:'Antiaritmia', ind:'VT/VF refrakter, takiaritmia (oleh dokter terlatih).',
  d:'VF/VT tanpa nadi: 300 mg IV bolus, ulang 150 mg. VT stabil: 150 mg IV dalam 10 menit, lanjut 1 mg/menit 6 jam.',
  a:'5 mg/kgBB IV bolus (maks 300 mg) pada henti jantung.',
  ki:'Bradikardia sinus, blok AV tanpa pacu, syok kardiogenik, gangguan tiroid, hipersensitivitas iodium.', es:'Hipotensi, bradikardia, flebitis, toksisitas paru/tiroid/hati (jangka panjang).'},
 {n:'Epinefrin (adrenalin)', cls:'Simpatomimetik', ind:'Anafilaksis, henti jantung, syok refrakter.',
  d:'Anafilaksis: 0,3–0,5 mg IM (1 mg/mL) paha lateral, ulang tiap 5–15 menit. Henti jantung: 1 mg IV tiap 3–5 menit.',
  a:'Anafilaksis: 0,01 mg/kgBB IM (maks 0,3 mg), larutan 1:1.000. Henti jantung: 0,01 mg/kgBB IV/IO.',
  ki:'Tidak ada kontraindikasi absolut pada anafilaksis/henti jantung.', es:'Takikardia, tremor, cemas, hipertensi, aritmia.'},
 {n:'Atropin', cls:'Antikolinergik', ind:'Bradikardia simtomatik, keracunan organofosfat.',
  d:'Bradikardia: 0,5–1 mg IV, ulang tiap 3–5 menit (maks 3 mg). Organofosfat: 1–2 mg IV, ulang sampai atropinisasi.',
  a:'0,02 mg/kgBB IV (minimal 0,1 mg, maks 0,5 mg/dosis anak).',
  ki:'Glaukoma sudut sempit, obstruksi usus/ileus paralitik.', es:'Mulut kering, takikardia, retensi urine, pupil melebar.'},
 {n:'Salbutamol', cls:'Agonis β2 kerja pendek', ind:'Asma akut, bronkospasme, PPOK eksaserbasi, hiperkalemia (adjuvan).',
  d:'Inhaler 100 mcg: 2–4 puff tiap 20 menit (3 kali), lalu sesuai respons. Nebulisasi 2,5–5 mg tiap 20 menit.',
  a:'Nebulisasi 0,15 mg/kgBB (minimal 2,5 mg, maks 5 mg). Inhaler 4–8 puff dengan spacer.',
  ki:'Hipersensitivitas.', es:'Tremor, palpitasi, hipokalemia, takikardia.'},
 {n:'Ipratropium bromida', cls:'Antikolinergik inhalasi', ind:'Asma akut sedang–berat (kombinasi), PPOK.',
  d:'Nebulisasi 0,5 mg tiap 20 menit (3 dosis awal), lalu tiap 4–6 jam.',
  a:'0,25–0,5 mg nebulisasi tiap 20 menit (3 dosis awal).',
  ki:'Alergi atropin dan turunannya.', es:'Mulut kering, rasa pahit, glaukoma bila terkena mata.'},
 {n:'Budesonid inhalasi', cls:'Kortikosteroid inhalasi', ind:'Rumatan asma persisten.',
  d:'200–400 mcg 2 kali/hari; kumur setelah pakai.', a:'100–200 mcg 2 kali/hari.',
  ki:'Hipersensitivitas.', es:'Kandidiasis oral, suara serak.'},
 {n:'Deksametason', cls:'Kortikosteroid', ind:'Anafilaksis (adjuvan), croup, asma akut, edema otak, reaksi alergi berat.',
  d:'4–10 mg IV/IM, dapat diulang tiap 6–8 jam.', a:'0,15–0,6 mg/kgBB/dosis (croup: 0,6 mg/kgBB dosis tunggal).',
  ki:'Infeksi sistemik berat tanpa antibiotik, ulkus peptik aktif (relatif).', es:'Hiperglikemia, hipertensi, retensi cairan, gangguan lambung.'},
 {n:'Metilprednisolon', cls:'Kortikosteroid', ind:'Asma/PPOK berat, reaksi alergi berat, anafilaksis (adjuvan).',
  d:'40–125 mg IV tiap 6–12 jam.', a:'1–2 mg/kgBB/dosis IV.',
  ki:'Infeksi sistemik tidak terkontrol, hipersensitivitas.', es:'Hiperglikemia, hipertensi, euforia, gangguan lambung.'},
 {n:'Difenhidramin', cls:'Antihistamin H1 generasi 1', ind:'Reaksi alergi, urtikaria, anafilaksis (adjuvan).',
  d:'25–50 mg IV/IM/PO tiap 6–8 jam.', a:'1 mg/kgBB/dosis IV/IM/PO (maks 50 mg).',
  ki:'Serangan asma akut, glaukoma, retensi urine, neonatus.', es:'Mengantuk, mulut kering, retensi urine.'},
 {n:'Insulin reguler', cls:'Antidiabetik', ind:'Hiperglikemia, KAD, hiperkalemia (bersama glukosa).',
  d:'SC 4–10 unit sesuai glukosa darah. KAD: infus 0,1 unit/kgBB/jam. Hiperkalemia: 10 unit IV + dekstrosa 40% 50 mL.',
  a:'KAD: 0,05–0,1 unit/kgBB/jam. Hiperkalemia: 0,1 unit/kgBB + dekstrosa 0,5 g/kgBB.',
  ki:'Hipoglikemia.', es:'Hipoglikemia, hipokalemia, lipodistrofi.'},
 {n:'Dekstrosa 40%', cls:'Larutan glukosa hipertonik', ind:'Hipoglikemia berat, hiperkalemia (adjuvan insulin).',
  d:'25–50 mL (10–20 g) IV bolus, ulang sesuai GDS.', a:'Dekstrosa 10%: 2–5 mL/kgBB IV (hindari D40 pada anak kecil).',
  ki:'Hiperglikemia, perdarahan intrakranial, delirium tremens.', es:'Flebitis, hiperglikemia, ekstravasasi dapat nekrosis.'},
 {n:'Metformin', cls:'Biguanid', ind:'DM tipe 2.',
  d:'500–850 mg PO 2–3 kali/hari sesudah makan (maks 2.550 mg/hari).', a:'≥ 10 tahun: 500 mg 2 kali/hari, oleh dokter.',
  ki:'eGFR < 30, asidosis metabolik, gagal hati/jantung/napas berat, dehidrasi, kontras iodium (tunda).', es:'Mual, diare, asidosis laktat (jarang).'},
 {n:'Diazepam', cls:'Benzodiazepin', ind:'Kejang akut, status epileptikus, ansietas akut.',
  d:'5–10 mg IV pelan (maks 10 mg per dosis, ulang sekali). Rektal 10 mg.',
  a:'IV 0,2–0,5 mg/kgBB (maks 10 mg). Rektal: BB < 10 kg 5 mg; ≥ 10 kg 10 mg.',
  ki:'Depresi napas berat, miastenia gravis, gagal hati berat.', es:'Depresi napas, mengantuk, hipotensi, ketergantungan.'},
 {n:'Fenitoin', cls:'Antikonvulsan', ind:'Status epileptikus (setelah benzodiazepin), kejang fokal/umum.',
  d:'Loading 15–20 mg/kgBB IV, kecepatan maks 50 mg/menit (dengan monitor EKG). Rumatan 5 mg/kgBB/hari.',
  a:'Loading 15–20 mg/kgBB IV, maks 1 mg/kgBB/menit.',
  ki:'Blok AV derajat 2–3, bradikardia sinus, sindrom Adams-Stokes.', es:'Hipotensi dan aritmia pada pemberian cepat, ruam, hiperplasia gingiva, nistagmus.'},
 {n:'Magnesium sulfat', cls:'Antikonvulsan (preeklamsia)', ind:'Preeklamsia berat/eklamsia, torsades de pointes, asma berat refrakter.',
  d:'Eklamsia: loading 4–6 g IV dalam 15–20 menit, lanjut 1–2 g/jam. Pantau refleks patela, laju napas > 12/menit, urine > 30 mL/jam.',
  a:'25–50 mg/kgBB IV dalam 20 menit (asma berat refrakter).',
  ki:'Gagal ginjal berat (hati-hati), blok jantung, miastenia gravis.', es:'Hilang refleks patela, depresi napas, flushing, hipotensi. Antidot: kalsium glukonas 1 g IV.'},
 {n:'Nalokson', cls:'Antidot opioid', ind:'Overdosis opioid dengan depresi napas.',
  d:'0,04–0,4 mg IV titrasi, ulang tiap 2–3 menit. Maks 10 mg bila tidak ada respons.', a:'0,01–0,1 mg/kgBB IV/IM/SC.',
  ki:'Hipersensitivitas.', es:'Sindrom putus opioid, agitasi, edema paru jarang. Masa kerja pendek, pantau ulang.'},
 {n:'Kalsium glukonas 10%', cls:'Elektrolit', ind:'Hiperkalemia dengan perubahan EKG, hipokalsemia simtomatik, keracunan magnesium.',
  d:'10 mL (1 g) IV pelan dalam 5–10 menit, ulang bila perlu.', a:'0,5 mL/kgBB (maks 10 mL) IV pelan.',
  ki:'Hiperkalsemia, pemakai digoksin (hati-hati).', es:'Bradikardia bila terlalu cepat, nekrosis jaringan bila ekstravasasi.'}
];

/* Data lab, cairan, anak, panduan cepat */
const LABS = [
 {g:'Hematologi', rows:[
  ['Hemoglobin','Pria 13–17 g/dL · Wanita 12–15 g/dL · Anak 11–14 g/dL · Neonatus 14–20 g/dL'],
  ['Hematokrit','Pria 40–50% · Wanita 36–46%'],
  ['Leukosit','4.000–11.000 /µL (anak lebih tinggi: 5.000–15.000)'],
  ['Trombosit','150.000–400.000 /µL'],
  ['Eritrosit','Pria 4,5–5,9 · Wanita 4,0–5,2 juta/µL'],
  ['LED','Pria < 15 · Wanita < 20 mm/jam'],
  ['Retikulosit','0,5–2,5%']]},
 {g:'Koagulasi', rows:[
  ['PT','11–14 detik (INR 0,8–1,2)'],
  ['aPTT','25–35 detik'],
  ['D-dimer','< 500 ng/mL FEU']]},
 {g:'Kimia darah dan ginjal', rows:[
  ['Ureum','10–50 mg/dL (BUN 7–20 mg/dL)'],
  ['Kreatinin','Pria 0,7–1,3 · Wanita 0,6–1,1 mg/dL · Anak 0,3–0,7 mg/dL'],
  ['eGFR','≥ 90 mL/menit/1,73 m² normal; < 60 penyakit ginjal kronik; < 30 berat'],
  ['Asam urat','Pria 3,5–7,2 · Wanita 2,6–6,0 mg/dL']]},
 {g:'Elektrolit', rows:[
  ['Natrium','135–145 mmol/L'],
  ['Kalium','3,5–5,0 mmol/L'],
  ['Klorida','98–107 mmol/L'],
  ['Kalsium total','8,5–10,5 mg/dL (ion 1,1–1,3 mmol/L)'],
  ['Magnesium','1,7–2,4 mg/dL'],
  ['Fosfat','2,5–4,5 mg/dL']]},
 {g:'Fungsi hati dan pankreas', rows:[
  ['SGOT (AST)','< 35–40 U/L'],
  ['SGPT (ALT)','< 40 U/L'],
  ['Bilirubin total','0,2–1,2 mg/dL (direk < 0,3)'],
  ['Albumin','3,5–5,0 g/dL'],
  ['ALP','40–130 U/L'],
  ['Amilase','< 100 U/L'],
  ['Lipase','< 60 U/L']]},
 {g:'Glukosa dan metabolik', rows:[
  ['GDS','< 200 mg/dL'],
  ['GDP','70–100 mg/dL'],
  ['GD 2 jam PP','< 140 mg/dL'],
  ['HbA1c','< 5,7% normal; 5,7–6,4% prediabetes; ≥ 6,5% diabetes'],
  ['Hipoglikemia','< 70 mg/dL (berat < 54 mg/dL)'],
  ['Laktat','0,5–2,0 mmol/L']]},
 {g:'Lipid', rows:[
  ['Kolesterol total','< 200 mg/dL'],
  ['LDL','< 100 mg/dL (risiko tinggi < 70)'],
  ['HDL','> 40 (pria) · > 50 (wanita) mg/dL'],
  ['Trigliserida','< 150 mg/dL']]},
 {g:'Jantung dan inflamasi', rows:[
  ['Troponin I/T','Di bawah batas persentil 99 laboratorium (hs-troponin biasanya < 14 ng/L); naik = cedera miokard'],
  ['CK-MB','< 25 U/L'],
  ['CRP','< 5 mg/L'],
  ['Prokalsitonin','< 0,1 ng/mL (> 2 ng/mL curiga sepsis berat)']]},
 {g:'Analisis gas darah (arteri)', rows:[
  ['pH','7,35–7,45'],
  ['PaCO₂','35–45 mmHg'],
  ['PaO₂','80–100 mmHg'],
  ['HCO₃⁻','22–26 mmol/L'],
  ['Base excess','−2 sampai +2'],
  ['SaO₂','95–100%']]},
 {g:'Urinalisis', rows:[
  ['pH urine','4,5–8'],
  ['Berat jenis','1,003–1,030'],
  ['Protein, glukosa, keton, nitrit','Negatif'],
  ['Leukosit esterase','Negatif (leukosit < 5/LPB)'],
  ['Eritrosit','< 3/LPB'],
  ['Produksi urine normal','≥ 0,5 mL/kgBB/jam (anak 1 mL/kgBB/jam; bayi 2 mL/kgBB/jam)']]},
 {g:'Tanda vital', rows:[
  ['Dewasa','Nadi 60–100 · RR 12–20 · TD < 120/80 · Suhu 36,5–37,5 °C · SpO₂ ≥ 95%'],
  ['Bayi (< 1 th)','Nadi 100–160 · RR 30–60 · TDS ≥ 70 mmHg'],
  ['Balita (1–3 th)','Nadi 90–150 · RR 24–40 · TDS ≥ 72–90'],
  ['Anak 3–12 th','Nadi 70–120 · RR 18–30 · TDS ≥ 76–100'],
  ['Remaja','Nadi 60–100 · RR 12–20 · TDS ≥ 90–110']]}
];

const FLUIDS = [
 {n:'NaCl 0,9% (NS)', c:'Na 154, Cl 154 mmol/L; 308 mOsm/L (isotonik)', u:'Resusitasi, dehidrasi, hiponatremia ringan, pengencer obat. Hati-hati bila berlebihan: asidosis hiperkloremik.'},
 {n:'Ringer Laktat (RL)', c:'Na 130, K 4, Ca 3, Cl 109, laktat 28 mmol/L; 273 mOsm/L', u:'Resusitasi cairan, syok hipovolemik, luka bakar, dehidrasi. Hati-hati pada gagal hati berat dan hiperkalemia berat.'},
 {n:'Dekstrosa 5% (D5)', c:'50 g glukosa/L; 252 mOsm/L (hipotonik setelah metabolisme)', u:'Sumber air bebas, hipernatremia. Bukan cairan resusitasi.'},
 {n:'D5 ¼ NS / D5 ½ NS', c:'Dekstrosa 5% dengan natrium rendah', u:'Rumatan pediatri (sesuai protokol), dengan KCl sesuai kebutuhan.'},
 {n:'Dekstrosa 10%', c:'100 g glukosa/L', u:'Hipoglikemia anak/neonatus (2–5 mL/kgBB bolus), rumatan neonatus.'},
 {n:'KA-EN 1B / 3A / 3B', c:'Cairan rumatan dengan elektrolit dan glukosa', u:'Rumatan anak/bayi dengan produk khusus pediatri (1B untuk awal, 3A/3B rumatan).'},
 {n:'NaCl 3%', c:'513 mmol/L Na', u:'Hiponatremia berat simtomatik: bolus 2–5 mL/kgBB atau 100–150 mL IV dalam 10–20 menit. Naikkan Na maks 8–10 mmol/L per 24 jam.'},
 {n:'Koloid (albumin 5–25%)', c:'Plasma expander', u:'Hipoalbuminemia berat, paracentesis volume besar, sirosis dengan SBP.'},
 {n:'NaHCO₃ 8,4%', c:'1 mEq/mL', u:'Asidosis metabolik berat (pH < 7,1), hiperkalemia berat, intoksikasi tertentu. Koreksi bertahap sesuai AGD.'},
 {n:'KCl (koreksi kalium)', c:'Larutan pekat 7,46% (1 mEq/mL)', u:'Hipokalemia. Jangan bolus. Maks 10–20 mEq/jam (di IGD dengan monitor), konsentrasi perifer ≤ 40 mEq/L. Selalu encerkan.'}
];

const PEDIA = {
 resus:[
  ['Bolus cairan syok anak','NS atau RL 10–20 mL/kgBB dalam 5–20 menit, nilai ulang. Syok kardiogenik/malnutrisi berat: 5–10 mL/kgBB lebih pelan.'],
  ['Bolus cairan neonatus','10 mL/kgBB dalam 10–30 menit.'],
  ['Hipoglikemia anak','Dekstrosa 10% 2–5 mL/kgBB IV (D10); neonatus 2 mL/kgBB.'],
  ['Henti jantung (epinefrin)','0,01 mg/kgBB IV/IO (0,1 mL/kgBB larutan 1:10.000) tiap 3–5 menit.'],
  ['Defibrilasi anak','Awal 2 J/kgBB, lanjut 4 J/kgBB (maks 10 J/kgBB atau dosis dewasa).'],
  ['Kardioversi anak','0,5–1 J/kgBB, naikkan menjadi 2 J/kgBB.'],
  ['Kejang anak','Diazepam rektal 0,5 mg/kgBB (< 10 kg: 5 mg; > 10 kg: 10 mg) atau diazepam IV 0,2–0,5 mg/kgBB pelan.']],
 est:[
  ['Perkiraan BB anak 1–10 tahun','(Umur dalam tahun × 2) + 8 kg'],
  ['Perkiraan BB bayi 3–12 bulan','(Umur bulan + 9) ÷ 2 kg'],
  ['Ukuran pipa endotrakeal (cuffed)','(Umur ÷ 4) + 3,5 mm'],
  ['Ukuran pipa endotrakeal (uncuffed)','(Umur ÷ 4) + 4 mm'],
  ['Kedalaman pipa (oral)','Umur ÷ 2 + 12 cm di gigi'],
  ['Tekanan darah sistolik minimal','70 + (2 × umur tahun) mmHg']],
 maint:[
  ['Cairan rumatan (Holliday–Segar)','10 kg pertama: 100 mL/kg/hari. 10–20 kg: 1.000 mL + 50 mL/kg untuk tiap kg di atas 10 kg. > 20 kg: 1.500 mL + 20 mL/kg untuk tiap kg di atas 20 kg.'],
  ['Aturan 4-2-1 (mL/jam)','4 mL/kg/jam untuk 10 kg pertama + 2 mL/kg/jam untuk 10 kg berikutnya + 1 mL/kg/jam untuk sisanya.'],
  ['Dehidrasi ringan–sedang','Terapi A/B WHO: oralit 75 mL/kgBB dalam 3 jam.'],
  ['Dehidrasi berat','Terapi C: RL/NS 100 mL/kgBB. < 12 bulan: 30 mL/kg dalam 1 jam lalu 70 mL/kg dalam 5 jam. ≥ 12 bulan: 30 mL/kg dalam 30 menit lalu 70 mL/kg dalam 2,5 jam.']]
};

const FORMULAS = [
 ['Dosis anak dari mg/kgBB','Dosis (mg) = BB (kg) × dosis (mg/kgBB). Selalu bandingkan dengan dosis maksimum dewasa.'],
 ['Volume obat','Volume (mL) = dosis (mg) ÷ konsentrasi (mg/mL).'],
 ['Tetesan infus (tpm)','Tetes/menit = (volume mL × faktor tetes) ÷ waktu (menit). Faktor tetes: makro 20 (kadang 15), mikro 60.'],
 ['Kecepatan infus (mL/jam)','Volume (mL) ÷ waktu (jam).'],
 ['Cockcroft–Gault (kreatinin klirens)','((140 − umur) × BB kg) ÷ (72 × kreatinin mg/dL); × 0,85 untuk wanita.'],
 ['Kebutuhan cairan luka bakar (Parkland)','4 mL × BB (kg) × % luas luka bakar dalam 24 jam; setengah dalam 8 jam pertama.'],
 ['Kalsium terkoreksi','Ca total + 0,8 × (4 − albumin g/dL).'],
 ['Osmolaritas serum','2 × Na + glukosa ÷ 18 + ureum ÷ 2,8 (mOsm/L).'],
 ['Anion gap','Na − (Cl + HCO₃⁻); normal 8–12 mmol/L.'],
 ['MAP','(TDS + 2 × TDD) ÷ 3; target ≥ 65 mmHg.'],
 ['Defisit natrium','0,6 × BB (kg) × (Na target − Na aktual).'],
 ['IMT/BMI','BB (kg) ÷ TB (m)²; normal Asia 18,5–22,9.']
];

const QUICK = [
 {h:'Dosis pantas tiap cek berkas', items:[
  'Cek 5 BENAR: pasien, obat, dosis, rute, waktu.',
  'Cocokkan alergi di kartu pasien dengan setiap obat dan golongannya.',
  'Cek satuan: 1 g = 1.000 mg, 1 mg = 1.000 mcg.',
  'Dosis anak = mg/kgBB × BB, jangan melebihi dosis dewasa.',
  'Cek fungsi ginjal/hati sebelum obat yang dieliminasi di sana.',
  'Cek kehamilan dan menyusui sebelum obat teratogenik.']},
 {h:'Obat yang berbahaya pada kondisi tertentu', items:[
  'Asma/PPOK: beta-blocker non-selektif, aspirin/NSAID (bila sensitif).',
  'Hamil: ACE inhibitor/ARB, warfarin, tetrasiklin, fluorokuinolon, statin, metotreksat.',
  'Gagal ginjal: NSAID, metformin (eGFR < 30), aminoglikosida tanpa penyesuaian, kontras.',
  'Perdarahan saluran cerna: NSAID, aspirin, antikoagulan.',
  'Alergi penisilin: semua penisilin; hati-hati sefalosporin (reaksi silang rendah, tetapi pertimbangkan bila anafilaksis).',
  'Bradikardia/blok AV: beta-blocker, diltiazem/verapamil, digoksin, amiodaron.',
  'Kombinasi nitrat + sildenafil/tadalafil: hipotensi berat.',
  'Anak < 12 tahun: aspirin (Reye), kodein, tramadol, fluorokuinolon (relatif).']},
 {h:'Tanda bahaya yang tidak boleh terlewat', items:[
  'Hiperkalemia > 6 atau perubahan EKG: kalsium glukonas, insulin + dekstrosa, salbutamol, evaluasi dialisis.',
  'Hipoglikemia < 70 mg/dL simtomatik: dekstrosa, jangan tunda.',
  'Syok anafilaksis: epinefrin IM sebagai lini pertama.',
  'Nyeri dada + ST elevasi: STEMI, aspirin + antiplatelet, reperfusi segera.',
  'Eklamsia: magnesium sulfat dan kontrol tekanan darah.']}
];

  /* ================= PANDUAN LENGKAP ================= */
  const GUIDE = (() => {
    const body = q('#igd-book-body'), tabsEl = q('#igd-tabs'), search = q('#igd-search');
    const DRUGS = [...DRUGS_A, ...DRUGS_B].sort((a,b) => a.n.localeCompare(b.n,'id'));
    const DISCLAIMER = '<p class="note">Ringkasan rujukan untuk belajar di dalam game. Dosis lazim dan bisa berbeda menurut kondisi pasien, pedoman rumah sakit, dan sumber resmi (Fornas, PNPK, label obat). Bukan pengganti keputusan klinis.</p>';
    let tab = 'obat';
    const TABS = [['obat','Obat'],['lab','Nilai lab'],['cairan','Cairan & infus'],['anak','Anak'],['kalk','Kalkulator'],['panduan','Panduan']];
    const has = (txt, f) => !f || txt.toLowerCase().includes(f);
    const num = id => { const el = body.querySelector('#'+id); const v = el ? parseFloat(String(el.value).replace(',','.')) : NaN; return isFinite(v) ? v : NaN; };
    const fmt = (n, d=1) => Number(n).toLocaleString('id-ID', {maximumFractionDigits:d});

    function drugCard(d, open){
      const rows = [['Indikasi',d.ind],['Dosis dewasa',d.d],['Dosis anak',d.a]].map(([k,v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')
        + `<dt class="ki">Kontraindikasi</dt><dd>${esc(d.ki)}</dd><dt>Efek samping</dt><dd>${esc(d.es)}</dd>`;
      return `<details class="drug"${open ? ' open' : ''}><summary><b>${esc(d.n)}</b><small>${esc(d.cls)}</small></summary><dl>${rows}</dl></details>`;
    }
    const vObat = f => {
      const list = DRUGS.filter(d => has([d.n,d.alt||'',d.cls,d.ind].join(' '), f));
      return DISCLAIMER + (list.length ? list.map(d => drugCard(d, f && list.length <= 2)).join('') : '<div class="igd-empty">Tidak ada obat yang cocok.</div>');
    };
    const vLab = f => {
      const gs = LABS.map(g => ({g:g.g, rows:g.rows.filter(r => has(g.g + ' ' + r.join(' '), f))})).filter(x => x.rows.length);
      return gs.length ? gs.map(x => `<h4>${esc(x.g)}</h4><table class="tbl">${x.rows.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('')}</table>`).join('')
        + '<p class="note">Rentang normal bisa berbeda antar laboratorium. Pakai nilai rujukan di lembar hasil.</p>' : '<div class="igd-empty">Tidak ada data lab yang cocok.</div>';
    };
    const vCairan = f => {
      const l = FLUIDS.filter(x => has(x.n + ' ' + x.c + ' ' + x.u, f));
      const m = PEDIA.maint.filter(r => has(r.join(' '), f));
      let h = l.length ? '<h4>Jenis cairan infus</h4>' + l.map(x => `<div class="igd-card"><b>${esc(x.n)}</b><div class="c">${esc(x.c)}</div>${esc(x.u)}</div>`).join('') : '';
      if (m.length) h += '<h4>Kebutuhan cairan</h4><table class="tbl">' + m.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('') + '</table>';
      return h || '<div class="igd-empty">Tidak ada cairan yang cocok.</div>';
    };
    const vAnak = f => {
      const sec = (t, rows) => { const r = rows.filter(x => has(x.join(' '), f)); return r.length ? `<h4>${t}</h4><table class="tbl">${r.map(x => `<tr><td>${esc(x[0])}</td><td>${esc(x[1])}</td></tr>`).join('')}</table>` : ''; };
      const vit = LABS.find(g => g.g === 'Tanda vital');
      const h = sec('Resusitasi dan kegawatan anak', PEDIA.resus) + sec('Perkiraan cepat', PEDIA.est) + sec('Cairan rumatan anak', PEDIA.maint) + sec('Tanda vital menurut usia', vit.rows);
      return (h || '<div class="igd-empty">Tidak ada data anak yang cocok.</div>') + '<p class="note">Dosis obat anak ada di tab Obat (baris "Dosis anak"). Gunakan tab Kalkulator untuk menghitung mg dan mL berdasarkan berat badan.</p>';
    };
    const vPanduan = f => {
      const q1 = QUICK.map(g => ({h:g.h, items:g.items.filter(i => has(g.h + ' ' + i, f))})).filter(g => g.items.length);
      const fo = FORMULAS.filter(r => has(r.join(' '), f));
      let h = q1.map(g => `<h4>${esc(g.h)}</h4><ul>${g.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`).join('');
      if (fo.length) h += '<h4>Rumus penting</h4><table class="tbl">' + fo.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('') + '</table>';
      return h || '<div class="igd-empty">Tidak ada panduan yang cocok.</div>';
    };

    const fld = (id, label, val, step) => `<div><label for="${id}">${label}</label><input id="${id}" type="number" inputmode="decimal" min="0" step="${step||'any'}"${val !== undefined ? ` value="${val}"` : ''}></div>`;
    const vKalk = () => `<p class="note">Isi angka, hasil muncul otomatis. Periksa selalu dengan dosis maksimum dan label obat.</p>
      <div class="calc" data-calc="dose"><h4>Dosis obat per berat badan</h4><div class="fields">
        ${fld('c1bb','BB (kg)')}${fld('c1d','Dosis (mg/kgBB/kali)')}${fld('c1f','Frekuensi (kali/hari)',3)}${fld('c1c','Konsentrasi (mg/mL)')}${fld('c1m','Dosis maks/kali (mg)')}
      </div><div class="out" id="c1o"></div></div>
      <div class="calc" data-calc="drip"><h4>Tetesan infus (tetes per menit)</h4><div class="fields">
        ${fld('c2v','Volume (mL)',500)}${fld('c2t','Waktu (jam)',8)}
        <div><label for="c2f">Faktor tetes</label><select id="c2f"><option value="20" selected>Makro 20 tts/mL</option><option value="15">Makro 15 tts/mL</option><option value="60">Mikro 60 tts/mL</option></select></div>
      </div><div class="out" id="c2o"></div></div>
      <div class="calc" data-calc="maint"><h4>Cairan rumatan</h4><div class="fields">${fld('c3bb','BB (kg)')}</div><div class="out" id="c3o"></div></div>
      <div class="calc" data-calc="pump"><h4>Kecepatan syringe pump (mcg/kgBB/menit)</h4><div class="fields">
        ${fld('c4bb','BB (kg)')}${fld('c4d','Dosis (mcg/kg/menit)')}${fld('c4c','Konsentrasi (mg/mL)')}
      </div><div class="out" id="c4o"></div></div>
      <div class="calc" data-calc="cg"><h4>Klirens kreatinin (Cockcroft–Gault)</h4><div class="fields">
        ${fld('c5u','Umur (tahun)')}${fld('c5bb','BB (kg)')}${fld('c5k','Kreatinin (mg/dL)')}
        <div><label for="c5j">Jenis kelamin</label><select id="c5j"><option value="1">Laki-laki</option><option value="0.85">Perempuan</option></select></div>
      </div><div class="out" id="c5o"></div></div>
      <div class="calc" data-calc="burn"><h4>Cairan luka bakar (Parkland)</h4><div class="fields">${fld('c6bb','BB (kg)')}${fld('c6p','Luas luka bakar (%)')}</div><div class="out" id="c6o"></div></div>`;

    const R = {
      dose(){ const bb=num('c1bb'), d=num('c1d'), f=num('c1f'), c=num('c1c'), mx=num('c1m'), o=body.querySelector('#c1o');
        if (!(bb>0 && d>0)) { o.textContent = 'Isi BB dan dosis.'; return; }
        let per = bb*d, w = '';
        if (mx>0 && per>mx) { per = mx; w = `<div class="w">Melebihi dosis maks, dibatasi ke ${fmt(mx)} mg/kali.</div>`; }
        let h = `Dosis: <b>${fmt(per,2)} mg</b> per kali`;
        if (f>0) h += ` · ${fmt(per*f,2)} mg/hari (${fmt(f,0)} kali)`;
        if (c>0) h += `<br>Volume: <b>${fmt(per/c,2)} mL</b> per kali`;
        o.innerHTML = h + w; },
      drip(){ const v=num('c2v'), t=num('c2t'), f=parseFloat(body.querySelector('#c2f').value), o=body.querySelector('#c2o');
        if (!(v>0 && t>0)) { o.textContent = 'Isi volume dan waktu.'; return; }
        o.innerHTML = `<b>${fmt(v*f/(t*60),0)} tetes/menit</b> · ${fmt(v/t,1)} mL/jam`; },
      maint(){ const bb=num('c3bb'), o=body.querySelector('#c3o');
        if (!(bb>0)) { o.textContent = 'Isi BB.'; return; }
        const day = bb<=10 ? bb*100 : bb<=20 ? 1000+(bb-10)*50 : 1500+(bb-20)*20;
        const hr = bb<=10 ? bb*4 : bb<=20 ? 40+(bb-10)*2 : 60+(bb-20);
        o.innerHTML = `Holliday–Segar: <b>${fmt(day,0)} mL/hari</b><br>Aturan 4-2-1: <b>${fmt(hr,0)} mL/jam</b>`; },
      pump(){ const bb=num('c4bb'), d=num('c4d'), c=num('c4c'), o=body.querySelector('#c4o');
        if (!(bb>0 && d>0 && c>0)) { o.textContent = 'Isi BB, dosis, dan konsentrasi.'; return; }
        o.innerHTML = `Kecepatan: <b>${fmt(bb*d*60/(c*1000),2)} mL/jam</b>`; },
      cg(){ const u=num('c5u'), bb=num('c5bb'), k=num('c5k'), j=parseFloat(body.querySelector('#c5j').value), o=body.querySelector('#c5o');
        if (!(u>0 && bb>0 && k>0)) { o.textContent = 'Isi umur, BB, dan kreatinin.'; return; }
        const cl = (140-u)*bb/(72*k)*j;
        const st = cl>=90 ? 'normal' : cl>=60 ? 'penurunan ringan' : cl>=30 ? 'penurunan sedang' : cl>=15 ? 'penurunan berat' : 'gagal ginjal';
        o.innerHTML = `<b>${fmt(cl,0)} mL/menit</b> (${st})${cl<30 ? '<div class="w">Di bawah 30: hindari metformin, sesuaikan dosis obat yang dikeluarkan ginjal.</div>' : ''}`; },
      burn(){ const bb=num('c6bb'), p=num('c6p'), o=body.querySelector('#c6o');
        if (!(bb>0 && p>0)) { o.textContent = 'Isi BB dan luas luka bakar.'; return; }
        const tot = 4*bb*p;
        o.innerHTML = `Total 24 jam: <b>${fmt(tot,0)} mL</b> (RL)<br>8 jam pertama: ${fmt(tot/2,0)} mL (${fmt(tot/16,0)} mL/jam)<br>16 jam berikutnya: ${fmt(tot/2,0)} mL (${fmt(tot/32,0)} mL/jam)`; }
    };
    const calcAll = () => Object.keys(R).forEach(k => R[k]());

    function render(){
      const f = search.value.trim().toLowerCase();
      tabsEl.innerHTML = TABS.map(([k,l]) => `<button type="button" data-tab="${k}" class="${k===tab?'igd-on':''}">${l}</button>`).join('');
      search.hidden = tab === 'kalk';
      const view = {obat:vObat, lab:vLab, cairan:vCairan, anak:vAnak, panduan:vPanduan, kalk:vKalk}[tab];
      body.innerHTML = view(f);
      body.scrollTop = 0;
      if (tab === 'kalk') calcAll();
    }

    tabsEl.addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (!b) return; tab = b.dataset.tab; render(); });
    search.addEventListener('input', () => {
      const keep = tab; render(); search.focus();
      if (keep !== tab) render();
    });
    body.addEventListener('input', e => {
      const c = e.target.closest('[data-calc]'); if (!c) return;
      R[c.dataset.calc]();
    });
    body.addEventListener('change', e => { const c = e.target.closest('[data-calc]'); if (c) R[c.dataset.calc](); });
    render();
    return { render, focusSearch(){ if (!search.hidden) search.focus(); } };
  })();

  /* ================= STATE ================= */
  const LIMIT = 45;           // detik per berkas
  let S = null, tid = null;

  function start(){
    Sfx.unlock();
    const flawed = shuffle(DOCS.filter(d => d.flaw)).slice(0,5);
    const safe = shuffle(DOCS.filter(d => !d.flaw)).slice(0,3);
    S = { queue:shuffle([...flawed,...safe]), i:0, score:0, lives:3, log:[], hl:null, solvedIds:[], pausedAt:0,
          locked:true, resolved:false, advancing:false, frac:1, t0:0, relax:q('#igd-relax').checked };
    E.title.hidden = true; E.end.hidden = true;
    setPlaying(true);
    E.bar.classList.toggle('off', S.relax);
    showDoc();
  }

  function clockText(){
    const m = 22*60 + S.i*45;
    return String(Math.floor(m/60)%24).padStart(2,'0') + ':' + String(m%60).padStart(2,'0');
  }
  function hud(){
    E.clock.textContent = clockText();
    E.count.textContent = Math.min(S.i+1,S.queue.length) + '/' + S.queue.length;
    E.score.textContent = S.score;
    E.lives.innerHTML = [0,1,2].map(i => `<span class="cross${i < S.lives ? '' : ' lost'}">&#10010;</span>`).join('');
  }

  function renderChart(d){
    const p = d.pt, none = /^tidak/i.test(p.alergi);
    E.chart.innerHTML = `<div class="sheet"><h3>Kartu Pasien</h3><dl>
      <dt>Nama</dt><dd>${esc(p.nama)}</dd>
      <dt>Umur / JK</dt><dd>${esc(p.umur)}</dd>
      <dt>Berat badan</dt><dd>${esc(p.bb)}</dd>
      <dt>Diagnosis</dt><dd>${esc(p.dx)}</dd>
      ${p.cat ? `<dt>Catatan</dt><dd>${esc(p.cat)}</dd>` : ''}
    </dl><div class="allergy ${none ? 'none' : ''}"><span>Alergi obat</span><b>${esc(p.alergi)}</b></div></div>`;
  }

  function renderPaper(d){
    const T = TYPES[d.type];
    const no = String(400 + S.i*37 + Math.floor(Math.random()*20)).padStart(4,'0');
    const ident = d.ident || `${d.pt.nama}, ${d.pt.umur}`;
    let h = `<div class="p-head"><div>RSUD Melati Husada<br><small>Instalasi Gawat Darurat</small></div>
      <div class="p-no">No. ${T.prefix}-${no}<br><small>${todayText()} · ${clockText()}</small></div></div>
      <h2 class="p-title">${T.title}</h2>
      <div class="ln ln-id" data-id="id"><span class="k">Pasien</span>${esc(ident)}</div>`;
    if (d.type === 'instruksi') h += `<div class="cols-head"><span>Obat / tindakan</span><span>Dosis</span><span>Rute</span><span>Frekuensi</span></div>`;
    d.sections.forEach(sec => {
      if (sec.h) h += `<h4 class="p-sec">${esc(sec.h)}</h4>`;
      sec.lines.forEach(l => {
        if (l.cols) h += `<div class="ln ln-row" data-id="${l.id}">${l.cols.map(c=>`<span>${esc(c)}</span>`).join('')}</div>`;
        else h += `<div class="ln" data-id="${l.id}"><span class="t">${esc(l.t)}</span>${l.s ? `<span class="s">${esc(l.s)}</span>` : ''}</div>`;
      });
    });
    h += `<div class="p-foot"><div class="sig"><b>${esc(d.sign)}</b><small>${T.signLabel}</small></div>
      <div class="stamp-zone" id="igd-zone"><span>area stempel</span></div></div>`;
    E.paper.className = 'paper ' + T.cls;
    E.paper.innerHTML = h;
    E.paper.style.setProperty('--tilt', (Math.random()*1.4 - .7).toFixed(2) + 'deg');
    void E.paper.offsetWidth;
    E.paper.classList.add('in');
  }

  function setIdle(text, alert){
    E.con.className = 'console';
    E.con.innerHTML = `<div class="con-idle${alert ? ' alert' : ''}">${text}</div>`;
  }
  const IDLE = '<b>Cara kerja:</b> baca kartu pasien, bandingkan dengan berkas, lalu <b>sorot</b> baris yang salah dan cap <b>TOLAK</b>. Kalau semuanya aman, cap <b>ACC</b>.';
  function syncHint(){
    if (S.resolved) return;
    setIdle(S.hl ? 'Baris tersorot. Cap <b>TOLAK</b> untuk menolak berkas, atau klik baris itu lagi untuk membatalkan.' : IDLE);
  }

  function showDoc(){
    const d = S.queue[S.i];
    S.hl = null; S.locked = false; S.resolved = false; S.frac = 1; S.pausedAt = 0;
    root.classList.add('can-mark');
    E.acc.disabled = E.tolak.disabled = false;
    renderChart(d); renderPaper(d); setIdle(IDLE); hud(); startTimer();
  }

  /* ================= TIMER ================= */
  function startTimer(){
    clearInterval(tid);
    S.t0 = Date.now(); E.fill.style.width = '100%'; E.bar.classList.remove('low');
    if (S.relax) return;
    tid = setInterval(() => {
      S.frac = Math.max(0, 1 - (Date.now() - S.t0) / (LIMIT*1000));
      E.fill.style.width = (S.frac*100) + '%';
      E.bar.classList.toggle('low', S.frac < .25);
      if (S.frac <= 0) timeUp();
    }, 100);
  }
  function pauseTimer(){
    if (!S || S.relax || S.locked || S.resolved || S.pausedAt) return;
    clearInterval(tid); S.pausedAt = Date.now();
  }
  function resumeTimer(){
    if (!S || !S.pausedAt) return;
    S.t0 += Date.now() - S.pausedAt; S.pausedAt = 0;
    if (S.relax || S.locked || S.resolved) return;
    clearInterval(tid);
    tid = setInterval(() => {
      S.frac = Math.max(0, 1 - (Date.now() - S.t0) / (LIMIT*1000));
      E.fill.style.width = (S.frac*100) + '%';
      E.bar.classList.toggle('low', S.frac < .25);
      if (S.frac <= 0) timeUp();
    }, 100);
  }
  function timeUp(){
    clearInterval(tid);
    if (!S || S.locked) return;
    S.locked = true; root.classList.remove('can-mark');
    E.acc.disabled = E.tolak.disabled = true;
    resolve(null, true, 0);
  }

  /* ================= AKSI ================= */
  function nudge(){
    E.tray.classList.remove('igd-shake'); void E.tray.offsetWidth; E.tray.classList.add('igd-shake');
    setIdle('Sorot dulu bagian yang salah dengan stabilo, baru cap <b>TOLAK</b>.', true);
    Sfx.bad();
  }

  function decide(action){
    if (!S || S.locked || S.resolved) return;
    if (action === 'tolak' && !S.hl) { nudge(); return; }
    S.locked = true; clearInterval(tid);
    const frac = S.frac;
    E.acc.disabled = E.tolak.disabled = true;
    root.classList.remove('can-mark');
    const zone = q('#igd-zone');
    const x = 38 + Math.random()*24, y = 42 + Math.random()*16;
    const rot = (Math.random()*14 - 7).toFixed(1) + 'deg';
    const hd = document.createElement('div');
    hd.className = 'handle ' + action; hd.style.setProperty('--x', x+'%'); hd.style.setProperty('--y', y+'%');
    const mk = document.createElement('div');
    mk.className = 'mark ' + action; mk.style.setProperty('--x', x+'%'); mk.style.setProperty('--y', y+'%'); mk.style.setProperty('--rot', rot);
    mk.innerHTML = action === 'acc' ? `<b>ACC</b><small>IGD · ${clockText()}</small>` : `<b>TOLAK</b><small>IGD · ${clockText()}</small>`;
    zone.appendChild(hd); zone.appendChild(mk);
    setTimeout(() => { Sfx.thud(); E.mat.classList.add('bump'); setTimeout(() => E.mat.classList.remove('bump'), 180); }, 215);
    setTimeout(() => resolve(action, false, frac), 800);
  }

  function resolve(action, timeout, frac){
    const d = S.queue[S.i], flawed = !!d.flaw, bonus = S.relax ? 0 : Math.round(frac * 50);
    let r;
    if (timeout) r = {cls:'bad', head:'WAKTU HABIS', sub:'Berkas diteruskan tanpa pemeriksaan.', pts:0, life:1};
    else if (action === 'acc') r = flawed
      ? {cls:'bad', head:'INSIDEN KESELAMATAN PASIEN', sub:'Kamu meng-ACC berkas yang mengandung kesalahan fatal.', pts:0, life:1}
      : {cls:'good', head:'ACC TEPAT', sub:'Berkas aman. Pasien segera ditangani.', pts:100 + bonus, life:0};
    else if (!flawed) r = {cls:'warn', head:'PENOLAKAN KELIRU', sub:'Berkas ini sebenarnya aman, pasien jadi tertunda.', pts:-75, life:0};
    else if (S.hl === d.flaw) r = {cls:'good', head:'TOLAK TEPAT', sub:'Kesalahan fatal tersorot dengan benar.', pts:100 + bonus, life:0};
    else r = {cls:'warn', head:'DITOLAK, SOROTAN MELESET', sub:'Berkasnya memang salah, tapi bukan di baris yang kamu sorot.', pts:30, life:0};

    S.resolved = true;
    S.score = Math.max(0, S.score + r.pts); S.lives -= r.life;
    if (r.cls === 'good') S.solvedIds.push(d.id);
    S.log.push({cls:r.cls, pts:r.pts, title:`${TYPES[d.type].title.split(' ·')[0]} · ${d.pt.nama}`});
    if (flawed) { const n = E.paper.querySelector(`.ln[data-id="${d.flaw}"]`); if (n) n.classList.add('truth'); }
    hud();
    r.cls === 'good' ? Sfx.good() : Sfx.bad();

    const last = S.lives <= 0 || S.i >= S.queue.length - 1;
    const ptsTxt = r.life ? '−1 nyawa pasien' : (r.pts >= 0 ? '+' + r.pts + ' poin' : r.pts + ' poin');
    E.con.className = 'console ' + r.cls;
    E.con.innerHTML = `<div class="slip">
      <div class="verdict"><span class="igd-chip">${ptsTxt}</span><h3>${r.head}</h3><p>${r.sub}</p></div>
      <div class="igd-why"><b>${flawed ? 'Kesalahan yang benar' : 'Kenapa aman'}</b><p>${esc(d.why)}</p></div>
      <button class="btn-next" data-act="next">${last ? 'Lihat laporan shift' : 'Berkas berikutnya'} <kbd>Enter</kbd></button></div>`;
  }

  function next(){
    if (!S || !S.resolved || S.advancing) return;
    S.advancing = true;
    E.paper.classList.remove('in'); E.paper.classList.add('out');
    setTimeout(() => {
      S.advancing = false; S.i++;
      if (S.lives <= 0 || S.i >= S.queue.length) finish(); else showDoc();
    }, 380);
  }

  function finish(){
    clearInterval(tid); root.classList.remove('can-mark');
    const ok = S.log.filter(l => l.cls === 'good').length, total = S.queue.length;
    let grade, note;
    if (S.lives <= 0){ grade = 'Dipanggil Komite Medik'; note = 'Terlalu banyak insiden keselamatan pasien. Shift dihentikan lebih awal.'; }
    else if (ok >= 7){ grade = 'Dokter Jaga Teladan'; note = 'Teliti, cepat, dan aman. Pasien beruntung kamu yang jaga malam ini.'; }
    else if (ok >= 5){ grade = 'Dokter Jaga Handal'; note = 'Hampir semua terdeteksi. Cek lagi bagian yang meleset di rekap.'; }
    else if (ok >= 3){ grade = 'Koas Perlu Bimbingan'; note = 'Buka panduan lebih sering dan cocokkan alergi serta berat badan di kartu pasien.'; }
    else { grade = 'Perlu Evaluasi Ulang'; note = 'Ulangi shift dan perhatikan pola kesalahan di rekap.'; }
    const sym = {good:'✓', warn:'!', bad:'✗'};
    E.end.innerHTML = `<div class="folder">
      <h1>LAPORAN <em>SHIFT</em></h1>
      <div class="grade">${grade}</div>
      <p class="igd-lead">${note}</p>
      <div class="igd-big">${S.score} <small style="font-size:1rem">poin · ${ok}/${total} tepat · nyawa pasien tersisa ${Math.max(S.lives,0)}/3</small></div>
      <ul class="report">${S.log.map(l => `<li class="${l.cls}"><span>${sym[l.cls]}</span><em>${esc(l.title)}</em><b>${l.pts > 0 ? '+' : ''}${l.pts}</b></li>`).join('')}</ul>
      <button class="igd-btn" data-act="restart">Main lagi</button>
      <p class="fine">Game edukasi dengan kasus yang disederhanakan. Bukan pengganti pedoman klinis.</p></div>`;
    E.end.hidden = false;
    setPlaying(false);
    const rec = Progress.record({ score:S.score, ok, total, lives:Math.max(S.lives,0), solvedIds:S.solvedIds });
    E.end.querySelector('.igd-big').insertAdjacentHTML('afterend', rec.html);
    awardXP(rec, ok);
    renderStats();
  }

  function toggleBook(force){
    const open = typeof force === 'boolean' ? force : !E.book.classList.contains('open');
    E.book.classList.toggle('open', open);
  }

  /* ================= EVENT ================= */
  E.paper.addEventListener('click', e => {
    const ln = e.target.closest('.ln');
    if (!ln || !S || S.locked) return;
    const id = ln.dataset.id;
    E.paper.querySelectorAll('.ln.hl').forEach(n => n.classList.remove('hl'));
    if (S.hl === id) S.hl = null; else { S.hl = id; ln.classList.add('hl'); Sfx.squeak(); }
    syncHint();
  });

  root.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'start' || a === 'restart') start();
    else if (a === 'acc') decide('acc');
    else if (a === 'tolak') decide('tolak');
    else if (a === 'next') next();
    else if (a === 'book') toggleBook();
    else if (a === 'closebook') toggleBook(false);
    else if (a === 'mute') E.mute.textContent = 'Suara: ' + (Sfx.toggle() ? 'mati' : 'nyala');
    else if (a === 'clear'){
      if (!S || S.locked) return;
      E.paper.querySelectorAll('.ln.hl').forEach(n => n.classList.remove('hl')); S.hl = null; syncHint();
    }
    if (document.activeElement && document.activeElement.blur && a !== 'start' && a !== 'restart') document.activeElement.blur();
  });

  document.addEventListener('keydown', e => {
    if (e.target.matches && e.target.matches('input,textarea,select,[contenteditable]')) return;
    if (!isOpen() || !S || !E.title.hidden || !E.end.hidden) return;
    const k = e.key.toLowerCase();
    if (k === 't') decide('tolak');
    else if (k === 'a') decide('acc');
    else if (k === 'b') toggleBook();
    else if (k === 'escape') toggleBook(false);
    else if ((k === 'enter' || k === ' ') && S.resolved){ e.preventDefault(); next(); }
  });

  function todayText(){ const d = new Date(); return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear(); }
  function isOpen(){ return !!document.getElementById('mejaJagaIgdPage')?.classList.contains('active'); }
  function setPlaying(on){
    playing = !!on;
    try { document.body.classList.toggle('quiz-context', playing && isOpen()); } catch {}
  }
  function renderStats(){
    const el = q('#igd-stats'); if (!el) return;
    el.innerHTML = Progress.statsHtml(DOCS.length);
  }
  function awardXP(rec, ok){
    try {
      if (typeof window.addXP !== 'function') return;
      let totalGained = 0, leveledUp = false;
      rec.newIds.forEach(id => {
        const res = window.addXP(15, 'Meja Jaga IGD • berkas baru', { kind:'quest', ref:'igd:' + id, silent:true });
        if (res && res.gained > 0) { totalGained += res.gained; if (res.leveledUp) leveledUp = true; }
      });
      if (ok > 0) {
        const d = new Date();
        const day = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
        const res = window.addXP(Math.min(40, ok * 5), 'Meja Jaga IGD • shift selesai', { kind:'quest', ref:'igd:shift:' + day, silent:true });
        if (res && res.gained > 0) { totalGained += res.gained; if (res.leveledUp) leveledUp = true; }
        window.recordDailyQuestion?.();
      }
      if (totalGained > 0 && typeof window.showXPPopup === 'function') {
        window.showXPPopup(totalGained, rec.newIds.length ? `Meja Jaga IGD • ${rec.newIds.length} berkas baru` : 'Meja Jaga IGD • shift selesai', leveledUp);
      }
    } catch (e) {}
  }
  let playing = false;
  renderStats();
  window.addEventListener('clined:sync-applied', renderStats);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseTimer();
    else if (isOpen() && playing) resumeTimer();
  });
  return {
    onEnter(){ renderStats(); if (playing) { setPlaying(true); resumeTimer(); } },
    onLeave(){ pauseTimer(); E.book.classList.remove('open'); try { document.body.classList.remove('quiz-context'); } catch {} },
    isPlaying(){ return playing; }
  };
  }

  let game = null;
  function open(){
    if (!game) game = createGame();
    try { window.show?.('mejaJagaIgdPage', { force:true }); window.scrollTo(0, 0); } catch (e) { console.warn(e); }
    game?.onEnter();
  }
  window.addEventListener('clined:view-change', e => {
    if (!game) return;
    if (e.detail === 'mejaJagaIgdPage') game.onEnter(); else game.onLeave();
  });
  window.CLINED_IGD = { open, Progress, isPlaying: () => !!game?.isPlaying() };
})();
