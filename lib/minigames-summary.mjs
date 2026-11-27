// Pure zero-dependency score summarizers for Meja Jaga IGD & Rujuk Langka leaderboards.

const MAX_IGD_NIGHT = 250_000;
const MAX_IGD_TOTAL = 1_500_000;
const MAX_RL_ROUND = 20_000;
const MAX_RL_TOTAL = 20_000_000;

function parseObj(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch { return null; }
  }
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : null;
}

function clampInt(v, max) {
  const n = Math.floor(Number(v) || 0);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(max, n);
}

/** Summarize clined_igd_v2 progress into monotonic leaderboard metrics. */
export function summarizeIgdProgress(raw) {
  const obj = parseObj(raw);
  if (!obj) return null;
  let totalBest = 0;
  let bestNightScore = 0;
  if (obj.best && typeof obj.best === 'object' && !Array.isArray(obj.best)) {
    for (const [k, v] of Object.entries(obj.best)) {
      if (!/^[1-6]$/.test(String(k))) continue;
      const sc = clampInt(v, MAX_IGD_NIGHT);
      if (sc > 0) {
        totalBest += sc;
        if (sc > bestNightScore) bestNightScore = sc;
      }
    }
  }
  totalBest = Math.max(clampInt(totalBest, MAX_IGD_TOTAL), clampInt(obj.totalBest ?? obj.total_best, MAX_IGD_TOTAL));
  bestNightScore = Math.max(bestNightScore, clampInt(obj.bestNightScore ?? obj.best_night_score, MAX_IGD_NIGHT));
  if (totalBest < bestNightScore) totalBest = bestNightScore;

  const doneCount = (obj.done && typeof obj.done === 'object' && !Array.isArray(obj.done))
    ? Object.entries(obj.done).filter(([k, v]) => /^[1-6]$/.test(String(k)) && Boolean(v)).length
    : 0;
  const nightsDone = Math.max(doneCount, clampInt(obj.nightsDone ?? obj.nights_done, 6));

  const solvedCount = (obj.solved && typeof obj.solved === 'object' && !Array.isArray(obj.solved))
    ? Object.values(obj.solved).filter(Boolean).length
    : 0;
  const solvedCases = Math.max(solvedCount, clampInt(obj.solvedCases ?? obj.solved_cases, 10_000));
  const runsPlayed = clampInt(obj.runs ?? obj.runsPlayed ?? obj.runs_played, 100_000);

  return { totalBest, bestNightScore, nightsDone, solvedCases, runsPlayed };
}

/** Summarize clined_rujuk_langka_v1 progress into monotonic leaderboard metrics. */
export function summarizeRujukLangkaProgress(raw) {
  const obj = parseObj(raw);
  if (!obj) return null;
  let bestScore = clampInt(obj.bestScore ?? obj.best_score, MAX_RL_ROUND);
  let totalScore = clampInt(obj.totalScore ?? obj.total_score, MAX_RL_TOTAL);
  let roundsDone = clampInt(obj.roundsDone ?? obj.rounds_done, 100_000);

  let computedTotal = 0;
  let computedRounds = 0;
  for (const bucketKey of ['scored', 'archive']) {
    const bucket = obj[bucketKey];
    if (!bucket || typeof bucket !== 'object' || Array.isArray(bucket)) continue;
    for (const entry of Object.values(bucket)) {
      if (!entry || typeof entry !== 'object') continue;
      const sc = clampInt(entry.score ?? entry.total, MAX_RL_ROUND);
      if (sc > bestScore) bestScore = sc;
      if (entry.done || sc > 0) {
        computedTotal += sc;
        computedRounds++;
      }
    }
  }
  totalScore = Math.max(totalScore, clampInt(computedTotal, MAX_RL_TOTAL), bestScore);
  roundsDone = Math.max(roundsDone, computedRounds);

  return { bestScore, totalScore, roundsDone };
}
