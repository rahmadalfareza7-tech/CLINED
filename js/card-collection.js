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
  const KEY_BANNERS = 'clined_owned_banners_v1';
  const KEY_EQ_BANNER = 'clined_equipped_banner_v1';
  const KEY_DECOS = 'clined_owned_decos_v1';
  const KEY_EQ_DECO = 'clined_equipped_deco_v1';
  const KEY_FREE_BANNER = 'clined_free_banner_claimed_v1';
  const KEY_FREE_DECO = 'clined_free_deco_claimed_v1';
  const KEY_COSMETIC_TUT = 'clined_cosmetic_tutorial_v1';
  let shopTab = 'cards';
  let decoFilter = 'all';
  let bannerFilter = 'all';
  const BASE_QUIZ_PER_DIAMOND = 3;
  const BASE_PACK_COST = 20;

  const DECO_CATALOG = [
    { id: '01-cat-ears',             name: 'Cat Ears',             cat: 'Cute & Animal',     icon: '🐱', price: 8,  desc: 'Cute & Animal',     img: 'assets/decorations/01-cat-ears.svg?v=2' },
    { id: '02-ribbon-kitten',        name: 'Ribbon Kitten',        cat: 'Cute & Animal',     icon: '🎀', price: 8,  desc: 'Cute & Animal',     img: 'assets/decorations/02-ribbon-kitten.svg?v=2' },
    { id: '03-snow-leopard',         name: 'Snow Leopard',         cat: 'Cute & Animal',     icon: '🐆', price: 12, desc: 'Cute & Animal',     img: 'assets/decorations/03-snow-leopard.svg?v=2' },
    { id: '04-bunny-hoodie',         name: 'Bunny Hoodie',         cat: 'Cute & Animal',     icon: '🐰', price: 12, desc: 'Cute & Animal',     img: 'assets/decorations/04-bunny-hoodie.svg?v=2' },
    { id: '05-crescent-dreams',      name: 'Crescent Dreams',      cat: 'Celestial',         icon: '🌙', price: 12, desc: 'Celestial',         img: 'assets/decorations/05-crescent-dreams.svg?v=2' },
    { id: '06-star-struck',          name: 'Star Struck',          cat: 'Celestial',         icon: '⭐', price: 8,  desc: 'Celestial',         img: 'assets/decorations/06-star-struck.svg?v=2' },
    { id: '07-twilight-dusk',        name: 'Twilight Dusk',        cat: 'Celestial',         icon: '🌌', price: 15, desc: 'Celestial',         img: 'assets/decorations/07-twilight-dusk.svg?v=2' },
    { id: '08-phantom-wraith',       name: 'Phantom Wraith',       cat: 'Dark & Gothic',     icon: '👻', price: 15, desc: 'Dark & Gothic',     img: 'assets/decorations/08-phantom-wraith.svg?v=2' },
    { id: '09-blood-moon',           name: 'Blood Moon',           cat: 'Dark & Gothic',     icon: '🩸', price: 18, desc: 'Dark & Gothic',     img: 'assets/decorations/09-blood-moon.svg?v=2' },
    { id: '10-frost-eclipse',        name: 'Frost Eclipse',        cat: 'Dark & Gothic',     icon: '❄️', price: 18, desc: 'Dark & Gothic',     img: 'assets/decorations/10-frost-eclipse.svg?v=2' },
    { id: '11-fallen-angel',         name: 'Fallen Angel',         cat: 'Dark & Gothic',     icon: '🖤', price: 15, desc: 'Dark & Gothic',     img: 'assets/decorations/11-fallen-angel.svg?v=2' },
    { id: '12-symbiote-web',         name: 'Symbiote Web',         cat: 'Dark & Gothic',     icon: '🕸️', price: 18, desc: 'Dark & Gothic',     img: 'assets/decorations/12-symbiote-web.svg?v=2' },
    { id: '13-hellflame',            name: 'Hellflame',            cat: 'Elemental & Aura',  icon: '🔥', price: 15, desc: 'Elemental & Aura',  img: 'assets/decorations/13-hellflame.svg?v=2' },
    { id: '14-cursed-skulls',        name: 'Cursed Skulls',        cat: 'Dark & Gothic',     icon: '💀', price: 15, desc: 'Dark & Gothic',     img: 'assets/decorations/14-cursed-skulls.svg?v=2' },
    { id: '15-demon-horns',          name: 'Demon Horns',          cat: 'Dark & Gothic',     icon: '😈', price: 15, desc: 'Dark & Gothic',     img: 'assets/decorations/15-demon-horns.svg?v=2' },
    { id: '16-thunder-surge',        name: 'Thunder Surge',        cat: 'Elemental & Aura',  icon: '🌩️', price: 18, desc: 'Elemental & Aura',  img: 'assets/decorations/16-thunder-surge.svg?v=2' },
    { id: '17-butterfly-waltz',      name: 'Butterfly Waltz',      cat: 'Aesthetic & Anime', icon: '🦋', price: 12, desc: 'Aesthetic & Anime', img: 'assets/decorations/17-butterfly-waltz.svg?v=2' },
    { id: '18-anime-angry',          name: 'Anime Angry',          cat: 'Aesthetic & Anime', icon: '💢', price: 8,  desc: 'Aesthetic & Anime', img: 'assets/decorations/18-anime-angry.svg?v=2' },
    { id: '19-shark-frill',          name: 'Apex Shark',           cat: 'Dark & Gothic',     icon: '🦈', price: 12, desc: 'Dark & Gothic',     img: 'assets/decorations/19-shark-frill.svg?v=2' },
    { id: '20-sakura-breeze',        name: 'Sakura Breeze',        cat: 'Aesthetic & Anime', icon: '🌸', price: 15, desc: 'Aesthetic & Anime', img: 'assets/decorations/20-sakura-breeze.svg?v=2' },
    { id: '21-chrome-liquid-gothic', name: 'Chrome Liquid Gothic', cat: 'Dark & Gothic',     icon: '⛓️', price: 20, desc: 'Dark & Gothic',     img: 'assets/decorations/21-chrome-liquid-gothic.svg?v=2' },
    // Vol. 2 — 10 Avatar Decorations
    { id: '22-fallen-angel-white',      name: 'Fallen Angel (White)',      cat: 'Dark & Gothic',    icon: '🪽', price: 18, isNew: true, desc: 'Dark & Gothic',    img: 'assets/decorations/22-fallen-angel-white.svg?v=2' },
    { id: '23-bloodweb',                name: 'Bloodweb',                  cat: 'Dark & Gothic',    icon: '🕸️', price: 18, isNew: true, desc: 'Dark & Gothic',    img: 'assets/decorations/23-bloodweb.svg?v=2' },
    { id: '24-jack-skellington-bones',  name: 'Jack Skellington (Bones)',  cat: 'Dark & Gothic',    icon: '💀', price: 18, isNew: true, desc: 'Dark & Gothic',    img: 'assets/decorations/24-jack-skellington-bones.svg?v=2' },
    { id: '25-trapped-souls',           name: 'Trapped Souls',             cat: 'Dark & Gothic',    icon: '👻', price: 18, isNew: true, desc: 'Dark & Gothic',    img: 'assets/decorations/25-trapped-souls.svg?v=2' },
    { id: '26-cloud-nine',              name: 'Cloud Nine',                cat: 'Celestial',        icon: '☁️', price: 15, isNew: true, desc: 'Celestial',        img: 'assets/decorations/26-cloud-nine.svg?v=2' },
    { id: '27-reynas-leer',             name: "Reyna's Leer",              cat: 'Elemental & Aura', icon: '👁️', price: 20, isNew: true, desc: 'Elemental & Aura', img: 'assets/decorations/27-reynas-leer.svg?v=2' },
    { id: '28-cozy-cat',                name: 'Cozy Cat',                  cat: 'Cute & Animal',    icon: '🐱', price: 12, isNew: true, desc: 'Cute & Animal',    img: 'assets/decorations/28-cozy-cat.svg?v=2' },
    { id: '29-nom-kitty',               name: 'Nom Kitty',                 cat: 'Cute & Animal',    icon: '🐾', price: 15, isNew: true, desc: 'Cute & Animal',    img: 'assets/decorations/29-nom-kitty.svg?v=2' },
    { id: '30-sleepy-bee',              name: 'Sleepy Bee',                cat: 'Cute & Animal',    icon: '🐝', price: 12, isNew: true, desc: 'Cute & Animal',    img: 'assets/decorations/30-sleepy-bee.svg?v=2' },
    { id: '31-hammy-green',             name: 'Hammy (Green)',             cat: 'Cute & Animal',    icon: '🐹', price: 12, isNew: true, desc: 'Cute & Animal',    img: 'assets/decorations/31-hammy-green.svg?v=2' }
  ];

  const BANNER_CATALOG = [
    // 10 Cowok
    { id: '01-blood-eclipse',       name: 'Blood Eclipse',       cat: 'Cowok', icon: '🩸', price: 8,  desc: 'Cowok • Gerhana merah kelam',        img: 'assets/banners/01-blood-eclipse.svg?v=2' },
    { id: '02-lunar-monolith',      name: 'Lunar Monolith',      cat: 'Cowok', icon: '🌑', price: 8,  desc: 'Cowok • Monolit bulan misterius',    img: 'assets/banners/02-lunar-monolith.svg?v=2' },
    { id: '03-always-watching',     name: 'Always Watching',     cat: 'Cowok', icon: '👁️', price: 12, desc: 'Cowok • Mata bayangan gelap',        img: 'assets/banners/03-always-watching.svg?v=2' },
    { id: '04-water-stalker',       name: 'Water Stalker',       cat: 'Cowok', icon: '🌊', price: 8,  desc: 'Cowok • Pemburu laut dalam',         img: 'assets/banners/04-water-stalker.svg?v=2' },
    { id: '05-crimson-katana',      name: 'Crimson Katana',      cat: 'Cowok', icon: '⚔️', price: 15, desc: 'Cowok • Tebasan katana merah',       img: 'assets/banners/05-crimson-katana.svg?v=2' },
    { id: '06-cursed-skulls',       name: 'Cursed Skulls',       cat: 'Cowok', icon: '💀', price: 15, desc: 'Cowok • Tengkorak terkutuk',         img: 'assets/banners/06-cursed-skulls.svg?v=2' },
    { id: '07-crimson-vs-symbiote', name: 'Crimson vs. Symbiote',cat: 'Cowok', icon: '🕸️', price: 18, desc: 'Cowok • Benturan simbiote',          img: 'assets/banners/07-crimson-vs-symbiote.svg?v=2' },
    { id: '08-shark-tail',          name: 'Shark Tail',          cat: 'Cowok', icon: '🦈', price: 12, desc: 'Cowok • Sirip hiu samudra',          img: 'assets/banners/08-shark-tail.svg?v=2' },
    { id: '09-midnight-rainpond',   name: 'Midnight Rainpond',   cat: 'Cowok', icon: '🌧️', price: 12, desc: 'Cowok • Hujan tengah malam',         img: 'assets/banners/09-midnight-rainpond.svg?v=2' },
    { id: '10-crimson-oni',         name: 'Crimson Oni',         cat: 'Cowok', icon: '👹', price: 18, desc: 'Cowok • Topeng oni merah',           img: 'assets/banners/10-crimson-oni.svg?v=2' },
    // 10 Cewek
    { id: '11-pastel-cloud-pup',    name: 'Pastel Cloud Pup',    cat: 'Cewek', icon: '🐶', price: 8,  desc: 'Cewek • Awan pastel & anak anjing',  img: 'assets/banners/11-pastel-cloud-pup.svg?v=2' },
    { id: '12-crimson-sakura',      name: 'Crimson Sakura',      cat: 'Cewek', icon: '🌸', price: 12, desc: 'Cewek • Kelopak sakura merah',       img: 'assets/banners/12-crimson-sakura.svg?v=2' },
    { id: '13-starlit-clouds',      name: 'Starlit Clouds',      cat: 'Cewek', icon: '✨', price: 12, desc: 'Cewek • Awan berbintang',            img: 'assets/banners/13-starlit-clouds.svg?v=2' },
    { id: '14-rainy-lilypond',      name: 'Rainy Lilypond',      cat: 'Cewek', icon: '🪷', price: 12, desc: 'Cewek • Kolam teratai hujan',        img: 'assets/banners/14-rainy-lilypond.svg?v=2' },
    { id: '15-idol-glowstick',      name: 'Idol Glowstick',      cat: 'Cewek', icon: '🎤', price: 15, desc: 'Cewek • Panggung cahaya idol',       img: 'assets/banners/15-idol-glowstick.svg?v=2' },
    { id: '16-butterfly-aurora',    name: 'Butterfly Aurora',    cat: 'Cewek', icon: '🦋', price: 15, desc: 'Cewek • Kupu-kupu aurora',           img: 'assets/banners/16-butterfly-aurora.svg?v=2' },
    { id: '17-rose-gold-velvet',    name: 'Rose Gold Velvet',    cat: 'Cewek', icon: '🌹', price: 18, desc: 'Cewek • Beludru mawar emas',         img: 'assets/banners/17-rose-gold-velvet.svg?v=2' },
    { id: '18-cotton-candy-sky',    name: 'Cotton Candy Sky',    cat: 'Cewek', icon: '☁️', price: 8,  desc: 'Cewek • Langit permen kapas',        img: 'assets/banners/18-cotton-candy-sky.svg?v=2' },
    { id: '19-crystal-prism',       name: 'Crystal Prism',       cat: 'Cewek', icon: '💎', price: 18, desc: 'Cewek • Prisma kristal berkilau',    img: 'assets/banners/19-crystal-prism.svg?v=2' },
    { id: '20-golden-honeybee',     name: 'Golden Honeybee',     cat: 'Cewek', icon: '🐝', price: 12, desc: 'Cewek • Madu emas hangat',           img: 'assets/banners/20-golden-honeybee.svg?v=2' },
    // Admin Exclusive
    { id: '21-creation-touch',      name: 'Creation Touch',      cat: 'Eksklusif', icon: '👑', price: 0, adminOnly: true, desc: 'Admin Exclusive • Sentuhan penciptaan', img: 'assets/banners/21-creation-touch.svg?v=2' },
    { id: '22-abyssal-touch',       name: 'Abyssal Touch',       cat: 'Eksklusif', icon: '👑', price: 0, adminOnly: true, desc: 'Admin Exclusive • Sentuhan kegelapan abisal', img: 'assets/banners/22-abyssal-touch.svg?v=2' },
    // Vol. 2 — 10 Cowok
    { id: '23-pressed-glass',       name: 'Pressed Glass',       cat: 'Cowok', icon: '🧊', price: 8,  isNew: true, desc: 'Cowok • Kaca tekan bertekstur',      img: 'assets/banners/23-pressed-glass.svg?v=2' },
    { id: '24-manga-rage',          name: 'Manga Rage',          cat: 'Cowok', icon: '💢', price: 12, isNew: true, desc: 'Cowok • Energi amarah manga',        img: 'assets/banners/24-manga-rage.svg?v=2' },
    { id: '25-vengeance-flame',     name: 'Vengeance Flame',     cat: 'Cowok', icon: '🔥', price: 15, isNew: true, desc: 'Cowok • Kobaran api dendam',         img: 'assets/banners/25-vengeance-flame.svg?v=2' },
    { id: '26-pixel-cityscape',     name: 'Pixel Cityscape',     cat: 'Cowok', icon: '🌆', price: 12, isNew: true, desc: 'Cowok • Kota piksel malam',          img: 'assets/banners/26-pixel-cityscape.svg?v=2' },
    { id: '27-volt-strike',         name: 'Volt Strike',         cat: 'Cowok', icon: '⚡', price: 15, isNew: true, desc: 'Cowok • Sambaran petir neon',        img: 'assets/banners/27-volt-strike.svg?v=2' },
    { id: '28-arcade-overdrive',    name: '8-Bit Overdrive',     cat: 'Cowok', icon: '🕹️', price: 15, isNew: true, desc: 'Cowok • Overdrive arcade retro',     img: 'assets/banners/28-arcade-overdrive.svg?v=2' },
    { id: '29-street-crown',        name: 'Street Crown',        cat: 'Cowok', icon: '👑', price: 18, isNew: true, desc: 'Cowok • Mahkota grafiti jalanan',    img: 'assets/banners/29-street-crown.svg?v=2' },
    { id: '30-caution-zone',        name: 'Caution Zone',        cat: 'Cowok', icon: '⚠️', price: 12, isNew: true, desc: 'Cowok • Zona peringatan industrial', img: 'assets/banners/30-caution-zone.svg?v=2' },
    { id: '31-pixel-phantom',       name: 'Pixel Phantom',       cat: 'Cowok', icon: '👾', price: 15, isNew: true, desc: 'Cowok • Hantu piksel misterius',     img: 'assets/banners/31-pixel-phantom.svg?v=2' },
    { id: '32-higanbana-ink',       name: 'Higanbana Ink',       cat: 'Cowok', icon: '🌺', price: 18, isNew: true, desc: 'Cowok • Tinta bunga higanbana',      img: 'assets/banners/32-higanbana-ink.svg?v=2' },
    // Vol. 2 — 10 Cewek
    { id: '33-cat-beans',           name: 'Cat Beans',           cat: 'Cewek', icon: '🐾', price: 12, isNew: true, desc: 'Cewek • Telapak kucing gemas',       img: 'assets/banners/33-cat-beans.svg?v=2' },
    { id: '34-tropical-hibiscus',   name: 'Tropical Hibiscus',   cat: 'Cewek', icon: '🌺', price: 12, isNew: true, desc: 'Cewek • Kembang sepatu tropis',      img: 'assets/banners/34-tropical-hibiscus.svg?v=2' },
    { id: '35-spring-meadow',       name: 'Spring Meadow',       cat: 'Cewek', icon: '🌼', price: 8,  isNew: true, desc: 'Cewek • Padang bunga musim semi',    img: 'assets/banners/35-spring-meadow.svg?v=2' },
    { id: '36-twilight-spark',      name: 'Twilight Spark',      cat: 'Cewek', icon: '✨', price: 12, isNew: true, desc: 'Cewek • Kilau senja lembut',         img: 'assets/banners/36-twilight-spark.svg?v=2' },
    { id: '37-sakura-corner',       name: 'Sakura Corner',       cat: 'Cewek', icon: '🌸', price: 15, isNew: true, desc: 'Cewek • Sudut bunga sakura',         img: 'assets/banners/37-sakura-corner.svg?v=2' },
    { id: '38-berry-milk',          name: 'Berry Milk',          cat: 'Cewek', icon: '🍓', price: 12, isNew: true, desc: 'Cewek • Susu stroberi pastel',       img: 'assets/banners/38-berry-milk.svg?v=2' },
    { id: '39-moon-bunny',          name: 'Moon Bunny',          cat: 'Cewek', icon: '🐰', price: 15, isNew: true, desc: 'Cewek • Kelinci bulan sabit',        img: 'assets/banners/39-moon-bunny.svg?v=2' },
    { id: '40-peach-fizz',          name: 'Peach Fizz',          cat: 'Cewek', icon: '🍑', price: 12, isNew: true, desc: 'Cewek • Soda persik segar',          img: 'assets/banners/40-peach-fizz.svg?v=2' },
    { id: '41-coquette-bow',        name: 'Coquette Bow',        cat: 'Cewek', icon: '🎀', price: 18, isNew: true, desc: 'Cewek • Pita coquette manis',        img: 'assets/banners/41-coquette-bow.svg?v=2' },
    { id: '42-froggy-leaf',         name: 'Froggy Leaf',         cat: 'Cewek', icon: '🐸', price: 8,  isNew: true, desc: 'Cewek • Katak kecil & daun segar',   img: 'assets/banners/42-froggy-leaf.svg?v=2' },
    // Vol. 2 — 3 Klub Bola
    { id: '43-manchester-united',   name: 'Manchester United',   cat: 'Klub Bola', icon: '⚽', price: 18, isNew: true, desc: 'Klub Bola • Red Devils Edition',  img: 'assets/banners/43-manchester-united.svg?v=2' },
    { id: '44-real-madrid',         name: 'Real Madrid',         cat: 'Klub Bola', icon: '⚽', price: 18, isNew: true, desc: 'Klub Bola • Los Blancos Edition', img: 'assets/banners/44-real-madrid.svg?v=2' },
    { id: '45-fc-barcelona',        name: 'FC Barcelona',        cat: 'Klub Bola', icon: '⚽', price: 18, isNew: true, desc: 'Klub Bola • Blaugrana Edition',   img: 'assets/banners/45-fc-barcelona.svg?v=2' }
  ];

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

  let saveTimer = 0, cardDirty = false, applyingServer = false;
  function getOwnedBanners() {
    try { const a = JSON.parse(localStorage.getItem(KEY_BANNERS) || '[]'); return Array.isArray(a) ? a : []; } catch { return []; }
  }
  function setOwnedBanners(arr) {
    try { localStorage.setItem(KEY_BANNERS, JSON.stringify([...new Set(arr)])); } catch {}
    scheduleServerSave();
  }
  function getEquippedBanner() {
    return localStorage.getItem(KEY_EQ_BANNER) || '';
  }
  function setEquippedBanner(id) {
    try { localStorage.setItem(KEY_EQ_BANNER, id || ''); } catch {}
    scheduleServerSave();
  }
  function getOwnedDecos() {
    try { const a = JSON.parse(localStorage.getItem(KEY_DECOS) || '[]'); return Array.isArray(a) ? a : []; } catch { return []; }
  }
  function setOwnedDecos(arr) {
    try { localStorage.setItem(KEY_DECOS, JSON.stringify([...new Set(arr)])); } catch {}
    scheduleServerSave();
  }
  function getEquippedDeco() {
    return localStorage.getItem(KEY_EQ_DECO) || '';
  }
  function setEquippedDeco(id) {
    try { localStorage.setItem(KEY_EQ_DECO, id || ''); } catch {}
    scheduleServerSave();
  }
  const isFreeBannerClaimed = () => localStorage.getItem(KEY_FREE_BANNER) === '1';
  const markFreeBannerClaimed = () => { try { localStorage.setItem(KEY_FREE_BANNER, '1'); } catch {} scheduleServerSave(); };
  const isFreeDecoClaimed = () => localStorage.getItem(KEY_FREE_DECO) === '1';
  const markFreeDecoClaimed = () => { try { localStorage.setItem(KEY_FREE_DECO, '1'); } catch {} scheduleServerSave(); };
  const isCosmeticTutorialDone = () => localStorage.getItem(KEY_COSMETIC_TUT) === '1';
  const markCosmeticTutorialDone = () => { try { localStorage.setItem(KEY_COSMETIC_TUT, '1'); } catch {} scheduleServerSave(); };
  function localCardPayload() {
    return {
      diamonds: isAdmin() ? 0 : (parseInt(localStorage.getItem(KEY_DIA) || '0', 10) || 0),
      cards: getCards(),
      stars: getStarMap(),
      equippedId: localStorage.getItem(KEY_EQUIP) || '',
      ownedBanners: getOwnedBanners(),
      equippedBanner: getEquippedBanner(),
      ownedDecos: getOwnedDecos(),
      equippedDeco: getEquippedDeco(),
      freeBannerClaimed: isFreeBannerClaimed(),
      freeDecoClaimed: isFreeDecoClaimed(),
      cosmeticTutorialDone: isCosmeticTutorialDone()
    };
  }
  async function pushServerCardState(mode = 'save', useKeepalive = false) {
    try {
      if (!navigator.onLine) return;
      const u = typeof authCurrentUser === 'function' ? authCurrentUser() : null;
      if (!u || !u.id) return;
      const body = JSON.stringify({ ...localCardPayload(), mode });
      const r = await fetch('/api/cards', {
        method: 'PUT',
        credentials: 'same-origin',
        keepalive: useKeepalive && body.length < 60000,
        headers: { 'Content-Type': 'application/json' },
        body
      });
      if (!r.ok) return;
      cardDirty = false;
      const d = await r.json().catch(() => null);
      if (d && d.exists) applyServerCardState(d);
    } catch {}
  }
  function scheduleServerSave() {
    if (applyingServer) return;
    cardDirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => pushServerCardState('save'), 250);
  }
  function applyServerCardState(d) {
    if (!d || !d.exists) return;
    applyingServer = true;
    try {
      if (!isAdmin() && Number.isFinite(Number(d.diamonds))) localStorage.setItem(KEY_DIA, String(Math.max(0, Number(d.diamonds))));
      if (Array.isArray(d.cards)) localStorage.setItem(KEY_CARDS, JSON.stringify(d.cards));
      if (d.stars && typeof d.stars === 'object') localStorage.setItem(KEY_STARS, JSON.stringify(d.stars));
      if (typeof d.equippedId === 'string' && d.equippedId) localStorage.setItem(KEY_EQUIP, d.equippedId);
      if (Array.isArray(d.ownedBanners)) localStorage.setItem(KEY_BANNERS, JSON.stringify(d.ownedBanners));
      if (typeof d.equippedBanner === 'string') localStorage.setItem(KEY_EQ_BANNER, d.equippedBanner);
      if (Array.isArray(d.ownedDecos)) localStorage.setItem(KEY_DECOS, JSON.stringify(d.ownedDecos));
      if (typeof d.equippedDeco === 'string') localStorage.setItem(KEY_EQ_DECO, d.equippedDeco);
      if (d.freeBannerClaimed) localStorage.setItem(KEY_FREE_BANNER, '1');
      if (d.freeDecoClaimed) localStorage.setItem(KEY_FREE_DECO, '1');
      if (d.cosmeticTutorialDone) localStorage.setItem(KEY_COSMETIC_TUT, '1');
    } finally { applyingServer = false; }
    onExternalSync();
  }
  let serverHydrated = false;
  async function hydrateFromServer() {
    try {
      if (!navigator.onLine) return;
      const u = typeof authCurrentUser === 'function' ? authCurrentUser() : null;
      if (!u || !u.id) return;
      const r = await fetch('/api/cards', { credentials: 'same-origin', cache: 'no-store' });
      if (!r.ok) return;
      const d = await r.json().catch(() => null);
      if (!d) return;
      const local = localCardPayload();
      const hasLocal = local.cards.length > 0 || local.diamonds > 0 || Object.keys(local.stars).length > 0 || local.ownedBanners.length > 0 || local.ownedDecos.length > 0 || local.freeBannerClaimed || local.freeDecoClaimed || local.cosmeticTutorialDone;
      if (!d.exists || cardDirty) {
        if (hasLocal || cardDirty) await pushServerCardState('merge');
        serverHydrated = true;
        setTimeout(() => { try { maybeStartCosmeticTutorial(); } catch {} }, 600);
        return;
      }
      // If local has cards/stars not yet on server (e.g. earned offline), merge once
      const serverKeys = new Set((d.cards || []).map(c => `${c.id}:${c.at}`));
      const hasNewLocalCard = local.cards.some(c => !serverKeys.has(`${c.id}:${c.at}`));
      if (hasNewLocalCard) {
        await pushServerCardState('merge');
        serverHydrated = true;
        setTimeout(() => { try { maybeStartCosmeticTutorial(); } catch {} }, 600);
        return;
      }
      applyServerCardState(d);
      serverHydrated = true;
      setTimeout(() => { try { maybeStartCosmeticTutorial(); } catch {} }, 600);
    } catch {}
  }

  const getDia = () => isAdmin() ? Infinity : (parseInt(localStorage.getItem(KEY_DIA) || '0', 10) || 0);
  const setDia = v => { if (!isAdmin()) { localStorage.setItem(KEY_DIA, String(Math.max(0, v))); scheduleServerSave(); } };
  const getCards = () => { try { return JSON.parse(localStorage.getItem(KEY_CARDS) || '[]'); } catch { return []; } };
  const addCard = card => { const c = getCards(); c.push({ id: card.id, at: Date.now() }); localStorage.setItem(KEY_CARDS, JSON.stringify(c)); scheduleServerSave(); try { window.clinedCheckAchievements?.(); } catch {} };
  const ownedCount = id => getCards().filter(c => c.id === id).length;

  const getStarMap = () => { try { const m = JSON.parse(localStorage.getItem(KEY_STARS) || '{}'); return m && typeof m === 'object' ? m : {}; } catch { return {}; } };
  const setManualStar = (id, star) => {
    const m = getStarMap();
    m[id] = Math.max(1, Math.min(5, Number(star) || 1));
    localStorage.setItem(KEY_STARS, JSON.stringify(m));
    scheduleServerSave();
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
      const diaEvery = s >= 4 ? 2 : BASE_QUIZ_PER_DIAMOND;
      return {
        quizXp, duelXp, packDiscount: s >= 3 ? 1 : 0, diaEvery,
        short: `+${duelXp} XP Duel • +${quizXp} XP Soal`,
        desc: `Menang Duel mendapat +${duelXp} XP ekstra & +${quizXp} XP tiap soal benar${s >= 4 ? ' (Diamond tiap 2 soal!)' : ''}.`
      };
    }
    if (card.buffType === 'epic_mind') {
      const quizXp = s + 2; // ★1=+3 XP .. ★5=+7 XP
      const duelXp = 4 + s * 3;
      const packDiscount = s >= 3 ? 2 : 1;
      return {
        quizXp, duelXp, packDiscount, diaEvery: s >= 5 ? 2 : BASE_QUIZ_PER_DIAMOND,
        short: `+${quizXp} XP Soal • Diskon -${packDiscount}💎`,
        desc: `Bonus +${quizXp} XP tiap jawaban benar, +${duelXp} XP menang Duel & diskon Gacha -${packDiscount} 💎.`
      };
    }
    // mythic_all (Legendary)
    const quizXp = s + 3; // ★1=+4 XP .. ★5=+8 XP
    const duelXp = 10 + s * 4; // ★1=+14 XP .. ★5=+30 XP
    const packDiscount = Math.min(5, s + 1); // ★1=-2 💎 .. ★5=-5 💎
    const diaEvery = s >= 2 ? 2 : BASE_QUIZ_PER_DIAMOND;
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
    scheduleServerSave();
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
    window.addXP = function (amount, reason, meta, ...rest) {
      const rStr = typeof reason === 'string' ? reason : '';
      const isWrongReason = /salah|dikerjakan/i.test(rStr);
      const isCorrectAnswer = !inBonusCall && !isWrongReason && ((typeof amount === 'number' && amount >= 10 && amount <= 55) || /benar|resep|farmako|quest/i.test(rStr));
      const eq = isCorrectAnswer ? getEquippedCard() : null;
      const bonusXp = eq?.buff?.quizXp || 0;
      const totalAmount = (isCorrectAnswer && typeof amount === 'number' && bonusXp > 0) ? (amount + bonusXp) : amount;

      let ret;
      if (typeof original === 'function') {
        inBonusCall = true;
        try {
          ret = original.call(this, totalAmount, reason, meta, ...rest);
        } finally {
          inBonusCall = false;
        }
      }
      if (!isCorrectAnswer || ret?.duplicate) return ret;
      count++;
      sessionStorage.setItem('clined_qa_count', String(count));
      const step = getQuizPerDiamond();
      if (count % step === 0) {
        setDia(getDia() + 1);
        updateDiaBadges();
        popDiamondToast(eq ? `💎 +1 Diamond! (${eq.name} ★${eq.star})` : '💎 +1 Diamond!');
      }
      return ret;
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

  const NAME_COLORS = [
    { id: '',         name: 'Default',  dot: '#94a3b8' },
    { id: 'amber',    name: 'Amber',    dot: 'linear-gradient(135deg,#f59e0b,#fde68a)' },
    { id: 'gold',     name: 'Gold',     dot: 'linear-gradient(135deg,#eab308,#fef08a)' },
    { id: 'sakura',   name: 'Sakura',   dot: 'linear-gradient(135deg,#ec4899,#fbcfe8)' },
    { id: 'cyber',    name: 'Cyan',     dot: 'linear-gradient(135deg,#06b6d4,#a5f3fc)' },
    { id: 'crimson',  name: 'Crimson',  dot: 'linear-gradient(135deg,#f43f5e,#fda4af)' },
    { id: 'emerald',  name: 'Emerald',  dot: 'linear-gradient(135deg,#10b981,#a7f3d0)' },
    { id: 'violet',   name: 'Violet',   dot: 'linear-gradient(135deg,#a855f7,#e9d5ff)' },
    { id: 'sunset',   name: 'Sunset',   dot: 'linear-gradient(135deg,#f97316,#fed7aa)' },
    { id: 'ice',      name: 'Ice',      dot: 'linear-gradient(135deg,#3b82f6,#bae6fd)' },
    { id: 'hologram', name: 'Hologram', dot: 'linear-gradient(135deg,#f472b6,#fbbf24,#34d399,#38bdf8,#a855f7)' }
  ];

  function getLocalAllTimeXp() {
    try { return Math.max(0, Math.round(Number(JSON.parse(localStorage.getItem('gaster_v11_xp') || '0')) || 0)); }
    catch { return 0; }
  }

  function has100kBadge(me) {
    if (me && typeof me.xp100k === 'boolean') return me.xp100k;
    return Boolean(me?.xp100k || getLocalAllTimeXp() >= 100000);
  }

  function canToggle100kBadge(me) {
    if (isAdmin()) return true;
    return Boolean(me?.xp100kToggleable || me?.xp100kUnlocked || me?.xp100k || getLocalAllTimeXp() >= 100000);
  }

  function buildBadge100kToggleBox() {
    const me = typeof authCurrentUser === 'function' ? authCurrentUser() : null;
    if (!me) return '';
    const unlocked = canToggle100kBadge(me);
    if (!unlocked) {
      const curXp = getLocalAllTimeXp();
      const pct = Math.min(100, Math.floor((curXp / 100000) * 100));
      return `<div class="badge100k-toggle-box is-locked">
        <div class="b100t-info">
          <div class="b100t-title-row">
            <span class="chat-badge b-xp100k compact">⚜️ 100K Legend</span>
            <span class="b100t-lock-tag">🔒 Terkunci</span>
          </div>
          <small>Capai <b>100.000 All-Time XP</b> untuk membuka badge eksklusif ini di bannerplate + bonus <b>💎 50 Diamond</b>.</small>
          <div class="b100t-prog-wrap">
            <div class="b100t-prog-bar"><span style="width:${pct}%"></span></div>
            <span class="b100t-prog-txt">⚡ ${curXp.toLocaleString('id-ID')} / 100.000 XP (${pct}%)</span>
          </div>
        </div>
        <button type="button" class="b100t-switch is-locked" disabled aria-disabled="true" title="Capai 100.000 All-Time XP untuk membuka">
          <span>🔒</span>
          <span>OFF</span>
        </button>
      </div>`;
    }
    const isOn = has100kBadge(me);
    const sub = isAdmin() && !me.xp100kUnlocked
      ? 'Akses Khusus Admin • Bebas nyalakan atau matikan badge di semua bannerplate'
      : 'Terbuka! Bebas nyalakan atau matikan badge 100.000 All-Time XP di semua bannerplate';
    return `<div class="badge100k-toggle-box">
      <div class="b100t-info">
        <span class="chat-badge b-xp100k compact">⚜️ 100K Legend</span>
        <small>${sub}</small>
      </div>
      <button type="button" class="b100t-switch${isOn ? ' on' : ''}" data-toggle-xp100k="${isOn ? '0' : '1'}" role="switch" aria-checked="${isOn}">
        <span class="b100t-knob"></span>
        <span>${isOn ? 'ON' : 'OFF'}</span>
      </button>
    </div>`;
  }

  function buildProfileHeroCard() {
    const me = typeof authCurrentUser === 'function' ? authCurrentUser() : null;
    const myName = me?.name || 'Nama Kamu';
    const myUser = me?.username ? `@${me.username}` : '@username';
    const myIni = String(myName || 'C').trim().charAt(0).toUpperCase() || 'C';
    const myAv = me?.avatarUrl ? `<img class="cosmetic-hero-av-img" src="${esc(me.avatarUrl)}" alt="">` : `<span>${esc(myIni)}</span>`;
    const deco = me?.avatarDeco ? `<img class="avatar-deco-img" src="${esc(me.avatarDeco)}" alt="" aria-hidden="true">` : '';
    const colorAttr = me?.nameColor ? ` data-name-color="${esc(me.nameColor)}"` : '';
    const xpBadge = has100kBadge(me) ? ' <em class="chat-badge b-xp100k" title="Pencapaian 100.000 All-Time XP">⚜️ 100K Legend</em>' : '';
    const bg = me?.bannerUrl ? `<span class="chat-row-bg" style="background-image:url('${esc(me.bannerUrl)}')" aria-hidden="true"></span>` : '';
    return `<div class="cosmetic-profile-hero${me?.bannerUrl ? ' has-banner' : ''}">
      ${bg}
      <button type="button" class="cosmetic-hero-av-btn" data-pick-avatar-photo title="Ganti foto profil">
        <span class="cosmetic-hero-av">${myAv}${deco}</span>
        <span class="cosmetic-hero-cam" aria-hidden="true">📷</span>
      </button>
      <div class="cosmetic-hero-info">
        <b${colorAttr}>${esc(myName)}</b>${xpBadge}
        <small>${esc(myUser)}</small>
        <button type="button" class="cosmetic-hero-photo-btn" data-pick-avatar-photo>📷 Ganti Foto Profil</button>
      </div>
    </div>`;
  }

  function buildBannerShop() {
    const ownedSet = new Set(getOwnedBanners());
    const eq = getEquippedBanner();
    const dia = getDia();
    const me = typeof authCurrentUser === 'function' ? authCurrentUser() : null;
    const myName = me?.name || 'Nama Kamu';
    const myUser = me?.username ? `@${me.username}` : '@username';
    const myIni = String(myName || 'C').trim().charAt(0).toUpperCase() || 'C';
    const myAv = me?.avatarUrl ? `<img src="${esc(me.avatarUrl)}" alt="">` : esc(myIni);
    const curColor = me?.nameColor || '';
    const colorAttr = curColor ? ` data-name-color="${esc(curColor)}"` : '';
    const xpPreviewBadge = has100kBadge(me) ? ' <em class="chat-badge b-xp100k compact">⚜️ 100K Legend</em>' : '';
    const colorPills = NAME_COLORS.map(c => `<button type="button" class="name-color-pill${curColor === c.id ? ' on' : ''}" data-pick-name-color="${esc(c.id)}"><span class="name-color-dot" style="background:${c.dot}"></span>${esc(c.name)}</button>`).join('');
    const freeAvail = !isFreeBannerClaimed();
    const seen = getSeenCosmetics();
    const list = BANNER_CATALOG
      .filter(b => bannerFilter === 'all' || b.cat === bannerFilter)
      .slice()
      .sort((a, b) => {
        const ua = (a.isNew && !seen.has('banner:' + a.id)) ? 0 : 1;
        const ub = (b.isNew && !seen.has('banner:' + b.id)) ? 0 : 1;
        return ua - ub;
      });
    const adminUser = isAdmin();
    const items = list.map(b => {
      const lockedByRole = Boolean(b.adminOnly && !adminUser);
      const isOwned = !lockedByRole && ownedSet.has(b.id);
      const isEquipped = !lockedByRole && eq === b.id;
      const canBuy = !lockedByRole && (freeAvail || dia >= b.price);
      const isUnseenNew = Boolean(b.isNew && !seen.has('banner:' + b.id));
      const newAttr = isUnseenNew ? ` data-new-cosmetic="banner:${esc(b.id)}"` : '';
      const newBadge = isUnseenNew ? '<span class="cosmetic-new-badge">NEW</span>' : '';
      const btnCls = lockedByRole ? 'admin-locked' : isEquipped ? 'equipped' : isOwned ? 'equip' : (freeAvail && !b.adminOnly) ? 'free-claim' : '';
      const btnLabel = lockedByRole
        ? '🔒 Khusus Admin'
        : isEquipped
          ? '✓ Terpasang (Lepas)'
          : isOwned
            ? 'Pasang'
            : (freeAvail && !b.adminOnly)
              ? '🎁 Klaim Gratis'
              : b.price === 0
                ? '👑 Pasang (Admin)'
                : `💎 ${b.price} Beli`;
      const chainOverlay = lockedByRole
        ? `<div class="banner-chain-lock" aria-hidden="true">
            <span class="chain-strand a"></span>
            <span class="chain-strand b"></span>
            <span class="chain-badge"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg><span>KHUSUS ADMIN</span></span>
          </div>`
        : '';
      return `<div class="banner-shop-card${isEquipped ? ' equipped' : ''}${lockedByRole ? ' is-admin-locked' : ''}"${newAttr}>
        ${newBadge}
        <div class="banner-shop-preview">
          <img class="banner-shop-preview-bg" src="${esc(b.img)}" alt="" aria-hidden="true">
          <span class="banner-shop-preview-av" aria-hidden="true">${myAv}</span>
          <div class="banner-shop-preview-txt">
            <b${colorAttr}>${esc(myName)}</b>${xpPreviewBadge}
            <small>${esc(myUser)} • ${b.icon} ${esc(b.name)}</small>
          </div>
        </div>
        <div class="banner-shop-foot">
          <div class="banner-shop-info">
            <b>${b.icon} ${esc(b.name)}</b>
            <small>${esc(b.desc)}</small>
          </div>
          <button type="button" class="banner-shop-btn ${btnCls}" data-banner-id="${esc(b.id)}" ${(lockedByRole || (!isOwned && !canBuy)) ? 'disabled' : ''}>${btnLabel}</button>
        </div>
        ${chainOverlay}
      </div>`;
    }).join('');
    const countCat = c => BANNER_CATALOG.filter(b => b.cat === c).length;
    const nCowok = countCat('Cowok'), nCewek = countCat('Cewek'), nBola = countCat('Klub Bola'), nAdmin = countCat('Eksklusif');
    const bCats = [
      ['all', `Semua (${BANNER_CATALOG.length})`],
      ['Cowok', `👦 Cowok (${nCowok})`],
      ['Cewek', `👧 Cewek (${nCewek})`],
      ['Klub Bola', `⚽ Klub Bola (${nBola})`],
      ['Eksklusif', `👑 Admin (${nAdmin})`]
    ];
    const bPills = bCats.map(([k, lbl]) => `<button type="button" class="deco-filter-btn${bannerFilter === k ? ' on' : ''}" data-banner-filter="${esc(k)}">${lbl}</button>`).join('');
    const freeBannerNotice = freeAvail ? `<div class="free-claim-banner">🎁 <span>Hadiah Akun: Kamu punya <b>1x Klaim Nameplate Gratis</b>! Pilih salah satu di bawah tanpa memakai Diamond.</span></div>` : '';
    return `${buildProfileHeroCard()}
      ${buildBadge100kToggleBox()}
      <div class="name-color-box">
        <div class="name-color-box-head"><span>✨ Warna Nama Chat (Ala Discord)</span><small>Gratis pilih</small></div>
        <div class="name-color-grid">${colorPills}</div>
      </div>
      ${freeBannerNotice}
      <div class="card-collection-head"><span>Background Profil Chat (${ownedSet.size}/${BANNER_CATALOG.length})</span><b>${nCowok} Cowok • ${nCewek} Cewek • ${nBola} Klub Bola • ${nAdmin} Admin</b></div>
      <div class="deco-filter-row">${bPills}</div>
      <div class="banner-shop-list">${items}</div>`;
  }

  function buildDecoShop() {
    const ownedSet = new Set(getOwnedDecos());
    const eq = getEquippedDeco();
    const dia = getDia();
    const freeAvail = !isFreeDecoClaimed();
    const seen = getSeenCosmetics();
    const me = typeof authCurrentUser === 'function' ? authCurrentUser() : null;
    const myIni = String(me?.name || 'C').trim().charAt(0).toUpperCase() || 'C';
    const myAv = me?.avatarUrl ? `<img class="deco-shop-av-img" src="${esc(me.avatarUrl)}" alt="">` : `<span>${esc(myIni)}</span>`;
    const list = DECO_CATALOG
      .filter(x => decoFilter === 'all' || x.cat === decoFilter)
      .slice()
      .sort((a, b) => {
        const ua = (a.isNew && !seen.has('deco:' + a.id)) ? 0 : 1;
        const ub = (b.isNew && !seen.has('deco:' + b.id)) ? 0 : 1;
        return ua - ub;
      });
    const items = list.map(d => {
      const isOwned = ownedSet.has(d.id);
      const isEquipped = eq === d.id;
      const canBuy = freeAvail || dia >= d.price;
      const isUnseenNew = Boolean(d.isNew && !seen.has('deco:' + d.id));
      const newAttr = isUnseenNew ? ` data-new-cosmetic="deco:${esc(d.id)}"` : '';
      const newBadge = isUnseenNew ? '<span class="cosmetic-new-badge">NEW</span>' : '';
      const btnCls = isEquipped ? 'equipped' : isOwned ? 'equip' : freeAvail ? 'free-claim' : '';
      const btnLabel = isEquipped ? '✓ Terpasang (Lepas)' : isOwned ? 'Pasang' : freeAvail ? '🎁 Klaim Gratis' : `💎 ${d.price} Beli`;
      return `<div class="deco-shop-card${isEquipped ? ' equipped' : ''}"${newAttr}>
        ${newBadge}
        <div class="deco-shop-av">${myAv}<img class="avatar-deco-img" src="${esc(d.img)}" alt="" aria-hidden="true"></div>
        <div class="deco-shop-title">${d.icon} ${esc(d.name)}</div>
        <div class="deco-shop-sub">${esc(d.cat)}</div>
        <button type="button" class="banner-shop-btn ${btnCls}" data-deco-id="${esc(d.id)}" ${!isOwned && !canBuy ? 'disabled' : ''}>${btnLabel}</button>
      </div>`;
    }).join('');
    const cats = [['all', `Semua (${DECO_CATALOG.length})`], ['Cute & Animal', '🐱 Cute'], ['Celestial', '🌙 Celestial'], ['Dark & Gothic', '🖤 Dark'], ['Elemental & Aura', '🔥 Elemental'], ['Aesthetic & Anime', '🌸 Anime']];
    const pills = cats.map(([k, lbl]) => `<button type="button" class="deco-filter-btn${decoFilter === k ? ' on' : ''}" data-deco-filter="${esc(k)}">${lbl}</button>`).join('');
    const freeDecoNotice = freeAvail ? `<div class="free-claim-banner">🎁 <span>Hadiah Akun: Kamu punya <b>1x Klaim Dekorasi Avatar Gratis</b>! Pilih salah satu di bawah tanpa memakai Diamond.</span></div>` : '';
    return `${buildProfileHeroCard()}${buildBadge100kToggleBox()}${freeDecoNotice}<div class="card-collection-head"><span>Dekorasi Avatar (${ownedSet.size}/${DECO_CATALOG.length})</span><b>5 Kategori</b></div>
      <div class="deco-filter-row">${pills}</div>
      <div class="deco-shop-grid">${items}</div>`;
  }

  function buildShop() {
    const d = getDia(), diaText = d === Infinity ? '∞' : d;
    const owned = getCards(), uniqueOwned = new Set(owned.map(c => c.id)).size;
    const cost = getPackCost();
    const hasDisc = cost < BASE_PACK_COST;
    const diaStep = getQuizPerDiamond();
    const newBannersCnt = getUnseenNewCount('banner');
    const newDecosCnt = getUnseenNewCount('deco');
    const cardsBody = `${buildEquippedBanner()}
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
      <div class="card-collection-grid">${buildGrid()}</div>`;
    return `<div class="card-shop-sheet">
      <div class="card-shop-head">
        <div><span class="card-shop-eyebrow">CLINED SHOP • KARTU, BANNER &amp; DEKORASI</span><h3>Card Shop &amp; Deck</h3><p>Koleksi ${CARD_CATALOG.length} kartu, ${BANNER_CATALOG.length} background chat, &amp; ${DECO_CATALOG.length} dekorasi avatar!</p></div>
        <button type="button" class="card-shop-close" id="closeCardShop" aria-label="Tutup">✕</button>
      </div>
      <div class="card-shop-dia-row">
        <span class="card-shop-dia-badge">💎 <b data-diamond-count>${diaText}</b></span>
        <span class="card-shop-dia-hint">+1 💎 setiap ${diaStep} soal benar</span>
      </div>
      <div class="card-shop-tabs" role="tablist">
        <button type="button" class="card-shop-tab${shopTab === 'cards' ? ' on' : ''}" data-shop-tab="cards" role="tab" aria-selected="${shopTab === 'cards'}">🃏 Kartu</button>
        <button type="button" class="card-shop-tab${shopTab === 'banners' ? ' on' : ''}" data-shop-tab="banners" role="tab" aria-selected="${shopTab === 'banners'}">🎨 Banner (${BANNER_CATALOG.length}) <span class="shop-tab-new" data-tab-new="banner"${newBannersCnt ? '' : ' hidden'}>NEW</span></button>
        <button type="button" class="card-shop-tab${shopTab === 'decos' ? ' on' : ''}" data-shop-tab="decos" role="tab" aria-selected="${shopTab === 'decos'}">✨ Dekorasi (${DECO_CATALOG.length}) <span class="shop-tab-new" data-tab-new="deco"${newDecosCnt ? '' : ' hidden'}>NEW</span></button>
      </div>
      ${shopTab === 'banners' ? buildBannerShop() : shopTab === 'decos' ? buildDecoShop() : cardsBody}
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

  const KEY_SEEN_NEW = 'clined_seen_cosmetics_v1';
  let newCosmeticObserver = null;
  const newCosmeticTimers = new Map();

  function getSeenCosmetics() {
    try {
      const arr = JSON.parse(localStorage.getItem(KEY_SEEN_NEW) || '[]');
      return new Set(Array.isArray(arr) ? arr.filter(x => typeof x === 'string') : []);
    } catch { return new Set(); }
  }
  function markCosmeticSeen(key) {
    if (!key) return false;
    const set = getSeenCosmetics();
    if (set.has(key)) return false;
    set.add(key);
    try { localStorage.setItem(KEY_SEEN_NEW, JSON.stringify([...set])); } catch {}
    return true;
  }
  function getUnseenNewCount(kind) {
    const seen = getSeenCosmetics();
    if (kind === 'banner') return BANNER_CATALOG.filter(b => b.isNew && !seen.has('banner:' + b.id)).length;
    if (kind === 'deco') return DECO_CATALOG.filter(d => d.isNew && !seen.has('deco:' + d.id)).length;
    return getUnseenNewCount('banner') + getUnseenNewCount('deco');
  }
  function updateNewBadgesUI() {
    const bCnt = getUnseenNewCount('banner');
    const dCnt = getUnseenNewCount('deco');
    const total = bCnt + dCnt;
    const fabBadge = document.querySelector('#cardShopFab .fab-new-badge');
    if (fabBadge) fabBadge.hidden = total === 0;
    const tabB = document.querySelector('#cardShopContainer [data-tab-new="banner"]');
    if (tabB) tabB.hidden = bCnt === 0;
    const tabD = document.querySelector('#cardShopContainer [data-tab-new="deco"]');
    if (tabD) tabD.hidden = dCnt === 0;
  }
  function stopObservingNewCosmetics() {
    if (newCosmeticObserver) { newCosmeticObserver.disconnect(); newCosmeticObserver = null; }
    for (const t of newCosmeticTimers.values()) clearTimeout(t);
    newCosmeticTimers.clear();
  }
  function observeNewCosmetics() {
    stopObservingNewCosmetics();
    const sheet = document.querySelector('#cardShopContainer .card-shop-sheet');
    if (!sheet) return;
    const targets = sheet.querySelectorAll('[data-new-cosmetic]');
    if (!targets.length) return;
    if (typeof IntersectionObserver !== 'function') {
      targets.forEach(el => {
        markCosmeticSeen(el.getAttribute('data-new-cosmetic'));
        el.querySelector('.cosmetic-new-badge')?.classList.add('is-seen');
      });
      updateNewBadgesUI();
      return;
    }
    newCosmeticObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const el = entry.target;
        const key = el.getAttribute('data-new-cosmetic');
        if (!key) continue;
        if (entry.isIntersecting) {
          if (!newCosmeticTimers.has(key)) {
            const tm = setTimeout(() => {
              newCosmeticTimers.delete(key);
              markCosmeticSeen(key);
              el.querySelector('.cosmetic-new-badge')?.classList.add('is-seen');
              newCosmeticObserver?.unobserve(el);
              updateNewBadgesUI();
            }, 650);
            newCosmeticTimers.set(key, tm);
          }
        } else if (newCosmeticTimers.has(key)) {
          clearTimeout(newCosmeticTimers.get(key));
          newCosmeticTimers.delete(key);
        }
      }
    }, { root: sheet, threshold: 0.35 });
    targets.forEach(el => newCosmeticObserver.observe(el));
  }

  function refreshShop() {
    const c = document.getElementById('cardShopContainer');
    if (c) {
      c.innerHTML = buildShop();
      bindShop();
      observeNewCosmetics();
      updateNewBadgesUI();
    }
  }
  function bindShop() {
    document.getElementById('closeCardShop')?.addEventListener('click', hideShop);
    document.querySelectorAll('#cardShopContainer [data-toggle-xp100k]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const enabled = btn.getAttribute('data-toggle-xp100k') === '1';
        btn.disabled = true;
        try {
          const r = await fetch('/api/auth/badge-100k', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled })
          });
          const d = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(d.error || 'Gagal mengatur badge 100K.');
          const me = typeof authCurrentUser === 'function' ? authCurrentUser() : null;
          if (me && d.user) {
            me.xp100k = Boolean(d.user.xp100k);
            me.xp100kToggleable = Boolean(d.user.xp100kToggleable);
            me.xp100kUnlocked = Boolean(d.user.xp100kUnlocked);
          }
          window.dispatchEvent(new Event('clined:profile-style'));
          window.showToast?.(enabled ? '⚜️ Badge 100K Legend dinyalakan!' : 'Badge 100K Legend dimatikan.');
          refreshShop();
        } catch (e) {
          window.showToast?.(e.message || 'Gagal mengatur badge 100K.', true);
          btn.disabled = false;
        }
      });
    });
    document.querySelectorAll('#cardShopContainer [data-pick-name-color]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const color = btn.getAttribute('data-pick-name-color') || '';
        btn.disabled = true;
        try {
          const r = await fetch('/api/auth/name-color', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ color })
          });
          const d = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(d.error || 'Gagal mengganti warna nama.');
          const me = typeof authCurrentUser === 'function' ? authCurrentUser() : null;
          if (me && d.user) me.nameColor = d.user.nameColor || '';
          window.dispatchEvent(new Event('clined:profile-style'));
          window.showToast?.('Warna nama chat diperbarui!');
          refreshShop();
        } catch (e) {
          window.showToast?.(e.message || 'Gagal mengganti warna nama.', true);
          btn.disabled = false;
        }
      });
    });
    document.querySelectorAll('#cardShopContainer [data-pick-avatar-photo]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (typeof window.pickAccountAvatar === 'function') window.pickAccountAvatar();
        else document.getElementById('accountAvatarFile')?.click();
      });
    });
    document.querySelectorAll('#cardShopContainer [data-shop-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const next = btn.getAttribute('data-shop-tab');
        if (next && next !== shopTab) { shopTab = next; refreshShop(); }
      });
    });
    document.querySelectorAll('#cardShopContainer [data-banner-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-banner-id');
        const item = BANNER_CATALOG.find(b => b.id === id);
        if (!item) return;
        if (item.adminOnly && !isAdmin()) { window.showToast?.('🔒 Nameplate ini khusus Admin.'); return; }
        const owned = getOwnedBanners();
        const isOwned = owned.includes(id);
        const me = typeof authCurrentUser === 'function' ? authCurrentUser() : null;
        if (!isOwned) {
          const freeAvail = !isFreeBannerClaimed() && !item.adminOnly;
          if (freeAvail) {
            markFreeBannerClaimed();
            setOwnedBanners([...owned, id]);
            setEquippedBanner(id);
            if (me) me.bannerUrl = item.img;
            window.showToast?.(`🎁 ${item.icon} ${item.name} diklaim gratis & dipasang!`);
          } else {
            if (getDia() < item.price) { window.showToast?.(`Diamond kurang (butuh ${item.price} 💎).`); return; }
            setDia(getDia() - item.price);
            setOwnedBanners([...owned, id]);
            setEquippedBanner(id);
            if (me) me.bannerUrl = item.img;
            window.showToast?.(`${item.icon} ${item.name} dibeli & dipasang!`);
          }
        } else if (getEquippedBanner() === id) {
          setEquippedBanner('');
          if (me) me.bannerUrl = '';
          window.showToast?.('Background chat dilepas.');
        } else {
          setEquippedBanner(id);
          if (me) me.bannerUrl = item.img;
          window.showToast?.(`${item.icon} ${item.name} dipasang!`);
        }
        window.dispatchEvent(new Event('clined:profile-style'));
        refreshShop();
      });
    });
    document.querySelectorAll('#cardShopContainer [data-banner-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        const next = btn.getAttribute('data-banner-filter') || 'all';
        if (next !== bannerFilter) { bannerFilter = next; refreshShop(); }
      });
    });
    document.querySelectorAll('#cardShopContainer [data-deco-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        const next = btn.getAttribute('data-deco-filter') || 'all';
        if (next !== decoFilter) { decoFilter = next; refreshShop(); }
      });
    });
    document.querySelectorAll('#cardShopContainer [data-deco-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-deco-id');
        const item = DECO_CATALOG.find(x => x.id === id);
        if (!item) return;
        const owned = getOwnedDecos();
        const isOwned = owned.includes(id);
        const me = typeof authCurrentUser === 'function' ? authCurrentUser() : null;
        if (!isOwned) {
          const freeAvail = !isFreeDecoClaimed();
          if (freeAvail) {
            markFreeDecoClaimed();
            setOwnedDecos([...owned, id]);
            setEquippedDeco(id);
            if (me) me.avatarDeco = item.img;
            window.showToast?.(`🎁 ${item.icon} ${item.name} diklaim gratis & dipasang!`);
          } else {
            if (getDia() < item.price) { window.showToast?.(`Diamond kurang (butuh ${item.price} 💎).`); return; }
            setDia(getDia() - item.price);
            setOwnedDecos([...owned, id]);
            setEquippedDeco(id);
            if (me) me.avatarDeco = item.img;
            window.showToast?.(`${item.icon} ${item.name} dibeli & dipasang!`);
          }
        } else if (getEquippedDeco() === id) {
          setEquippedDeco('');
          if (me) me.avatarDeco = '';
          window.showToast?.('Dekorasi avatar dilepas.');
        } else {
          setEquippedDeco(id);
          if (me) me.avatarDeco = item.img;
          window.showToast?.(`${item.icon} ${item.name} dipasang!`);
        }
        window.dispatchEvent(new Event('clined:profile-style'));
        if (typeof renderAccount === 'function') try { renderAccount(); } catch {}
        refreshShop();
      });
    });
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
  function showShop(tab) {
    if (tab === 'cards' || tab === 'banners' || tab === 'decos') shopTab = tab;
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
    stopObservingNewCosmetics();
    updateNewBadgesUI();
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
    const hasNew = getUnseenNewCount('all') > 0;
    fab.innerHTML = `<span class="fab-new-badge"${hasNew ? '' : ' hidden'}>NEW</span><img class="fab-basket-img" src="assets/cards/fab-basket.png" alt="">
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

  let cosmeticTutShownThisLoad = false;
  function showCosmeticTutorial(force) {
    if (document.getElementById('cosmeticObLayer')) return;
    const isVisible = el => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.width > 4 && r.height > 4 && getComputedStyle(el).visibility !== 'hidden';
    };
    const findTarget = sel => !sel ? null : sel.split(',').map(s => document.querySelector(s.trim())).find(isVisible) || null;
    const allSteps = [
      {
        sel: '#homeProfileShowcase',
        icon: '🪪',
        title: 'Profil Clinical Progress',
        text: 'Di sini tampil Nameplate, Dekorasi Avatar, dan warna namamu. Ketuk fotomu atau ✨ Hias untuk masuk ke halaman kustomisasi & ganti foto profil bulat!'
      },
      {
        sel: '#homeProfileEditBtn, .card-shop-fab',
        icon: '🎨',
        title: 'Ganti Foto, Nameplates & Dekorasi',
        text: 'Di dalam ✨ Hias (atau keranjang 🧺), kamu bisa ganti foto profil bulat besar, pasang Nameplate, & Dekorasi Avatar. Setiap akun mendapat 1x Nameplate Gratis & 1x Dekorasi Gratis!'
      },
      {
        sel: '#leaderboardTeaser, #floatingDashboardNav',
        icon: '🏆',
        title: 'Tampil di Leaderboard & Sosial',
        text: 'Nameplate, warna nama bercahaya, dan dekorasi avatarmu otomatis tampil di Beranda, Leaderboard, Chat, Teman, dan Duel!'
      }
    ];
    const steps = allSteps.filter(s => !s.sel || findTarget(s.sel));
    if (!steps.length) return;

    let idx = 0;
    const layer = document.createElement('div');
    layer.id = 'cosmeticObLayer';
    layer.className = 'ob-layer';
    document.body.appendChild(layer);

    const place = () => {
      if (!layer.isConnected) return;
      const st = steps[idx];
      const el = findTarget(st.sel);
      const hole = layer.querySelector('.ob-hole');
      const sheet = layer.querySelector('.ob-sheet');
      if (!hole || !sheet) return;
      if (!el) { hole.style.display = 'none'; sheet.classList.remove('top'); return; }
      const r = el.getBoundingClientRect(), pad = 6;
      Object.assign(hole.style, {
        display: 'block',
        top: (r.top - pad) + 'px',
        left: (r.left - pad) + 'px',
        width: (r.width + pad * 2) + 'px',
        height: (r.height + pad * 2) + 'px'
      });
      sheet.classList.toggle('top', r.top + r.height / 2 > window.innerHeight * 0.55);
    };

    const closeTut = (openTab) => {
      if (!force) markCosmeticTutorialDone();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      layer.remove();
      if (openTab) showShop(openTab);
    };

    const renderStep = () => {
      const st = steps[idx];
      const isLast = idx === steps.length - 1;
      const freeB = !isFreeBannerClaimed();
      const freeD = !isFreeDecoClaimed();
      const claimRow = isLast && (freeB || freeD) ? `<div class="cosmetic-ob-claims">
        ${freeB ? '<button type="button" class="cosmetic-ob-claim-btn" data-cob-open="banners">🎨 Klaim Nameplate Gratis</button>' : ''}
        ${freeD ? '<button type="button" class="cosmetic-ob-claim-btn" data-cob-open="decos">✨ Klaim Dekorasi Gratis</button>' : ''}
      </div>` : '';
      layer.innerHTML = `<div class="ob-hole"></div>
        <div class="ob-sheet" role="dialog" aria-modal="true" aria-label="Tutorial Fitur Profil">
          <div class="ob-step"><span class="ob-ico">${st.icon}</span><div><b>${esc(st.title)}</b><p>${esc(st.text)}</p></div></div>
          ${claimRow}
          <div class="ob-foot">
            <div class="ob-dots">${steps.map((_, i) => `<i class="${i === idx ? 'on' : ''}"></i>`).join('')}</div>
            ${idx > 0 ? '<button type="button" class="ob-skip ob-prev" data-cob-prev>‹ Kembali</button>' : ''}
            <button type="button" class="ob-skip" data-cob-skip>${isLast ? '' : 'Lewati'}</button>
            <button type="button" class="primary ob-next" data-cob-next>${isLast ? 'Selesai' : 'Lanjut ›'}</button>
          </div>
        </div>`;
      const el = findTarget(st.sel);
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.top < 70 || r.bottom > window.innerHeight - 70) el.scrollIntoView({ block: 'center', behavior: 'auto' });
      }
      place();
    };

    layer.addEventListener('click', e => {
      if (e.target.closest('[data-cob-skip]')) return closeTut('');
      const openTab = e.target.closest('[data-cob-open]')?.getAttribute('data-cob-open');
      if (openTab) return closeTut(openTab);
      if (e.target.closest('[data-cob-prev]')) { if (idx > 0) { idx--; renderStep(); } return; }
      if (e.target.closest('[data-cob-next]')) { if (idx >= steps.length - 1) return closeTut(''); idx++; renderStep(); }
    });
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    renderStep();
  }

  function maybeStartCosmeticTutorial() {
    if (cosmeticTutShownThisLoad || isCosmeticTutorialDone()) return;
    if (!serverHydrated) return;
    const u = typeof authCurrentUser === 'function' ? authCurrentUser() : null;
    if (!u || !u.id) return;
    if (!document.getElementById('home')?.classList.contains('active')) return;
    if (document.getElementById('obLayer')) return;
    const blockingModal = [...document.querySelectorAll('.account-modal, #accountModal, #authModal, #cardShopModal')].some(m => m.classList?.contains('open') || (!m.hidden && m.offsetParent !== null));
    if (blockingModal) return;
    cosmeticTutShownThisLoad = true;
    showCosmeticTutorial(false);
  }

  function boot() {
    createFab();
    watchHomeContext();
    injectDiamondStatCell();
    updateDiaBadges();
    renderHomeShowcaseBadge();
    hydrateFromServer();
    window.addEventListener('clined:sync-applied', onExternalSync);
    window.addEventListener('clined:profile-style', onExternalSync);
    window.addEventListener('clined:auth-ready', () => { hydrateFromServer(); setTimeout(onExternalSync, 600); });
    window.addEventListener('clined:view-change', e => { if (e.detail === 'home') setTimeout(maybeStartCosmeticTutorial, 1200); });
    window.addEventListener('clined:quiz-finished', e => {
      if (isAdmin()) return;
      const d = e.detail || {};
      const validTotal = Number(d.validTotal || 0);
      const score = Number(d.score || 0);
      if (validTotal < 10 || score < 5) return;
      const bonus = validTotal >= 50 && score >= 25 ? 5 : 3;
      setDia(getDia() + bonus);
      updateDiaBadges();
      popDiamondToast(`💎 +${bonus} Diamond Bonus Selesai Kuis!`);
    });
    window.addEventListener('online', () => { if (cardDirty) pushServerCardState('merge'); else hydrateFromServer(); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && cardDirty) pushServerCardState('save', true); });
    window.addEventListener('pagehide', () => { if (cardDirty) pushServerCardState('save', true); });
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();

  const seenGrantIds = new Set();
  let grantBannerTimer = null;
  function showDiamondGrantBanner(data) {
    const amount = Math.max(0, Math.floor(Number(data?.amount) || 0));
    if (!amount) return;
    const isAll = data?.scope === 'all';
    const amtText = amount.toLocaleString('id-ID');
    const old = document.getElementById('clinedDiaGrantBanner');
    if (old) old.remove();
    clearTimeout(grantBannerTimer);

    const el = document.createElement('div');
    el.id = 'clinedDiaGrantBanner';
    el.className = 'dia-grant-banner';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    const msg = isAll
      ? `Admin telah memberikan semua orang yang sedang online tambahan diamond sebanyak <b>${amtText} 💎</b>`
      : `Admin telah memberikan kamu tambahan diamond sebanyak <b>${amtText} 💎</b>`;
    el.innerHTML = `<div class="dgb-ico" aria-hidden="true">💎</div><div class="dgb-body"><div class="dgb-title">${isAll ? 'Bonus Diamond Member Online' : 'Bonus Diamond Dari Admin'}</div><div class="dgb-msg">${msg}</div></div><button type="button" class="dgb-x" aria-label="Tutup">✕</button>`;
    const dismiss = () => {
      clearTimeout(grantBannerTimer);
      el.classList.remove('show');
      setTimeout(() => el.remove(), 340);
    };
    el.querySelector('.dgb-x')?.addEventListener('click', dismiss);
    document.body.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
    grantBannerTimer = setTimeout(dismiss, 6500);
  }

  function onAdminGrant(data) {
    if (!data || !Number(data.amount)) return;
    if (data.id) {
      if (seenGrantIds.has(data.id)) return;
      seenGrantIds.add(data.id);
      if (seenGrantIds.size > 40) seenGrantIds.clear();
    }
    const amt = Math.max(0, Math.floor(Number(data.amount) || 0));
    if (!isAdmin() && amt > 0) {
      applyingServer = true;
      try {
        if (Number.isFinite(Number(data.diamonds))) {
          localStorage.setItem(KEY_DIA, String(Math.max(0, Math.floor(Number(data.diamonds)))));
        } else {
          const cur = parseInt(localStorage.getItem(KEY_DIA) || '0', 10) || 0;
          localStorage.setItem(KEY_DIA, String(cur + amt));
        }
      } finally { applyingServer = false; }
      onExternalSync();
      if (!Number.isFinite(Number(data.diamonds))) {
        hydrateFromServer().catch(() => {});
      }
    }
    showDiamondGrantBanner(data);
  }

  window.CLINED_CARD_SHOP = { show: showShop, hide: hideShop, showCosmeticTutorial: () => showCosmeticTutorial(true) };
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
    onAdminGrant,
    onXp100kReward: diamonds => {
      if (!Number.isFinite(Number(diamonds))) return;
      applyingServer = true;
      try {
        localStorage.setItem(KEY_DIA, String(Math.max(0, Math.floor(Number(diamonds)))));
      } finally { applyingServer = false; }
      onExternalSync();
    },
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
