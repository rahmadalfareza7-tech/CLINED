import { randomUUID } from 'node:crypto';
import { getPool, json, fail, limit, origin, body, required, maxPhotoBytes } from './http.mjs';
import { push } from './stream.mjs';
import { maybeUnlock100kBadge, XP_100K_THRESHOLD, parseXpValue } from './xp-milestone.mjs';
import {
  isValidSyncKey,
  mergeJsonKey,
  reconcileMateriResumeWithHistory,
  reconcileBankSessionsWithHistory,
  reconcileBookmarksWithMeta,
  reconcileBlokLysisWithStats,
} from './sync-merge.mjs';
import {
  upsertBlokLysisFromState,
  getAuthoritativeBlokLysisRow,
  sanitizeBlokLysisStats,
} from './blok-lysis.mjs';
import {
  upsertIgdFromState,
  upsertRujukLangkaFromState,
} from './minigames-leaderboard.mjs';

const validKey = isValidSyncKey;
const SYNC_MAX_KEYS = 200;
const SYNC_MAX_VALUE_BYTES = 500_000;
const isoOrNull = value => { const t = Date.parse(String(value || '')); return Number.isFinite(t) ? new Date(t).toISOString() : null; };
function syncEntry(key, row) { return row?.deleted ? { deleted: true, updatedAt: row.client_updated_at || row.updated_at } : { value: row?.value ?? '', updatedAt: row.client_updated_at || row.updated_at }; }

function filterValidState(rawState) {
  const out = {};
  let stripped = false;
  for (const [k, v] of Object.entries(rawState || {})) {
    if (validKey(k)) out[k] = v;
    else stripped = true;
  }
  return { state: out, stripped };
}

function reconcileStateEntriesInMemory(state, nowIso) {
  const healedKeys = [];
  const valOf = k => (state[k] && !state[k].deleted && typeof state[k].value === 'string') ? state[k].value : null;

  const matRes = reconcileMateriResumeWithHistory(
    valOf('clined_materi_resume_v2'),
    valOf('clined_materi_best_v1'),
    valOf('clined_materi_last_v1')
  );
  if (matRes.changed && typeof matRes.value === 'string' && Buffer.byteLength(matRes.value) <= SYNC_MAX_VALUE_BYTES) {
    state['clined_materi_resume_v2'] = { value: matRes.value, updatedAt: nowIso };
    healedKeys.push('clined_materi_resume_v2');
  }

  const bankRes = reconcileBankSessionsWithHistory(
    valOf('clined_bank_sessions_v1'),
    valOf('gaster_v8_quiz_session'),
    valOf('clined_bank_best_v1'),
    valOf('gaster_v8_history')
  );
  if (bankRes.bankSessionsChanged && typeof bankRes.bankSessionsValue === 'string' && Buffer.byteLength(bankRes.bankSessionsValue) <= SYNC_MAX_VALUE_BYTES) {
    state['clined_bank_sessions_v1'] = { value: bankRes.bankSessionsValue, updatedAt: nowIso };
    healedKeys.push('clined_bank_sessions_v1');
  }
  if (bankRes.quizSessionChanged && typeof bankRes.quizSessionValue === 'string' && Buffer.byteLength(bankRes.quizSessionValue) <= SYNC_MAX_VALUE_BYTES) {
    state['gaster_v8_quiz_session'] = { value: bankRes.quizSessionValue, updatedAt: nowIso };
    healedKeys.push('gaster_v8_quiz_session');
  }

  const bookRes = reconcileBookmarksWithMeta(
    valOf('gaster_v8_bookmarks'),
    valOf('clined_bookmarks_meta_v1')
  );
  if (bookRes.changed && typeof bookRes.value === 'string' && Buffer.byteLength(bookRes.value) <= SYNC_MAX_VALUE_BYTES) {
    state['gaster_v8_bookmarks'] = { value: bookRes.value, updatedAt: nowIso };
    healedKeys.push('gaster_v8_bookmarks');
  }

  const blRes = reconcileBlokLysisWithStats(
    valOf('clined_blok_lysis_v1'),
    valOf('clined_blok_lysis_session_v1')
  );
  if (blRes.changed && typeof blRes.value === 'string' && Buffer.byteLength(blRes.value) <= SYNC_MAX_VALUE_BYTES) {
    state['clined_blok_lysis_v1'] = { value: blRes.value, updatedAt: nowIso };
    healedKeys.push('clined_blok_lysis_v1');
  }

  return healedKeys;
}

