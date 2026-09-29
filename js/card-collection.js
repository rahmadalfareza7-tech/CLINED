/* CLINED Card Shop — gacha kartu organ.
   Ditulis ulang dari nol (v2, bebas bug lama). Aturan:
   - Semua gambar adalah file terpisah di assets/cards/, TIDAK ADA base64 ditanam di sini.
   - Semua state disimpan di localStorage per-perangkat (belum disinkron ke server).
   - FAB hanya tampil di halaman Beranda (class body.home-context) dan setelah login. */
(() => {
  'use strict';

  const KEY_DIA = 'clined_diamonds_v1';
  const KEY_CARDS = 'clined_collection_v1';
  const QUIZ_PER_DIAMOND = 5; // 1 diamond setiap N soal benar

  const CARD_CATALOG = [
    { id: 'pulmo', name: 'PULMO', rarity: 'common', color: '#00c9d4', fact: 'Menukar O2 dan CO2 tiap napas', strength: 'Napas', img: 'assets/cards/card-pulmo.png' },
    { id: 'cor', name: 'COR', rarity: 'rare', color: '#e8435a', fact: 'Berdetak ~100.000 kali sehari', strength: 'Sirkulasi', img: 'assets/cards/card-cor.png' },
    { id: 'cerebrum', name: 'CEREBRUM', rarity: 'epic', color: '#4ade80', fact: 'Pusat kendali seluruh tubuh', strength: 'Telekinesis', img: 'assets/cards/card-cerebrum.png' },
    { id: 'skull', name: 'SKULL', rarity: 'legendary', color: '#f5c97a', fact: 'Seperti helm perang alami', strength: 'Terkuat', img: 'assets/cards/card-skull.png' },
  ];
  const RARITY_LABEL = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' };
  const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary'];

  const isAdmin = () => { try { const u = typeof authCurrentUser === 'function' ? authCurrentUser() : null; return !!(u && u.role === 'admin'); } catch { return false; } };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const getDia = () => isAdmin() ? Infinity : (parseInt(localStorage.getItem(KEY_DIA) || '0', 10) || 0);
  const setDia = v => { if (!isAdmin()) localStorage.setItem(KEY_DIA, String(Math.max(0, v))); };
  const getCards = () => { try { return JSON.parse(localStorage.getItem(KEY_CARDS) || '[]'); } catch { return []; } };
  const addCard = card => { const c = getCards(); c.push({ id: card.id, at: Date.now() }); localStorage.setItem(KEY_CARDS, JSON.stringify(c)); };
  const ownedCount = id => getCards().filter(c => c.id === id).length;

  function updateDiaBadges() {
    const d = getDia(), text = d === Infinity ? '∞' : String(d);
    document.querySelectorAll('[data-diamond-count]').forEach(e => { e.textContent = text; });
  }
  function popDiamondToast() {
    const p = document.createElement('div');
    p.className = 'diamond-earn-pop';
    p.textContent = '💎 +1 Diamond!';
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1600);
  }

  /* Dapat diamond setiap N jawaban benar. Membungkus window.addXP kalau ada, tanpa memutus fungsi aslinya. */
  (function hookDiamondEarning() {
    let count = parseInt(sessionStorage.getItem('clined_qa_count') || '0', 10) || 0;
    const original = window.addXP;
    window.addXP = function (amount, reason) {
      if (typeof original === 'function') original.apply(this, arguments);
      const isCorrectAnswer = (typeof amount === 'number' && amount > 0) || (typeof reason === 'string' && reason.includes('benar'));
      if (!isCorrectAnswer) return;
      count++;
      sessionStorage.setItem('clined_qa_count', String(count));
      if (count % QUIZ_PER_DIAMOND === 0) { setDia(getDia() + 1); updateDiaBadges(); popDiamondToast(); }
    };
  })();

  /* Peluang: legendary 5%, epic 15%, rare 30%, sisanya common. */
  function rollCard() {
    const roll = Math.random() * 100;
    const tier = roll < 5 ? 'legendary' : roll < 20 ? 'epic' : roll < 50 ? 'rare' : 'common';
    const pool = CARD_CATALOG.filter(c => c.rarity === tier);
    return pool[Math.floor(Math.random() * pool.length)] || CARD_CATALOG[0];
  }
  function openPack() {
    const cost = 20;
    if (getDia() < cost) return null;
    setDia(getDia() - cost);
    const card = rollCard();
    addCard(card);
    return card;
  }

  function buildGrid() {
    const owned = getCards();
    return CARD_CATALOG.map(card => {
      const n = owned.filter(c => c.id === card.id).length;
      const cls = 'coll-card-slot rarity-' + card.rarity + (n ? '' : ' locked');
      return `<div class="${cls}" style="--card-color:${card.color}">
        <img src="${card.img}" alt="${esc(card.name)}" loading="lazy">
        <b>${esc(card.name)}</b>
        ${n ? `<small>x${n}</small>` : '<small>🔒</small>'}
      </div>`;
    }).join('');
  }

  function buildShop() {
    const d = getDia(), diaText = d === Infinity ? '∞' : d;
    const owned = getCards(), uniqueOwned = new Set(owned.map(c => c.id)).size;
    return `<div class="card-shop-sheet">
      <div class="card-shop-head">
        <div><span class="card-shop-eyebrow">CLINED CARDS</span><h3>Card Shop</h3><p>Kumpulkan semua kartu organ!</p></div>
        <button type="button" class="card-shop-close" id="closeCardShop" aria-label="Tutup">✕</button>
      </div>
      <div class="card-shop-dia-row">
        <span class="card-shop-dia-badge">💎 <b data-diamond-count>${diaText}</b></span>
        <span class="card-shop-dia-hint">+1 💎 setiap ${QUIZ_PER_DIAMOND} soal benar</span>
      </div>
      <div class="card-pack-card">
        <img class="card-pack-img" src="assets/cards/fab-basket.png" alt="Organ Pack">
        <div class="card-pack-info">
          <b>Organ Pack</b>
          <small>1 kartu acak • chance LEGENDARY!</small>
          <div class="card-rarity-odds">
            <span>Common 50%</span><span class="odd-rare">Rare 30%</span><span class="odd-epic">Epic 15%</span><span class="odd-legendary">Legendary 5%</span>
          </div>
        </div>
      </div>
      <button type="button" class="card-buy-btn" id="buyCardPack" ${d < 20 ? 'disabled' : ''}>💎 Buka Pack — 20</button>
      <div class="card-collection-head"><span>Koleksiku</span><b>${uniqueOwned} / ${CARD_CATALOG.length}</b></div>
      <div class="card-collection-grid">${buildGrid()}</div>
    </div>`;
  }

  /* Confetti ringan (div, bukan canvas) untuk kartu Epic/Legendary. Dibuang otomatis lewat animationend. */
  function burstConfetti(container, rarity) {
    const palettes = { epic: ['#a855f7', '#7c3aed', '#e9d5ff', '#c084fc'], legendary: ['#f5c97a', '#fbbf24', '#fff7cd', '#ffe08a'] };
    const colors = palettes[rarity]; if (!colors) return;
    const count = rarity === 'legendary' ? 46 : 28;
    const layer = document.createElement('div');
    layer.className = 'card-confetti-layer';
    for (let i = 0; i < count; i++) {
      const p = document.createElement('i');
      const angle = Math.random() * Math.PI * 2, dist = 70 + Math.random() * 140;
      p.style.setProperty('--dx', (Math.cos(angle) * dist).toFixed(0) + 'px');
      p.style.setProperty('--dy', (Math.sin(angle) * dist - 60).toFixed(0) + 'px');
      p.style.setProperty('--rot', (Math.random() * 720 - 360).toFixed(0) + 'deg');
      p.style.background = colors[i % colors.length];
      p.style.animationDelay = (Math.random() * 120) + 'ms';
      p.style.left = (46 + Math.random() * 8) + '%';
      layer.appendChild(p);
    }
    container.appendChild(layer);
    layer.addEventListener('animationend', () => layer.remove());
    setTimeout(() => layer.remove(), 1800);
  }

  function showReveal(card) {
    const ov = document.createElement('div');
    ov.className = 'card-reveal-overlay';
    const dup = ownedCount(card.id) > 1;
    ov.innerHTML = `<div class="card-result-wrap rarity-${card.rarity}" style="--rarity-color:${card.color}">
      <div class="card-reveal-rarity ${card.rarity}">${RARITY_LABEL[card.rarity]}</div>
      <img src="${card.img}" alt="${esc(card.name)}">
      <h4>${esc(card.name)}</h4>
      ${card.fact ? `<p>${esc(card.fact)}</p>` : ''}
      ${dup ? '<small class="card-dup-note">Sudah punya kartu ini sebelumnya</small>' : ''}
      <button type="button" class="ml-next" id="closeCardReveal">Lanjut</button>
    </div>`;
    document.body.appendChild(ov);
    requestAnimationFrame(() => {
      ov.classList.add('show');
      if (card.rarity === 'epic' || card.rarity === 'legendary') setTimeout(() => burstConfetti(ov.firstElementChild, card.rarity), 150);
    });
    const close = () => { ov.classList.remove('show'); setTimeout(() => ov.remove(), 200); };
    ov.querySelector('#closeCardReveal').addEventListener('click', close);
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
  }

  function refreshShop() {
    const c = document.getElementById('cardShopContainer');
    if (c) { c.innerHTML = buildShop(); bindShop(); }
  }
  function bindShop() {
    document.getElementById('closeCardShop')?.addEventListener('click', hideShop);
    document.getElementById('buyCardPack')?.addEventListener('click', () => {
      const card = openPack();
      if (!card) return;
      hideShop();
      showReveal(card);
    });
  }
  function blockScroll(e) { if (e.target.closest('.card-shop-sheet')) return; e.preventDefault(); }
  function showShop() {
    let modal = document.getElementById('cardShopModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'cardShopModal';
      modal.className = 'card-shop-modal';
      modal.innerHTML = '<div class="card-shop-backdrop" id="csBackdrop"></div><div id="cardShopContainer"></div>';
      document.body.appendChild(modal);
      document.getElementById('csBackdrop').addEventListener('click', hideShop);
    }
    refreshShop();
    requestAnimationFrame(() => modal.classList.add('open'));
    document.addEventListener('touchmove', blockScroll, { passive: false });
  }
  function hideShop() {
    document.getElementById('cardShopModal')?.classList.remove('open');
    document.removeEventListener('touchmove', blockScroll);
  }

  /* FAB draggable vertikal, hanya tampil kalau body.home-context (lihat syncHomeContext di bawah). */
  function createFab() {
    if (document.getElementById('cardShopFab')) return;
    const fab = document.createElement('button');
    fab.id = 'cardShopFab';
    fab.className = 'card-shop-fab';
    fab.setAttribute('aria-label', 'Card Shop');
    fab.innerHTML = `<img class="fab-basket-img" src="assets/cards/fab-basket.png" alt="">
      <span class="fab-dia"><span data-diamond-count>${getDia() === Infinity ? '∞' : getDia()}</span> 💎</span>`;
    document.body.appendChild(fab);

    let dragging = false, moved = false, startX = 0, startY = 0, fabX = 0, fabY = 0;
    const start = (x, y) => { dragging = true; moved = false; const r = fab.getBoundingClientRect(); fabX = r.left; fabY = r.top; startX = x; startY = y; fab.style.transition = 'none'; };
    const move = (x, y) => {
      if (!dragging) return;
      const dx = x - startX, dy = y - startY;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved = true;
      const nx = Math.min(Math.max(8, fabX + dx), window.innerWidth - fab.offsetWidth - 8);
      const ny = Math.min(Math.max(8, fabY + dy), window.innerHeight - fab.offsetHeight - 8);
      fab.style.left = nx + 'px'; fab.style.top = ny + 'px'; fab.style.right = 'auto';
    };
    const end = () => {
      if (!dragging) return;
      dragging = false;
      fab.style.transition = '';
      const r = fab.getBoundingClientRect();
      const snapLeft = r.left + r.width / 2 < window.innerWidth / 2;
      fab.style.left = snapLeft ? '14px' : (window.innerWidth - r.width - 14) + 'px';
      setTimeout(() => { moved = false; }, 60);
    };
    fab.addEventListener('touchstart', e => start(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    fab.addEventListener('touchmove', e => { move(e.touches[0].clientX, e.touches[0].clientY); if (moved) e.preventDefault(); }, { passive: false });
    fab.addEventListener('touchend', end, { passive: true });
    fab.addEventListener('mousedown', e => { if (e.button === 0) start(e.clientX, e.clientY); });
    document.addEventListener('mousemove', e => { if (dragging) move(e.clientX, e.clientY); });
    document.addEventListener('mouseup', () => { if (dragging) end(); });
    fab.addEventListener('click', e => { if (moved) { e.stopPropagation(); return; } showShop(); });
  }

  /* Sinkron visibilitas dengan halaman aktif: FAB & sel Diamond di Beranda hanya tampak
     kalau home-context aktif dan user sudah login (bukan auth-pending). */
  function syncHomeContext() {
    const b = document.body;
    const visible = b.classList.contains('home-context') && !b.classList.contains('auth-pending');
    document.getElementById('cardShopFab')?.classList.toggle('is-visible', visible);
  }
  function watchHomeContext() {
    syncHomeContext();
    new MutationObserver(syncHomeContext).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  function injectDiamondStatCell() {
    const items = document.querySelectorAll('.duo-reward-item');
    if (items.length < 4) return;
    items[3].innerHTML = `<span class="duo-reward-icon">💎</span><div><b data-diamond-count>${getDia() === Infinity ? '∞' : getDia()}</b><small>Diamond</small></div>`;
  }

  /* Saat data disinkron dari perangkat lain (login di HP lalu buka di laptop, dsb.),
     localStorage berubah lewat jalur yang tidak lewat UI ini, jadi badge & grid perlu di-refresh manual. */
  function onExternalSync() {
    updateDiaBadges();
    injectDiamondStatCell();
    if (document.getElementById('cardShopModal')?.classList.contains('open')) refreshShop();
  }

  function boot() {
    createFab();
    watchHomeContext();
    injectDiamondStatCell();
    updateDiaBadges();
    window.addEventListener('clined:sync-applied', onExternalSync);
    window.addEventListener('clined:auth-ready', () => setTimeout(onExternalSync, 600));
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();

  window.CLINED_CARD_SHOP = { show: showShop, hide: hideShop };
})();
