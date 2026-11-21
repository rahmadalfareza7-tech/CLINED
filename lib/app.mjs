import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { contentApi } from '../content-api.mjs';
import { getPool, cors, headers, json, fail, limit, origin, body, user } from './http.mjs';
import { auth, ensureAdmin } from './auth.mjs';
import { sync, photos } from './sync.mjs';
import { cardsApi } from './cards.mjs';
import {
  adminBanks, adminLogins, adminMaterials, publicMaterials,
  adminResepOverrides, publicResepOverrides, adminYoutube, publicYoutube,
  adminActivity, adminUsers, publicBanksApi
} from './admin.mjs';
import {
  questionReports, adminQuestionReports, glossary,
  itemStatsPublic, itemStats, adminItemStats,
  publicAnnouncements, adminAnnouncements, questionNotes
} from './features.mjs';
import { createSocial } from './social.mjs';
import { onlineStats } from './stream.mjs';
import { createChat } from './chat.mjs';
import { createQComments } from './qcomments.mjs';
import { createXp } from './xp.mjs';
import { createUsage } from './usage.mjs';

async function ensureDatabase() {
  const db = getPool();
  await db.query('CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');
  const migrationDir = new URL('../db/migrations/', import.meta.url);
  const files = (await readdir(migrationDir)).filter(name => name.endsWith('.sql')).sort();
  const applied = new Set((await db.query('SELECT id FROM schema_migrations')).rows.map(row => row.id));
  for (const file of files) {
    if (applied.has(file)) continue;
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(await readFile(join(migrationDir.pathname, file), 'utf8'));
      await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [file]);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  const manifestUrl = new URL('../seed-data/manifest.json', import.meta.url);
  const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));
  for (const bank of manifest.banks || []) {
    const fileUrl = new URL(`../seed-data/${String(bank.dataUrl).replace('./seed-data/', '')}`, import.meta.url);
    const questions = JSON.parse(await readFile(fileUrl, 'utf8'));
    await db.query(`
      INSERT INTO question_banks (id,name,block,version,schema_version,published,questions)
      VALUES ($1,$2,$3,$4,$5,true,$6::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        name=EXCLUDED.name,
        block=EXCLUDED.block,
        schema_version=EXCLUDED.schema_version,
        published=CASE
          WHEN COALESCE(jsonb_array_length(question_banks.questions),0)=0 THEN true
          ELSE question_banks.published
        END,
        questions=CASE
          WHEN COALESCE(jsonb_array_length(question_banks.questions),0)=0 THEN EXCLUDED.questions
          ELSE question_banks.questions
        END,
        version=CASE
          WHEN COALESCE(jsonb_array_length(question_banks.questions),0)=0 THEN EXCLUDED.version
          ELSE question_banks.version
        END`,
      [bank.id, bank.name, bank.block, bank.version, bank.schema, JSON.stringify(questions)]);
  }
}

let adminReady = null;
function initializeDatabase() {
  if (!adminReady) adminReady = ensureDatabase().then(ensureAdmin).catch(error => {
    adminReady = null;
    throw error;
  });
  return adminReady;
}

const xpMod = createXp({ getPool, json, fail, body, origin, limit });
const social = createSocial({ getPool, json, fail, body, origin, limit, awardXp: xpMod.award });
const chat = createChat({ getPool, json, fail, body, origin, limit });
const qcomments = createQComments({ getPool, json, fail, body, origin, limit });
const usage = createUsage({ getPool, json, fail, body, origin, limit });

