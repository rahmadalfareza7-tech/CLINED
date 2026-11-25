/* CLINED · Meja Jaga IGD v2 — 5 malam bertahap + Mode Sulit, loket triase, lup identitas,
   dokumen geser (KTP/KIA, gelang, hasil lab, kartu JKN), kalkulator & panduan lengkap.
   Dimuat lazy via js/lazy-loader.js (bundle "igd"). Progres disimpan di localStorage "clined_igd_v2"
   dan tersinkron antar perangkat (merge max-deep di lib/sync-merge.mjs & js/online-sync.js). */
(() => {
  'use strict';
  const KEY = 'clined_igd_v2';
  const LEGACY_KEY = 'igd-meja-jaga-v1';

  const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const docId = d => String(d?.tplId || d?.pt?.nama || '').toLowerCase().replace(/[^a-z0-9:_-]+/g, '-').replace(/^-|-$/g, '');

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

  /* ================= SESI SHIFT AKTIF (simpan otomatis saat ke Beranda / refresh / ganti perangkat) ================= */
  const SESSION_KEY = 'clined_igd_session_v1';
  function sanitizeSession(raw) {
    if (!isObj(raw)) return null;
    if (raw.clearedAt || !Array.isArray(raw.queue) || !raw.queue.length) return null;
    const night = Math.min(Math.max(Math.round(Number(raw.night) || 1), 1), 6);
    const limit = Math.max(60, Math.round(Number(raw.limit) || 300));
    const queue = raw.queue.filter(d => isObj(d) && isObj(d.pt) && isObj(d.ktp) && Array.isArray(d.sections));
    if (!queue.length) return null;
    const i = Math.max(0, Math.round(Number(raw.i) || 0));
    const lives = Math.max(0, Math.min(3, Math.round(Number(raw.lives) || 0)));
    if (lives <= 0 || i >= queue.length) return null;
    const remMs = Math.max(1000, Math.min(limit * 1000, Math.round(Number(raw.remMs) || limit * 1000)));
    const now = Date.now();
    return {
      sid: String(raw.sid || (now.toString(36) + '-' + Math.random().toString(36).slice(2, 7))),
      night,
      limit,
      relax: !!raw.relax,
      queue,
      i,
      score: Math.max(0, Math.round(Number(raw.score) || 0)),
      lives,
      log: Array.isArray(raw.log) ? raw.log.slice(0, 20) : [],
      solvedIds: Array.isArray(raw.solvedIds) ? raw.solvedIds.filter(Boolean).slice(0, 20) : [],
      remMs,
      hl: typeof raw.hl === 'string' && raw.hl ? raw.hl : null,
      startedAt: Math.max(0, Math.round(Number(raw.startedAt) || now)),
      updated: Math.max(0, Math.round(Number(raw.updated) || now))
    };
  }
  const Session = {
    KEY: SESSION_KEY,
    read() {
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        return sanitizeSession(JSON.parse(raw));
      } catch (e) { return null; }
    },
    save(snap) {
      const clean = sanitizeSession(snap);
      if (!clean) return null;
      clean.updated = Date.now();
      try { localStorage.setItem(SESSION_KEY, JSON.stringify(clean)); } catch (e) {}
      return clean;
    },
    clear(sid) {
      const now = Date.now();
      const tomb = { sid: String(sid || ''), clearedAt: now, updated: now };
      try { localStorage.setItem(SESSION_KEY, JSON.stringify(tomb)); } catch (e) {}
      return tomb;
    }
  };

  const MARKUP = `<div class="igd-stage" id="igd-stage">
<div class="igd" id="igd">
  <svg width="0" height="0" style="position:absolute" aria-hidden="true">
    <filter id="igd-rough"><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="3" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="3"/></filter>
  </svg>

  <header class="hud">
    <button type="button" class="mini-btn igd-hud-back" data-act="exit" title="Simpan progres shift &amp; kembali ke Beranda CLINED">‹ Beranda CLINED</button>
    <div class="hud-brand"><span>Meja Jaga IGD<small class="hud-night-badge">SHIFT MALAM · 21.00 – 07.00 WIB</small></span></div>
    <div class="hud-item"><span class="lbl">Jam</span><b id="igd-clock">22:00</b></div>
    <div class="hud-item"><span class="lbl">Sisa</span><b id="igd-timer">05:00</b></div>
    <div class="hud-item"><span class="lbl">Berkas</span><b id="igd-count">1/8</b></div>
    <div class="hud-item"><span class="lbl">Skor</span><b id="igd-score">0</b></div>
    <div class="hud-item"><span class="lbl">Nyawa pasien</span><b class="lives" id="igd-lives"><span class="cross">&#10010;</span><span class="cross">&#10010;</span><span class="cross">&#10010;</span></b></div>
    <div class="hud-btns">
      <button type="button" class="mini-btn igd-exit" data-act="menu" title="Simpan progres &amp; kembali ke Beranda Game">Beranda Game</button>
      <button type="button" class="mini-btn" data-act="book">Panduan <kbd>B</kbd></button>
      <button type="button" class="mini-btn btn-calc" data-act="calc">Kalkulator <kbd>K</kbd></button>
      <button type="button" class="mini-btn" data-act="mute" id="igd-mute">Suara: nyala</button>
    </div>
  </header>
  <div class="timebar"><i id="igd-timefill"></i></div>

  <div class="play">
  <section class="booth" aria-label="Loket triase">
    <div class="b-wait"><span class="b-lbl">Ruang tunggu triase</span><div class="b-bench"></div><div class="queue" id="igd-queue"></div></div>
    <div class="b-window">
      <div class="b-amb-sign"><i></i><span>AMBULANS · UGD 24 JAM</span></div>
      <div class="b-poster"><b>CUCI</b><b>TANGAN</b><i></i></div>
      <div class="b-people" id="igd-people"></div>
      <div class="bubble" id="igd-bubble" hidden></div>
      <div class="b-glass"></div>
      <div class="b-ledge">
        <i></i>
        <span class="b-coffee" title="Kopi Dokter Jaga Malam: hangat di jam rawan 03.00 pagi">☕ <small>KOPI JAGA</small></span>
      </div>
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
      <input type="search" id="igd-search" placeholder="Cari obat, kontraindikasi, interaksi, lab, cairan…" autocomplete="off" aria-label="Cari di panduan">
      <nav class="tabs" id="igd-tabs"></nav>
    </div>
    <div class="book-body" id="igd-book-body"></div>
  </aside>

  <section class="screen igd-screen-lobby" id="igd-title">
    <div class="folder igd-lobby">
      <header class="igd-lobby-top">
        <div class="igd-lobby-left">
          <button type="button" class="mini-btn igd-back-home" data-act="exit" title="Kembali ke Beranda CLINED">‹ Beranda CLINED</button>
        </div>
        <span class="igd-lobby-tag"><i class="beacon-dot"></i> RSUD MELATI HUSADA · SHIFT JAGA III (MALAM)</span>
        <div class="igd-lobby-tools">
          <button type="button" class="mini-btn igd-tool-btn" data-act="book" title="Buka Panduan Obat &amp; Pedoman Klinis">Panduan (85 Obat) <kbd>B</kbd></button>
          <button type="button" class="mini-btn igd-tool-btn btn-calc" data-act="calc" title="Buka Kalkulator GFR, IMT, &amp; Pediatrik">Kalkulator <kbd>K</kbd></button>
          <button type="button" class="mini-btn igd-tool-btn" data-act="mute" id="igd-lobby-mute" title="Nyalakan atau matikan efek suara">Suara: nyala</button>
        </div>
      </header>
      <div class="igd-lobby-hero">
        <div class="cast" id="igd-cast"></div>
        <h1 class="igd-lobby-title">MEJA JAGA <em>IGD</em></h1>
        <p class="byline">RSUD MELATI HUSADA · DOKTER JAGA TRIASE · BY <b>CLINED</b></p>
        <p class="igd-lead">Lampu IGD menyala benderang di tengah sunyinya malam. Dari loket triase hingga meja periksa, ketelitianmu adalah benteng terakhir keselamatan pasien. Periksa identitas di loket, telaah resep &amp; dosis obat SKDI (5 menit/berkas), waspadai interaksi obat berbahaya di jam-jam rawan kantuk, lalu tetapkan putusan: <b>TOLAK</b> atau <b>ACC</b>.</p>
      </div>
      <div class="igd-stats-bar" id="igd-stats"></div>
      <div class="igd-resume-slot" id="igd-resume" hidden></div>
      <div class="igd-section-head">
        <h3>Pilih Shift Malam Jaga</h3>
        <span class="igd-section-sub">Tiap malam menghadirkan jenis dokumen &amp; tantangan klinis baru</span>
      </div>
      <div class="nights" id="igd-nights"></div>
      <div class="igd-options-bar">
        <label class="igd-opt"><input type="checkbox" id="igd-relax"> Mode santai (tanpa batas timer per berkas)</label>
      </div>
      <div class="igd-guide-box">
        <h4>Cara Bermain Singkat</h4>
        <div class="igd-guide-grid">
          <div class="igd-guide-step">
            <span class="step-num">1</span>
            <b>Periksa Identitas Pasien</b>
            <p>Bandingkan foto wajah di loket triase, nama, tanggal lahir, dan alamat di KTP / KIA / Gelang dengan berkas.</p>
          </div>
          <div class="igd-guide-step">
            <span class="step-num">2</span>
            <b>Cek Klinis &amp; Pedoman</b>
            <p>Buka Panduan Obat (85 obat SKDI) atau Kalkulator. Waspadai dosis &times;10, satuan tertukar, alergi, &amp; interaksi obat.</p>
          </div>
          <div class="igd-guide-step">
            <span class="step-num">3</span>
            <b>Sorot &amp; Putuskan Berkas</b>
            <p>Gunakan stabilo merah jika ada kesalahan. Beri cap <b>TOLAK</b> (T) jika ada kekeliruan, atau <b>ACC</b> (A) jika aman.</p>
          </div>
        </div>
      </div>
      <p class="fine">Game edukasi dengan kasus klinis SKDI terverifikasi yang disederhanakan. Bukan pengganti pedoman klinis resmi atau keputusan tenaga medis.<br>Pintasan: <b>P</b> periksa identitas &middot; <b>T</b> tolak &middot; <b>A</b> ACC &middot; <b>B</b> panduan obat &middot; <b>K</b> kalkulator &middot; <b>R</b> rapikan meja &middot; <b>Enter</b> lanjut.</p>
      <div class="igd-lobby-foot">
        <button type="button" class="igd-btn igd-btn-ghost igd-title-exit" data-act="exit">‹ Kembali ke Beranda CLINED</button>
      </div>
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
    clock:q('#igd-clock'), timer:q('#igd-timer'), count:q('#igd-count'), score:q('#igd-score'), lives:q('#igd-lives'),
    fill:q('#igd-timefill'), bar:q('.timebar'), chart:q('#igd-chart'), paper:q('#igd-paper'), idcard:q('#igd-idcard'),
    con:q('#igd-console'), title:q('#igd-title'), end:q('#igd-end'), book:q('#igd-book'), resume:q('#igd-resume'),
    stats:q('#igd-stats'),
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
      thud(){
        if (muted) return;
        try {
          // Bunyi stempel triase IGD: klik pegas mekanis + dentuman meja kayu mantap
          tone('sine', 160, 45, .24, .95);
          const c = ac(), t = c.currentTime;
          const n1 = c.createBufferSource(), f1 = c.createBiquadFilter(), g1 = c.createGain();
          n1.buffer = noise(.035); f1.type = 'highpass'; f1.frequency.value = 1800;
          g1.gain.setValueAtTime(.35, t); g1.gain.exponentialRampToValueAtTime(.001, t + .035);
          n1.connect(f1).connect(g1).connect(c.destination); n1.start(t);
          const n2 = c.createBufferSource(), f2 = c.createBiquadFilter(), g2 = c.createGain();
          n2.buffer = noise(.1); f2.type = 'lowpass'; f2.frequency.value = 1100;
          g2.gain.setValueAtTime(.65, t + .012); g2.gain.exponentialRampToValueAtTime(.001, t + .1);
          n2.connect(f2).connect(g2).connect(c.destination); n2.start(t + .012);
        } catch (e) {}
      },
      squeak(){
        if (muted) return;
        try {
          // Goresan stabilo merah di berkas resep
          const c = ac(), n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
          n.buffer = noise(.12); f.type = 'bandpass'; f.frequency.value = 2500; f.Q.value = 3.2;
          g.gain.value = .3; n.connect(f).connect(g).connect(c.destination); n.start();
        } catch (e) {}
      },
      good(){
        try {
          // Telemetri monitor IGD: dual tone konfirmasi harmonis
          tone('sine', 880, null, .1, .22);
          setTimeout(() => tone('sine', 1175, null, .16, .22), 80);
        } catch (e) {}
      },
      bad(){
        try {
          // Alarm monitor IGD: peringatan bahaya klinis
          tone('sawtooth', 220, 140, .28, .26);
          setTimeout(() => tone('sawtooth', 165, 110, .26, .22), 110);
        } catch (e) {}
      },
      toggle(){ muted = !muted; return muted; }
    };
  })();

  /* ================= DATA & GENERATOR (js/meja-jaga-igd-data.js & js/meja-jaga-igd-gen.js) ================= */
  const DATA = window.CLINED_IGD_DATA;
  if (!DATA) throw new Error('Data Meja Jaga IGD belum dimuat');
  const GEN = window.CLINED_IGD_GEN || null;
  const {
    TYPES, GAME, GAME_DATE, WIL, FASKES, DOCS, APPEAR,
    TOPICS, TOPIC_ORDER, NIGHTS,
    DRUGS_A, DRUGS_B, LABS, FLUIDS, PEDIA, FORMULAS, QUICK, IDENT
  } = DATA;

  const age = iso => { const [y,m,d] = iso.split('-').map(Number); let a = GAME.y - y; if (GAME.m < m || (GAME.m === m && GAME.d < d)) a--; return a; };
  const dmy = iso => iso.split('-').reverse().join('-');
  /* NIK: 2 provinsi + 2 kab/kota + 2 kecamatan + DDMMYY (perempuan: tanggal + 40) + 4 nomor urut */
  const NIK = (wil, kec, lahir, jk, sn) => { const [y,m,d] = lahir.split('-');
    return wil + kec + String(+d + (jk === 'P' ? 40 : 0)).padStart(2,'0') + m + y.slice(2) + sn; };

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
      kk: o.kk || k.kk, kepala: o.kepala || k.kepala, kota: WIL[o.wil || k.wil], wil: o.wil || k.wil, photo: !kia || a >= 5
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
  const minNight = d => d.kind === 'id' ? 2 : d.kind === 'gelang' ? 3 : (d.kind === 'lab' || d.needs === 'lab') ? 4 : d.needs === 'jkn' ? 5 : 1;

  const HARD = 6;
  const fmtLimit = sec => sec % 60 === 0 ? `${sec / 60} menit` : `${sec} detik`;
  const nightName = n => n === HARD ? 'Mode Sulit' : `Malam ${n}`;
  const FEAT_DOCS = {ktp:'KTP/KIA', gelang:'Gelang', lab:'Hasil lab', jkn:'Kartu JKN'};

  const loadP = () => Progress.read();
  const saveP = p => Progress.write(p);
  let PROG = loadP();
  const recentSet = new Set();
  const recentTplSet = new Set();

  /* ================= PANDUAN LENGKAP ================= */
  const GUIDE = (() => {
    const body = q('#igd-book-body'), tabsEl = q('#igd-tabs'), search = q('#igd-search');
    const DRUGS = [...DRUGS_A, ...DRUGS_B].sort((a,b) => a.n.localeCompare(b.n,'id'));
    const DISCLAIMER = `<p class="note">Ringkasan rujukan klinis terverifikasi (${DRUGS.length} obat) untuk belajar di dalam game (mengacu PNPK, Fornas, IDAI, PERKI, POGI, AHA/ACLS, WHO). Dosis lazim dapat berbeda menurut kondisi pasien dan pedoman lokal — bukan pengganti keputusan klinis resmi.</p>`;
    let tab = 'obat';
    const TABS = [['obat','Obat'],['identitas','Identitas'],['lab','Nilai lab'],['cairan','Cairan & infus'],['anak','Anak'],['kalk','Kalkulator'],['panduan','Panduan']];
    const has = (txt, f) => !f || txt.toLowerCase().includes(f);
    const num = id => { const el = body.querySelector('#'+id); const v = el ? parseFloat(String(el.value).replace(',','.')) : NaN; return isFinite(v) ? v : NaN; };
    const fmt = (n, d=1) => Number(n).toLocaleString('id-ID', {maximumFractionDigits:d});

    function drugCard(d, open){
      let rows = [['Indikasi',d.ind],['Dosis dewasa',d.d],['Dosis anak',d.a]].map(([k,v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('');
      if (d.kh) rows += `<dt>Kehamilan &amp; ginjal/hati</dt><dd>${esc(d.kh)}</dd>`;
      rows += `<dt class="ki">Kontraindikasi</dt><dd>${esc(d.ki)}</dd>`;
      if (d.int) rows += `<dt class="int">Interaksi penting</dt><dd>${esc(d.int)}</dd>`;
      rows += `<dt>Efek samping &amp; pantauan</dt><dd>${esc(d.es)}</dd>`;
      return `<details class="drug"${open ? ' open' : ''}><summary><b>${esc(d.n)}</b><small>${esc(d.cls)}</small></summary><dl>${rows}</dl></details>`;
    }
    const vObat = f => {
      const list = DRUGS.filter(d => has([d.n, d.alt||'', d.cls, d.ind, d.kh||'', d.ki, d.int||'', d.es].join(' '), f));
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

  function fmtRemClock(ms){
    const s = Math.max(0, Math.ceil((Number(ms) || 0) / 1000));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }

  function currentRemMs(){
    if (!S) return 0;
    const totalMs = S.limit * 1000;
    if (S.relax) return totalMs;
    if (!S.t0) return totalMs;
    const refNow = S.pausedAt || Date.now();
    return Math.max(1000, Math.min(totalMs, totalMs - (refNow - S.t0)));
  }

  function saveActiveSession(){
    if (!S || !S.queue || !S.queue.length) return;
    if (S.resolved) {
      const nextIdx = S.i + 1;
      if (S.lives <= 0 || nextIdx >= S.queue.length) return;
      Session.save({
        sid: S.sid, night: S.night, limit: S.limit, relax: S.relax, queue: S.queue,
        i: nextIdx, score: S.score, lives: S.lives, log: S.log, solvedIds: S.solvedIds,
        remMs: S.limit * 1000, hl: null, startedAt: S.startedAt
      });
      return;
    }
    if (S.lives <= 0 || S.i >= S.queue.length) return;
    Session.save({
      sid: S.sid, night: S.night, limit: S.limit, relax: S.relax, queue: S.queue,
      i: S.i, score: S.score, lives: S.lives, log: S.log, solvedIds: S.solvedIds,
      remMs: currentRemMs(), hl: S.hl || null, startedAt: S.startedAt
    });
  }

  function enterPlayUI(n){
    const N = NIGHTS[n];
    E.title.hidden = true; E.end.hidden = true; E.memo.hidden = true;
    setPlaying(true);
    q('.hud-brand small').textContent = n === HARD ? 'MODE SULIT · SEMUA DIACAK' : `MALAM ${n} · ${N.title.toUpperCase()}`;
    E.lens.hidden = !S.feats.has('lup');
    E.bar.classList.toggle('off', S.relax);
    DESK.reset();
  }

  function start(n){
    Sfx.unlock();
    n = Math.min(Math.max(+n || 1, 1), HARD);
    const N = NIGHTS[n];
    const now = Date.now();
    S = { sid: now.toString(36) + '-' + Math.random().toString(36).slice(2, 7), startedAt: now,
          night:n, feats:new Set(N.feats), limit:N.limit, queue:buildQueue(n), i:0, score:0, lives:3, log:[], hl:null, solvedIds:[], pausedAt:0,
          locked:true, resolved:false, advancing:false, frac:1, t0:0, relax:q('#igd-relax').checked };
    enterPlayUI(n);
    showDoc();
    saveActiveSession();
  }

  function resumeSession(sv){
    const snap = sv || Session.read();
    if (!snap) { renderNights(); return false; }
    Sfx.unlock();
    const n = Math.min(Math.max(+snap.night || 1, 1), HARD);
    const N = NIGHTS[n];
    q('#igd-relax').checked = !!snap.relax;
    S = { sid: snap.sid, startedAt: snap.startedAt,
          night: n, feats: new Set(N.feats), limit: snap.limit || N.limit,
          queue: snap.queue, i: snap.i, score: snap.score, lives: snap.lives,
          log: [...snap.log], hl: snap.hl || null, solvedIds: [...snap.solvedIds], pausedAt: 0,
          locked: true, resolved: false, advancing: false, frac: 1, t0: 0, relax: !!snap.relax };
    enterPlayUI(n);
    showDoc({ remMs: snap.remMs, hl: snap.hl });
    saveActiveSession();
    return true;
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

  /* ================= PENAMPILAN PASIEN (piksel, APPEAR dari CLINED_IGD_DATA) ================= */
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
  const appear = d => d.appear || APPEAR[d.pt.nama] || {look:{sk:1}, say:'Tolong, Dok.'};

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
  function renderStats(){
    if (!E.stats) return;
    const cleared = [1,2,3,4,5].filter(n => PROG.done[n]).length;
    const solved = Object.keys(PROG.solved || {}).length;
    const bestVals = Object.values(PROG.best || {}).filter(Boolean);
    const topScore = bestVals.length ? Math.max(...bestVals) : 0;
    const hardBest = PROG.best[HARD];
    const hardDone = PROG.done[HARD];
    const hardLabel = hardDone ? 'Tuntas ✓' : (hardBest ? 'Rekor ' + hardBest : 'Siap diuji');

    E.stats.innerHTML = `
      <div class="igd-stat-item">
        <span class="stat-lbl">Malam Tuntas</span>
        <b class="stat-val${cleared === 5 ? ' stat-done' : ''}">${cleared}/5</b>
        <small class="stat-sub">${cleared === 5 ? 'Semua shift selesai!' : (5 - cleared) + ' malam tersisa'}</small>
      </div>
      <div class="igd-stat-item">
        <span class="stat-lbl">Kasus Dikuasai</span>
        <b class="stat-val">${solved}</b>
        <small class="stat-sub">Kasus SKDI Dokter Umum</small>
      </div>
      <div class="igd-stat-item">
        <span class="stat-lbl">Rekor Poin</span>
        <b class="stat-val">${topScore}</b>
        <small class="stat-sub">${topScore > 0 ? 'Skor shift tertinggi' : 'Belum ada rekor'}</small>
      </div>
      <div class="igd-stat-item">
        <span class="stat-lbl">Mode Sulit</span>
        <b class="stat-val${hardDone ? ' stat-done' : ''}">${hardLabel}</b>
        <small class="stat-sub">${hardDone ? 'Semua kasus acak' : '10 berkas generator acak'}</small>
      </div>`;
  }
  function renderResume(){
    if (!E.resume) return;
    const sv = Session.read();
    if (!sv) {
      const nextNight = [1,2,3,4,5].find(n => !PROG.done[n]) || 1;
      E.resume.hidden = false;
      E.resume.innerHTML = `
        <div class="igd-quick-start">
          <div class="igd-quick-text">
            <b>Siap bertugas di Meja Jaga IGD?</b>
            <small>Mulai shift jaga berikutnya atau pilih malam jaga di bawah.</small>
          </div>
          <button type="button" class="igd-btn igd-btn-start" data-act="memo" data-n="${nextNight}">
            ▶ Mulai Jaga (${nightName(nextNight)})
          </button>
        </div>`;
      return;
    }
    E.resume.hidden = false;
    E.resume.innerHTML = `<div class="igd-resume-card">
      <div class="igd-resume-head">
        <span class="igd-resume-tag">Shift Jaga Aktif Tersimpan</span>
        <span class="igd-resume-badge">Bisa Dilanjutkan</span>
      </div>
      <div class="igd-resume-body">
        <div class="igd-resume-info">
          <b>${nightName(sv.night)} &middot; Berkas ${sv.i + 1} dari ${sv.queue.length}</b>
          <div class="igd-resume-pills">
            <span>Skor: <b>${sv.score}</b></span>
            <span>Nyawa: <b>${sv.lives}/3</b></span>
            <span>Waktu: <b>${sv.relax ? 'Mode santai' : 'Sisa ' + fmtRemClock(sv.remMs)}</b></span>
          </div>
        </div>
        <div class="igd-resume-actions">
          <button type="button" class="igd-btn igd-btn-resume" data-act="resume">▶ Lanjutkan Shift</button>
          <button type="button" class="mini-btn igd-btn-discard" data-act="discard" title="Hapus progres shift ini untuk mulai dari awal">Hapus</button>
        </div>
      </div>
    </div>`;
  }
  const NIGHT_HOURS = [null, '21.00 WIB · Awal Shift', '23.30 WIB · Verifikasi KTP', '01.15 WIB · Gelang Pasien', '03.00 WIB · Jam Rawan & Lab', '04.45 WIB · Jelang Subuh', '02.30 WIB · GRAVEYARD SHIFT'];
  function renderNights(){
    renderStats();
    renderResume();
    E.nights.innerHTML = NIGHTS.slice(1, HARD).map((N, i) => {
      const n = i + 1, lock = false, best = PROG.best[n], done = PROG.done[n];
      return `<button class="night${lock ? ' locked' : ''}${done ? ' done' : ''}" ${lock ? 'disabled' : `data-act="memo" data-n="${n}"`}>
        <small class="night-time">${NIGHT_HOURS[n]}</small><b>Malam ${n}</b><span>${N.title}</span><em>${lock ? 'Terkunci' : best ? 'Rekor ' + best : 'Belum dimainkan'}</em></button>`;
    }).join('') + `<button class="night hard${PROG.done[HARD] ? ' done' : ''}" data-act="memo" data-n="${HARD}">
        <small class="night-time">${NIGHT_HOURS[HARD]}</small><b>MODE SULIT</b><span>Generator kasus acak SKDI · 10 berkas · ${fmtLimit(NIGHTS[HARD].limit)}</span><em>${PROG.best[HARD] ? 'Rekor ' + PROG.best[HARD] : 'Belum dimainkan'}</em></button>`;
  }
  function showMemo(n){
    const N = NIGHTS[n];
    const docs = ['Kartu pasien','Berkas', ...N.feats.filter(f => FEAT_DOCS[f]).map(f => FEAT_DOCS[f])];
    E.memo.innerHTML = `<div class="memo">
      <div class="igd-screen-nav">
        <button type="button" class="mini-btn igd-back-home" data-act="menu">‹ Beranda Game</button>
        <button type="button" class="mini-btn igd-back-home" data-act="exit">‹ Beranda CLINED</button>
      </div>
      <div class="memo-from">${portrait(BOSS,'happy')}<div><small>Memo dari</small><b>dr. Maria, Sp.EM</b><span>Kepala IGD</span></div></div>
      <h2>${n === HARD ? 'Mode Sulit: semua diacak' : `Malam ${n}: ${N.title}`}</h2>
      <ul class="memo-list">${N.memo.map((t, i) => `<li>${i === 0 && n > 1 && n !== HARD ? '<span class="new">BARU</span>' : ''}${t}</li>`).join('')}</ul>
      <div class="memo-docs"><small>Di meja malam ini</small>${docs.map(x => `<span>${x}</span>`).join('')}</div>
      <div class="memo-meta">${N.mix.reduce((s,[,c]) => s + c, 0)} berkas · ${fmtLimit(N.limit)} per berkas${q('#igd-relax').checked ? ' (mode santai: tanpa timer)' : ''}</div>
      <button class="igd-btn${n === HARD ? ' btn-hard' : ''}" data-act="go" data-n="${n}">Mulai ${nightName(n).toLowerCase()} <kbd>Enter</kbd></button>
      <button class="igd-btn igd-btn-ghost" data-act="menu">‹ Kembali ke Beranda Game</button></div>`;
    E.title.hidden = true; E.end.hidden = true; E.memo.hidden = false;
    E.memo.scrollTop = 0;
  }
  function showMenu(){
    pauseTimer();
    if (playing && S) saveActiveSession();
    clearInterval(tid); setPlaying(false); renderNights();
    E.memo.hidden = true; E.end.hidden = true; E.title.hidden = false;
    E.title.scrollTop = 0;
  }
  function buildQueue(n){
    const N = NIGHTS[n], used = new Set(), usedNames = new Set(), usedScenarios = new Set(), usedErrTypes = new Set(), out = [];
    const ok = d => minNight(d) <= n && !used.has(d) && !usedNames.has(d.pt.nama);
    const pool = key => DOCS.filter(d => ok(d) && (key === 'safe' ? !flawsOf(d).length
      : key === 'flaw' ? flawsOf(d).length
      : key === 'clin' ? flawsOf(d).length && !d.kind
      : flawsOf(d).length && key.split('|').includes(d.kind)));
    const preferFresh = arr => {
      const fresh = shuffle(arr.filter(d => !recentSet.has(d.pt.nama)));
      const stale = shuffle(arr.filter(d => recentSet.has(d.pt.nama)));
      return [...fresh, ...stale];
    };
    const mix = N.hard ? (f => [['flaw', f], ['safe', 10 - f]])(6 + Math.floor(Math.random() * 3)) : N.mix;
    let staticUsed = 0;
    const maxStatic = GEN ? (N.hard ? 2 : 1) : 99;
    mix.forEach(([key, cnt]) => {
      for (let i = 0; i < cnt; i++) {
        // Utamakan generator prosedural (~80%+ per shift) agar pasien, wajah, & jenis kesalahan terus berganti
        const freshStatic = staticUsed < maxStatic ? pool(key).filter(d => !recentSet.has(d.pt.nama)) : [];
        const pickStatic = !GEN || (freshStatic.length > 0 && Math.random() < 0.22);
        if (!pickStatic && GEN) {
          const gd = GEN.generate({ night: n, bucket: key, usedNames, usedScenarios, usedErrTypes, recentTpls: recentTplSet });
          if (gd) {
            usedNames.add(gd.pt.nama);
            out.push(gd);
            continue;
          }
        }
        const p = preferFresh(pool(key));
        if (key === 'safe') p.sort((a, b) => (minNight(b) === n) - (minNight(a) === n) || Number(recentSet.has(a.pt.nama)) - Number(recentSet.has(b.pt.nama)));
        if (p[0]) {
          used.add(p[0]); usedNames.add(p[0].pt.nama); out.push(p[0]); staticUsed++;
        } else if (GEN) {
          const gd = GEN.generate({ night: n, bucket: key, usedNames, usedScenarios, usedErrTypes, recentTpls: recentTplSet });
          if (gd) { usedNames.add(gd.pt.nama); out.push(gd); }
        }
      }
    });
    const want = mix.reduce((s,[,c]) => s + c, 0);
    while (out.length < want){
      if (GEN) {
        const gd = GEN.generate({ night: n, bucket: 'flaw', usedNames, usedScenarios, usedErrTypes, recentTpls: recentTplSet });
        if (gd) { usedNames.add(gd.pt.nama); out.push(gd); continue; }
      }
      const x = preferFresh(DOCS.filter(ok))[0]; if (!x) break; used.add(x); usedNames.add(x.pt.nama); out.push(x);
    }
    if (recentSet.size > 32) recentSet.clear();
    if (recentTplSet.size > 24) recentTplSet.clear();
    out.forEach(d => { if (!d.tplId) recentSet.add(d.pt.nama); });
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
    return {
      apply, layout, fit,
      reset(){ z = 10; cards.forEach(c => { delete c.dataset.placed; c.style.zIndex = ''; }); },
      front(c){ if (z > 400){ z = 10; cards.forEach(x => { if (!x.hidden) x.style.zIndex = ZBASE.get(x); }); } c.style.zIndex = ++z; }
    };
  })();

  function showDoc(opts){
    const d = S.queue[S.i];
    const restoreHl = opts && typeof opts.hl === 'string' && opts.hl ? opts.hl : null;
    S.hl = restoreHl; S.locked = false; S.resolved = false; S.frac = 1; S.pausedAt = 0;
    setInspect(false, true);
    root.classList.add('can-mark');
    E.acc.disabled = E.tolak.disabled = false;
    const f = S.feats;
    renderBooth(d); renderChart(d); renderPaper(d);
    E.idcard.hidden = !f.has('ktp'); if (f.has('ktp')) renderIdCard(d);
    E.gelang.hidden = !f.has('gelang'); if (f.has('gelang')) renderGelang(d);
    E.lab.hidden = !(f.has('lab') && d.lab); if (!E.lab.hidden) renderLab(d);
    E.jkn.hidden = !f.has('jkn'); if (f.has('jkn')) renderJkn(d);
    if (restoreHl) {
      const targetLn = root.querySelector(`.ln[data-id="${restoreHl}"]`);
      if (targetLn) targetLn.classList.add('hl'); else S.hl = null;
    }
    DESK.apply(); syncHint(); hud(); startTimer(opts && opts.remMs);
    if (S.i > 0 && !FIT.on){ const bt = q('.booth').getBoundingClientRect().top; if (bt < -40 || bt > window.innerHeight * .6) q('.booth').scrollIntoView({behavior:'smooth', block:'start'}); }
  }

  /* ================= TIMER (5 menit / berkas) ================= */
  function renderTimer(secLeft){
    if (!E.timer) return;
    if (!S || S.relax){ E.timer.textContent = 'Santai'; E.timer.classList.remove('low'); return; }
    const s = Math.max(0, Math.ceil(secLeft));
    E.timer.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    E.timer.classList.toggle('low', s <= 60);
  }
  function tickTimer(){
    const leftMs = Math.max(0, S.limit * 1000 - (Date.now() - S.t0));
    S.frac = leftMs / (S.limit * 1000);
    E.fill.style.width = (S.frac * 100) + '%';
    E.bar.classList.toggle('low', leftMs <= 60000);
    renderTimer(leftMs / 1000);
    if (leftMs <= 0) timeUp();
  }
  function startTimer(initialRemMs){
    clearInterval(tid);
    const totalMs = S.limit * 1000;
    const remMs = (typeof initialRemMs === 'number' && isFinite(initialRemMs) && initialRemMs > 0)
      ? Math.min(totalMs, Math.max(1000, initialRemMs)) : totalMs;
    S.t0 = Date.now() - (totalMs - remMs);
    S.frac = remMs / totalMs;
    E.fill.style.width = (S.frac * 100) + '%';
    E.bar.classList.toggle('low', !S.relax && remMs <= 60000);
    renderTimer(remMs / 1000);
    if (S.relax) return;
    tid = setInterval(tickTimer, 100);
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
    tickTimer();
    tid = setInterval(tickTimer, 100);
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
    if (!last) saveActiveSession();
  }

  function next(){
    if (!S || !S.resolved || S.advancing) return;
    S.advancing = true;
    E.paper.classList.remove('in'); E.paper.classList.add('out');
    E.people.classList.remove('in'); E.people.classList.add('out'); E.bubble.hidden = true; clearTimeout(sayT);
    setTimeout(() => {
      S.advancing = false; S.i++;
      if (S.lives <= 0 || S.i >= S.queue.length) finish();
      else { showDoc(); saveActiveSession(); }
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
    Session.clear(S.sid);
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
      <div class="igd-screen-nav">
        <button type="button" class="mini-btn igd-back-home" data-act="menu">‹ Beranda Game</button>
        <button type="button" class="mini-btn igd-back-home" data-act="exit">‹ Beranda CLINED</button>
      </div>
      <div class="cast">${['Ny. Sari Wulandari','Tn. Agus Wibowo','An. Nadia Putri'].map(x => portrait(APPEAR[x].look, castMood)).join('')}</div>
      <h1>${n === HARD ? 'MODE <em>SULIT</em>' : `MALAM ${n} <em>SELESAI</em>`}</h1>
      <div class="grade${alive ? '' : ' bad'}">${grade}</div>
      <p class="igd-lead">${note}${alive && n === 5 ? ' Kamu sudah menamatkan kelima malam!' : ''}</p>
      <div class="igd-big">${S.score}${record ? '<span class="record">Rekor baru!</span>' : ''} <small style="font-size:1rem">poin · ${ok}/${total} tepat · nyawa pasien ${Math.max(S.lives,0)}/3${!record && prev ? ` · rekor ${prev}` : ''}</small></div>
      <div class="recap"><h4>Rekap belajar</h4>${rows}${tip}</div>
      <ul class="report">${S.log.map(l => `<li class="${l.cls}"><span>${sym[l.cls]}</span><em>${esc(l.title)}</em><b>${l.pts > 0 ? '+' : ''}${l.pts}</b></li>`).join('')}</ul>
      <div class="end-actions">${nextBtn}${again}<button class="igd-btn igd-btn-ghost" data-act="menu">‹ Beranda Game</button><button class="igd-btn igd-btn-ghost" data-act="exit">‹ Kembali ke Beranda CLINED</button></div>
      <p class="fine">Game edukasi dengan kasus yang disederhanakan. Bukan pengganti pedoman klinis.</p></div>`;
    if (xpRes && xpRes.gained > 0) {
      E.end.querySelector('.igd-big')?.insertAdjacentHTML('afterend', `<p class="igd-xp-note">+${xpRes.gained} XP tercatat${rec.newIds.length ? ` · ${rec.newIds.length} kasus baru dikuasai` : ''}</p>`);
    }
    E.end.hidden = false; E.end.scrollTop = 0;
    S = null;
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
    saveActiveSession();
  };
  E.mat.addEventListener('click', markLine);

  root.addEventListener('click', e => {
    const f = e.target.closest('[data-ik]');
    if (f && S && S.inspect){ inspectClick(f); return; }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'exit'){ exitToHome(); return; }
    else if (a === 'resume') resumeSession();
    else if (a === 'discard'){ const sv = Session.read(); Session.clear(sv && sv.sid); S = null; renderNights(); }
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
    else if (a === 'mute'){
      const isMuted = Sfx.toggle();
      const txt = 'Suara: ' + (isMuted ? 'mati' : 'nyala');
      root.querySelectorAll('[data-act="mute"]').forEach(btn => { btn.textContent = txt; });
    }
    else if (a === 'clear'){
      if (!S || S.locked) return;
      root.querySelectorAll('.ln.hl').forEach(n => n.classList.remove('hl')); S.hl = null; syncHint(); saveActiveSession();
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
  function persistBeforeLeave(){
    pauseTimer();
    if (!playing || !S) return;
    const lastResolved = S.resolved && (S.lives <= 0 || S.i >= S.queue.length - 1);
    if (lastResolved) {
      finish();
    } else {
      saveActiveSession();
    }
  }
  function exitToHome(){
    onLeave();
    try { window.show?.('home', { force:true }); window.renderCounts?.(); } catch (e) {}
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
    FIT.update();
    showMenu();
  }
  function onLeave(){
    persistBeforeLeave();
    setPlaying(false);
    E.book.classList.remove('open');
    FIT.disable();
    try { document.body.classList.remove('quiz-context'); } catch {}
  }
  let playing = false;
  window.addEventListener('clined:sync-applied', () => { PROG = loadP(); renderNights(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pauseTimer();
      if (playing && S) saveActiveSession();
    } else if (isOpen() && playing && E.title.hidden && E.memo.hidden && E.end.hidden) {
      resumeTimer();
    }
  });
  window.addEventListener('pagehide', () => {
    pauseTimer();
    if (playing && S) saveActiveSession();
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
  window.CLINED_IGD = { open, Progress, Session, isPlaying: () => !!game?.isPlaying() };
})();
