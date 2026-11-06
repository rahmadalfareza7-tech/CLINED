// XP di server (buku besar) + peringkat. Dipasang dari app.mjs lewat createXp(helpers).
import { cleanEvents, applyCap } from './xp-logic.mjs';

const TZ = 'Asia/Jakarta';
const DAY = `(now() AT TIME ZONE '${TZ}')::date`;
const WEEK = `date_trunc('week', now() AT TIME ZONE '${TZ}')::date`;

export function createXp({ getPool, json, fail, body, origin, limit }) {
  const db = () => getPool();

  // Dipakai juga oleh duel (server) — idempoten per (user, kind, ref, hari).
  async function award(userId, kind, ref, amount) {
    const a = cleanEvents([{ kind, ref, amount }]); if (!a.length) return 0;
    const used = (await db().query(`SELECT COALESCE(SUM(amount),0)::int AS n FROM xp_events WHERE user_id=$1 AND day=${DAY}`, [userId])).rows[0].n;
    const [e] = applyCap(a, used); if (!e) return 0;
    const r = await db().query(`INSERT INTO xp_events (user_id,kind,ref,amount,day) VALUES ($1,$2,$3,$4,${DAY}) ON CONFLICT DO NOTHING RETURNING amount`, [userId, e.kind, e.ref, e.amount]);
    return r.rowCount ? r.rows[0].amount : 0;
  }

  async function xp(req, res, u) {
    if (!u) return fail(res, 401, 'Silakan masuk terlebih dahulu.');
    if (req.method !== 'POST') return fail(res, 405, 'Method tidak diizinkan.');
    origin(req); if (!limit(req, res, 60)) return;
    const input = await body(req, 20000);
    const events = cleanEvents(input.events);
    const used = (await db().query(`SELECT COALESCE(SUM(amount),0)::int AS n FROM xp_events WHERE user_id=$1 AND day=${DAY}`, [u.id])).rows[0].n;
    const capped = applyCap(events, used);
    let accepted = 0, gained = 0;
    for (const e of capped) {
      const r = await db().query(`INSERT INTO xp_events (user_id,kind,ref,amount,day) VALUES ($1,$2,$3,$4,${DAY}) ON CONFLICT DO NOTHING RETURNING amount`, [u.id, e.kind, e.ref, e.amount]);
      if (r.rowCount) { accepted++; gained += r.rows[0].amount; }
    }
    const w = await db().query(`SELECT COALESCE(SUM(e.amount),0)::int AS n
      FROM xp_events e
      WHERE e.user_id=$1 AND e.day >= ${WEEK}
        AND e.created_at > COALESCE(
          (SELECT b.baseline_at FROM xp_baselines b WHERE b.user_id=$1),
          '-infinity'::timestamptz
        )`, [u.id]);
    return json(res, 200, { ok: true, received: events.length, accepted, gained, weekly: w.rows[0].n });
  }

  async function leaderboard(req, res, u) {
    if (!u) return fail(res, 401, 'Silakan masuk terlebih dahulu.');
    if (req.method !== 'GET') return fail(res, 405, 'Method tidak diizinkan.');
    const num = `CASE WHEN x.state->'gaster_v11_xp'->>'value' ~ '^[0-9]+(\\.[0-9]+)?$' THEN (x.state->'gaster_v11_xp'->>'value')::numeric ELSE 0 END`;
    const weekly = `COALESCE(w.xp,0)`;
  const allTime = `CASE
    WHEN b.user_id IS NOT NULL
      THEN b.baseline_xp + COALESCE(n.xp,0)
    ELSE GREATEST(COALESCE(t.xp,0), ${num})
  END`;
    const r = await db().query(
      `SELECT u.id, u.name, u.username,
              (${weekly})::int AS xp_weekly,
              ${allTime}::int AS xp_all,
              ${WEEK}::text AS week
         FROM users u
         LEFT JOIN (
           SELECT e.user_id, SUM(e.amount) AS xp
             FROM xp_events e
            WHERE e.day >= ${WEEK}
              AND e.created_at > COALESCE(
                (SELECT b1.baseline_at FROM xp_baselines b1 WHERE b1.user_id=e.user_id),
                '-infinity'::timestamptz
              )
            GROUP BY e.user_id
         ) w ON w.user_id=u.id
         LEFT JOIN (
           SELECT user_id, SUM(amount) AS xp
             FROM xp_events
            GROUP BY user_id
         ) t ON t.user_id=u.id
         LEFT JOIN learning_states x ON x.user_id=u.id
         LEFT JOIN xp_baselines b ON b.user_id=u.id
         LEFT JOIN (
           SELECT b0.user_id, SUM(e.amount) AS xp
           FROM xp_baselines b0
           JOIN xp_events e
             ON e.user_id=b0.user_id AND e.created_at > b0.baseline_at
           GROUP BY b0.user_id
         ) n ON n.user_id=u.id
        WHERE u.role IN ('student','helper')
        ORDER BY xp_weekly DESC, xp_all DESC, u.name ASC LIMIT 20`);
    const meRow = r.rows.findIndex(x => x.id === u.id);
    let myRank = meRow >= 0 ? meRow + 1 : null, mine = meRow >= 0 ? r.rows[meRow] : null;
    if (!mine && (u.role === 'student' || u.role === 'helper')) {
      const m = await db().query(
        `WITH scores AS (
           SELECT u2.id,
             COALESCE(w.xp,0)::int AS xp_weekly,
             ${allTime}::int AS xp_all
           FROM users u2
           LEFT JOIN (
             SELECT e.user_id, SUM(e.amount) AS xp
             FROM xp_events e
             WHERE e.day >= ${WEEK}
               AND e.created_at > COALESCE(
                 (SELECT b1.baseline_at FROM xp_baselines b1 WHERE b1.user_id=e.user_id),
                 '-infinity'::timestamptz
               )
             GROUP BY e.user_id
           ) w ON w.user_id=u2.id
           LEFT JOIN (
             SELECT user_id, SUM(amount) AS xp FROM xp_events GROUP BY user_id
           ) t ON t.user_id=u2.id
           LEFT JOIN learning_states x ON x.user_id=u2.id
           LEFT JOIN xp_baselines b ON b.user_id=u2.id
           LEFT JOIN (
             SELECT b0.user_id, SUM(e.amount) AS xp
             FROM xp_baselines b0
             JOIN xp_events e
               ON e.user_id=b0.user_id AND e.created_at > b0.baseline_at
             GROUP BY b0.user_id
           ) n ON n.user_id=u2.id
           WHERE u2.role IN ('student','helper')
         )
         SELECT COALESCE((SELECT xp_weekly FROM scores WHERE id=$1),0)::int AS xp_weekly,
                (SELECT COUNT(*)::int FROM scores s
                  WHERE s.xp_weekly > COALESCE((SELECT xp_weekly FROM scores WHERE id=$1),0)
                     OR (s.xp_weekly = COALESCE((SELECT xp_weekly FROM scores WHERE id=$1),0)
                         AND s.xp_all > COALESCE((SELECT xp_all FROM scores WHERE id=$1),0))) AS ahead`,
        [u.id]
      );
      myRank = m.rows[0].ahead + 1;
      mine = { xp_weekly: m.rows[0].xp_weekly };
    }
    return json(res, 200, {
      week: r.rows[0]?.week || '', me: u.id, myRank,
      myWeekly: mine ? mine.xp_weekly : 0,
      rankings: r.rows.map((row, i) => ({
        rank: i + 1, id: row.id, name: row.name, username: row.username,
        xpWeekly: row.xp_weekly, xpAllTime: row.xp_all
      }))
    });
  }
  return { xp, leaderboard, award };
}
