import test from 'node:test';
import assert from 'node:assert/strict';
import { wibDay, weekStartOf, actorFor, cleanUsage, MAX_KEYS, MAX_COUNT } from '../lib/usage-logic.mjs';

test('hari WIB: lewat tengah malam UTC+7 berganti hari', () => {
  assert.equal(wibDay(Date.parse('2026-10-07T16:59:59Z')), '2026-10-07');
  assert.equal(wibDay(Date.parse('2026-10-07T17:00:00Z')), '2026-10-08');
});
test('awal minggu = Senin (termasuk Minggu dan Senin sendiri)', () => {
  assert.equal(weekStartOf('2026-10-05'), '2026-10-05');   // Senin
  assert.equal(weekStartOf('2026-10-11'), '2026-10-05');   // Minggu
  assert.equal(weekStartOf('2026-10-12'), '2026-10-12');   // Senin berikutnya
  assert.equal(weekStartOf('2026-01-01'), '2025-12-29');   // lintas tahun
});
test('actor: stabil dalam seminggu, berbeda antar minggu/pengguna/rahasia, tidak memuat ID', () => {
  const a = actorFor('rahasia', '2026-10-05', 'user-1');
  assert.equal(a, actorFor('rahasia', '2026-10-05', 'user-1'));
  assert.notEqual(a, actorFor('rahasia', '2026-10-12', 'user-1'));
  assert.notEqual(a, actorFor('rahasia', '2026-10-05', 'user-2'));
  assert.notEqual(a, actorFor('rahasia2', '2026-10-05', 'user-1'));
  assert.match(a, /^[0-9a-f]{24}$/); assert.ok(!a.includes('user-1'));
});
test('cleanUsage: hanya kunci berpola, jumlah dibatasi, last hanya saat hide', () => {
  const r = cleanUsage({ events: { 'view:home': 3, 'act:quiz_start': 500, 'view:bad key': 1, 'x:y': 1, 'act:nol': 0, 'act:neg': -2, 'view:abc': 'banyak', 'view:ok': 2.9 }, last: 'quiz', hide: true });
  assert.deepEqual([...r.events], [['view:home', 3], ['act:quiz_start', MAX_COUNT], ['view:ok', 2], ['last:quiz', 1]]);
  assert.equal(cleanUsage({ events: { 'view:home': 1 }, last: 'quiz' }).events.has('last:quiz'), false);
  assert.equal(cleanUsage({ events: {}, last: '../../etc', hide: true }).events.size, 0);
});
test('cleanUsage: masukan aneh tidak error, dan jumlah kunci dibatasi', () => {
  for (const x of [null, undefined, 5, 'x', [], { events: [] }, { events: 'a' }]) assert.equal(cleanUsage(x).events.size, 0);
  const many = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`view:v${i}`, 1]));
  assert.equal(cleanUsage({ events: many }).events.size, MAX_KEYS);
});
