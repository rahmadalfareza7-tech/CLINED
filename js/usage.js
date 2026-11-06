/* CLINED — statistik pemakaian anonim (klien) + panel "Statistik" untuk admin.
   Yang dikirim hanya hitungan: halaman yang dibuka, tombol fitur yang diketuk, dan halaman terakhir saat aplikasi ditutup/disembunyikan. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const OFF = 'clined_usage_off';
  const loggedIn = () => { try { return typeof authCurrentUser === 'function' && !!authCurrentUser(); } catch { return false; } };
  const off = () => { try { return localStorage.getItem(OFF) === '1'; } catch { return false; } };

  /* ───────── pencatatan ───────── */
  const CLICKS = [
    ['#startBtn', 'quiz_mulai'], ['[data-ml-start]', 'latihan_materi'], ['#smartReviewStartBtn', 'smart_review'], ['[data-ins-practice]', 'latih_soal_salah'],
    ['#flagBtn', 'tandai_soal'], ['#bookmarkBtn', 'simpan_soal'], ['#reportQBtn', 'lapor_soal'], ['[data-rq-send]', 'lapor_soal_kirim'],
    ['[data-soc-create], [data-soc-challenge]', 'duel_buat'], ['[data-soc-join], [data-soc-accept]', 'duel_gabung'],
    ['[data-stc-send]', 'status_kirim'], ['[data-soc-csend]', 'komentar_kirim'], ['[data-soc-react]', 'reaksi_status'], ['#shareStatusBtn', 'bagikan_status'],
    ['#glossaryBtn', 'glosarium_buka'], ['.gl-term', 'glosarium_istilah'], ['[data-sp-save]', 'atur_tanggal_ujian'], ['#duoCalBtn', 'kalender_buka']
  ];
  const Q = {}; let cur = '';
  const bump = k => { if (!off()) Q[k] = (Q[k] || 0) + 1; };
  const okId = id => typeof id === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(id);
  function flush(hide) {
    if (!loggedIn() || off()) { for (const k in Q) delete Q[k]; return; }
    const events = { ...Q }; if (!Object.keys(events).length && !hide) return;
    for (const k in Q) delete Q[k];
    const payload = JSON.stringify({ events, last: cur, hide: !!hide });
    try {
      if (hide && navigator.sendBeacon && navigator.sendBeacon('/api/usage', new Blob([payload], { type: 'application/json' }))) return;
      fetch('/api/usage', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
    } catch {}
  }
  document.addEventListener('click', e => { for (const [sel, name] of CLICKS) if (e.target.closest?.(sel)) { bump('act:' + name); break; } }, true);
  window.addEventListener('clined:view-change', e => { if (okId(e.detail)) { cur = e.detail; bump('view:' + cur); } });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(true); });
  window.addEventListener('pagehide', () => flush(true));
  setInterval(() => flush(false), 60_000);
  setTimeout(() => { const v = document.querySelector('.view.active')?.id; if (okId(v) && !cur) { cur = v; bump('view:' + v); } }, 1500);

  /* ───────── sakelar di Rencana Belajar → Pengaturan ───────── */
  function injectToggle() {
    const set = document.querySelector('#studyPlusBody .sp-settings'); if (!set || $('usageOn')) return;
    const row = document.createElement('label'); row.className = 'sp-switch usage-row';
    row.innerHTML = `<input type="checkbox" id="usageOn" ${off() ? '' : 'checked'}><span>Statistik pemakaian anonim <small>(bantu kami tahu fitur mana yang berguna)</small></span>`;
    set.querySelector('.sp-actions')?.before(row);
  }
  document.addEventListener('change', e => { if (e.target.id === 'usageOn') { try { e.target.checked ? localStorage.removeItem(OFF) : localStorage.setItem(OFF, '1'); } catch {} window.showToast?.(e.target.checked ? 'Statistik anonim dinyalakan' : 'Statistik anonim dimatikan'); } });
  window.addEventListener('clined:view-change', e => { if (e.detail === 'studyPlusPage') { setTimeout(injectToggle, 250); setTimeout(injectToggle, 900); } });

  /* ───────── panel admin ───────── */
  const VIEW_NAMES = { home: 'Beranda', quiz: 'Kuis', result: 'Hasil kuis', review: 'Tinjau jawaban', wrong: 'Sering salah', smartReview: 'Smart Review', clinicalDashboard: 'Clinical Dashboard', uabPage: 'UAB (daftar blok)', upiPage: 'UPI', materialsPage: 'Kumpulan Materi', materiLatihanPage: 'Latihan Materi', studyPlusPage: 'Rencana Belajar', userBankPage: 'Buat Soal', socialPage: 'Duel', duelPage: 'Ruang duel', hubPage: 'Sosial', glossaryPage: 'Glosarium', accountPage: 'Profil', achievementsPage: 'Pencapaian', bookmarks: 'Bookmark', history: 'Riwayat skor', analytics: 'Analitik', library: 'Bank soal', flashcards: 'Flashcard', clinicalQuestPage: 'Clinical Quest', leaderboardPage: 'Papan peringkat', studyTimerPage: 'Study Timer', studyTools: 'Study Lab' };
  const ACT_NAMES = { quiz_mulai: 'Mulai kuis', latihan_materi: 'Mulai Latihan Materi', smart_review: 'Mulai Smart Review', latih_soal_salah: 'Latih soal sering salah', tandai_soal: 'Tandai soal', simpan_soal: 'Simpan (bookmark) soal', lapor_soal: 'Buka lapor soal', lapor_soal_kirim: 'Kirim laporan soal', duel_buat: 'Buat/tantang duel', duel_gabung: 'Gabung duel', status_kirim: 'Kirim status', komentar_kirim: 'Kirim komentar', reaksi_status: 'Reaksi di status', bagikan_status: 'Bagikan status dari hasil kuis', glosarium_buka: 'Buka Glosarium', glosarium_istilah: 'Ketuk istilah glosarium', atur_tanggal_ujian: 'Simpan tanggal ujian', kalender_buka: 'Buka kalender ujian' };
  const nameOf = (map, k) => map[k] || k;
  const fmtDay = d => { const [y, m, dd] = d.split('-'); return `${+dd}/${+m}`; };

  function bars(items, max, cls = '') {
    return items.map(it => `<div class="us-row${cls}"><span class="us-name" title="${esc(it.label)}">${esc(it.label)}</span><span class="us-bar"><i style="width:${max ? Math.max(2, Math.round(it.n / max * 100)) : 0}%"></i></span><b>${it.n}</b></div>`).join('') || '<p class="muted">Belum ada data.</p>';
  }
  function render(d) {
    const day = new Map(d.dau.map(x => [x.day, x.n])), list = [];
    for (let i = d.days - 1; i >= 0; i--) { const t = new Date(d.today + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() - i); const k = t.toISOString().slice(0, 10); list.push({ day: k, n: day.get(k) || 0 }); }
    const maxD = Math.max(1, ...list.map(x => x.n)), thisW = d.wau.at(-1), prevW = d.wau.at(-2);
    const ev = { view: new Map(), act: new Map(), last: new Map() };
    for (const e of d.events) { const [t, ...r] = e.event.split(':'); ev[t]?.set(r.join(':'), e.n); }
    const top = m => [...m].sort((a, b) => b[1] - a[1]);
    const views = top(ev.view).slice(0, 12).map(([k, n]) => ({ label: nameOf(VIEW_NAMES, k), n }));
    const acts = top(ev.act).slice(0, 14).map(([k, n]) => ({ label: nameOf(ACT_NAMES, k), n }));
    const exits = top(ev.last).filter(([k]) => (ev.view.get(k) || 0) >= 20).map(([k, n]) => ({ k, n, pct: Math.round(n / ev.view.get(k) * 100) })).sort((a, b) => b.pct - a.pct).slice(0, 8);
    const totalViews = [...ev.view.values()].reduce((a, b) => a + b, 0);
    return `<div class="admin-content-intro"><b>Statistik pemakaian</b><span>Hitungan anonim, ${d.days} hari terakhir. Akun admin tidak dihitung.</span></div>
      <div class="us-kpis"><div><b>${list.at(-1).n}</b><span>aktif hari ini</span></div><div><b>${thisW ? thisW.n : 0}</b><span>aktif minggu ini</span></div><div><b>${prevW ? prevW.n : '—'}</b><span>minggu lalu</span></div><div><b>${totalViews}</b><span>halaman dibuka</span></div></div>
      <section class="us-sec"><h4>Mahasiswa aktif per hari</h4><div class="us-days">${list.map((x, i) => `<div title="${fmtDay(x.day)}: ${x.n}"><i style="height:${Math.max(3, Math.round(x.n / maxD * 100))}%"></i><small>${i % 7 === 0 || i === list.length - 1 ? fmtDay(x.day) : ''}</small></div>`).join('')}</div></section>
      <section class="us-sec"><h4>Aktif per minggu</h4>${bars(d.wau.map(w => ({ label: 'Mulai ' + fmtDay(w.week), n: w.n })), Math.max(1, ...d.wau.map(w => w.n)))}</section>
      <section class="us-sec"><h4>Halaman paling sering dibuka</h4>${bars(views, Math.max(1, ...views.map(v => v.n)))}</section>
      <section class="us-sec"><h4>Fitur yang diketuk</h4>${bars(acts, Math.max(1, ...acts.map(v => v.n)))}<p class="us-note">Menghitung ketukan tombol, bukan keberhasilan.</p></section>
      <section class="us-sec"><h4>Halaman terakhir sebelum aplikasi ditutup</h4>${exits.length ? exits.map(x => `<div class="us-row"><span class="us-name">${esc(nameOf(VIEW_NAMES, x.k))}</span><span class="us-bar warn"><i style="width:${Math.min(100, x.pct)}%"></i></span><b>${x.pct}%</b></div>`).join('') : '<p class="muted">Belum cukup data (butuh ≥ 20 kunjungan per halaman).</p>'}<p class="us-note">Perkiraan kasar: persentase kunjungan yang berakhir saat aplikasi disembunyikan atau ditutup. Berpindah ke aplikasi lain sebentar juga terhitung.</p></section>
      <p class="us-note">Privasi: yang tersimpan hanya hitungan dan kode acak per minggu, bukan ID akun, nama, atau jawaban. Kode itu tidak bisa ditautkan antar minggu, jadi retensi mingguan tidak dihitung. Mahasiswa bisa mematikannya di Rencana Belajar → Pengaturan.</p>`;
  }
  async function loadAdmin() {
    const p = document.querySelector('#adminContentWorkspace [data-content-panel="usage"]'); if (!p) return;
    p.innerHTML = '<p class="muted">Memuat…</p>';
    try {
      const r = await fetch('/api/admin/usage?days=28', { credentials: 'same-origin', cache: 'no-store' });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || `Gagal (${r.status})`);
      p.innerHTML = render(d);
    } catch (err) { p.innerHTML = `<p class="muted">${esc(err.message)}</p>`; }
  }
  document.addEventListener('click', e => { if (e.target.closest?.('[data-content-tab="usage"]')) setTimeout(loadAdmin, 60); });
  window.CLINED_USAGE = { flush, queue: () => ({ ...Q }), render };
})();
