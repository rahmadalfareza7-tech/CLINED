/* CLINED Card Shop — gacha kartu organ + Kartu Andalan (Showcase) + Star-Up & Hologram Foil (★1–★5).
   Aturan:
   - Semua gambar adalah file terpisah di assets/cards/, TIDAK ADA base64 ditanam di sini.
   - State disimpan di localStorage dengan prefix clined_ (otomatis tersinkron lewat online-sync.js).
   - FAB hanya tampil di halaman Beranda (class body.home-context) dan setelah login. */
(() => {
  'use strict';

  const KEY_DIA = 'clined_diamonds_v1';
  const KEY_CARDS = 'clined_collection_v1';
  const KEY_EQUIP = 'clined_equipped_card_v1';
  const KEY_STARS = 'clined_card_stars_v1';
  const BASE_QUIZ_PER_DIAMOND = 5;
  const BASE_PACK_COST = 20;

  // Threshold jumlah duplikat untuk naik bintang otomatis: ★1=1, ★2=2, ★3=4, ★4=7, ★5=10
  const STAR_COPY_THRESHOLDS = [1, 2, 4, 7, 10];
  // Biaya upgrade bintang instan via Diamond (untuk naik ke ★2, ★3, ★4, ★5)
  const STAR_UPGRADE_COST = { 2: 12, 3: 20, 4: 30, 5: 45 };

  const CARD_CATALOG = [
    // Common (7 kartu) — Fokus Pasif: Bonus XP Latihan Soal & Resep
    { id: 'pulmo',      name: 'PULMO',      rarity: 'common',    color: '#00c9d4', fact: 'Menukar O2 dan CO2 tiap napas (Built-in AC)',              strength: 'Hurricane',     buffType: 'quiz_xp',   buffBase: 2, img: 'assets/cards/card-pulmo.png' },
    { id: 'gaster',     name: 'GASTER',     rarity: 'common',    color: '#f97316', fact: 'Asam lambung pH 1.5–2 mampu melebur makanan',               strength: 'Acid Melt',     buffType: 'quiz_xp',   buffBase: 2, img: 'assets/cards/card-gaster.png' },
    { id: 'intestinum', name: 'INTESTINUM', rarity: 'common',    color: '#ec4899', fact: 'Panjang lekukan usus mencapai ~7 meter',                    strength: 'Super Absorb',  buffType: 'quiz_xp',   buffBase: 2, img: 'assets/cards/card-intestinum.png' },
    { id: 'vesica',     name: 'VESICA',     rarity: 'common',    color: '#0ea5e9', fact: 'Kandung kemih elastis penampung hingga 500 ml',             strength: 'Hydro Burst',   buffType: 'quiz_xp',   buffBase: 2, img: 'assets/cards/card-vesica.png' },
    { id: 'auris',      name: 'AURIS',      rarity: 'common',    color: '#0d9488', fact: 'Rumah bagi tulang terkecil tubuh (stapes) & koklea',       strength: 'Sonic Wave',    buffType: 'quiz_xp',   buffBase: 2, img: 'assets/cards/card-auris.png' },
    { id: 'thyroidea',  name: 'THYROIDEA',  rarity: 'common',    color: '#e11d48', fact: 'Kelenjar kupu-kupu pengatur suhu & metabolisme tubuh',     strength: 'Turbo Boost',   buffType: 'quiz_xp',   buffBase: 2, img: 'assets/cards/card-thyroidea.png' },
    { id: 'cutis',      name: 'CUTIS',      rarity: 'common',    color: '#ea580c', fact: 'Organ terluas & terberat pelindung seluruh tubuh',          strength: 'Armor Shield',  buffType: 'quiz_xp',   buffBase: 2, img: 'assets/cards/card-cutis.png' },
    // Rare (6 kartu) — Fokus Pasif: Diskon Gacha Pack + Bonus XP Duel
    { id: 'cor',        name: 'COR',        rarity: 'rare',      color: '#e8435a', fact: 'Berdetak ~100.000 kali sehari tanpa henti',                 strength: 'Marathoner',    buffType: 'pack_disc', buffBase: 1, img: 'assets/cards/card-cor.png' },
    { id: 'hepar',      name: 'HEPAR',      rarity: 'rare',      color: '#d97706', fact: 'Satu-satunya organ dalam yang bisa beregenerasi utuh',      strength: 'Detox Shield',  buffType: 'pack_disc', buffBase: 1, img: 'assets/cards/card-hepar.png' },
    { id: 'pancreas',   name: 'PANCREAS',   rarity: 'rare',      color: '#eab308', fact: 'Penghasil insulin pengatur gula darah & enzim cerna',       strength: 'Sugar Balance', buffType: 'pack_disc', buffBase: 1, img: 'assets/cards/card-pancreas.png' },
    { id: 'ren',        name: 'REN',        rarity: 'rare',      color: '#9333ea', fact: 'Sepasang ginjal menyaring ~180 liter cairan sehari',        strength: 'Ultra Filter',  buffType: 'pack_disc', buffBase: 1, img: 'assets/cards/card-ren.png' },
    { id: 'costae',     name: 'COSTAE',     rarity: 'rare',      color: '#3b82f6', fact: '12 pasang tulang rusuk pelindung jantung & paru',           strength: 'Iron Cage',     buffType: 'duel_xp',   buffBase: 6, img: 'assets/cards/card-costae.png' },
    { id: 'vertebra',   name: 'VERTEBRA',   rarity: 'rare',      color: '#10b981', fact: '33 ruas tulang belakang penyangga postur & medula',         strength: 'Pillar Force',  buffType: 'duel_xp',   buffBase: 6, img: 'assets/cards/card-vertebra.png' },
    // Epic (5 kartu) — Fokus Pasif: Hybrid XP Soal + Booster Arena Duel
    { id: 'cerebrum',   name: 'CEREBRUM',   rarity: 'epic',      color: '#4ade80', fact: 'Pusat kendali seluruh tubuh dengan ~86 miliar neuron',     strength: 'Telekinesis',   buffType: 'epic_mind', buffBase: 3, img: 'assets/cards/card-cerebrum.png' },
    { id: 'oculus',     name: 'OCULUS',     rarity: 'epic',      color: '#4f46e5', fact: 'Resolusi setara 576 Megapiksel & 10 juta warna',            strength: 'Laser Vision',  buffType: 'epic_mind', buffBase: 3, img: 'assets/cards/card-oculus.png' },
    { id: 'splen',      name: 'SPLEN',      rarity: 'epic',      color: '#be185d', fact: 'Markas daur ulang eritrosit & cadangan sistem imun',        strength: 'Blood Guard',   buffType: 'duel_xp',   buffBase: 8, img: 'assets/cards/card-splen.png' },
    { id: 'uterus',     name: 'UTERUS',     rarity: 'epic',      color: '#db2777', fact: 'Organ otot super elastis tempat tumbuh kehidupan baru',     strength: 'Life Cradle',   buffType: 'epic_mind', buffBase: 3, img: 'assets/cards/card-uterus.png' },
    { id: 'neuron',     name: 'NEURON',     rarity: 'epic',      color: '#0284c7', fact: 'Menghantarkan sinyal listrik dengan kecepatan 400 km/jam',  strength: 'Thunder Bolt',  buffType: 'epic_mind', buffBase: 3, img: 'assets/cards/card-neuron.png' },
    // Legendary (2 kartu) — Fokus Pasif: All-in-One Supreme Aura (XP Soal + Duel Win + Diskon Pack + Fast Diamond)
    { id: 'skull',      name: 'SKULL',      rarity: 'legendary', color: '#f5c97a', fact: 'Helm perang alami terkuat pelindung otak',                  strength: 'Strongest',     buffType: 'mythic_all', buffBase: 4, img: 'assets/cards/card-skull.png' },
    { id: 'leukocytus', name: 'LEUKOCYTUS', rarity: 'legendary', color: '#7c3aed', fact: 'Pasukan elit pembasmi bakteri, virus & patogen berbahaya',  strength: 'Immunity Max',  buffType: 'mythic_all', buffBase: 4, img: 'assets/cards/card-leukocytus.png' },
  ];
  const RARITY_LABEL = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' };
  const RARITY_WEIGHT = { common: 1, rare: 2, epic: 3, legendary: 4 };

  const isAdmin = () => { try { const u = typeof authCurrentUser === 'function' ? authCurrentUser() : null; return !!(u && u.role === 'admin'); } catch { return false; } };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const getDia = () => isAdmin() ? Infinity : (parseInt(localStorage.getItem(KEY_DIA) || '0', 10) || 0);
  const setDia = v => { if (!isAdmin()) localStorage.setItem(KEY_DIA, String(Math.max(0, v))); };
  const getCards = () => { try { return JSON.parse(localStorage.getItem(KEY_CARDS) || '[]'); } catch { return []; } };
  const addCard = card => { const c = getCards(); c.push({ id: card.id, at: Date.now() }); localStorage.setItem(KEY_CARDS, JSON.stringify(c)); };
  const ownedCount = id => getCards().filter(c => c.id === id).length;

  const getStarMap = () => { try { const m = JSON.parse(localStorage.getItem(KEY_STARS) || '{}'); return m && typeof m === 'object' ? m : {}; } catch { return {}; } };
  const setManualStar = (id, star) => {
    const m = getStarMap();
    m[id] = Math.max(1, Math.min(5, Number(star) || 1));
    localStorage.setItem(KEY_STARS, JSON.stringify(m));
  };

  function copiesToStar(n) {
    if (n <= 0) return 0;
    let s = 1;
    for (let i = 0; i < STAR_COPY_THRESHOLDS.length; i++) {
      if (n >= STAR_COPY_THRESHOLDS[i]) s = i + 1;
    }
    return Math.min(5, s);
  }

  function getCardStar(id) {
    const n = ownedCount(id);
    const admin = isAdmin();
    if (n <= 0 && !admin) return 0;
    const copyStar = copiesToStar(n || (admin ? 5 : 0));
    const manualStar = Number(getStarMap()[id] || 0);
    return Math.min(5, Math.max(copyStar, manualStar, 1));
  }

  function nextStarThreshold(star) {
    if (star >= 5) return null;
    return STAR_COPY_THRESHOLDS[star] || 10;
  }

  function holoClassForStar(star, rarity) {
    const s = Number(star) || 1;
    if (s >= 5) return 'holo-tier-5';
    if (s === 4) return 'holo-tier-4';
    if (s === 3 || rarity === 'legendary') return 'holo-tier-3';
    if (s === 2 || rarity === 'epic') return 'holo-tier-2';
    return 'holo-tier-1';
  }

  function starsText(star) {
    const s = Math.max(1, Math.min(5, Number(star) || 1));
    return '★'.repeat(s) + '☆'.repeat(5 - s);
  }

  function computeCardBuff(card, star = 1) {
    const s = Math.max(1, Math.min(5, Number(star) || 1));
    if (!card) return { quizXp: 0, duelXp: 0, packDiscount: 0, diaEvery: BASE_QUIZ_PER_DIAMOND, short: 'Tanpa Buff', desc: 'Pilih Kartu Andalan untuk mengaktifkan efek pasif.' };
    if (card.buffType === 'quiz_xp') {
      const quizXp = s + 1; // ★1=+2 XP .. ★5=+6 XP
      const duelXp = s * 3;
      return {
        quizXp, duelXp, packDiscount: s >= 4 ? 1 : 0, diaEvery: BASE_QUIZ_PER_DIAMOND,
        short: `+${quizXp} XP Soal • +${duelXp} XP Duel`,
        desc: `Setiap jawaban benar memberi +${quizXp} XP ekstra & menang Duel memberi +${duelXp} XP.`
      };
    }
    if (card.buffType === 'pack_disc') {
      const packDiscount = s; // ★1=-1 💎 .. ★5=-5 💎
      const quizXp = Math.ceil(s / 2);
      return {
        quizXp, duelXp: s * 3, packDiscount, diaEvery: BASE_QUIZ_PER_DIAMOND,
        short: `Diskon Gacha -${packDiscount}💎 • +${quizXp} XP`,
        desc: `Harga buka Organ Pack hemat -${packDiscount} 💎 (jadi ${BASE_PACK_COST - packDiscount} 💎) + bonus +${quizXp} XP soal.`
      };
    }
    if (card.buffType === 'duel_xp') {
      const duelXp = 5 + s * 4; // ★1=+9 XP .. ★5=+25 XP
      const quizXp = Math.ceil(s / 2) + 1;
      const diaEvery = s >= 4 ? 4 : BASE_QUIZ_PER_DIAMOND;
      return {
        quizXp, duelXp, packDiscount: s >= 3 ? 1 : 0, diaEvery,
        short: `+${duelXp} XP Duel • +${quizXp} XP Soal`,
        desc: `Menang Duel mendapat +${duelXp} XP ekstra & +${quizXp} XP tiap soal benar${s >= 4 ? ' (Diamond tiap 4 soal!)' : ''}.`
      };
    }
    if (card.buffType === 'epic_mind') {
      const quizXp = s + 2; // ★1=+3 XP .. ★5=+7 XP
      const duelXp = 4 + s * 3;
      const packDiscount = s >= 3 ? 2 : 1;
      return {
        quizXp, duelXp, packDiscount, diaEvery: s >= 5 ? 4 : BASE_QUIZ_PER_DIAMOND,
        short: `+${quizXp} XP Soal • Diskon -${packDiscount}💎`,
        desc: `Bonus +${quizXp} XP tiap jawaban benar, +${duelXp} XP menang Duel & diskon Gacha -${packDiscount} 💎.`
      };
    }
    // mythic_all (Legendary)
    const quizXp = s + 3; // ★1=+4 XP .. ★5=+8 XP
    const duelXp = 10 + s * 4; // ★1=+14 XP .. ★5=+30 XP
    const packDiscount = Math.min(5, s + 1); // ★1=-2 💎 .. ★5=-5 💎
    const diaEvery = s >= 2 ? 4 : BASE_QUIZ_PER_DIAMOND;
    return {
      quizXp, duelXp, packDiscount, diaEvery,
      short: `+${quizXp} XP • Duel +${duelXp} • -${packDiscount}💎`,
      desc: `Aura Mythic: +${quizXp} XP tiap soal benar, +${duelXp} XP menang Duel, diskon Gacha -${packDiscount} 💎 & +1 💎 tiap ${diaEvery} soal!`
    };
  }

  function enrichCard(card, forceStar = null) {
    if (!card) return null;
    const copies = ownedCount(card.id);
    const star = forceStar != null ? Math.max(1, Math.min(5, Number(forceStar) || 1)) : (getCardStar(card.id) || 1);
    const buff = computeCardBuff(card, star);
    const holoClass = holoClassForStar(star, card.rarity);
    return {
      ...card,
      copies,
      star,
      starsText: starsText(star),
      holoClass,
      buff
    };
  }

  function getEquippedId() {
    const saved = localStorage.getItem(KEY_EQUIP) || '';
    if (saved && CARD_CATALOG.some(c => c.id === saved) && (ownedCount(saved) > 0 || isAdmin())) {
      return saved;
    }
    // Fallback otomatis ke kartu terbaik yang sudah dimiliki
    const ownedIds = new Set(getCards().map(c => c.id));
    const unlocked = CARD_CATALOG.filter(c => ownedIds.has(c.id));
    if (!unlocked.length) return '';
    unlocked.sort((a, b) => (getCardStar(b.id) - getCardStar(a.id)) || (RARITY_WEIGHT[b.rarity] - RARITY_WEIGHT[a.rarity]));
    return unlocked[0].id;
  }

  function setEquippedId(id) {
    if (!id || !CARD_CATALOG.some(c => c.id === id)) return false;
    if (ownedCount(id) <= 0 && !isAdmin()) return false;
    localStorage.setItem(KEY_EQUIP, id);
    renderHomeShowcaseBadge();
    window.dispatchEvent(new CustomEvent('clined:card-equipped', { detail: getEquippedCard() }));
    return true;
  }

  function getEquippedCard() {
    const id = getEquippedId();
    if (!id) return null;
    const base = CARD_CATALOG.find(c => c.id === id);
    return enrichCard(base);
  }

  function getCardById(id, star = 1) {
    const base = CARD_CATALOG.find(c => c.id === id);
    if (!base) return null;
    return enrichCard(base, star);
  }

  function getPackCost() {
    const eq = getEquippedCard();
    const disc = eq?.buff?.packDiscount || 0;
    return Math.max(12, BASE_PACK_COST - disc);
  }

  function getQuizPerDiamond() {
    const eq = getEquippedCard();
    return eq?.buff?.diaEvery || BASE_QUIZ_PER_DIAMOND;
  }

  function updateDiaBadges() {
    const d = getDia(), text = d === Infinity ? '∞' : String(d);
    document.querySelectorAll('[data-diamond-count]').forEach(e => { e.textContent = text; });
  }
  function popDiamondToast(msg = '💎 +1 Diamond!') {
    const p = document.createElement('div');
    p.className = 'diamond-earn-pop';
    p.textContent = msg;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1700);
  }

  /* Dapat diamond setiap N jawaban benar + suntikkan Bonus XP Kartu Andalan. */
  (function hookDiamondEarning() {
    let count = parseInt(sessionStorage.getItem('clined_qa_count') || '0', 10) || 0;
    let inBonusCall = false;
    const original = window.addXP;
    window.addXP = function (amount, reason) {
      const isCorrectAnswer = !inBonusCall && ((typeof amount === 'number' && amount > 0 && amount <= 25) || (typeof reason === 'string' && /benar|resep|farmako|quest/i.test(reason)));
      const eq = isCorrectAnswer ? getEquippedCard() : null;
      const bonusXp = eq?.buff?.quizXp || 0;
      const totalAmount = (isCorrectAnswer && typeof amount === 'number' && bonusXp > 0) ? (amount + bonusXp) : amount;

      if (typeof original === 'function') {
        inBonusCall = true;
        try {
          original.call(this, totalAmount, reason);
        } finally {
          inBonusCall = false;
        }
      }
      if (!isCorrectAnswer) return;
      count++;
      sessionStorage.setItem('clined_qa_count', String(count));
      const step = getQuizPerDiamond();
      if (count % step === 0) {
        setDia(getDia() + 1);
        updateDiaBadges();
        popDiamondToast(eq ? `💎 +1 Diamond! (${eq.name} ★${eq.star})` : '💎 +1 Diamond!');
      }
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
    const cost = getPackCost();
    if (getDia() < cost) return null;
    const prevStar = CARD_CATALOG.reduce((acc, c) => { acc[c.id] = getCardStar(c.id); return acc; }, {});
    setDia(getDia() - cost);
    const card = rollCard();
    addCard(card);
    if (!localStorage.getItem(KEY_EQUIP)) setEquippedId(card.id);
    const newStar = getCardStar(card.id);
    const starUp = newStar > (prevStar[card.id] || 0) && (prevStar[card.id] || 0) > 0;
    renderHomeShowcaseBadge();
    return { ...enrichCard(card, newStar), starUp, prevStar: prevStar[card.id] || 0 };
  }

  function buildEquippedBanner() {
    const eq = getEquippedCard();
    if (!eq) {
      return `<div class="card-equipped-banner empty">
        <div class="card-equipped-empty-ico">🃏</div>
        <div class="card-equipped-info">
          <span class="card-equipped-kicker">KARTU ANDALAN (SHOWCASE)</span>
          <b>Belum ada Kartu Andalan</b>
          <small>Buka Organ Pack pertamamu untuk mengaktifkan efek pasif &amp; memamerkan kartu di Arena Duel!</small>
        </div>
      </div>`;
    }
    return `<div class="card-equipped-banner rarity-${eq.rarity} ${eq.holoClass}" style="--card-color:${eq.color}">
      <div class="card-equipped-thumb ${eq.holoClass}" data-preview-card="${esc(eq.id)}" role="button" tabindex="0" title="Lihat detail ${esc(eq.name)}">
        <img src="${eq.img}" alt="${esc(eq.name)}">
        <span class="card-star-pill">★${eq.star}</span>
      </div>
      <div class="card-equipped-info">
        <div class="card-equipped-topline">
          <span class="card-equipped-kicker">🌟 KARTU ANDALAN AKTIF</span>
          <span class="card-equipped-stars" title="Level Bintang Kartu">${eq.starsText}</span>
        </div>
        <b>${esc(eq.name)} <small>(${RARITY_LABEL[eq.rarity]})</small></b>
        <div class="card-equipped-buff">⚡ Pasif: <b>${esc(eq.buff.short)}</b></div>
        <small class="card-equipped-desc">${esc(eq.buff.desc)}</small>
      </div>
    </div>`;
  }

  function buildGrid() {
    const owned = getCards();
    const admin = isAdmin();
    const eqId = getEquippedId();
    return CARD_CATALOG.map(card => {
      const n = owned.filter(c => c.id === card.id).length;
      const unlocked = n > 0 || admin;
      const star = unlocked ? getCardStar(card.id) : 0;
      const holo = unlocked ? holoClassForStar(star, card.rarity) : '';
      const isEq = unlocked && card.id === eqId;
      const cls = `coll-card-slot rarity-${card.rarity}${unlocked ? ` is-unlocked ${holo}` : ' locked'}${isEq ? ' is-equipped' : ''}`;
      return `<div class="${cls}" style="--card-color:${card.color}" ${unlocked ? `data-preview-card="${esc(card.id)}" role="button" tabindex="0" title="Ketuk untuk detail, Star-Up & pasang ${esc(card.name)}"` : ''}>
        ${isEq ? '<span class="coll-equip-tag" title="Kartu Andalan Aktif">🌟 ANDALAN</span>' : ''}
        ${unlocked ? `<span class="coll-star-badge star-${star}">★${star}</span>` : ''}
        <div class="coll-card-art ${holo}">
          <img src="${card.img}" alt="${esc(card.name)}" loading="lazy">
        </div>
        <b>${esc(card.name)}</b>
        ${unlocked ? `<small>${n ? `x${n}` : '👑'} • ★${star}</small>` : '<small>🔒 Terkunci</small>'}
      </div>`;
    }).join('');
  }

  function buildShop() {
    const d = getDia(), diaText = d === Infinity ? '∞' : d;
    const owned = getCards(), uniqueOwned = new Set(owned.map(c => c.id)).size;
    const cost = getPackCost();
    const hasDisc = cost < BASE_PACK_COST;
    const diaStep = getQuizPerDiamond();
    return `<div class="card-shop-sheet">
      <div class="card-shop-head">
        <div><span class="card-shop-eyebrow">CLINED CARDS • HOLOGRAM &amp; STAR-UP</span><h3>Card Shop &amp; Deck</h3><p>Koleksi ${CARD_CATALOG.length} kartu, naikkan ★ bintang &amp; pasang Kartu Andalan untuk Duel!</p></div>
        <button type="button" class="card-shop-close" id="closeCardShop" aria-label="Tutup">✕</button>
      </div>
      <div class="card-shop-dia-row">
        <span class="card-shop-dia-badge">💎 <b data-diamond-count>${diaText}</b></span>
        <span class="card-shop-dia-hint">+1 💎 setiap ${diaStep} soal benar</span>
      </div>
      ${buildEquippedBanner()}
      <div class="card-pack-card">
        <img class="card-pack-img" src="assets/cards/fab-basket.png" alt="Organ Pack">
        <div class="card-pack-info">
          <b>Organ Pack (${CARD_CATALOG.length} Seri Kartu)</b>
          <small>Duplikat otomatis menaikkan ★ Bintang &amp; membuka efek Hologram Foil!</small>
          <div class="card-rarity-odds">
            <span>Common 50%</span><span class="odd-rare">Rare 30%</span><span class="odd-epic">Epic 15%</span><span class="odd-legendary">Legendary 5%</span>
          </div>
        </div>
      </div>
      <button type="button" class="card-buy-btn" id="buyCardPack" ${d < cost ? 'disabled' : ''}>
        💎 Buka Pack — ${hasDisc ? `<s>${BASE_PACK_COST}</s> <b>${cost}</b> (Diskon Pasif!)` : cost}
      </button>
      <div class="card-collection-head">
        <span>Koleksi &amp; Star-Up (Ketuk Kartu)</span>
        <b>${uniqueOwned} / ${CARD_CATALOG.length}</b>
      </div>
      <div class="card-collection-grid">${buildGrid()}</div>
    </div>`;
  }

  /* Confetti ringan (div, bukan canvas) untuk kartu Epic/Legendary/Star-Up. */
  function burstConfetti(container, rarity) {
    const palettes = {
      rare: ['#60a5fa', '#3b82f6', '#dbeafe', '#93c5fd'],
      epic: ['#a855f7', '#7c3aed', '#e9d5ff', '#c084fc'],
      legendary: ['#f5c97a', '#fbbf24', '#fff7cd', '#ffe08a']
    };
    const colors = palettes[rarity] || palettes.epic;
    const count = rarity === 'legendary' ? 48 : 30;
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

  function showReveal(cardObj) {
    const card = cardObj.buff ? cardObj : enrichCard(cardObj);
    const ov = document.createElement('div');
    ov.className = 'pack-open-overlay';
    const dup = card.copies > 1;
    ov.innerHTML = `<div class="pack-open-stage rarity-${card.rarity}" style="--rarity-color:${card.color}">
      <button type="button" class="pack-tap" id="packTapZone" aria-label="Ketuk untuk membuka pack">
        <img class="pack-open-img" src="assets/cards/fab-basket.png" alt="">
        <span class="pack-tap-hint">Ketuk untuk membuka</span>
      </button>
      <div class="pack-flash"></div>
      <div class="pack-card-flip ${card.holoClass}">
        <div class="pack-card-rays"></div>
        <div class="pack-card-inner">
          <div class="pack-card-back">
            <span class="pack-card-back-mark">CLINED</span>
            <span class="pack-card-back-sub">CARDS</span>
          </div>
          <div class="pack-card-front ${card.holoClass}">
            <img src="${card.img}" alt="${esc(card.name)}">
            <span class="pack-card-star-overlay">★${card.star}</span>
          </div>
        </div>
      </div>
      <div class="pack-result-info">
        <div class="card-reveal-badges">
          <span class="card-reveal-rarity ${card.rarity}">${RARITY_LABEL[card.rarity]}</span>
          <span class="card-reveal-stars">${card.starsText}</span>
        </div>
        ${card.starUp ? `<div class="card-starup-banner">🎉 STAR-UP! Naik ke <b>★${card.star}</b> ${card.star >= 3 ? '(Hologram Foil Aktif! ✨)' : ''}</div>` : ''}
        <h4>${esc(card.name)}</h4>
        ${card.fact ? `<p>${esc(card.fact)}</p>` : ''}
        <div class="card-reveal-buff-box">⚡ Efek Pasif (★${card.star}): <b>${esc(card.buff.short)}</b></div>
        ${dup ? `<small class="card-dup-note">Duplikat ke-${card.copies} • ${card.star < 5 ? `Butuh ${nextStarThreshold(card.star)} duplikat untuk ★${card.star + 1}` : '👑 MAX AWAKENED ★5!'}</small>` : '<small class="card-dup-note">✨ Kartu Baru Terbuka!</small>'}
        <div class="card-reveal-actions">
          <button type="button" class="card-equip-btn" id="equipFromReveal">${getEquippedId() === card.id ? '✅ Kartu Andalan Aktif' : '🌟 Jadikan Kartu Andalan'}</button>
          <button type="button" class="ml-next" id="closeCardReveal">Lanjut</button>
        </div>
      </div>
    </div>`;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('show'));

    const stage = ov.querySelector('.pack-open-stage');
    const open = () => {
      if (stage.classList.contains('phase-burst')) return;
      stage.classList.add('phase-burst');
      setTimeout(() => {
        stage.classList.add('phase-flip');
        setTimeout(() => {
          stage.classList.add('phase-reveal');
          if (card.rarity === 'epic' || card.rarity === 'legendary' || card.starUp) burstConfetti(stage, card.rarity);
        }, 620);
      }, 480);
    };
    ov.querySelector('#packTapZone').addEventListener('click', open);
    setTimeout(open, 2600);

    const close = () => { ov.classList.remove('show'); setTimeout(() => { ov.remove(); showShop(); }, 200); };
    ov.querySelector('#closeCardReveal').addEventListener('click', close);
    ov.querySelector('#equipFromReveal')?.addEventListener('click', (e) => {
      setEquippedId(card.id);
      e.currentTarget.textContent = '✅ Kartu Andalan Aktif';
      e.currentTarget.classList.add('is-active');
      popDiamondToast(`🌟 ${card.name} jadi Kartu Andalan!`);
    });
    ov.addEventListener('click', e => { if (e.target === ov && stage.classList.contains('phase-reveal')) close(); });
  }

  function showCardPreview(rawCard) {
    if (!rawCard) return;
    document.querySelector('.card-preview-overlay')?.remove();
    const card = enrichCard(rawCard);
    const isEq = getEquippedId() === card.id;
    const nextStar = card.star < 5 ? card.star + 1 : null;
    const upgCost = nextStar ? STAR_UPGRADE_COST[nextStar] : null;
    const canUpg = nextStar && getDia() >= upgCost;
    const nextCopies = nextStarThreshold(card.star);

    const ov = document.createElement('div');
    ov.className = 'pack-open-overlay card-preview-overlay show';
    ov.innerHTML = `<div class="pack-open-stage phase-reveal rarity-${card.rarity}" style="--rarity-color:${card.color}">
      <div class="pack-card-flip ${card.holoClass}">
        <div class="pack-card-rays"></div>
        <div class="pack-card-inner">
          <div class="pack-card-front ${card.holoClass}">
            <img src="${card.img}" alt="${esc(card.name)}">
            <span class="pack-card-star-overlay">★${card.star}</span>
          </div>
        </div>
      </div>
      <div class="pack-result-info">
        <div class="card-reveal-badges">
          <span class="card-reveal-rarity ${card.rarity}">${RARITY_LABEL[card.rarity]}</span>
          <span class="card-reveal-stars">${card.starsText}</span>
        </div>
        <h4>${esc(card.name)}</h4>
        ${card.fact ? `<p>${esc(card.fact)}</p>` : ''}
        <div class="card-reveal-buff-box">
          <div>⚡ Jurus: <b>${esc(card.strength || '-')}</b> • Dimiliki: <b>x${card.copies}</b></div>
          <div style="margin-top:3px">🛡️ Efek Pasif (★${card.star}): <b>${esc(card.buff.short)}</b></div>
          <small style="display:block;margin-top:2px;opacity:.85">${esc(card.buff.desc)}</small>
        </div>
        <small class="card-dup-note">
          ${nextStar ? `Progres Bintang: ${card.copies}/${nextCopies} duplikat menuju ★${nextStar} ${nextStar >= 3 ? '(Efek Foil Hologram ✨)' : ''}` : '👑 BINTANG MAKSIMUM (★5 MYTHIC FOIL AKTIF)'}
        </small>
        <div class="card-preview-btn-stack">
          <button type="button" class="card-equip-btn ${isEq ? 'is-active' : ''}" id="previewEquipBtn">
            ${isEq ? '✅ Kartu Andalan Aktif (Tampil di Duel)' : '🌟 Jadikan Kartu Andalan'}
          </button>
          ${nextStar ? `<button type="button" class="card-starup-btn" id="previewStarUpBtn" ${canUpg ? '' : 'disabled'}>
            ⚡ Star-Up Instan ke ★${nextStar} — 💎 ${upgCost}
          </button>` : ''}
          <button type="button" class="ml-next" id="closeCardPreview">Tutup</button>
        </div>
      </div>
    </div>`;
    document.body.appendChild(ov);
    const close = () => { ov.classList.remove('show'); setTimeout(() => ov.remove(), 180); };
    ov.querySelector('#closeCardPreview')?.addEventListener('click', close);
    ov.querySelector('#previewEquipBtn')?.addEventListener('click', () => {
      setEquippedId(card.id);
      refreshShop();
      popDiamondToast(`🌟 ${card.name} (★${card.star}) dipasang jadi Kartu Andalan!`);
      showCardPreview(rawCard);
    });
    ov.querySelector('#previewStarUpBtn')?.addEventListener('click', () => {
      if (!nextStar || getDia() < upgCost) return;
      setDia(getDia() - upgCost);
      setManualStar(card.id, nextStar);
      updateDiaBadges();
      renderHomeShowcaseBadge();
      refreshShop();
      popDiamondToast(`🎉 ${card.name} naik ke ★${nextStar}!`);
      showCardPreview(rawCard);
      const stg = document.querySelector('.card-preview-overlay .pack-open-stage');
      if (stg) burstConfetti(stg, nextStar >= 4 ? 'legendary' : 'epic');
    });
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
  }

  function renderHomeShowcaseBadge() {
    const host = document.getElementById('playerBadges');
    if (!host) return;
    document.getElementById('homeEquippedCardPill')?.remove();
    const eq = getEquippedCard();
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'homeEquippedCardPill';
    btn.className = `home-equipped-card-pill ${eq ? `rarity-${eq.rarity} ${eq.holoClass}` : 'empty'}`;
    if (eq) {
      btn.style.setProperty('--card-color', eq.color);
      btn.title = `Kartu Andalan: ${eq.name} (★${eq.star}) — ${eq.buff.desc} Klik untuk buka Card Shop`;
      btn.innerHTML = `<img src="${eq.img}" alt="${esc(eq.name)}">
        <span class="hec-txt">
          <small>🌟 KARTU ANDALAN • ★${eq.star}</small>
          <b>${esc(eq.name)} • ${esc(eq.buff.short)}</b>
        </span>`;
    } else {
      btn.innerHTML = `<span>🃏</span><span class="hec-txt"><small>KOLEKSI KARTU</small><b>Pilih Kartu Andalan (${CARD_CATALOG.length} Seri) ›</b></span>`;
    }
    btn.addEventListener('click', showShop);
    host.appendChild(btn);
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
  function blockScroll(e) { if (e.target.closest && e.target.closest(".card-shop-sheet")) return; e.preventDefault(); }
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
    document.getElementById('floatingDashboardNav')?.style.setProperty('display', 'none', 'important');
    requestAnimationFrame(() => modal.classList.add('open'));
    document.addEventListener('touchmove', blockScroll, { passive: false });
  }
  function hideShop() {
    document.getElementById('cardShopModal')?.classList.remove('open');
    document.getElementById('floatingDashboardNav')?.style.removeProperty('display');
    document.removeEventListener('touchmove', blockScroll);
  }

  /* FAB draggable vertikal, hanya tampil kalau body.home-context. */
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

  function syncHomeContext() {
    const b = document.body;
    const activeView = document.querySelector('.view.active');
    const visible = activeView?.id === 'home' &&
      !b.classList.contains('auth-pending') &&
      !b.classList.contains('quiz-context');
    document.getElementById('cardShopFab')?.classList.toggle('is-visible', visible);
  }
  window.addEventListener('clined:view-change', syncHomeContext);
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

  function onExternalSync() {
    updateDiaBadges();
    injectDiamondStatCell();
    renderHomeShowcaseBadge();
    if (document.getElementById('cardShopModal')?.classList.contains('open')) refreshShop();
  }

  function boot() {
    createFab();
    watchHomeContext();
    injectDiamondStatCell();
    updateDiaBadges();
    renderHomeShowcaseBadge();
    window.addEventListener('clined:sync-applied', onExternalSync);
    window.addEventListener('clined:auth-ready', () => setTimeout(onExternalSync, 600));
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();

  window.CLINED_CARD_SHOP = { show: showShop, hide: hideShop };
  window.CLINED_CARDS = {
    catalog: CARD_CATALOG,
    getEquipped: getEquippedCard,
    getEquippedPayload: () => {
      const eq = getEquippedCard();
      return eq ? { id: eq.id, star: eq.star } : null;
    },
    getCardById,
    setEquipped: setEquippedId,
    getPackCost,
    getBonusQuizXp: () => getEquippedCard()?.buff?.quizXp || 0,
    getBonusDuelXp: () => getEquippedCard()?.buff?.duelXp || 0,
    openShop: showShop,
    previewCard: id => {
      const c = CARD_CATALOG.find(x => x.id === id);
      if (c) showCardPreview(c);
    }
  };
})();

/* v71: FAB memudar saat scroll */
(function(){
  let t=null;
  window.addEventListener('scroll',function(){
    const f=document.querySelector('.card-shop-fab'); if(!f) return;
    f.classList.add('fab-idle'); clearTimeout(t); t=setTimeout(function(){f.classList.remove('fab-idle');},700);
  },{passive:true});
})();
