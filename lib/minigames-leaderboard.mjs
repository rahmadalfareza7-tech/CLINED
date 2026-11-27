import { userAvatarUrl, userBannerUrl, userNameColor, userDecoUrl } from './http.mjs';
import { ensure100kBadgeColumn, is100kBadgeVisible, XP_100K_THRESHOLD } from './xp-milestone.mjs';
import { cleanChampionBlocks } from './champion-tags.mjs';
import { summarizeIgdProgress, summarizeRujukLangkaProgress } from './minigames-summary.mjs';

export { summarizeIgdProgress, summarizeRujukLangkaProgress };

let tablesReady = null;
export async function ensureMiniGamesTables(q) {
  if (!q) return;
  if (!tablesReady) {
    tablesReady = (async () => {
      await q.query(`CREATE TABLE IF NOT EXISTS igd_scores (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        total_best INTEGER NOT NULL DEFAULT 0,
        best_night_score INTEGER NOT NULL DEFAULT 0,
        nights_done INTEGER NOT NULL DEFAULT 0,
        solved_cases INTEGER NOT NULL DEFAULT 0,
        runs_played INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
      await q.query(`CREATE INDEX IF NOT EXISTS idx_igd_scores_rank
        ON igd_scores (total_best DESC, solved_cases DESC, nights_done DESC, updated_at ASC)`);
      await q.query(`CREATE TABLE IF NOT EXISTS rujuk_langka_scores (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        best_score INTEGER NOT NULL DEFAULT 0,
        total_score INTEGER NOT NULL DEFAULT 0,
        rounds_done INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
      await q.query(`CREATE INDEX IF NOT EXISTS idx_rujuk_langka_scores_rank
        ON rujuk_langka_scores (best_score DESC, total_score DESC, rounds_done DESC, updated_at ASC)`);
    })().catch(err => {
      tablesReady = null;
      throw err;
    });
  }
  return tablesReady;
}

export async function upsertIgdFromState(q, userId, rawValue) {
  if (!q || !userId) return null;
  const s = summarizeIgdProgress(rawValue);
  if (!s || (s.totalBest <= 0 && s.solvedCases <= 0 && s.runsPlayed <= 0)) return null;
  await ensureMiniGamesTables(q);
  const r = await q.query(
    `INSERT INTO igd_scores (user_id, total_best, best_night_score, nights_done, solved_cases, runs_played, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, now())
     ON CONFLICT (user_id) DO UPDATE SET
       total_best = GREATEST(igd_scores.total_best, EXCLUDED.total_best),
       best_night_score = GREATEST(igd_scores.best_night_score, EXCLUDED.best_night_score),
       nights_done = GREATEST(igd_scores.nights_done, EXCLUDED.nights_done),
       solved_cases = GREATEST(igd_scores.solved_cases, EXCLUDED.solved_cases),
       runs_played = GREATEST(igd_scores.runs_played, EXCLUDED.runs_played),
       updated_at = now()
     RETURNING total_best, best_night_score, nights_done, solved_cases, runs_played`,
    [userId, s.totalBest, s.bestNightScore, s.nightsDone, s.solvedCases, s.runsPlayed]
  );
  return r.rows[0] || null;
}

export async function upsertRujukLangkaFromState(q, userId, rawValue) {
  if (!q || !userId) return null;
  const s = summarizeRujukLangkaProgress(rawValue);
  if (!s || (s.bestScore <= 0 && s.totalScore <= 0 && s.roundsDone <= 0)) return null;
  await ensureMiniGamesTables(q);
  const r = await q.query(
    `INSERT INTO rujuk_langka_scores (user_id, best_score, total_score, rounds_done, updated_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (user_id) DO UPDATE SET
       best_score = GREATEST(rujuk_langka_scores.best_score, EXCLUDED.best_score),
       total_score = GREATEST(rujuk_langka_scores.total_score, EXCLUDED.total_score),
       rounds_done = GREATEST(rujuk_langka_scores.rounds_done, EXCLUDED.rounds_done),
       updated_at = now()
     RETURNING best_score, total_score, rounds_done`,
    [userId, s.bestScore, s.totalScore, s.roundsDone]
  );
  return r.rows[0] || null;
}

export function createMiniGamesLeaderboard({ getPool, json, fail, body, origin, limit }) {
  const db = () => getPool();
  const LB_ROLE_FILTER = `(u.role IN ('student','helper') OR (u.role IN ('admin','developer') AND COALESCE(u.show_in_leaderboard, false)=true))`;

  function buildUserMeta(row) {
    const xpAll = Number(row.xp_all) || 0;
    return {
      id: row.id,
      name: row.name,
      username: row.username,
      avatarUrl: userAvatarUrl(row),
      avatarDeco: userDecoUrl(row),
      bannerUrl: userBannerUrl(row),
      nameColor: userNameColor(row),
      xp100k: is100kBadgeVisible({
        role: row.role,
        badge_100k_at: row.badge_100k_at || (xpAll >= XP_100K_THRESHOLD ? true : null),
        badge_100k_visible: row.badge_100k_visible
      }),
      championBlocks: cleanChampionBlocks(row.champion_blocks)
    };
  }

  async function queryIgdLeaderboard(u) {
    await ensureMiniGamesTables(db());
    await ensure100kBadgeColumn(db());
    const xpNum = `CASE WHEN x.state->'gaster_v11_xp'->>'value' ~ '^[0-9]+(\\.[0-9]+)?$' THEN ROUND((x.state->'gaster_v11_xp'->>'value')::numeric) ELSE 0 END`;

    const r = await db().query(
      `SELECT u.id, u.name, u.username, u.role, u.badge_100k_at, u.badge_100k_visible, u.champion_blocks,
              (u.avatar_url IS NOT NULL) AS avatar_url, u.chat_avatar_deco,
              CASE WHEN u.chat_banner_url LIKE 'preset:%' THEN u.chat_banner_url
                   WHEN u.chat_banner_url IS NOT NULL THEN 'custom' ELSE NULL END AS chat_banner_url,
              u.chat_name_color, u.updated_at, u.show_in_leaderboard,
              ${xpNum}::int AS xp_all,
              s.total_best AS raw_total_best, s.best_night_score AS raw_best_night,
              s.nights_done AS raw_nights_done, s.solved_cases AS raw_solved_cases, s.runs_played AS raw_runs,
              CASE WHEN COALESCE((x.state->'clined_igd_v2'->>'deleted')::boolean, false) = false THEN x.state->'clined_igd_v2'->>'value' ELSE NULL END AS st_val,
              e.value AS ent_val
         FROM users u
         LEFT JOIN igd_scores s ON s.user_id = u.id
         LEFT JOIN learning_states x ON x.user_id = u.id
         LEFT JOIN learning_state_entries e ON e.user_id = u.id AND e.key = 'clined_igd_v2' AND COALESCE(e.deleted, false) = false
        WHERE (${LB_ROLE_FILTER} OR u.id = $1)
          AND (s.user_id IS NOT NULL OR x.state ? 'clined_igd_v2' OR e.value IS NOT NULL)`,
      [u.id]
    );

    const uidStr = String(u.id);
    const isAdminLike = u.role === 'admin' || u.role === 'developer';
    const meIncluded = u.role === 'student' || u.role === 'helper' || (isAdminLike && Boolean(u.show_in_leaderboard));
    const hiddenByAdminToggle = Boolean(isAdminLike && !u.show_in_leaderboard);

    const visibleRows = [];
    let myBest = 0;

    for (const row of r.rows) {
      const fromSt = summarizeIgdProgress(row.st_val);
      const fromEnt = summarizeIgdProgress(row.ent_val);
      const rawTotal = Number(row.raw_total_best) || 0;
      const totalBest = Math.max(rawTotal, fromSt?.totalBest || 0, fromEnt?.totalBest || 0);
      const bestNightScore = Math.max(Number(row.raw_best_night) || 0, fromSt?.bestNightScore || 0, fromEnt?.bestNightScore || 0);
      const nightsDone = Math.max(Number(row.raw_nights_done) || 0, fromSt?.nightsDone || 0, fromEnt?.nightsDone || 0);
      const solvedCases = Math.max(Number(row.raw_solved_cases) || 0, fromSt?.solvedCases || 0, fromEnt?.solvedCases || 0);
      const runsPlayed = Math.max(Number(row.raw_runs) || 0, fromSt?.runsPlayed || 0, fromEnt?.runsPlayed || 0);

      if (totalBest <= 0) continue;
      if (totalBest > rawTotal) {
        upsertIgdFromState(db(), row.id, { totalBest, bestNightScore, nightsDone, solvedCases, runsPlayed }).catch(() => {});
      }
      if (String(row.id) === uidStr) myBest = totalBest;

      const rowAdmin = row.role === 'admin' || row.role === 'developer';
      const rowVisible = row.role === 'student' || row.role === 'helper' || (rowAdmin && Boolean(row.show_in_leaderboard));
      if (!rowVisible) continue;

      visibleRows.push({
        ...buildUserMeta(row),
        totalBest,
        bestScore: totalBest,
        bestNightScore,
        nightsDone,
        solvedCases,
        runsPlayed
      });
    }

    visibleRows.sort((a, b) =>
      (b.totalBest - a.totalBest) ||
      (b.solvedCases - a.solvedCases) ||
      (b.nightsDone - a.nightsDone) ||
      (b.bestNightScore - a.bestNightScore) ||
      a.name.localeCompare(b.name, 'id')
    );

    const fullIdx = visibleRows.findIndex(x => String(x.id) === uidStr);
    const rankings = visibleRows.slice(0, 50).map((row, i) => ({ rank: i + 1, ...row }));
    const myRank = meIncluded && fullIdx >= 0 ? fullIdx + 1 : null;

    return { ok: true, game: 'igd', me: u.id, myRank, myBest, showInLeaderboard: meIncluded, hiddenByAdminToggle, rankings };
  }

  async function queryRujukLeaderboard(u) {
    await ensureMiniGamesTables(db());
    await ensure100kBadgeColumn(db());
    const xpNum = `CASE WHEN x.state->'gaster_v11_xp'->>'value' ~ '^[0-9]+(\\.[0-9]+)?$' THEN ROUND((x.state->'gaster_v11_xp'->>'value')::numeric) ELSE 0 END`;

    const r = await db().query(
      `SELECT u.id, u.name, u.username, u.role, u.badge_100k_at, u.badge_100k_visible, u.champion_blocks,
              (u.avatar_url IS NOT NULL) AS avatar_url, u.chat_avatar_deco,
              CASE WHEN u.chat_banner_url LIKE 'preset:%' THEN u.chat_banner_url
                   WHEN u.chat_banner_url IS NOT NULL THEN 'custom' ELSE NULL END AS chat_banner_url,
              u.chat_name_color, u.updated_at, u.show_in_leaderboard,
              ${xpNum}::int AS xp_all,
              s.best_score AS raw_best_score, s.total_score AS raw_total_score, s.rounds_done AS raw_rounds_done,
              CASE WHEN COALESCE((x.state->'clined_rujuk_langka_v1'->>'deleted')::boolean, false) = false THEN x.state->'clined_rujuk_langka_v1'->>'value' ELSE NULL END AS st_val,
              e.value AS ent_val
         FROM users u
         LEFT JOIN rujuk_langka_scores s ON s.user_id = u.id
         LEFT JOIN learning_states x ON x.user_id = u.id
         LEFT JOIN learning_state_entries e ON e.user_id = u.id AND e.key = 'clined_rujuk_langka_v1' AND COALESCE(e.deleted, false) = false
        WHERE (${LB_ROLE_FILTER} OR u.id = $1)
          AND (s.user_id IS NOT NULL OR x.state ? 'clined_rujuk_langka_v1' OR e.value IS NOT NULL)`,
      [u.id]
    );

    const uidStr = String(u.id);
    const isAdminLike = u.role === 'admin' || u.role === 'developer';
    const meIncluded = u.role === 'student' || u.role === 'helper' || (isAdminLike && Boolean(u.show_in_leaderboard));
    const hiddenByAdminToggle = Boolean(isAdminLike && !u.show_in_leaderboard);

    const visibleRows = [];
    let myBest = 0;

    for (const row of r.rows) {
      const fromSt = summarizeRujukLangkaProgress(row.st_val);
      const fromEnt = summarizeRujukLangkaProgress(row.ent_val);
      const rawBest = Number(row.raw_best_score) || 0;
      const bestScore = Math.max(rawBest, fromSt?.bestScore || 0, fromEnt?.bestScore || 0);
      const totalScore = Math.max(Number(row.raw_total_score) || 0, fromSt?.totalScore || 0, fromEnt?.totalScore || 0, bestScore);
      const roundsDone = Math.max(Number(row.raw_rounds_done) || 0, fromSt?.roundsDone || 0, fromEnt?.roundsDone || 0);

      if (bestScore <= 0) continue;
      if (bestScore > rawBest || totalScore > (Number(row.raw_total_score) || 0)) {
        upsertRujukLangkaFromState(db(), row.id, { bestScore, totalScore, roundsDone }).catch(() => {});
      }
      if (String(row.id) === uidStr) myBest = bestScore;

      const rowAdmin = row.role === 'admin' || row.role === 'developer';
      const rowVisible = row.role === 'student' || row.role === 'helper' || (rowAdmin && Boolean(row.show_in_leaderboard));
      if (!rowVisible) continue;

      visibleRows.push({
        ...buildUserMeta(row),
        bestScore,
        totalScore,
        roundsDone
      });
    }

    visibleRows.sort((a, b) =>
      (b.bestScore - a.bestScore) ||
      (b.totalScore - a.totalScore) ||
      (b.roundsDone - a.roundsDone) ||
      a.name.localeCompare(b.name, 'id')
    );

    const fullIdx = visibleRows.findIndex(x => String(x.id) === uidStr);
    const rankings = visibleRows.slice(0, 50).map((row, i) => ({ rank: i + 1, ...row }));
    const myRank = meIncluded && fullIdx >= 0 ? fullIdx + 1 : null;

    return { ok: true, game: 'rujuk_langka', me: u.id, myRank, myBest, showInLeaderboard: meIncluded, hiddenByAdminToggle, rankings };
  }

  async function igdLeaderboard(req, res, u) {
    if (!u) return fail(res, 401, 'Silakan masuk terlebih dahulu.');
    if (req.method !== 'GET') return fail(res, 405, 'Method tidak diizinkan.');
    return json(res, 200, await queryIgdLeaderboard(u));
  }

  async function submitIgdScore(req, res, u) {
    if (!u) return fail(res, 401, 'Silakan masuk terlebih dahulu.');
    if (req.method !== 'POST') return fail(res, 405, 'Method tidak diizinkan.');
    origin(req);
    if (!limit(req, res, 60)) return;
    const input = await body(req, 64_000);
    const summary = summarizeIgdProgress(input);
    if (!summary) return fail(res, 400, 'Data skor Meja Jaga IGD tidak valid.');
    await upsertIgdFromState(db(), u.id, summary);
    const lb = await queryIgdLeaderboard(u);
    return json(res, 200, { ...lb, stats: summary });
  }

  async function rujukLeaderboard(req, res, u) {
    if (!u) return fail(res, 401, 'Silakan masuk terlebih dahulu.');
    if (req.method !== 'GET') return fail(res, 405, 'Method tidak diizinkan.');
    return json(res, 200, await queryRujukLeaderboard(u));
  }

  async function submitRujukScore(req, res, u) {
    if (!u) return fail(res, 401, 'Silakan masuk terlebih dahulu.');
    if (req.method !== 'POST') return fail(res, 405, 'Method tidak diizinkan.');
    origin(req);
    if (!limit(req, res, 60)) return;
    const input = await body(req, 128_000);
    const summary = summarizeRujukLangkaProgress(input);
    if (!summary) return fail(res, 400, 'Data skor Rujuk Langka tidak valid.');
    await upsertRujukLangkaFromState(db(), u.id, summary);
    const lb = await queryRujukLeaderboard(u);
    return json(res, 200, { ...lb, stats: summary });
  }

  return { igdLeaderboard, submitIgdScore, rujukLeaderboard, submitRujukScore };
}
