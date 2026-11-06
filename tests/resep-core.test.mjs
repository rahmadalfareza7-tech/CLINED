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

test('Seluruh 20 CASES pada fitur Kasus / Tulis Resep mendapat skor 100% baik untuk kunci utama maupun variasi penulisan mahasiswa', () => {
  const { CASES } = RESEP_DATA;
  const { checkResep, line1Of } = RESEP_CORE;
  assert.equal(CASES.length, 20, 'Harus ada 20 kasus klinis');

  // 1. Pastikan seluruh 20 kasus mendapat 100% dengan kunci utamanya (line1Of(k) & k.s)
  for (const c of CASES) {
    const f = {
      pro: c.pro,
      usia: `${c.usia} th`,
      rows: c.rows.map(k => ({ l1: line1Of(k), l2: k.s }))
    };
    const res = checkResep(c, f);
    assert.equal(res.pct, 100, `Kasus #${c.id} (${c.ringkas}) harus 100% dengan kunci utama, dapat ${res.pct}%: ${JSON.stringify(res.out)}`);

    // Pastikan setiap alternatif sAlt & variasi obat pengganti (v) juga 100%
    for (let i = 0; i < c.rows.length; i++) {
      const k = c.rows[i];
      if (Array.isArray(k.sAlt)) {
        for (const sa of k.sAlt) {
          const rowsAlt = c.rows.map((r, idx) => ({ l1: line1Of(r), l2: idx === i ? sa : r.s }));
          const resAlt = checkResep(c, { pro: c.pro, usia: String(c.usia), rows: rowsAlt });
          assert.equal(resAlt.pct, 100, `Kasus #${c.id} sAlt "${sa}" pada obat ${k.o} harus 100%, dapat ${resAlt.pct}%`);
        }
      }
      if (Array.isArray(k.v)) {
        for (const v of k.v) {
          const merged = { ...k, ...v };
          const rowsVar = c.rows.map((r, idx) => ({ l1: idx === i ? line1Of(merged) : line1Of(r), l2: idx === i ? merged.s : r.s }));
          const resVar = checkResep(c, { pro: c.pro, usia: String(c.usia), rows: rowsVar });
          assert.equal(resVar.pct, 100, `Kasus #${c.id} variasi obat "${merged.o}" harus 100%, dapat ${resVar.pct}%`);
        }
      }
    }
  }

  // 2. Uji variasi penulisan natural mahasiswa pada kasus-kasus khusus
  // Kasus 6 (Askariasis Anak): Susp. Pirantel pamoat + cth II + Syr. Ferriz
  const c6 = CASES.find(c => c.id === 6);
  const res6 = checkResep(c6, {
    pro: c6.pro,
    usia: `${c6.usia} tahun`,
    rows: [
      { l1: 'Susp. Pirantel pamoat 125 mg/5 ml fl. I', l2: '1 dd cth II pc' },
      { l1: 'Syr. Ferriz 15 mg/5 ml btl I', l2: '1 dd 1/2 cth ac' }
    ]
  });
  assert.equal(res6.pct, 100, `Kasus 6 variasi Susp. + cth II harus 100%, dapat ${res6.pct}%`);

  // Kasus 7 (Konjungtivitis): Gtt. ophth. Kloramfenikol 0,5% fl. I + S 6 dd gtt I o.d.s.
  const c7 = CASES.find(c => c.id === 7);
  const res7 = checkResep(c7, {
    pro: c7.pro,
    usia: String(c7.usia),
    rows: [
      { l1: 'Gtt. ophth. Chloramphenicol 0,5% fl. I', l2: '6 dd gtt I o.d.s.' }
    ]
  });
  assert.equal(res7.pct, 100, `Kasus 7 variasi Gtt. ophth. + o.d.s. harus 100%, dapat ${res7.pct}%`);

  // Kasus 10 (Asma): Turbuhaler Budesonid & Inhaler Salbutamol dengan puff
  const c10 = CASES.find(c => c.id === 10);
  const res10 = checkResep(c10, {
    pro: c10.pro,
    usia: String(c10.usia),
    rows: [
      { l1: 'Turbuhaler Budesonid fl. I', l2: '2 dd puff I' },
      { l1: 'Inhaler Salbutamol fl I', l2: '2 dd puff I prn' }
    ]
  });
  assert.equal(res10.pct, 100, `Kasus 10 variasi puff harus 100%, dapat ${res10.pct}%`);

  // Kasus 14 (OMSA): Caps. Amoksisilin + Tetes telinga Kloramfenikol 1% fl. I + S 3 dd gtt II a.s.
  const c14 = CASES.find(c => c.id === 14);
  const res14 = checkResep(c14, {
    pro: c14.pro,
    usia: String(c14.usia),
    rows: [
      { l1: 'Caps. Amoxicillin 500 mg no. XXI', l2: '3 dd caps I pc' },
      { l1: 'Tetes telinga Kloramfenikol 1% fl. I', l2: '3 dd gtt II a.s.' }
    ]
  });
  assert.equal(res14.pct, 100, `Kasus 14 variasi 1% + a.s. harus 100%, dapat ${res14.pct}%`);

  // Kasus 17 (Disentri amuba): Sach. Oralit + S 3 dd sach I add aqua 200 ml
  const c17 = CASES.find(c => c.id === 17);
  const res17 = checkResep(c17, {
    pro: c17.pro,
    usia: String(c17.usia),
    rows: [
      { l1: 'Tab. Metronidazole 500 mg no. XXI', l2: '3 dd tab I pc' },
      { l1: 'Caps. Paromomisin 250 mg no. XXI', l2: '3 dd caps I pc' },
      { l1: 'Sach. Oralit no. X', l2: '3 dd sach I add aqua 200 ml' },
      { l1: 'Tab. Parasetamol 500 mg no. X', l2: '3 dd tab I prn' },
      { l1: 'Tab. Hyoscine 10 mg no. X', l2: '3 dd tab I prn' }
    ]
  });
  assert.equal(res17.pct, 100, `Kasus 17 variasi sach I harus 100%, dapat ${res17.pct}%`);

  // Kasus 19 (Pielonefritis): R/ Ceftriaxone 1 g vial I + S i.m.m.
  const c19 = CASES.find(c => c.id === 19);
  const res19 = checkResep(c19, {
    pro: c19.pro,
    usia: String(c19.usia),
    rows: [
      { l1: 'Ceftriaxone 1 g vial I', l2: 'i.m.m.' },
      { l1: 'Tab. Ciprofloxacin 500 mg no. XIV', l2: '2 dd tab I pc' },
      { l1: 'Tab. Paracetamol 500 mg no. X', l2: '3 dd tab I prn' }
    ]
  });
  assert.equal(res19.pct, 100, `Kasus 19 variasi Ceftriaxone vial I + i.m.m. harus 100%, dapat ${res19.pct}%`);
});

