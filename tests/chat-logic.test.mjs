import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanMessage, badgesOf, isOpen, tierOf, canChat, MAX_LEN } from '../lib/chat-logic.mjs';

test('cleanMessage: kosong, terlalu panjang, rapikan spasi', () => {
  assert.ok(cleanMessage('   ').error);
  assert.ok(cleanMessage('x'.repeat(MAX_LEN + 1)).error);
  assert.equal(cleanMessage('  halo  \n\n\n\ndunia ').value, 'halo\n\ndunia');
});
test('badgesOf: dobel role helper + tempat bertanya', () => {
  assert.deepEqual(badgesOf({ role: 'helper', is_mentor: true }), ['helper', 'mentor']);
  assert.deepEqual(badgesOf({ role: 'admin' }), ['admin']);
  assert.deepEqual(badgesOf({ role: 'student', is_mentor: true }), ['mentor']);
  assert.deepEqual(badgesOf({ role: 'student' }), []);
});
test('tierOf: admin < helper < mentor < biasa', () => {
  assert.ok(tierOf({ role: 'admin' }) < tierOf({ role: 'helper' }));
  assert.ok(tierOf({ role: 'helper', is_mentor: true }) === 1);
  assert.ok(tierOf({ role: 'student', is_mentor: true }) < tierOf({ role: 'student' }));
});
test('canChat: teman, terbuka, diblokir', () => {
  assert.equal(canChat({ friend: 'accepted' }), true);
  assert.equal(canChat({ friend: null }), false);
  assert.equal(canChat({ friend: null, bOpen: true }), true);
  assert.equal(canChat({ friend: 'accepted', blocked: true }), false);
  assert.equal(isOpen({ role: 'student' }), false);
});
