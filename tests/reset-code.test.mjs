import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateResetCode,
  normalizeResetCode,
  hashResetCode,
  verifyResetCode,
  checkResetCodeState,
  RESET_CODE_MAX_ATTEMPTS,
} from '../lib/reset-code.mjs';

test('generateResetCode produces XXXX-XXXX without ambiguous characters', () => {
  for (let i = 0; i < 30; i++) {
    const code = generateResetCode();
    assert.match(code, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/);
    assert.ok(!/[0O1I]/.test(code));
  }
});

test('normalizeResetCode strips spaces/hyphens and rejects invalid inputs', () => {
  assert.equal(normalizeResetCode('ab23-cd45'), 'AB23CD45');
  assert.equal(normalizeResetCode('  ab23 cd45  '), 'AB23CD45');
  assert.equal(normalizeResetCode('ABCD123'), ''); // too short
  assert.equal(normalizeResetCode('ABCD-01IO'), ''); // forbidden ambiguous chars
  assert.equal(normalizeResetCode(''), '');
});

test('hashResetCode and verifyResetCode verify matching codes regardless of case/hyphens', async () => {
  const code = generateResetCode();
  const { hash, salt } = await hashResetCode(code);
  const record = { code_hash: hash, code_salt: salt };

  assert.equal(await verifyResetCode(code, record), true);
  assert.equal(await verifyResetCode(code.toLowerCase().replace('-', ' '), record), true);
  assert.equal(await verifyResetCode('ZZZZ-ZZZZ', record), false);
  assert.equal(await verifyResetCode('bad', record), false);
});

test('checkResetCodeState enforces expiry, single-use, and max attempts', () => {
  const now = Date.now();
  const future = new Date(now + 10 * 60_000).toISOString();
  const past = new Date(now - 1_000).toISOString();

  assert.deepEqual(checkResetCodeState(null, now), { ok: false, reason: 'missing' });
  assert.deepEqual(checkResetCodeState({ expires_at: future, used_at: past, attempts: 0 }, now), { ok: false, reason: 'used' });
  assert.deepEqual(checkResetCodeState({ expires_at: past, used_at: null, attempts: 0 }, now), { ok: false, reason: 'expired' });
  assert.deepEqual(
    checkResetCodeState({ expires_at: future, used_at: null, attempts: RESET_CODE_MAX_ATTEMPTS }, now),
    { ok: false, reason: 'locked' }
  );
  assert.deepEqual(
    checkResetCodeState({ expires_at: future, used_at: null, attempts: RESET_CODE_MAX_ATTEMPTS - 1 }, now),
    { ok: true }
  );
});
