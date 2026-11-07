import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCode, normalizeCode, pickQuestions, gradeAnswer, playerStats, combatStats, duelMeta, rankFromRp, calcMatchRpDelta, decide, viewFor, validQuestion, deadlineOf, questionStart, isLate, DUEL_MAX_MS, GRACE_MS, REVEAL_MS } from '../lib/duel-logic.mjs';
import { push, isOnline, openStream, connectionCount } from '../lib/stream.mjs';
import { EventEmitter } from 'node:events';

const Q = n => Array.from({ length: n }, (_, i) => ({ id: 'q' + i, soal: 'Soal ' + i, opsi: ['a', 'b', 'c', 'd'], jawabanBenar: i % 4, pembahasan: 'pemb ' + i }));
const seeded = () => { let x = 7; return () => (x = (x * 16807) % 2147483647) / 2147483647; };

test('kode 6 karakter tanpa karakter yang membingungkan', () => {
  for (let i = 0; i < 200; i++) assert.match(makeCode(), /^[A-HJKMNP-Z2-9]{6}$/);
  assert.equal(normalizeCode(' ab-c1 2x9 '), 'ABC12X');
});
test('pickQuestions membuang soal rusak dan membuat snapshot', () => {
  const all = [...Q(8), { id: 'x', soal: 'rusak', opsi: ['a'], jawabanBenar: 0 }, { id: 'y', soal: 's', opsi: ['a', 'b'], jawabanBenar: 5 }];
  const p = pickQuestions(all, 5, seeded());
  assert.equal(p.length, 5); assert.ok(p.every(validQuestion)); assert.ok(!p.some(q => q.id === 'x' || q.id === 'y'));
  assert.equal(pickQuestions(Q(3), 10).length, 3);
});
test('gradeAnswer', () => {
  const q = Q(1)[0];
  assert.deepEqual(gradeAnswer(q, 0), { ok: true, correctIdx: 0 });
  assert.equal(gradeAnswer(q, 2).ok, false);
  assert.equal(gradeAnswer(q, 9), null); assert.equal(gradeAnswer(q, -1), null); assert.equal(gradeAnswer(q, 1.5), null);
});
const duel = (hAns, gAns, extra = {}) => ({ id: 'd', code: 'ABCDEF', hostId: 'H', guestId: 'G', invitedId: null, bankId: 'b', bankName: 'Bank', status: 'active',
  questions: Q(3), perQ: 0, startedAt: 1000, answers: { H: hAns, G: gAns }, winnerId: null, reason: '', ...extra });
const A = (oks, t0 = 2000, step = 1000) => oks.map((ok, i) => ({ c: 0, ok, at: t0 + i * step }));

test('decide: belum selesai → null', () => {
  assert.equal(decide(duel(A([true, true, true]), A([true])), 5000), null);
});
test('decide: skor lebih tinggi menang', () => {
  assert.deepEqual(decide(duel(A([true, true, false]), A([true, false, false])), 9000), { winnerId: 'H', reason: 'score' });
});
test('decide: skor sama → yang lebih cepat menang; sama persis → seri', () => {
  assert.deepEqual(decide(duel(A([true, true, true], 2000, 500), A([true, true, true], 2000, 900)), 9000), { winnerId: 'H', reason: 'speed' });
  assert.deepEqual(decide(duel(A([true, true, true]), A([true, true, true])), 9000), { winnerId: null, reason: 'draw' });
});
test('decide: lewat batas waktu dinilai dari jawaban yang ada', () => {
  const d = duel(A([true, true, true]), A([true]));
  assert.equal(decide(d, 1000 + DUEL_MAX_MS - 1), null);
  assert.deepEqual(decide(d, 1000 + DUEL_MAX_MS + 1), { winnerId: 'H', reason: 'score' });
  assert.deepEqual(decide(duel(A([true, false]), A([true, false, false])), 1000 + DUEL_MAX_MS + 1), { winnerId: 'G', reason: 'finished' });
});
test('viewFor: kunci hanya untuk soal yang sudah dijawab sendiri', () => {
  const d = duel(A([true]), A([false, false]));
  const v = viewFor(d, 'H', { H: { name: 'Hana', username: 'hana' }, G: { name: 'Gio', username: 'gio' } });
  assert.equal(v.myAnswers.length, 1); assert.equal(v.myAnswers[0].correctIdx, 0);
  assert.ok(v.questions.every(q => !('jawabanBenar' in q) && !('pembahasan' in q)));
  assert.equal(v.opponent.answered, 2); assert.equal(v.opponent.score, null); assert.equal(v.result, null);
  assert.ok(!JSON.stringify(v).includes('"jawabanBenar"'));
});
test('viewFor: duel selesai membuka ulasan lengkap; waiting tanpa soal', () => {
  const fin = viewFor(duel(A([true, true, true]), A([false, false, false]), { status: 'finished', winnerId: 'H', reason: 'score' }), 'G');
  assert.equal(fin.result.review.length, 3); assert.equal(fin.result.winnerId, 'H'); assert.equal(fin.opponent.score, 3);
  const w = viewFor(duel({}, {}, { status: 'waiting', guestId: null }), 'H');
  assert.deepEqual(w.questions, []); assert.equal(w.opponent, null);
});
test('playerStats', () => {
  assert.deepEqual(playerStats(A([true, false]), 1000, 3), { answered: 2, score: 1, done: false, timeMs: 2000 });
  assert.deepEqual(playerStats(undefined, 1000, 3), { answered: 0, score: 0, done: false, timeMs: 0 });
});

