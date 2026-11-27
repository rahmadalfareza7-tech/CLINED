import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidSyncKey,
  mergeJsonKey,
  reconcileMateriResumeWithHistory,
  reconcileBankSessionsWithHistory,
  reconcileBookmarksWithMeta,
} from '../lib/sync-merge.mjs';

test('isValidSyncKey allows bank/quiz/timer sessions and blocks auth tokens & large derived caches', () => {
  // Must allow study session & progress keys
  assert.equal(isValidSyncKey('clined_bank_sessions_v1'), true);
  assert.equal(isValidSyncKey('gaster_v8_quiz_session'), true);
  assert.equal(isValidSyncKey('clined_timer_sessions_Tue Nov 24 2026'), true);
  assert.equal(isValidSyncKey('clined_materi_resume_v2'), true);
  assert.equal(isValidSyncKey('clined_materi_best_v1'), true);
  assert.equal(isValidSyncKey('clined_materi_last_v1'), true);
  assert.equal(isValidSyncKey('clined_materi_flags_v1'), true);
  assert.equal(isValidSyncKey('gaster_v8_bookmarks'), true);
  assert.equal(isValidSyncKey('clined_bookmarks_meta_v1'), true);
  assert.equal(isValidSyncKey('gaster_daily_streak_v1'), true);
  assert.equal(isValidSyncKey('gaster_v11_xp'), true);

  // Must block auth/session credentials, internal sync queues/cursors, and derived caches
  assert.equal(isValidSyncKey('clined_auth_session_v1'), false);
  assert.equal(isValidSyncKey('clined_auth_users_v1'), false);
  assert.equal(isValidSyncKey('clined_session_token'), false);
  assert.equal(isValidSyncKey('clined_session_id'), false);
  assert.equal(isValidSyncKey('clined_user_session'), false);
  assert.equal(isValidSyncKey('gaster_auth_token'), false);
  assert.equal(isValidSyncKey('clined_password_hash'), false);
  assert.equal(isValidSyncKey('gaster_v22_question_ability_map'), false);
  assert.equal(isValidSyncKey('clined_materi_packs_cache_v1'), false);
  assert.equal(isValidSyncKey('clined_glossary_v1'), false);
  assert.equal(isValidSyncKey('clined_resep_overrides_v1'), false);
  assert.equal(isValidSyncKey('clined_online_sync_queue_v3'), false);
  assert.equal(isValidSyncKey('clined_sync_cursor_v4'), false);
  assert.equal(isValidSyncKey('clined_xp_queue_v1'), false);
  assert.equal(isValidSyncKey('clined_last_activity_v1'), false);
  assert.equal(isValidSyncKey('clined_materi_resume'), false);
});

test('mergeJsonKey unions arrays for achievements, kedkel summary, and seen cosmetics', () => {
  const res = mergeJsonKey(
    'clined_kedkel_summary_done_v2',
    JSON.stringify(['d01', 'd03']),
    JSON.stringify(['d01', 'd02'])
  );
  assert.equal(res.dirty, true);
  assert.deepEqual(JSON.parse(res.value).sort(), ['d01', 'd02', 'd03']);

  const cos = mergeJsonKey(
    'clined_seen_cosmetics_v1',
    JSON.stringify(['deco:22-fallen-angel-white']),
    JSON.stringify(['deco:22-fallen-angel-white', 'banner:23-pressed-glass'])
  );
  assert.equal(cos.dirty, false);
  assert.deepEqual(JSON.parse(cos.value).sort(), ['banner:23-pressed-glass', 'deco:22-fallen-angel-white']);

  const achObj = mergeJsonKey(
    'clined_unlocked_achievements_v1',
    JSON.stringify({ cards_5: 100, q_50: 200 }),
    JSON.stringify({ first_step: 50, q_50: 200 })
  );
  assert.equal(achObj.dirty, true);
  assert.deepEqual(JSON.parse(achObj.value), { first_step: 50, q_50: 200, cards_5: 100 });
});

