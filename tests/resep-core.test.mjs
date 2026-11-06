import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import '../js/resep-data.js';
import '../js/resep-core.js';

const RESEP_DATA = globalThis.RESEP_DATA;
const RESEP_CORE = globalThis.RESEP_CORE;

const ROOT = path.resolve(import.meta.dirname, '..');

test('SEDIAAN memuat seluruh 26 obat Praktikum BSO Cair (Gambar 1) beserta foto bungkus & kunci Lembar Pengamatan (Gambar 2)', () => {
  const { SEDIAAN } = RESEP_DATA;
  assert.equal(SEDIAAN.length, 26, 'Harus ada tepat 26 sediaan obat sesuai Gambar 1');

  SEDIAAN.forEach((s, idx) => {
    assert.equal(s.no, idx + 1, `Nomor urut obat ke-${idx + 1} harus ${idx + 1}`);
    assert.ok(s.n && s.praktikumNama && s.tipePraktikum, `Nama & tipe praktikum wajib ada pada #${s.no}`);
    assert.ok(s.img && s.img.startsWith('assets/sediaan/'), `Path gambar bungkus wajib ada pada #${s.no}`);

    const imgPath = path.join(ROOT, s.img);
    assert.ok(fs.existsSync(imgPath), `File gambar bungkus ${s.img} harus tersedia di repo`);
    const stat = fs.statSync(imgPath);
    assert.ok(stat.size > 1000, `File gambar bungkus ${s.img} tidak boleh kosong`);

    assert.ok(s.lp, `Objek kunci Lembar Pengamatan (lp) wajib ada pada #${s.no}`);
    for (const col of ['a', 'b', 'c', 'd', 'e', 'f']) {
      assert.ok(typeof s.lp[col] === 'string' && s.lp[col].length > 5, `Kolom (${col}) wajib terisi pada #${s.no}`);
    }
  });
});

test('evalLembarPengamatan menilai 100% untuk kunci jawaban seluruh 26 obat BSO Cair', () => {
  const { SEDIAAN } = RESEP_DATA;
  const { evalLembarPengamatan } = RESEP_CORE;

  for (const s of SEDIAAN) {
    const rxLines = String(s.x || '').split('\n');
    const form = {
      a: s.lp.a,
      b: s.lp.b,
      c: s.lp.c,
      d: s.lp.d,
      e: s.lp.e,
      fR: rxLines[0]?.replace(/^\s*R\/\s*/i, '') || '',
      fS: rxLines.slice(1).join(' ').replace(/^\s*S\s*/i, '') || ''
    };
    const res = evalLembarPengamatan(s, form);
    assert.equal(res.pct, 100, `Obat #${s.no} (${s.praktikumNama}) harus mendapat skor 100% saat diisi kunci, dapat ${res.pct}%: ${JSON.stringify(res.cols)}`);
  }
});

test('RACIKAN memuat 6 resep racikan dari Buku Panduan Praktikum FK YARSI (Praktikum 1 & Praktikum 2)', () => {
  const { RACIKAN, TEORI_BSO } = RESEP_DATA;
  assert.equal(RACIKAN.length, 6, 'Harus ada 6 resep racikan praktikum (3 BSO Padat/½ Padat + 3 BSO Cair)');
  for (const r of RACIKAN) {
    assert.ok(r.nama && r.resep && (r.etiket === 'putih' || r.etiket === 'biru'));
    assert.ok(Array.isArray(r.perhitungan) && r.perhitungan.length >= 2);
    assert.ok(Array.isArray(r.fungsiBahan) && r.fungsiBahan.length >= 3);
    assert.ok(Array.isArray(r.langkah) && r.langkah.length >= 4);
  }
  assert.equal(TEORI_BSO.perbandinganCair.length, 3);
});

test('parseLine1 dan checkResep membaca dan menilai resep dengan benar', () => {
  const { parseLine1, checkResep } = RESEP_CORE;
  const { CASES } = RESEP_DATA;
  const p = parseLine1('R/ Tab. Paracetamol 500 mg no. XV');
  assert.equal(p.b, 'tab');
  assert.equal(p.o, 'Paracetamol');
  assert.equal(p.k, '500 mg');
  assert.equal(p.j, 'XV');

  const c1 = CASES[0];
  const f1 = {
    pro: c1.pro,
    usia: String(c1.usia),
    rows: c1.rows.map(r => ({
      l1: `Tab. ${r.o} ${r.k} no. ${RESEP_CORE.n2r(r.j)}`,
      l2: r.s
    }))
  };
  const score = checkResep(c1, f1);
  assert.equal(score.pct, 100);
});
