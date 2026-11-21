import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanMessage, badgesOf, isOpen, tierOf, canChat, compareUsers, MAX_LEN } from '../lib/chat-logic.mjs';

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
test('compareUsers: chat belum dibaca & percakapan terbaru selalu paling atas', () => {
  const arr = [
    { name: 'Admin A', role: 'admin', online: true, unread: 0, lastAt: 0 },
    { name: 'Teman B', role: 'student', friend: 'accepted', online: true, unread: 0, lastAt: 0 },
    { name: 'User Chat Lama', role: 'student', unread: 0, lastAt: 1000 },
    { name: 'User Chat Baru', role: 'student', unread: 0, lastAt: 5000 },
    { name: 'User Unread Lama', role: 'student', unread: 1, lastAt: 2000 },
    { name: 'User Unread Baru', role: 'student', unread: 2, lastAt: 4000 }
  ];
  arr.sort(compareUsers);
  assert.deepEqual(arr.map(x => x.name), [
    'User Unread Baru',
    'User Unread Lama',
    'User Chat Baru',
    'User Chat Lama',
    'Admin A',
    'Teman B'
  ]);
});
