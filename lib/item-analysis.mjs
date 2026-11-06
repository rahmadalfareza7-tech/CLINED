// Analisis butir soal: validasi masukan dan penilaian hasil agregat. Fungsi murni agar mudah diuji.
export const MAX_ITEMS = 60, MAX_PER_ITEM = 200;

const int = (v, lo, hi) => { const n = Math.trunc(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo; };

/** Bersihkan payload dari klien. Item yang tidak valid dibuang diam-diam. */
export function sanitizeItems(input) {
  const list = Array.isArray(input?.items) ? input.items.slice(0, MAX_ITEMS) : [];
  const out = [];
  for (const it of list) {
    const id = String(it?.id ?? '').trim();
    if (!id || id.length > 200) continue;
    const o = Array.isArray(it.o) ? it.o.slice(0, 5).map(x => int(x, 0, MAX_PER_ITEM)) : [];
    while (o.length < 5) o.push(0);
    const n = int(it.n, 0, MAX_PER_ITEM);
    if (!n) continue;
    const sum = o.reduce((a, b) => a + b, 0);
    if (sum > n) continue;                       // pilihan tidak boleh melebihi jumlah jawaban
    const ci = int(it.ci, 0, 4);
    const w = Math.min(int(it.w, 0, MAX_PER_ITEM), n);
    out.push({
      id, n, w, o, ci,
      src: it.src === 'mat' ? 'mat' : 'bank',
      bank: String(it.bank ?? '').slice(0, 60),
      s: String(it.s ?? '').replace(/\s+/g, ' ').trim().slice(0, 180)
    });
  }
  return out;
}

/** Ubah baris DB menjadi hasil analisis + bendera. */
export function analyzeRow(r) {
  const n = Number(r.n_total) || 0, wrong = Number(r.n_wrong) || 0;
  const opts = (r.opt_counts || []).map(Number);
  const ci = Number(r.correct_idx) || 0;
  const wrongRate = n ? wrong / n : 0;
  let topWrong = -1, topWrongCount = 0;
  opts.forEach((c, k) => { if (k !== ci && c > topWrongCount) { topWrong = k; topWrongCount = c; } });
  const correctCount = opts[ci] || 0;
  const flags = [];
  // Distraktor lebih sering dipilih daripada kunci: kunci mungkin keliru / soal ambigu.
  if (n >= 10 && topWrong >= 0 && topWrongCount > correctCount && topWrongCount / n >= 0.4) flags.push('suspect_key');
  if (n >= 10 && wrongRate >= 0.7) flags.push('very_hard');
  else if (n >= 10 && wrongRate >= 0.5) flags.push('hard');
  if (n >= 20 && wrongRate <= 0.05) flags.push('too_easy');
  return {
    id: r.question_id, source: r.source, bank: r.bank, snippet: r.snippet, correctIdx: ci,
    n, wrong, wrongRate: Math.round(wrongRate * 1000) / 10,
    optCounts: opts, topWrongIdx: topWrong, topWrongShare: n ? Math.round(topWrongCount / n * 1000) / 10 : 0,
    flags
  };
}
