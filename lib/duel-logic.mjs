// Logika duel yang murni (tanpa DB) agar mudah diuji.
export const DUEL_MAX_MS = 15 * 60 * 1000;     // batas total satu duel setelah dimulai
export const WAIT_MAX_MS = 30 * 60 * 1000;     // undangan/kode kedaluwarsa
export const TIME_OPTIONS = [0, 15, 30, 45, 60];  // detik per soal (0 = tanpa batas)
export const MODES = ['classic', 'sudden_death'];
export const WAGERS = [0, 20, 50];
export const MAX_HEARTS = 3;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 100;
export const EMOTES = [
  { id: 'fire', emoji: '🔥', text: 'Gas terus!' },
  { id: 'hard', emoji: '😱', text: 'Soal sulit!' },
  { id: 'fast', emoji: '⚡', text: 'Kejar kalau bisa!' },
  { id: 'brain', emoji: '🧠', text: 'Hafal nih!' },
  { id: 'skull', emoji: '💀', text: 'Awas nyawa habis!' },
  { id: 'gg', emoji: '🙏', text: 'GGWP!' }
];
export const GRACE_MS = 1500;
export const REVEAL_MS = 1200;                 // jeda lihat benar/salah sebelum soal berikutnya (duel ber-timer)

export const RANK_TIERS = [
  { key: 'bronze',   name: 'Bronze',   sub: 'Koas Muda',         icon: '🥉', minRp: 0,    maxRp: 199,      color: '#cd7f32', divisions: 3 },
  { key: 'silver',   name: 'Silver',   sub: 'Residen Tangguh',   icon: '🥈', minRp: 200,  maxRp: 449,      color: '#94a3b8', divisions: 3 },
  { key: 'gold',     name: 'Gold',     sub: 'Spesialis Arena',   icon: '🥇', minRp: 450,  maxRp: 799,      color: '#facc15', divisions: 3 },
  { key: 'platinum', name: 'Platinum', sub: 'Konsultan Unggul',  icon: '💎', minRp: 800,  maxRp: 1199,     color: '#2dd4bf', divisions: 3 },
  { key: 'diamond',  name: 'Diamond',  sub: 'Gladiator Klinik',  icon: '🔮', minRp: 1200, maxRp: 1699,     color: '#38bdf8', divisions: 3 },
  { key: 'master',   name: 'Master',   sub: 'Grandmaster Medis', icon: '🔥', minRp: 1700, maxRp: 2299,     color: '#ec4899', divisions: 3 },
  { key: 'mythic',   name: 'Mythic',   sub: 'Dewa Klinik',       icon: '👑', minRp: 2300, maxRp: Infinity, color: '#fde047', divisions: 1 }
];

export function rankFromRp(rawRp = 0) {
  const rp = Math.max(0, Math.floor(Number(rawRp) || 0));
  let idx = 0;
  for (let i = 0; i < RANK_TIERS.length; i++) {
    if (rp >= RANK_TIERS[i].minRp) idx = i;
  }
  const tier = RANK_TIERS[idx];
  const nextTier = RANK_TIERS[idx + 1] || null;
  let division = 'Glory', stars = 1, progressPct = 100;
  if (tier.divisions === 3 && Number.isFinite(tier.maxRp)) {
    const span = tier.maxRp - tier.minRp + 1;
    const within = Math.max(0, rp - tier.minRp);
    const divSpan = span / 3;
    const divIdx = Math.min(2, Math.floor(within / divSpan)); // 0 -> III, 1 -> II, 2 -> I
    division = ['III', 'II', 'I'][divIdx];
    const withinDiv = within - divIdx * divSpan;
    stars = Math.min(3, Math.max(1, Math.floor((withinDiv / divSpan) * 3) + 1));
    progressPct = Math.min(100, Math.max(0, Math.round((within / span) * 100)));
  } else {
    stars = Math.max(1, Math.floor((rp - tier.minRp) / 50) + 1);
    progressPct = 100;
  }
  const fullName = tier.divisions > 1 ? `${tier.name} ${division}` : 'Mythic Glory';
  const nextRp = nextTier ? nextTier.minRp : null;
  const neededRp = nextRp != null ? Math.max(0, nextRp - rp) : 0;
  return {
    rp,
    tierIdx: idx,
    key: tier.key,
    name: tier.name,
    division,
    fullName,
    sub: tier.sub,
    icon: tier.icon,
    color: tier.color,
    stars,
    minRp: tier.minRp,
    nextRp,
    neededRp,
    nextTierName: nextTier ? `${nextTier.icon} ${nextTier.name} III` : '👑 Puncak Mythic Glory',
    progressPct
  };
}

