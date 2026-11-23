import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCode, normalizeCode, pickQuestions, pickQuestionsAcrossBanks, canonicalDuelBlock, duelBlockLabel, gradeAnswer, playerStats, combatStats, duelMeta, cleanShowcaseCard, rankFromRp, calcMatchRpDelta, clampMaxPlayers, roomCapacity, playerIds, isMultiplayer, rankPlayers, decide, viewFor, validQuestion, deadlineOf, questionStart, isLate, DUEL_MAX_MS, GRACE_MS, REVEAL_MS } from '../lib/duel-logic.mjs';
import { push, broadcast, isOnline, onlineStats, openStream, connectionCount, setPresence, dropSession, dropUser, dropConn, heartbeat, HIDDEN_GRACE_MS } from '../lib/stream.mjs';
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

test('SSE presence: hidden grace, multi-tab, heartbeat dead socket & session/logout cleanup', () => {
  const t0 = 1_700_000_000_000;
  const r1 = fakeRes(), r2 = fakeRes(), rBg = fakeRes();
  openStream(new EventEmitter(), r1, 'u2', { connId: 'c1', sessionId: 's1', expiresAt: t0 + 120_000, now: t0 });
  openStream(new EventEmitter(), r2, 'u2', { connId: 'c2', sessionId: 's2', expiresAt: t0 + 50_000, now: t0 });
  openStream(new EventEmitter(), rBg, 'u3', { connId: 'c3', visible: false, now: t0 });

  assert.equal(isOnline('u2', t0), true);
  assert.equal(isOnline('u3', t0), false, 'tab dibuka di background tidak langsung online');
  assert.equal(onlineStats(t0).accounts, 1);

  setPresence('u2', 'c1', 'hidden', t0 + 1000);
  setPresence('u2', 'c2', 'hidden', t0 + 1000);
  assert.equal(isOnline('u2', t0 + 30_000), true, 'masih online selama masa tenggang hidden');
  assert.equal(isOnline('u2', t0 + 1000 + HIDDEN_GRACE_MS), false, 'offline setelah melewati masa tenggang hidden');
  assert.equal(onlineStats(t0 + 1000 + HIDDEN_GRACE_MS).accounts, 0);

  setPresence('u2', 'c1', 'visible', t0 + 70_000);
  assert.equal(isOnline('u2', t0 + 70_000), true, 'kembali online saat satu tab aktif lagi');

  // Socket stalled (writableNeedDrain) & session expired dibersihkan heartbeat
  r1.writableNeedDrain = true;
  heartbeat(t0 + 80_000);
  assert.equal(r1.ended, true, 'socket macet ditutup heartbeat');
  assert.equal(isOnline('u2', t0 + 80_000), false, 's2 juga sudah kedaluwarsa & dibersihkan');

  // dropSession hanya memutus sesi target, dropUser memutus semua, dropConn memutus satu koneksi
  const a1 = fakeRes(), a2 = fakeRes();
  openStream(new EventEmitter(), a1, 'u4', { connId: 'ca1', sessionId: 'sa', now: t0 });
  openStream(new EventEmitter(), a2, 'u4', { connId: 'ca2', sessionId: 'sb', now: t0 });
  assert.equal(dropSession('sa'), 1);
  assert.equal(a1.ended, true);
  assert.equal(isOnline('u4', t0), true, 'sesi sb masih aktif');
  assert.equal(dropConn('u4', 'ca2'), 1);
  assert.equal(isOnline('u4', t0), false);

  openStream(new EventEmitter(), fakeRes(), 'u5', { now: t0 });
  const b1 = fakeRes(), b2 = fakeRes();
  openStream(new EventEmitter(), b1, 'u6', { now: t0 });
  openStream(new EventEmitter(), b2, 'u7', { now: t0 });
  assert.equal(broadcast('announcement', { kind: 'live', id: 'a1' }), 4);
  assert.match(b1.out, /event: announcement\ndata: {"kind":"live","id":"a1"}\n\n/);
  assert.match(b2.out, /event: announcement\ndata: {"kind":"live","id":"a1"}\n\n/);
  assert.equal(dropUser('u5'), 1);
  assert.equal(dropUser('u6'), 1);
  assert.equal(dropUser('u7'), 1);
  assert.equal(dropUser('u3'), 1);
  assert.equal(connectionCount(), 0);
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
  assert.deepEqual(duelMeta(sdDuel), { mode: 'sudden_death', wager: 20, isPublic: true, hostCard: null, guestCard: null });
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

test('cleanShowcaseCard & Kartu Andalan pada duelMeta dan viewFor', () => {
  assert.equal(cleanShowcaseCard(null), null);
  assert.equal(cleanShowcaseCard({ id: 'invalid_id', star: 3 }), null);
  assert.deepEqual(cleanShowcaseCard({ id: 'cor', star: 9 }), { id: 'cor', star: 5 });
  assert.deepEqual(cleanShowcaseCard('leukocytus'), { id: 'leukocytus', star: 1 });

  const d = duel(A([true]), A([false]), {
    answers: {
      _meta: {
        mode: 'classic',
        wager: 10,
        isPublic: true,
        hostCard: { id: 'cor', star: 4 },
        guestCard: { id: 'cerebrum', star: 5 }
      },
      H: A([true]),
      G: A([false])
    }
  });
  const vH = viewFor(d, 'H');
  assert.deepEqual(vH.me.card, { id: 'cor', star: 4 });
  assert.deepEqual(vH.opponent.card, { id: 'cerebrum', star: 5 });
  const vG = viewFor(d, 'G');
  assert.deepEqual(vG.me.card, { id: 'cerebrum', star: 5 });
  assert.deepEqual(vG.opponent.card, { id: 'cor', star: 4 });
});

test('canonicalDuelBlock & duelBlockLabel menormalkan alias blok dengan konsisten', () => {
  assert.equal(canonicalDuelBlock('block:kedkel'), 'KEDKEL');
  assert.equal(canonicalDuelBlock('BLOK Kedokteran Keluarga'), 'KEDKEL');
  assert.equal(canonicalDuelBlock('Endokrin'), 'ENDOKRINE');
  assert.equal(canonicalDuelBlock('PancaIndra'), 'PANCA INDRA');
  assert.equal(canonicalDuelBlock('Gastrointestinal'), 'GIT');
  assert.equal(canonicalDuelBlock('Kedokteran_Komunitas'), 'KEDKOM');
  assert.equal(duelBlockLabel('ginjal'), 'BLOK GINJAL');
  assert.equal(duelBlockLabel('block:kardio'), 'BLOK KARDIOLOGI');
});

test('pickQuestionsAcrossBanks mengambil soal acak merata dari setiap bank, bebas duplikat, & menyaring soal rusak', () => {
  const mkBank = (prefix, count) => Array.from({ length: count }, (_, i) => ({
    id: `q${i}`, // ID sengaja sama antar-bank untuk uji disambiguasi ID
    soal: `${prefix} pertanyaan nomor ${i}`,
    opsi: ['A', 'B', 'C', 'D'],
    jawabanBenar: i % 4,
    pembahasan: `Pembahasan ${prefix} ${i}`
  }));
  const bankA = mkBank('BANK_A', 50);
  const bankB = mkBank('BANK_B', 3);
  const bankC = [
    ...mkBank('BANK_C', 4),
    // Soal rusak harus disaring
    { id: 'bad', soal: 'rusak', opsi: ['A'], jawabanBenar: 0 }
  ];

  const picked = pickQuestionsAcrossBanks([bankA, bankB, bankC], 9, seeded());
  assert.equal(picked.length, 9);
  assert.ok(picked.every(validQuestion));

  // Pastikan setiap bank berkontribusi merata (round-robin 3 bank -> 3 soal per bank)
  const fromA = picked.filter(q => q.soal.startsWith('BANK_A')).length;
  const fromB = picked.filter(q => q.soal.startsWith('BANK_B')).length;
  const fromC = picked.filter(q => q.soal.startsWith('BANK_C')).length;
  assert.equal(fromA, 3);
  assert.equal(fromB, 3);
  assert.equal(fromC, 3);

  // Semua teks soal dan ID soal unik
  assert.equal(new Set(picked.map(q => q.soal)).size, 9);
  assert.equal(new Set(picked.map(q => q.id)).size, 9);

  // Uji deduplikasi soal kembar antar-bank (2 bank berisi teks soal identik)
  const dupPool = pickQuestionsAcrossBanks([mkBank('SAMA', 5), mkBank('SAMA', 5)], 10, seeded());
  assert.equal(dupPool.length, 5);
  assert.equal(new Set(dupPool.map(q => q.soal)).size, 5);

  // Pool kosong / lebih kecil dari target
  assert.deepEqual(pickQuestionsAcrossBanks([], 10), []);
  const small = pickQuestionsAcrossBanks([mkBank('ONLY', 4)], 10, seeded());
  assert.equal(small.length, 4);
});

test('multiplayer room (2–15 orang): clampMaxPlayers, rankPlayers berdasarkan skor benar & kecepatan, decide, dan viewFor', () => {
  assert.equal(clampMaxPlayers(1), 2);
  assert.equal(clampMaxPlayers(10), 10);
  assert.equal(clampMaxPlayers(99), 15);
  assert.equal(clampMaxPlayers('abc'), 2);

  const mpDuel = {
    id: 'mp-1',
    code: 'RACE99',
    hostId: 'P1',
    guestId: 'P2',
    invitedId: null,
    maxPlayers: 10,
    participantIds: ['P1', 'P2', 'P3', 'P4', 'P5'],
    bankId: 'block:KARDIOLOGI',
    bankName: 'BLOK KARDIOLOGI (Acak)',
    status: 'active',
    questions: Q(4),
    perQ: 0,
    startedAt: 10_000,
    answers: {
      _meta: { mode: 'classic', wager: 20, isPublic: false, maxPlayers: 10, forfeited: { P5: 15_000 } },
      // P1: 3 benar dalam 12s (at 22000)
      P1: A([true, true, true, false], 13_000, 3_000),
      // P2: 4 benar dalam 16s (at 26000) -> Juara #1 (skor tertinggi!)
      P2: A([true, true, true, true], 14_000, 4_000),
      // P3: 3 benar dalam 8s (at 18000) -> Juara #2 (skor sama dgn P1 tapi lebih cepat!)
      P3: A([true, true, false, true], 12_000, 2_000),
      // P4: baru jawab 2 soal -> belum selesai
      P4: A([true, true], 12_000, 2_000),
      // P5: keluar (forfeited) walau sempat benar 4 -> urutan paling bawah
      P5: A([true, true, true, true], 11_000, 1_000),
    },
    winnerId: null,
    reason: ''
  };

  assert.equal(roomCapacity(mpDuel), 10);
  assert.equal(isMultiplayer(mpDuel), true);
  assert.deepEqual(playerIds(mpDuel), ['P1', 'P2', 'P3', 'P4', 'P5']);

  // P4 belum selesai & belum expired -> belum berakhir
  assert.equal(decide(mpDuel, 30_000), null);

  // Live standings sebelum P4 selesai: P2 (4) > P3 (3, cepat) > P1 (3, lebih lambat) > P4 (2) > P5 (forfeited)
  const live = rankPlayers(mpDuel);
  assert.deepEqual(live.map(p => p.id), ['P2', 'P3', 'P1', 'P4', 'P5']);
  assert.deepEqual(live.map(p => p.rank), [1, 2, 3, 4, 5]);

  // P4 selesai dgn 4 benar dalam 10s (at 20000) -> P4 lebih cepat dari P2 (16s), jadi P4 Juara #1 karena speed!
  mpDuel.answers.P4 = A([true, true, true, true], 11_000, 3_000);
  const dec = decide(mpDuel, 30_000);
  assert.deepEqual(dec, { winnerId: 'P4', reason: 'speed' });

  // viewFor saat finished mengekspos standings lengkap tanpa membocorkan kunci di active
  const finView = viewFor({ ...mpDuel, status: 'finished', winnerId: dec.winnerId, reason: dec.reason }, 'P3');
  assert.equal(finView.isMultiplayer, true);
  assert.equal(finView.maxPlayers, 10);
  assert.equal(finView.playerCount, 5);
  assert.equal(finView.result.myRank, 3);
  assert.deepEqual(finView.result.standings.map(p => p.id), ['P4', 'P2', 'P3', 'P1', 'P5']);
});





