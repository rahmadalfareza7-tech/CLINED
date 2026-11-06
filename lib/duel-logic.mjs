// Logika duel yang murni (tanpa DB) agar mudah diuji.
export const DUEL_MAX_MS = 15 * 60 * 1000;     // batas total satu duel setelah dimulai
export const WAIT_MAX_MS = 30 * 60 * 1000;     // undangan/kode kedaluwarsa
export const TIME_OPTIONS = [0, 15, 30, 45, 60];  // detik per soal (0 = tanpa batas)
export const GRACE_MS = 1500;
export const REVEAL_MS = 1200;                 // jeda lihat benar/salah sebelum soal berikutnya (duel ber-timer)                   // toleransi jaringan untuk jawaban yang nyaris tepat waktu

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
/** Tentukan apakah duel sudah bisa diakhiri. null = belum. */
export function decide(d, now = Date.now()) {
  const total = d.questions.length;
  const h = playerStats(d.answers?.[d.hostId], d.startedAt, total), g = playerStats(d.answers?.[d.guestId], d.startedAt, total);
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
  const arr = x => Array.isArray(x) ? x : [];
  const my = arr(d.answers?.[me]), opp = oppId ? arr(d.answers?.[oppId]) : [];
  const myS = playerStats(my, d.startedAt, total), opS = playerStats(opp, d.startedAt, total);
  const person = id => id ? { id, name: people[id]?.name || 'Pemain', username: people[id]?.username || '', online: !!online(id) } : null;
  const hasQ = d.status === 'active' || finished;
  const v = {
    id: d.id, code: d.code, status: d.status, bank: { id: d.bankId, name: d.bankName }, total,
    startedAt: d.startedAt || null, deadlineAt: deadlineOf(d), perQ: d.perQ || 0,
    qStartAt: d.startedAt ? questionStart(d, me) : null, serverNow: Date.now(),
    isHost: d.hostId === me, invited: person(d.invitedId),
    me: { ...person(me), answered: myS.answered, score: myS.score },
    opponent: oppId ? { ...person(oppId), answered: opS.answered, score: finished ? opS.score : null } : null,
    questions: hasQ ? d.questions.map((q, i) => ({ i, soal: q.soal, opsi: q.opsi })) : [],
    myAnswers: my.map((a, i) => ({ choice: a.c, ok: !!a.ok, correctIdx: d.questions[i]?.jawabanBenar, pembahasan: d.questions[i]?.pembahasan || '' })),
    result: null
  };
  if (finished) {
    v.result = {
      winnerId: d.winnerId || null, reason: d.reason || '',
      me: { score: myS.score, timeMs: myS.timeMs, done: myS.done }, opponent: { score: opS.score, timeMs: opS.timeMs, done: opS.done },
      review: d.questions.map((q, i) => ({ i, soal: q.soal, opsi: q.opsi, correctIdx: q.jawabanBenar, pembahasan: q.pembahasan, myChoice: my[i] ? my[i].c : null, oppChoice: opp[i] ? opp[i].c : null }))
    };
  }
  return v;
}
