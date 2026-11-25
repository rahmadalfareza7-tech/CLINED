/* CLINED · Meja Jaga IGD v2 — 5 malam bertahap + Mode Sulit, loket triase, lup identitas,
   dokumen geser (KTP/KIA, gelang, hasil lab, kartu JKN), kalkulator & panduan lengkap.
   Dimuat lazy via js/lazy-loader.js (bundle "igd"). Progres disimpan di localStorage "clined_igd_v2"
   dan tersinkron antar perangkat (merge max-deep di lib/sync-merge.mjs & js/online-sync.js). */
(() => {
  'use strict';
  const KEY = 'clined_igd_v2';
  const LEGACY_KEY = 'igd-meja-jaga-v1';

  const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const docId = d => String(d?.pt?.nama || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  function sanitizeProgress(raw) {
    const v = isObj(raw) ? raw : {};
    const best = {};
    if (isObj(v.best)) {
      Object.entries(v.best).forEach(([k, val]) => {
        const n = Math.max(0, Math.round(Number(val) || 0));
        if (n > 0) best[k] = n;
      });
    }
    const done = {};
    if (isObj(v.done)) {
      Object.entries(v.done).forEach(([k, val]) => { if (val) done[k] = true; });
    }
    const solved = {};
    if (isObj(v.solved)) {
      Object.entries(v.solved).forEach(([k, val]) => { if (val) solved[k] = 1; });
    }
    return {
      unlocked: Math.max(1, Math.min(6, Math.round(Number(v.unlocked) || 1))),
      best,
      done,
      solved,
      runs: Math.max(0, Math.round(Number(v.runs) || 0)),
      at: Math.max(0, Math.round(Number(v.at) || 0))
    };
  }

  /* ================= PROGRES (sinkron multi-perangkat) ================= */
  const Progress = {
    KEY,
    read() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) return sanitizeProgress(JSON.parse(raw));
        const leg = localStorage.getItem(LEGACY_KEY);
        if (leg) {
          const migrated = sanitizeProgress(JSON.parse(leg));
          Progress.write(migrated);
          return migrated;
        }
      } catch (e) {}
      return sanitizeProgress(null);
    },
    write(p) {
      try { localStorage.setItem(KEY, JSON.stringify(sanitizeProgress(p))); } catch (e) {}
    },
    record({ night, score, ok, total, alive, solvedIds }) {
      const p = Progress.read();
      const n = Math.min(Math.max(+night || 1, 1), 6);
      const prev = p.best[n] || 0;
      const sc = Math.max(0, Math.round(Number(score) || 0));
      const isBest = sc > prev;
      if (isBest) p.best[n] = sc;
      const wasDone = !!p.done[n];
      let newlyClearedNight = false;
      if (alive) {
        p.done[n] = true;
        if (!wasDone) newlyClearedNight = true;
        if (n < 5 && p.unlocked < n + 1) p.unlocked = n + 1;
      }
      const newIds = [];
      (solvedIds || []).forEach(id => {
        if (id && !p.solved[id] && !newIds.includes(id)) newIds.push(id);
      });
      newIds.forEach(id => { p.solved[id] = 1; });
      p.runs += 1;
      p.at = Date.now();
      Progress.write(p);
      return { p, prev, isBest, newIds, newlyClearedNight };
    }
  };

  const MARKUP = `<div class="igd-stage" id="igd-stage">
<div class="igd" id="igd">
  <svg width="0" height="0" style="position:absolute" aria-hidden="true">
    <filter id="igd-rough"><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="3" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="3"/></filter>
  </svg>

  <header class="hud">
    <div class="hud-brand"><span>Meja Jaga IGD<small>SHIFT MALAM</small></span></div>
    <div class="hud-item"><span class="lbl">Jam</span><b id="igd-clock">22:00</b></div>
    <div class="hud-item"><span class="lbl">Berkas</span><b id="igd-count">1/8</b></div>
    <div class="hud-item"><span class="lbl">Skor</span><b id="igd-score">0</b></div>
    <div class="hud-item"><span class="lbl">Nyawa pasien</span><b class="lives" id="igd-lives"><span class="cross">&#10010;</span><span class="cross">&#10010;</span><span class="cross">&#10010;</span></b></div>
    <div class="hud-btns">
      <button class="mini-btn igd-exit" data-act="exit">‹ Beranda</button>
      <button class="mini-btn" data-act="book">Panduan <kbd>B</kbd></button>
      <button class="mini-btn btn-calc" data-act="calc">Kalkulator <kbd>K</kbd></button>
      <button class="mini-btn" data-act="mute" id="igd-mute">Suara: nyala</button>
    </div>
  </header>
  <div class="timebar"><i id="igd-timefill"></i></div>

  <div class="play">
  <section class="booth" aria-label="Loket triase">
    <div class="b-wait"><span class="b-lbl">Ruang tunggu</span><div class="b-bench"></div><div class="queue" id="igd-queue"></div></div>
    <div class="b-window">
      <div class="b-poster"><b>CUCI</b><b>TANGAN</b><i></i></div>
      <div class="b-people" id="igd-people"></div>
      <div class="bubble" id="igd-bubble" hidden></div>
      <div class="b-glass"></div>
      <div class="b-ledge"><i></i></div>
    </div>
    <div class="b-info"><div class="b-sign">TRIASE<small>IGD 24 JAM</small></div><div class="b-clock" id="igd-bclock">22:00</div><div class="b-q">Antrean <b id="igd-qn">0</b></div></div>
  </section>

  <main class="desk">
    <section class="surface" id="igd-surface">
      <aside class="chart dcard" id="igd-chart"></aside>
      <article class="paper dcard" id="igd-paper"></article>
      <aside class="idcard dcard" id="igd-idcard" aria-label="Kartu identitas pasien" hidden></aside>
      <aside class="gelang dcard" id="igd-gelang" aria-label="Gelang identitas" hidden></aside>
      <aside class="labsheet dcard" id="igd-lab" aria-label="Hasil laboratorium" hidden></aside>
      <aside class="jkn dcard" id="igd-jkn" aria-label="Kartu JKN" hidden></aside>
      <span class="surface-hint">Kartu dan berkas bisa digeser</span>
    </section>

  </main>
  </div>

  <svg class="link" id="igd-link" aria-hidden="true"></svg>
  <div class="link-tag" id="igd-link-tag" hidden></div>

  <div class="dock" id="igd-dock">
    <footer class="console" id="igd-console"></footer>
      <div class="tray">
        <button class="lens-btn" id="igd-lens" data-act="inspect">
          <span class="lens"></span><span><b>Periksa identitas</b><small>Klik 2 data, lihat cocok atau tidak</small></span><kbd>P</kbd>
        </button>
        <div class="marker-card">
          <svg class="hl-pen" viewBox="0 0 180 64" aria-hidden="true">
            <ellipse cx="94" cy="57" rx="74" ry="5" fill="#000" fill-opacity=".07"/>
            <g transform="rotate(-7 90 32)">
              <path d="M6 31 L24 22 L24 42 L6 37 Z" fill="#ff4f7b"/>
              <path d="M6 34 L24 36 L24 42 L6 37 Z" fill="#e23565"/>
              <rect x="21" y="17" width="17" height="30" rx="5" fill="#5b5b5b"/>
              <rect x="21" y="38" width="17" height="9" rx="4" fill="#474747"/>
              <rect x="34" y="11" width="106" height="42" rx="15" fill="#ff4f7b"/>
              <rect x="38" y="41" width="98" height="10" rx="5" fill="#e23565"/>
              <rect x="44" y="16" width="16" height="5" rx="2.5" fill="#fff" fill-opacity=".55"/>
              <rect x="64" y="20" width="48" height="22" rx="9" fill="#fff"/>
              <text x="88" y="35.5" text-anchor="middle" font-family="Nunito,system-ui,sans-serif" font-weight="900" font-size="11" letter-spacing="1" fill="#ff4f7b">SOROT</text>
              <rect x="134" y="7" width="34" height="50" rx="15" fill="#d6305e"/>
              <rect x="134" y="45" width="34" height="12" rx="6" fill="#b52450"/>
              <rect x="146" y="2" width="11" height="34" rx="5.5" fill="#a81f47"/>
            </g>
          </svg>
          <span class="mk-txt"><b>Stabilo merah</b><small>Klik baris yang salah</small></span>
          <button class="mini-btn" data-act="clear">Hapus sorotan</button>
        </div>
        <button class="mini-btn tidy" data-act="tidy">Rapikan meja <kbd>R</kbd></button>
        <span class="tray-gap"></span>
        <button class="stamp stamp-tolak" id="igd-tolak" data-act="tolak">
          <span class="knob"></span><span class="base"><b>TOLAK</b><kbd>T</kbd></span>
        </button>
        <button class="stamp stamp-acc" id="igd-acc" data-act="acc">
          <span class="knob"></span><span class="base"><b>ACC</b><kbd>A</kbd></span>
        </button>
      </div>
  </div>

  <aside class="book" id="igd-book" aria-label="Panduan lengkap">
    <div class="book-top">
      <button class="close" data-act="closebook">Tutup</button>
      <h2>Panduan Lengkap</h2>
      <span class="warn">Waktu tetap berjalan saat kamu membaca!</span>
      <input type="search" id="igd-search" placeholder="Cari obat, identitas, nilai lab, cairan…" autocomplete="off" aria-label="Cari di panduan">
      <nav class="tabs" id="igd-tabs"></nav>
    </div>
    <div class="book-body" id="igd-book-body"></div>
  </aside>

  <section class="screen" id="igd-title">
    <div class="folder">
      <div class="cast" id="igd-cast"></div>
      <h1>MEJA JAGA <em>IGD</em></h1>
      <p class="byline">by <b>CLINED</b></p>
      <p class="igd-lead">Lima malam jaga, aturannya bertambah tiap malam. Boleh mulai dari malam mana saja. Tiap berkas terlihat 95% normal. Tapi kadang, satu kesalahan fatal terselip di dalamnya. Kamu dokter jaga malam ini. Jangan sampai ada yang lolos.</p>
      <div class="nights" id="igd-nights"></div>
      <label class="igd-opt"><input type="checkbox" id="igd-relax"> Mode santai (tanpa timer)</label>
      <button class="igd-btn igd-btn-ghost igd-title-exit" data-act="exit">‹ Kembali ke Beranda</button>
      <p class="fine">Game edukasi dengan kasus yang disederhanakan. Bukan pengganti pedoman klinis atau keputusan tenaga medis. Pintasan: P periksa identitas · T tolak · A ACC · B panduan · K kalkulator · Enter lanjut.</p>
    </div>
  </section>

  <section class="screen" id="igd-memo" hidden></section>
  <section class="screen" id="igd-end" hidden></section>
</div>
</div>`;

  function createGame(){
  const host = document.getElementById('mejaJagaIgdHost');
  if (!host) return null;
  host.innerHTML = MARKUP;
  const stage = host.querySelector('#igd-stage');
  const root = host.querySelector('#igd');
  const q = s => root.querySelector(s);
  const E = {
    clock:q('#igd-clock'), count:q('#igd-count'), score:q('#igd-score'), lives:q('#igd-lives'),
    fill:q('#igd-timefill'), bar:q('.timebar'), chart:q('#igd-chart'), paper:q('#igd-paper'), idcard:q('#igd-idcard'),
    con:q('#igd-console'), title:q('#igd-title'), end:q('#igd-end'), book:q('#igd-book'),
    gelang:q('#igd-gelang'), lab:q('#igd-lab'), jkn:q('#igd-jkn'), memo:q('#igd-memo'), nights:q('#igd-nights'),
    people:q('#igd-people'), bubble:q('#igd-bubble'), queue:q('#igd-queue'), qn:q('#igd-qn'), bclock:q('#igd-bclock'),
    link:q('#igd-link'), linkTag:q('#igd-link-tag'), lens:q('#igd-lens'),
    acc:q('#igd-acc'), tolak:q('#igd-tolak'), tray:q('.tray'), mat:q('#igd-surface'), mute:q('#igd-mute')
  };
  /* atribut untuk data identitas yang bisa diperiksa: jenis, sumber, nilai pembanding, teks tampilan */
  const normName = n => String(n).replace(/^(Tn|Ny|An|Nn|Sdr)\.\s*/i,'').trim().toUpperCase();
  const ia = (kind, src, val, show) => `data-ik="${kind}" data-src="${src}" data-iv="${esc(val)}" data-show="${esc(show)}"`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  /* ================= PAS-LAYAR (laptop & tablet) ================= */
  const FIT = (() => {
    let on = false, s = 1, key = '';
    function update(){
      const vw = window.innerWidth, vh = window.innerHeight;
      on = isOpen() && Math.min(vw, vh) >= 600;
      const land = vw >= vh, cw = land ? 1440 : 900, ch = land ? 960 : 1500;
      stage.classList.toggle('fit', on); document.documentElement.classList.toggle('igd-fit', on);
      root.classList.toggle('fit', on); root.classList.toggle('land', on && land); root.classList.toggle('port', on && !land);
      if (on){
        s = Math.min(vw / cw, vh / ch);
        root.style.setProperty('--cw', cw + 'px'); root.style.setProperty('--ch', ch + 'px'); root.style.setProperty('--s', s);
      } else { s = 1; ['--cw','--ch','--s'].forEach(v => root.style.removeProperty(v)); }
      const k = on ? (land ? 'L' : 'P') : 'N', changed = k !== key; key = k;
      return changed;
    }
    update();
    function disable(){
      on = false; s = 1; key = '';
      stage.classList.remove('fit'); document.documentElement.classList.remove('igd-fit');
      root.classList.remove('fit', 'land', 'port');
      ['--cw','--ch','--s'].forEach(v => root.style.removeProperty(v));
    }
    return { update, disable, get on(){ return on; }, get s(){ return on ? s : 1; } };
  })();
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

  /* ---------- Identitas: tanggal game, umur, NIK ---------- */
  const GAME = {y:2026, m:11, d:25};
  const GAME_DATE = '25/11/2026';
  const age = iso => { const [y,m,d] = iso.split('-').map(Number); let a = GAME.y - y; if (GAME.m < m || (GAME.m === m && GAME.d < d)) a--; return a; };
  const dmy = iso => iso.split('-').reverse().join('-');
  /* NIK: 2 provinsi + 2 kab/kota + 2 kecamatan + DDMMYY (perempuan: tanggal + 40) + 4 nomor urut */
  const NIK = (wil, kec, lahir, jk, sn) => { const [y,m,d] = lahir.split('-');
    return wil + kec + String(+d + (jk === 'P' ? 40 : 0)).padStart(2,'0') + m + y.slice(2) + sn; };
  const WIL = {'3273':'KOTA BANDUNG','3204':'KABUPATEN BANDUNG','3277':'KOTA CIMAHI','3275':'KOTA BEKASI','3201':'KABUPATEN BOGOR','3205':'KABUPATEN GARUT'};

  /* pt  = data rekam medis (kartu pasien, selalu benar)
     ktp = isi dokumen yang dibawa pasien (KTP dewasa / KIA anak < 17 th)
     idx = penimpaan isi KTP/KIA untuk kasus identitas salah
     berkas = penimpaan identitas di berkas (nama, umur, jk, rm)
     kind:'id' = kesalahan identitas; flaw boleh berupa array (semua dianggap benar) */
  const DOCS = [
    { type:'resep', sign:'dr. Anindya', flaw:'l2',
      pt:{nama:'Tn. Budi Santoso', lahir:'1992-03-12', jk:'L', rm:'02-41-17', bb:'68 kg', dx:'Asma persisten sedang, keluhan berdebar', alergi:'Tidak ada', cat:'Asma sejak SMA, sering kambuh malam hari'},
      ktp:{wil:'3273', kec:'05', sn:'0002', tl:'BANDUNG', alamat:'JL. CIHAMPELAS NO. 41', agama:'ISLAM', kawin:'KAWIN', kerja:'KARYAWAN SWASTA', goldar:'O'},
      sections:[{lines:[
        {id:'l1', t:'R/ Salbutamol inhaler 100 mcg', s:'S prn 2 puff bila sesak'},
        {id:'l2', t:'R/ Propranolol tab 40 mg', s:'S 2 dd tab I (untuk berdebar)'},
        {id:'l3', t:'R/ Budesonid inhaler 200 mcg', s:'S 2 dd 1 puff, kumur setelah pakai'}]}],
      why:'Propranolol adalah beta-blocker non-selektif. Pada pasien asma obat ini bisa memicu bronkospasme berat. Perlu alternatif lain atau konsul dulu.' },

    { type:'resep', sign:'dr. Rahmat', flaw:'l1',
      pt:{nama:'An. Raka Pratama', lahir:'2021-07-19', jk:'L', rm:'03-18-52', bb:'15 kg', dx:'Demam 2 hari, ISPA', alergi:'Tidak ada', cat:''},
      ktp:{wil:'3204', kec:'12', sn:'0001', tl:'BANDUNG', alamat:'KP. CILEUNYI RT 03/07', agama:'ISLAM', kk:'3204120908150004', kepala:'HENDRA PRATAMA'},
      sections:[{lines:[
        {id:'l1', t:'R/ Paracetamol tab 500 mg', s:'S 4 dd tab I'},
        {id:'l2', t:'R/ Ambroksol sirup 15 mg/5 mL', s:'S 3 dd 1/2 sdt'},
        {id:'l3', t:'R/ NaCl 0,9% tetes hidung', s:'S 3 dd 2 tetes tiap lubang'}]}],
      why:'Dosis wajar paracetamol anak 10–15 mg/kgBB per kali, jadi kira-kira 150–225 mg untuk 15 kg. Tablet 500 mg adalah dosis dewasa (±33 mg/kgBB per kali) dan berisiko merusak hati.' },

    { type:'instruksi', sign:'dr. Hendra, Sp.PD', flaw:'l2',
      pt:{nama:'Ny. Rukmini', lahir:'1959-04-02', jk:'P', rm:'00-87-33', bb:'60 kg', dx:'Gagal jantung dekompensasi, edema paru', alergi:'Tidak ada', cat:''},
      ktp:{wil:'3277', kec:'02', sn:'0004', tl:'CIMAHI', alamat:'JL. AMIR MAHMUD GG. MELATI 3', agama:'ISLAM', kawin:'CERAI MATI', kerja:'MENGURUS RUMAH TANGGA', goldar:'A'},
      sections:[{lines:[
        {id:'l1', cols:['O₂ nasal kanul','3 L/menit','Inhalasi','Kontinu']},
        {id:'l2', cols:['Furosemid','40 gram','IV','Bolus, sekali']},
        {id:'l3', cols:['Monitor urin','> 0,5 mL/kgBB/jam','—','Tiap 1 jam']}]}],
      why:'Kesalahan satuan. 40 gram sama dengan 40.000 mg, yaitu 1.000 kali dosis normal. Seharusnya furosemid 40 mg IV.' },

    { type:'soap', sign:'c. Dimas', flaw:null,
      pt:{nama:'Ny. Sari Wulandari', lahir:'1968-01-23', jk:'P', rm:'01-56-09', bb:'62 kg', dx:'Nyeri dada akut', alergi:'Tidak ada', cat:'Hipertensi, tidak rutin minum obat'},
      ktp:{wil:'3273', kec:'14', sn:'0007', tl:'GARUT', alamat:'JL. SOEKARNO-HATTA NO. 220', agama:'ISLAM', kawin:'KAWIN', kerja:'PEDAGANG', goldar:'B'},
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
      why:'Aman. Identitas cocok di ketiga sumber. Antiplatelet ganda dengan dosis loading dan rencana reperfusi sesuai untuk STEMI. Oksigen tidak perlu bila saturasi normal.' },

    { type:'resep', sign:'dr. Anindya', flaw:'l1',
      pt:{nama:'Tn. Dimas Aditya', lahir:'1999-09-30', jk:'L', rm:'04-02-71', bb:'72 kg', dx:'Tonsilofaringitis bakterial', alergi:'PENISILIN (anafilaksis, 2019)', cat:''},
      ktp:{wil:'3275', kec:'03', sn:'0003', tl:'JAKARTA', alamat:'PERUM GRIYA ASRI BLOK C2/14', agama:'KRISTEN', kawin:'BELUM KAWIN', kerja:'KARYAWAN SWASTA', goldar:'AB'},
      sections:[{lines:[
        {id:'l1', t:'R/ Amoksisilin tab 500 mg', s:'S 3 dd tab I'},
        {id:'l2', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p demam'},
        {id:'l3', t:'R/ Klorheksidin 0,2% obat kumur', s:'S 2 dd kumur'}]}],
      why:'Amoksisilin termasuk golongan penisilin. Pasien punya riwayat anafilaksis penisilin, jadi obat ini kontraindikasi.' },

    { type:'soap', sign:'c. Nadia', flaw:'p1',
      pt:{nama:'Ny. Dewi Lestari', lahir:'1997-02-11', jk:'P', rm:'03-77-40', bb:'66 kg', dx:'Hipertensi dalam kehamilan, G2P1A0 hamil 20 minggu', alergi:'Tidak ada', cat:''},
      ktp:{wil:'3204', kec:'07', sn:'0005', tl:'SUMEDANG', alamat:'KP. CIBODAS RT 02/05', agama:'ISLAM', kawin:'KAWIN', kerja:'GURU', goldar:'O'},
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

    { type:'instruksi', sign:'dr. Hendra, Sp.PD', flaw:'l3',
      pt:{nama:'Tn. Hartono', lahir:'1971-06-08', jk:'L', rm:'00-34-95', bb:'70 kg', dx:'DM tipe 2 dengan AKI', alergi:'Tidak ada', cat:'Kreatinin 4,2 mg/dL, eGFR ±15'},
      ktp:{wil:'3273', kec:'21', sn:'0001', tl:'SURAKARTA', alamat:'JL. PASIRKALIKI NO. 88', agama:'KATOLIK', kawin:'KAWIN', kerja:'WIRASWASTA', goldar:'-'},
      sections:[{lines:[
        {id:'l1', cols:['NaCl 0,9%','500 mL','IV','Habis dalam 4 jam']},
        {id:'l2', cols:['Insulin reguler','4 unit','SC','Bila GDS > 250']},
        {id:'l3', cols:['Metformin','500 mg','PO','3 × sehari']}]}],
      why:'Metformin tidak boleh diberikan bila eGFR < 30 karena risiko asidosis laktat. Pasien ini eGFR-nya sekitar 15.' },

    { type:'soap', sign:'c. Bayu', flaw:null,
      pt:{nama:'An. Nadia Putri', lahir:'2024-05-15', jk:'P', rm:'05-10-28', bb:'12 kg', dx:'Diare akut', alergi:'Tidak ada', cat:''},
      ktp:{wil:'3277', kec:'01', sn:'0002', tl:'CIMAHI', alamat:'JL. KOLONEL MASTURI NO. 12', agama:'ISLAM', kk:'3277011203190006', kepala:'RUDI HERMAWAN'},
      sections:[
        {h:'S · Subjective', lines:[{id:'s1', t:'Diare cair 6 kali sejak kemarin, muntah 1 kali, masih mau minum.'}]},
        {h:'O · Objective', lines:[{id:'o1', t:'Suhu 37,8, mata sedikit cekung, turgor kembali lambat, CRT 2 detik.'}]},
        {h:'A · Assessment', lines:[{id:'a1', t:'Diare akut dehidrasi ringan–sedang, tanpa tanda disentri.'}]},
        {h:'P · Plan', lines:[
          {id:'p1', t:'Oralit 75 mL/kgBB dalam 3 jam (±900 mL).'},
          {id:'p2', t:'Zinc 20 mg 1 kali sehari selama 10 hari.'},
          {id:'p3', t:'Antibiotik tidak diindikasikan. Edukasi tanda bahaya.'}]}],
      why:'Aman. KIA anak di bawah 5 tahun memang tanpa foto. Oralit 75 × 12 kg = 900 mL, zinc 20 mg untuk usia ≥ 6 bulan, dan antibiotik memang tidak perlu pada diare cair tanpa tanda disentri.' },

    { type:'resep', sign:'dr. Rahmat', flaw:null,
      pt:{nama:'Tn. Agus Wibowo', lahir:'1985-10-03', jk:'L', rm:'02-90-63', bb:'75 kg', dx:'Dispepsia', alergi:'Tidak ada', cat:''},
      ktp:{wil:'3201', kec:'10', sn:'0006', tl:'BOGOR', alamat:'JL. RAYA PUNCAK KM 7', agama:'ISLAM', kawin:'KAWIN', kerja:'PEGAWAI NEGERI SIPIL', goldar:'A'},
      idx:{berlaku:'03-10-2017', terbit:'03-10-2012'},
      sections:[{lines:[
        {id:'l1', t:'R/ Omeprazol cap 20 mg', s:'S 1 dd cap I sebelum makan pagi'},
        {id:'l2', t:'R/ Antasida DOEN tab', s:'S 3 dd tab I kunyah, 1 jam sesudah makan'},
        {id:'l3', t:'R/ Domperidon tab 10 mg', s:'S 3 dd tab I sebelum makan'}]}],
      why:'Aman. Foto KTP-nya foto lama tanpa kacamata, tapi wajahnya orang yang sama. KTP-el cetakan lama yang masih mencantumkan masa berlaku (03-10-2017) tetap sah seumur hidup, jadi bukan alasan menolak. Obat dan dosisnya lazim untuk dispepsia dewasa.' },

    { type:'resep', sign:'dr. Anindya', flaw:'l2',
      pt:{nama:'Tn. Slamet Riyadi', lahir:'1964-02-27', jk:'L', rm:'01-11-84', bb:'65 kg', dx:'Hematemesis melena e.c. tukak lambung', alergi:'Tidak ada', cat:'Hb 8,1 g/dL, sering minum obat nyeri sendiri'},
      ktp:{wil:'3205', kec:'04', sn:'0003', tl:'GARUT', alamat:'DS. SUKAMULYA RT 01/03', agama:'ISLAM', kawin:'KAWIN', kerja:'PETANI/PEKEBUN', goldar:'O'},
      sections:[{lines:[
        {id:'l1', t:'R/ Pantoprazol inj 40 mg', s:'S 2 dd 1 vial IV'},
        {id:'l2', t:'R/ Natrium diklofenak tab 50 mg', s:'S 3 dd tab I (nyeri lutut)'},
        {id:'l3', t:'R/ Sukralfat sirup', s:'S 3 dd C I sebelum makan'}]}],
      why:'Diklofenak adalah NSAID. Obat ini memperburuk perdarahan saluran cerna dan harus dihindari pada pasien yang sedang berdarah dari tukak lambung.' },

    { type:'instruksi', sign:'dr. Wulan, Sp.OT', flaw:null,
      pt:{nama:'Ny. Lina Marlina', lahir:'1981-08-19', jk:'P', rm:'03-05-92', bb:'55 kg', dx:'Fraktur radius distal, nyeri sedang–berat', alergi:'Tidak ada', cat:''},
      ktp:{wil:'3273', kec:'09', sn:'0004', tl:'BANDUNG', alamat:'JL. DAGO ATAS NO. 5', agama:'ISLAM', kawin:'KAWIN', kerja:'KARYAWAN SWASTA', goldar:'B'},
      sections:[{lines:[
        {id:'l1', cols:['Paracetamol infus','1 gram','IV drip 15 menit','Tiap 6 jam, maks 4 g/hari']},
        {id:'l2', cols:['Ondansetron','4 mg','IV','Bila mual, maks 3×/hari']},
        {id:'l3', cols:['Imobilisasi bidai','Posisi netral','—','Sampai konsul Sp.OT']}]}],
      why:'Aman. Identitas cocok. Paracetamol 1 gram untuk BB > 50 kg dengan batas harian jelas, ondansetron dosis lazim, dan tidak ada alergi.' },

    /* ---------- Kasus identitas ---------- */
    { type:'resep', sign:'dr. Rahmat', flaw:'id', kind:'id',
      pt:{nama:'Ny. Maya Kusuma', lahir:'1995-04-06', jk:'P', rm:'04-28-60', bb:'58 kg', dx:'ISK tanpa komplikasi, tidak hamil', alergi:'Tidak ada', cat:''},
      ktp:{wil:'3275', kec:'08', sn:'0005', tl:'BEKASI', alamat:'JL. KALIMALANG NO. 17', agama:'ISLAM', kawin:'BELUM KAWIN', kerja:'KARYAWAN SWASTA', goldar:'A'},
      berkas:{lahir:'2013-04-06'},
      sections:[{lines:[
        {id:'l1', t:'R/ Siprofloksasin tab 500 mg', s:'S 2 dd tab I, 3 hari'},
        {id:'l2', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p nyeri'},
        {id:'l3', t:'R/ Edukasi: banyak minum air putih', s:''}]}],
      why:'Tanggal lahir di berkas 06-04-2013 (13 th), padahal KTP dan kartu pasien menunjukkan 06-04-1995 (31 th). Berkas harus ditolak dan diverifikasi ulang karena berisiko salah pasien atau salah dosis.' },

    { type:'resep', sign:'dr. Anindya', flaw:['ktp-ttl','ktp-foto'], kind:'id',
      pt:{nama:'Tn. Joko Susilo', lahir:'1988-08-14', jk:'L', rm:'04-63-21', bb:'70 kg', dx:'Myalgia pascaolahraga', alergi:'Tidak ada', cat:'Datang diantar istri'},
      ktp:{wil:'3204', kec:'15', sn:'0002', tl:'BANDUNG', alamat:'JL. RAYA BANJARAN NO. 102', agama:'ISLAM', kawin:'KAWIN', kerja:'KARYAWAN SWASTA', goldar:'O'},
      idx:{lahir:'1958-08-14', sn:'0001', kerja:'PENSIUNAN'},
      sections:[{lines:[
        {id:'l1', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p nyeri'},
        {id:'l2', t:'R/ Ibuprofen tab 400 mg', s:'S 3 dd tab I sesudah makan, 3 hari'},
        {id:'l3', t:'R/ Edukasi: istirahat, kompres hangat', s:''}]}],
      why:'KTP yang dibawa bukan milik pasien. Namanya sama, tetapi tanggal lahirnya 14-08-1958 (68 th), sedangkan kartu pasien 14-08-1988 (38 th). Fotonya juga jelas orang yang lebih tua. Alamatnya sama karena serumah, jadi kemungkinan KTP ayahnya. Nama, tanggal lahir, dan alamat harus cocok semua sebelum berkas di-ACC.' },

    { type:'instruksi', sign:'dr. Hendra, Sp.PD', flaw:'id', kind:'id',
      pt:{nama:'Ny. Siti Rahmawati', lahir:'1982-10-30', jk:'P', rm:'01-23-45', bb:'54 kg', dx:'Perdarahan uterus abnormal, anemia', alergi:'Tidak ada', cat:'Hb 6,8 g/dL. Di IGD ada pasien lain bernama sama.'},
      ktp:{wil:'3273', kec:'11', sn:'0008', tl:'CIANJUR', alamat:'JL. ANTAPANI LAMA NO. 9', agama:'ISLAM', kawin:'KAWIN', kerja:'MENGURUS RUMAH TANGGA', goldar:'B'},
      berkas:{lahir:'1979-02-14'},
      sections:[{lines:[
        {id:'l1', cols:['Transfusi PRC','2 kolf','IV','Sesuai hasil crossmatch']},
        {id:'l2', cols:['Asam traneksamat','500 mg','IV pelan','Tiap 8 jam']},
        {id:'l3', cols:['Monitor tanda vital','—','—','Tiap 15 menit saat transfusi']}]}],
      why:'Tanggal lahir di berkas (14-02-1979, 47 th) beda dengan kartu pasien dan KTP (30-10-1982, 44 th). Namanya sama, jadi berkas ini kemungkinan milik pasien lain bernama sama. Salah pasien pada transfusi bisa fatal. Jangan cocokkan nama saja.' },

    { type:'resep', sign:'dr. Rahmat', flaw:['ktp-nama','ktp-ttl','ktp-foto'], kind:'id',
      pt:{nama:'An. Bima Saputra', lahir:'2019-03-04', jk:'L', rm:'05-44-16', bb:'22 kg', dx:'Otitis media akut', alergi:'Tidak ada', cat:'Diantar ibu'},
      ktp:{wil:'3275', kec:'05', sn:'0003', tl:'BEKASI', alamat:'JL. HARAPAN INDAH BLOK F/8', agama:'ISLAM', kk:'3275051107140002', kepala:'AHMAD SAPUTRA'},
      idx:{nama:'BIMO SAPUTRA', lahir:'2016-01-21', sn:'0001'},
      sections:[{lines:[
        {id:'l1', t:'R/ Amoksisilin sirup 250 mg/5 mL', s:'S 2 dd 3½ cth (17,5 mL), 7 hari'},
        {id:'l2', t:'R/ Paracetamol sirup 120 mg/5 mL', s:'S 3 dd 2 cth k/p demam'},
        {id:'l3', t:'R/ Edukasi: kontrol bila 3 hari tidak membaik', s:''}]}],
      why:'KIA yang dibawa milik anak lain: nama BIMO (bukan Bima), lahir 21-01-2016 (10 th), dan wajah di fotonya bukan anak yang dibawa. Kemungkinan KIA kakaknya. Verifikasi identitas dulu, karena dosis anak dihitung dari umur dan berat badan pasien yang benar.' },

    { type:'resep', sign:'dr. Anindya', flaw:['ktp-alamat','ktp-foto'], kind:'id',
      pt:{nama:'Ny. Ratna Kurniasih', lahir:'1985-05-07', jk:'P', rm:'02-15-58', bb:'60 kg', dx:'Gastroenteritis akut, dehidrasi ringan', alergi:'Tidak ada', cat:''},
      ktp:{wil:'3273', kec:'06', sn:'0003', tl:'TASIKMALAYA', alamat:'JL. GATOT SUBROTO NO. 63', agama:'ISLAM', kawin:'KAWIN', kerja:'WIRASWASTA', goldar:'AB'},
      idx:{alamat:'KP. SUKAHAJI RT 04/02', wil:'3205', kec:'09', sn:'0001', tl:'GARUT', kerja:'PETANI/PEKEBUN', goldar:'-'},
      sections:[{lines:[
        {id:'l1', t:'R/ Oralit', s:'S 200 mL tiap BAB cair'},
        {id:'l2', t:'R/ Ondansetron tab 4 mg', s:'S 3 dd tab I k/p mual'},
        {id:'l3', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p demam'}]}],
      why:'Nama dan tanggal lahir di KTP sama, tetapi alamatnya (Kp. Sukahaji, Kab. Garut) beda dengan data rekam medis (Jl. Gatot Subroto, Kota Bandung). Foto di KTP juga wajah orang lain. Ternyata ada dua orang bernama Ratna Kurniasih dengan tanggal lahir sama, jadi alamat dan foto yang jadi pembeda. Verifikasi dulu ke pasien sebelum berkas di-ACC.' }
  ];

  /* Bangun isi KTP/KIA dari data pasien + penimpaan */
  function idDoc(d){
    const p = d.pt, k = d.ktp, o = d.idx || {};
    const lahir = o.lahir || p.lahir, jk = o.jk || p.jk, a = age(lahir);
    const [y,m,dd] = lahir.split('-').map(Number);
    const kia = a < 17;
    const doc = {
      kia, a, lahir, jk,
      nama: o.nama || p.nama.replace(/^(Tn|Ny|An|Nn|Sdr)\.\s*/,'').toUpperCase(),
      nik: NIK(o.wil || k.wil, o.kec || k.kec, lahir, jk, o.sn || k.sn),
      tl: o.tl || k.tl, alamat: o.alamat || k.alamat, agama: o.agama || k.agama,
      kawin: o.kawin || k.kawin, kerja: o.kerja || k.kerja, goldar: o.goldar || k.goldar,
      kk: k.kk, kepala: k.kepala, kota: WIL[o.wil || k.wil], wil: o.wil || k.wil, photo: !kia || a >= 5
    };
    if (kia){
      const until = a < 5 ? 5 : 17;
      doc.berlaku = o.berlaku || `${String(dd).padStart(2,'0')}-${String(m).padStart(2,'0')}-${y+until}`;
      const ty = y + (a >= 5 ? 5 : 0) + (m === 12 ? 1 : 0), tm = m === 12 ? 1 : m + 1;
      doc.terbit = o.terbit || `20-${String(tm).padStart(2,'0')}-${ty}`;
    } else {
      doc.berlaku = o.berlaku || 'SEUMUR HIDUP';
      doc.terbit = o.terbit || '14-06-2019';
    }
    return doc;
  }
  const flawsOf = d => [].concat(d.flaw || []);

  /* ---------- Kasus tambahan: gelang, lab, JKN ---------- */
  DOCS.push(
    { type:'instruksi', sign:'dr. Hendra, Sp.PD', flaw:'gelang-lahir', kind:'gelang', topic:'identitas',
      pt:{nama:'Tn. Andi Firmansyah', lahir:'1981-09-12', jk:'L', rm:'05-61-07', bb:'78 kg', dx:'Selulitis tungkai kanan', alergi:'Tidak ada', cat:'Di triase ada dua pasien bernama Andi.'},
      ktp:{wil:'3273', kec:'17', sn:'0004', tl:'BANDUNG', alamat:'JL. MOH. TOHA NO. 77', agama:'ISLAM', kawin:'KAWIN', kerja:'SOPIR', goldar:'B'},
      gelang:{lahir:'1972-09-12'},
      sections:[{lines:[
        {id:'l1', cols:['Seftriakson','2 gram','IV','Tiap 24 jam']},
        {id:'l2', cols:['Paracetamol','1 gram','PO','Tiap 8 jam bila demam']},
        {id:'l3', cols:['Elevasi tungkai','—','—','Saat berbaring']}]}],
      why:'Tanggal lahir di gelang (12-09-1972) beda dengan kartu pasien (12-09-1981). Gelangnya tertukar dengan pasien Andi yang lain di triase. Gelang yang salah bisa membuat obat diberikan ke orang yang salah, jadi pasang ulang gelang yang benar dulu.' },

    { type:'soap', sign:'c. Dimas', flaw:'gelang-nama', kind:'gelang', topic:'identitas',
      pt:{nama:'Ny. Wati Susanti', lahir:'1974-03-18', jk:'P', rm:'02-77-31', bb:'64 kg', dx:'Hipertensi urgensi', alergi:'Tidak ada', cat:''},
      ktp:{wil:'3277', kec:'03', sn:'0006', tl:'CIMAHI', alamat:'JL. SANGKURIANG NO. 15', agama:'ISLAM', kawin:'KAWIN', kerja:'PEDAGANG', goldar:'O'},
      gelang:{nama:'Ny. Wati Suryani'},
      sections:[
        {h:'S · Subjective', lines:[{id:'s1', t:'Pusing dan tengkuk berat sejak sore. Obat darah tinggi habis 1 minggu.'}]},
        {h:'O · Objective', lines:[{id:'o1', t:'TD 190/110, ulang 30 menit 186/108. Tidak ada defisit neurologis, tidak nyeri dada.'}]},
        {h:'A · Assessment', lines:[{id:'a1', t:'Hipertensi urgensi tanpa kerusakan organ target.'}]},
        {h:'P · Plan', lines:[
          {id:'p1', t:'Amlodipin 10 mg PO 1 kali sehari, mulai sekarang.'},
          {id:'p2', t:'Observasi TD tiap 30 menit selama 2 jam, edukasi minum obat rutin.'}]}],
      why:'Nama di gelang "Wati Suryani", padahal pasiennya Wati Susanti. Tanggal lahirnya kebetulan sama, jadi lup untuk tanggal lahir akan bilang cocok. Namanya beda, berarti gelang ini milik pasien lain. Pasang gelang yang benar sebelum obat diberikan.' },

    { type:'instruksi', sign:'dr. Hendra, Sp.PD', flaw:'l2', kind:'lab', topic:'lab',
      pt:{nama:'Tn. Darmawan', lahir:'1960-12-02', jk:'L', rm:'00-45-82', bb:'60 kg', dx:'CKD stadium 5, lemas', alergi:'Tidak ada', cat:'Jadwal cuci darah terlewat 1 minggu'},
      ktp:{wil:'3204', kec:'20', sn:'0002', tl:'MAJALENGKA', alamat:'KP. CIPARAY RT 05/01', agama:'ISLAM', kawin:'KAWIN', kerja:'PENSIUNAN', goldar:'A'},
      lab:{rows:[['Kalium','6,9','mmol/L','3,5–5,0','H'],['Natrium','136','mmol/L','135–145',''],['Ureum','168','mg/dL','10–50','H'],['Kreatinin','9,4','mg/dL','0,7–1,3','H'],['Hemoglobin','8,9','g/dL','13–17','L']]},
      sections:[{lines:[
        {id:'l1', cols:['Monitor EKG','—','—','Kontinu']},
        {id:'l2', cols:['KCl dalam NaCl 0,9% 500 mL','25 mEq','IV drip','Habis 4 jam']},
        {id:'l3', cols:['Konsul Sp.PD-KGH','—','—','Hemodialisis cito']}]}],
      why:'Kalium sudah 6,9 mmol/L (hiperkalemia). Menambah KCl bisa memicu aritmia fatal. Yang dibutuhkan justru kalsium glukonas, insulin + dekstrosa, dan hemodialisis.' },

    { type:'instruksi', sign:'dr. Hendra, Sp.PD', flaw:'l1', kind:'lab', topic:'lab',
      pt:{nama:'Ny. Ningsih', lahir:'1955-07-21', jk:'P', rm:'01-98-04', bb:'52 kg', dx:'Penurunan kesadaran, DM tipe 2', alergi:'Tidak ada', cat:'Minum glibenklamid, makan sedikit sejak kemarin'},
      ktp:{wil:'3273', kec:'02', sn:'0009', tl:'CIREBON', alamat:'JL. PAJAJARAN NO. 140', agama:'ISLAM', kawin:'CERAI MATI', kerja:'MENGURUS RUMAH TANGGA', goldar:'O'},
      lab:{rows:[['GDS','42','mg/dL','< 200','L'],['Kalium','3,9','mmol/L','3,5–5,0',''],['Natrium','138','mmol/L','135–145',''],['Kreatinin','1,1','mg/dL','0,6–1,1','']]},
      sections:[{lines:[
        {id:'l1', cols:['Insulin reguler','6 unit','SC','Sekarang']},
        {id:'l2', cols:['NaCl 0,9%','500 mL','IV','Habis 8 jam']},
        {id:'l3', cols:['Cek GDS ulang','—','—','Tiap 1 jam']}]}],
      why:'GDS 42 mg/dL berarti hipoglikemia berat, dan itulah penyebab penurunan kesadarannya. Insulin akan menurunkan gula lebih jauh dan bisa fatal. Yang benar: dekstrosa 40% bolus IV lalu pantau GDS.' },

    { type:'resep', sign:'dr. Rahmat', flaw:'l2', kind:'lab', topic:'lab',
      pt:{nama:'Nn. Putri Anggraini', lahir:'2007-06-09', jk:'P', rm:'05-23-66', bb:'50 kg', dx:'Demam dengue hari ke-4', alergi:'Tidak ada', cat:'Nyeri otot dan sendi'},
      ktp:{wil:'3273', kec:'08', sn:'0001', tl:'BANDUNG', alamat:'JL. SUKAJADI NO. 210', agama:'ISLAM', kawin:'BELUM KAWIN', kerja:'PELAJAR/MAHASISWA', goldar:'A'},
      lab:{rows:[['Trombosit','38.000','/µL','150.000–400.000','L'],['Hematokrit','46','%','36–46',''],['Leukosit','3.100','/µL','4.000–11.000','L'],['Hemoglobin','15,1','g/dL','12–15','H']]},
      sections:[{lines:[
        {id:'l1', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p demam'},
        {id:'l2', t:'R/ Ibuprofen tab 400 mg', s:'S 3 dd tab I k/p nyeri sendi'},
        {id:'l3', t:'R/ Edukasi: minum 2–3 L/hari, cek trombosit besok', s:''}]}],
      why:'Trombosit tinggal 38.000/µL pada demam dengue. Ibuprofen (NSAID) mengganggu fungsi trombosit dan menambah risiko perdarahan. Untuk demam dan nyeri cukup paracetamol.' },

    { type:'instruksi', sign:'dr. Hendra, Sp.PD', flaw:'lab-id', kind:'lab', topic:'identitas',
      pt:{nama:'Tn. Yusuf Hidayat', lahir:'1976-04-25', jk:'L', rm:'03-41-19', bb:'67 kg', dx:'Melena, lemas', alergi:'Tidak ada', cat:''},
      ktp:{wil:'3275', kec:'02', sn:'0005', tl:'BEKASI', alamat:'JL. AHMAD YANI NO. 31', agama:'ISLAM', kawin:'KAWIN', kerja:'WIRASWASTA', goldar:'B'},
      lab:{ident:{nama:'Tn. Yusuf Hidayat', lahir:'1958-11-02'}, rows:[['Hemoglobin','6,4','g/dL','13–17','L'],['Hematokrit','20','%','40–50','L'],['Trombosit','210.000','/µL','150.000–400.000',''],['Ureum','64','mg/dL','10–50','H']]},
      sections:[{lines:[
        {id:'l1', cols:['Transfusi PRC','2 kolf','IV','Sesuai Hb 6,4, crossmatch']},
        {id:'l2', cols:['Pantoprazol','80 mg','IV bolus','Lalu 40 mg tiap 12 jam']},
        {id:'l3', cols:['Puasa sementara','—','—','Sampai endoskopi']}]}],
      why:'Hasil lab ini milik Yusuf Hidayat yang lain: tanggal lahirnya 02-11-1958, sedangkan pasien lahir 25-04-1976. Keputusan transfusi diambil dari lab orang lain. Periksa ulang Hb pasien yang benar sebelum transfusi.' },

    { type:'instruksi', sign:'dr. Hendra, Sp.PD', flaw:null, needs:'lab', topic:'aman',
      pt:{nama:'Tn. Rudi Hartanto', lahir:'1990-02-17', jk:'L', rm:'04-90-12', bb:'65 kg', dx:'Hipokalemia e.c. diare akut', alergi:'Tidak ada', cat:'Lemas, kram otot'},
      ktp:{wil:'3201', kec:'14', sn:'0007', tl:'BOGOR', alamat:'PERUM CITRA INDAH BLOK D/3', agama:'ISLAM', kawin:'KAWIN', kerja:'KARYAWAN SWASTA', goldar:'O'},
      lab:{rows:[['Kalium','2,9','mmol/L','3,5–5,0','L'],['Natrium','134','mmol/L','135–145','L'],['Kreatinin','0,9','mg/dL','0,7–1,3',''],['GDS','104','mg/dL','< 200','']]},
      sections:[{lines:[
        {id:'l1', cols:['KCl dalam NaCl 0,9% 500 mL','20 mEq','IV drip','Habis 4 jam']},
        {id:'l2', cols:['Oralit','200 mL','PO','Tiap BAB cair']},
        {id:'l3', cols:['Cek ulang kalium','—','—','6 jam lagi']}]}],
      why:'Aman. Kalium 2,9 (rendah) memang perlu dikoreksi. KCl 20 mEq dalam 500 mL (40 mEq/L) habis 4 jam = 5 mEq/jam, masih dalam batas aman jalur perifer, dan fungsi ginjalnya normal.' },

    { type:'resep', sign:'dr. Anindya', flaw:null, needs:'jkn', topic:'aman',
      pt:{nama:'Ny. Endang Sulastri', lahir:'1966-08-30', jk:'P', rm:'02-56-48', bb:'61 kg', dx:'Hipertensi, nyeri kepala', alergi:'Tidak ada', cat:''},
      ktp:{wil:'3204', kec:'11', sn:'0004', tl:'GARUT', alamat:'KP. SUKAMAJU RT 01/04', agama:'ISLAM', kawin:'KAWIN', kerja:'PEDAGANG', goldar:'A'},
      jkn:{nama:'ENDAH SULASTRI', lahir:'1969-01-14'},
      sections:[{lines:[
        {id:'l1', t:'R/ Amlodipin tab 5 mg', s:'S 1 dd tab I pagi'},
        {id:'l2', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p nyeri kepala'},
        {id:'l3', t:'R/ Edukasi: kontrol tekanan darah ke puskesmas', s:''}]}],
      why:'Aman. Kartu JKN-nya memang milik adiknya, tetapi kartu pasien, KTP, dan gelang semuanya cocok. Kartu JKN hanya untuk penjaminan. Urusan administrasi diselesaikan terpisah dan tidak boleh menunda pelayanan.' },

    { type:'instruksi', sign:'dr. Wulan, Sp.OT', flaw:null, needs:'jkn', topic:'aman',
      pt:{nama:'Tn. Bambang Sutrisno', lahir:'1979-05-05', jk:'L', rm:'04-17-83', bb:'80 kg', dx:'Vulnus laceratum lengan bawah kiri', alergi:'Tidak ada', cat:'Luka terkena seng, perdarahan sudah terkontrol'},
      ktp:{wil:'3275', kec:'06', sn:'0002', tl:'KARAWANG', alamat:'JL. BOULEVARD HIJAU NO. 4', agama:'KRISTEN', kawin:'KAWIN', kerja:'BURUH HARIAN LEPAS', goldar:'O'},
      jkn:{status:'TIDAK AKTIF'},
      sections:[{lines:[
        {id:'l1', cols:['Jahit luka (hecting)','6 jahitan','—','Dengan anestesi lokal']},
        {id:'l2', cols:['Paracetamol','500 mg','PO','Tiap 8 jam bila nyeri']},
        {id:'l3', cols:['Profilaksis tetanus','—','IM','Sesuai status imunisasi']}]}],
      why:'Aman. Status JKN tidak aktif adalah urusan administrasi. Dalam keadaan gawat darurat, rumah sakit dilarang menolak pasien atau mendahulukan urusan administrasi (UU 17/2023 Pasal 174). Tindakannya sendiri sudah sesuai.' }
  );
  // hasil lab untuk kasus lama (muncul mulai malam 4)
  DOCS.find(d => d.pt.nama === 'Tn. Hartono').lab = {rows:[['GDS','286','mg/dL','< 200','H'],['Ureum','124','mg/dL','10–50','H'],['Kreatinin','4,2','mg/dL','0,7–1,3','H'],['Kalium','4,8','mmol/L','3,5–5,0','']]};
  DOCS.find(d => d.pt.nama === 'Tn. Slamet Riyadi').lab = {rows:[['Hemoglobin','8,1','g/dL','13–17','L'],['Trombosit','250.000','/µL','150.000–400.000',''],['Ureum','58','mg/dL','10–50','H']]};

  const TOPIC = {'Tn. Budi Santoso':'kontra','An. Raka Pratama':'dosis','Ny. Rukmini':'dosis','Tn. Dimas Aditya':'alergi',
    'Ny. Dewi Lestari':'kontra','Tn. Hartono':'kontra','Tn. Slamet Riyadi':'kontra'};
  DOCS.forEach(d => { if (!d.topic) d.topic = !flawsOf(d).length ? 'aman' : d.kind ? 'identitas' : (TOPIC[d.pt.nama] || 'kontra'); });
  const minNight = d => d.kind === 'id' ? 2 : d.kind === 'gelang' ? 3 : (d.kind === 'lab' || d.needs === 'lab') ? 4 : d.needs === 'jkn' ? 5 : 1;

  const TOPICS = {
    dosis:{label:'Dosis & satuan', tip:'Hitung dosis anak dengan mg/kgBB × berat badan, dan cek satuan (gram vs mg). Tab Kalkulator di Panduan bisa membantu.'},
    alergi:{label:'Alergi obat', tip:'Cocokkan kotak alergi di kartu pasien dengan golongan obatnya, bukan hanya nama obatnya.'},
    kontra:{label:'Kontraindikasi', tip:'Lihat kondisi pasien (asma, hamil, ginjal, perdarahan), lalu cek baris Kontraindikasi obat itu di tab Obat.'},
    identitas:{label:'Identitas pasien', tip:'Pakai lup (P) untuk mencocokkan nama, tanggal lahir, alamat, dan wajah di setiap dokumen, termasuk gelang dan lembar lab.'},
    lab:{label:'Interpretasi lab', tip:'Perhatikan nilai bertanda H/L, lalu tanyakan: apakah obat di berkas memperburuk nilai itu?'},
    aman:{label:'Berkas aman', tip:'Jangan asal tolak. KTP lama, foto lama, atau status JKN tidak aktif bukan alasan menolak berkas.'}
  };
  const TOPIC_ORDER = ['dosis','alergi','kontra','identitas','lab','aman'];

  /* ---------- Malam bertahap ---------- */
  const NIGHTS = [null,
    {title:'Resep dulu', limit:60, mix:[['clin',4],['safe',2]], feats:[],
      memo:['Cocokkan isi berkas dengan <b>kartu pasien</b>: alergi obat, berat badan untuk dosis anak, dan kondisi seperti hamil, asma, gangguan ginjal, atau perdarahan.',
        'Cek <b>satuan</b>. 1 gram = 1.000 mg.',
        'Ada yang salah? Sorot barisnya dengan <b>stabilo</b>, lalu cap <b>TOLAK</b>. Aman? Cap <b>ACC</b>. Menolak berkas yang benar juga merugikan pasien.',
        'Ragu soal dosis? Buka <b>Kalkulator</b> (K): berat badan pasien sudah terisi, tinggal masukkan dosis di berkas. Data obat ada di <b>Panduan</b> (B). Waktu tetap berjalan.']},
    {title:'Kartu identitas', limit:55, mix:[['id',2],['clin',2],['safe',2]], feats:['ktp','lup'],
      memo:['Pasien dewasa membawa <b>KTP</b>, anak membawa <b>KIA</b>. Nama, tanggal lahir, dan alamat harus sama dengan kartu pasien.',
        'Nama dan tanggal lahir di <b>berkas</b> juga harus cocok dengan kartu pasien.',
        'Pakai <b>lup</b> (P): klik dua data, garis hijau berarti cocok, merah berarti tidak cocok.',
        'Wajar, jangan ditolak: sapaan Tn./Ny. tidak tercantum di KTP, dan KTP-el lama yang tanggal berlakunya lewat tetap sah.']},
    {title:'Wajah & gelang', limit:60, mix:[['gelang',2],['id',1],['clin',1],['safe',2]], feats:['ktp','lup','wajah','gelang'],
      memo:['Bandingkan <b>wajah</b> orang di loket dengan foto KTP/KIA. Foto lama boleh beda kacamata atau kumis.',
        'Setiap pasien memakai <b>gelang identitas</b> dari triase: biru untuk laki-laki, merah muda untuk perempuan, dan stiker merah berarti alergi.',
        'Nama dan tanggal lahir di gelang harus cocok. Gelang yang tertukar berarti risiko salah pasien.']},
    {title:'Hasil lab', limit:65, mix:[['lab',3],['id|gelang',1],['clin',1],['safe',2]], feats:['ktp','lup','wajah','gelang','lab'],
      memo:['Sebagian pasien datang dengan <b>hasil lab</b>. Nilai bertanda <b>H</b> berarti tinggi, <b>L</b> berarti rendah.',
        'Tanyakan: apakah obat di berkas memperburuk nilai itu? Misalnya kalium tinggi lalu diberi KCl, atau gula darah rendah lalu diberi insulin.',
        'Lembar lab juga punya identitas. Lab milik pasien lain tidak boleh jadi dasar tindakan.']},
    {title:'Jaminan (JKN)', limit:70, mix:[['lab',2],['gelang',1],['id',1],['clin',1],['safe',3]], feats:['ktp','lup','wajah','gelang','lab','jkn'],
      memo:['Pasien membawa <b>kartu JKN</b>. Kartu ini hanya untuk penjaminan, bukan penanda keselamatan pasien.',
        '<b>Jangan menolak</b> berkas karena masalah JKN, misalnya kartu tidak aktif atau kartu milik keluarga. Dalam keadaan gawat darurat, rumah sakit dilarang menolak pasien atau mendahulukan urusan administrasi.',
        'Semua aturan malam 1–4 tetap berlaku. Ini malam terpanjang: 8 berkas.']}
  ];
  NIGHTS.push({title:'Mode Sulit', hard:true, limit:45, mix:[['flaw',7],['safe',3]], feats:['ktp','lup','wajah','gelang','lab','jkn'],
    memo:['Semua jenis berkas dan dokumen <b>diacak</b> dalam satu malam: resep, SOAP, instruksi, KTP/KIA, wajah, gelang, hasil lab, dan kartu JKN.',
      'Jumlah berkas yang salah juga acak. Waktu per berkas lebih singkat: <b>45 detik</b>.',
      'Semua aturan malam 1–5 berlaku, dan tidak ada petunjuk di bawah meja.']});
  const HARD = 6;
  const isPhone = () => !FIT.on && window.matchMedia('(max-width: 980px)').matches;
  const nightName = n => n === HARD ? 'Mode Sulit' : `Malam ${n}`;
  const FEAT_DOCS = {ktp:'KTP/KIA', gelang:'Gelang', lab:'Hasil lab', jkn:'Kartu JKN'};

  const loadP = () => Progress.read();
  const saveP = p => Progress.write(p);
  let PROG = loadP();


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
  'Benar pasien: cocokkan nama, tanggal lahir, dan alamat di kartu pasien, KTP/KIA, dan berkas.',
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

const IDENT = [
 {h:'Yang dicek: nama, tanggal lahir, alamat, wajah', items:[
  'Kartu pasien adalah data rekam medis (acuan). KTP/KIA adalah dokumen yang dibawa pasien atau keluarga. Berkas adalah yang perlu kamu cap.',
  'KTP/KIA ↔ kartu pasien: nama, tanggal lahir, dan alamat harus sama.',
  'Berkas ↔ kartu pasien: nama dan tanggal lahir (beserta umurnya) harus sama.',
  'Orang di loket ↔ foto KTP/KIA: wajahnya harus orang yang sama. Foto KTP bisa foto lama, jadi kacamata, kumis, atau model rambut boleh berbeda.',
  'Nama sama belum tentu orang yang sama. Di IGD sering ada pasien bernama mirip, dan keluarga kadang membawa KTP/KIA orang lain.',
  'Bila nama dan tanggal lahir sama tapi alamat beda, bisa jadi itu orang lain. Alamat jadi pembeda ketiga.',
  'Bila tidak cocok: tolak dulu, verifikasi ulang ke pasien/keluarga dan bagian pendaftaran.']},
 {h:'Gelang identitas (mulai malam 3)', items:[
  'Gelang dipasang di triase. Warnanya biru untuk laki-laki dan merah muda untuk perempuan.',
  'Stiker merah bertuliskan ALERGI berarti pasien punya alergi. Cocokkan dengan kotak alergi di kartu pasien.',
  'Nama dan tanggal lahir di gelang harus sama dengan kartu pasien. Gelang yang tertukar berarti risiko salah pasien.']},
 {h:'Hasil lab & kartu JKN (malam 4–5)', items:[
  'Lembar lab punya identitas sendiri. Lab milik pasien lain tidak boleh jadi dasar tindakan.',
  'H = di atas nilai rujukan, L = di bawah. Tolak obat yang memperburuk nilai abnormal itu.',
  'Kartu JKN hanya untuk penjaminan. Dalam keadaan gawat darurat, rumah sakit dilarang menolak pasien atau mendahulukan urusan administrasi (UU 17/2023 Pasal 174). Masalah JKN bukan alasan menolak berkas.']},
 {h:'KTP vs KIA', items:[
  'KTP-el untuk penduduk berusia 17 tahun ke atas (atau yang sudah menikah).',
  'KIA (Kartu Identitas Anak) untuk anak di bawah 17 tahun. KIA anak di bawah 5 tahun memang tanpa foto dan berlaku sampai usia 5 tahun; KIA 5–17 tahun memakai foto.']},
 {h:'Hal yang wajar (jangan ditolak karena ini)', items:[
  'Sapaan Tn./Ny./An. tidak tercantum di KTP/KIA, dan nama di KTP ditulis huruf kapital.',
  'KTP-el cetakan lama yang masih mencantumkan tanggal berlaku (misalnya 2017) tetap sah seumur hidup.',
  'Golongan darah "-" (tidak diisi) itu biasa.',
  'NIK, agama, pekerjaan, dan status perkawinan tidak perlu dicek di game ini.',
  'Golongan darah di KTP tidak dipakai untuk transfusi. Transfusi selalu berdasarkan golongan darah dan crossmatch dari laboratorium.']}
];

  /* ================= PANDUAN LENGKAP ================= */
  const GUIDE = (() => {
    const body = q('#igd-book-body'), tabsEl = q('#igd-tabs'), search = q('#igd-search');
    const DRUGS = [...DRUGS_A, ...DRUGS_B].sort((a,b) => a.n.localeCompare(b.n,'id'));
    const DISCLAIMER = '<p class="note">Ringkasan rujukan untuk belajar di dalam game. Dosis lazim dan bisa berbeda menurut kondisi pasien, pedoman rumah sakit, dan sumber resmi (Fornas, PNPK, label obat). Bukan pengganti keputusan klinis.</p>';
    let tab = 'obat';
    const TABS = [['obat','Obat'],['identitas','Identitas'],['lab','Nilai lab'],['cairan','Cairan & infus'],['anak','Anak'],['kalk','Kalkulator'],['panduan','Panduan']];
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
    const vIdent = f => {
      const gs = IDENT.map(g => ({h:g.h, items:g.items.filter(i => has(g.h + ' ' + i, f))})).filter(g => g.items.length);
      const h = gs.map(g => `<h4>${esc(g.h)}</h4><ul>${g.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`).join('');
      return h || '<div class="igd-empty">Tidak ada panduan identitas yang cocok.</div>';
    };
    const vPanduan = f => {
      const q1 = QUICK.map(g => ({h:g.h, items:g.items.filter(i => has(g.h + ' ' + i, f))})).filter(g => g.items.length);
      const fo = FORMULAS.filter(r => has(r.join(' '), f));
      let h = q1.map(g => `<h4>${esc(g.h)}</h4><ul>${g.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`).join('');
      if (fo.length) h += '<h4>Rumus penting</h4><table class="tbl">' + fo.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('') + '</table>';
      return h || '<div class="igd-empty">Tidak ada panduan yang cocok.</div>';
    };

    const fld = (id, label, val, step) => `<div><label for="${id}">${label}</label><input id="${id}" type="number" inputmode="decimal" min="0" step="${step||'any'}"${val !== undefined ? ` value="${val}"` : ''}></div>`;
    const vKalk = () => `<p class="note">Isi angka, hasil muncul otomatis. Saat dibuka dari meja (tombol K), berat badan dan umur pasien yang sedang dilayani sudah terisi.</p>
      <div class="calc" data-calc="chk"><h4>Cek dosis di berkas (mg/kgBB)</h4><div class="fields">
        ${fld('igd-c0bb','BB pasien (kg)')}${fld('igd-c0d','Dosis tertulis (mg/kali)')}${fld('igd-c0f','Kali per hari',3)}${fld('igd-c0lo','Anjuran min (mg/kgBB/kali)')}${fld('igd-c0hi','Anjuran maks (mg/kgBB/kali)')}
      </div><div class="out" id="igd-c0o"></div></div>
      <div class="calc" data-calc="kcl"><h4>Cek infus KCl</h4><div class="fields">
        ${fld('igd-c7m','KCl (mEq)')}${fld('igd-c7v','Volume cairan (mL)')}${fld('igd-c7t','Lama infus (jam)')}
      </div><div class="out" id="igd-c7o"></div></div>
      <div class="calc" data-calc="unit"><h4>Konversi satuan</h4><div class="fields">
        ${fld('igd-c8v','Nilai')}<div><label for="igd-c8u">Satuan</label><select id="igd-c8u"><option value="g">gram (g)</option><option value="mg" selected>miligram (mg)</option><option value="mcg">mikrogram (mcg)</option></select></div>
      </div><div class="out" id="igd-c8o"></div></div>
      <div class="calc" data-calc="dose"><h4>Dosis obat per berat badan</h4><div class="fields">
        ${fld('igd-c1bb','BB (kg)')}${fld('igd-c1d','Dosis (mg/kgBB/kali)')}${fld('igd-c1f','Frekuensi (kali/hari)',3)}${fld('igd-c1c','Konsentrasi (mg/mL)')}${fld('igd-c1m','Dosis maks/kali (mg)')}
      </div><div class="out" id="igd-c1o"></div></div>
      <div class="calc" data-calc="drip"><h4>Tetesan infus (tetes per menit)</h4><div class="fields">
        ${fld('igd-c2v','Volume (mL)',500)}${fld('igd-c2t','Waktu (jam)',8)}
        <div><label for="igd-c2f">Faktor tetes</label><select id="igd-c2f"><option value="20" selected>Makro 20 tts/mL</option><option value="15">Makro 15 tts/mL</option><option value="60">Mikro 60 tts/mL</option></select></div>
      </div><div class="out" id="igd-c2o"></div></div>
      <div class="calc" data-calc="maint"><h4>Cairan rumatan</h4><div class="fields">${fld('igd-c3bb','BB (kg)')}</div><div class="out" id="igd-c3o"></div></div>
      <div class="calc" data-calc="pump"><h4>Kecepatan syringe pump (mcg/kgBB/menit)</h4><div class="fields">
        ${fld('igd-c4bb','BB (kg)')}${fld('igd-c4d','Dosis (mcg/kg/menit)')}${fld('igd-c4c','Konsentrasi (mg/mL)')}
      </div><div class="out" id="igd-c4o"></div></div>
      <div class="calc" data-calc="cg"><h4>Klirens kreatinin (Cockcroft–Gault)</h4><div class="fields">
        ${fld('igd-c5u','Umur (tahun)')}${fld('igd-c5bb','BB (kg)')}${fld('igd-c5k','Kreatinin (mg/dL)')}
        <div><label for="igd-c5j">Jenis kelamin</label><select id="igd-c5j"><option value="1">Laki-laki</option><option value="0.85">Perempuan</option></select></div>
      </div><div class="out" id="igd-c5o"></div></div>
      <div class="calc" data-calc="burn"><h4>Cairan luka bakar (Parkland)</h4><div class="fields">${fld('igd-c6bb','BB (kg)')}${fld('igd-c6p','Luas luka bakar (%)')}</div><div class="out" id="igd-c6o"></div></div>`;

    const R = {
      chk(){ const bb=num('igd-c0bb'), d=num('igd-c0d'), f=num('igd-c0f'), lo=num('igd-c0lo'), hi=num('igd-c0hi'), o=body.querySelector('#igd-c0o');
        if (!(bb>0 && d>0)) { o.textContent = 'Isi berat badan pasien dan dosis yang tertulis di berkas.'; return; }
        const pk = d/bb; let h = `${fmt(d,1)} mg ÷ ${fmt(bb,1)} kg = <b>${fmt(pk,1)} mg/kgBB per kali</b>`;
        if (f>0) h += ` · ${fmt(pk*f,1)} mg/kgBB/hari`;
        if (hi>0 && pk > hi*1.05) h += `<div class="w">Di atas anjuran (maks ${fmt(hi,1)} mg/kgBB/kali), sekitar ${fmt(pk/hi,1)}× batas atas.</div>`;
        else if (lo>0 && pk < lo*.95) h += `<div class="w">Di bawah anjuran (min ${fmt(lo,1)} mg/kgBB/kali).</div>`;
        else if (lo>0 || hi>0) h += '<div>Masih dalam rentang anjuran.</div>';
        else h += '<div>Bandingkan dengan baris "Dosis anak" di tab Obat, misalnya paracetamol 10–15 mg/kgBB/kali.</div>';
        o.innerHTML = h; },
      kcl(){ const m=num('igd-c7m'), v=num('igd-c7v'), t=num('igd-c7t'), o=body.querySelector('#igd-c7o');
        if (!(m>0 && v>0 && t>0)) { o.textContent = 'Isi jumlah KCl, volume cairan, dan lama infus.'; return; }
        const conc = m/v*1000, rate = m/t;
        let h = `Konsentrasi <b>${fmt(conc,0)} mEq/L</b> · kecepatan <b>${fmt(rate,1)} mEq/jam</b>`;
        if (conc > 40) h += '<div class="w">Di atas 40 mEq/L: terlalu pekat untuk jalur perifer.</div>';
        if (rate > 10) h += '<div class="w">Di atas 10 mEq/jam: terlalu cepat tanpa monitor EKG ketat.</div>';
        if (conc <= 40 && rate <= 10) h += '<div>Dalam batas umum jalur perifer. Tetap cek kadar kalium dan fungsi ginjal.</div>';
        o.innerHTML = h; },
      unit(){ const v=num('igd-c8v'), u=body.querySelector('#igd-c8u').value, o=body.querySelector('#igd-c8o');
        if (!(v>=0)) { o.textContent = 'Isi nilai yang mau dikonversi.'; return; }
        const mg = u==='g' ? v*1000 : u==='mcg' ? v/1000 : v;
        o.innerHTML = `<b>${fmt(mg/1000,6)} g</b> = <b>${fmt(mg,4)} mg</b> = <b>${fmt(mg*1000,2)} mcg</b>`; },
      dose(){ const bb=num('igd-c1bb'), d=num('igd-c1d'), f=num('igd-c1f'), c=num('igd-c1c'), mx=num('igd-c1m'), o=body.querySelector('#igd-c1o');
        if (!(bb>0 && d>0)) { o.textContent = 'Isi BB dan dosis.'; return; }
        let per = bb*d, w = '';
        if (mx>0 && per>mx) { per = mx; w = `<div class="w">Melebihi dosis maks, dibatasi ke ${fmt(mx)} mg/kali.</div>`; }
        let h = `Dosis: <b>${fmt(per,2)} mg</b> per kali`;
        if (f>0) h += ` · ${fmt(per*f,2)} mg/hari (${fmt(f,0)} kali)`;
        if (c>0) h += `<br>Volume: <b>${fmt(per/c,2)} mL</b> per kali`;
        o.innerHTML = h + w; },
      drip(){ const v=num('igd-c2v'), t=num('igd-c2t'), f=parseFloat(body.querySelector('#igd-c2f').value), o=body.querySelector('#igd-c2o');
        if (!(v>0 && t>0)) { o.textContent = 'Isi volume dan waktu.'; return; }
        o.innerHTML = `<b>${fmt(v*f/(t*60),0)} tetes/menit</b> · ${fmt(v/t,1)} mL/jam`; },
      maint(){ const bb=num('igd-c3bb'), o=body.querySelector('#igd-c3o');
        if (!(bb>0)) { o.textContent = 'Isi BB.'; return; }
        const day = bb<=10 ? bb*100 : bb<=20 ? 1000+(bb-10)*50 : 1500+(bb-20)*20;
        const hr = bb<=10 ? bb*4 : bb<=20 ? 40+(bb-10)*2 : 60+(bb-20);
        o.innerHTML = `Holliday–Segar: <b>${fmt(day,0)} mL/hari</b><br>Aturan 4-2-1: <b>${fmt(hr,0)} mL/jam</b>`; },
      pump(){ const bb=num('igd-c4bb'), d=num('igd-c4d'), c=num('igd-c4c'), o=body.querySelector('#igd-c4o');
        if (!(bb>0 && d>0 && c>0)) { o.textContent = 'Isi BB, dosis, dan konsentrasi.'; return; }
        o.innerHTML = `Kecepatan: <b>${fmt(bb*d*60/(c*1000),2)} mL/jam</b>`; },
      cg(){ const u=num('igd-c5u'), bb=num('igd-c5bb'), k=num('igd-c5k'), j=parseFloat(body.querySelector('#igd-c5j').value), o=body.querySelector('#igd-c5o');
        if (!(u>0 && bb>0 && k>0)) { o.textContent = 'Isi umur, BB, dan kreatinin.'; return; }
        const cl = (140-u)*bb/(72*k)*j;
        const st = cl>=90 ? 'normal' : cl>=60 ? 'penurunan ringan' : cl>=30 ? 'penurunan sedang' : cl>=15 ? 'penurunan berat' : 'gagal ginjal';
        o.innerHTML = `<b>${fmt(cl,0)} mL/menit</b> (${st})${cl<30 ? '<div class="w">Di bawah 30: hindari metformin, sesuaikan dosis obat yang dikeluarkan ginjal.</div>' : ''}`; },
      burn(){ const bb=num('igd-c6bb'), p=num('igd-c6p'), o=body.querySelector('#igd-c6o');
        if (!(bb>0 && p>0)) { o.textContent = 'Isi BB dan luas luka bakar.'; return; }
        const tot = 4*bb*p;
        o.innerHTML = `Total 24 jam: <b>${fmt(tot,0)} mL</b> (RL)<br>8 jam pertama: ${fmt(tot/2,0)} mL (${fmt(tot/16,0)} mL/jam)<br>16 jam berikutnya: ${fmt(tot/2,0)} mL (${fmt(tot/32,0)} mL/jam)`; }
    };
    const calcAll = () => Object.keys(R).forEach(k => R[k]());

    function render(){
      const f = search.value.trim().toLowerCase();
      tabsEl.innerHTML = TABS.map(([k,l]) => `<button type="button" data-tab="${k}" class="${k===tab?'igd-on':''}">${l}</button>`).join('');
      search.hidden = tab === 'kalk';
      const view = {obat:vObat, identitas:vIdent, lab:vLab, cairan:vCairan, anak:vAnak, panduan:vPanduan, kalk:vKalk}[tab];
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
    return { render, focusSearch(){ if (!search.hidden) search.focus(); }, get tab(){ return tab; },
      show(t, pre){ tab = t; render();
        Object.entries(pre || {}).forEach(([id, v]) => { const el = body.querySelector('#' + id); if (el) el.value = v; });
        if (t === 'kalk') calcAll(); } };
  })();

  /* ================= STATE ================= */
  let S = null, tid = null;

  function start(n){
    Sfx.unlock();
    n = Math.min(Math.max(+n || 1, 1), HARD);
    const N = NIGHTS[n];
    S = { night:n, feats:new Set(N.feats), limit:Math.round(N.limit * (isPhone() ? 1.5 : 1)), queue:buildQueue(n), i:0, score:0, lives:3, log:[], hl:null, solvedIds:[], pausedAt:0,
          locked:true, resolved:false, advancing:false, frac:1, t0:0, relax:q('#igd-relax').checked };
    E.title.hidden = true; E.end.hidden = true; E.memo.hidden = true;
    setPlaying(true);
    q('.hud-brand small').textContent = n === HARD ? 'MODE SULIT · SEMUA DIACAK' : `MALAM ${n} · ${N.title.toUpperCase()}`;
    E.lens.hidden = !S.feats.has('lup');
    E.bar.classList.toggle('off', S.relax);
    DESK.reset();
    showDoc();
  }

  function clockText(){
    const m = 22*60 + S.i*45;
    return String(Math.floor(m/60)%24).padStart(2,'0') + ':' + String(m%60).padStart(2,'0');
  }
  function hud(){
    E.clock.textContent = clockText(); E.bclock.textContent = clockText();
    E.count.textContent = Math.min(S.i+1,S.queue.length) + '/' + S.queue.length;
    E.score.textContent = S.score;
    E.lives.innerHTML = [0,1,2].map(i => `<span class="cross${i < S.lives ? '' : ' lost'}">&#10010;</span>`).join('');
  }

  function renderChart(d){
    const p = d.pt, none = /^tidak/i.test(p.alergi);
    E.chart.innerHTML = `<div class="sheet"><h3>Kartu Pasien</h3><span class="src">Data rekam medis · acuan</span><dl>
      <dt>Nama</dt><dd ${ia('nama','kartu',normName(p.nama),p.nama)}>${esc(p.nama)}</dd>
      <div class="pair"><div><dt>Tgl lahir</dt><dd class="mono" ${ia('lahir','kartu',p.lahir,dmy(p.lahir))}>${dmy(p.lahir)} <span style="font-weight:400">(${age(p.lahir)} th)</span></dd></div><div><dt>JK</dt><dd>${p.jk === 'L' ? 'Laki-laki' : 'Perempuan'}</dd></div></div>
      <dt>Alamat</dt><dd ${ia('alamat','kartu',d.ktp.alamat+'|'+d.ktp.wil, d.ktp.alamat+', '+WIL[d.ktp.wil])}>${esc(d.ktp.alamat)}, ${esc(WIL[d.ktp.wil].replace(/^KABUPATEN /,'KAB. '))}</dd>
      <dt>Berat badan</dt><dd>${esc(p.bb)}</dd>
      <dt>Diagnosis</dt><dd>${esc(p.dx)}</dd>
      ${p.cat ? `<dt>Catatan</dt><dd>${esc(p.cat)}</dd>` : ''}
    </dl><div class="allergy ${none ? 'none' : ''}"><span>Alergi obat</span><b>${esc(p.alergi)}</b></div></div>`;
  }

  function renderIdCard(d){
    const c = idDoc(d);
    const row = (id, k, v, wide, attr) => `<div class="ln${wide ? ' wide' : ''}" data-id="ktp-${id}"${attr ? ' ' + attr : ''}><span class="k">${k}</span><span class="v">${v}</span></div>`;
    const src = c.kia ? 'kia' : 'ktp';
    const jkTxt = c.jk === 'L' ? 'LAKI-LAKI' : 'PEREMPUAN';
    const kotaTerbit = c.kota.replace(/^KABUPATEN /,'KAB. ');
    const bg = (+c.lahir.slice(0,4)) % 2 ? '#ff7070' : '#4aa8ff';   // latar foto: ganjil merah, genap biru
    const ap = appear(d), fotoSpec = ap.foto || Object.assign({}, ap.look, ap.fotoStyle || {}), fotoId = ap.foto ? 'lain' : 'self';
    const photo = `<div class="id-photo">${c.photo ? `<div class="ph ln ln-foto" data-id="ktp-foto" ${ia('wajah',src,fotoId,'foto')} style="background-color:${bg}">${portrait(fotoSpec,'neutral')}</div>` : `<div class="ph none">Tanpa foto (&lt; 5 th)</div>`}
      <span>${esc(kotaTerbit)}</span><span>${esc(c.terbit)}</span>${c.kia ? '' : `<span class="sg">${esc(c.nama.split(' ')[0].toLowerCase())}</span>`}</div>`;
    let h = `<span class="id-tag">Dibawa pasien · ${c.kia ? 'KIA' : 'KTP'}</span>
      <div class="id-head">Provinsi Jawa Barat<br>${esc(c.kota)}${c.kia ? '<small>Kartu Identitas Anak</small>' : ''}</div>
      <div class="nik-row"><span class="k">NIK</span><span class="v">${c.nik}</span></div>
      <div class="id-body">`;
    h += row('nama','Nama', esc(c.nama), false, ia('nama',src,normName(c.nama),c.nama));
    h += row('ttl','Tempat/Tgl Lahir', `${esc(c.tl)}, ${dmy(c.lahir)}`, false, ia('lahir',src,c.lahir,dmy(c.lahir)));
    h += row('jk','Jenis Kelamin', c.kia ? jkTxt : `${jkTxt} <span style="white-space:nowrap"><small>GOL. DARAH</small>${esc(c.goldar)}</span>`);
    if (c.kia){
      h += row('kk','No. KK', esc(c.kk));
      h += row('kepala','Kepala Keluarga', esc(c.kepala));
      h += row('alamat','Alamat', esc(c.alamat), false, ia('alamat',src,c.alamat+'|'+c.wil,c.alamat+', '+c.kota));
      h += photo;
      h += row('agama','Agama', esc(c.agama), true);
      h += row('wn','Kewarga&shy;negaraan', 'WNI', true);
    } else {
      h += row('alamat','Alamat', esc(c.alamat), false, ia('alamat',src,c.alamat+'|'+c.wil,c.alamat+', '+c.kota));
      h += row('agama','Agama', esc(c.agama));
      h += row('kawin','Status Perkawinan', esc(c.kawin));
      h += photo;
      h += row('kerja','Pekerjaan', esc(c.kerja), true);
      h += row('wn','Kewarga&shy;negaraan', 'WNI', true);
    }
    h += row('berlaku','Berlaku Hingga', esc(c.berlaku), true) + '</div>';
    E.idcard.classList.toggle('kia', c.kia);
    E.idcard.setAttribute('aria-label', c.kia ? 'Kartu Identitas Anak' : 'Kartu Tanda Penduduk');
    E.idcard.innerHTML = h;
  }

  function renderPaper(d){
    const T = TYPES[d.type];
    const no = String(400 + S.i*37 + Math.floor(Math.random()*20)).padStart(4,'0');
    const b = Object.assign({nama:d.pt.nama, lahir:d.pt.lahir, jk:d.pt.jk}, d.berkas || {});
    let h = `<div class="p-head"><div>RSUD Melati Husada<br><small>Instalasi Gawat Darurat</small></div>
      <div class="p-no">No. ${T.prefix}-${no}<br><small>${GAME_DATE} · ${clockText()}</small></div></div>
      <h2 class="p-title">${T.title}</h2>
      <div class="ln ln-id" data-id="id"><span class="k">Pasien</span><span ${ia('nama','berkas',normName(b.nama),b.nama)}>${esc(b.nama)}</span>, ${age(b.lahir)} th / ${b.jk}<span class="rm"><span class="k">Tgl lahir</span><span ${ia('lahir','berkas',b.lahir,dmy(b.lahir))}>${dmy(b.lahir)}</span></span></div>`;
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
    E.paper.className = 'paper dcard ' + T.cls + (E.paper.classList.contains('dragging') ? ' dragging' : '');
    E.paper.innerHTML = h;
    E.paper.style.setProperty('--tilt', (Math.random()*1.4 - .7).toFixed(2) + 'deg');
    void E.paper.offsetWidth;
    E.paper.classList.add('in');
  }

  function setIdle(text, alert){
    E.con.className = 'console';
    E.con.innerHTML = `<div class="con-idle${alert ? ' alert' : ''}">${text}</div>`;
  }
  const IDLE = '<b>Cara kerja:</b> cocokkan <b>nama, tanggal lahir, alamat</b>, dan <b>wajah</b> di loket dengan foto KTP/KIA, lalu cek isi klinisnya. Ada yang salah? <b>Sorot</b> barisnya dan cap <b>TOLAK</b>. Kalau semuanya aman, cap <b>ACC</b>.';
  function syncHint(){
    if (S.resolved) return;
    setIdle(S.hl ? 'Baris tersorot. Cap <b>TOLAK</b> untuk menolak berkas, atau klik baris itu lagi untuk membatalkan.' : idleText());
  }

  /* ================= PENAMPILAN PASIEN (piksel) ================= */
  /* look: sk (0-3 warna kulit), hair (short|spiky|kid|bald|side|long|bob|pig), hc warna rambut,
     hijab warna, shirt warna, old, kid, glasses, must (kumis), blush */
  const APPEAR = {
    'Tn. Budi Santoso':   {look:{sk:1, hair:'short', shirt:'#3b6ea8'}, say:'Dok, dada saya berdebar-debar dari sore. Sesak juga.'},
    'An. Raka Pratama':   {look:{kid:1, sk:1, hair:'kid', shirt:'#e0a82e', blush:1}, comp:{sk:1, hair:'short', must:1, shirt:'#556b2f'}, say:'Anak saya panas dua hari, Dok. Batuk pilek juga.'},
    'Ny. Rukmini':        {look:{sk:2, hijab:'#7a4b8c', old:1, glasses:1, shirt:'#7a4b8c'}, say:'Sesak, Dok... nggak bisa tidur telentang.'},
    'Ny. Sari Wulandari': {look:{sk:1, hijab:'#2f6f6a', old:1, shirt:'#2f6f6a'}, say:'Dada kiri saya sakit sekali, Dok, sampai ke lengan.'},
    'Tn. Dimas Aditya':   {look:{sk:2, hair:'spiky', shirt:'#b33a3a'}, say:'Tenggorokan sakit banget buat nelan, Dok.'},
    'Ny. Dewi Lestari':   {look:{sk:1, hijab:'#d98aa6', shirt:'#d98aa6'}, say:'Kepala saya pusing terus, Dok. Saya lagi hamil.'},
    'Tn. Hartono':        {look:{sk:0, hair:'side', hc:'#5d5853', glasses:1, shirt:'#cfc7b2'}, say:'Gula saya tinggi lagi, Dok. Kencing juga sedikit.'},
    'An. Nadia Putri':    {look:{kid:1, small:1, sk:1, hair:'pig', shirt:'#e86f8a', blush:1}, comp:{sk:1, hijab:'#3f5fa8', shirt:'#3f5fa8'}, say:'Mencret terus dari kemarin, Dok. Ini KIA-nya.'},
    'Tn. Agus Wibowo':    {look:{sk:2, hair:'short', must:1, glasses:1, shirt:'#6b7b8c'}, fotoStyle:{glasses:0}, say:'Ulu hati perih, Dok. Ini KTP saya, memang KTP lama.'},
    'Tn. Slamet Riyadi':  {look:{sk:3, hair:'bald', hc:'#a29f99', old:1, must:1, shirt:'#8a6a3a'}, say:'Saya muntah darah tadi pagi, Dok. BAB-nya hitam.'},
    'Ny. Lina Marlina':   {look:{sk:0, hair:'long', hc:'#2a1d16', shirt:'#4f8a5a'}, say:'Jatuh di tangga, tangan saya nggak bisa digerakkan.'},
    'Ny. Maya Kusuma':    {look:{sk:0, hair:'bob', hc:'#3a2418', shirt:'#c47a3a'}, say:'Perih kalau pipis, Dok. Anyang-anyangan.'},
    'Tn. Joko Susilo':    {look:{sk:2, hair:'short', shirt:'#2f4f6f'}, foto:{sk:2, hair:'bald', hc:'#c4c1bb', old:1, must:1, glasses:1, shirt:'#5a4a3a'}, say:'Pegal semua habis futsal, Dok. Ini KTP-nya.'},
    'Ny. Siti Rahmawati': {look:{sk:1, hijab:'#a33b3b', shirt:'#a33b3b'}, say:'Perdarahan saya belum berhenti, Dok. Lemas sekali.'},
    'An. Bima Saputra':   {look:{kid:1, sk:2, hair:'kid', shirt:'#3a8ac4', blush:1}, foto:{kid:1, sk:2, hair:'spiky', glasses:1, shirt:'#f2f2f2'}, comp:{sk:2, hijab:'#4a7a3a', shirt:'#4a7a3a'}, say:'Telinganya sakit, Dok, rewel terus. Ini kartu anaknya.'},
    'Ny. Ratna Kurniasih':{look:{sk:1, hijab:'#c9a23a', shirt:'#c9a23a'}, foto:{sk:3, hijab:'#2a2a4a', glasses:1, shirt:'#2a2a4a'}, say:'Diare sama mual dari semalam, Dok.'}
  };
  Object.assign(APPEAR, {
    'Tn. Andi Firmansyah': {look:{sk:2, hair:'short', must:1, shirt:'#e07b39'}, say:'Kaki kanan saya bengkak merah, Dok, panas sekali.'},
    'Ny. Wati Susanti':    {look:{sk:1, hijab:'#5aa9e6', shirt:'#5aa9e6'}, say:'Kepala saya berat, Dok. Obat tensi saya habis.'},
    'Tn. Darmawan':        {look:{sk:3, hair:'bald', hc:'#c9c6c0', old:1, shirt:'#7d8b99'}, say:'Lemas sekali, Dok... jadwal cuci darah saya terlewat.'},
    'Ny. Ningsih':         {look:{sk:1, hijab:'#9b6bd6', old:1, glasses:1, shirt:'#9b6bd6'}, comp:{sk:1, hair:'long', hc:'#2a1d16', shirt:'#4fb0a5'}, say:'Ibu saya susah dibangunkan dari tadi, Dok!'},
    'Nn. Putri Anggraini': {look:{sk:0, hair:'long', hc:'#2a1d16', shirt:'#ff8fb1'}, say:'Demam empat hari, Dok. Badan pegal semua.'},
    'Tn. Yusuf Hidayat':   {look:{sk:2, hair:'side', hc:'#3b2a22', must:1, shirt:'#3a6ea5'}, say:'BAB saya hitam, Dok. Lemas, mau pingsan.'},
    'Tn. Rudi Hartanto':   {look:{sk:1, hair:'spiky', shirt:'#4caf50'}, say:'Kaki kram terus, Dok, habis diare dua hari.'},
    'Ny. Endang Sulastri': {look:{sk:2, hijab:'#e5734f', shirt:'#e5734f'}, say:'Kepala nyut-nyutan, Dok. Kartu JKN saya ketinggalan, ini punya adik saya.'},
    'Tn. Bambang Sutrisno':{look:{sk:3, hair:'short', shirt:'#f2b632'}, say:'Tangan saya kena seng, Dok. Kata petugas JKN saya nunggak...'}
  });
  const SKIN = [['#ffd7b5','#f2b98f'],['#f5bf8e','#e09f6c'],['#d99a66','#bf7f4c'],['#a8693f','#8a5330']];
  const shade = (hex, f) => { const n = parseInt(hex.slice(1),16); const ch = s => Math.max(0,Math.min(255,Math.round(((n>>s)&255)*(1+f))));
    return '#' + [16,8,0].map(s => ch(s).toString(16).padStart(2,'0')).join(''); };

  /* Karakter flat dari bentuk bulat. mood: sad | happy | oops | huh | neutral. sil: warna siluet */
  function portrait(L, mood, sil){
    mood = mood || 'neutral';
    const BODY = 'M10 140 C10 112 26 101 44 99 L76 99 C94 101 110 112 110 140 Z';
    if (sil){
      return `<svg viewBox="0 0 120 140" aria-hidden="true"><path d="${BODY}" fill="${sil}"/>`
        + (L.hijab ? `<circle cx="60" cy="58" r="40" fill="${sil}"/>` : `<ellipse cx="60" cy="58" rx="32" ry="35" fill="${sil}"/>`)
        + (L.hair === 'pig' ? `<circle cx="22" cy="50" r="12" fill="${sil}"/><circle cx="98" cy="50" r="12" fill="${sil}"/>` : '')
        + (L.hair === 'spiky' ? `<path d="M36 34 L44 10 L54 28 L62 6 L70 28 L80 12 L84 36 Z" fill="${sil}" stroke="${sil}" stroke-width="6" stroke-linejoin="round"/>` : '') + '</svg>';
    }
    const [sk, skd] = SKIN[L.sk || 0];
    const hc = L.hc || (L.old ? '#b9b6b1' : '#3b2a22'), shirt = L.shirt || '#4a90d9', hair = L.hair || 'short';
    const ink = '#3c3c3c', P = [];
    const o = L.hijab ? 5 : 0, ey = 60 + o, big = L.kid ? 1.15 : 1;

    // rambut belakang
    if (!L.hijab){
      if (hair === 'long') P.push(`<rect x="24" y="32" width="72" height="92" rx="32" fill="${hc}"/>`);
      if (hair === 'bob')  P.push(`<rect x="23" y="30" width="74" height="64" rx="30" fill="${hc}"/>`);
      if (hair === 'pig')  P.push(`<circle cx="22" cy="52" r="13" fill="${hc}"/><circle cx="98" cy="52" r="13" fill="${hc}"/><rect x="30" y="46" width="7" height="12" rx="3" fill="#ff7aa8"/><rect x="83" y="46" width="7" height="12" rx="3" fill="#ff7aa8"/>`);
    }
    // badan + leher
    P.push(`<path d="${BODY}" fill="${shirt}"/>`);
    P.push(`<path d="M44 99 L60 118 L76 99 Z" fill="${shade(shirt,-.16)}"/>`);
    P.push(`<rect x="49" y="80" width="22" height="26" rx="10" fill="${skd}"/>`);
    // jilbab
    if (L.hijab){
      P.push(`<path d="M16 74 C12 104 24 122 40 124 L80 124 C96 122 108 104 104 74 Z" fill="${L.hijab}"/>`);
      P.push(`<circle cx="60" cy="58" r="42" fill="${L.hijab}"/>`);
      P.push(`<ellipse cx="60" cy="38" rx="22" ry="7" fill="#fff" fill-opacity=".18"/>`);
    } else {
      P.push(`<circle cx="29" cy="62" r="8" fill="${skd}"/><circle cx="91" cy="62" r="8" fill="${skd}"/>`);
    }
    // kepala
    P.push(L.hijab ? `<ellipse cx="60" cy="64" rx="26" ry="29" fill="${sk}"/>` : `<ellipse cx="60" cy="58" rx="31" ry="34" fill="${sk}"/>`);
    if (L.hijab) P.push(`<circle cx="86" cy="92" r="3.5" fill="#fff" fill-opacity=".8"/>`);

    // pipi
    if (L.kid || L.blush || mood === 'happy') P.push(`<circle cx="40" cy="${75+o}" r="6.5" fill="#ff7f7f" fill-opacity=".45"/><circle cx="80" cy="${75+o}" r="6.5" fill="#ff7f7f" fill-opacity=".45"/>`);
    // mata
    if (mood === 'happy'){
      [48,72].forEach(x => P.push(`<path d="M${x-7} ${ey+1} Q${x} ${ey-8} ${x+7} ${ey+1}" stroke="${ink}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`));
    } else {
      [48,72].forEach(x => P.push(`<ellipse cx="${x}" cy="${ey}" rx="${7*big}" ry="${8.5*big}" fill="#fff"/>`
        + `<circle cx="${x+1}" cy="${ey+1.5}" r="${4.6*big}" fill="${ink}"/><circle cx="${x+2.6}" cy="${ey-.6}" r="1.6" fill="#fff"/>`));
    }
    // alis (ekspresi berlebihan)
    const bc = L.old ? '#9a958e' : (L.hijab ? '#4a3428' : shade(hc,-.15));
    const brow = (x1,y1,x2,y2) => P.push(`<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${bc}" stroke-width="5" stroke-linecap="round"/>`);
    if (mood === 'sad'){ brow(40,ey-12,54,ey-17); brow(66,ey-17,80,ey-12); }
    else if (mood === 'huh'){ brow(40,ey-13,54,ey-12); brow(66,ey-20,80,ey-17); }
    else if (mood === 'oops'){ brow(40,ey-14,54,ey-16); brow(66,ey-16,80,ey-14); }
    else { brow(40,ey-15,54,ey-16); brow(66,ey-16,80,ey-15); }
    // keriput
    if (L.old) P.push(`<path d="M34 ${ey+4} q3 4 7 3 M86 ${ey+4} q-3 4 -7 3" stroke="${skd}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`);
    // hidung
    P.push(`<ellipse cx="60" cy="${71+o}" rx="6" ry="5" fill="${skd}"/>`);
    // kumis
    if (L.must) P.push(`<path d="M42 ${80+o} Q51 ${72+o} 60 ${78+o} Q69 ${72+o} 78 ${80+o} Q69 ${86+o} 60 ${81+o} Q51 ${86+o} 42 ${80+o} Z" fill="${L.old ? '#d8d4ce' : '#3b2a22'}"/>`);
    if (mood === 'oops' || mood === 'huh') P.push(`<path d="M92 26 q6 9 0 13 q-6 -4 0 -13 Z" fill="#5ec8ff"/>`);
    // kacamata
    if (L.glasses){
      P.push(`<rect x="36" y="${ey-10}" width="24" height="20" rx="9" fill="#fff" fill-opacity=".2" stroke="${ink}" stroke-width="4"/>`
        + `<rect x="60" y="${ey-10}" width="24" height="20" rx="9" fill="#fff" fill-opacity=".2" stroke="${ink}" stroke-width="4"/>`);
    }
    // rambut depan
    if (!L.hijab){
      const F = d => P.push(`<path d="${d}" fill="${hc}"/>`);
      if (hair === 'short'){ F('M28 58 C24 26 44 18 62 18 C82 18 96 30 92 58 C88 44 78 38 66 38 C52 40 38 46 28 58 Z'); F('M36 44 C42 26 66 22 82 34 C66 32 50 36 36 44 Z'); }
      if (hair === 'spiky'){ P.push(`<path d="M34 40 L42 10 L52 28 L62 4 L70 28 L80 10 L86 40 Z" fill="${hc}" stroke="${hc}" stroke-width="6" stroke-linejoin="round"/>`); F('M28 58 C24 30 42 22 60 22 C78 22 96 30 92 58 C86 44 74 40 60 40 C46 40 34 46 28 58 Z'); }
      if (hair === 'kid' || hair === 'pig'){ F('M27 60 C22 24 44 16 60 16 C78 16 98 24 93 60 L90 50 C80 46 40 46 30 50 Z'); }
      if (hair === 'bald'){ P.push(`<ellipse cx="31" cy="50" rx="7" ry="12" fill="${hc}"/><ellipse cx="89" cy="50" rx="7" ry="12" fill="${hc}"/><ellipse cx="50" cy="32" rx="10" ry="5" fill="#fff" fill-opacity=".35"/>`); }
      if (hair === 'side'){ F('M28 56 C22 26 46 16 64 18 C86 20 98 34 92 56 C90 42 82 36 70 34 C58 40 42 42 28 56 Z'); }
      if (hair === 'long' || hair === 'bob'){ F('M27 64 C22 26 44 18 60 18 C76 18 98 26 93 64 C88 42 76 32 60 32 C44 32 32 42 27 64 Z'); }
    }
    return `<svg viewBox="0 0 120 140" preserveAspectRatio="xMidYMax meet" aria-hidden="true">${P.join('')}</svg>`;
  }
  const appear = d => APPEAR[d.pt.nama] || {look:{sk:1}, say:'Tolong, Dok.'};

  /* ================= LOKET ================= */
  function renderBooth(d){
    const ap = appear(d), L = ap.look;
    let h = '';
    if (ap.comp) h += `<div class="person comp">${portrait(ap.comp,'neutral')}</div>`;
    h += `<div class="person main${L.kid ? ' kid' : ''}${L.small ? ' small' : ''}" ${ia('wajah','orang','self','orang di loket')}>${portrait(L,'sad')}</div>`;
    E.people.className = 'b-people' + (ap.comp ? ' with-comp' : '');
    E.people.innerHTML = h;
    void E.people.offsetWidth; E.people.classList.add('in');
    say(ap.say, 650);
    const left = Math.max(0, S.queue.length - S.i - 1);
    E.queue.innerHTML = Array.from({length:Math.min(left, 7)}, (_, i) =>
      portrait({hair:['short','pig','spiky','long'][i%4], hijab: i%3===1 ? '#000' : null}, null, ['#c9b5f7','#b8a0f2','#d6c8fa'][i%3])).join('');
    E.qn.textContent = left;
    E.bclock.textContent = clockText();
  }
  function setMood(m){
    const el = E.people.querySelector('.person.main'); if (!el || !S) return;
    el.innerHTML = portrait(appear(S.queue[S.i]).look, m);
    el.classList.remove('react'); void el.offsetWidth; el.classList.add('react');
  }
  let sayT = null;
  function say(text, delay){
    clearTimeout(sayT); E.bubble.hidden = true;
    sayT = setTimeout(() => { E.bubble.textContent = text; E.bubble.hidden = false;
      E.bubble.classList.remove('pop'); void E.bubble.offsetWidth; E.bubble.classList.add('pop'); }, delay || 0);
  }

  /* ================= MODE PERIKSA IDENTITAS ================= */
  const KIND = {nama:'Nama', lahir:'Tanggal lahir', alamat:'Alamat', wajah:'Wajah'};
  const SRC = {kartu:'kartu pasien', ktp:'KTP', kia:'KIA', berkas:'berkas', orang:'orang di loket', gelang:'gelang', lab:'hasil lab', jkn:'kartu JKN'};
  const INS_IDLE = '<b>Mode periksa:</b> klik satu data identitas (nama, tanggal lahir, alamat, atau wajah orang di loket), lalu klik data yang sama di dokumen lain. Tekan <b>P</b> lagi untuk keluar.';
  let lastLink = null;
  function clearLink(){ lastLink = null; E.link.innerHTML = ''; E.linkTag.hidden = true; }
  function unpick(){ if (S && S.pick){ S.pick.classList.remove('pick'); S.pick = null; } }
  function setInspect(on, quiet){
    if (!S) return;
    if (on && (S.locked || S.resolved || !S.feats.has('lup'))) return;
    S.inspect = on; root.classList.toggle('inspect', on); E.lens.classList.toggle('igd-on', on);
    unpick(); clearLink();
    if (quiet) return;
    if (on){ setIdle(INS_IDLE); Sfx.squeak(); } else syncHint();
  }
  function edgePt(r, tx, ty){
    const cx = r.x + r.w/2, cy = r.y + r.h/2, dx = tx - cx, dy = ty - cy;
    const sx = dx ? Math.abs(r.w/2/dx) : Infinity, sy = dy ? Math.abs(r.h/2/dy) : Infinity, k = Math.min(sx, sy, 1);
    return [cx + dx*k, cy + dy*k];
  }
  function drawLink(a, b, ok){
    lastLink = [a, b, ok];
    const R0 = root.getBoundingClientRect();
    const k = FIT.s, box = el => { const r = el.getBoundingClientRect(); return {x:(r.left-R0.left)/k-3, y:(r.top-R0.top)/k-2, w:r.width/k+6, h:r.height/k+4}; };
    const A = box(a), B = box(b), col = ok ? '#3fd07a' : '#ff4b3e';
    const [x1,y1] = edgePt(A, B.x+B.w/2, B.y+B.h/2), [x2,y2] = edgePt(B, A.x+A.w/2, A.y+A.h/2);
    const rect = r => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="4" fill="${col}" fill-opacity=".18" stroke="${col}" stroke-width="2.5"/>`;
    E.link.innerHTML = rect(A) + rect(B) + `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}"/>`
      + `<circle cx="${x1}" cy="${y1}" r="4.5" fill="${col}"/><circle cx="${x2}" cy="${y2}" r="4.5" fill="${col}"/>`;
    E.linkTag.className = 'link-tag ' + (ok ? 'ok' : 'bad');
    E.linkTag.textContent = ok ? 'COCOK' : 'TIDAK COCOK';
    E.linkTag.style.left = ((x1+x2)/2) + 'px'; E.linkTag.style.top = ((y1+y2)/2) + 'px';
    E.linkTag.hidden = false;
  }
  function inspectClick(f){
    if (!S || !S.inspect) return;
    const p = S.pick;
    if (p === f){ unpick(); clearLink(); setIdle(INS_IDLE); return; }
    if (!p || p.dataset.src === f.dataset.src){
      unpick(); clearLink(); S.pick = f; f.classList.add('pick'); Sfx.squeak();
      setIdle(`<b>${KIND[f.dataset.ik]}</b> di ${SRC[f.dataset.src]} dipilih. Sekarang klik <b>${f.dataset.ik === 'wajah' ? (f.dataset.src === 'orang' ? 'foto di KTP/KIA' : 'orang di loket') : KIND[f.dataset.ik].toLowerCase() + ' di dokumen lain'}</b>.`);
      return;
    }
    if (p.dataset.ik !== f.dataset.ik){
      unpick(); clearLink(); S.pick = f; f.classList.add('pick');
      setIdle('Bandingkan data yang sejenis: nama dengan nama, tanggal lahir dengan tanggal lahir, alamat dengan alamat, wajah orang dengan foto.', true);
      return;
    }
    const ok = p.dataset.iv === f.dataset.iv;
    drawLink(p, f, ok); unpick();
    ok ? Sfx.good() : Sfx.bad();
    const fotoSrc = [p, f].find(x => x.dataset.src !== 'orang');
    const line = f.dataset.ik === 'wajah'
      ? `<b>Wajah</b> orang di loket ${ok ? 'sama dengan' : 'berbeda dengan'} foto di ${SRC[fotoSrc.dataset.src]}.`
      : `<b>${KIND[f.dataset.ik]}</b>: ${SRC[p.dataset.src]} <b>${esc(p.dataset.show)}</b> ${ok ? '=' : '≠'} ${SRC[f.dataset.src]} <b>${esc(f.dataset.show)}</b>.`;
    setIdle(ok ? `COCOK. ${line} Klik data lain untuk lanjut memeriksa.`
              : `TIDAK COCOK. ${line} Tekan <b>P</b> untuk keluar, lalu sorot baris yang salah dengan stabilo dan cap <b>TOLAK</b>.`, !ok);
  }
  function redrawLink(){ if (lastLink && lastLink[0].isConnected && lastLink[1].isConnected) drawLink(...lastLink); else clearLink(); }
  window.addEventListener('resize', () => { if (isOpen()) redrawLink(); });

  /* ================= DOKUMEN TAMBAHAN ================= */
  const FASKES = {'3273':'PUSKESMAS SUKAJADI','3204':'PUSKESMAS BALEENDAH','3277':'PUSKESMAS CIMAHI TENGAH','3275':'PUSKESMAS BEKASI JAYA','3201':'PUSKESMAS CIBINONG','3205':'PUSKESMAS TAROGONG'};
  function renderGelang(d){
    const g = Object.assign({nama:d.pt.nama, lahir:d.pt.lahir}, d.gelang || {});
    const alg = !/^tidak/i.test(d.pt.alergi);
    E.gelang.style.setProperty('--gc', d.pt.jk === 'L' ? '#7cc8ff' : '#ff9cc8');
    E.gelang.innerHTML = `<span class="id-tag">Dipasang di triase · Gelang</span>
      <div class="strap"></div><div class="holes"><i></i><i></i><i></i><i></i></div>
      ${alg ? '<span class="alg">ALERGI</span>' : ''}
      <div class="label"><div class="hosp">RSUD MELATI HUSADA · IGD</div>
        <div class="ln" data-id="gelang-nama" ${ia('nama','gelang',normName(g.nama),g.nama)}><span class="k">Nama</span><b>${esc(g.nama)}</b></div>
        <div class="ln" data-id="gelang-lahir" ${ia('lahir','gelang',g.lahir,dmy(g.lahir))}><span class="k">Tgl lahir</span><b>${dmy(g.lahir)}</b><small>${d.pt.jk}</small></div>
        <i class="igd-bar"></i></div>
      <span class="snap"></span>`;
  }
  function renderLab(d){
    const L = d.lab, id = Object.assign({nama:d.pt.nama, lahir:d.pt.lahir}, L.ident || {});
    const m = 22*60 + S.i*45 - 25, jam = String(Math.floor(((m%1440)+1440)%1440/60)).padStart(2,'0') + ':' + String(((m%60)+60)%60).padStart(2,'0');
    E.lab.innerHTML = `<span class="id-tag">Dari laboratorium</span><h5>HASIL LABORATORIUM</h5>
      <div class="meta"><span>RSUD Melati Husada</span><span>${GAME_DATE} · ${jam}</span></div>
      <div class="ln ln-labid" data-id="lab-id"><span class="k">Pasien</span><span ${ia('nama','lab',normName(id.nama),id.nama)}>${esc(id.nama)}</span><span class="dob"><span class="k">Tgl lahir</span><span ${ia('lahir','lab',id.lahir,dmy(id.lahir))}>${dmy(id.lahir)}</span></span></div>
      <div class="lab-head"><span>Pemeriksaan</span><span>Hasil</span><span>Rujukan</span></div>
      ${L.rows.map((r,i) => `<div class="ln lr${r[4] ? ' abn' : ''}" data-id="lab-r${i}"><span>${esc(r[0])}</span><span class="hv">${esc(r[1])}<small>${esc(r[2])}</small>${r[4] ? `<em class="flag">${r[4]}</em>` : ''}</span><span class="ref">${esc(r[3])}</span></div>`).join('')}
      <div class="analis"><small>Analis</small> Rini</div>`;
  }
  function renderJkn(d){
    const j = Object.assign({nama:normName(d.pt.nama), lahir:d.pt.lahir, status:'AKTIF'}, d.jkn || {});
    const own = normName(j.nama) === normName(d.pt.nama);
    const no = ('000' + d.pt.rm.replace(/-/g,'') + (own ? d.ktp.sn : '7' + d.ktp.sn.slice(1))).replace(/(\d{4})(?=\d)/g,'$1 ');
    const row = (id,k,v,attr) => `<div class="ln" data-id="jkn-${id}"${attr ? ' ' + attr : ''}><span class="k">${k}</span><span class="v">${v}</span></div>`;
    const ok = j.status === 'AKTIF';
    E.jkn.innerHTML = `<span class="id-tag">Dibawa pasien · Kartu JKN</span>
      <div class="jkn-head"><i></i><span>KARTU JKN<small>Jaminan Kesehatan Nasional</small></span></div>
      ${row('no','No. Kartu', no)}
      ${row('nama','Nama', esc(j.nama), ia('nama','jkn',normName(j.nama),j.nama))}
      ${row('lahir','Tgl Lahir', dmy(j.lahir), ia('lahir','jkn',j.lahir,dmy(j.lahir)))}
      ${row('faskes','Faskes Tk. I', FASKES[d.ktp.wil] || 'PUSKESMAS')}
      <div class="ln status ${ok ? 'ok' : 'bad'}" data-id="jkn-status"><span>Cek status (sistem)</span><b>${ok ? 'AKTIF ✓' : 'TIDAK AKTIF'}</b></div>`;
  }

  /* ================= MALAM: PILIH, MEMO, MULAI ================= */
  const BOSS = {sk:1, hair:'bob', hc:'#4a3a32', glasses:1, shirt:'#f4f4f4'};
  function renderNights(){
    E.nights.innerHTML = NIGHTS.slice(1, HARD).map((N, i) => {
      const n = i + 1, lock = false, best = PROG.best[n], done = PROG.done[n];
      return `<button class="night${lock ? ' locked' : ''}${done ? ' done' : ''}" ${lock ? 'disabled' : `data-act="memo" data-n="${n}"`}>
        <small>Malam</small><b>${n}</b><span>${N.title}</span><em>${lock ? 'Terkunci' : best ? 'Rekor ' + best : 'Belum dimainkan'}</em></button>`;
    }).join('') + `<button class="night hard${PROG.done[HARD] ? ' done' : ''}" data-act="memo" data-n="${HARD}">
        <b>MODE SULIT</b><span>Semua dokumen diacak · 10 berkas · 45 detik</span><em>${PROG.best[HARD] ? 'Rekor ' + PROG.best[HARD] : 'Belum dimainkan'}</em></button>`;
  }
  function showMemo(n){
    const N = NIGHTS[n];
    const docs = ['Kartu pasien','Berkas', ...N.feats.filter(f => FEAT_DOCS[f]).map(f => FEAT_DOCS[f])];
    E.memo.innerHTML = `<div class="memo">
      <div class="memo-from">${portrait(BOSS,'happy')}<div><small>Memo dari</small><b>dr. Maria, Sp.EM</b><span>Kepala IGD</span></div></div>
      <h2>${n === HARD ? 'Mode Sulit: semua diacak' : `Malam ${n}: ${N.title}`}</h2>
      <ul class="memo-list">${N.memo.map((t, i) => `<li>${i === 0 && n > 1 && n !== HARD ? '<span class="new">BARU</span>' : ''}${t}</li>`).join('')}</ul>
      <div class="memo-docs"><small>Di meja malam ini</small>${docs.map(x => `<span>${x}</span>`).join('')}</div>
      <div class="memo-meta">${N.mix.reduce((s,[,c]) => s + c, 0)} berkas · ${isPhone() ? Math.round(N.limit * 1.5) + ' detik per berkas (layar HP: waktu +50%)' : N.limit + ' detik per berkas'}${q('#igd-relax').checked ? ' (mode santai: tanpa timer)' : ''}</div>
      <button class="igd-btn${n === HARD ? ' btn-hard' : ''}" data-act="go" data-n="${n}">Mulai ${nightName(n).toLowerCase()} <kbd>Enter</kbd></button>
      <button class="igd-btn igd-btn-ghost" data-act="menu">Pilih malam lain</button></div>`;
    E.title.hidden = true; E.end.hidden = true; E.memo.hidden = false;
    E.memo.scrollTop = 0;
  }
  function showMenu(){
    clearInterval(tid); setPlaying(false); renderNights();
    E.memo.hidden = true; E.end.hidden = true; E.title.hidden = false;
  }
  function buildQueue(n){
    const N = NIGHTS[n], used = new Set(), out = [];
    const ok = d => minNight(d) <= n && !used.has(d);
    const pool = key => DOCS.filter(d => ok(d) && (key === 'safe' ? !flawsOf(d).length
      : key === 'flaw' ? flawsOf(d).length
      : key === 'clin' ? flawsOf(d).length && !d.kind
      : flawsOf(d).length && key.split('|').includes(d.kind)));
    const mix = N.hard ? (f => [['flaw', f], ['safe', 10 - f]])(6 + Math.floor(Math.random() * 3)) : N.mix;
    mix.forEach(([key, cnt]) => {
      const p = shuffle(pool(key));
      if (key === 'safe') p.sort((a, b) => (minNight(b) === n) - (minNight(a) === n));
      p.slice(0, cnt).forEach(d => { used.add(d); out.push(d); });
    });
    const want = mix.reduce((s,[,c]) => s + c, 0);
    while (out.length < want){ const x = shuffle(DOCS.filter(ok))[0]; if (!x) break; used.add(x); out.push(x); }
    return shuffle(out);
  }
  function idleText(){
    const f = S.feats, list = ['isi klinis (alergi, berat badan, kondisi, satuan)'];
    if (f.has('ktp')) list.push('KTP/KIA (nama, tanggal lahir, alamat)');
    if (f.has('wajah')) list.push('wajah di loket dengan foto');
    if (f.has('gelang')) list.push('gelang');
    if (f.has('lab')) list.push('hasil lab (nilai H/L dan identitasnya)');
    if (f.has('jkn')) list.push('kartu JKN (bukan alasan menolak)');
    if (S.night === HARD) return '<b>Mode Sulit:</b> semua aturan berlaku. Sorot yang salah lalu cap <b>TOLAK</b>, atau cap <b>ACC</b>.';
    return `<b>Malam ${S.night}:</b> cek ${list.join(', ')}. Ada yang salah? <b>Sorot</b> barisnya dan cap <b>TOLAK</b>. Semua aman? Cap <b>ACC</b>.`;
  }

  /* ================= MEJA: GESER DOKUMEN ================= */
  const DESK = (() => {
    const sf = E.mat, cards = [E.chart, E.paper, E.idcard, E.gelang, E.lab, E.jkn];
    const ZBASE = new Map([[E.paper,1],[E.chart,2],[E.lab,3],[E.gelang,4],[E.idcard,5],[E.jkn,6]]);
    const mq = window.matchMedia('(min-width: 981px)');
    let z = 10, drag = null, suppress = false;
    const free = () => FIT.on || mq.matches;
    const vis = () => cards.filter(c => !c.hidden);
    const place = (c, x, y) => { c.style.left = Math.round(x) + 'px'; c.style.top = Math.round(y) + 'px'; };
    function fit(){
      if (!free() || FIT.on){ sf.style.minHeight = ''; return; }
      let b = 720; vis().forEach(c => { b = Math.max(b, c.offsetTop + c.offsetHeight + 40); }); sf.style.minHeight = b + 'px';
    }
    function pack(){
      const W = sf.clientWidth, H = sf.clientHeight, G = 14, M = 12, s = new Map(), placed = [];
      const ov = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
      const cost = r => placed.reduce((t, p) => {
        if (p.c === E.paper){                       // bagian bawah berkas (tanda tangan/stempel) boleh tertutup
          const foot = {x:p.x, y:p.y + p.h - 160, w:p.w, h:160}, top = {x:p.x, y:p.y, w:p.w, h:p.h - 160};
          return t + ov(r, foot) * .4 + ov(r, top) * 6;
        }
        const wgt = (p.c === E.chart || p.c === E.idcard) ? 12 : p.c === E.gelang ? 4 : 2;
        return t + ov(r, p) * wgt;
      }, 0);
      [E.chart, E.paper, E.idcard, E.gelang, E.jkn, E.lab].filter(c => !c.hidden).forEach(c => {
        const w = c.offsetWidth, h = c.offsetHeight;
        let xs = [M, W - M - w, ...placed.map(p => p.x + p.w + G), ...placed.map(p => p.x)].filter(x => x >= M && x + w <= W - M + 1);
        if (!xs.length) xs = [Math.max(M, W - M - w)];
        let best = null;
        xs.forEach(x => {
          let y = M;
          placed.forEach(p => { if (x < p.x + p.w + G/2 && x + w > p.x - G/2) y = Math.max(y, p.y + p.h + G); });
          if (y + h > H - M) y = Math.max(M, H - M - h);
          const score = cost({x, y, w, h}) + y * 2 + x * .01;
          if (!best || score < best.score) best = {x, y, score};
        });
        placed.push({x:best.x, y:best.y, w, h, c}); s.set(c, [best.x, best.y]);
      });
      return s;
    }
    function slots(){
      if (FIT.on) return pack();
      const W = sf.clientWidth, s = new Map();
      if (sf.classList.contains('wide')){
        s.set(E.chart, [16, 18]);
        const px = 16 + E.chart.offsetWidth + 26, cx = px + E.paper.offsetWidth + 26;
        s.set(E.paper, [px, 16]);
        let cy = 22;
        [E.idcard, E.gelang, E.jkn].forEach(c => { if (!c.hidden){ s.set(c, [Math.min(cx, W - c.offsetWidth - 12), cy]); cy += c.offsetHeight + 34; } });
        if (!E.lab.hidden){
          const a = 18 + E.chart.offsetHeight + 28, b = 16 + E.paper.offsetHeight + 30;
          s.set(E.lab, a <= b ? [16, a] : [px, b]);
        }
        return s;
      }
      const px = Math.max(16, Math.min(E.chart.offsetWidth + 40, W - E.paper.offsetWidth - 16));
      s.set(E.chart, [16, 18]); s.set(E.paper, [px, 16]);
      let ly = 18 + E.chart.offsetHeight + 30, lw = E.chart.offsetWidth;
      [E.idcard, E.gelang, E.jkn].forEach(c => { if (!c.hidden){ s.set(c, [18, ly]); ly += c.offsetHeight + 34; lw = Math.max(lw, c.offsetWidth); } });
      if (!E.lab.hidden){
        const lx = Math.max(px, 18 + lw + 26);
        s.set(E.lab, [Math.max(16, Math.min(lx, W - E.lab.offsetWidth - 12)), 16 + E.paper.offsetHeight + 30]);
      }
      return s;
    }
    const setWide = () => sf.classList.toggle('wide', free() && !FIT.on && sf.clientWidth >= 1100);
    function layout(){
      if (!free()) return;
      setWide();
      const s = slots();
      vis().forEach(c => { place(c, ...s.get(c)); c.dataset.placed = '1'; c.style.zIndex = ZBASE.get(c); });
      z = 10; fit(); redrawLink();
    }
    function apply(){
      const f = free();
      sf.classList.toggle('free', f); root.classList.toggle('free-desk', f);
      if (!f){ sf.classList.remove('wide'); cards.forEach(c => { c.style.left = c.style.top = c.style.zIndex = ''; delete c.dataset.placed; }); fit(); return; }
      const fresh = vis().filter(c => !c.dataset.placed);
      if (!vis().some(c => c.dataset.placed)) setWide();
      if (fresh.length){ const s = slots(); fresh.forEach(c => { place(c, ...s.get(c)); c.dataset.placed = '1'; c.style.zIndex = ZBASE.get(c); }); }
      fit();
    }
    sf.addEventListener('pointerdown', e => {
      if (!free() || e.button !== 0) return;
      const c = e.target.closest('.dcard');
      if (!c || e.target.closest('button,input,select,a')) return;
      c.style.zIndex = ++z;
      drag = {c, x:e.clientX, y:e.clientY, l:c.offsetLeft, t:c.offsetTop, moved:false, id:e.pointerId};
    });
    window.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = (e.clientX - drag.x) / FIT.s, dy = (e.clientY - drag.y) / FIT.s, c = drag.c;
      if (!drag.moved){
        if (Math.hypot(dx, dy) < 6) return;
        drag.moved = true; c.classList.add('dragging'); root.classList.add('is-dragging');
      }
      e.preventDefault();
      const W = sf.clientWidth, H = sf.clientHeight;
      place(c, Math.min(Math.max(drag.l + dx, 90 - c.offsetWidth), W - 90), Math.min(Math.max(drag.t + dy, 0), H - 60));
      redrawLink();
    });
    const end = e => {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      if (drag.moved){
        suppress = true; setTimeout(() => { suppress = false; }, 0);
        drag.c.classList.remove('dragging'); root.classList.remove('is-dragging'); fit();
        setTimeout(redrawLink, 160);
      }
      drag = null;
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    sf.addEventListener('click', e => { if (suppress){ e.stopPropagation(); e.preventDefault(); suppress = false; } }, true);
    mq.addEventListener ? mq.addEventListener('change', apply) : mq.addListener(apply);
    window.addEventListener('resize', () => {
      if (!isOpen()) return;
      const changed = FIT.update();
      if (changed){ cards.forEach(c => delete c.dataset.placed); apply(); redrawLink(); return; }
      redrawLink();
      if (!free()) return;
      const W = sf.clientWidth;
      vis().forEach(c => { if (c.offsetLeft > W - 90) place(c, W - 90, c.offsetTop); });
    });
    return { apply, layout, fit, reset(){ cards.forEach(c => delete c.dataset.placed); }, front(c){ c.style.zIndex = ++z; } };
  })();

  function showDoc(){
    const d = S.queue[S.i];
    S.hl = null; S.locked = false; S.resolved = false; S.frac = 1; S.pausedAt = 0;
    setInspect(false, true);
    root.classList.add('can-mark');
    E.acc.disabled = E.tolak.disabled = false;
    const f = S.feats;
    renderBooth(d); renderChart(d); renderPaper(d);
    E.idcard.hidden = !f.has('ktp'); if (f.has('ktp')) renderIdCard(d);
    E.gelang.hidden = !f.has('gelang'); if (f.has('gelang')) renderGelang(d);
    E.lab.hidden = !(f.has('lab') && d.lab); if (!E.lab.hidden) renderLab(d);
    E.jkn.hidden = !f.has('jkn'); if (f.has('jkn')) renderJkn(d);
    DESK.apply(); setIdle(idleText()); hud(); startTimer();
    if (S.i > 0 && !FIT.on){ const bt = q('.booth').getBoundingClientRect().top; if (bt < -40 || bt > window.innerHeight * .6) q('.booth').scrollIntoView({behavior:'smooth', block:'start'}); }
  }

  /* ================= TIMER ================= */
  function startTimer(){
    clearInterval(tid);
    S.t0 = Date.now(); E.fill.style.width = '100%'; E.bar.classList.remove('low');
    if (S.relax) return;
    tid = setInterval(() => {
      S.frac = Math.max(0, 1 - (Date.now() - S.t0) / (S.limit*1000));
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
      S.frac = Math.max(0, 1 - (Date.now() - S.t0) / (S.limit*1000));
      E.fill.style.width = (S.frac*100) + '%';
      E.bar.classList.toggle('low', S.frac < .25);
      if (S.frac <= 0) timeUp();
    }, 100);
  }
  function timeUp(){
    clearInterval(tid);
    if (!S || S.locked) return;
    setInspect(false, true);
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
    setInspect(false, true);
    if (action === 'tolak' && !S.hl) { nudge(); return; }
    DESK.front(E.paper);
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
    const d = S.queue[S.i], flaws = flawsOf(d), flawed = flaws.length > 0, bonus = S.relax ? 0 : Math.round(frac * 50);
    let r;
    if (timeout) r = {cls:'bad', head:'WAKTU HABIS', sub:'Berkas diteruskan tanpa pemeriksaan.', pts:0, life:1};
    else if (action === 'acc') r = flawed
      ? {cls:'bad', head:'INSIDEN KESELAMATAN PASIEN', sub:'Kamu meng-ACC berkas yang mengandung kesalahan fatal.', pts:0, life:1}
      : {cls:'good', head:'ACC TEPAT', sub:'Berkas aman. Pasien segera ditangani.', pts:100 + bonus, life:0};
    else if (!flawed) r = {cls:'warn', head:'PENOLAKAN KELIRU', sub:'Berkas ini sebenarnya aman, pasien jadi tertunda.', pts:-75, life:0};
    else if (flaws.includes(S.hl)) r ={cls:'good', head:'TOLAK TEPAT', sub:'Kesalahan fatal tersorot dengan benar.', pts:100 + bonus, life:0};
    else r = {cls:'warn', head:'DITOLAK, SOROTAN MELESET', sub:'Berkasnya memang salah, tapi bukan di baris yang kamu sorot.', pts:30, life:0};

    S.resolved = true;
    S.score = Math.max(0, S.score + r.pts); S.lives -= r.life;
    if (r.cls === 'good') S.solvedIds.push(docId(d));
    S.log.push({cls:r.cls, pts:r.pts, topic:d.topic, title:`${TYPES[d.type].title.split(' ·')[0]} · ${d.pt.nama}`});
    const main = flaws.includes(S.hl) ? S.hl : flaws[0];
    flaws.forEach(id => root.querySelectorAll(`.ln[data-id="${id}"]`).forEach(n => n.classList.add('truth', ...(id === main ? [] : ['quiet']))));
    hud();
    r.cls === 'good' ? Sfx.good() : Sfx.bad();
    setMood(timeout ? 'sad' : action === 'acc' ? 'happy' : !flawed ? 'huh' : 'oops');
    say(timeout ? 'Dok? Halo? Saya masih nunggu...'
      : action === 'acc' ? (flawed ? 'Terima kasih, Dok!' : 'Terima kasih banyak, Dok.')
      : !flawed ? 'Lho, kenapa ditolak, Dok? Saya kan sudah lengkap...'
      : d.topic === 'identitas' ? (d.kind === 'gelang' ? 'Oh, gelangnya tertukar ya, Dok? Saya tunggu dipasang ulang.' : 'Oh... iya, Dok, saya urus dulu datanya di pendaftaran.')
      : 'Baik, Dok, saya tunggu instruksi yang baru.');

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
    E.people.classList.remove('in'); E.people.classList.add('out'); E.bubble.hidden = true; clearTimeout(sayT);
    setTimeout(() => {
      S.advancing = false; S.i++;
      if (S.lives <= 0 || S.i >= S.queue.length) finish(); else showDoc();
    }, 380);
  }

  function finish(){
    clearInterval(tid); root.classList.remove('can-mark'); setInspect(false, true);
    const n = S.night, total = S.queue.length, ok = S.log.filter(l => l.cls === 'good').length, ratio = ok / total, alive = S.lives > 0;
    let grade, note;
    if (!alive){ grade = 'Dipanggil Komite Medik'; note = 'Terlalu banyak insiden keselamatan pasien. Shift dihentikan lebih awal.'; }
    else if (ratio >= .85){ grade = 'Dokter Jaga Teladan'; note = 'Teliti, cepat, dan aman. Pasien beruntung kamu yang jaga malam ini.'; }
    else if (ratio >= .65){ grade = 'Dokter Jaga Handal'; note = 'Hampir semua terdeteksi. Lihat rekap di bawah untuk bagian yang masih meleset.'; }
    else if (ratio >= .4){ grade = 'Koas Perlu Bimbingan'; note = 'Lumayan, tapi masih banyak yang lolos. Pelajari kategori yang paling sering terlewat.'; }
    else { grade = 'Perlu Evaluasi Ulang'; note = 'Ulangi malam ini dan perhatikan pola kesalahannya di rekap.'; }

    setPlaying(false);
    const rec = Progress.record({ night:n, score:S.score, ok, total, alive, solvedIds:S.solvedIds });
    PROG = rec.p;
    const prev = rec.prev, record = rec.isBest;
    const xpRes = awardXP(rec, n, ok);

    const by = {};
    S.log.forEach(l => { const t = by[l.topic] || (by[l.topic] = {ok:0, n:0}); t.n++; if (l.cls === 'good') t.ok++; });
    const keys = TOPIC_ORDER.filter(k => by[k]);
    const rows = keys.map(k => { const t = by[k], r = t.ok / t.n;
      return `<div class="rc-row ${r >= .99 ? '' : r >= .5 ? 'mid' : 'low'}"><span>${TOPICS[k].label}</span><div class="rc-bar"><i style="width:${Math.max(4, r*100)}%"></i></div><em>${t.ok}/${t.n}</em></div>`; }).join('');
    const miss = keys.filter(k => by[k].ok < by[k].n).sort((a, b) => (by[b].n - by[b].ok) - (by[a].n - by[a].ok) || by[a].ok/by[a].n - by[b].ok/by[b].n)[0];
    const tip = miss ? `<div class="tipbox"><b>Paling sering terlewat: ${TOPICS[miss].label}.</b> ${TOPICS[miss].tip}</div>`
      : `<div class="tipbox good"><b>Tidak ada yang terlewat.</b> Semua kategori malam ini kamu kuasai.</div>`;

    const sym = {good:'✓', warn:'!', bad:'✗'};
    const castMood = alive ? 'happy' : 'sad';
    const nextBtn = alive && n < 5 ? `<button class="igd-btn" data-act="memo" data-n="${n+1}">Lanjut ke Malam ${n+1}</button>` : '';
    const again = `<button class="igd-btn${nextBtn ? ' igd-btn-ghost' : ''}" data-act="memo" data-n="${n}">Ulangi ${nightName(n)}</button>`;
    E.end.innerHTML = `<div class="folder">
      <div class="cast">${['Ny. Sari Wulandari','Tn. Agus Wibowo','An. Nadia Putri'].map(x => portrait(APPEAR[x].look, castMood)).join('')}</div>
      <h1>${n === HARD ? 'MODE <em>SULIT</em>' : `MALAM ${n} <em>SELESAI</em>`}</h1>
      <div class="grade${alive ? '' : ' bad'}">${grade}</div>
      <p class="igd-lead">${note}${alive && n === 5 ? ' Kamu sudah menamatkan kelima malam!' : ''}</p>
      <div class="igd-big">${S.score}${record ? '<span class="record">Rekor baru!</span>' : ''} <small style="font-size:1rem">poin · ${ok}/${total} tepat · nyawa pasien ${Math.max(S.lives,0)}/3${!record && prev ? ` · rekor ${prev}` : ''}</small></div>
      <div class="recap"><h4>Rekap belajar</h4>${rows}${tip}</div>
      <ul class="report">${S.log.map(l => `<li class="${l.cls}"><span>${sym[l.cls]}</span><em>${esc(l.title)}</em><b>${l.pts > 0 ? '+' : ''}${l.pts}</b></li>`).join('')}</ul>
      <div class="end-actions">${nextBtn}${again}<button class="igd-btn igd-btn-ghost" data-act="menu">Pilih malam</button><button class="igd-btn igd-btn-ghost" data-act="exit">‹ Kembali ke Beranda</button></div>
      <p class="fine">Game edukasi dengan kasus yang disederhanakan. Bukan pengganti pedoman klinis.</p></div>`;
    if (xpRes && xpRes.gained > 0) {
      E.end.querySelector('.igd-big')?.insertAdjacentHTML('afterend', `<p class="igd-xp-note">+${xpRes.gained} XP tercatat${rec.newIds.length ? ` · ${rec.newIds.length} kasus baru dikuasai` : ''}</p>`);
    }
    E.end.hidden = false; E.end.scrollTop = 0;
  }

  function openCalc(){
    if (E.book.classList.contains('open') && GUIDE.tab === 'kalk'){ toggleBook(false); return; }
    const pre = {}, d = S && S.queue && S.queue[S.i];
    if (d){
      const bb = parseFloat(d.pt.bb);
      if (bb) ['igd-c0bb','igd-c1bb','igd-c3bb','igd-c4bb','igd-c5bb','igd-c6bb'].forEach(id => { pre[id] = bb; });
      pre['igd-c5u'] = age(d.pt.lahir); pre['igd-c5j'] = d.pt.jk === 'P' ? '0.85' : '1';
    }
    GUIDE.show('kalk', pre); toggleBook(true);
  }
  function toggleBook(force){
    const open = typeof force === 'boolean' ? force : !E.book.classList.contains('open');
    E.book.classList.toggle('open', open);
  }

  renderNights();
  q('#igd-cast').innerHTML = ['Ny. Dewi Lestari','Tn. Slamet Riyadi','An. Raka Pratama'].map(n => portrait(APPEAR[n].look,'happy')).join('');

  /* ================= EVENT ================= */
  const markLine = e => {
    const ln = e.target.closest('.ln');
    if (!ln || !S || S.locked || S.inspect) return;
    const id = ln.dataset.id;
    root.querySelectorAll('.ln.hl').forEach(n => n.classList.remove('hl'));
    if (S.hl === id) S.hl = null; else { S.hl = id; ln.classList.add('hl'); Sfx.squeak(); }
    syncHint();
  };
  E.mat.addEventListener('click', markLine);

  root.addEventListener('click', e => {
    const f = e.target.closest('[data-ik]');
    if (f && S && S.inspect){ inspectClick(f); return; }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'exit'){ exitToHome(); return; }
    else if (a === 'memo') showMemo(+b.dataset.n);
    else if (a === 'go') start(+b.dataset.n);
    else if (a === 'menu') showMenu();
    else if (a === 'acc') decide('acc');
    else if (a === 'tolak') decide('tolak');
    else if (a === 'next') next();
    else if (a === 'inspect') setInspect(!(S && S.inspect));
    else if (a === 'tidy') DESK.layout();
    else if (a === 'book') toggleBook();
    else if (a === 'calc') openCalc();
    else if (a === 'closebook') toggleBook(false);
    else if (a === 'mute') E.mute.textContent = 'Suara: ' + (Sfx.toggle() ? 'mati' : 'nyala');
    else if (a === 'clear'){
      if (!S || S.locked) return;
      root.querySelectorAll('.ln.hl').forEach(n => n.classList.remove('hl')); S.hl = null; syncHint();
    }
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  });

  document.addEventListener('keydown', e => {
    if (!isOpen()) return;
    if (e.key === 'Escape' && E.book.classList.contains('open')){ toggleBook(false); if (e.target.blur) e.target.blur(); return; }
    if (e.target.matches && e.target.matches('input,textarea,select,[contenteditable]')) return;
    if (!E.memo.hidden){ if (e.key === 'Enter'){ const g = E.memo.querySelector('[data-act="go"]'); if (g){ e.preventDefault(); start(+g.dataset.n); } } return; }
    if (!S || !E.title.hidden || !E.end.hidden) return;
    const k = e.key.toLowerCase();
    if (k === 't') decide('tolak');
    else if (k === 'a') decide('acc');
    else if (k === 'b') toggleBook();
    else if (k === 'k') openCalc();
    else if (k === 'p') setInspect(!S.inspect);
    else if (k === 'r') DESK.layout();
    else if (k === 'escape'){ if (S.inspect) setInspect(false); else toggleBook(false); }
    else if ((k === 'enter' || k === ' ') && S.resolved){ e.preventDefault(); next(); }
  });

  function isOpen(){ return !!document.getElementById('mejaJagaIgdPage')?.classList.contains('active'); }
  function setPlaying(on){
    playing = !!on;
    try { document.body.classList.toggle('quiz-context', (playing || FIT.on) && isOpen()); } catch {}
  }
  function exitToHome(){
    onLeave();
    try { window.show?.('home'); window.renderCounts?.(); } catch (e) {}
  }
  function awardXP(rec, night, ok){
    let totalGained = 0, leveledUp = false;
    try {
      if (typeof window.addXP !== 'function') return { gained:0, leveledUp:false };
      (rec.newIds || []).forEach(id => {
        const res = window.addXP(15, 'Meja Jaga IGD • kasus baru', { kind:'quest', ref:'igd2:case:' + id, silent:true });
        if (res && res.gained > 0) { totalGained += res.gained; if (res.leveledUp) leveledUp = true; }
      });
      if (rec.newlyClearedNight) {
        const bonus = night === HARD ? 40 : 25;
        const res = window.addXP(bonus, 'Meja Jaga IGD • ' + nightName(night), { kind:'quest', ref:'igd2:night:' + night, silent:true });
        if (res && res.gained > 0) { totalGained += res.gained; if (res.leveledUp) leveledUp = true; }
      }
      if (ok > 0) {
        const d = new Date();
        const day = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
        const res = window.addXP(Math.min(40, ok * 5), 'Meja Jaga IGD • shift selesai', { kind:'quest', ref:'igd2:shift:' + day, silent:true });
        if (res && res.gained > 0) { totalGained += res.gained; if (res.leveledUp) leveledUp = true; }
        window.recordDailyQuestion?.();
      }
      if (totalGained > 0 && typeof window.showXPPopup === 'function') {
        const label = rec.newlyClearedNight ? `Meja Jaga IGD • ${nightName(night)} selesai`
          : rec.newIds.length ? `Meja Jaga IGD • ${rec.newIds.length} kasus baru` : 'Meja Jaga IGD • shift selesai';
        window.showXPPopup(totalGained, label, leveledUp);
      }
    } catch (e) {}
    return { gained:totalGained, leveledUp };
  }
  function onEnter(){
    PROG = loadP();
    renderNights();
    FIT.update();
    try { document.body.classList.toggle('quiz-context', playing || FIT.on); } catch {}
    if (playing) {
      resumeTimer();
      requestAnimationFrame(() => { DESK.reset(); DESK.apply(); redrawLink(); });
    }
  }
  function onLeave(){
    pauseTimer();
    E.book.classList.remove('open');
    FIT.disable();
    try { document.body.classList.remove('quiz-context'); } catch {}
  }
  let playing = false;
  window.addEventListener('clined:sync-applied', () => { PROG = loadP(); renderNights(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseTimer();
    else if (isOpen() && playing) resumeTimer();
  });
  return { onEnter, onLeave, isPlaying(){ return playing; } };
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
