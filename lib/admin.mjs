import { randomUUID } from 'node:crypto';
import { getPool, json, fail, origin, body, publicUser } from './http.mjs';
import { cleanDataset, cleanItemKey, cleanPatch, canEditResep } from './resep-logic.mjs';
import { dropUser } from './stream.mjs';

const publicBankCache = new Map();
const PUBLIC_BANK_CACHE_MS = 5 * 60 * 1000;
export function invalidatePublicBankCache(id) { publicBankCache.delete(String(id || '')); }

export async function adminBanks(req, res, path, u) {
  const editable = /^\/[^/]+\/questions\/[^/]+$/.test(path) && (req.method === 'PATCH' || req.method === 'GET');
  if (!u || (u.role !== 'admin' && !(editable && u.role === 'helper'))) return fail(res, 403, 'Akses admin diperlukan.');
  if (req.method === 'GET' && path === '') {
    const r = await getPool().query('SELECT id,name,block,version,schema_version,published,questions,updated_at FROM question_banks ORDER BY id');
    return json(res, 200, { banks: r.rows });
  }
  const one = path.match(/^\/([^/]+)\/questions\/([^/]+)$/);
  if (one && req.method === 'PATCH') {
    origin(req);
    const bankId = decodeURIComponent(one[1]), qid = decodeURIComponent(one[2]);
    const input = await body(req, 60_000);
    const cur = await getPool().query('SELECT questions,version FROM question_banks WHERE id=$1', [bankId]);
    if (!cur.rowCount) return fail(res, 404, 'Bank soal tidak ditemukan.');
    const list = Array.isArray(cur.rows[0].questions) ? cur.rows[0].questions : [];
    const idx = list.findIndex(x => String(x?.id) === qid);
    if (idx < 0) return fail(res, 404, 'Soal tidak ditemukan di bank ini.');
    const soal = String(input.soal ?? '').trim();
    const opsi = Array.isArray(input.opsi) ? input.opsi.map(x => String(x ?? '').trim()) : [];
    const key = Number(input.jawabanBenar);
    if (!soal || opsi.length < 2 || opsi.length > 6 || opsi.some(x => !x)) return fail(res, 400, 'Soal dan semua opsi harus diisi.');
    if (!Number.isInteger(key) || key < 0 || key >= opsi.length) return fail(res, 400, 'Kunci jawaban tidak valid.');
    const next = { ...list[idx], soal, opsi, jawabanBenar: key };
    if (typeof input.pembahasan === 'string') next.pembahasan = input.pembahasan.trim().slice(0, 4000);
    if (typeof input.catatanKlinis === 'string') next.catatanKlinis = input.catatanKlinis.trim().slice(0, 2000);
    if (Array.isArray(input.pembahasanPilihan)) {
      const per = opsi.map((_, i) => String(input.pembahasanPilihan[i] ?? '').trim().slice(0, 2000));
      next.pembahasanPilihan = per;
      if (next.pembahasan_klinis && typeof next.pembahasan_klinis === 'object') next.pembahasan_klinis = Object.fromEntries(per.map((t, i) => [String.fromCharCode(65 + i), t]));
    }
    await getPool().query('INSERT INTO activity_logs (id,user_id,action,metadata) VALUES ($1,$2,$3,$4::jsonb)', [randomUUID(), u.id, 'question_edited', JSON.stringify({ source: 'bank', bank: bankId, questionId: qid })]).catch(() => {});
    list[idx] = next;
    const version = Number(cur.rows[0].version || 1) + 1;
    await getPool().query('UPDATE question_banks SET questions=$1::jsonb,version=$2,updated_at=now() WHERE id=$3', [JSON.stringify(list), version, bankId]);
    invalidatePublicBankCache(bankId);
    return json(res, 200, { ok: true, version, question: next });
  }
  if (one && req.method === 'GET') {
    const bankId = decodeURIComponent(one[1]), qid = decodeURIComponent(one[2]);
    const cur = await getPool().query('SELECT questions FROM question_banks WHERE id=$1', [bankId]);
    const q = (cur.rows[0]?.questions || []).find(x => String(x?.id) === qid);
    return q ? json(res, 200, { question: q }) : fail(res, 404, 'Soal tidak ditemukan.');
  }
  const match = path.match(/^\/([^/]+)$/);
  if (!match) return fail(res, 404, 'Bank admin tidak ditemukan.');
  const id = match[1];
  if (req.method === 'PATCH') {
    origin(req);
    const input = await body(req, 2_000_000);
    const questions = Array.isArray(input.questions) ? input.questions : null;
    if (!questions || !questions.length || questions.length > 50000) return fail(res, 400, 'Daftar soal tidak valid.');
    const seen = new Set();
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q || typeof q !== 'object' || !String(q.id || '').trim() || !String(q.soal || '').trim() || !Array.isArray(q.opsi) || q.opsi.length < 2 || !Number.isInteger(q.jawabanBenar) || q.jawabanBenar < 0 || q.jawabanBenar >= q.opsi.length) return fail(res, 400, `Format soal #${i + 1} tidak valid.`);
      const qid = String(q.id).trim(); if (seen.has(qid)) return fail(res, 400, `ID soal duplikat: ${qid}`); seen.add(qid);
    }
    const existing = await getPool().query('SELECT id,name,block,version,schema_version FROM question_banks WHERE id=$1', [id]);
    if (!existing.rowCount) return fail(res, 404, 'Bank soal tidak ditemukan.');
    const version = Math.max(Number(existing.rows[0].version || 1) + 1, Number(input.version || 0));
    const r = await getPool().query(`UPDATE question_banks SET questions=$1::jsonb,version=$2,published=$3,updated_at=now() WHERE id=$4 RETURNING id,name,block,version,schema_version,published,updated_at`, [JSON.stringify(questions), version, input.published !== false, id]);
    invalidatePublicBankCache(id);
    return json(res, 200, { bank: r.rows[0], message: 'Bank soal global diperbarui. Pengguna akan menerima versi terbaru saat memuat ulang.' });
  }
  return fail(res, 405, 'Method tidak diizinkan.');
}

