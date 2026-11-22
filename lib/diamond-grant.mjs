export const MAX_DIAMOND_GRANT = 1_000_000;
export const MAX_DIAMOND_BALANCE = 1_000_000_000;
export const MAX_DIAMOND_NOTE = 240;

export function cleanDiamondGrantNote(raw) {
  return String(raw ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_DIAMOND_NOTE);
}

export function parseDiamondGrantAmount(raw) {
  if (typeof raw === 'number') {
    if (!Number.isInteger(raw) || raw < 1 || raw > MAX_DIAMOND_GRANT) return null;
    return raw;
  }
  const cleaned = String(raw ?? '').trim().replace(/[.,_\s]+/g, '');
  if (!/^\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  if (!Number.isSafeInteger(n) || n < 1 || n > MAX_DIAMOND_GRANT) return null;
  return n;
}

export function parseGiveDiamondAllCommand(input) {
  const s = String(input ?? '').trim();
  if (!/^\/givediamondtoall(?:\s|$)/i.test(s)) return null;
  const rest = s.replace(/^\/givediamondtoall\b/i, '').trim();
  if (!rest) return { matched: true, amount: null, note: '' };
  const m = rest.match(/^([^\s]+)(?:\s+([\s\S]+))?$/);
  const amount = parseDiamondGrantAmount(m ? m[1] : rest);
  const note = amount ? cleanDiamondGrantNote(m && m[2] ? m[2] : '') : '';
  return { matched: true, amount, note };
}