test('mergeJsonKey deduplicates and sorts gaster_v8_history across devices', () => {
  const local = JSON.stringify([
    { at: '2026-11-21T10:00:00Z', bank: 'kedkel-2018', score: 80, total: 100 },
    { at: '2026-11-20T09:00:00Z', bank: 'endo-2023', score: 70, total: 100 },
  ]);
  const server = JSON.stringify([
    { at: '2026-11-21T12:00:00Z', bank: 'ginjal-2023', score: 90, total: 100 },
    { at: '2026-11-20T09:00:00Z', bank: 'endo-2023', score: 70, total: 100 },
  ]);
  const res = mergeJsonKey('gaster_v8_history', local, server);
  assert.equal(res.dirty, true);
  const parsed = JSON.parse(res.value);
  assert.equal(parsed.length, 3);
  assert.equal(parsed[0].bank, 'ginjal-2023');
  assert.equal(parsed[1].bank, 'kedkel-2018');
});

test('mergeJsonKey merges streak, SM2, notes, and timer sessions without data loss', () => {
  const streak = mergeJsonKey(
    'gaster_daily_streak_v1',
    JSON.stringify({ streak: 4, best: 6, lastDate: '2026-11-21', days: ['2026-11-19', '2026-11-21'] }),
    JSON.stringify({ streak: 5, best: 5, lastDate: '2026-11-20', days: ['2026-11-18', '2026-11-20'] })
  );
  const sVal = JSON.parse(streak.value);
  assert.equal(sVal.streak, 5);
  assert.equal(sVal.best, 6);
  assert.equal(sVal.lastDate, '2026-11-21');
  assert.deepEqual(sVal.days, ['2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21']);

  const sm2 = mergeJsonKey(
    'clined_sm2_v1',
    JSON.stringify({ q1: { reps: 3, lastReview: '2026-11-21T10:00:00Z' }, q2: { reps: 1, lastReview: '2026-11-21T08:00:00Z' } }),
    JSON.stringify({ q1: { reps: 2, lastReview: '2026-11-20T10:00:00Z' }, q3: { reps: 4, lastReview: '2026-11-21T09:00:00Z' } })
  );
  const sm2Val = JSON.parse(sm2.value);
  assert.equal(sm2Val.q1.reps, 3);
  assert.equal(sm2Val.q2.reps, 1);
  assert.equal(sm2Val.q3.reps, 4);

  const timer = mergeJsonKey('clined_timer_sessions_Sat Nov 22 2026', '4', '2');
  assert.equal(timer.value, '4');
  assert.equal(timer.dirty, true);
});

test('mergeJsonKey merges clined_xp_daily_refs_v1 v2 XP upgrades and v1 legacy entries safely', () => {
  const upgraded = mergeJsonKey(
    'clined_xp_daily_refs_v1',
    JSON.stringify({ v: 2, day: '2026-11-22', refs: { 'quiz|q1': 20, 'quiz|q2': 5 } }),
    JSON.stringify({ v: 2, day: '2026-11-22', refs: { 'quiz|q1': 5, 'quiz|q3': 25 } })
  );
  assert.equal(upgraded.dirty, true);
  assert.deepEqual(JSON.parse(upgraded.value), {
    v: 2,
    day: '2026-11-22',
    refs: { 'quiz|q1': 20, 'quiz|q2': 5, 'quiz|q3': 25 }
  });

  const legacy = mergeJsonKey(
    'clined_xp_daily_refs_v1',
    JSON.stringify({ v: 2, day: '2026-11-22', refs: { 'quiz|q2': 20 } }),
    JSON.stringify({ day: '2026-11-22', refs: { 'quiz|q1': 1 } })
  );
  const lv = JSON.parse(legacy.value);
  assert.equal(lv.v, 2);
  assert.equal(lv.refs['quiz|q1'], 9999);
  assert.equal(lv.refs['quiz|q2'], 20);
});