export async function adminLogins(req, res, u) {
  if (!u || u.role !== 'admin') return fail(res, 403, 'Akses admin diperlukan.');
  if (req.method !== 'GET') return fail(res, 405, 'Method tidak diizinkan.');
  const r = await getPool().query(`
    SELECT id,name,username,role,last_login_at
    FROM users
    WHERE last_login_at >= (date_trunc('day', now() AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'Asia/Jakarta')
      AND role <> 'admin'
    ORDER BY last_login_at DESC`);
  return json(res, 200, { date: new Date().toISOString().slice(0, 10), count: r.rowCount, logins: r.rows.map(row => ({ id: row.id, name: row.name, username: row.username, role: row.role, lastLoginAt: row.last_login_at })) });
}

async function ensureBlockMaterialsTable() {
  await getPool().query(`CREATE TABLE IF NOT EXISTS block_materials (
    block VARCHAR(80) PRIMARY KEY,
    url TEXT NOT NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
}

export async function adminMaterials(req, res, u) {
  if (!u || u.role !== 'admin') return fail(res, 403, 'Akses admin diperlukan.');
  await ensureBlockMaterialsTable();
  const pathname = new URL(req.url, `https://${req.headers.host || 'localhost'}`).pathname;
  if (req.method === 'GET' && pathname === '/api/admin/materials') {
    const r = await getPool().query('SELECT block,url,updated_at FROM block_materials ORDER BY block');
    return json(res, 200, { materials: r.rows.map(x => ({ block: x.block, url: x.url, updatedAt: x.updated_at })) });
  }
  const match = pathname.match(/^\/api\/admin\/materials\/([^/]+)$/);
  if (!match) return fail(res, 404, 'Endpoint materi tidak ditemukan.');
  const block = decodeURIComponent(match[1]).trim().slice(0, 80);
  if (req.method === 'DELETE') {
    await getPool().query('DELETE FROM block_materials WHERE block=$1', [block]);
    return json(res, 200, { ok: true, message: `Link materi ${block} dihapus.` });
  }
  if (req.method !== 'PUT') return fail(res, 405, 'Method tidak diizinkan.');
  origin(req);
  const input = await body(req), urlValue = String(input.url || '').trim();
  if (!/^https?:\/\//i.test(urlValue) || urlValue.length > 2000) return fail(res, 400, 'Link materi harus berupa URL http/https yang valid.');
  const r = await getPool().query(`INSERT INTO block_materials (block,url,updated_by,updated_at) VALUES ($1,$2,$3,now()) ON CONFLICT (block) DO UPDATE SET url=EXCLUDED.url,updated_by=EXCLUDED.updated_by,updated_at=now() RETURNING block,url,updated_at`, [block, urlValue, u.id]);
  return json(res, 200, { material: { block: r.rows[0].block, url: r.rows[0].url, updatedAt: r.rows[0].updated_at }, message: `Link materi ${block} berhasil disimpan.` });
}

export async function publicMaterials(req, res) {
  await ensureBlockMaterialsTable();
  if (req.method !== 'GET') return fail(res, 405, 'Method tidak diizinkan.');
  const r = await getPool().query('SELECT block,url FROM block_materials ORDER BY block');
  return json(res, 200, { materials: r.rows });
}

async function ensureResepOverridesTable() {
  await getPool().query(`CREATE TABLE IF NOT EXISTS resep_overrides (
    dataset VARCHAR(20) NOT NULL,
    item_key VARCHAR(200) NOT NULL,
    data JSONB NOT NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (dataset, item_key)
  )`);
}

export async function publicResepOverrides(req, res) {
  if (req.method !== 'GET') return fail(res, 405, 'Method tidak diizinkan.');
  await ensureResepOverridesTable();
  const r = await getPool().query('SELECT dataset,item_key,data FROM resep_overrides ORDER BY dataset,item_key');
  return json(res, 200, { overrides: r.rows.map(x => ({ dataset: x.dataset, key: x.item_key, data: x.data })) });
}

export async function adminResepOverrides(req, res, u, sub) {
  if (!u) return fail(res, 401, 'Silakan masuk terlebih dahulu.');
  if (!canEditResep(u)) return fail(res, 403, 'Akses admin atau helper diperlukan.');
  await ensureResepOverridesTable();
  const m = String(sub || '').match(/^\/([a-z]+)\/([^/]+)$/);
  if (!m) return fail(res, 404, 'Endpoint tidak ditemukan.');
  const dataset = cleanDataset(m[1]), key = cleanItemKey(decodeURIComponent(m[2]));
  if (!dataset || !key) return fail(res, 400, 'Dataset atau item tidak valid.');
  if (req.method === 'DELETE') {
    origin(req);
    await getPool().query('DELETE FROM resep_overrides WHERE dataset=$1 AND item_key=$2', [dataset, key]);
    return json(res, 200, { ok: true, message: 'Dikembalikan ke versi bawaan.' });
  }
  if (req.method !== 'PUT') return fail(res, 405, 'Method tidak diizinkan.');
  origin(req);
  const input = await body(req, 120_000), patch = cleanPatch(dataset, input?.data);
  if (!patch) return fail(res, 400, 'Data perubahan tidak valid atau terlalu besar.');
  await getPool().query(`INSERT INTO resep_overrides (dataset,item_key,data,updated_by,updated_at) VALUES ($1,$2,$3::jsonb,$4,now())
    ON CONFLICT (dataset,item_key) DO UPDATE SET data=EXCLUDED.data,updated_by=EXCLUDED.updated_by,updated_at=now()`, [dataset, key, JSON.stringify(patch), u.id]);
  return json(res, 200, { ok: true, message: 'Perubahan disimpan untuk semua pengguna.', data: patch });
}

async function ensureBlockYoutubeTable() {
  await getPool().query(`CREATE TABLE IF NOT EXISTS block_youtube_links (
    block VARCHAR(80) PRIMARY KEY, url TEXT NOT NULL, updated_by UUID REFERENCES users(id) ON DELETE SET NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
}

export async function adminYoutube(req, res, u) {
  if (!u || u.role !== 'admin') return fail(res, 403, 'Akses admin diperlukan.');
  await ensureBlockYoutubeTable();
  const pathname = new URL(req.url, `https://${req.headers.host || 'localhost'}`).pathname;
  if (req.method === 'GET' && pathname === '/api/admin/youtube') {
    const r = await getPool().query('SELECT block,url,updated_at FROM block_youtube_links ORDER BY block');
    return json(res, 200, { links: r.rows.map(x => ({ block: x.block, url: x.url, updatedAt: x.updated_at })) });
  }
  const match = pathname.match(/^\/api\/admin\/youtube\/([^/]+)$/);
  if (!match) return fail(res, 404, 'Endpoint YouTube tidak ditemukan.');
  const block = decodeURIComponent(match[1]).trim().slice(0, 80);
  if (req.method === 'DELETE') {
    await getPool().query('DELETE FROM block_youtube_links WHERE block=$1', [block]);
    return json(res, 200, { ok: true, message: `Link Ninja Nerd ${block} dihapus.` });
  }
  if (req.method !== 'PUT') return fail(res, 405, 'Method tidak diizinkan.');
  origin(req);
  const input = await body(req), urlValue = String(input.url || '').trim();
  if (!/^https?:\/\//i.test(urlValue) || urlValue.length > 2000) return fail(res, 400, 'Link YouTube harus berupa URL http/https yang valid.');
  const r = await getPool().query(`INSERT INTO block_youtube_links (block,url,updated_by,updated_at) VALUES ($1,$2,$3,now()) ON CONFLICT (block) DO UPDATE SET url=EXCLUDED.url,updated_by=EXCLUDED.updated_by,updated_at=now() RETURNING block,url,updated_at`, [block, urlValue, u.id]);
  return json(res, 200, { link: { block: r.rows[0].block, url: r.rows[0].url, updatedAt: r.rows[0].updated_at }, message: `Link Ninja Nerd ${block} berhasil disimpan.` });
}

export async function publicYoutube(req, res) {
  await ensureBlockYoutubeTable();
  if (req.method !== 'GET') return fail(res, 405, 'Method tidak diizinkan.');
  const r = await getPool().query('SELECT block,url FROM block_youtube_links ORDER BY block');
  return json(res, 200, { links: r.rows });
}

async function ensureActivityTables() {
  const db = getPool();
  await db.query(`CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(60) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await db.query('CREATE INDEX IF NOT EXISTS activity_logs_created_idx ON activity_logs(created_at DESC)');
  await db.query('CREATE INDEX IF NOT EXISTS activity_logs_user_idx ON activity_logs(user_id, created_at DESC)');
}

export async function adminActivity(req, res, u) {
  if (!u || u.role !== 'admin') return fail(res, 403, 'Akses admin diperlukan.');
  await ensureActivityTables();
  if (req.method === 'GET') {
    const countResult = await getPool().query('SELECT COUNT(*)::int AS count FROM users');
    const userCount = countResult.rows[0]?.count || 0;
    const r = await getPool().query(`
      SELECT a.id,a.action,a.metadata,a.created_at,u.id AS user_id,u.name,u.username,u.role
      FROM activity_logs a
      LEFT JOIN users u ON u.id=a.user_id
      WHERE NOT (a.action IN ('login','logout') AND u.role='admin')
      ORDER BY a.created_at DESC
      LIMIT 200`);
    return json(res, 200, {
      userCount,
      activities: r.rows.map(x => ({
        id: x.id, action: x.action, metadata: x.metadata || {}, createdAt: x.created_at,
        user: x.user_id ? { id: x.user_id, name: x.name, username: x.username, role: x.role } : null
      }))
    });
  }
  if (req.method === 'DELETE') {
    const input = await body(req);
    const id = String(input.id || '').trim();
    if (id) {
      if (!/^[0-9a-f-]{36}$/i.test(id)) return fail(res, 400, 'ID aktivitas tidak valid.');
      const r = await getPool().query(`DELETE FROM activity_logs WHERE id=$1 AND action IN ('login','logout') RETURNING id`, [id]);
      if (!r.rowCount) return fail(res, 404, 'Aktivitas login/logout tidak ditemukan.');
      return json(res, 200, { ok: true, message: 'Aktivitas login/logout dihapus.' });
    }
    const r = await getPool().query(`DELETE FROM activity_logs WHERE action IN ('login','logout')`);
    return json(res, 200, { ok: true, deleted: r.rowCount, message: `Aktivitas login/logout berhasil direset (${r.rowCount} aktivitas).` });
  }
  return fail(res, 405, 'Method tidak diizinkan.');
}

export async function adminUsers(req, res, u) {
  if (!u || u.role !== 'admin') return fail(res, 403, 'Akses admin diperlukan.');
  await ensureActivityTables();
  const pathname = new URL(req.url, `https://${req.headers.host || 'localhost'}`).pathname;
  if (req.method === 'GET' && pathname === '/api/admin/users') {
    const r = await getPool().query(`
      SELECT u.id, u.name, u.username, u.role, u.is_mentor, (u.avatar_url IS NOT NULL) AS avatar_url, u.chat_avatar_deco, u.updated_at, u.created_at, u.last_login_at,
        GREATEST(
          CASE WHEN x.state->'gaster_v11_xp'->>'value' ~ '^[0-9]+(\\.[0-9]+)?$'
               THEN ROUND((x.state->'gaster_v11_xp'->>'value')::numeric)::int ELSE 0 END,
          COALESCE(ev.xp, 0)::int
        ) AS xp_total
      FROM users u
      LEFT JOIN learning_states x ON x.user_id = u.id
      LEFT JOIN (SELECT user_id, SUM(amount)::int AS xp FROM xp_events WHERE kind <> 'userbank' GROUP BY user_id) ev ON ev.user_id = u.id
      ORDER BY CASE WHEN u.role='admin' THEN 0 WHEN u.role='helper' THEN 1 ELSE 2 END, u.name`);
    return json(res, 200, { users: r.rows.map(row => ({ ...publicUser(row), lastLoginAt: row.last_login_at, xpTotal: Number(row.xp_total) || 0 })) });
  }
  const deleteMatch = pathname.match(/^\/api\/admin\/users\/([0-9a-f-]{36})$/i);
  if (deleteMatch) {
    if (req.method !== 'DELETE') return fail(res, 405, 'Method tidak diizinkan.');
    const targetId = deleteMatch[1];
    if (targetId === u.id) return fail(res, 400, 'Akun admin yang sedang digunakan tidak dapat dihapus.');
    const target = (await getPool().query('SELECT id,name,username,role FROM users WHERE id=$1', [targetId])).rows[0];
    if (!target) return fail(res, 404, 'Pengguna tidak ditemukan.');
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE content_packages SET created_by=NULL WHERE created_by=$1', [targetId]);
      await client.query('DELETE FROM users WHERE id=$1', [targetId]);
      await client.query('COMMIT');
      dropUser(targetId);
      return json(res, 200, { ok: true, message: `Pengguna @${target.username} berhasil dihapus.` });
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
  const match = pathname.match(/^\/api\/admin\/users\/([0-9a-f-]{36})\/role$/i);
  if (!match) return fail(res, 404, 'Pengguna tidak ditemukan.');
  if (req.method !== 'PATCH') return fail(res, 405, 'Method tidak diizinkan.');
  const targetId = match[1];
  const input = await body(req);
  const hasRole = input.role !== undefined, hasMentor = input.mentor !== undefined;
  if (!hasRole && !hasMentor) return fail(res, 400, 'Tidak ada perubahan.');
  const role = hasRole ? String(input.role || '').trim().toLowerCase() : null;
  if (hasRole && !['student', 'admin', 'helper'].includes(role)) return fail(res, 400, 'Role tidak valid.');
  if (hasRole && targetId === u.id && role !== 'admin') return fail(res, 400, 'Kamu tidak dapat menurunkan role akun admin yang sedang dipakai.');
  const target = (await getPool().query('SELECT id,name,username,role,is_mentor FROM users WHERE id=$1', [targetId])).rows[0];
  if (!target) return fail(res, 404, 'Pengguna tidak ditemukan.');
  const nextRole = hasRole ? role : target.role, nextMentor = hasMentor ? !!input.mentor : !!target.is_mentor;
  if (nextRole === target.role && nextMentor === !!target.is_mentor) return json(res, 200, { user: publicUser(target), message: `Tidak ada perubahan untuk @${target.username}.` });
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const r = await client.query('UPDATE users SET role=$1,is_mentor=$2,updated_at=now() WHERE id=$3 RETURNING id,name,username,role,is_mentor,created_at,last_login_at', [nextRole, nextMentor, targetId]);
    if (!r.rowCount) { await client.query('ROLLBACK'); return fail(res, 404, 'Pengguna tidak ditemukan.'); }
    await client.query('INSERT INTO activity_logs (id,user_id,action,metadata) VALUES ($1,$2,$3,$4::jsonb)', [
      randomUUID(), u.id, 'role_changed', JSON.stringify({ targetUserId: target.id, targetUsername: target.username, from: target.role, to: nextRole, mentorFrom: !!target.is_mentor, mentorTo: nextMentor })
    ]);
    await client.query('COMMIT');
    return json(res, 200, { user: publicUser(r.rows[0]), message: `@${target.username}: role ${nextRole}${nextMentor ? ' + tempat bertanya' : ''}.` });
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}

export async function publicBanksApi(req, res, path) {
  if (path === '/health' && req.method === 'GET') { await getPool().query('SELECT 1'); return json(res, 200, { ok: true }); }
  if (path === '/banks' && req.method === 'GET') {
    const r = await getPool().query('SELECT id,name,block,version,schema_version,jsonb_array_length(questions) AS count,updated_at FROM question_banks WHERE published=true ORDER BY id');
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' });
    return res.end(JSON.stringify({ banks: r.rows }));
  }
  const match = path.match(/^\/banks\/([a-z0-9_-]+)$/i);
  if (match && req.method === 'GET') {
    const id = match[1], now = Date.now(), cached = publicBankCache.get(id);
    if (cached && cached.expiresAt > now) {
      if (req.headers['if-none-match'] === cached.etag) { res.writeHead(304, { 'ETag': cached.etag, 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' }); return res.end(); }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400', 'ETag': cached.etag });
      return res.end(cached.body);
    }
    const r = await getPool().query('SELECT id,name,block,version,schema_version,questions,updated_at FROM question_banks WHERE id=$1 AND published=true', [id]);
    if (!r.rowCount) return fail(res, 404, 'Bank soal tidak ditemukan.');
    const b = r.rows[0], etag = `"${b.id}-v${b.version}"`, payload = JSON.stringify({ bank: b });
    publicBankCache.set(id, { etag, body: payload, expiresAt: now + PUBLIC_BANK_CACHE_MS });
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, { 'ETag': etag, 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' }); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400', 'ETag': etag });
    return res.end(payload);
  }
  return fail(res, 404, 'Endpoint tidak ditemukan.');
}
