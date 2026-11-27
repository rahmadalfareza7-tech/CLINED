import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import pg from 'pg';
import { canUse100kBadge, is100kBadgeVisible } from './xp-milestone.mjs';
import { cleanChampionBlocks } from './champion-tags.mjs';
import { checkPersistentLimit } from './rate-limit.mjs';
const { Pool } = pg;

export const CSP_HEADER = "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self'; connect-src 'self'; font-src 'self' data: https://fonts.gstatic.com; frame-src 'self' https://tako.id; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'";

const scrypt = promisify(scryptCallback);
const production = process.env.NODE_ENV === 'production';
const secureCookie = process.env.AUTH_COOKIE_SECURE === 'true' || (production && process.env.AUTH_COOKIE_SECURE !== 'false');
const allowedOrigins = String(process.env.FRONTEND_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
export const maxPhotoBytes = Number(process.env.MAX_PHOTO_BYTES || 2 * 1024 * 1024);
const ttl = 7 * 24 * 60 * 60 * 1000;
const buckets = new Map();
let lastBucketSweep = 0;
let pool = null;

export function getPool() {
  if (pool) return pool;
  const databaseUrl = String(process.env.DATABASE_URL || '').trim();
  if (!databaseUrl) throw Object.assign(Error('DATABASE_URL belum diatur di Vercel Environment Variables.'), { status: 503 });
  if (production && !secureCookie) throw Object.assign(Error('AUTH_COOKIE_SECURE harus true di production.'), { status: 500 });
  pool = new Pool({ connectionString: databaseUrl, max: Number(process.env.DATABASE_POOL_SIZE || 20) });
  return pool;
}

export function cors(req, res) {
  const o = req.headers.origin;
  if (!allowedOrigins.length || !o) return;
  if (allowedOrigins.includes(o)) {
    res.setHeader('Access-Control-Allow-Origin', o);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
}

export function headers(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Content-Security-Policy', CSP_HEADER);
}

export function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

export function fail(res, status, error) { json(res, status, { error }); }

export function cookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').map(x => x.trim().split(/=(.*)/s)).filter(([k]) => k).map(([k, v]) => [k, decodeURIComponent(v || '')]));
}

function sweepBuckets(now) {
  if (now - lastBucketSweep < 60_000) return;
  lastBucketSweep = now;
  for (const [key, b] of buckets) { if (b.until < now) buckets.delete(key); }
}

function rateLimitKey(req) {
  const sess = cookies(req).clined_session;
  const xff = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  const actor = (sess && /^[0-9a-f-]{36}$/i.test(sess)) ? `s:${sess}` : (xff || req.socket?.remoteAddress || 'x');
  return `${actor}:${new URL(req.url, 'http://x').pathname}`;
}

export function limit(req, res, max = 30) {
  const now = Date.now();
  sweepBuckets(now);
  const key = rateLimitKey(req), old = buckets.get(key);
  const b = !old || old.until < now ? { count: 0, until: now + 60_000 } : old;
  b.count++; buckets.set(key, b);
  if (b.count <= max) return true;
  res.setHeader('Retry-After', Math.ceil((b.until - now) / 1000));
  fail(res, 429, 'Terlalu banyak permintaan.');
  return false;
}

export async function limitStrict(req, res, max = 10, windowMs = 60_000) {
  const key = rateLimitKey(req);
  let dbResult = null;
  try {
    dbResult = await checkPersistentLimit(getPool(), key, max, windowMs);
  } catch {}
  if (dbResult) {
    if (dbResult.allowed) return true;
    res.setHeader('Retry-After', dbResult.retryAfterSec);
    fail(res, 429, 'Terlalu banyak permintaan. Coba lagi beberapa saat.');
    return false;
  }
  return limit(req, res, max);
}

export function origin(req) {
  const o = req.headers.origin;
  if (!o) return;
  if (!allowedOrigins.includes(o)) throw Object.assign(Error('Origin permintaan tidak diizinkan.'), { status: 403 });
}

export async function body(req, max = 200_000) {
  let raw = '', size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > max) throw Object.assign(Error('Permintaan terlalu besar.'), { status: 413 });
    raw += c;
  }
  try { return raw ? JSON.parse(raw) : {}; }
  catch { throw Object.assign(Error('Data permintaan tidak valid.'), { status: 400 }); }
}

