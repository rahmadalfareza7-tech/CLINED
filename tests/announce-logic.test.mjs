import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanStyle, cleanLink, stateOf } from '../lib/announce-logic.mjs';

test('cleanLink hanya https atau path internal', () => {
  assert.equal(cleanLink('https://a.id/x'), 'https://a.id/x');
  assert.equal(cleanLink('/glosarium'), '/glosarium');
  assert.equal(cleanLink(''), '');
  assert.equal(cleanLink('javascript:alert(1)'), null);
  assert.equal(cleanLink('//evil.com'), null);
  assert.equal(cleanLink('http://a.id'), null);
});
test('cleanStyle default dan tema kustom', () => {
  const d = cleanStyle({}).value;
  assert.equal(d.theme, 'biru'); assert.equal(d.position, 'top'); assert.equal(d.dismissible, true);
  assert.ok(cleanStyle({ theme: 'kustom', bg: 'red', fg: '#000000', accent: '#ffffff' }).error);
  assert.equal(cleanStyle({ theme: 'kustom', bg: '#AABBCC', fg: '#000000', accent: '#ffffff' }).value.bg, '#aabbcc');
});
test('cleanStyle: tombol butuh label+tautan, ikon aman', () => {
  assert.ok(cleanStyle({ buttonLabel: 'Buka' }).error);
  assert.ok(cleanStyle({ buttonLabel: 'Buka', buttonUrl: 'javascript:x' }).error);
  assert.equal(cleanStyle({ icon: '<b>' }).value.icon, '📣');
  assert.equal(cleanStyle({ buttonLabel: 'Buka', buttonUrl: '/x' }).value.buttonUrl, '/x');
  assert.equal(cleanStyle({ autoHide: 7 }).value.autoHide, 0);
});
test('stateOf', () => {
  const now = Date.now();
  assert.equal(stateOf({ published: false }), 'draft');
  assert.equal(stateOf({ published: true }), 'live');
  assert.equal(stateOf({ published: true, expires_at: new Date(now - 1000) }), 'expired');
  assert.equal(stateOf({ published: true, starts_at: new Date(now + 60000) }), 'scheduled');
});
