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
    // Common (7 kartu)
    { id: 'pulmo',      name: 'PULMO',      rarity: 'common',    color: '#00c9d4', fact: 'Menukar O2 dan CO2 tiap napas (Built-in AC)',              strength: 'Hurricane',     img: 'assets/cards/card-pulmo.png' },
    { id: 'gaster',     name: 'GASTER',     rarity: 'common',    color: '#f97316', fact: 'Asam lambung pH 1.5–2 mampu melebur makanan',               strength: 'Acid Melt',     img: 'assets/cards/card-gaster.png' },
    { id: 'intestinum', name: 'INTESTINUM', rarity: 'common',    color: '#ec4899', fact: 'Panjang lekukan usus mencapai ~7 meter',                    strength: 'Super Absorb',  img: 'assets/cards/card-intestinum.png' },
    { id: 'vesica',     name: 'VESICA',     rarity: 'common',    color: '#0ea5e9', fact: 'Kandung kemih elastis penampung hingga 500 ml',             strength: 'Hydro Burst',   img: 'assets/cards/card-vesica.png' },
    { id: 'auris',      name: 'AURIS',      rarity: 'common',    color: '#0d9488', fact: 'Rumah bagi tulang terkecil tubuh (stapes) & koklea',       strength: 'Sonic Wave',    img: 'assets/cards/card-auris.png' },
    { id: 'thyroidea',  name: 'THYROIDEA',  rarity: 'common',    color: '#e11d48', fact: 'Kelenjar kupu-kupu pengatur suhu & metabolisme tubuh',     strength: 'Turbo Boost',   img: 'assets/cards/card-thyroidea.png' },
    { id: 'cutis',      name: 'CUTIS',      rarity: 'common',    color: '#ea580c', fact: 'Organ terluas & terberat pelindung seluruh tubuh',          strength: 'Armor Shield',  img: 'assets/cards/card-cutis.png' },
    // Rare (6 kartu)
    { id: 'cor',        name: 'COR',        rarity: 'rare',      color: '#e8435a', fact: 'Berdetak ~100.000 kali sehari tanpa henti',                 strength: 'Marathoner',    img: 'assets/cards/card-cor.png' },
    { id: 'hepar',      name: 'HEPAR',      rarity: 'rare',      color: '#d97706', fact: 'Satu-satunya organ dalam yang bisa beregenerasi utuh',      strength: 'Detox Shield',  img: 'assets/cards/card-hepar.png' },
    { id: 'pancreas',   name: 'PANCREAS',   rarity: 'rare',      color: '#eab308', fact: 'Penghasil insulin pengatur gula darah & enzim cerna',       strength: 'Sugar Balance', img: 'assets/cards/card-pancreas.png' },
    { id: 'ren',        name: 'REN',        rarity: 'rare',      color: '#9333ea', fact: 'Sepasang ginjal menyaring ~180 liter cairan sehari',        strength: 'Ultra Filter',  img: 'assets/cards/card-ren.png' },
    { id: 'costae',     name: 'COSTAE',     rarity: 'rare',      color: '#3b82f6', fact: '12 pasang tulang rusuk pelindung jantung & paru',           strength: 'Iron Cage',     img: 'assets/cards/card-costae.png' },
    { id: 'vertebra',   name: 'VERTEBRA',   rarity: 'rare',      color: '#10b981', fact: '33 ruas tulang belakang penyangga postur & medula',         strength: 'Pillar Force',  img: 'assets/cards/card-vertebra.png' },
    // Epic (5 kartu)
    { id: 'cerebrum',   name: 'CEREBRUM',   rarity: 'epic',      color: '#4ade80', fact: 'Pusat kendali seluruh tubuh dengan ~86 miliar neuron',     strength: 'Telekinesis',   img: 'assets/cards/card-cerebrum.png' },
    { id: 'oculus',     name: 'OCULUS',     rarity: 'epic',      color: '#4f46e5', fact: 'Resolusi setara 576 Megapiksel & 10 juta warna',            strength: 'Laser Vision',  img: 'assets/cards/card-oculus.png' },
    { id: 'splen',      name: 'SPLEN',      rarity: 'epic',      color: '#be185d', fact: 'Markas daur ulang eritrosit & cadangan sistem imun',        strength: 'Blood Guard',   img: 'assets/cards/card-splen.png' },
    { id: 'uterus',     name: 'UTERUS',     rarity: 'epic',      color: '#db2777', fact: 'Organ otot super elastis tempat tumbuh kehidupan baru',     strength: 'Life Cradle',   img: 'assets/cards/card-uterus.png' },
    { id: 'neuron',     name: 'NEURON',     rarity: 'epic',      color: '#0284c7', fact: 'Menghantarkan sinyal listrik dengan kecepatan 400 km/jam',  strength: 'Thunder Bolt',  img: 'assets/cards/card-neuron.png' },
    // Legendary (2 kartu)
    { id: 'skull',      name: 'SKULL',      rarity: 'legendary', color: '#f5c97a', fact: 'Helm perang alami terkuat pelindung otak',                  strength: 'Strongest',     img: 'assets/cards/card-skull.png' },
    { id: 'leukocytus', name: 'LEUKOCYTUS', rarity: 'legendary', color: '#7c3aed', fact: 'Pasukan elit pembasmi bakteri, virus & patogen berbahaya',  strength: 'Immunity Max',  img: 'assets/cards/card-leukocytus.png' },
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
    const admin = isAdmin();
    return CARD_CATALOG.map(card => {
      const n = owned.filter(c => c.id === card.id).length;
      const unlocked = n > 0 || admin;
      const cls = 'coll-card-slot rarity-' + card.rarity + (unlocked ? ' is-unlocked' : ' locked');
      return `<div class="${cls}" style="--card-color:${card.color}" ${unlocked ? `data-preview-card="${esc(card.id)}" role="button" tabindex="0" title="Ketuk untuk melihat kartu ${esc(card.name)}"` : ''}>
        <img src="${card.img}" alt="${esc(card.name)}" loading="lazy">
        <b>${esc(card.name)}</b>
        ${n ? `<small>x${n}</small>` : (admin ? '<small>👑</small>' : '<small>🔒</small>')}
      </div>`;
    }).join('');
  }

  function buildShop() {
    const d = getDia(), diaText = d === Infinity ? '∞' : d;
    const owned = getCards(), uniqueOwned = new Set(owned.map(c => c.id)).size;
    return `<div class="card-shop-sheet">
      <div class="card-shop-head">
        <div><span class="card-shop-eyebrow">CLINED CARDS</span><h3>Card Shop</h3><p>Kumpulkan ${CARD_CATALOG.length} variasi kartu organ &amp; anatomi!</p></div>
        <button type="button" class="card-shop-close" id="closeCardShop" aria-label="Tutup">✕</button>
      </div>
      <div class="card-shop-dia-row">
        <span class="card-shop-dia-badge">💎 <b data-diamond-count>${diaText}</b></span>
        <span class="card-shop-dia-hint">+1 💎 setiap ${QUIZ_PER_DIAMOND} soal benar</span>
      </div>
      <div class="card-pack-card">
        <img class="card-pack-img" src="assets/cards/fab-basket.png" alt="Organ Pack">
        <div class="card-pack-info">
          <b>Organ Pack (${CARD_CATALOG.length} Seri Kartu)</b>
          <small>1 kartu acak • Ketuk kartu milikmu untuk perbesar!</small>
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
    ov.className = 'pack-open-overlay';
    const dup = ownedCount(card.id) > 1;
    ov.innerHTML = `<div class="pack-open-stage rarity-${card.rarity}" style="--rarity-color:${card.color}">
      <button type="button" class="pack-tap" id="packTapZone" aria-label="Ketuk untuk membuka pack">
        <img class="pack-open-img" src="assets/cards/fab-basket.png" alt="">
        <span class="pack-tap-hint">Ketuk untuk membuka</span>
      </button>
      <div class="pack-flash"></div>
      <div class="pack-card-flip">
        <div class="pack-card-rays"></div>
        <div class="pack-card-inner">
          <div class="pack-card-back">
            <span class="pack-card-back-mark">CLINED</span>
            <span class="pack-card-back-sub">CARDS</span>
          </div>
          <div class="pack-card-front"><img src="${card.img}" alt="${esc(card.name)}"></div>
        </div>
      </div>
      <div class="pack-result-info">
        <div class="card-reveal-rarity ${card.rarity}">${RARITY_LABEL[card.rarity]}</div>
        <h4>${esc(card.name)}</h4>
        ${card.fact ? `<p>${esc(card.fact)}</p>` : ''}
        ${dup ? '<small class="card-dup-note">Sudah punya kartu ini sebelumnya</small>' : ''}
        <button type="button" class="ml-next" id="closeCardReveal">Lanjut</button>
      </div>
    </div>`;
    document.body.appendChild(ov);
    console.log("[GACHA DEBUG] showReveal appended", ov, "class=", ov.className, "z=", getComputedStyle(ov).zIndex, "opacity=", getComputedStyle(ov).opacity);
    requestAnimationFrame(() => ov.classList.add('show'));

    const stage = ov.querySelector('.pack-open-stage');
    const open = () => {
      if (stage.classList.contains('phase-burst')) return; // cegah tap dobel
      stage.classList.add('phase-burst');
      setTimeout(() => {
        stage.classList.add('phase-flip');
        setTimeout(() => {
          stage.classList.add('phase-reveal');
          if (card.rarity === 'epic' || card.rarity === 'legendary') burstConfetti(stage, card.rarity);
        }, 620);
      }, 480);
    };
    ov.querySelector('#packTapZone').addEventListener('click', open);
    setTimeout(open, 2600); // auto-buka kalau user tidak tap, biar tidak nyangkut

  const close = () => { ov.classList.remove('show'); setTimeout(() => ov.remove(), 200); };
    ov.querySelector('#closeCardReveal').addEventListener('click', close);
    ov.addEventListener('click', e => { if (e.target === ov && stage.classList.contains('phase-reveal')) close(); });
  }

  function showCardPreview(card) {
    if (!card) return;
    document.querySelector('.card-preview-overlay')?.remove();
    const n = ownedCount(card.id);
    const ov = document.createElement('div');
    ov.className = 'pack-open-overlay card-preview-overlay show';
    ov.innerHTML = `<div class="pack-open-stage phase-reveal rarity-${card.rarity}" style="--rarity-color:${card.color}">
      <div class="pack-card-flip">
        <div class="pack-card-rays"></div>
        <div class="pack-card-inner">
          <div class="pack-card-front"><img src="${card.img}" alt="${esc(card.name)}"></div>
        </div>
      </div>
      <div class="pack-result-info">
        <div class="card-reveal-rarity ${card.rarity}">${RARITY_LABEL[card.rarity]}</div>
        <h4>${esc(card.name)}</h4>
        ${card.fact ? `<p>${esc(card.fact)}</p>` : ''}
        <small class="card-dup-note">⚡ Strength: <b>${esc(card.strength || '-')}</b> • Dimiliki: <b>x${n}</b></small>
        <button type="button" class="ml-next" id="closeCardPreview">Tutup</button>
      </div>
    </div>`;
    document.body.appendChild(ov);
    const close = () => { ov.classList.remove('show'); setTimeout(() => ov.remove(), 180); };
    ov.querySelector('#closeCardPreview')?.addEventListener('click', close);
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
  }

  function refreshShop() {
    const c = document.getElementById('cardShopContainer');
    if (c) { c.innerHTML = buildShop(); bindShop(); }
  }
  function bindShop() {
    document.getElementById('closeCardShop')?.addEventListener('click', hideShop);
    document.getElementById('buyCardPack')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const card = openPack();
      if (!card) return;
      hideShop();
      showReveal(card);
    });
    document.querySelectorAll('#cardShopContainer [data-preview-card]').forEach(el => {
      el.addEventListener('click', () => {
        const cid = el.getAttribute('data-preview-card');
        const card = CARD_CATALOG.find(c => c.id === cid);
        if (card) showCardPreview(card);
      });
    });
  }
  function blockScroll(e) { e.preventDefault(); }
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
    document.getElementById('floatingDashboardNav')?.style.setProperty('display','none','important');
    requestAnimationFrame(() => modal.classList.add('open'));
    document.addEventListener('touchmove', blockScroll, { passive: false });
  }
  function hideShop() {
    document.getElementById('cardShopModal')?.classList.remove('open');
    document.getElementById('floatingDashboardNav')?.style.removeProperty('display');
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
      fab.style.left = nx + 'px'; fab.style.top = ny + 'px'; fab.style.right = 'auto'; fab.style.bottom = 'auto';
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
    const activeView = document.querySelector('.view.active');
    const visible = activeView?.id === 'home' &&
      !b.classList.contains('auth-pending') &&
      !b.classList.contains('quiz-context');
    document.getElementById('cardShopFab')?.classList.toggle('is-visible', visible);
  }
  window.addEventListener("clined:view-change", syncHomeContext);
  function watchHomeContext() {
    syncHomeContext();
    new MutationObserver(syncHomeContext).observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
      subtree: true
    });
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

/* v71: FAB memudar saat scroll */
(function(){
  let t=null;
  window.addEventListener('scroll',function(){
    const f=document.querySelector('.card-shop-fab'); if(!f) return;
    f.classList.add('fab-idle'); clearTimeout(t); t=setTimeout(function(){f.classList.remove('fab-idle');},700);
  },{passive:true});
})();