// ── SSE ──
function fakeRes() { const r = new EventEmitter(); r.out = ''; r.writeHead = (c, h) => { r.code = c; r.headers = h; }; r.write = t => { r.out += t; return true; }; r.end = () => { r.ended = true; }; return r; }
test('SSE: push sampai ke pengguna, online/offline, batas 4 koneksi, bersih saat putus', () => {
  const req = new EventEmitter(), res = fakeRes();
  openStream(req, res, 'u1');
  assert.equal(res.code, 200); assert.match(res.headers['Content-Type'], /text\/event-stream/); assert.equal(res.headers['X-Accel-Buffering'], 'no');
  assert.ok(isOnline('u1')); assert.equal(push('u1', 'duel', { id: 1 }), 1);
  assert.match(res.out, /event: duel\ndata: {"id":1}\n\n/);
  assert.equal(push('nobody', 'x'), 0);
  const olds = []; for (let i = 0; i < 4; i++) { const r = fakeRes(); olds.push(r); openStream(new EventEmitter(), r, 'u1'); }
  assert.ok(res.ended, 'koneksi tertua ditutup saat melebihi batas');
  const before = connectionCount(); req.emit('close'); assert.equal(connectionCount(), before);   // sudah dibuang, tidak dihitung dua kali
  olds.forEach(r => r.emit('close')); assert.ok(!isOnline('u1'));
});

test('timer per soal: batas total, awal soal, terlambat', () => {
  const d = duel(A([true, true]), A([true]), { perQ: 20_000 });
  assert.equal(deadlineOf(d), 1000 + 3 * 20_000 + 60_000);
  assert.equal(deadlineOf(duel([], [])), 1000 + DUEL_MAX_MS);
  assert.equal(questionStart(d, 'H'), 3000 + REVEAL_MS);   // jawaban terakhir H di at=3000 + jeda lihat jawaban
  assert.equal(questionStart(d, 'G'), 2000 + REVEAL_MS);
  assert.equal(isLate(d, 'H', 3000 + REVEAL_MS + 20_000 + GRACE_MS), false);
  assert.equal(isLate(d, 'H', 3000 + REVEAL_MS + 20_000 + GRACE_MS + 1), true);
  assert.equal(isLate(duel([], []), 'H', 9e12), false, 'tanpa timer tidak pernah terlambat');
  assert.equal(questionStart(duel([], []), 'H'), 1000, 'soal pertama mulai saat duel dimulai');
});
test('timer: jawaban kosong (-1) dihitung salah dan duel selesai lebih cepat dari 15 menit', () => {
  const t = (c, ok, at) => ({ c, ok, at });
  const d = duel([t(0, true, 2000), t(-1, false, 7000), t(-1, false, 12000)], [t(0, true, 2500)], { perQ: 5000 });
  assert.equal(decide(d, 1000 + 3 * 5000 + 60_000 - 1), null);
  assert.deepEqual(decide(d, 1000 + 3 * 5000 + 60_000 + 1), { winnerId: 'H', reason: 'finished' });
  assert.deepEqual(playerStats(d.answers.H, 1000, 3), { answered: 3, score: 1, done: true, timeMs: 11000 });
  const v = viewFor(d, 'H');
  assert.equal(v.perQ, 5000); assert.equal(v.qStartAt, 12000 + REVEAL_MS); assert.equal(v.deadlineAt, 1000 + 3 * 5000 + 60_000); assert.ok(v.serverNow > 0);
  assert.equal(v.myAnswers[1].choice, -1);
});

test('combatStats & Sudden Death 3 nyawa (knockout)', () => {
  const cs = combatStats(A([true, true, false, true]), 'sudden_death');
  assert.equal(cs.streak, 1);
  assert.equal(cs.maxStreak, 2);
  assert.equal(cs.wrong, 1);
  assert.equal(cs.hearts, 2);
  assert.equal(cs.eliminated, false);

  const sdDuel = duel(
    A([false, false, false]),
    A([true]),
    { questions: Q(10), answers: { _meta: { mode: 'sudden_death', wager: 20, isPublic: true }, H: A([false, false, false]), G: A([true]) } }
  );
  assert.deepEqual(duelMeta(sdDuel), { mode: 'sudden_death', wager: 20, isPublic: true });
  assert.deepEqual(decide(sdDuel, 5000), { winnerId: 'G', reason: 'knockout' });
  const v = viewFor(sdDuel, 'H');
  assert.equal(v.mode, 'sudden_death');
  assert.equal(v.wager, 20);
  assert.equal(v.me.hearts, 0);
  assert.equal(v.me.eliminated, true);
});

test('rankFromRp & calcMatchRpDelta menghitung Tier Rank dan RP dengan benar', () => {
  const b3 = rankFromRp(0);
  assert.equal(b3.fullName, 'Bronze III');
  assert.equal(b3.neededRp, 200);

  const g1 = rankFromRp(750);
  assert.equal(g1.fullName, 'Gold I');
  assert.equal(g1.key, 'gold');

  const my = rankFromRp(2450);
  assert.equal(my.fullName, 'Mythic Glory');
  assert.equal(my.key, 'mythic');

  // Proteksi Bronze saat kalah -> 0 RP
  assert.equal(calcMatchRpDelta({ outcome: 'loss', currentRp: 120 }), 0);
  // Kalah di Silver -> -12 RP
  assert.equal(calcMatchRpDelta({ outcome: 'loss', currentRp: 300 }), -12);
  // Menang dengan Sudden Death Knockout + streak 3 + wager 50 -> 30 + 12 + 10 + 10 = 62 RP
  assert.equal(calcMatchRpDelta({ outcome: 'win', currentRp: 300, streak: 3, mode: 'sudden_death', wager: 50, reason: 'knockout' }), 62);
});