async function getAuthoritativeServerXp(q, userId, stateXp = 0) {
  try {
    const r = await q.query(
      `SELECT
         COALESCE((
           SELECT SUM(e.amount)::bigint
             FROM xp_events e
            WHERE e.user_id = $1
              AND e.kind <> 'userbank'
              AND LOWER(e.ref) NOT LIKE 'duel-local:%'
         ), 0)::bigint AS total_ledger,
         COALESCE((
           SELECT b.base_xp::bigint + COALESCE((
             SELECT SUM(e2.amount)::bigint
               FROM xp_events e2
              WHERE e2.user_id = $1
                AND e2.created_at > b.baseline_at
                AND e2.kind <> 'userbank'
                AND LOWER(e2.ref) NOT LIKE 'duel-local:%'
           ), 0)::bigint
           FROM xp_baselines b
          WHERE b.user_id = $1
         ), 0)::bigint AS baseline_plus,
         COALESCE((
           SELECT MAX(s.xp_total)::bigint
             FROM xp_snapshots s
            WHERE s.user_id = $1
         ), 0)::bigint AS max_snapshot`,
      [userId]
    );
    const row = r.rows[0] || {};
    const totalLedger = Math.max(0, Math.round(Number(row.total_ledger) || 0));
    const baselinePlus = Math.max(0, Math.round(Number(row.baseline_plus) || 0));
    const maxSnapshot = Math.max(0, Math.round(Number(row.max_snapshot) || 0));
    const stXp = Math.max(0, Math.round(Number(stateXp) || 0));
    return Math.max(stXp, totalLedger, baselinePlus, maxSnapshot);
  } catch {
    return Math.max(0, Math.round(Number(stateXp) || 0));
  }
}

export async function bumpSyncedXp(pool, userId, minXp, { clientId = '' } = {}) {
  const targetXp = Math.max(0, Math.round(Number(minXp) || 0));
  if (!pool || !userId) return targetXp;
  const client = await pool.connect();
  let finalXp = targetXp;
  let changed = false;
  try {
    await client.query('BEGIN');
    const saved = await client.query('SELECT state FROM learning_states WHERE user_id=$1 FOR UPDATE', [userId]);
    const { state } = filterValidState(saved.rows[0]?.state || {});
    const curXp = state['gaster_v11_xp'] && !state['gaster_v11_xp'].deleted
      ? parseXpValue(state['gaster_v11_xp'].value)
      : 0;
    const authXp = await getAuthoritativeServerXp(client, userId, curXp);
    finalXp = Math.max(curXp, targetXp, authXp);
    if (finalXp > curXp) {
      const nowIso = new Date().toISOString();
      const valStr = String(finalXp);
      state['gaster_v11_xp'] = { value: valStr, updatedAt: nowIso };
      await client.query(
        `INSERT INTO learning_state_entries(user_id,key,value,deleted,client_updated_at,updated_at)
         VALUES($1,'gaster_v11_xp',$2,false,$3,clock_timestamp())
         ON CONFLICT(user_id,key) DO UPDATE
         SET value=EXCLUDED.value,deleted=false,client_updated_at=EXCLUDED.client_updated_at,updated_at=clock_timestamp()`,
        [userId, valStr, nowIso]
      );
      await client.query(
        `INSERT INTO learning_states(user_id,state,updated_at) VALUES($1,$2::jsonb,clock_timestamp())
         ON CONFLICT(user_id) DO UPDATE SET state=EXCLUDED.state,updated_at=clock_timestamp()`,
        [userId, JSON.stringify(state)]
      );
      changed = true;
    }
    await client.query('COMMIT');
  } catch {
    try { await client.query('ROLLBACK'); } catch {}
  } finally {
    client.release();
  }
  if (changed) {
    try { push(userId, 'sync_updated', { clientId: String(clientId || '').slice(0, 64), keys: ['gaster_v11_xp'], at: Date.now() }); } catch {}
  }
  return finalXp;
}

