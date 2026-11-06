import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanStatus, cleanReaction, cleanComment, MAX_MESSAGE, MAX_COMMENT } from '../lib/status-logic.mjs';

test('status valid dirapikan', () => {
  const r = cleanStatus({ message: '  Lega banget!  \n\n\n\nSemoga lulus 🙏 ', mood: 'mantap', examName: '  UAB   KEDKOM ', scorePct: 82.4 });
  assert.deepEqual(r.value, { message: 'Lega banget!\n\nSemoga lulus 🙏', examName: 'UAB KEDKOM', mood: 'mantap', scorePct: 82 });
});
test('status ditolak bila pesan kosong', () => {
  assert.ok(cleanStatus({}).error); assert.ok(cleanStatus({ message: '   ' }).error); assert.ok(cleanStatus({ examName: 'UAB', scorePct: 90 }).error);
});
test('mood tak dikenal → semangat; skor di luar 0–100 / bukan angka diabaikan', () => {
  assert.equal(cleanStatus({ message: 'x', mood: 'aneh' }).value.mood, 'semangat');
  assert.equal(cleanStatus({ message: 'x', scorePct: 140 }).value.scorePct, null);
  assert.equal(cleanStatus({ message: 'x', scorePct: 'abc' }).value.scorePct, null);
  assert.equal(cleanStatus({ message: 'x', scorePct: 0 }).value.scorePct, 0);
  assert.equal(cleanStatus({ message: 'x' }).value.scorePct, null);
});
test('pesan dipotong, karakter kontrol & pengarah teks dibuang', () => {
  const r = cleanStatus({ message: 'a\u0000b\u202Ec\u200Bd' + 'z'.repeat(500) });
  assert.ok(r.value.message.startsWith('abcd')); assert.equal(r.value.message.length, MAX_MESSAGE);
});
test('reaksi: hanya whitelist; kosong = hapus', () => {
  assert.equal(cleanReaction('🔥'), '🔥'); assert.equal(cleanReaction(null), null); assert.equal(cleanReaction(''), null);
  assert.equal(cleanReaction('💩'), undefined); assert.equal(cleanReaction('<script>'), undefined);
});

test('komentar: dirapikan satu baris, dipotong, kosong ditolak, karakter berbahaya dibuang', () => {
  assert.deepEqual(cleanComment({ message: '  Semangat!\n\n  kamu pasti bisa   ' }).value, { message: 'Semangat! kamu pasti bisa' });
  assert.ok(cleanComment({ message: '   ' }).error); assert.ok(cleanComment({}).error);
  assert.equal(cleanComment({ message: 'k'.repeat(500) }).value.message.length, MAX_COMMENT);
  assert.equal(cleanComment({ message: 'a\u202Eb\u0000c' }).value.message, 'abc');
});
