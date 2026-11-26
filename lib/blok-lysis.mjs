import { userAvatarUrl, userBannerUrl, userNameColor, userDecoUrl } from './http.mjs';
import { push } from './stream.mjs';
import { ensure100kBadgeColumn, is100kBadgeVisible, XP_100K_THRESHOLD } from './xp-milestone.mjs';
import { cleanChampionBlocks } from './champion-tags.mjs';
import {
  mergeJsonKey,
  sanitizeBlokLysisStats,
  BLOK_LYSIS_MAX_SCORE as MAX_SCORE,
  BLOK_LYSIS_MAX_LINES as MAX_LINES,
  BLOK_LYSIS_MAX_GAMES as MAX_GAMES,
  BLOK_LYSIS_MAX_COMBO as MAX_COMBO
} from './sync-merge.mjs';

export { sanitizeBlokLysisStats };

let tableReady = null;
export async function ensureBlokLysisTable(q) {
  if (!tableReady) {
    tableReady = (async () => {
      await q.query(`CREATE TABLE IF NOT EXISTS blok_lysis_scores (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        best_score INTEGER NOT NULL DEFAULT 0,
        best_combo INTEGER NOT NULL DEFAULT 0,
        total_lines INTEGER NOT NULL DEFAULT 0,
        games_played INTEGER NOT NULL DEFAULT 0,
        last_score INTEGER,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
      await q.query(`CREATE INDEX IF NOT EXISTS idx_blok_lysis_scores_rank
        ON blok_lysis_scores (best_score DESC, best_combo DESC, updated_at ASC)`);
    })().catch(err => {
      tableReady = null;
      throw err;
    });
  }
  return tableReady;
}

export async function upsertBlokLysisFromState(q, userId, rawValue) {
  if (!q || !userId) return null;
  const stats = sanitizeBlokLysisStats(rawValue);
  if (!stats) return null;
  if (stats.best <= 0 && stats.games <= 0 && stats.lines <= 0 && stats.bestCombo <= 0) return null;
  await ensureBlokLysisTable(q);
  const r = await q.query(
    `INSERT INTO blok_lysis_scores (user_id, best_score, best_combo, total_lines, games_played, last_score, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, now())
     ON CONFLICT (user_id) DO UPDATE SET
       best_score = GREATEST(blok_lysis_scores.best_score, EXCLUDED.best_score),
       best_combo = GREATEST(blok_lysis_scores.best_combo, EXCLUDED.best_combo),
       total_lines = GREATEST(blok_lysis_scores.total_lines, EXCLUDED.total_lines),
       games_played = GREATEST(blok_lysis_scores.games_played, EXCLUDED.games_played),
       last_score = COALESCE(EXCLUDED.last_score, blok_lysis_scores.last_score),
       updated_at = now()
     RETURNING best_score, best_combo, total_lines, games_played, last_score`,
    [userId, stats.best, stats.bestCombo, stats.lines, stats.games, stats.last]
  );
  return r.rows[0] || null;
}

export async function getAuthoritativeBlokLysisRow(q, userId) {
  if (!q || !userId) return null;
  try {
    await ensureBlokLysisTable(q);
    const r = await q.query(
      `SELECT best_score, best_combo, total_lines, games_played, last_score
         FROM blok_lysis_scores WHERE user_id = $1`,
      [userId]
    );
    return r.rows[0] || null;
  } catch {
    return null;
  }
}

export function createBlokLysis({ getPool, json, fail, body, origin, limit }) {
  const db = () => getPool();

  async function queryLeaderboard(u) {
    await ensureBlokLysisTable(db());
    await ensure100kBadgeColumn(db());
    const LB_ROLE_FILTER = `(u.role IN ('student','helper') OR (u.role='admin' AND COALESCE(u.show_in_leaderboard, false)=true))`;
    const stateBestExpr = `CASE WHEN (x.state->'clined_blok_lysis_v1'->>'value') IS NOT NULL
      AND (x.state->'clined_blok_lysis_v1'->>'value') LIKE '{%'
      AND ((x.state->'clined_blok_lysis_v1'->>'value')::jsonb->>'best') ~ '^[0-9]+$'
      THEN LEAST(${MAX_SCORE}, ((x.state->'clined_blok_lysis_v1'->>'value')::jsonb->>'best')::int)
      ELSE 0 END`;
    const stateComboExpr = `CASE WHEN (x.state->'clined_blok_lysis_v1'->>'value') IS NOT NULL
      AND (x.state->'clined_blok_lysis_v1'->>'value') LIKE '{%'
      AND ((x.state->'clined_blok_lysis_v1'->>'value')::jsonb->>'bestCombo') ~ '^[0-9]+$'
      THEN LEAST(${MAX_COMBO}, ((x.state->'clined_blok_lysis_v1'->>'value')::jsonb->>'bestCombo')::int)
      ELSE 0 END`;
    const stateLinesExpr = `CASE WHEN (x.state->'clined_blok_lysis_v1'->>'value') IS NOT NULL
      AND (x.state->'clined_blok_lysis_v1'->>'value') LIKE '{%'
      AND ((x.state->'clined_blok_lysis_v1'->>'value')::jsonb->>'lines') ~ '^[0-9]+$'
      THEN LEAST(${MAX_LINES}, ((x.state->'clined_blok_lysis_v1'->>'value')::jsonb->>'lines')::int)
      ELSE 0 END`;
    const stateGamesExpr = `CASE WHEN (x.state->'clined_blok_lysis_v1'->>'value') IS NOT NULL
      AND (x.state->'clined_blok_lysis_v1'->>'value') LIKE '{%'
      AND ((x.state->'clined_blok_lysis_v1'->>'value')::jsonb->>'games') ~ '^[0-9]+$'
      THEN LEAST(${MAX_GAMES}, ((x.state->'clined_blok_lysis_v1'->>'value')::jsonb->>'games')::int)
      ELSE 0 END`;
    const xpNum = `CASE WHEN x.state->'gaster_v11_xp'->>'value' ~ '^[0-9]+(\\.[0-9]+)?$' THEN ROUND((x.state->'gaster_v11_xp'->>'value')::numeric) ELSE 0 END`;

    const r = await db().query(
      `WITH combined AS (
         SELECT u.id, u.name, u.username, u.role, u.badge_100k_at, u.badge_100k_visible, u.champion_blocks,
                (u.avatar_url IS NOT NULL) AS avatar_url, u.chat_avatar_deco,
                CASE WHEN u.chat_banner_url LIKE 'preset:%' THEN u.chat_banner_url
                     WHEN u.chat_banner_url IS NOT NULL THEN 'custom' ELSE NULL END AS chat_banner_url,
                u.chat_name_color, u.updated_at,
                GREATEST(COALESCE(bs.best_score, 0), ${stateBestExpr})::int AS best_score,
                GREATEST(COALESCE(bs.best_combo, 0), ${stateComboExpr})::int AS best_combo,
                GREATEST(COALESCE(bs.total_lines, 0), ${stateLinesExpr})::int AS total_lines,
                GREATEST(COALESCE(bs.games_played, 0), ${stateGamesExpr})::int AS games_played,
                ${xpNum}::int AS xp_all,
                COALESCE(bs.updated_at, x.updated_at, u.updated_at) AS score_at
           FROM users u
           LEFT JOIN blok_lysis_scores bs ON bs.user_id = u.id
           LEFT JOIN learning_states x ON x.user_id = u.id
          WHERE ${LB_ROLE_FILTER}
       )
       SELECT *
         FROM combined
        WHERE best_score > 0
        ORDER BY best_score DESC, best_combo DESC, total_lines DESC, score_at ASC, name ASC
        LIMIT 50`
    );

    const rowBadgeVisible = row => is100kBadgeVisible({
      role: row.role,
      badge_100k_at: row.badge_100k_at || (row.xp_all >= XP_100K_THRESHOLD ? true : null),
      badge_100k_visible: row.badge_100k_visible
    });

    const rankings = r.rows.map((row, i) => ({
      rank: i + 1,
      id: row.id,
      name: row.name,
      username: row.username,
      avatarUrl: userAvatarUrl(row),
      avatarDeco: userDecoUrl(row),
      bannerUrl: userBannerUrl(row),
      nameColor: userNameColor(row),
      xp100k: rowBadgeVisible(row),
      championBlocks: cleanChampionBlocks(row.champion_blocks),
      bestScore: Number(row.best_score) || 0,
      bestCombo: Number(row.best_combo) || 0,
      totalLines: Number(row.total_lines) || 0,
      gamesPlayed: Number(row.games_played) || 0
    }));

    const meIdx = rankings.findIndex(x => x.id === u.id);
    let myRank = meIdx >= 0 ? meIdx + 1 : null;
    let myBest = meIdx >= 0 ? rankings[meIdx].bestScore : 0;
    const meIncluded = u.role === 'student' || u.role === 'helper' || (u.role === 'admin' && Boolean(u.show_in_leaderboard));

    if (meIdx < 0) {
      const own = await getAuthoritativeBlokLysisRow(db(), u.id);
      myBest = Number(own?.best_score) || 0;
      if (myBest > 0 && meIncluded) {
        const aheadRes = await db().query(
          `SELECT COUNT(*)::int AS ahead
             FROM blok_lysis_scores bs
             JOIN users u ON u.id = bs.user_id
            WHERE ${LB_ROLE_FILTER}
              AND (bs.best_score > $1 OR (bs.best_score = $1 AND bs.best_combo > $2))`,
          [myBest, Number(own?.best_combo) || 0]
        ).catch(() => ({ rows: [{ ahead: 0 }] }));
        myRank = (Number(aheadRes.rows[0]?.ahead) || 0) + 1;
      }
    }

    return { ok: true, game: 'blok_lysis', me: u.id, myRank, myBest, rankings };
  }

  async function leaderboard(req, res, u) {
    if (!u) return fail(res, 401, 'Silakan masuk terlebih dahulu.');
    if (req.method !== 'GET') return fail(res, 405, 'Method tidak diizinkan.');
    const data = await queryLeaderboard(u);
    return json(res, 200, data);
  }

  async function submitScore(req, res, u) {
    if (!u) return fail(res, 401, 'Silakan masuk terlebih dahulu.');
    if (req.method !== 'POST') return fail(res, 405, 'Method tidak diizinkan.');
    origin(req);
    if (!limit(req, res, 60)) return;
    const input = await body(req, 32_000);
    const stats = sanitizeBlokLysisStats(input);
    if (!stats) return fail(res, 400, 'Data skor Blok Lysis tidak valid.');

    const clientId = String(input.clientId || '').slice(0, 64);
    const client = await db().connect();
    let finalStats = stats;
    let stateUpdated = false;
    try {
      await client.query('BEGIN');
      await ensureBlokLysisTable(client);
      const saved = await client.query('SELECT state FROM learning_states WHERE user_id=$1 FOR UPDATE', [u.id]);
      const state = (saved.rows[0]?.state && typeof saved.rows[0].state === 'object') ? { ...saved.rows[0].state } : {};
      const existingStr = (state['clined_blok_lysis_v1'] && !state['clined_blok_lysis_v1'].deleted && typeof state['clined_blok_lysis_v1'].value === 'string')
        ? state['clined_blok_lysis_v1'].value
        : null;
      const incomingStr = JSON.stringify(stats);
      let mergedStr = incomingStr;
      if (existingStr) {
        const merged = mergeJsonKey('clined_blok_lysis_v1', incomingStr, existingStr);
        if (merged) {
          mergedStr = merged.value;
          stateUpdated = merged.dirty;
        }
      } else {
        stateUpdated = true;
      }
      finalStats = sanitizeBlokLysisStats(mergedStr) || stats;

      const row = await upsertBlokLysisFromState(client, u.id, finalStats);
      if (row) {
        const authoritativeBest = Math.max(finalStats.best, Number(row.best_score) || 0);
        const authoritativeCombo = Math.max(finalStats.bestCombo, Number(row.best_combo) || 0);
        const authoritativeLines = Math.max(finalStats.lines, Number(row.total_lines) || 0);
        const authoritativeGames = Math.max(finalStats.games, Number(row.games_played) || 0);
        if (
          authoritativeBest !== finalStats.best ||
          authoritativeCombo !== finalStats.bestCombo ||
          authoritativeLines !== finalStats.lines ||
          authoritativeGames !== finalStats.games
        ) {
          finalStats = {
            ...finalStats,
            best: authoritativeBest,
            bestCombo: authoritativeCombo,
            lines: authoritativeLines,
            games: authoritativeGames,
            updatedAt: Math.max(finalStats.updatedAt, Date.now())
          };
          mergedStr = JSON.stringify(finalStats);
          stateUpdated = true;
        }
      }

      if (stateUpdated) {
        const nowIso = new Date().toISOString();
        state['clined_blok_lysis_v1'] = { value: mergedStr, updatedAt: nowIso };
        await client.query(
          `INSERT INTO learning_state_entries(user_id,key,value,deleted,client_updated_at,updated_at)
           VALUES($1,'clined_blok_lysis_v1',$2,false,$3,clock_timestamp())
           ON CONFLICT(user_id,key) DO UPDATE
           SET value=EXCLUDED.value,deleted=false,client_updated_at=EXCLUDED.client_updated_at,updated_at=clock_timestamp()`,
          [u.id, mergedStr, nowIso]
        );
        await client.query(
          `INSERT INTO learning_states(user_id,state,updated_at) VALUES($1,$2::jsonb,clock_timestamp())
           ON CONFLICT(user_id) DO UPDATE SET state=EXCLUDED.state,updated_at=clock_timestamp()`,
          [u.id, JSON.stringify(state)]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch {}
      throw err;
    } finally {
      client.release();
    }

    if (stateUpdated) {
      try { push(u.id, 'sync_updated', { clientId, keys: ['clined_blok_lysis_v1'], at: Date.now() }); } catch {}
    }

    const lb = await queryLeaderboard(u);
    return json(res, 200, { ...lb, stats: finalStats });
  }

  return { leaderboard, submitScore, queryLeaderboard };
}
