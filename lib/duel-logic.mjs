// Logika duel yang murni (tanpa DB) agar mudah diuji.
export const DUEL_MAX_MS = 15 * 60 * 1000;     // batas total satu duel setelah dimulai
export const WAIT_MAX_MS = 30 * 60 * 1000;     // undangan/kode kedaluwarsa
export const TIME_OPTIONS = [0, 15, 30, 45, 60];  // detik per soal (0 = tanpa batas)
export const MODES = ['classic', 'sudden_death'];
export const WAGERS = [0, 20, 50];
export const MAX_HEARTS = 3;
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
/** Ambil n soal acak yang valid; simpan salinan (snapshot) supaya duel tidak berubah kalau bank diedit. */
export function pickQuestions(all, n, rnd = Math.random) {
  const ok = (Array.isArray(all) ? all : []).filter(validQuestion);
  return shuffle(ok, rnd).slice(0, n).map(q => ({
    id: String(q.id), soal: String(q.soal), opsi: q.opsi.map(String),
    jawabanBenar: q.jawabanBenar, pembahasan: String(q.pembahasan ?? '').slice(0, 1500)
  }));
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
/** Tentukan apakah duel sudah bisa diakhiri. null = belum. */
export function decide(d, now = Date.now()) {
  const total = d.questions.length;
  const { mode } = duelMeta(d);
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
/** Bentuk data untuk klien. Kunci jawaban HANYA untuk soal yang sudah dijawab sendiri (atau semua setelah selesai). */
export function viewFor(d, me, people = {}, online = () => false) {
  const oppId = d.hostId === me ? d.guestId : d.hostId;
  const total = d.questions.length, finished = d.status === 'finished';
  const { mode, wager, isPublic, hostCard, guestCard } = duelMeta(d);
  const myCard = d.hostId === me ? hostCard : guestCard;
  const oppCard = d.hostId === me ? guestCard : hostCard;
  const arr = x => Array.isArray(x) ? x : [];
  const my = arr(d.answers?.[me]), opp = oppId ? arr(d.answers?.[oppId]) : [];
  const myS = playerStats(my, d.startedAt, total), opS = playerStats(opp, d.startedAt, total);
  const myC = combatStats(my, mode), opC = combatStats(opp, mode);
  const person = id => id ? { id, name: people[id]?.name || 'Pemain', username: people[id]?.username || '', online: !!online(id) } : null;
  const hasQ = d.status === 'active' || finished;
  const v = {
    id: d.id, code: d.code, status: d.status, bank: { id: d.bankId, name: d.bankName }, total,
    mode, wager, isPublic, maxHearts: MAX_HEARTS,
    startedAt: d.startedAt || null, deadlineAt: deadlineOf(d), perQ: d.perQ || 0,
    qStartAt: d.startedAt ? questionStart(d, me) : null, serverNow: Date.now(),
    isHost: d.hostId === me, invited: person(d.invitedId),
    me: { ...person(me), card: myCard, answered: myS.answered, score: myS.score, streak: myC.streak, maxStreak: myC.maxStreak, wrong: myC.wrong, hearts: myC.hearts, eliminated: myC.eliminated, lastAt: myC.lastAt },
    opponent: oppId ? { ...person(oppId), card: oppCard, answered: opS.answered, score: finished ? opS.score : null, liveScore: opC.liveScore, streak: opC.streak, maxStreak: opC.maxStreak, wrong: opC.wrong, hearts: opC.hearts, eliminated: opC.eliminated, lastAt: opC.lastAt } : null,
    questions: hasQ ? d.questions.map((q, i) => ({ i, soal: q.soal, opsi: q.opsi })) : [],
    myAnswers: my.map((a, i) => ({ choice: a.c, ok: !!a.ok, correctIdx: d.questions[i]?.jawabanBenar, pembahasan: d.questions[i]?.pembahasan || '' })),
    result: null
  };
  if (finished) {
    v.result = {
      winnerId: d.winnerId || null, reason: d.reason || '',
      me: { score: myS.score, timeMs: myS.timeMs, done: myS.done, maxStreak: myC.maxStreak, hearts: myC.hearts },
      opponent: { score: opS.score, timeMs: opS.timeMs, done: opS.done, maxStreak: opC.maxStreak, hearts: opC.hearts },
      review: d.questions.map((q, i) => ({ i, soal: q.soal, opsi: q.opsi, correctIdx: q.jawabanBenar, pembahasan: q.pembahasan, myChoice: my[i] ? my[i].c : null, oppChoice: opp[i] ? opp[i].c : null }))
    };
  }
  return v;
}
