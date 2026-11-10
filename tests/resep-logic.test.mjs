import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { cleanDataset, cleanItemKey, cleanPatch, canEditResep } from '../lib/resep-logic.mjs';

test('hanya admin dan helper boleh mengedit', () => {
  assert.equal(canEditResep({ role: 'admin' }), true);
  assert.equal(canEditResep({ role: 'helper' }), true);
  assert.equal(canEditResep({ role: 'student' }), false);
  assert.equal(canEditResep({ role: 'developer' }), false);
  assert.equal(canEditResep(null), false);
});
test('dataset & key divalidasi', () => {
  assert.equal(cleanDataset('cases'), 'cases');
  assert.equal(cleanDataset('users'), null);
  assert.equal(cleanDataset('__proto__'), null);
  assert.equal(cleanItemKey(' 7 '), '7');
  assert.equal(cleanItemKey(''), null);
  assert.equal(cleanItemKey('x'.repeat(201)), null);
});
test('patch: buang kunci identitas, tolak __proto__ & data kosong/besar', () => {
  assert.deepEqual(cleanPatch('cases', { id: 99, dx: 'TB' }), { dx: 'TB' });
  assert.equal(cleanPatch('cases', { id: 1 }), null);
  assert.equal(cleanPatch('cases', null), null);
  assert.equal(cleanPatch('cases', []), null);
  assert.equal(cleanPatch('cases', JSON.parse('{"a":{"__proto__":{"x":1}}}')), null);
  assert.equal(cleanPatch('cases', { v: 'x'.repeat(70000) }), null);
  assert.equal(cleanPatch('nope', { a: 1 }), null);
});

/* ---- penggabungan data di sisi klien ---- */
const EDITOR_SRC = fs.readFileSync(new URL('../js/resep-editor.js', import.meta.url), 'utf8');
function boot() {
  const store = {};
  globalThis.window = { RESEP_DATA: { CASES: [{ id: 1, dx: 'TB', cat: '', p: ['A'], rows: [] }, { id: 2, dx: 'Mal' }], SEDIAAN: [{ no: 1, n: 'X', lp: { a: 'a1' } }], RACIKAN: [], SINGK: [{ t: 'dd', a: 'per hari' }], PADAT: [] }, authCurrentUser: () => ({ role: 'helper' }) };
  globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
  globalThis.fetch = async () => ({ ok: false });
  globalThis.document = { createElement() {}, getElementById() {}, querySelector() {} };
  vm.runInThisContext(EDITOR_SRC);
  return window;
}
test('override digabung di tempat, reset mengembalikan bawaan', () => {
  const w = boot(), c1 = w.RESEP_DATA.CASES[0];
  w.RESEP_EDIT.applyAll([{ dataset: 'cases', key: '1', data: { dx: 'TB paru', cat: 'baru' } }]);
  assert.equal(c1, w.RESEP_DATA.CASES[0]);            // referensi sama
  assert.equal(c1.dx, 'TB paru'); assert.equal(c1.cat, 'baru'); assert.deepEqual(c1.p, ['A']);
  assert.equal(w.RESEP_EDIT.isEdited('cases', 1), true);
  w.RESEP_EDIT.applyAll([]);                           // override dihapus di server
  assert.equal(c1.dx, 'TB'); assert.equal(c1.cat, ''); assert.equal(w.RESEP_EDIT.isEdited('cases', 1), false);
});
test('tombol edit hanya muncul untuk admin/helper', () => {
  const w = boot();
  assert.match(w.RESEP_EDIT.btn('cases', 1), /data-re-edit="cases:1"/);
  w.authCurrentUser = () => ({ role: 'student' });
  assert.equal(w.RESEP_EDIT.btn('cases', 1), '');
});
test('override item yang tidak ada diabaikan; key string (singkatan) bekerja', () => {
  const w = boot();
  assert.equal(w.RESEP_EDIT.applyOne('cases', 999, { dx: 'x' }), false);
  assert.equal(w.RESEP_EDIT.applyOne('singk', 'dd', { a: 'sehari' }), true);
  assert.equal(w.RESEP_DATA.SINGK[0].a, 'sehari');
});