export async function sync(req, res) {
  const u = await required(req, res); if (!u) return;
  if (req.method === 'GET') {
    const sinceRaw = req.url?.includes('?') ? new URL(req.url, 'http://localhost').searchParams.get('since') : null;
    const since = sinceRaw && Number.isFinite(Date.parse(sinceRaw)) ? new Date(sinceRaw).toISOString() : null;
    if (!since) {
      const r = await getPool().query('SELECT state,updated_at FROM learning_states WHERE user_id=$1', [u.id]);
      const { state } = filterValidState(r.rows[0]?.state || {});
      const stateXp = state['gaster_v11_xp'] && !state['gaster_v11_xp'].deleted
        ? parseXpValue(state['gaster_v11_xp'].value)
        : 0;
      const authXp = await getAuthoritativeServerXp(getPool(), u.id, stateXp);
      if (authXp > stateXp) {
        const bumped = await bumpSyncedXp(getPool(), u.id, authXp).catch(() => authXp);
        state['gaster_v11_xp'] = { value: String(Math.max(authXp, bumped)), updatedAt: new Date().toISOString() };
      }
      reconcileStateEntriesInMemory(state, new Date().toISOString());
      const authBl = await getAuthoritativeBlokLysisRow(getPool(), u.id);
      if (authBl && (Number(authBl.best_score) > 0 || Number(authBl.games_played) > 0)) {
        const curBl = sanitizeBlokLysisStats(
          state['clined_blok_lysis_v1'] && !state['clined_blok_lysis_v1'].deleted ? state['clined_blok_lysis_v1'].value : null
        ) || { best: 0, games: 0, lines: 0, bestCombo: 0, last: null, lastAt: 0, updatedAt: 0 };
        const mergedBl = {
          best: Math.max(curBl.best, Number(authBl.best_score) || 0),
          games: Math.max(curBl.games, Number(authBl.games_played) || 0),
          lines: Math.max(curBl.lines, Number(authBl.total_lines) || 0),
          bestCombo: Math.max(curBl.bestCombo, Number(authBl.best_combo) || 0),
          last: curBl.last !== null ? curBl.last : (authBl.last_score !== null && authBl.last_score !== undefined ? Number(authBl.last_score) : null),
          lastAt: curBl.lastAt,
          updatedAt: Math.max(curBl.updatedAt, Date.now())
        };
        if (
          mergedBl.best > curBl.best ||
          mergedBl.games > curBl.games ||
          mergedBl.lines > curBl.lines ||
          mergedBl.bestCombo > curBl.bestCombo
        ) {
          state['clined_blok_lysis_v1'] = { value: JSON.stringify(mergedBl), updatedAt: new Date().toISOString() };
        }
      }
      const cursorRes = await getPool().query(
        'SELECT COALESCE(MAX(updated_at), clock_timestamp()) AS updated_at FROM learning_state_entries WHERE user_id=$1',
        [u.id]
      ).catch(() => ({ rows: [] }));
      const cursorIso = cursorRes.rows[0]?.updated_at
        ? new Date(cursorRes.rows[0].updated_at).toISOString()
        : (r.rows[0]?.updated_at ? new Date(r.rows[0].updated_at).toISOString() : new Date().toISOString());
      return json(res, 200, { mode: 'full', state, updatedAt: cursorIso });
    }
    const [r, xpRowRes, authXp, blRowRes, authBl] = await Promise.all([
      getPool().query(`SELECT key,value,deleted,client_updated_at,updated_at
        FROM learning_state_entries WHERE user_id=$1 AND updated_at>$2::timestamptz
        ORDER BY updated_at ASC LIMIT $3`, [u.id, since, SYNC_MAX_KEYS]),
      getPool().query(`SELECT value,deleted,client_updated_at,updated_at FROM learning_state_entries WHERE user_id=$1 AND key='gaster_v11_xp'`, [u.id]).catch(() => ({ rows: [] })),
      getAuthoritativeServerXp(getPool(), u.id, 0),
      getPool().query(`SELECT value,deleted,client_updated_at,updated_at FROM learning_state_entries WHERE user_id=$1 AND key='clined_blok_lysis_v1'`, [u.id]).catch(() => ({ rows: [] })),
      getAuthoritativeBlokLysisRow(getPool(), u.id).catch(() => null)
    ]);
    const changes = {};
    let cursorMs = Date.parse(since) || 0;
    let cursor = since;
    for (const row of r.rows) {
      const rowMs = row.updated_at ? new Date(row.updated_at).getTime() : 0;
      if (rowMs > cursorMs) {
        cursorMs = rowMs;
        cursor = new Date(rowMs).toISOString();
      }
      if (!validKey(row.key)) continue;
      changes[row.key] = syncEntry(row.key, row);
    }
    const curEntryXp = xpRowRes.rows[0] && !xpRowRes.rows[0].deleted ? parseXpValue(xpRowRes.rows[0].value) : 0;
    if (authXp > curEntryXp) {
      const bumped = await bumpSyncedXp(getPool(), u.id, authXp).catch(() => authXp);
      const nowIso = new Date().toISOString();
      changes['gaster_v11_xp'] = { value: String(Math.max(authXp, bumped)), updatedAt: nowIso };
    } else if (!changes['gaster_v11_xp'] && Math.max(curEntryXp, authXp) > 0) {
      changes['gaster_v11_xp'] = {
        value: String(Math.max(curEntryXp, authXp)),
        updatedAt: xpRowRes.rows[0]?.client_updated_at || xpRowRes.rows[0]?.updated_at || new Date().toISOString()
      };
    }
    if (authBl && (Number(authBl.best_score) > 0 || Number(authBl.games_played) > 0)) {
      const curBlRow = blRowRes.rows[0];
      const curBl = sanitizeBlokLysisStats(curBlRow && !curBlRow.deleted ? curBlRow.value : null)
        || { best: 0, games: 0, lines: 0, bestCombo: 0, last: null, lastAt: 0, updatedAt: 0 };
      const mergedBl = {
        best: Math.max(curBl.best, Number(authBl.best_score) || 0),
        games: Math.max(curBl.games, Number(authBl.games_played) || 0),
        lines: Math.max(curBl.lines, Number(authBl.total_lines) || 0),
        bestCombo: Math.max(curBl.bestCombo, Number(authBl.best_combo) || 0),
        last: curBl.last !== null ? curBl.last : (authBl.last_score !== null && authBl.last_score !== undefined ? Number(authBl.last_score) : null),
        lastAt: curBl.lastAt,
        updatedAt: Math.max(curBl.updatedAt, Date.now())
      };
      if (
        mergedBl.best > curBl.best ||
        mergedBl.games > curBl.games ||
        mergedBl.lines > curBl.lines ||
        mergedBl.bestCombo > curBl.bestCombo
      ) {
        changes['clined_blok_lysis_v1'] = { value: JSON.stringify(mergedBl), updatedAt: new Date().toISOString() };
      }
    }
    return json(res, 200, { mode: 'delta', changes, updatedAt: cursor, hasMore: r.rows.length === SYNC_MAX_KEYS });
  }
  if (req.method !== 'POST') return fail(res, 405, 'Method tidak diizinkan.');
  origin(req); if (!limit(req, res, 90)) return;
  const payload = await body(req, 1_200_000);
  const ops = payload.operations;
  const clientId = String(payload.clientId || '').slice(0, 64);
  if (!Array.isArray(ops)) return fail(res, 400, 'operations harus berupa array.');
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const saved = await client.query('SELECT state FROM learning_states WHERE user_id=$1 FOR UPDATE', [u.id]);
    const { state, stripped: strippedLegacy } = filterValidState(saved.rows[0]?.state || {});
    const accepted = {};
    const writtenKeys = [];
    let touchedBlokLysis = false;
    let touchedIgd = false;
    let touchedRujuk = false;
    const curStateXp = state['gaster_v11_xp'] && !state['gaster_v11_xp'].deleted ? parseXpValue(state['gaster_v11_xp'].value) : 0;
    let authXpCache = await getAuthoritativeServerXp(client, u.id, curStateXp);
    if (authXpCache > curStateXp) {
      const nowIso = new Date().toISOString();
      const valStr = String(authXpCache);
      state['gaster_v11_xp'] = { value: valStr, updatedAt: nowIso };
      await client.query(
        `INSERT INTO learning_state_entries(user_id,key,value,deleted,client_updated_at,updated_at) VALUES($1,'gaster_v11_xp',$2,false,$3,clock_timestamp())
         ON CONFLICT(user_id,key) DO UPDATE SET value=EXCLUDED.value,deleted=false,client_updated_at=EXCLUDED.client_updated_at,updated_at=clock_timestamp()`,
        [u.id, valStr, nowIso]
      );
      accepted['gaster_v11_xp'] = state['gaster_v11_xp'];
      writtenKeys.push('gaster_v11_xp');
    }

    for (const op of ops.slice(0, SYNC_MAX_KEYS)) {
      const key = String(op?.key || '');
      if (!op || !/^[0-9a-f-]{36}$/i.test(op.id || '') || !validKey(key) || !['set', 'delete'].includes(op.type)) continue;
      if (op.type === 'set' && (typeof op.value !== 'string' || Buffer.byteLength(op.value) > SYNC_MAX_VALUE_BYTES)) continue;
      if (key === 'clined_blok_lysis_v1' || key === 'clined_blok_lysis_session_v1') touchedBlokLysis = true;
      if (key === 'clined_igd_v2') touchedIgd = true;
      if (key === 'clined_rujuk_langka_v1') touchedRujuk = true;

      const inserted = await client.query(
        'INSERT INTO sync_operations (user_id,idempotency_key) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING idempotency_key',
        [u.id, op.id]
      );
      if (!inserted.rowCount) {
        if (state[key]) accepted[key] = state[key];
        continue;
      }

      const incoming = Date.parse(op.updatedAt) || Date.now();
      const previous = Date.parse(state[key]?.updatedAt) || 0;
      const clientUpdated = new Date(Math.max(incoming, previous, Date.now())).toISOString();

      // 1. XP hanya boleh naik & selalu diselaraskan dengan buku besar xp_events + xp_baselines
      if (key === 'gaster_v11_xp' && op.type === 'set') {
        const prevXp = state[key] && !state[key].deleted ? parseXpValue(state[key].value) : 0;
        const incXp = parseXpValue(op.value);
        const bestXp = Math.max(prevXp, incXp, authXpCache);
        authXpCache = bestXp;
        if (bestXp <= prevXp && state[key] && !state[key].deleted) {
          accepted[key] = state[key];
          continue;
        }
        const valStr = String(bestXp);
        state[key] = { value: valStr, updatedAt: clientUpdated };
        await client.query(
          `INSERT INTO learning_state_entries(user_id,key,value,deleted,client_updated_at,updated_at) VALUES($1,$2,$3,false,$4,clock_timestamp())
           ON CONFLICT(user_id,key) DO UPDATE SET value=EXCLUDED.value,deleted=false,client_updated_at=EXCLUDED.client_updated_at,updated_at=clock_timestamp()`,
          [u.id, key, valStr, clientUpdated]
        );
        accepted[key] = state[key];
        writtenKeys.push(key);
        continue;
      }

      // 2. Key progres JSON yang bisa digabung: SELALU merge dua arah (tidak pernah kalah oleh selisih jam perangkat!)
      if (op.type === 'set' && state[key] && !state[key].deleted && typeof state[key].value === 'string') {
        const merged = mergeJsonKey(key, op.value, state[key].value);
        if (merged) {
          if (!merged.dirty) {
            accepted[key] = state[key];
            continue;
          }
          if (Buffer.byteLength(merged.value) <= SYNC_MAX_VALUE_BYTES) {
            state[key] = { value: merged.value, updatedAt: clientUpdated };
            await client.query(
              `INSERT INTO learning_state_entries(user_id,key,value,deleted,client_updated_at,updated_at) VALUES($1,$2,$3,false,$4,clock_timestamp())
               ON CONFLICT(user_id,key) DO UPDATE SET value=EXCLUDED.value,deleted=false,client_updated_at=EXCLUDED.client_updated_at,updated_at=clock_timestamp()`,
              [u.id, key, merged.value, clientUpdated]
            );
            accepted[key] = state[key];
            writtenKeys.push(key);
            continue;
          }
        }
      }

      // 3. Key skalar / preferensi: LWW; bila lebih lama tetap kembalikan nilai server agar antrean klien tidak macet
      if (incoming < previous) {
        if (state[key]) accepted[key] = state[key];
        continue;
      }

      const rawClientUpdated = isoOrNull(op.updatedAt) || new Date().toISOString();
      if (op.type === 'delete') {
        state[key] = { deleted: true, updatedAt: rawClientUpdated };
        await client.query(`INSERT INTO learning_state_entries(user_id,key,value,deleted,client_updated_at,updated_at) VALUES($1,$2,NULL,true,$3,clock_timestamp())
          ON CONFLICT(user_id,key) DO UPDATE SET value=NULL,deleted=true,client_updated_at=EXCLUDED.client_updated_at,updated_at=clock_timestamp()`, [u.id, key, rawClientUpdated]);
      } else {
        state[key] = { value: op.value, updatedAt: rawClientUpdated };
        await client.query(`INSERT INTO learning_state_entries(user_id,key,value,deleted,client_updated_at,updated_at) VALUES($1,$2,$3,false,$4,clock_timestamp())
          ON CONFLICT(user_id,key) DO UPDATE SET value=EXCLUDED.value,deleted=false,client_updated_at=EXCLUDED.client_updated_at,updated_at=clock_timestamp()`, [u.id, key, op.value, rawClientUpdated]);
      }
      accepted[key] = state[key];
      writtenKeys.push(key);
    }

    // 4. Rekonsiliasi silang antar-key (Materi Resume vs Best/Last, Bank Sessions vs Best/History, Bookmarks vs Meta, Blok Lysis vs Session)
    const reconIso = new Date().toISOString();
    const healedKeys = reconcileStateEntriesInMemory(state, reconIso);
    for (const hk of healedKeys) {
      const entry = state[hk];
      if (!entry || entry.deleted || typeof entry.value !== 'string') continue;
      await client.query(
        `INSERT INTO learning_state_entries(user_id,key,value,deleted,client_updated_at,updated_at) VALUES($1,$2,$3,false,$4,clock_timestamp())
         ON CONFLICT(user_id,key) DO UPDATE SET value=EXCLUDED.value,deleted=false,client_updated_at=EXCLUDED.client_updated_at,updated_at=clock_timestamp()`,
        [u.id, hk, entry.value, entry.updatedAt]
      );
      accepted[hk] = entry;
      writtenKeys.push(hk);
    }

    if (writtenKeys.length > 0 || strippedLegacy) {
      await client.query(`INSERT INTO learning_states(user_id,state,updated_at) VALUES($1,$2::jsonb,clock_timestamp())
        ON CONFLICT(user_id) DO UPDATE SET state=EXCLUDED.state,updated_at=clock_timestamp()`, [u.id, JSON.stringify(state)]);
    }

    const blEntry = state['clined_blok_lysis_v1'];
    const blValueToMirror = (blEntry && !blEntry.deleted && typeof blEntry.value === 'string' && (touchedBlokLysis || writtenKeys.includes('clined_blok_lysis_v1')))
      ? blEntry.value
      : null;
    const igdEntry = state['clined_igd_v2'];
    const igdValueToMirror = (igdEntry && !igdEntry.deleted && typeof igdEntry.value === 'string' && (touchedIgd || writtenKeys.includes('clined_igd_v2')))
      ? igdEntry.value
      : null;
    const rlEntry = state['clined_rujuk_langka_v1'];
    const rlValueToMirror = (rlEntry && !rlEntry.deleted && typeof rlEntry.value === 'string' && (touchedRujuk || writtenKeys.includes('clined_rujuk_langka_v1')))
      ? rlEntry.value
      : null;

    // Keep the weekly leaderboard snapshot in sync whenever the canonical XP key changes.
    let syncedXpValue = 0;
    const xpEntry = state['gaster_v11_xp'];
    if (xpEntry && !xpEntry.deleted) {
      syncedXpValue = parseXpValue(xpEntry.value);
      accepted['gaster_v11_xp'] = xpEntry;
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay() + 1);
      weekStart.setHours(0, 0, 0, 0);
      const weekKey = weekStart.toISOString().slice(0, 10);
      await client.query(`INSERT INTO xp_snapshots (id,user_id,week_key,xp_total)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (user_id,week_key) DO UPDATE
        SET xp_total=GREATEST(EXCLUDED.xp_total,xp_snapshots.xp_total),updated_at=now()`,
        [randomUUID(), u.id, weekKey, syncedXpValue]);
    }
    await client.query('COMMIT');

    // Mirror Mini Games leaderboard tables outside transaction so they can never abort sync COMMIT
    if (blValueToMirror) {
      await upsertBlokLysisFromState(getPool(), u.id, blValueToMirror).catch(() => {});
    }
    if (igdValueToMirror) {
      await upsertIgdFromState(getPool(), u.id, igdValueToMirror).catch(() => {});
    }
    if (rlValueToMirror) {
      await upsertRujukLangkaFromState(getPool(), u.id, rlValueToMirror).catch(() => {});
    }

    if (writtenKeys.length > 0) {
      try {
        push(u.id, 'sync_updated', { clientId, keys: [...new Set(writtenKeys)].slice(0, 30), at: Date.now() });
      } catch {}
    }

    let unlocked100k = null;
    if (syncedXpValue >= XP_100K_THRESHOLD) {
      const m = await maybeUnlock100kBadge(getPool(), u.id, syncedXpValue, { pushFn: push }).catch(() => null);
      if (m?.unlocked) unlocked100k = m;
    }
    return json(res, 200, { mode: 'delta', changes: accepted, ...(unlocked100k ? { unlocked100k } : {}) });
  } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
