import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('Ringkasan Full Blok KEDKEL selaras jadwal TA 2026–2027 (34 materi, Minggu 1–5, 31 Drive + 3 tambahan)', () => {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(new URL('../js/kedkel-summary-data.js', import.meta.url), 'utf8'), ctx);
  const data = ctx.window.CLINED_KEDKEL_SUMMARY_DATA;
  assert.ok(data, 'CLINED_KEDKEL_SUMMARY_DATA harus terdefinisi');
  assert.equal(data.TOPICS.length, 34, 'Harus memuat tepat 34 materi KEDKEL sesuai jadwal TA 26/27');
  assert.equal(data.WEEKS.length, 5, 'Harus memuat 5 minggu jadwal perkuliahan');
  assert.ok(Array.isArray(data.SCHEDULE_META?.milestones) && data.SCHEDULE_META.milestones.length >= 4, 'Harus memuat agenda & jadwal ujian blok');

  const clusterIds = new Set(data.CLUSTERS.map(c => c.id));
  const seenIds = new Set();
  const seenDriveNos = new Set();
  let extraCount = 0;

  for (let i = 0; i < 34; i++) {
    const t = data.TOPICS[i];
    assert.equal(t.no, i + 1, `Urutan materi ke-${i + 1} harus bernomor ${i + 1}`);
    assert.ok(t.id && !seenIds.has(t.id), `ID materi ${t.no} unik`);
    seenIds.add(t.id);
    assert.ok(t.week >= 1 && t.week <= 5, `Minggu materi ${t.no} valid (1..5)`);
    assert.ok(t.weekA >= 1 && t.weekA <= 5, `Minggu Kelas A materi ${t.no} valid`);
    assert.ok(t.weekB >= 1 && t.weekB <= 5, `Minggu Kelas B materi ${t.no} valid`);
    assert.ok(String(t.schedule || '').trim().length > 5, `Jadwal materi ${t.no} terisi`);
    assert.ok(clusterIds.has(t.cluster) && t.cluster !== 'all', `Klaster materi ${t.no} valid`);
    assert.ok(String(t.title || '').trim().length > 3, `Judul materi ${t.no} tidak kosong`);
    assert.ok(String(t.tldr || '').trim().length > 20, `TL;DR materi ${t.no} cukup informatif`);
    assert.ok(Array.isArray(t.sections) && t.sections.length >= 2, `Materi ${t.no} punya minimal 2 subbagian`);
    assert.ok(Array.isArray(t.highYield) && t.highYield.length >= 1, `Materi ${t.no} punya poin ujian/high-yield`);

    if (t.driveNo != null) {
      assert.ok(t.driveNo >= 1 && t.driveNo <= 31 && !seenDriveNos.has(t.driveNo), `driveNo ${t.driveNo} valid & unik`);
      seenDriveNos.add(t.driveNo);
    } else {
      assert.equal(t.isScheduleExtra, true, `Materi non-Drive ${t.title} harus ditandai isScheduleExtra`);
      extraCount++;
    }
  }

  assert.equal(seenDriveNos.size, 31, 'Seluruh 31 materi Drive asli harus terhubung tepat 1x');
  assert.equal(extraCount, 3, 'Harus ada 3 materi tambahan jadwal TA 26/27 (Kecelakaan Kerja, Lab Rasional, Obat Cair & Inhalasi)');

  // Pastikan urutan topik monoton naik berdasarkan minggu jadwal
  for (let i = 1; i < data.TOPICS.length; i++) {
    assert.ok(data.TOPICS[i].week >= data.TOPICS[i - 1].week, `Urutan minggu harus kronologis di index ${i}`);
  }
});