test('mergeJsonKey merges Latihan Materi flags, best scores, last results, and resume tombstones across devices', () => {
  const flags = mergeJsonKey(
    'clined_materi_flags_v1',
    JSON.stringify({
      'KEDKEL|m1|q1': { block: 'KEDKEL', pk: 'm1', rid: 'q1', at: 1000 },
      'KEDKEL|m2|q2': { deleted: true, at: 3000 },
      'KEDKEL|m3|q3': { block: 'KEDKEL', pk: 'm3', rid: 'q3', at: 2500 },
    }),
    JSON.stringify({
      'KEDKEL|m1|q1': { block: 'KEDKEL', pk: 'm1', rid: 'q1', at: 1000 },
      'KEDKEL|m2|q2': { block: 'KEDKEL', pk: 'm2', rid: 'q2', at: 2000 },
      'KEDKEL|m4|q4': { block: 'KEDKEL', pk: 'm4', rid: 'q4', at: 1500 },
    })
  );
  assert.equal(flags.dirty, true);
  const fVal = JSON.parse(flags.value);
  assert.equal(fVal['KEDKEL|m1|q1'].rid, 'q1');
  assert.equal(fVal['KEDKEL|m2|q2'].deleted, true);
  assert.equal(fVal['KEDKEL|m3|q3'].rid, 'q3');
  assert.equal(fVal['KEDKEL|m4|q4'].rid, 'q4');

  const best = mergeJsonKey(
    'clined_materi_best_v1',
    JSON.stringify({
      'KEDKEL|m1': { pct: 80, score: 12, total: 15, at: 1000 },
      'KEDKEL|m2': { pct: 93, score: 14, total: 15, at: 2000 },
    }),
    JSON.stringify({
      'KEDKEL|m1': { pct: 90, score: 13, total: 15, at: 1500 },
      'KEDKEL|m3': { pct: 100, score: 15, total: 15, at: 2500 },
    })
  );
  assert.equal(best.dirty, true);
  const bVal = JSON.parse(best.value);
  assert.equal(bVal['KEDKEL|m1'].pct, 90);
  assert.equal(bVal['KEDKEL|m2'].pct, 93);
  assert.equal(bVal['KEDKEL|m3'].pct, 100);

  const resume = mergeJsonKey(
    'clined_materi_resume_v2',
    JSON.stringify({
      'KEDKEL|m1': { deleted: true, updated: 5000 },
    }),
    JSON.stringify({
      'KEDKEL|m1': { pos: 4, seq: [1, 2, 3], updated: 4000 },
      'KEDKEL|m2': { pos: 2, seq: [1, 2, 3], updated: 3000 },
    })
  );
  assert.equal(resume.dirty, true);
  const rVal = JSON.parse(resume.value);
  assert.equal(rVal['KEDKEL|m1'].deleted, true);
  assert.equal(rVal['KEDKEL|m2'].pos, 2);
});

