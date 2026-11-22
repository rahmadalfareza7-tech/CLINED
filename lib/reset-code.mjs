import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

export const RESET_CODE_TTL_MINUTES = 30;
export const RESET_CODE_MAX_ATTEMPTS = 5;
export const RESET_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const ALLOWED_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;

export function generateResetCode() {
  const bytes = randomBytes(8);
  let raw = '';
  for (let i = 0; i < 8; i++) {
    raw += RESET_CODE_ALPHABET[bytes[i] & 31];
  }
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

export function normalizeResetCode(input) {
  const cleaned = String(input || '').toUpperCase().replace(/[\s-]+/g, '');
  return ALLOWED_RE.test(cleaned) ? cleaned : '';
}

export async function hashResetCode(rawCode, salt = randomBytes(16).toString('base64url')) {
  const normalized = normalizeResetCode(rawCode);
  if (!normalized) throw Object.assign(Error('Format kode reset tidak valid.'), { status: 400 });
  const derived = (await scrypt(normalized, salt, 64)).toString('base64url');
  return { hash: derived, salt };
}

export async function verifyResetCode(rawCode, record) {
  const normalized = normalizeResetCode(rawCode);
  if (!normalized || !record?.code_hash || !record?.code_salt) return false;
  const candidate = await scrypt(normalized, record.code_salt, 64);
  const stored = Buffer.from(record.code_hash, 'base64url');
  return stored.length === candidate.length && timingSafeEqual(stored, candidate);
}

export function checkResetCodeState(record, nowMs = Date.now()) {
  if (!record) return { ok: false, reason: 'missing' };
  if (record.used_at) return { ok: false, reason: 'used' };
  const expMs = new Date(record.expires_at).getTime();
  if (!Number.isFinite(expMs) || expMs <= nowMs) return { ok: false, reason: 'expired' };
  if (Number(record.attempts || 0) >= RESET_CODE_MAX_ATTEMPTS) return { ok: false, reason: 'locked' };
  return { ok: true };
}