export function calcMatchRpDelta({ outcome, currentRp = 0, streak = 0, mode = 'classic', wager = 0, reason = '' } = {}) {
  const rp = Math.max(0, Math.floor(Number(currentRp) || 0));
  if (outcome === 'win') {
    const base = 30;
    const modeBonus = mode === 'sudden_death' ? (reason === 'knockout' ? 12 : 6) : 0;
    const streakBonus = streak >= 2 ? Math.min(15, (streak - 1) * 5) : 0;
    const wagerBonus = Number(wager) >= 50 ? 10 : Number(wager) >= 20 ? 5 : 0;
    return base + modeBonus + streakBonus + wagerBonus;
  }
  if (outcome === 'draw') return 8;
  // kalah: Bronze (< 200 RP) mendapat proteksi penuh (0 RP)
  if (rp < 200) return 0;
  const baseLoss = rp >= 1200 ? 18 : rp >= 800 ? 15 : 12;
  const forfeitExtra = reason === 'forfeit' ? 4 : 0;
  return -Math.min(rp, baseLoss + forfeitExtra);
}

export const VALID_CARDS = [
  'pulmo', 'gaster', 'intestinum', 'vesica', 'auris', 'thyroidea', 'cutis',
  'cor', 'hepar', 'pancreas', 'ren', 'costae', 'vertebra',
  'cerebrum', 'oculus', 'splen', 'uterus', 'neuron',
  'skull', 'leukocytus'
];

export function cleanShowcaseCard(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    const id = raw.trim().toLowerCase();
    return VALID_CARDS.includes(id) ? { id, star: 1 } : null;
  }
  if (typeof raw !== 'object') return null;
  const id = String(raw.id || '').trim().toLowerCase();
  if (!VALID_CARDS.includes(id)) return null;
  const star = Math.max(1, Math.min(5, Math.floor(Number(raw.star) || 1)));
  return { id, star };
}

export function duelMeta(d) {
  const m = (d?.answers && typeof d.answers === 'object' && !Array.isArray(d.answers) && d.answers._meta) || {};
  const mode = MODES.includes(m.mode || d?.mode) ? (m.mode || d.mode) : 'classic';
  const wager = WAGERS.includes(Number(m.wager ?? d?.wager)) ? Number(m.wager ?? d?.wager) : 0;
  const isPublic = m.isPublic !== undefined ? !!m.isPublic : (d?.isPublic !== undefined ? !!d.isPublic : !d?.invitedId);
  const hostCard = cleanShowcaseCard(m.hostCard || d?.hostCard);
  const guestCard = cleanShowcaseCard(m.guestCard || d?.guestCard);
  return { mode, wager, isPublic, hostCard, guestCard };
}

/** Batas akhir seluruh duel. Dengan timer per soal: n × batas + 60 dtk; tanpa timer: 15 menit. */
export function deadlineOf(d) {
  if (!d.startedAt) return null;
  return d.startedAt + (d.perQ > 0 ? d.questions.length * d.perQ + 60_000 : DUEL_MAX_MS);
}
/** Kapan soal berikutnya milik pemain dimulai (jawaban terakhir, atau awal duel). */
export function questionStart(d, userId) {
  const arr = Array.isArray(d.answers?.[userId]) ? d.answers[userId] : [];
  return arr.length ? Number(arr[arr.length - 1].at) + (d.perQ > 0 ? REVEAL_MS : 0) : d.startedAt;
}
/** Terlambat? (hanya bermakna bila ada timer per soal) */
export function isLate(d, userId, now = Date.now()) {
  return d.perQ > 0 && now - questionStart(d, userId) > d.perQ + GRACE_MS;
}
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // tanpa huruf/angka yang mirip

export function makeCode(rnd = Math.random) {
  let s = ''; for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(rnd() * ALPHABET.length)];
  return s;
}
export const normalizeCode = v => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