test('mergeJsonKey merges same Latihan Materi resume session by max answered & furthest pos despite clock skew', () => {
  const seq = [
    { id: 'q1', order: [0, 1, 2, 3] },
    { id: 'q2', order: [1, 0, 2, 3] },
    { id: 'q3', order: [2, 1, 0, 3] },
    { id: 'q4', order: [0, 2, 1, 3] },
    { id: 'q5', order: [3, 2, 1, 0] },
  ];
  // PC answered 4 questions (pos 4), but PC clock is 5 minutes BEHIND (updated = 1000)
  const pc = JSON.stringify({
    'KEDKEL|m1': {
      sessionId: 'sess-same-1',
      startedAt: 900,
      pos: 4,
      ans: [0, 2, 1, 3, null],
      seq,
      updated: 1000,
    }
  });
  // iPad only answered 1 question (pos 1), plus skipped & answered q5, with clock AHEAD (updated = 301000)
  const ipad = JSON.stringify({
    'KEDKEL|m1': {
      sessionId: 'sess-same-1',
      startedAt: 900,
      pos: 1,
      ans: [0, null, null, null, 2],
      seq,
      updated: 301000,
    }
  });

  const mergedA = JSON.parse(mergeJsonKey('clined_materi_resume_v2', pc, ipad).value);
  const mergedB = JSON.parse(mergeJsonKey('clined_materi_resume_v2', ipad, pc).value);

  assert.equal(mergedA['KEDKEL|m1'].pos, 4);
  assert.deepEqual(mergedA['KEDKEL|m1'].ans, [0, 2, 1, 3, 2]);
  assert.equal(mergedB['KEDKEL|m1'].pos, 4);
  assert.deepEqual(mergedB['KEDKEL|m1'].ans, [0, 2, 1, 3, 2]);

  // Subsequent sync with already-merged server state produces dirty: false (no ping-pong)
  const steady = mergeJsonKey('clined_materi_resume_v2', JSON.stringify(mergedA), JSON.stringify(mergedB));
  assert.equal(steady.dirty, false);
});

test('reconcileMateriResumeWithHistory tombstones completed materi sessions while preserving genuine restarts', () => {
  const resumeRaw = JSON.stringify({
    'KEDKEL|m-done-best': { pos: 5, ans: [1, 0, null], seq: [{ id: '1' }, { id: '2' }, { id: '3' }], updated: 2000 },
    'KEDKEL|m-done-last-tie': { pos: 2, ans: [1, null], seq: [{ id: '1' }, { id: '2' }], updated: 3000 },
    'KEDKEL|m-late-flush': { sessionId: 'old-sid', startedAt: 1500, pos: 3, ans: [0, 1, null, null], seq: [{ id: '1' }], updated: 9000 },
    'KEDKEL|m-restarted': { sessionId: 'new-sid', startedAt: 6000, pos: 1, ans: [2, null], seq: [{ id: '1' }, { id: '2' }], updated: 6100 },
  });
  const bestRaw = JSON.stringify({
    'KEDKEL|m-done-best': { pct: 90, score: 9, total: 10, at: 2500 },
    'KEDKEL|m-restarted': { pct: 85, score: 17, total: 20, at: 5000 },
  });
  const lastRaw = JSON.stringify({
    'KEDKEL|m-done-last-tie': { pct: 75, score: 6, total: 8, at: 3000 },
    'KEDKEL|m-late-flush': { sessionId: 'old-sid', pct: 80, score: 8, total: 10, at: 4000 },
    'KEDKEL|m-restarted': { sessionId: 'prev-sid', pct: 85, score: 17, total: 20, at: 5000 },
  });

  const rec = reconcileMateriResumeWithHistory(resumeRaw, bestRaw, lastRaw);
  assert.equal(rec.changed, true);
  const parsed = JSON.parse(rec.value);
  assert.equal(parsed['KEDKEL|m-done-best'].deleted, true);
  assert.equal(parsed['KEDKEL|m-done-last-tie'].deleted, true);
  assert.equal(parsed['KEDKEL|m-late-flush'].deleted, true);
  assert.equal(parsed['KEDKEL|m-restarted'].deleted, undefined);
  assert.equal(parsed['KEDKEL|m-restarted'].pos, 1);

  // Idempotent on second pass
  const rec2 = reconcileMateriResumeWithHistory(rec.value, bestRaw, lastRaw);
  assert.equal(rec2.changed, false);
});

