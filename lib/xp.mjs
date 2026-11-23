// XP di server (buku besar) + peringkat. Dipasang dari app.mjs lewat createXp(helpers).
import { cleanEvents, applyCap } from './xp-logic.mjs';
import { userAvatarUrl, userDecoUrl, userBannerUrl, userNameColor } from './http.mjs';
import { push } from './stream.mjs';
import { maybeUnlock100kBadge, is100kBadgeVisible, ensure100kBadgeColumn, XP_100K_THRESHOLD } from './xp-milestone.mjs';
import { cleanChampionBlocks } from './champion-tags.mjs';
import { bumpSyncedXp } from './sync.mjs';

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

  async function syncLedgerXpToState(userId, clientId = '') {
    try {
      const r = await db().query(
        `SELECT COALESCE(SUM(amount), 0)::bigint AS xp
           FROM xp_events
          WHERE user_id=$1 AND kind <> 'userbank' AND LOWER(ref) NOT LIKE 'duel-local:%'`,
        [userId]
      );
      const ledgerXp = Math.max(0, Math.round(Number(r.rows[0]?.xp) || 0));
      return await bumpSyncedXp(db(), userId, ledgerXp, { clientId });
    } catch {
      return 0;
    }
  }

  // Dipakai juga oleh duel (server) — idempoten per (user, kind, ref, hari), dengan upgrade jika nilai lebih tinggi (misal salah +5 -> benar +20).
  async function award(userId, kind, ref, amount, block = null) {
    await ensureBlockColumn();
    const a = cleanEvents([{ kind, ref, amount, block }]); if (!a.length) return 0;
    const used = (await db().query(`SELECT COALESCE(SUM(amount),0)::int AS n FROM xp_events WHERE user_id=$1 AND day=${DAY}`, [userId])).rows[0].n;
    const [e] = applyCap(a, used); if (!e) return 0;
    const r = await db().query(
      `INSERT INTO xp_events (user_id,kind,ref,amount,day,block) VALUES ($1,$2,$3,$4,${DAY},$5)
       ON CONFLICT (user_id,kind,ref,day) DO UPDATE
       SET amount = GREATEST(xp_events.amount, EXCLUDED.amount),
           block = COALESCE(xp_events.block, EXCLUDED.block)
       WHERE EXCLUDED.amount > xp_events.amount
       RETURNING amount`,
      [userId, e.kind, e.ref, e.amount, e.block || null]
    );
    if (r.rowCount) {
      syncLedgerXpToState(userId).catch(() => {});
      maybeUnlock100kBadge(db(), userId, null, { pushFn: push }).catch(() => {});
    }
    return r.rowCount ? r.rows[0].amount : 0;
  }

  async function xp(req, res, u) {
    if (!u) return fail(res, 401, 'Silakan masuk terlebih dahulu.');
    if (req.method !== 'POST') return fail(res, 405, 'Method tidak diizinkan.');
    origin(req); if (!limit(req, res, 60)) return;
    await ensureBlockColumn();
    const input = await body(req, 20000);
    const clientId = String(input.clientId || '').slice(0, 64);
    const events = cleanEvents(input.events);
    const used = (await db().query(`SELECT COALESCE(SUM(amount),0)::int AS n FROM xp_events WHERE user_id=$1 AND day=${DAY}`, [u.id])).rows[0].n;
    const capped = applyCap(events, used);
    let accepted = 0, gained = 0;
    for (const e of capped) {
      const r = await db().query(
        `INSERT INTO xp_events (user_id,kind,ref,amount,day,block) VALUES ($1,$2,$3,$4,${DAY},$5)
         ON CONFLICT (user_id,kind,ref,day) DO UPDATE
         SET amount = GREATEST(xp_events.amount, EXCLUDED.amount),
             block = COALESCE(xp_events.block, EXCLUDED.block)
         WHERE EXCLUDED.amount > xp_events.amount
         RETURNING amount`,
        [u.id, e.kind, e.ref, e.amount, e.block || null]
      );
      if (r.rowCount) { accepted++; gained += r.rows[0].amount; }
    }
    const [w, xpAllTime] = await Promise.all([
      db().query(`SELECT COALESCE(SUM(e.amount),0)::int AS n
        FROM xp_events e
        WHERE e.user_id=$1 AND e.day >= ${WEEK}
          AND e.created_at > COALESCE(
            (SELECT b.baseline_at FROM xp_baselines b WHERE b.user_id=$1),
            '-infinity'::timestamptz
          )`, [u.id]),
      syncLedgerXpToState(u.id, clientId)
    ]);
    let unlocked100k = null;
    if (gained > 0 && !u.badge_100k_at) {
      try {
        const res100k = await maybeUnlock100kBadge(db(), u.id, xpAllTime || null, { pushFn: push });
        if (res100k.unlocked) unlocked100k = res100k;
      } catch {}
    }
    return json(res, 200, { ok: true, received: events.length, accepted, gained, weekly: w.rows[0].n, xpAllTime, ...(unlocked100k ? { unlocked100k } : {}) });
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
    const bankIds = new Set();

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
      if (row.id) bankIds.add(String(row.id).trim().toLowerCase());
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
        bankIds.add(`server-uab-${pid.toLowerCase()}`);
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

    return { aliases, bankIds, exactRefSet: exactRefs, exactRefs: [...exactRefs], patterns: [...patterns] };
  }

  function compileLikeRegex(patterns) {
    return patterns.map(p => {
      const esc = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*');
      return new RegExp(`^${esc}$`, 'i');
    });
  }

  async function leaderboard(req, res, u) {
    if (!u) return fail(res, 401, 'Silakan masuk terlebih dahulu.');
    if (req.method !== 'GET') return fail(res, 405, 'Method tidak diizinkan.');
    await ensureBlockColumn();
    await ensure100kBadgeColumn(db());
    const LB_ROLE_FILTER = `(u.role IN ('student','helper') OR (u.role='admin' AND COALESCE(u.show_in_leaderboard, false)=true))`;
    const LB_ROLE_FILTER_U2 = `(u2.role IN ('student','helper') OR (u2.role='admin' AND COALESCE(u2.show_in_leaderboard, false)=true))`;
    const reqUrl = new URL(req.url, 'https://x');
    const blockParam = String(reqUrl.searchParams.get('block') || '').trim().replace(/_/g, ' ').replace(/^BLOK\s+/i, '').toUpperCase();
    if (blockParam) {
      const { aliases, bankIds, exactRefSet, exactRefs, patterns } = await resolveBlockRefsAndPatterns(blockParam);
      const regexes = compileLikeRegex(patterns);

      const [evRes, qsRes, attRes] = await Promise.all([
        db().query(
          `SELECT u.id, u.name, u.username, u.role, u.badge_100k_at, u.badge_100k_visible, u.champion_blocks, (u.avatar_url IS NOT NULL) AS avatar_url, u.chat_avatar_deco, CASE WHEN u.chat_banner_url LIKE 'preset:%' THEN u.chat_banner_url WHEN u.chat_banner_url IS NOT NULL THEN 'custom' ELSE NULL END AS chat_banner_url, u.chat_name_color, u.updated_at, SUM(e.amount)::int AS xp_block
             FROM xp_events e
             JOIN users u ON u.id=e.user_id
            WHERE ${LB_ROLE_FILTER}
              AND e.kind NOT IN ('userbank','duel')
              AND LOWER(e.ref) NOT LIKE 'duel-local:%'
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
            GROUP BY u.id, u.name, u.username, u.role, u.badge_100k_at, u.badge_100k_visible, u.champion_blocks, u.avatar_url, u.chat_avatar_deco, u.chat_banner_url, u.chat_name_color, u.updated_at
            HAVING SUM(e.amount) > 0`,
          [aliases, exactRefs, patterns]
        ),
        db().query(
          `SELECT u.id, u.name, u.username, u.role, u.badge_100k_at, u.badge_100k_visible, u.champion_blocks, (u.avatar_url IS NOT NULL) AS avatar_url, u.chat_avatar_deco, CASE WHEN u.chat_banner_url LIKE 'preset:%' THEN u.chat_banner_url WHEN u.chat_banner_url IS NOT NULL THEN 'custom' ELSE NULL END AS chat_banner_url, u.chat_name_color, u.updated_at, x.state->'gaster_v22_question_performance'->>'value' AS qstats
             FROM users u
             JOIN learning_states x ON x.user_id=u.id
            WHERE ${LB_ROLE_FILTER}
              AND x.state ? 'gaster_v22_question_performance'`
        ).catch(() => ({ rows: [] })),
        db().query(
          `SELECT u.id, u.name, u.username, u.role, u.badge_100k_at, u.badge_100k_visible, u.champion_blocks, (u.avatar_url IS NOT NULL) AS avatar_url, u.chat_avatar_deco, CASE WHEN u.chat_banner_url LIKE 'preset:%' THEN u.chat_banner_url WHEN u.chat_banner_url IS NOT NULL THEN 'custom' ELSE NULL END AS chat_banner_url, u.chat_name_color, u.updated_at,
                  SUM(a.score * 20 + GREATEST(0, a.total - a.score) * 5)::int AS xp_att
             FROM quiz_attempts a
             JOIN users u ON u.id=a.user_id
            WHERE ${LB_ROLE_FILTER}
              AND UPPER(REGEXP_REPLACE(REPLACE(COALESCE(a.block,''), '_', ' '), '^BLOK\\s+', '', 'i')) = ANY($1::text[])
            GROUP BY u.id, u.name, u.username, u.role, u.badge_100k_at, u.badge_100k_visible, u.champion_blocks, u.avatar_url, u.chat_avatar_deco, u.chat_banner_url, u.chat_name_color, u.updated_at
            HAVING SUM(a.total) > 0`,
          [aliases]
        ).catch(() => ({ rows: [] }))
      ]);

      const byUser = new Map();
      const ensureUser = r => {
        if (!byUser.has(r.id)) byUser.set(r.id, { id: r.id, name: r.name, username: r.username, xp100k: is100kBadgeVisible(r), championBlocks: cleanChampionBlocks(r.champion_blocks), avatarUrl: userAvatarUrl(r), avatarDeco: userDecoUrl(r), bannerUrl: userBannerUrl(r), nameColor: userNameColor(r), ev: 0, qs: 0, att: 0 });
        return byUser.get(r.id);
      };
      for (const r of evRes.rows) ensureUser(r).ev = Number(r.xp_block) || 0;
      for (const r of attRes.rows) ensureUser(r).att = Number(r.xp_att) || 0;
      for (const r of qsRes.rows) {
        if (!r.qstats) continue;
        let parsed;
        try { parsed = JSON.parse(r.qstats); } catch { continue; }
        if (!parsed || typeof parsed !== 'object') continue;
        let sum = 0;
        for (const [qid, st] of Object.entries(parsed)) {
          if (!st || typeof st !== 'object') continue;
          const b = String(st.bank || '').trim().toLowerCase();
          const ql = String(qid || '').trim().toLowerCase();
          const match = (b && bankIds.has(b)) || exactRefSet.has(ql) || regexes.some(rx => rx.test(ql));
          if (!match) continue;
          const cor = Math.max(0, Number(st.correct) || 0);
          const wrg = Math.max(0, Number(st.wrong) || 0);
          sum += cor * 20 + wrg * 5;
        }
        if (sum > 0) ensureUser(r).qs = sum;
      }

      const rankings = [...byUser.values()]
        .map(x => ({ id: x.id, name: x.name, username: x.username, xp100k: Boolean(x.xp100k), championBlocks: x.championBlocks || [], avatarUrl: x.avatarUrl, avatarDeco: x.avatarDeco, bannerUrl: x.bannerUrl, nameColor: x.nameColor, xpBlock: Math.max(x.ev, x.qs, x.att) }))
        .filter(x => x.xpBlock > 0)
        .sort((a, b) => (b.xpBlock - a.xpBlock) || a.name.localeCompare(b.name, 'id'))
        .slice(0, 20)
        .map((row, i) => ({ rank: i + 1, ...row }));

      return json(res, 200, { block: blockParam, me: u.id, rankings });
    }
    const num = `CASE WHEN x.state->'gaster_v11_xp'->>'value' ~ '^[0-9]+(\\.[0-9]+)?$' THEN ROUND((x.state->'gaster_v11_xp'->>'value')::numeric) ELSE 0 END`;
    const weekly = `COALESCE(w.xp,0)`;
    const allTime = `GREATEST(${num}, COALESCE(t.xp,0))`;
    const r = await db().query(
      `SELECT u.id, u.name, u.username, u.role, (u.avatar_url IS NOT NULL) AS avatar_url, u.chat_avatar_deco, CASE WHEN u.chat_banner_url LIKE 'preset:%' THEN u.chat_banner_url WHEN u.chat_banner_url IS NOT NULL THEN 'custom' ELSE NULL END AS chat_banner_url, u.chat_name_color, u.badge_100k_at, u.badge_100k_visible, u.champion_blocks, u.updated_at,
              (${weekly})::int AS xp_weekly,
              ${allTime}::int AS xp_all,
              ${WEEK}::text AS week
         FROM users u
         LEFT JOIN (
           SELECT e.user_id, SUM(e.amount) AS xp
             FROM xp_events e
            WHERE e.day >= ${WEEK}
              AND e.kind <> 'userbank'
              AND LOWER(e.ref) NOT LIKE 'duel-local:%'
              AND e.created_at > COALESCE(
                (SELECT b1.baseline_at FROM xp_baselines b1 WHERE b1.user_id=e.user_id),
                '-infinity'::timestamptz
              )
            GROUP BY e.user_id
         ) w ON w.user_id=u.id
         LEFT JOIN (
           SELECT user_id, SUM(amount) AS xp
             FROM xp_events
            WHERE kind <> 'userbank' AND LOWER(ref) NOT LIKE 'duel-local:%'
            GROUP BY user_id
         ) t ON t.user_id=u.id
         LEFT JOIN learning_states x ON x.user_id=u.id
         LEFT JOIN xp_baselines b ON b.user_id=u.id
         LEFT JOIN (
           SELECT b0.user_id, SUM(e.amount) AS xp
           FROM xp_baselines b0
           JOIN xp_events e
             ON e.user_id=b0.user_id AND e.created_at > b0.baseline_at
            WHERE e.kind <> 'userbank' AND LOWER(e.ref) NOT LIKE 'duel-local:%'
           GROUP BY b0.user_id
         ) n ON n.user_id=u.id
        WHERE ${LB_ROLE_FILTER}
        ORDER BY xp_weekly DESC, xp_all DESC, u.name ASC LIMIT 20`);
    const rAll = await db().query(
      `SELECT u.id, u.name, u.username, u.role, (u.avatar_url IS NOT NULL) AS avatar_url, u.chat_avatar_deco, CASE WHEN u.chat_banner_url LIKE 'preset:%' THEN u.chat_banner_url WHEN u.chat_banner_url IS NOT NULL THEN 'custom' ELSE NULL END AS chat_banner_url, u.chat_name_color, u.badge_100k_at, u.badge_100k_visible, u.champion_blocks, u.updated_at,
              (${weekly})::int AS xp_weekly,
              ${allTime}::int AS xp_all
         FROM users u
         LEFT JOIN (
           SELECT e.user_id, SUM(e.amount) AS xp
             FROM xp_events e
            WHERE e.day >= ${WEEK}
              AND e.kind <> 'userbank'
              AND LOWER(e.ref) NOT LIKE 'duel-local:%'
              AND e.created_at > COALESCE(
                (SELECT b1.baseline_at FROM xp_baselines b1 WHERE b1.user_id=e.user_id),
                '-infinity'::timestamptz
              )
            GROUP BY e.user_id
         ) w ON w.user_id=u.id
         LEFT JOIN (
           SELECT user_id, SUM(amount) AS xp
             FROM xp_events
            WHERE kind <> 'userbank' AND LOWER(ref) NOT LIKE 'duel-local:%'
            GROUP BY user_id
         ) t ON t.user_id=u.id
         LEFT JOIN learning_states x ON x.user_id=u.id
         LEFT JOIN xp_baselines b ON b.user_id=u.id
         LEFT JOIN (
           SELECT b0.user_id, SUM(e.amount) AS xp
           FROM xp_baselines b0
           JOIN xp_events e
             ON e.user_id=b0.user_id AND e.created_at > b0.baseline_at
            WHERE e.kind <> 'userbank' AND LOWER(e.ref) NOT LIKE 'duel-local:%'
           GROUP BY b0.user_id
         ) n ON n.user_id=u.id
        WHERE ${LB_ROLE_FILTER}
        ORDER BY xp_all DESC, xp_weekly DESC, u.name ASC LIMIT 20`);
    const meRow = r.rows.findIndex(x => x.id === u.id);
    let myRank = meRow >= 0 ? meRow + 1 : null, mine = meRow >= 0 ? r.rows[meRow] : null;
    const meIncluded = u.role === 'student' || u.role === 'helper' || (u.role === 'admin' && Boolean(u.show_in_leaderboard));
    if (!mine && meIncluded) {
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
           WHERE ${LB_ROLE_FILTER_U2}
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
    const rowBadgeVisible = row => is100kBadgeVisible({
      role: row.role,
      badge_100k_at: row.badge_100k_at || (row.xp_all >= XP_100K_THRESHOLD ? true : null),
      badge_100k_visible: row.badge_100k_visible
    });
    return json(res, 200, {
      week: r.rows[0]?.week || '', me: u.id, myRank,
      myWeekly: mine ? mine.xp_weekly : 0,
      rankings: r.rows.map((row, i) => ({
        rank: i + 1, id: row.id, name: row.name, username: row.username, avatarUrl: userAvatarUrl(row), avatarDeco: userDecoUrl(row), bannerUrl: userBannerUrl(row), nameColor: userNameColor(row),
        xp100k: rowBadgeVisible(row),
        championBlocks: cleanChampionBlocks(row.champion_blocks),
        xpWeekly: row.xp_weekly, xpAllTime: row.xp_all
      })),
      rankingsAllTime: rAll.rows.map((row, i) => ({
        rank: i + 1, id: row.id, name: row.name, username: row.username, avatarUrl: userAvatarUrl(row), avatarDeco: userDecoUrl(row), bannerUrl: userBannerUrl(row), nameColor: userNameColor(row),
        xp100k: rowBadgeVisible(row),
        championBlocks: cleanChampionBlocks(row.champion_blocks),
        xpWeekly: row.xp_weekly, xpAllTime: row.xp_all
      }))
    });
  }
  return { xp, leaderboard, award };
}
