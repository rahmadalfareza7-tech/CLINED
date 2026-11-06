// Aturan murni untuk komentar soal (mudah diuji tanpa database).
export const MAX_LEN = 1000, MIN_LEN = 2, DAILY_LIMIT = 40;
const KEY = /^[A-Za-z0-9_.:|\-]{3,200}$/;
export const validKey = k => KEY.test(String(k || ''));
export function cleanComment(raw) {
  const v = String(raw ?? '').replace(/\r\n/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f​-‏‪-‮]/g, '').replace(/\n{3,}/g, '\n\n').trim();
  if (v.length < MIN_LEN) return { error: 'Komentar terlalu pendek.' };
  if (v.length > MAX_LEN) return { error: `Komentar maksimal ${MAX_LEN} karakter.` };
  return { value: v };
}
export const cleanVote = v => { const n = Number(v); return n === 1 || n === -1 || n === 0 ? n : null; };
/** Urut: skor (suka - tidak suka) tertinggi dulu, lalu terbaru. */
export const rank = list => list.slice().sort((a, b) => ((b.up - b.down) - (a.up - a.down)) || (b.at - a.at));
export const canDelete = (user, c) => !!user && (c.userId === user.id || user.role === 'admin' || user.role === 'helper');
