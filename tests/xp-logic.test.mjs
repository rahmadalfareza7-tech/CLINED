import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanEvents, applyCap, MAX_EVENT, DAILY_CAP } from '../lib/xp-logic.mjs';

test('cleanEvents: jenis tak dikenal jadi other, jumlah dipotong, sampah dibuang', () => {
  const r = cleanEvents([{ kind: 'quiz', ref: 'a', amount: 20 }, { kind: 'x', ref: 'b', amount: 9999 }, { ref: '', amount: 5 }, { kind: 'quiz', ref: 'c', amount: -1 }, null, { kind: 'upi', ref: 'd', amount: '7' }]);
  assert.deepEqual(r.map(e => [e.kind, e.ref, e.amount]), [['quiz', 'a', 20], ['other', 'b', MAX_EVENT], ['upi', 'd', 7]]);
  assert.deepEqual(cleanEvents('x'), []);
});
test('applyCap memotong sesuai sisa kuota harian', () => {
  assert.deepEqual(applyCap([{ kind: 'quiz', ref: 'a', amount: 50 }, { kind: 'quiz', ref: 'b', amount: 50 }], DAILY_CAP - 60).map(e => e.amount), [50, 10]);
  assert.deepEqual(applyCap([{ kind: 'quiz', ref: 'a', amount: 5 }], DAILY_CAP), []);
});
