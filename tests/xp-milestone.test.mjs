import test from 'node:test';
import assert from 'node:assert/strict';
import { XP_100K_THRESHOLD, XP_100K_DIAMOND_BONUS, parseXpValue, maybeUnlock100kBadge, canUse100kBadge, is100kBadgeVisible } from '../lib/xp-milestone.mjs';

test('xp-milestone constants match 100K requirement and +50 diamond reward', () => {
  assert.equal(XP_100K_THRESHOLD, 100_000);
  assert.equal(XP_100K_DIAMOND_BONUS, 50);
});

test('parseXpValue parses JSON strings, plain numbers, and invalid values safely', () => {
  assert.equal(parseXpValue('105250'), 105250);
  assert.equal(parseXpValue(JSON.stringify(100000)), 100000);
  assert.equal(parseXpValue(99999), 99999);
  assert.equal(parseXpValue('invalid'), 0);
  assert.equal(parseXpValue(null), 0);
});

test('canUse100kBadge and is100kBadgeVisible support ON/OFF toggle and Admin access', () => {
  const lockedStudent = { role: 'student', badge_100k_at: null, badge_100k_visible: null };
  assert.equal(canUse100kBadge(lockedStudent), false);
  assert.equal(is100kBadgeVisible(lockedStudent), false);
  assert.equal(is100kBadgeVisible({ role: 'student', badge_100k_at: null, badge_100k_visible: true }), false);

  const unlockedStudent = { role: 'student', badge_100k_at: '2026-11-22T00:00:00Z', badge_100k_visible: null };
  assert.equal(canUse100kBadge(unlockedStudent), true);
  assert.equal(is100kBadgeVisible(unlockedStudent), true);
  assert.equal(is100kBadgeVisible({ ...unlockedStudent, badge_100k_visible: false }), false);
  assert.equal(is100kBadgeVisible({ ...unlockedStudent, badge_100k_visible: true }), true);

  const adminNoXp = { role: 'admin', badge_100k_at: null, badge_100k_visible: null };
  assert.equal(canUse100kBadge(adminNoXp), true);
  assert.equal(is100kBadgeVisible(adminNoXp), false);
  assert.equal(is100kBadgeVisible({ ...adminNoXp, badge_100k_visible: true }), true);
  assert.equal(is100kBadgeVisible({ ...adminNoXp, badge_100k_visible: false }), false);
});

test('maybeUnlock100kBadge ignores null pool, empty userId, or sub-threshold XP cleanly', async () => {
  assert.deepEqual(await maybeUnlock100kBadge(null, 'u1', 120000), { unlocked: false });
  assert.deepEqual(await maybeUnlock100kBadge({ async query() {}, async connect() {} }, '', 120000), { unlocked: false });
  assert.deepEqual(
    await maybeUnlock100kBadge({ async query() { return { rows: [] }; }, async connect() { throw new Error('should not connect'); } }, 'u1', 99_999),
    { unlocked: false }
  );
});

test('maybeUnlock100kBadge grants +50 diamonds once and pushes SSE event on unlock', async () => {
  const pushed = [];
  let alreadySet = false;
  const fakeClient = {
    async query(sql) {
      if (sql.includes('UPDATE users SET badge_100k_at')) {
        if (alreadySet) return { rowCount: 0, rows: [] };
        alreadySet = true;
        return { rowCount: 1, rows: [{ badge_100k_at: '2026-11-22T00:00:00Z' }] };
      }
      if (sql.includes('INSERT INTO user_card_states')) {
        return { rowCount: 1, rows: [{ diamonds: 125 }] };
      }
      return { rowCount: 0, rows: [] };
    },
    release() {}
  };
  const fakePool = {
    async query() { return { rows: [] }; },
    async connect() { return fakeClient; }
  };

  const result = await maybeUnlock100kBadge(fakePool, 'u1', 100_000, {
    ensureCardStatesFn: async () => {},
    pushFn: (uid, event, payload) => pushed.push({ uid, event, payload })
  });

  assert.equal(result.unlocked, true);
  assert.equal(result.badge, '100K Legend');
  assert.equal(result.diamondBonus, 50);
  assert.equal(result.diamonds, 125);
  assert.equal(pushed.length, 1);
  assert.equal(pushed[0].uid, 'u1');
  assert.equal(pushed[0].event, 'xp_100k_unlock');
  assert.equal(pushed[0].payload.diamondBonus, 50);
  assert.equal(pushed[0].payload.diamonds, 125);

  const second = await maybeUnlock100kBadge(fakePool, 'u1', 105_000, {
    ensureCardStatesFn: async () => {},
    pushFn: (uid, event, payload) => pushed.push({ uid, event, payload })
  });
  assert.equal(second.unlocked, false);
  assert.equal(second.alreadyUnlocked, true);
  assert.equal(pushed.length, 1);
});
