import { randomUUID } from 'node:crypto';
import { getPool, json, fail, limit, origin, body, required, maxPhotoBytes } from './http.mjs';
import { push } from './stream.mjs';
import { maybeUnlock100kBadge, XP_100K_THRESHOLD, parseXpValue } from './xp-milestone.mjs';

const validKey = k => /^(gaster_|clined_|medicalRpg|medical_rpg|current_block|last_worked|dashboard_block|alpha5_)/.test(k) && !/auth|password|session|token|sync_queue|last_activity|xp_queue/i.test(k);
const SYNC_MAX_KEYS = 200;
const SYNC_MAX_VALUE_BYTES = 500_000;
const isoOrNull = value => { const t = Date.parse(String(value || '')); return Number.isFinite(t) ? new Date(t).toISOString() : null; };
function syncEntry(key, row) { return row?.deleted ? { deleted: true, updatedAt: row.client_updated_at || row.updated_at } : { value: row?.value ?? '', updatedAt: row.client_updated_at || row.updated_at }; }

export async function sync(req, res) {
  const u = await required(req, res); if (!u) return;
  if (req.method === 'GET') {
    const sinceRaw = req.url?.includes('?') ? new URL(req.url, 'http://localhost').searchParams.get('since') : null;
    const since = sinceRaw && Number.isFinite(Date.parse(sinceRaw)) ? new Date(sinceRaw).toISOString() : null;
    if (!since) {
      const r = await getPool().query('SELECT state,updated_at FROM learning_states WHERE user_id=$1', [u.id]);
      const state = r.rows[0]?.state || {};
      return json(res, 200, { mode: 'full', state, updatedAt: r.rows[0]?.updated_at ? new Date(r.rows[0].updated_at).toISOString() : new Date().toISOString() });
    }
    const r = await getPool().query(`SELECT key,value,deleted,client_updated_at,updated_at
      FROM learning_state_entries WHERE user_id=$1 AND updated_at>$2::timestamptz
      ORDER BY updated_at ASC LIMIT $3`, [u.id, since, SYNC_MAX_KEYS]);
    const changes = {};
    let cursorMs = Date.parse(since) || 0;
    let cursor = since;
    for (const row of r.rows) {
      changes[row.key] = syncEntry(row, row);
      const rowMs = row.updated_at ? new Date(row.updated_at).getTime() : 0;
      if (rowMs > cursorMs) {
        cursorMs = rowMs;
        cursor = new Date(rowMs).toISOString();
      }
    }
    return json(res, 200, { mode: 'delta', changes, updatedAt: cursor, hasMore: r.rows.length === SYNC_MAX_KEYS });
  }
  if (req.method !== 'POST') return fail(res, 405, 'Method tidak diizinkan.');
  origin(req); if (!limit(req, res, 60)) return;
  const ops = (await body(req, 1_200_000)).operations;
  if (!Array.isArray(ops)) return fail(res, 400, 'operations harus berupa array.');
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const saved = await client.query('SELECT state FROM learning_states WHERE user_id=$1 FOR UPDATE', [u.id]);
    const state = saved.rows[0]?.state || {};
    const accepted = {};
    for (const op of ops.slice(0, SYNC_MAX_KEYS)) {
      const key = String(op?.key || '');
      if (!op || !/^[0-9a-f-]{36}$/i.test(op.id || '') || !validKey(key) || !['set', 'delete'].includes(op.type)) continue;
      if (op.type === 'set' && (typeof op.value !== 'string' || Buffer.byteLength(op.value) > SYNC_MAX_VALUE_BYTES)) continue;
      const incoming = Date.parse(op.updatedAt) || 0;
      const previous = Date.parse(state[key]?.updatedAt) || 0;
      // XP hanya boleh naik: jam perangkat yang tertinggal tidak boleh membuat XP baru ditolak selamanya.
      if (key === 'gaster_v11_xp' && op.type === 'set') { const n = v => { try { return Number(JSON.parse(v || '0')) || 0; } catch { return Number(v) || 0; } }; if (n(op.value) < n(state[key]?.value)) continue; }
      else if (incoming < previous) continue;
      const inserted = await client.query('INSERT INTO sync_operations (user_id,idempotency_key) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING idempotency_key', [u.id, op.id]);
      if (!inserted.rowCount) continue;
      const clientUpdated = isoOrNull(op.updatedAt) || new Date().toISOString();
      if (op.type === 'delete') {
        state[key] = { deleted: true, updatedAt: clientUpdated };
        await client.query(`INSERT INTO learning_state_entries(user_id,key,value,deleted,client_updated_at,updated_at) VALUES($1,$2,NULL,true,$3,clock_timestamp())
          ON CONFLICT(user_id,key) DO UPDATE SET value=NULL,deleted=true,client_updated_at=EXCLUDED.client_updated_at,updated_at=clock_timestamp()`, [u.id, key, clientUpdated]);
      } else {
        state[key] = { value: op.value, updatedAt: clientUpdated };
        await client.query(`INSERT INTO learning_state_entries(user_id,key,value,deleted,client_updated_at,updated_at) VALUES($1,$2,$3,false,$4,clock_timestamp())
          ON CONFLICT(user_id,key) DO UPDATE SET value=EXCLUDED.value,deleted=false,client_updated_at=EXCLUDED.client_updated_at,updated_at=clock_timestamp()`, [u.id, key, op.value, clientUpdated]);
      }
      accepted[key] = state[key];
    }
    await client.query(`INSERT INTO learning_states(user_id,state,updated_at) VALUES($1,$2::jsonb,clock_timestamp())
      ON CONFLICT(user_id) DO UPDATE SET state=EXCLUDED.state,updated_at=clock_timestamp()`, [u.id, JSON.stringify(state)]);
    // Keep the weekly leaderboard snapshot in sync whenever the canonical XP key changes.
    let syncedXpValue = 0;
    const xpEntry = state['gaster_v11_xp'];
    if (xpEntry && !xpEntry.deleted) {
      syncedXpValue = parseXpValue(xpEntry.value);
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
    const cursor = await client.query('SELECT COALESCE(MAX(updated_at),clock_timestamp()) AS updated_at FROM learning_state_entries WHERE user_id=$1', [u.id]);
    await client.query('COMMIT');
    let unlocked100k = null;
    if (syncedXpValue >= XP_100K_THRESHOLD) {
      const m = await maybeUnlock100kBadge(getPool(), u.id, syncedXpValue, { pushFn: push }).catch(() => null);
      if (m?.unlocked) unlocked100k = m;
    }
    return json(res, 200, { mode: 'delta', changes: accepted, updatedAt: cursor.rows[0].updated_at, ...(unlocked100k ? { unlocked100k } : {}) });
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
