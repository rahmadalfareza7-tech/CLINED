// Statistik pemakaian: catat (siswa) dan laporan (admin).
import { randomBytes } from 'node:crypto';
import { cleanUsage, wibDay, weekStartOf, actorFor } from './usage-logic.mjs';

export function createUsage({ getPool, json, fail, body, origin, limit }) {
  let secretCache = null;
  async function getSecret(db) {
    if (secretCache) return secretCache;
    await db.query('INSERT INTO usage_secret (id, secret) VALUES (1, $1) ON CONFLICT (id) DO NOTHING', [randomBytes(32).toString('hex')]);
    secretCache = (await db.query('SELECT secret FROM usage_secret WHERE id = 1')).rows[0].secret;
    return secretCache;
  }
  async function record(req, res, u) {
    if (req.method !== 'POST') return fail(res, 405, 'Method tidak diizinkan.');
    if (!u || u.role === 'admin') return json(res, 200, { ok: true });          // admin tidak dihitung
    origin(req); if (!limit(req, res, 30)) return;
    const c = cleanUsage(await body(req, 4000));
    const db = getPool(), day = wibDay(), actor = actorFor(await getSecret(db), weekStartOf(day), u.id);
    await db.query('INSERT INTO usage_active (day, actor) VALUES ($1::date, $2) ON CONFLICT DO NOTHING', [day, actor]);
    if (c.events.size) {
      await db.query(
        `INSERT INTO usage_events (day, event, n) SELECT $1::date, t.e, t.c FROM unnest($2::text[], $3::int[]) AS t(e, c)
         ON CONFLICT (day, event) DO UPDATE SET n = usage_events.n + EXCLUDED.n`, [day, [...c.events.keys()], [...c.events.values()]]);
    }
    if (Math.random() < 0.02) {                                                     // bersih-bersih berkala
      await db.query(`DELETE FROM usage_active WHERE day < (current_date - 200)`);
      await db.query(`DELETE FROM usage_events WHERE day < (current_date - 200)`);
    }
    return json(res, 200, { ok: true });
  }
  async function admin(req, res, u) {
    if (!u || u.role !== 'admin') return fail(res, 403, 'Akses admin diperlukan.');
    if (req.method !== 'GET') return fail(res, 405, 'Method tidak diizinkan.');
    const days = Math.min(90, Math.max(7, Number(new URL(req.url, 'https://x').searchParams.get('days')) || 28));
    const db = getPool(), since = wibDay(Date.now() - (days - 1) * 86400e3), since8w = wibDay(Date.now() - 55 * 86400e3);
    const [dau, wau, ev] = await Promise.all([
      db.query(`SELECT day::text AS day, COUNT(*)::int AS n FROM usage_active WHERE day >= $1::date GROUP BY day ORDER BY day`, [since]),
      db.query(`SELECT date_trunc('week', day)::date::text AS week, COUNT(DISTINCT actor)::int AS n FROM usage_active WHERE day >= $1::date GROUP BY 1 ORDER BY 1`, [since8w]),
      db.query(`SELECT event, SUM(n)::int AS n FROM usage_events WHERE day >= $1::date GROUP BY event ORDER BY n DESC LIMIT 300`, [since])
    ]);
    return json(res, 200, { days, today: wibDay(), dau: dau.rows, wau: wau.rows, events: ev.rows });
  }
  return { record, admin };
}
