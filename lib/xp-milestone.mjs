import { randomUUID } from 'node:crypto';

export const XP_100K_THRESHOLD = 100_000;
export const XP_100K_DIAMOND_BONUS = 50;
const MAX_DIAMOND_BALANCE = 1_000_000_000;

export function parseXpValue(raw) {
  if (typeof raw === 'number') return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : 0;
  if (typeof raw !== 'string') return 0;
  try {
    const parsed = JSON.parse(raw || '0');
    const n = Number(parsed);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
  } catch {
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
  }
}

export function canUse100kBadge(u) {
  if (!u) return false;
  return Boolean(u.badge_100k_at || u.role === 'admin' || u.role === 'developer');
}

export function is100kBadgeVisible(u) {
  if (!canUse100kBadge(u)) return false;
  if (u.badge_100k_visible === false) return false;
  if (u.badge_100k_visible === true) return true;
  return Boolean(u.badge_100k_at);
}

export function isUserShownInLeaderboard(u) {
  if (!u) return false;
  if (u.role === 'admin' || u.role === 'developer') return Boolean(u.show_in_leaderboard);
  return u.role === 'student' || u.role === 'helper';
}

let badgeColReady = false;
export async function ensure100kBadgeColumn(q) {
  if (badgeColReady) return;
  await q.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS badge_100k_at TIMESTAMPTZ');
  await q.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS badge_100k_visible BOOLEAN');
  await q.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS show_in_leaderboard BOOLEAN NOT NULL DEFAULT false');
  badgeColReady = true;
}

export async function getUserAllTimeXp(q, userId) {
  const r = await q.query(
    `SELECT GREATEST(
       COALESCE((
         SELECT CASE WHEN ls.state->'gaster_v11_xp'->>'value' ~ '^[0-9]+(\\.[0-9]+)?$'
                     THEN ROUND((ls.state->'gaster_v11_xp'->>'value')::numeric)::bigint ELSE 0 END
           FROM learning_states ls WHERE ls.user_id = $1
       ), 0),
       COALESCE((
         SELECT SUM(e.amount)::bigint
           FROM xp_events e
          WHERE e.user_id = $1 AND e.kind <> 'userbank' AND LOWER(e.ref) NOT LIKE 'duel-local:%'
       ), 0)
     )::bigint AS xp_all`,
    [userId]
  );
  return Number(r.rows[0]?.xp_all || 0);
}

export async function maybeUnlock100kBadge(pool, userId, candidateXp = null, { pushFn = null, ensureCardStatesFn = null } = {}) {
  if (!pool || !userId || typeof pool.connect !== 'function') return { unlocked: false };
  await ensure100kBadgeColumn(pool);

  let effectiveXp = candidateXp == null ? null : Math.round(Number(candidateXp) || 0);
  if (effectiveXp !== null && effectiveXp < XP_100K_THRESHOLD) {
    return { unlocked: false };
  }
  if (effectiveXp === null) {
    effectiveXp = await getUserAllTimeXp(pool, userId);
    if (effectiveXp < XP_100K_THRESHOLD) return { unlocked: false };
  }

  if (typeof ensureCardStatesFn === 'function') {
    await ensureCardStatesFn();
  } else {
    const { ensureCardStatesTable } = await import('./cards.mjs');
    await ensureCardStatesTable();
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const uRes = await client.query(
      `UPDATE users SET badge_100k_at = now()
        WHERE id = $1 AND badge_100k_at IS NULL
        RETURNING badge_100k_at`,
      [userId]
    );
    if (!uRes.rowCount) {
      await client.query('COMMIT');
      return { unlocked: false, alreadyUnlocked: true };
    }
    const cRes = await client.query(
      `INSERT INTO user_card_states (user_id, diamonds, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (user_id) DO UPDATE SET
         diamonds = LEAST($3::int, user_card_states.diamonds + EXCLUDED.diamonds),
         updated_at = now()
       RETURNING diamonds`,
      [userId, XP_100K_DIAMOND_BONUS, MAX_DIAMOND_BALANCE]
    );
    const totalDiamonds = Number(cRes.rows[0]?.diamonds) || XP_100K_DIAMOND_BONUS;
    await client.query(
      `INSERT INTO activity_logs (id, user_id, action, metadata) VALUES ($1, $2, $3, $4::jsonb)`,
      [randomUUID(), userId, 'xp_100k_unlock', JSON.stringify({ xpAllTime: effectiveXp, diamondBonus: XP_100K_DIAMOND_BONUS })]
    ).catch(() => {});
    await client.query('COMMIT');

    const payload = {
      badge: '100K Legend',
      xpThreshold: XP_100K_THRESHOLD,
      xpAllTime: effectiveXp,
      xpTotal: effectiveXp,
      diamondBonus: XP_100K_DIAMOND_BONUS,
      diamonds: totalDiamonds,
      unlockedAt: uRes.rows[0].badge_100k_at,
      at: Date.now()
    };
    if (typeof pushFn === 'function') {
      try { pushFn(userId, 'xp_100k_unlock', payload); } catch {}
    }
    return { unlocked: true, ...payload };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
