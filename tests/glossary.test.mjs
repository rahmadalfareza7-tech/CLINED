import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanTerm, parseCsv, termKey } from '../lib/glossary-logic.mjs';
await import('../js/glossary-match.js');
const { build, find } = globalThis.ClinedGlossaryMatch;

test('cleanTerm merapikan dan menolak entri kosong', () => {
  const r = cleanTerm({ term: '  Glomerulonefritis   akut ', aliases: 'GNA; glomerulonefritis akut ,GN akut', definition: ' Radang glomerulus ginjal.  ', source: ' Dorland ', verified: 1 });
  assert.deepEqual(r.value, { term: 'Glomerulonefritis akut', termKey: 'glomerulonefritis akut', aliases: ['GNA', 'GN akut'], definition: 'Radang glomerulus ginjal.', source: 'Dorland', verified: true });
  assert.ok(cleanTerm({ term: 'a', definition: 'cukup panjang kok' }).error);
  assert.ok(cleanTerm({ term: 'Edema', definition: '' }).error);
  assert.ok(cleanTerm({ term: 'Edema', definition: 'pendek' }).error);
});
test('cleanTerm membuang karakter pengarah teks dan memotong panjang', () => {
  const r = cleanTerm({ term: 'Ede\u202Ema', definition: 'x'.repeat(3000) });
  assert.equal(r.value.term, 'Edema'); assert.equal(r.value.definition.length, 1500);
});
test('parseCsv: kutip, koma di dalam sel, baris baru di dalam sel', () => {
  const rows = parseCsv('term,aliases,definition,source\n"Edema","bengkak; sembab","Penimbunan cairan, di jaringan.\nBaris dua","Kamus"\nIskemia,,"Kurang aliran darah",');
  assert.equal(rows.length, 2); assert.equal(rows[0].definition, 'Penimbunan cairan, di jaringan.\nBaris dua'); assert.equal(rows[1].term, 'Iskemia');
  assert.deepEqual(parseCsv('foo,bar\n1,2'), []);
});
test('pencocok: batas kata, frasa terpanjang, huruf besar-kecil, kemunculan pertama saja', () => {
  const m = build([{ id: 1, term: 'edema' }, { id: 2, term: 'edema paru', aliases: ['EP'] }, { id: 3, term: 'nefritis' }]);
  const t = 'Edema paru akut. Edema lain. Tidak ada glomerulonefritis, hanya nefritis dan edemaX.';
  const f = find(t, m);
  assert.deepEqual(f.map(x => [x.id, t.slice(x.start, x.end)]), [[2, 'Edema paru'], [1, 'Edema'], [3, 'nefritis']]);
});
test('pencocok: alias, spasi ganda, tanpa istilah, dan batas jumlah', () => {
  const m = build([{ id: 1, term: 'tubuloglomerular feedback', aliases: ['TGF'] }]);
  assert.equal(find('Mekanisme  tubuloglomerular   feedback bekerja', m).length, 1);
  assert.equal(find('Peran TGF di ginjal', m)[0].id, 1);
  assert.deepEqual(find('apa saja', build([])), []);
  const many = build(Array.from({ length: 30 }, (_, i) => ({ id: i, term: 'istilah' + String.fromCharCode(97 + (i % 26)) + i })));
  assert.equal(find(Array.from({ length: 30 }, (_, i) => 'istilah' + String.fromCharCode(97 + (i % 26)) + i).join(' '), many, 5).length, 5);
});
test('termKey konsisten', () => assert.equal(termKey('  Ede\u200Bma  Paru '), 'edema paru'));

import { readFileSync } from 'node:fs';
test('data awal: CSV lolos validasi dan konsisten dengan migrasi seed', () => {
  const rows = ['glosarium-awal.csv', 'glosarium-impor-1.csv'].flatMap(f => parseCsv(readFileSync(new URL('../seed-data/' + f, import.meta.url), 'utf8')));
  const sql = ['022_glossary_seed.sql', '023_glossary_seed_2.sql', '024_glossary_seed_3.sql', '025_glossary_seed_4.sql', '027_glossary_import_1.sql'].map(f => readFileSync(new URL('../db/migrations/' + f, import.meta.url), 'utf8')).join('\n');
  assert.ok(rows.length >= 168);
  for (const r of rows) {
    const c = cleanTerm(r);
    assert.ok(c.value, `${r.term}: ${c.error}`);
    assert.ok(c.value.source.length > 5, `${r.term}: sumber wajib ada`);
    assert.equal(c.value.verified, false);
    for (const a of c.value.aliases) assert.ok(sql.includes(`$g$${a}$g$`), `alias ${a} tidak ada di migrasi`);
    assert.ok(sql.includes(`$g$${c.value.term}$g$`) && sql.includes(c.value.definition), `${r.term} tidak ada di migrasi seed`);
  }
  assert.equal((sql.match(/\$g\$/g).length % 2), 0, 'pembuka dan penutup dollar-quote harus berpasangan');
});
