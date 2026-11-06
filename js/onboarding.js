/* Tutorial singkat 9 langkah untuk pengguna baru. Tampil sekali per akun (flag tersinkron), bisa diulang dari Rencana Belajar. */
(() => {
  'use strict';
  const KEY = 'clined_onboarding_v2';
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const STEPS = [
    { sel: '.duo-reward-strip', icon: '🔥', title: 'Ringkasan belajarmu',
      text: 'Streak = hari berturut-turut kamu belajar (kerjakan 5 soal sehari). Semua soal yang kamu kerjakan memberi XP. Diamond untuk beli kartu. Ketuk 📅 untuk kalender ujian dan Rencana Belajar.' },
    { sel: '.player-card', icon: '📈', title: 'Clinical Progress',
      text: 'Setiap soal yang kamu kerjakan memberi XP (benar lebih banyak) dan menaikkan level. Makin sering berlatih, makin cepat naik level.' },
    { sel: '#dailyHomeCard', icon: '🎯', title: 'Misi hari ini',
      text: 'Target harian 20 soal. Bar terisi setiap kamu menjawab. Konsisten tiap hari lebih baik daripada maraton.' },
    { sel: '#examLauncher', icon: '📚', title: 'Pilih ujian lalu blok',
      text: 'Ketuk UAB atau UPI, lalu pilih blok. Di dalam blok ada kuis dan tombol LATIHAN MATERI untuk berlatih per materi dengan pembahasan tiap pilihan.' },
    { sel: '#homeQuickRow', icon: '✍️', title: 'Materi, Buat Soal, Duel, dan Sosial',
      text: 'Materi berisi bahan belajar per blok. Buat Soal untuk soalmu sendiri. Duel untuk adu soal dengan teman (ada batas waktu per soal). Sosial untuk teman dan status: bagikan kesan setelah ujian. Status terlihat oleh semua pengguna.' },
    { sel: '.card-shop-fab', icon: '🧺', title: 'Toko kartu',
      text: 'Tukar diamond dengan kartu koleksi lewat keranjang ungu. Tombolnya bisa digeser ke mana saja kalau menutupi tampilan.' },
    { sel: '#menuSectionContent', icon: '🗂️', title: 'Menu belajar',
      text: 'Soal Bookmark, Riwayat Skor, Soal yang Sering Salah, Latihan Soal Salah, Smart Review, Analitik, Papan Peringkat, Study Timer, dan Rencana Belajar ada di sini.' },
    { sel: '#floatingDashboardNav', icon: '🧭', title: 'Navigasi bawah',
      text: 'Beranda, Dashboard klinis, UAB untuk memilih blok, Status untuk berbagi kesan, dan Profil untuk akun serta backup data. Clinical Quest ada di Menu.' },
    { sel: null, icon: '💡', title: 'Saat mengerjakan soal',
      text: 'Pilih jawaban lalu baca pembahasannya. Ketuk ☆ Simpan untuk bookmark dan ⚑ Tandai soal untuk soal yang perlu ditinjau. Tutorial ini bisa diulang dari Rencana Belajar.' }
  ];
  let layer = null, idx = 0, steps = [];

  const done = () => { try { return !!localStorage.getItem(KEY); } catch { return true; } };
  const mark = () => { try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now() })); } catch {} };
  const visible = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4 && getComputedStyle(el).visibility !== 'hidden'; };
  const find = sel => !sel ? null : sel.split(',').map(s => document.querySelector(s.trim())).find(visible) || null;

  function close(finished) {
    layer?.remove(); layer = null;
    window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true);
    if (finished !== 'preview') mark();
  }

  function place() {
    if (!layer) return;
    const st = steps[idx], el = find(st.sel), hole = layer.querySelector('.ob-hole'), sheet = layer.querySelector('.ob-sheet');
    if (!el) { hole.style.display = 'none'; sheet.classList.remove('top'); return; }
    const r = el.getBoundingClientRect(), pad = 6;
    Object.assign(hole.style, { display: 'block', top: (r.top - pad) + 'px', left: (r.left - pad) + 'px', width: (r.width + pad * 2) + 'px', height: (r.height + pad * 2) + 'px' });
    sheet.classList.toggle('top', r.top + r.height / 2 > innerHeight * 0.55);   // target di bawah -> kartu di atas
  }

  function render() {
    const st = steps[idx], last = idx === steps.length - 1;
    layer.innerHTML = `<div class="ob-hole"></div>
      <div class="ob-sheet" role="dialog" aria-modal="true" aria-label="Tutorial">
        <div class="ob-step"><span class="ob-ico">${st.icon}</span><div><b>${esc(st.title)}</b><p>${esc(st.text)}</p></div></div>
        <div class="ob-foot">
          <div class="ob-dots">${steps.map((_, i) => `<i class="${i === idx ? 'on' : ''}"></i>`).join('')}</div>
          ${idx > 0 ? '<button type="button" class="ob-skip ob-prev" data-ob-prev aria-label="Langkah sebelumnya">‹ Kembali</button>' : ''}<button type="button" class="ob-skip" data-ob-skip>${last ? '' : 'Lewati'}</button>
          <button type="button" class="primary ob-next" data-ob-next>${last ? 'Mulai belajar' : 'Lanjut'}</button>
        </div></div>`;
    const el = find(st.sel);
    if (el) { const r = el.getBoundingClientRect(); if (r.top < 70 || r.bottom > innerHeight - 70) el.scrollIntoView({ block: 'center', behavior: 'auto' }); }
    place();
  }

  function start(force) {
    if (layer) return;
    if (!force && done()) return;
    if (!$('home')?.classList.contains('active')) return;
    steps = STEPS.filter(s => !s.sel || find(s.sel));
    if (!steps.length) return;
    idx = 0;
    layer = document.createElement('div'); layer.id = 'obLayer'; layer.className = 'ob-layer';
    document.body.appendChild(layer);
    layer.addEventListener('click', e => {
      if (e.target.closest('[data-ob-skip]')) return close(force ? 'preview' : true);
      if (e.target.closest('[data-ob-prev]')) { if (idx > 0) { idx--; render(); } return; }
      if (e.target.closest('[data-ob-next]')) { if (idx >= steps.length - 1) return close(force ? 'preview' : true); idx++; render(); }
    });
    window.addEventListener('resize', place); window.addEventListener('scroll', place, true);
    render();
  }

  const loggedIn = () => { try { return typeof authServerUser !== 'undefined' && !!authServerUser; } catch { return false; } };
  const modalOpen = () => [...document.querySelectorAll('.account-modal, #accountModal, #authModal')].some(m => visible(m) && !m.hidden);
  function maybeStart() { if (!done() && loggedIn() && !modalOpen()) start(false); }

  window.addEventListener('clined:view-change', e => { if (e.detail === 'home') setTimeout(maybeStart, 900); });
  let tries = 0; const t = setInterval(() => { if (done() || ++tries > 40) return clearInterval(t); maybeStart(); }, 1500);

  window.CLINED_ONBOARDING = { start: () => start(true), reset: () => { try { localStorage.removeItem(KEY); } catch {} } };
})();