export function validQuestion(q) {
  return !!q && typeof q === 'object' && String(q.id ?? '').trim() !== '' && String(q.soal ?? '').trim() !== ''
    && Array.isArray(q.opsi) && q.opsi.length >= 2 && q.opsi.length <= 6 && q.opsi.every(o => String(o ?? '').trim() !== '')
    && Number.isInteger(q.jawabanBenar) && q.jawabanBenar >= 0 && q.jawabanBenar < q.opsi.length;
}
export function shuffle(arr, rnd = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
/** Normalisasi nama blok agar konsisten antara question_banks, content_packages, dan UI Duel. */
export function canonicalDuelBlock(raw) {
  const v = String(raw ?? '')
    .trim()
    .replace(/^block:/i, '')
    .replace(/^BLOK\s+/i, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .toUpperCase();
  if (!v) return '';
  if (v === 'KEDOKTERAN KOMUNITAS' || v === 'KEDOKOM' || v === 'KEDKOM') return 'KEDKOM';
  if (v === 'KEDOKTERAN KELUARGA' || v === 'KEDKEL') return 'KEDKEL';
  if (v === 'MUSKULO' || v === 'MUSKULOSKELETAL') return 'MUSKULOSKELETAL';
  if (v === 'ENDO' || v === 'ENDOKRIN' || v === 'ENDOKRINE') return 'ENDOKRINE';
  if (v === 'RESPIRASI' || v === 'RESPIRATORY') return 'RESPIRATORY';
  if (v === 'KARDIO' || v === 'KARDIOVASKULAR' || v === 'KARDIOLOGI') return 'KARDIOLOGI';
  if (v === 'GASTRO' || v === 'GASTROINTESTINAL' || v === 'GIT') return 'GIT';
  if (v === 'PANCAINDRA' || v === 'PANCA INDRA') return 'PANCA INDRA';
  return v;
}

export function duelBlockLabel(block) {
  const b = canonicalDuelBlock(block);
  return b ? `BLOK ${b}` : 'BLOK';
}

function extractOptionExplanations(q, opsiLen) {
  if (Array.isArray(q?.pembahasanPilihan) && q.pembahasanPilihan.some(x => String(x || '').trim())) {
    return Array.from({ length: opsiLen }, (_, i) => String(q.pembahasanPilihan[i] ?? '').trim().slice(0, 3000));
  }
  const pk = q?.pembahasan_klinis;
  if (pk && typeof pk === 'object' && !Array.isArray(pk)) {
    const arr = Array.from({ length: opsiLen }, (_, i) => {
      const letter = String.fromCharCode(65 + i);
      return String(pk[letter] ?? pk[letter.toLowerCase()] ?? pk[i] ?? '').trim().slice(0, 3000);
    });
    if (arr.some(Boolean)) return arr;
  }
  return null;
}

function snapshotQuestion(q, idOverride) {
  const opsi = q.opsi.map(String);
  const perOpt = extractOptionExplanations(q, opsi.length);
  const catatan = String(q.catatanKlinis ?? '').trim().slice(0, 3000);
  return {
    id: String(idOverride ?? q.id),
    soal: String(q.soal),
    opsi,
    jawabanBenar: q.jawabanBenar,
    pembahasan: String(q.pembahasan ?? '').slice(0, 8000),
    ...(perOpt ? { pembahasanPilihan: perOpt } : {}),
    ...(catatan ? { catatanKlinis: catatan } : {})
  };
}

/** Ambil n soal acak yang valid; simpan salinan (snapshot) supaya duel tidak berubah kalau bank diedit. */
export function pickQuestions(all, n, rnd = Math.random) {
  const ok = (Array.isArray(all) ? all : []).filter(validQuestion);
  return shuffle(ok, rnd).slice(0, n).map(q => snapshotQuestion(q));
}

/**
 * Ambil n soal secara acak merata dari SETIAP bank soal di dalam satu blok.
 * - Setiap bank yang punya soal valid diacak urutannya, lalu bank-bank juga diacak.
 * - Pengambilan round-robin memastikan soal berasal dari beragam bank dalam blok,
 *   bukan hanya dari bank yang jumlah soalnya paling besar.
 * - Deduplikasi berdasarkan teks soal agar soal kembar antar-bank tidak muncul dua kali.
 */
export function pickQuestionsAcrossBanks(bankQuestionLists, n, rnd = Math.random) {
  const target = Math.max(0, Math.floor(Number(n) || 0));
  if (!target || !Array.isArray(bankQuestionLists) || !bankQuestionLists.length) return [];
  const pools = [];
  for (let bi = 0; bi < bankQuestionLists.length; bi++) {
    const raw = Array.isArray(bankQuestionLists[bi]) ? bankQuestionLists[bi] : (Array.isArray(bankQuestionLists[bi]?.questions) ? bankQuestionLists[bi].questions : []);
    const valid = raw.filter(validQuestion);
    if (valid.length) pools.push({ idx: bi, items: shuffle(valid, rnd), cursor: 0 });
  }
  if (!pools.length) return [];
  const orderedPools = shuffle(pools, rnd);
  const picked = [];
  const seenText = new Set();
  const seenIds = new Set();

  let progressed = true;
  while (picked.length < target && progressed) {
    progressed = false;
    for (const pool of orderedPools) {
      if (picked.length >= target) break;
      while (pool.cursor < pool.items.length) {
        const q = pool.items[pool.cursor++];
        const textKey = String(q.soal).trim().toLowerCase().replace(/\s+/g, ' ');
        if (seenText.has(textKey)) continue;
        seenText.add(textKey);
        let qid = String(q.id);
        if (seenIds.has(qid)) qid = `${qid}#b${pool.idx}_${picked.length}`;
        seenIds.add(qid);
        picked.push(snapshotQuestion(q, qid));
        progressed = true;
        break;
      }
    }
  }
  return shuffle(picked, rnd);
}
export function gradeAnswer(q, choice) {
  if (!q || !Number.isInteger(choice) || choice < 0 || choice >= q.opsi.length) return null;
  return { ok: choice === q.jawabanBenar, correctIdx: q.jawabanBenar };
}
export function playerStats(entries, startMs, total) {
  const e = Array.isArray(entries) ? entries : [];
  return {
    answered: e.length, score: e.filter(x => x && x.ok).length, done: e.length >= total,
    timeMs: e.length ? Math.max(0, Number(e[e.length - 1].at) - startMs) : 0
  };
}
export function combatStats(entries, mode = 'classic') {
  const e = Array.isArray(entries) ? entries : [];
  let streak = 0, maxStreak = 0, wrong = 0, score = 0;
  for (const x of e) {
    if (x && x.ok) {
      score++;
      streak++;
      if (streak > maxStreak) maxStreak = streak;
    } else {
      wrong++;
      streak = 0;
    }
  }
  const hearts = mode === 'sudden_death' ? Math.max(0, MAX_HEARTS - wrong) : MAX_HEARTS;
  const eliminated = mode === 'sudden_death' && wrong >= MAX_HEARTS;
  const lastAt = e.length ? Number(e[e.length - 1]?.at) || 0 : 0;
  return { streak, maxStreak, wrong, hearts, eliminated, liveScore: score, lastAt };
}
export function clampMaxPlayers(raw, fallback = MIN_PLAYERS) {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < MIN_PLAYERS) return fallback;
  return Math.min(MAX_PLAYERS, n);
}

export function roomCapacity(d) {
  const m = (d?.answers && typeof d.answers === 'object' && !Array.isArray(d.answers) && d.answers._meta) || {};
  return clampMaxPlayers(d?.maxPlayers ?? m.maxPlayers ?? MIN_PLAYERS, MIN_PLAYERS);
}

export function playerIds(d) {
  const out = [];
  const add = id => { if (id && !out.includes(id)) out.push(id); };
  add(d?.hostId);
  if (Array.isArray(d?.participantIds)) {
    for (const id of d.participantIds) add(id);
  }
  add(d?.guestId);
  return out;
}

export function isMultiplayer(d) {
  return roomCapacity(d) > 2 || playerIds(d).length > 2;
}

export function forfeitedMap(d) {
  const f = d?.answers?._meta?.forfeited;
  return f && typeof f === 'object' && !Array.isArray(f) ? f : {};
}

export function playerCardFor(d, uid) {
  if (!uid) return null;
  const m = (d?.answers && typeof d.answers === 'object' && !Array.isArray(d.answers) && d.answers._meta) || {};
  if (m.playerCards && typeof m.playerCards === 'object' && m.playerCards[uid]) {
    return cleanShowcaseCard(m.playerCards[uid]);
  }
  const { hostCard, guestCard } = duelMeta(d);
  if (uid === d?.hostId) return hostCard;
  if (uid === d?.guestId) return guestCard;
  return null;
}

/**
 * Peringkat semua pemain (2–15 orang) secara individual berdasarkan:
 * 1. Tidak menyerah (forfeited paling bawah)
 * 2. Pada Sudden Death: masih bertahan (belum KO) di atas yang KO
 * 3. Total skor benar tertinggi (score DESC)
 * 4. Sudah menyelesaikan semua soal sebelum yang belum selesai (bila seri skor)
 * 5. Kecepatan total tercepat (timeMs ASC — semakin kecil semakin cepat)
 */
export function rankPlayers(d, people = {}, online = () => false) {
  const total = Array.isArray(d?.questions) ? d.questions.length : 0;
  const { mode } = duelMeta(d);
  const forf = forfeitedMap(d);
  const ids = playerIds(d);
  const rows = ids.map((id, joinIdx) => {
    const entries = Array.isArray(d?.answers?.[id]) ? d.answers[id] : [];
    const st = playerStats(entries, d?.startedAt || 0, total);
    const cb = combatStats(entries, mode);
    const p = people[id] || {};
    const forfeited = Boolean(forf[id]);
    const avgMs = st.answered > 0 ? Math.round(st.timeMs / st.answered) : 0;
    return {
      id,
      joinIdx,
      isHost: id === d?.hostId,
      name: p.name || 'Pemain',
      username: p.username || '',
      avatarUrl: p.avatarUrl || '',
      avatarDeco: p.avatarDeco || '',
      bannerUrl: p.bannerUrl || '',
      nameColor: p.nameColor || '',
      online: !!online(id),
      card: playerCardFor(d, id),
      answered: st.answered,
      score: st.score,
      total,
      done: st.done,
      timeMs: st.timeMs,
      avgMs,
      streak: cb.streak,
      maxStreak: cb.maxStreak,
      wrong: cb.wrong,
      hearts: cb.hearts,
      eliminated: cb.eliminated,
      forfeited,
      lastAt: cb.lastAt
    };
  });

  const effTime = r => (r.answered > 0 ? r.timeMs : Number.POSITIVE_INFINITY);
  rows.sort((a, b) => {
    if (a.forfeited !== b.forfeited) return a.forfeited ? 1 : -1;
    if (mode === 'sudden_death' && a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
    if (b.score !== a.score) return b.score - a.score;
    if (a.done !== b.done) return b.done ? 1 : -1;
    const ta = effTime(a), tb = effTime(b);
    if (ta !== tb) return ta - tb;
    if (b.answered !== a.answered) return b.answered - a.answered;
    return a.joinIdx - b.joinIdx;
  });

  let curRank = 1;
  return rows.map((r, i) => {
    if (i > 0) {
      const prev = rows[i - 1];
      const same = prev.forfeited === r.forfeited
        && (mode !== 'sudden_death' || prev.eliminated === r.eliminated)
        && prev.score === r.score
        && prev.done === r.done
        && effTime(prev) === effTime(r);
      if (!same) curRank = i + 1;
    }
    const { joinIdx, ...clean } = r;
    return { ...clean, rank: curRank };
  });
}

/** Tentukan apakah duel sudah bisa diakhiri. null = belum. */
export function decide(d, now = Date.now()) {
  const total = d.questions.length;
  const { mode } = duelMeta(d);

  if (isMultiplayer(d)) {
    const standings = rankPlayers(d);
    if (standings.length < 2) return null;
    const active = standings.filter(p => !p.forfeited);
    if (active.length === 0) return { winnerId: standings[0]?.id || null, reason: 'forfeit' };
    if (mode === 'sudden_death') {
      const alive = active.filter(p => !p.eliminated);
      if (alive.length === 1) return { winnerId: alive[0].id, reason: 'knockout' };
      if (alive.length === 0) {
        const top = standings[0], sec = standings[1];
        if (sec && top.score === sec.score && top.timeMs === sec.timeMs) return { winnerId: null, reason: 'draw' };
        return { winnerId: top.id, reason: 'knockout' };
      }
    }
    const allFinished = active.every(p => p.done || p.eliminated);
    const expired = now > deadlineOf(d);
    if (!allFinished && !expired) return null;
    const top = standings[0], sec = standings[1];
    if (!top) return { winnerId: null, reason: 'draw' };
    if (sec && !sec.forfeited && top.rank === sec.rank) {
      return { winnerId: null, reason: 'draw' };
    }
    const reason = (sec && top.score !== sec.score) ? 'score'
      : (sec && top.done && sec.done && top.timeMs !== sec.timeMs) ? 'speed'
        : (sec && top.done !== sec.done) ? 'finished' : 'score';
    return { winnerId: top.id, reason };
  }

  const h = playerStats(d.answers?.[d.hostId], d.startedAt, total), g = playerStats(d.answers?.[d.guestId], d.startedAt, total);
  if (mode === 'sudden_death') {
    const hc = combatStats(d.answers?.[d.hostId], mode), gc = combatStats(d.answers?.[d.guestId], mode);
    if (hc.eliminated && !gc.eliminated) return { winnerId: d.guestId, reason: 'knockout' };
    if (gc.eliminated && !hc.eliminated) return { winnerId: d.hostId, reason: 'knockout' };
    if (hc.eliminated && gc.eliminated) {
      if (h.score !== g.score) return { winnerId: h.score > g.score ? d.hostId : d.guestId, reason: 'score' };
      return { winnerId: null, reason: 'draw' };
    }
  }
  const expired = now > deadlineOf(d);
  if (!(h.done && g.done) && !expired) return null;
  if (h.score !== g.score) return { winnerId: h.score > g.score ? d.hostId : d.guestId, reason: 'score' };
  if (h.done && g.done && h.timeMs !== g.timeMs) return { winnerId: h.timeMs < g.timeMs ? d.hostId : d.guestId, reason: 'speed' };
  if (h.done !== g.done) return { winnerId: h.done ? d.hostId : d.guestId, reason: 'finished' };
  return { winnerId: null, reason: 'draw' };
}

export const MAX_PRIZE_DIAMOND = 10_000;

export function cleanPrizes(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const clamp = v => Math.max(0, Math.min(MAX_PRIZE_DIAMOND, Math.floor(Number(v) || 0)));
  const first = clamp(raw.first ?? raw.p1 ?? raw[1]);
  const second = clamp(raw.second ?? raw.p2 ?? raw[2]);
  const third = clamp(raw.third ?? raw.p3 ?? raw[3]);
  const others = clamp(raw.others ?? raw.rest ?? raw.p4);
  if (!(first || second || third || others)) return null;
  return { first, second, third, others };
}

export function roomPrizes(d) {
  const m = (d?.answers && typeof d.answers === 'object' && !Array.isArray(d.answers) && d.answers._meta) || {};
  return cleanPrizes(m.prizes || d?.prizes);
}

export function prizeForRank(prizes, rank, forfeited = false) {
  if (!prizes || forfeited) return 0;
  const r = Math.floor(Number(rank) || 0);
  if (r === 1) return prizes.first || 0;
  if (r === 2) return prizes.second || 0;
  if (r === 3) return prizes.third || 0;
  if (r >= 4) return prizes.others || 0;
  return 0;
}

/** Bentuk data untuk klien. Kunci jawaban HANYA untuk soal yang sudah dijawab sendiri (atau semua setelah selesai). */
export function viewFor(d, me, people = {}, online = () => false, opts = {}) {
  const mp = isMultiplayer(d);
  const maxPlayers = roomCapacity(d);
  const ids = playerIds(d);
  const isAdminView = Boolean(opts && opts.isAdmin);
  const isSpectator = Boolean(opts && opts.isSpectator);
  const prizes = roomPrizes(d);
  const oppId = d.hostId === me ? (d.guestId || ids.find(x => x !== me) || null) : d.hostId;
  const total = d.questions.length, finished = d.status === 'finished';
  const { mode, wager, isPublic } = duelMeta(d);
  const myCard = playerCardFor(d, me);
  const oppCard = playerCardFor(d, oppId);
  const arr = x => Array.isArray(x) ? x : [];
  const my = arr(d.answers?.[me]), opp = oppId ? arr(d.answers?.[oppId]) : [];
  const myS = playerStats(my, d.startedAt, total), opS = playerStats(opp, d.startedAt, total);
  const myC = combatStats(my, mode), opC = combatStats(opp, mode);
  const forf = forfeitedMap(d);
  const person = id => id ? { id, name: people[id]?.name || 'Pemain', username: people[id]?.username || '', avatarUrl: people[id]?.avatarUrl || '', avatarDeco: people[id]?.avatarDeco || '', online: !!online(id) } : null;
  const hasQ = d.status === 'active' || finished;
  const allPlayers = rankPlayers(d, people, online).map(p => ({
    ...p,
    isMe: p.id === me,
    prizeDiamonds: finished ? prizeForRank(prizes, p.rank, p.forfeited) : 0
  }));
  const myRow = allPlayers.find(p => p.id === me) || null;
  const top3 = allPlayers.slice(0, 3);
  const isLiveAdminInspect = isAdminView && isSpectator && d.status === 'active';
  const enforcePrivacy = mp && !isLiveAdminInspect && (d.status === 'active' || finished);
  const omitQuestions = Boolean(opts && opts.omitQuestions) && d.status === 'active';
  let visiblePlayers = allPlayers;
  if (enforcePrivacy) {
    visiblePlayers = top3.slice();
    if (myRow && !visiblePlayers.some(p => p.id === me)) visiblePlayers.push(myRow);
  }
  const v = {
    id: d.id, code: d.code, status: d.status, bank: { id: d.bankId, name: d.bankName }, total,
    mode, wager, isPublic, maxHearts: MAX_HEARTS,
    maxPlayers, isMultiplayer: mp, playerCount: ids.length,
    prizes, isSpectator, canInspectFull: isAdminView, privacyMode: enforcePrivacy,
    players: visiblePlayers,
    top3,
    myRank: myRow ? myRow.rank : (isSpectator ? null : 1),
    myStanding: myRow,
    createdAt: d.createdAt || null,
    startedAt: d.startedAt || null, deadlineAt: deadlineOf(d), perQ: d.perQ || 0,
    qStartAt: d.startedAt && !isSpectator ? questionStart(d, me) : null, serverNow: Date.now(),
    isHost: d.hostId === me, invited: person(d.invitedId),
    me: { ...person(me), card: myCard, answered: myS.answered, score: myS.score, timeMs: myS.timeMs, done: myS.done, forfeited: Boolean(forf[me]), streak: myC.streak, maxStreak: myC.maxStreak, wrong: myC.wrong, hearts: myC.hearts, eliminated: myC.eliminated, lastAt: myC.lastAt },
    opponent: oppId ? { ...person(oppId), card: oppCard, answered: opS.answered, score: finished ? opS.score : null, liveScore: opC.liveScore, streak: opC.streak, maxStreak: opC.maxStreak, wrong: opC.wrong, hearts: opC.hearts, eliminated: opC.eliminated, lastAt: opC.lastAt } : null,
    questions: (hasQ && !omitQuestions) ? d.questions.map((q, i) => ({ i, soal: q.soal, opsi: q.opsi })) : [],
    myAnswers: my.map((a, i) => ({ choice: a.c, ok: !!a.ok, correctIdx: d.questions[i]?.jawabanBenar })),
    result: null
  };
  if (finished) {
    v.result = {
      winnerId: d.winnerId || null, reason: d.reason || '',
      myRank: myRow ? myRow.rank : null,
      myStanding: myRow,
      myPrizeDiamonds: myRow ? prizeForRank(prizes, myRow.rank, myRow.forfeited) : 0,
      totalPlayers: allPlayers.length,
      privacyMode: enforcePrivacy,
      top3,
      standings: top3,
      me: { score: myS.score, timeMs: myS.timeMs, done: myS.done, maxStreak: myC.maxStreak, hearts: myC.hearts },
      opponent: { score: opS.score, timeMs: opS.timeMs, done: opS.done, maxStreak: opC.maxStreak, hearts: opC.hearts },
      review: d.questions.map((q, i) => ({
        i,
        soal: q.soal,
        opsi: q.opsi,
        correctIdx: q.jawabanBenar,
        pembahasan: q.pembahasan || '',
        pembahasanPilihan: extractOptionExplanations(q, Array.isArray(q.opsi) ? q.opsi.length : 0),
        catatanKlinis: q.catatanKlinis || '',
        myChoice: my[i] ? my[i].c : null,
        oppChoice: opp[i] ? opp[i].c : null
      }))
    };
  }
  return v;
}
