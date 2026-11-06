// Logika statistik pemakaian (murni, mudah diuji).
import { createHmac } from 'node:crypto';
export const MAX_KEYS = 40, MAX_COUNT = 200;
const KEY = /^(view|act):[A-Za-z0-9_-]{1,40}$/;
const NAME = /^[A-Za-z0-9_-]{1,40}$/;

/** Tanggal (YYYY-MM-DD) menurut WIB (UTC+7). */
export const wibDay = (ts = Date.now()) => new Date(ts + 7 * 3600e3).toISOString().slice(0, 10);
/** Senin pada minggu yang memuat tanggal itu. */
export function weekStartOf(day) {
  const d = new Date(day + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
export const actorFor = (secret, weekStart, userId) => createHmac('sha256', String(secret)).update(`${weekStart}|${userId}`).digest('hex').slice(0, 24);

/** Saring kiriman klien: hanya kunci yang dikenal polanya, jumlah dibatasi. */
export function cleanUsage(input) {
  const out = new Map(); let n = 0;
  const ev = input && typeof input.events === 'object' && input.events && !Array.isArray(input.events) ? input.events : {};
  for (const [k, v] of Object.entries(ev)) {
    if (n >= MAX_KEYS) break;
    if (!KEY.test(k)) continue;
    const c = Math.min(MAX_COUNT, Math.floor(Number(v)));
    if (!(c > 0)) continue;
    out.set(k, c); n++;
  }
  const hide = input?.hide === true;
  if (hide && typeof input.last === 'string' && NAME.test(input.last)) out.set('last:' + input.last, (out.get('last:' + input.last) || 0) + 1);
  return { events: out, hide };
}
