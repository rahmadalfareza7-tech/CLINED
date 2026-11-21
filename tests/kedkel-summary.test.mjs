import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('Ringkasan Full Blok KEDKEL mencakup seluruh 31 materi lengkap dan terstruktur', () => {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(new URL('../js/kedkel-summary-data.js', import.meta.url), 'utf8'), ctx);
  const data = ctx.window.CLINED_KEDKEL_SUMMARY_DATA;
  assert.ok(data, 'CLINED_KEDKEL_SUMMARY_DATA harus terdefinisi');
  assert.equal(data.TOPICS.length, 31, 'Harus memuat tepat 31 materi KEDKEL');

  const clusterIds = new Set(data.CLUSTERS.map(c => c.id));
  const seenNos = new Set();
  for (let i = 0; i < 31; i++) {
    const t = data.TOPICS[i];
    assert.equal(t.no, i + 1, `Urutan materi ke-${i + 1} harus bernomor ${i + 1}`);
    assert.ok(!seenNos.has(t.no));
    seenNos.add(t.no);
    assert.ok(clusterIds.has(t.cluster) && t.cluster !== 'all', `Klaster materi ${t.no} valid`);
    assert.ok(String(t.title || '').trim().length > 3, `Judul materi ${t.no} tidak kosong`);
    assert.ok(String(t.tldr || '').trim().length > 20, `TL;DR materi ${t.no} cukup informatif`);
    assert.ok(Array.isArray(t.sections) && t.sections.length >= 2, `Materi ${t.no} punya minimal 2 subbagian`);
    assert.ok(Array.isArray(t.highYield) && t.highYield.length >= 1, `Materi ${t.no} punya poin ujian/high-yield`);
  }
});
