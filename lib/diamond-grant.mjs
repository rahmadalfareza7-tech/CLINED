export const MAX_DIAMOND_GRANT = 1_000_000;
export const MAX_DIAMOND_BALANCE = 1_000_000_000;

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
  const amount = parseDiamondGrantAmount(rest);
  return { matched: true, amount };
}