test('mergeJsonKey merges counts-based gaster_daily_streak_v1 and upgrades consecutive cross-device streak without legacy fields', () => {
  const res = mergeJsonKey(
    'gaster_daily_streak_v1',
    JSON.stringify({ counts: { '2026-11-22': 6 }, streak: 1 }),
    JSON.stringify({ counts: { '2026-11-22': 3, '2026-11-23': 5 }, streak: 2 })
  );
  assert.equal(res.dirty, true);
  const parsed = JSON.parse(res.value);
  assert.deepEqual(parsed, {
    counts: { '2026-11-22': 6, '2026-11-23': 5 },
    streak: 2
  });
  assert.equal('days' in parsed, false);
  assert.equal('lastDate' in parsed, false);
  assert.equal('best' in parsed, false);

  // Cross-device consecutive days: Day 1 on PC (streak 1) + Day 2 offline on iPad (streak 1) => streak 2!
  const crossDay = mergeJsonKey(
    'gaster_daily_streak_v1',
    JSON.stringify({ counts: { '2026-11-24': 5 }, streak: 1 }),
    JSON.stringify({ counts: { '2026-11-23': 5 }, streak: 1 })
  );
  assert.equal(crossDay.dirty, true);
  assert.deepEqual(JSON.parse(crossDay.value), {
    counts: { '2026-11-23': 5, '2026-11-24': 5 },
    streak: 2
  });

  // When server already has strictly newer/higher counts and streak, dirty should be false (no ping-pong)
  const clean = mergeJsonKey(
    'gaster_daily_streak_v1',
    JSON.stringify({ counts: {}, streak: 0 }),
    JSON.stringify({ counts: { '2026-11-23': 5 }, streak: 1 })
  );
  assert.equal(clean.dirty, false);
  assert.deepEqual(JSON.parse(clean.value), {
    counts: { '2026-11-23': 5 },
    streak: 1
  });
});

