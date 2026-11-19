// XP di server (buku besar) + peringkat. Dipasang dari app.mjs lewat createXp(helpers).
import { cleanEvents, applyCap } from './xp-logic.mjs';

const TZ = 'Asia/Jakarta';
const DAY = `(now() AT TIME ZONE '${TZ}')::date`;
const WEEK = `date_trunc('week', now() AT TIME ZONE '${TZ}')::date`;

export function createXp({ getPool, json, fail, body, origin, limit }) {
  const db = () => getPool();
  let blockColReady = false;
  async function ensureBlockColumn() {
    if (blockColReady) return;
    await db().query('ALTER TABLE xp_events ADD COLUMN IF NOT EXISTS block VARCHAR(80)');
    blockColReady = true;
  }

  // Dipakai juga oleh duel (server) — idempoten per (user, kind, ref, hari).
  async function award(userId, kind, ref, amount, block = null) {
    await ensureBlockColumn();
    const a = cleanEvents([{ kind, ref, amount, block }]); if (!a.length) return 0;
    const used = (await db().query(`SELECT COALESCE(SUM(amount),0)::int AS n FROM xp_events WHERE user_id=$1 AND day=${DAY}`, [userId])).rows[0].n;
    const [e] = applyCap(a, used); if (!e) return 0;
    const r = await db().query(`INSERT INTO xp_events (user_id,kind,ref,amount,day,block) VALUES ($1,$2,$3,$4,${DAY},$5) ON CONFLICT DO NOTHING RETURNING amount`, [userId, e.kind, e.ref, e.amount, e.block || null]);
    return r.rowCount ? r.rows[0].amount : 0;
  }

  async function xp(req, res, u) {
    if (!u) return fail(res, 401, 'Silakan masuk terlebih dahulu.');
    if (req.method !== 'POST') return fail(res, 405, 'Method tidak diizinkan.');
    origin(req); if (!limit(req, res, 60)) return;
    await ensureBlockColumn();
    const input = await body(req, 20000);
    const events = cleanEvents(input.events);
    const used = (await db().query(`SELECT COALESCE(SUM(amount),0)::int AS n FROM xp_events WHERE user_id=$1 AND day=${DAY}`, [u.id])).rows[0].n;
    const capped = applyCap(events, used);
    let accepted = 0, gained = 0;
    for (const e of capped) {
      const r = await db().query(`INSERT INTO xp_events (user_id,kind,ref,amount,day,block) VALUES ($1,$2,$3,$4,${DAY},$5) ON CONFLICT DO NOTHING RETURNING amount`, [u.id, e.kind, e.ref, e.amount, e.block || null]);
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

  const BLOCK_ALIASES = {
    BM1: ['BM1'], BM2: ['BM2'], HNC: ['HNC'], MP1: ['MP1'], MP2: ['MP2'], MPT: ['MPT'],
    MUSKULOSKELETAL: ['MUSKULOSKELETAL', 'MUSKULO'], MUSKULO: ['MUSKULOSKELETAL', 'MUSKULO'],
    RESPIRATORY: ['RESPIRATORY', 'RESPIRASI'], RESPIRASI: ['RESPIRATORY', 'RESPIRASI'],
    KARDIOLOGI: ['KARDIOLOGI', 'KARDIO'],
    HEMATOLOGI: ['HEMATOLOGI', 'HEMATO'],
    GIT: ['GIT', 'GASTROINTESTINAL'],
    FORENSIK: ['FORENSIK'],
    GINJAL: ['GINJAL'],
    ENDOKRINE: ['ENDOKRINE', 'ENDOKRIN'], ENDOKRIN: ['ENDOKRINE', 'ENDOKRIN'],
    REPRODUKSI: ['REPRODUKSI'],
    SSP: ['SSP'],
    'PANCA INDRA': ['PANCA INDRA', 'PANCAINDRA'],
    KEDKOM: ['KEDKOM', 'KEDOKTERAN KOMUNITAS'],
    KEDKEL: ['KEDKEL', 'KEDOKTERAN KELUARGA'],
    MULSIS: ['MULSIS']
  };

  const BLOCK_PATTERNS = {
    BM1: ['bm1-%'], BM2: ['bm2-%'], HNC: ['hnc-%'], MP1: ['mp1-%'], MP2: ['mp2-%'], MPT: ['mpt-%'],
    MUSKULOSKELETAL: ['muskulo%'],
    RESPIRATORY: ['respirat%', 'respirasi%'],
    KARDIOLOGI: ['kardio%', 'cvs-2023-%'],
    HEMATOLOGI: ['hemato%'],
    GIT: ['git-%', 'gastro%'],
    FORENSIK: ['forensik%'],
    GINJAL: ['ginjal-%'],
    ENDOKRINE: ['endo-%', 'endokrin%', 'gaster-2023-%'],
    REPRODUKSI: ['repro%'],
    SSP: ['ssp-%'],
    'PANCA INDRA': ['panca-indra%', 'pancaindra%', 'indra%'],
    KEDKOM: ['kedkom-%'],
    KEDKEL: ['kedkel-%', 'farmako:%', 'sediaan:%', 'racikan:%', 'singkatan:%', 'bso:%', 'kasus:%'],
    MULSIS: ['mulsis%']
  };

  async function resolveBlockRefsAndPatterns(blockParam) {
    const aliases = BLOCK_ALIASES[blockParam] || [blockParam];
    const patterns = new Set(BLOCK_PATTERNS[aliases[0]] || BLOCK_PATTERNS[blockParam] || [blockParam.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-%']);
    const exactRefs = new Set();

    const [qbRes, cpRes] = await Promise.all([
      db().query(
        `SELECT id, questions FROM question_banks
          WHERE UPPER(REGEXP_REPLACE(REPLACE(COALESCE(block,''), '_', ' '), '^BLOK\\s+', '', 'i')) = ANY($1::text[])`,
        [aliases]
      ).catch(() => ({ rows: [] })),
      db().query(
        `SELECT id, module, title, questions FROM content_packages
          WHERE UPPER(REGEXP_REPLACE(REPLACE(COALESCE(block,''), '_', ' '), '^BLOK\\s+', '', 'i')) = ANY($1::text[])`,
        [aliases]
      ).catch(() => ({ rows: [] }))
    ]);

    for (const row of qbRes.rows) {
      const qs = Array.isArray(row.questions) ? row.questions : [];
      for (const q of qs) {
        const id = String(q?.id || '').trim().toLowerCase();
        if (id) exactRefs.add(id);
      }
    }
    for (const pkg of cpRes.rows) {
      const pid = String(pkg.id || '').trim();
      const mod = String(pkg.module || '').toUpperCase();
      const titleLow = String(pkg.title || '').trim().toLowerCase();
      if (mod === 'UAB' && pid) {
        patterns.add(`server-uab-${pid.toLowerCase()}-%`);
      }
      if (mod === 'MAT' && pid) {
        patterns.add(`mat:${pid.toLowerCase()}:%`);
        patterns.add(`mat:srv:${pid.toLowerCase()}:%`);
        if (titleLow) patterns.add(`mat:${titleLow.slice(0, 40)}:%`);
      }
      const qs = Array.isArray(pkg.questions) ? pkg.questions : [];
      for (const q of qs) {
        const id = String(q?.id || '').trim().toLowerCase();
        if (!id) continue;
        if (mod === 'UPI') exactRefs.add(`upi:${id}`);
        else if (mod === 'MAT') exactRefs.add(`mat:${pid.toLowerCase()}:${id}`.slice(0, 80));
        else exactRefs.add(id);
      }
    }

    return { aliases, exactRefs: [...exactRefs], patterns: [...patterns] };
  }

  async function leaderboard(req, res, u) {
    if (!u) return fail(res, 401, 'Silakan masuk terlebih dahulu.');
    if (req.method !== 'GET') return fail(res, 405, 'Method tidak diizinkan.');
    await ensureBlockColumn();
    const reqUrl = new URL(req.url, 'https://x');
    const blockParam = String(reqUrl.searchParams.get('block') || '').trim().replace(/_/g, ' ').replace(/^BLOK\s+/i, '').toUpperCase();
    if (blockParam) {
      const { aliases, exactRefs, patterns } = await resolveBlockRefsAndPatterns(blockParam);
      const rb = await db().query(
        `SELECT u.id, u.name, u.username, SUM(e.amount)::int AS xp_block
           FROM xp_events e
           JOIN users u ON u.id=e.user_id
          WHERE u.role IN ('student','helper')
            AND (
              UPPER(REGEXP_REPLACE(REPLACE(COALESCE(e.block,''), '_', ' '), '^BLOK\\s+', '', 'i')) = ANY($1::text[])
              OR (
                COALESCE(e.block,'') = ''
                AND (
                  (cardinality($2::text[]) > 0 AND LOWER(e.ref) = ANY($2::text[]))
                  OR LOWER(e.ref) LIKE ANY($3::text[])
                )
              )
            )
          GROUP BY u.id, u.name, u.username
          HAVING SUM(e.amount) > 0
          ORDER BY xp_block DESC, u.name ASC
          LIMIT 20`,
        [aliases, exactRefs, patterns]
      );
      return json(res, 200, {
        block: blockParam,
        me: u.id,
        rankings: rb.rows.map((row, i) => ({
          rank: i + 1, id: row.id, name: row.name, username: row.username,
          xpBlock: row.xp_block
        }))
      });
    }
    const num = `CASE WHEN x.state->'gaster_v11_xp'->>'value' ~ '^[0-9]+(\\.[0-9]+)?$' THEN ROUND((x.state->'gaster_v11_xp'->>'value')::numeric) ELSE 0 END`;
    const weekly = `COALESCE(w.xp,0)`;
    const allTime = `CASE WHEN ${num} > 0 THEN ${num} ELSE COALESCE(t.xp,0) END`;
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
    const rAll = await db().query(
      `SELECT u.id, u.name, u.username,
              (${weekly})::int AS xp_weekly,
              ${allTime}::int AS xp_all
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
        ORDER BY xp_all DESC, xp_weekly DESC, u.name ASC LIMIT 20`);
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
      })),
      rankingsAllTime: rAll.rows.map((row, i) => ({
        rank: i + 1, id: row.id, name: row.name, username: row.username,
        xpWeekly: row.xp_weekly, xpAllTime: row.xp_all
      }))
    });
  }
  return { xp, leaderboard, award };
}