function sniffImage(buf) {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(PNG_SIG)) return 'image/png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  return null;
}

export async function photos(req, res, path) {
  const u = await required(req, res); if (!u) return;
  if (req.method === 'POST' && path === '') {
    if (!limit(req, res, 20)) return; origin(req);
    const input = await body(req, Math.ceil(maxPhotoBytes * 1.4) + 2000);
    const dataUrl = String(input.dataUrl || '');
    const m = /^data:([-\w./+]+);base64,([a-z0-9+/=]+)$/i.exec(dataUrl);
    if (!m) return fail(res, 400, 'Format data foto tidak valid.');
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > maxPhotoBytes) return fail(res, 413, `Ukuran foto maksimal ${(maxPhotoBytes / 1024 / 1024).toFixed(1)}MB. Kompres dulu di perangkat kamu.`);
    const type = sniffImage(buf);
    if (!type) return fail(res, 415, 'Hanya file PNG atau JPG/JPEG yang diizinkan.');
    const id = randomUUID();
    await getPool().query('INSERT INTO user_photos (id,owner_user_id,mime_type,byte_size,data) VALUES ($1,$2,$3,$4,$5)', [id, u.id, type, buf.length, buf]);
    return json(res, 201, { id, mimeType: type, byteSize: buf.length });
  }
  const match = path.match(/^\/([0-9a-f-]{36})$/i);
  if (match && req.method === 'GET') {
    const r = await getPool().query('SELECT mime_type,data FROM user_photos WHERE id=$1 AND owner_user_id=$2', [match[1], u.id]);
    if (!r.rowCount) return fail(res, 404, 'Foto tidak ditemukan.');
    res.writeHead(200, { 'Content-Type': r.rows[0].mime_type, 'Cache-Control': 'private, max-age=86400' });
    return res.end(r.rows[0].data);
  }
  if (match && req.method === 'DELETE') {
    await getPool().query('DELETE FROM user_photos WHERE id=$1 AND owner_user_id=$2', [match[1], u.id]);
    return json(res, 200, { ok: true });
  }
  return fail(res, 404, 'Endpoint foto tidak ditemukan.');
}
