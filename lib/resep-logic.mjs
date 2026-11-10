/* Logika murni untuk "Edit Latihan Farmako" (admin/helper). Dites di tests/resep-logic.test.mjs. */
export const RESEP_DATASETS = { cases: 'id', sediaan: 'no', racikan: 'id', singk: 't', padat: 'q' };
export const MAX_PATCH_BYTES = 60_000;
const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function cleanDataset(v) {
  const s = String(v || '');
  return Object.prototype.hasOwnProperty.call(RESEP_DATASETS, s) ? s : null;
}
export function cleanItemKey(v) {
  const s = String(v ?? '').trim();
  return s && s.length <= 200 ? s : null;
}
function safe(v, depth = 0) {
  if (depth > 8) return false;
  if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) return typeof v !== 'number' || Number.isFinite(v);
  if (Array.isArray(v)) return v.length <= 500 && v.every(x => safe(x, depth + 1));
  if (typeof v === 'object') {
    const ks = Object.keys(v);
    return ks.length <= 60 && ks.every(k => !BAD_KEYS.has(k) && safe(v[k], depth + 1));
  }
  return false;
}
/* Patch = objek berisi field level atas yang berubah. Kunci identitas (id/no/t/q) tidak boleh diubah. */
export function cleanPatch(dataset, d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  const idKey = RESEP_DATASETS[dataset];
  if (!idKey || !safe(d)) return null;
  const out = { ...d };
  delete out[idKey];
  if (!Object.keys(out).length) return null;
  return JSON.stringify(out).length <= MAX_PATCH_BYTES ? out : null;
}
export function canEditResep(u) {
  return !!u && (u.role === 'admin' || u.role === 'helper');
}