/** Handler API murni (tanpa static file) — dipakai local-server.mjs & api/[...path].mjs. */
export async function handleRequest(req, res) {
  headers(res); cors(req, res);
  if (req.method === 'OPTIONS') return res.writeHead(204).end();
  if (req.method === 'GET' && new URL(req.url, `https://${req.headers.host || 'localhost'}`).pathname === '/api/health') {
    try {
      await initializeDatabase();
      const r = await getPool().query("SELECT to_regclass('public.users') AS users_table, to_regclass('public.learning_states') AS learning_states_table");
      const ready = Boolean(r.rows[0]?.users_table && r.rows[0]?.learning_states_table);
      const adminConfigured = String(process.env.ADMIN_PASSWORD || '').length >= 12;
      return json(res, ready ? 200 : 503, { ok: ready, database: true, schema: ready ? 'ready' : 'missing_tables', admin: { configured: adminConfigured, username: adminConfigured ? String(process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase() : null, resetPending: process.env.ADMIN_RESET_PASSWORD === 'true' } });
    } catch (error) {
      console.error('Health check gagal:', error?.message || error);
      return json(res, 503, { ok: false, database: false, error: error?.message || 'Database tidak dapat diakses.' });
    }
  }
  try {
    await initializeDatabase();
    const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`), path = url.pathname;
    if (path.startsWith('/api/auth/')) return await auth(req, res, path.slice(9));
    if (path === '/api/sync') return await sync(req, res);
    if (path === '/api/cards') return await cardsApi(req, res, await user(req));
    if (path.startsWith('/api/photos')) return await photos(req, res, path.slice(11));
    if (path === '/api/banks' || path.startsWith('/api/banks/')) return await publicBanksApi(req, res, path.slice(4));
    if (path === '/api/materials') return await publicMaterials(req, res);
    if (path === '/api/youtube') return await publicYoutube(req, res);
    if (path === '/api/admin/materials' || path.startsWith('/api/admin/materials/')) return await adminMaterials(req, res, await user(req));
    if (path === '/api/admin/youtube' || path.startsWith('/api/admin/youtube/')) return await adminYoutube(req, res, await user(req));
    if (path.startsWith('/api/content/')) return await contentApi({ request: req, response: res, url, user: await user(req), pool: getPool(), body, json, fail, origin });
    if (path.startsWith('/api/admin/banks')) return await adminBanks(req, res, path.slice('/api/admin/banks'.length), await user(req));
    if (path === '/api/admin/logins') return await adminLogins(req, res, await user(req));
    if (path === '/api/admin/activity') return await adminActivity(req, res, await user(req));
    if (path === '/api/admin/users' || path.startsWith('/api/admin/users/')) return await adminUsers(req, res, await user(req));
    if (path === '/api/resep-overrides') return await publicResepOverrides(req, res);
    if (path.startsWith('/api/admin/resep-overrides')) return await adminResepOverrides(req, res, await user(req), path.slice('/api/admin/resep-overrides'.length));
    if (path === '/api/announcements') return await publicAnnouncements(req, res);
    if (path === '/api/admin/online-stats') {
      if (req.method !== 'GET') return fail(res, 405, 'Method tidak diizinkan.');
      const u = await user(req);
      if (!u) return fail(res, 401, 'Silakan masuk terlebih dahulu.');
      if (u.role !== 'admin') return fail(res, 403, 'Akses admin diperlukan.');
      const s = onlineStats();
      return json(res, 200, { ok: true, ...s, capacityPercent: Number((s.connections / s.maxConnections * 100).toFixed(2)) });
    }
    if (path === '/api/leaderboard') return await xpMod.leaderboard(req, res, await user(req));
    if (path === '/api/xp') return await xpMod.xp(req, res, await user(req));
    if (path === '/api/status' || path.startsWith('/api/status/')) return await social.status(req, res, await user(req), path.slice('/api/status'.length));
    if (path === '/api/glossary' || path.startsWith('/api/glossary/')) return await glossary(req, res, await user(req), path.slice('/api/glossary'.length));
    if (path === '/api/usage') return await usage.record(req, res, await user(req));
    if (path === '/api/admin/usage') return await usage.admin(req, res, await user(req));
    if (path === '/api/qcomments' || path === '/api/qcomments/vote') return await qcomments.handle(req, res, await user(req));
    if (path === '/api/chat' || path.startsWith('/api/chat/')) return await chat.chat(req, res, await user(req), path.slice('/api/chat'.length));
    if (path === '/api/stream' || path.startsWith('/api/stream/')) return await social.stream(req, res, await user(req), path.slice('/api/stream'.length));
    if (path === '/api/friends' || path.startsWith('/api/friends/')) return await social.friends(req, res, await user(req), path.slice('/api/friends'.length));
    if (path === '/api/duels' || path.startsWith('/api/duels/')) return await social.duels(req, res, await user(req), path.slice('/api/duels'.length));
    if (path === '/api/question-reports') return await questionReports(req, res, await user(req));
    if (path === '/api/admin/question-reports' || path.startsWith('/api/admin/question-reports/')) return await adminQuestionReports(req, res, await user(req), path.slice('/api/admin/question-reports'.length));
    if (path === '/api/item-stats/public') return await itemStatsPublic(req, res, await user(req));
    if (path === '/api/item-stats') return await itemStats(req, res, await user(req));
    if (path === '/api/admin/item-stats') return await adminItemStats(req, res, await user(req));
    if (path === '/api/notes' || path.startsWith('/api/notes')) return await questionNotes(req, res);
    if (path === '/api/admin/announcements' || path.startsWith('/api/admin/announcements/')) return await adminAnnouncements(req, res, await user(req));
    if (path === '/api/health') return await publicBanksApi(req, res, path.slice(4));
    if (path.startsWith('/api/')) { if (!await user(req)) return fail(res, 401, 'Silakan masuk terlebih dahulu.'); return await publicBanksApi(req, res, path.slice(4)); }
    return fail(res, 404, 'Bukan endpoint API. File statis dilayani otomatis oleh Vercel/CDN.');
  } catch (e) { console.error(e); fail(res, e.status || 500, e.status ? e.message : 'Terjadi gangguan pada server.'); }
}