export function userAvatarUrl(u) {
  if (!u || !u.avatar_url) return '';
  const ts = u.updated_at ? new Date(u.updated_at).getTime() : 0;
  return `/api/auth/avatar/${u.id}${Number.isFinite(ts) && ts > 0 ? `?v=${ts}` : ''}`;
}

export function userBannerUrl(u) {
  if (!u || !u.chat_banner_url) return '';
  if (typeof u.chat_banner_url === 'string' && u.chat_banner_url.startsWith('preset:')) {
    const id = u.chat_banner_url.slice(7).replace(/[^a-z0-9-]/gi, '');
    return id ? `assets/banners/${id}.svg?v=2` : '';
  }
  const ts = u.updated_at ? new Date(u.updated_at).getTime() : 0;
  return `/api/auth/banner/${u.id}${Number.isFinite(ts) && ts > 0 ? `?v=${ts}` : ''}`;
}

const CHAT_NAME_COLORS = new Set(['amber', 'sakura', 'cyber', 'crimson', 'emerald', 'violet', 'sunset', 'ice', 'hologram', 'gold']);

export function userNameColor(u) {
  const c = String(u?.chat_name_color || '').trim().toLowerCase();
  return CHAT_NAME_COLORS.has(c) ? c : '';
}

export function userDecoUrl(u) {
  const id = String(u?.chat_avatar_deco || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  return id ? `assets/decorations/${id}.svg?v=2` : '';
}

export function publicUser(u) {
  return { id: u.id, name: u.name, username: u.username, role: u.role, isMentor: !!u.is_mentor, showInLeaderboard: (u.role === 'admin' || u.role === 'developer') ? Boolean(u.show_in_leaderboard) : true, xp100k: is100kBadgeVisible(u), xp100kToggleable: canUse100kBadge(u), xp100kUnlocked: Boolean(u.badge_100k_at), championBlocks: cleanChampionBlocks(u.champion_blocks), avatarUrl: userAvatarUrl(u), bannerUrl: userBannerUrl(u), nameColor: userNameColor(u), avatarDeco: userDecoUrl(u), createdAt: u.created_at };
}

export function profile(input) {
  const name = String(input.name || '').trim(), username = String(input.username || '').trim().toLowerCase();
  if (name.length < 2 || name.length > 40) throw Object.assign(Error('Nama harus terdiri dari 2–40 karakter.'), { status: 400 });
  if (!/^[a-z0-9._-]{3,24}$/.test(username)) throw Object.assign(Error('Username harus 3–24 karakter.'), { status: 400 });
  return { name, username };
}

export async function hash(password, salt = randomBytes(16).toString('base64url')) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) throw Object.assign(Error('Password harus terdiri dari 8–128 karakter.'), { status: 400 });
  return { salt, hash: (await scrypt(password, salt, 64)).toString('base64url') };
}

export async function verify(password, u) {
  const candidate = await scrypt(String(password || ''), u.password_salt, 64), stored = Buffer.from(u.password_hash, 'base64url');
  return stored.length === candidate.length && timingSafeEqual(stored, candidate);
}

export function sessionCookie(res, id) {
  res.setHeader('Set-Cookie', `clined_session=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ttl / 1000}${secureCookie ? '; Secure' : ''}`);
}

export function clearCookie(res) {
  res.setHeader('Set-Cookie', `clined_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureCookie ? '; Secure' : ''}`);
}

export async function newSession(res, userId) {
  const id = randomUUID();
  await getPool().query('INSERT INTO sessions (id,user_id,expires_at) VALUES ($1,$2,to_timestamp($3/1000.0))', [id, userId, Date.now() + ttl]);
  sessionCookie(res, id);
}

export async function user(req) {
  const id = cookies(req).clined_session;
  if (!/^[0-9a-f-]{36}$/i.test(id || '')) return null;
  const r = await getPool().query('SELECT u.*,s.id session_id,s.expires_at session_expires_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=$1 AND s.expires_at>now()', [id]);
  return r.rows[0] || null;
}

export async function required(req, res, admin = false) {
  const u = await user(req);
  if (!u) { fail(res, 401, 'Silakan masuk terlebih dahulu.'); return null; }
  if (admin && u.role !== 'admin') { fail(res, 403, 'Akses admin diperlukan.'); return null; }
  return u;
}
