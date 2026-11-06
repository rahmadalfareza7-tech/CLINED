// Validasi event XP dari klien. Server tidak percaya jumlah mentah: dibatasi per event dan per hari.
export const KINDS = ['quiz', 'materi', 'upi', 'quest', 'userbank', 'duel', 'other'];
export const MAX_EVENT = 60;
export const DAILY_CAP = Number.MAX_SAFE_INTEGER;
export const MAX_BATCH = 50;

export function cleanEvents(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const e of list.slice(0, MAX_BATCH)) {
    if (!e || typeof e !== 'object') continue;
    const kind = KINDS.includes(e.kind) ? e.kind : 'other';
    const ref = String(e.ref ?? '').trim().slice(0, 80);
    const amount = Math.round(Number(e.amount));
    if (!ref || !Number.isFinite(amount) || amount <= 0) continue;
    out.push({ kind, ref, amount: Math.min(amount, MAX_EVENT) });
  }
  return out;
}
// Sisa kuota hari ini -> potong event yang melewati batas.
export function applyCap(events, usedToday, cap = DAILY_CAP) {
  let left = Math.max(0, cap - usedToday); const out = [];
  for (const e of events) { if (left <= 0) break; const a = Math.min(e.amount, left); out.push({ ...e, amount: a }); left -= a; }
  return out;
}
