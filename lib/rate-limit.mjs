// Persistent PostgreSQL-backed rate limiter for serverless cold-start resilience (with graceful in-memory fallback).

let tableReady = null;
let lastSweepAt = 0;

export async function ensureRateLimitTable(pool) {
  if (!pool) return;
  if (!tableReady) {
    tableReady = (async () => {
      await pool.query(`CREATE TABLE IF NOT EXISTS rate_limit_buckets (
        bucket_key TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 1,
        reset_at TIMESTAMPTZ NOT NULL
      )`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_reset
        ON rate_limit_buckets (reset_at)`);
    })().catch(err => {
      tableReady = null;
      throw err;
    });
  }
  return tableReady;
}

/**
 * Atomically checks and increments a persistent rate-limit bucket in PostgreSQL.
 * Returns { allowed, count, retryAfterSec } or null if DB is unavailable (caller falls back to in-memory limiter).
 */
export async function checkPersistentLimit(pool, bucketKey, max = 30, windowMs = 60_000) {
  if (!pool || !bucketKey) return null;
  const safeMax = Math.max(1, Math.floor(Number(max) || 30));
  const safeWindowSec = Math.max(5, Math.ceil((Number(windowMs) || 60_000) / 1000));
  try {
    await ensureRateLimitTable(pool);
    const r = await pool.query(
      `INSERT INTO rate_limit_buckets (bucket_key, count, reset_at)
       VALUES ($1, 1, now() + ($2::int * interval '1 second'))
       ON CONFLICT (bucket_key) DO UPDATE SET
         count = CASE
           WHEN rate_limit_buckets.reset_at <= now() THEN 1
           ELSE rate_limit_buckets.count + 1
         END,
         reset_at = CASE
           WHEN rate_limit_buckets.reset_at <= now() THEN now() + ($2::int * interval '1 second')
           ELSE rate_limit_buckets.reset_at
         END
       RETURNING count, EXTRACT(EPOCH FROM (reset_at - now())) AS remaining_sec`,
      [String(bucketKey).slice(0, 200), safeWindowSec]
    );
    const now = Date.now();
    if (now - lastSweepAt > 300_000) {
      lastSweepAt = now;
      pool.query('DELETE FROM rate_limit_buckets WHERE reset_at < now()').catch(() => {});
    }
    const row = r.rows[0];
    if (!row) return null;
    const count = Number(row.count) || 1;
    const retryAfterSec = Math.max(1, Math.ceil(Number(row.remaining_sec) || safeWindowSec));
    return { allowed: count <= safeMax, count, retryAfterSec };
  } catch {
    return null;
  }
}
