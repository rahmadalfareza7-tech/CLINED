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
