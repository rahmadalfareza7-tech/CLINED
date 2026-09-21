/* CLINED landing: slider horizontal + demo kecil. Tanpa inline script agar cocok dengan CSP script-src 'self'. */
(() => {
  'use strict';

  // Tautan lama seperti clined.web.id/#accountPage adalah rute aplikasi: teruskan ke app.html.
  const toApp = () => location.replace('./app.html' + location.hash);
  if (location.hash.length > 1) { toApp(); return; }
  addEventListener('hashchange', () => { if (location.hash.length > 1) toApp(); });

  const AUTO_MS = 7000;      // jeda antar slide saat geser otomatis
  const RESUME_MS = 12000;   // geser otomatis lanjut lagi setelah pengguna berhenti berinteraksi
  const $ = (s, r = document) => r.querySelector(s);

  /* ---------- Tema (bagikan pilihan dengan aplikasi) ---------- */
  const root = document.documentElement;
  const themeBtn = $('#themeBtn');
  const THEME_KEY = 'gaster_v8_theme';
  const readTheme = () => {
    try {
      const raw = localStorage.getItem(THEME_KEY);
      if (raw) { try { return JSON.parse(raw); } catch { return raw; } }
    } catch {}
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };
  const applyTheme = (t) => {
    root.classList.toggle('dark', t === 'dark');
    if (themeBtn) themeBtn.textContent = t === 'dark' ? '☀️' : '🌙';
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#101412' : '#58cc02');
  };
  applyTheme(readTheme());
  themeBtn?.addEventListener('click', () => {
    const next = root.classList.contains('dark') ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, JSON.stringify(next)); } catch {}
  });

  /* ---------- Slider ---------- */
  const deck = $('#deck');
  if (!deck) return;
  const slides = [...deck.querySelectorAll('.slide')];
  const total = slides.length;
  const dotsHost = $('#dots');
  const prevBtn = $('#prev');
  const nextBtn = $('#next');
  const playBtn = $('#play');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  let index = 0;
  let autoTimer = 0;
  let resumeTimer = 0;
  let userPaused = reduceMotion.matches; // pengguna yang memilih jeda, atau sistem minta minim gerak
  let hovering = false;
  let interacting = false; // true selama jeda setelah pengguna menggeser atau menekan tombol

  deck.style.setProperty('--auto', AUTO_MS + 'ms');
  document.documentElement.style.setProperty('--auto', AUTO_MS + 'ms');

  // Titik navigasi
  const dots = slides.map((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'dot';
    b.setAttribute('aria-label', `Slide ${i + 1} dari ${total}: ${s.getAttribute('aria-label') || ''}`);
    b.addEventListener('click', () => { touched(); go(i); });
    dotsHost.appendChild(b);
    return b;
  });

  const width = () => deck.clientWidth || 1;

  function go(i) {
    const target = (i + total) % total;
    deck.scrollTo({ left: target * width(), behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    if (target !== index) setActive(target); // perbarui UI tanpa menunggu animasi scroll selesai
  }

  function setActive(i) {
    index = i;
    dots.forEach((d, k) => {
      if (k === i) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
    });
    slides.forEach((s, k) => s.toggleAttribute('data-active', k === i));
    schedule();
  }

  /* ---------- Geser otomatis ---------- */
  function stopProgress() { dots.forEach((d) => d.classList.remove('run')); }

  function schedule() {
    clearTimeout(autoTimer);
    stopProgress();
    if (userPaused || hovering || interacting || document.hidden) return;
    const d = dots[index];
    void d.offsetWidth;            // paksa reflow supaya animasi mulai dari awal
    d.classList.add('run');
    autoTimer = setTimeout(() => go(index + 1), AUTO_MS);
  }

  // Dipanggil setiap pengguna menggeser/menekan sesuatu: jeda sebentar, lalu lanjut sendiri.
  function touched() {
    interacting = true;
    clearTimeout(autoTimer);
    clearTimeout(resumeTimer);
    stopProgress();
    resumeTimer = setTimeout(() => { interacting = false; schedule(); }, RESUME_MS);
  }

  function setPaused(p) {
    userPaused = p;
    playBtn.setAttribute('aria-pressed', String(p));
    playBtn.setAttribute('aria-label', p ? 'Putar geser otomatis' : 'Jeda geser otomatis');
    playBtn.textContent = p ? '▶' : '❚❚';
    clearTimeout(resumeTimer);
    interacting = false;
    schedule();
  }

  playBtn.addEventListener('click', () => setPaused(!userPaused));
  prevBtn.addEventListener('click', () => { touched(); go(index - 1); });
  nextBtn.addEventListener('click', () => { touched(); go(index + 1); });
  document.querySelectorAll('[data-go-next]').forEach((b) => b.addEventListener('click', () => { touched(); go(index + 1); }));

  // Geser jari / trackpad / roda mouse horizontal
  ['touchstart', 'wheel'].forEach((ev) => deck.addEventListener(ev, touched, { passive: true }));
  deck.addEventListener('pointerdown', touched);

  // Posisi scroll -> slide aktif
  let raf = 0;
  deck.addEventListener('scroll', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const i = Math.max(0, Math.min(total - 1, Math.round(deck.scrollLeft / width())));
      if (i !== index) setActive(i);
    });
  }, { passive: true });

  // Jeda saat kursor di atas slide atau fokus ada di dalamnya
  deck.addEventListener('mouseenter', () => { hovering = true; clearTimeout(autoTimer); stopProgress(); });
  deck.addEventListener('mouseleave', () => { hovering = false; schedule(); });
  document.addEventListener('visibilitychange', schedule);

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowRight') { touched(); go(index + 1); }
    else if (e.key === 'ArrowLeft') { touched(); go(index - 1); }
  });

  // Seret dengan mouse (di layar sentuh sudah otomatis lewat scroll native)
  let drag = null;
  let justDragged = false;
  deck.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    if (e.target.closest('button,a,input,select,textarea')) return;
    drag = { x: e.clientX, left: deck.scrollLeft, moved: false };
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 6) { drag.moved = true; deck.classList.add('dragging'); }
    if (drag.moved) deck.scrollLeft = drag.left - dx;
  });
  const endDrag = () => {
    if (!drag) return;
    const d = drag; drag = null;
    if (!d.moved) return;
    deck.classList.remove('dragging');
    deck.classList.add('settling');               // tahan snap native sampai animasi ke slide tujuan selesai
    setTimeout(() => deck.classList.remove('settling'), 650);
    justDragged = true; setTimeout(() => { justDragged = false; }, 60);
    const delta = deck.scrollLeft - d.left;
    const step = Math.abs(delta) > width() * 0.12 ? Math.sign(delta) : 0;   // geser pendek sudah cukup pindah slide
    const from = Math.round(d.left / width());
    go(Math.max(0, Math.min(total - 1, from + step)));
  };
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  deck.addEventListener('click', (e) => { if (justDragged) { e.preventDefault(); e.stopPropagation(); } }, true);

  // Jaga posisi saat ukuran layar berubah
  let resizeTimer = 0;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => deck.scrollTo({ left: index * width(), behavior: 'auto' }), 80);
  });

  /* ---------- Demo: contoh soal ---------- */
  const opts = [...document.querySelectorAll('#quiz .opt')];
  const why = $('#quizWhy');
  const reset = $('#quizReset');
  opts.forEach((o) => o.addEventListener('click', () => {
    opts.forEach((x) => { x.disabled = true; if (x.dataset.correct) x.classList.add('is-correct'); });
    if (!o.dataset.correct) o.classList.add('is-wrong');
    why.textContent = o.dataset.why;
    why.hidden = false;
    reset.hidden = false;
  }));
  reset?.addEventListener('click', () => {
    opts.forEach((x) => { x.disabled = false; x.classList.remove('is-correct', 'is-wrong'); });
    why.hidden = true; reset.hidden = true;
  });

  /* ---------- Demo: flashcard ---------- */
  const flip = $('#flip');
  flip?.addEventListener('click', () => {
    const on = flip.classList.toggle('is-flipped');
    flip.setAttribute('aria-pressed', String(on));
  });

  /* ---------- Sudah login? ubah teks tombol ---------- */
  fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (!d || !d.user) return;
      document.querySelectorAll('[data-cta="start"]').forEach((a) => { a.textContent = 'Lanjut belajar'; });
      document.querySelectorAll('[data-cta="login"]').forEach((a) => { a.textContent = 'Buka aplikasi'; });
    })
    .catch(() => {});

  /* ---------- Mulai ---------- */
  setActive(0);
  setPaused(userPaused);
})();
