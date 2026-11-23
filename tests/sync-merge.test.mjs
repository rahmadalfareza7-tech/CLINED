import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeJsonKey } from '../lib/sync-merge.mjs';

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

test('mergeJsonKey merges streak, SM2, notes, and best scores without data loss', () => {
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

test('mergeJsonKey merges counts-based gaster_daily_streak_v1 across devices without injecting legacy fields', () => {
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