test('mergeJsonKey and reconcilers handle UAB bank sessions, gaster_v8_quiz_session, and bookmark tombstones', () => {
  const bankBest = mergeJsonKey(
    'clined_bank_best_v1',
    JSON.stringify({
      'kedkel-2022': { bestPct: 92, bestScore: 46, bestTotal: 50, lastPct: 92, attempts: 3, lastAt: '2026-11-24T10:00:00Z' },
      'endo-2023': { bestPct: 75, bestScore: 30, bestTotal: 40, lastPct: 75, attempts: 1, lastAt: '2026-11-24T08:00:00Z' }
    }),
    JSON.stringify({
      'kedkel-2022': { bestPct: 84, bestScore: 42, bestTotal: 50, lastPct: 84, attempts: 2, lastAt: '2026-11-23T10:00:00Z' },
      'ginjal-2023': { bestPct: 88, bestScore: 44, bestTotal: 50, lastPct: 88, attempts: 2, lastAt: '2026-11-24T09:00:00Z' }
    })
  );
  assert.equal(bankBest.dirty, true);
  const bb = JSON.parse(bankBest.value);
  assert.equal(bb['kedkel-2022'].bestPct, 92);
  assert.equal(bb['kedkel-2022'].bestScore, 46);
  assert.equal(bb['kedkel-2022'].attempts, 3);
  assert.equal(bb['endo-2023'].bestPct, 75);
  assert.equal(bb['ginjal-2023'].bestPct, 88);

  // Same UAB bank session merges per-item answers & furthest pos even when PC clock is behind
  const sessions = mergeJsonKey(
    'clined_bank_sessions_v1',
    JSON.stringify({
      'kedkel-2022': {
        sessionId: 'bs-1',
        bankId: 'kedkel-2022',
        pos: 2,
        score: 2,
        doneCount: 2,
        total: 3,
        flagged: ['q2'],
        items: [{ id: 'q1', i: 0, o: [0, 1], a: 1 }, { id: 'q2', i: 1, o: [0, 1], a: 0 }, { id: 'q3', i: 2, o: [0, 1], a: null }],
        savedAt: '2026-11-24T10:00:00Z'
      }
    }),
    JSON.stringify({
      'kedkel-2022': {
        sessionId: 'bs-1',
        bankId: 'kedkel-2022',
        pos: 0,
        score: 1,
        doneCount: 1,
        total: 3,
        flagged: ['q1'],
        items: [{ id: 'q1', i: 0, o: [0, 1], a: 1 }, { id: 'q2', i: 1, o: [0, 1], a: null }, { id: 'q3', i: 2, o: [0, 1], a: null }],
        savedAt: '2026-11-24T11:00:00Z'
      },
      'ginjal-2023': { bankId: 'ginjal-2023', pos: 9, doneCount: 10, total: 50, savedAt: '2026-11-24T10:00:00Z' }
    })
  );
  assert.equal(sessions.dirty, true);
  const ss = JSON.parse(sessions.value);
  assert.equal(ss['kedkel-2022'].doneCount, 2);
  assert.equal(ss['kedkel-2022'].pos, 2);
  assert.equal(ss['kedkel-2022'].items[1].a, 0);
  assert.deepEqual(ss['kedkel-2022'].flagged.sort(), ['q1', 'q2']);
  assert.equal(ss['ginjal-2023'].doneCount, 10);

  // gaster_v8_quiz_session merges custom quiz progress & tombstones
  const quizMerged = mergeJsonKey(
    'gaster_v8_quiz_session',
    JSON.stringify({
      sessionId: 'qs-1',
      selectedBank: 'endo-2023',
      isCustom: true,
      pos: 2,
      score: 2,
      quiz: [{ id: 'q1', selectedAnswer: 0 }, { id: 'q2', selectedAnswer: 1 }, { id: 'q3', selectedAnswer: null }],
      savedAt: '2026-11-24T09:55:00Z'
    }),
    JSON.stringify({
      sessionId: 'qs-1',
      selectedBank: 'endo-2023',
      isCustom: true,
      pos: 1,
      score: 1,
      quiz: [{ id: 'q1', selectedAnswer: 0 }, { id: 'q2', selectedAnswer: null }, { id: 'q3', selectedAnswer: null }],
      savedAt: '2026-11-24T10:00:00Z'
    })
  );
  assert.equal(quizMerged.dirty, true);
  const qm = JSON.parse(quizMerged.value);
  assert.equal(qm.pos, 2);
  assert.equal(qm.doneCount, 2);
  assert.equal(qm.quiz[1].selectedAnswer, 1);

  // Cross-reconciliation tombstones bankSession + compact quizSession when bankBest has newer completion
  const bankRec = reconcileBankSessionsWithHistory(
    JSON.stringify({ 'kedkel-2022': { sessionId: 'bs-old', bankId: 'kedkel-2022', pos: 5, doneCount: 5, total: 20, items: [{ id: 'q1', a: 0 }], savedAt: '2026-11-24T09:00:00Z' } }),
    JSON.stringify({ sessionId: 'bs-old', compact: true, selectedBank: 'kedkel-2022', pos: 5, total: 20, isCustom: false, savedAt: '2026-11-24T09:00:00Z' }),
    JSON.stringify({ 'kedkel-2022': { bestPct: 90, lastAt: '2026-11-24T10:00:00Z' } }),
    JSON.stringify([])
  );
  assert.equal(bankRec.bankSessionsChanged, true);
  assert.equal(bankRec.quizSessionChanged, true);
  assert.equal(JSON.parse(bankRec.bankSessionsValue)['kedkel-2022'].deleted, true);
  assert.equal(JSON.parse(bankRec.quizSessionValue).deleted, true);

  // Bookmarks unbookmark reconciliation via clined_bookmarks_meta_v1
  const metaMerged = mergeJsonKey(
    'clined_bookmarks_meta_v1',
    JSON.stringify({ 'kedkel-1': { deleted: true, at: 5000 }, 'endo-2': { at: 4000 } }),
    JSON.stringify({ 'kedkel-1': { at: 3000 }, 'ginjal-3': { at: 2000 } })
  );
  const bookRec = reconcileBookmarksWithMeta(
    JSON.stringify(['kedkel-1', 'ginjal-3']),
    metaMerged.value
  );
  assert.equal(bookRec.changed, true);
  assert.deepEqual(JSON.parse(bookRec.value).sort(), ['endo-2', 'ginjal-3']);
});
