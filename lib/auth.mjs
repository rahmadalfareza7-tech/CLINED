import { randomUUID } from 'node:crypto';
import { getPool, json, fail, limit, origin, body, publicUser, profile, hash, verify, clearCookie, newSession, user, required } from './http.mjs';
import { dropSession, dropUser, push } from './stream.mjs';
import { normalizeResetCode, verifyResetCode, checkResetCodeState } from './reset-code.mjs';
import { maybeUnlock100kBadge, ensure100kBadgeColumn, canUse100kBadge } from './xp-milestone.mjs';

export async function auth(req, res, path) {
  if (req.method !== 'GET') origin(req);
  if ((path === '/register' || path === '/login' || path === '/reset-password') && !limit(req, res, 10)) return;
  if (req.method === 'GET' && path === '/me') {
    const u = await user(req);
    let unlocked100k = null;
    if (u && !u.badge_100k_at) {
      try {
        const res100k = await maybeUnlock100kBadge(getPool(), u.id, null, { pushFn: push });
        if (res100k.unlocked) {
          u.badge_100k_at = res100k.unlockedAt || new Date().toISOString();
          unlocked100k = res100k;
        }
      } catch {}
    }
    return json(res, 200, { user: u ? publicUser(u) : null, ...(unlocked100k ? { unlocked100k } : {}) });
  }
  if (req.method === 'POST' && path === '/register') {
    const input = await body(req), p = profile(input), pw = await hash(input.password), id = randomUUID();
    try { await getPool().query('INSERT INTO users (id,name,username,email,password_hash,password_salt,role,last_login_at) VALUES ($1,$2,$3,NULL,$4,$5,$6,now())', [id, p.name, p.username, pw.hash, pw.salt, 'student']); }
    catch (e) { if (e.code === '23505') return fail(res, 409, 'Username sudah digunakan.'); throw e; }
    await getPool().query('INSERT INTO activity_logs (id,user_id,action,metadata) VALUES ($1,$2,$3,$4::jsonb)', [randomUUID(), id, 'login', JSON.stringify({ username: p.username, role: 'student', via: 'register' })]).catch(() => {});
    await newSession(res, id);
    const u = (await getPool().query('SELECT * FROM users WHERE id=$1', [id])).rows[0];
    return json(res, 201, { user: publicUser(u) });
  }
  if (req.method === 'POST' && path === '/login') {
    const input = await body(req), id = String(input.identifier || '').trim().toLowerCase(), u = (await getPool().query('SELECT * FROM users WHERE username=$1', [id])).rows[0];
    if (!u || !(await verify(input.password, u))) return fail(res, 401, 'Username atau password salah.');
    await getPool().query('UPDATE users SET last_login_at=now() WHERE id=$1', [u.id]);
    if (u.role !== 'admin') await getPool().query('INSERT INTO activity_logs (id,user_id,action,metadata) VALUES ($1,$2,$3,$4::jsonb)', [randomUUID(), u.id, 'login', JSON.stringify({ username: u.username, role: u.role })]);
    await newSession(res, u.id);
    return json(res, 200, { user: publicUser(u) });
  }
  if (req.method === 'POST' && path === '/reset-password') {
    const input = await body(req);
    const username = String(input.username || '').trim().toLowerCase();
    const rawCode = String(input.code || '');
    const newPassword = String(input.newPassword || '');
    if (!username) return fail(res, 400, 'Username wajib diisi.');
    if (!normalizeResetCode(rawCode)) return fail(res, 400, 'Format kode reset tidak valid. Periksa kembali kode dari Admin @clined.id.');
    if (newPassword.length < 8 || newPassword.length > 128) return fail(res, 400, 'Password baru harus terdiri dari 8–128 karakter.');
    const target = (await getPool().query('SELECT id,username,role FROM users WHERE username=$1', [username])).rows[0];
    if (!target) return fail(res, 400, 'Username atau kode reset tidak valid.');
    const rec = (await getPool().query('SELECT * FROM password_reset_codes WHERE user_id=$1', [target.id])).rows[0];
    const state = checkResetCodeState(rec);
    if (!state.ok) {
      if (state.reason === 'expired') return fail(res, 400, 'Kode reset sudah kedaluwarsa. Minta kode baru ke Admin via DM Instagram @clined.id.');
      if (state.reason === 'locked') return fail(res, 429, 'Terlalu banyak percobaan kode salah. Minta kode baru ke Admin via DM Instagram @clined.id.');
      return fail(res, 400, 'Username atau kode reset tidak valid.');
    }
    const matched = await verifyResetCode(rawCode, rec);
    if (!matched) {
      await getPool().query('UPDATE password_reset_codes SET attempts = attempts + 1 WHERE user_id=$1', [target.id]);
      return fail(res, 400, 'Kode reset salah. Periksa kembali kode dari Admin @clined.id.');
    }
    const pw = await hash(newPassword);
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE users SET password_hash=$1,password_salt=$2,updated_at=now() WHERE id=$3', [pw.hash, pw.salt, target.id]);
      await client.query('UPDATE password_reset_codes SET used_at=now() WHERE user_id=$1', [target.id]);
      await client.query('DELETE FROM sessions WHERE user_id=$1', [target.id]);
      await client.query('INSERT INTO activity_logs (id,user_id,action,metadata) VALUES ($1,$2,$3,$4::jsonb)', [
        randomUUID(), target.id, 'password_reset', JSON.stringify({ username: target.username })
      ]);
      await client.query('COMMIT');
    } catch (err) { await client.query('ROLLBACK'); throw err; } finally { client.release(); }
    dropUser(target.id);
    return json(res, 200, { ok: true, message: 'Password berhasil direset! Silakan masuk dengan password baru kamu.' });
  }
  if (req.method === 'POST' && path === '/logout') {
    const u = await user(req);
    if (u) {
      await getPool().query('DELETE FROM sessions WHERE id=$1', [u.session_id]);
      dropSession(u.session_id);
      if (u.role !== 'admin') await getPool().query('INSERT INTO activity_logs (id,user_id,action,metadata) VALUES ($1,$2,$3,$4::jsonb)', [randomUUID(), u.id, 'logout', JSON.stringify({ username: u.username, role: u.role })]);
    }
    clearCookie(res);
    return json(res, 200, { ok: true });
  }
  const u = await required(req, res); if (!u) return;
  const avatarMatch = path.match(/^\/avatar\/([0-9a-f-]{36})$/i);
  if (req.method === 'GET' && avatarMatch) {
    const r = await getPool().query('SELECT avatar_url FROM users WHERE id=$1', [avatarMatch[1]]);
    const raw = r.rows[0]?.avatar_url || '';
    const m = /^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/=]+)$/i.exec(raw);
    if (!m) return fail(res, 404, 'Foto profil tidak ditemukan.');
    res.writeHead(200, { 'Content-Type': m[1], 'Cache-Control': 'private, max-age=86400', 'X-Content-Type-Options': 'nosniff' });
    return res.end(Buffer.from(m[2], 'base64'));
  }
  if (req.method === 'POST' && path === '/avatar') {
    const input = await body(req, 240_000);
    const dataUrl = String(input.dataUrl || '').trim();
    const m = /^data:image\/(?:jpeg|jpg|png|webp);base64,([a-z0-9+/=]+)$/i.exec(dataUrl);
    if (!m) return fail(res, 400, 'Format foto profil tidak valid. Gunakan JPG, PNG, atau WebP.');
    const buf = Buffer.from(m[1], 'base64');
    if (!buf.length || buf.length > 150_000) return fail(res, 413, 'Ukuran foto profil maksimal 150 KB setelah dikompresi.');
    const mime = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff ? 'image/jpeg'
      : buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 ? 'image/png'
      : buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP' ? 'image/webp'
      : '';
    if (!mime) return fail(res, 415, 'Hanya file JPG, PNG, atau WebP yang diizinkan.');
    const normalized = `data:${mime};base64,${buf.toString('base64')}`;
    const r = await getPool().query('UPDATE users SET avatar_url=$1,updated_at=now() WHERE id=$2 RETURNING *', [normalized, u.id]);
    return json(res, 200, { user: publicUser(r.rows[0]) });
  }
  if (req.method === 'DELETE' && path === '/avatar') {
    const r = await getPool().query('UPDATE users SET avatar_url=NULL,updated_at=now() WHERE id=$1 RETURNING *', [u.id]);
    return json(res, 200, { user: publicUser(r.rows[0]) });
  }
  const bannerMatch = path.match(/^\/banner\/([0-9a-f-]{36})$/i);
  if (req.method === 'GET' && bannerMatch) {
    const r = await getPool().query('SELECT chat_banner_url FROM users WHERE id=$1', [bannerMatch[1]]);
    const raw = r.rows[0]?.chat_banner_url || '';
    const m = /^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/=]+)$/i.exec(raw);
    if (!m) return fail(res, 404, 'Background profil tidak ditemukan.');
    res.writeHead(200, { 'Content-Type': m[1], 'Cache-Control': 'private, max-age=86400', 'X-Content-Type-Options': 'nosniff' });
    return res.end(Buffer.from(m[2], 'base64'));
  }
  if (req.method === 'POST' && path === '/banner') {
    return fail(res, 403, 'Upload background chat manual sudah dinonaktifkan. Pilih banner di Card Shop.');
  }
  if (req.method === 'DELETE' && path === '/banner') {
    const r = await getPool().query('UPDATE users SET chat_banner_url=NULL,updated_at=now() WHERE id=$1 RETURNING *', [u.id]);
    return json(res, 200, { user: publicUser(r.rows[0]) });
  }
  if (req.method === 'POST' && path === '/name-color') {
    const input = await body(req, 1000);
    const raw = String(input.color || '').trim().toLowerCase();
    const allowed = new Set(['', 'amber', 'sakura', 'cyber', 'crimson', 'emerald', 'violet', 'sunset', 'ice', 'hologram', 'gold']);
    if (!allowed.has(raw)) return fail(res, 400, 'Variasi warna nama tidak valid.');
    const r = await getPool().query('UPDATE users SET chat_name_color=$1,updated_at=now() WHERE id=$2 RETURNING *', [raw || null, u.id]);
    return json(res, 200, { user: publicUser(r.rows[0]) });
  }
  if (req.method === 'POST' && path === '/badge-100k') {
    const input = await body(req, 1000);
    await ensure100kBadgeColumn(getPool());
    let cur = (await getPool().query('SELECT id, role, badge_100k_at FROM users WHERE id=$1', [u.id])).rows[0];
    if (cur && !canUse100kBadge(cur)) {
      const m = await maybeUnlock100kBadge(getPool(), u.id, null, { pushFn: push }).catch(() => null);
      if (m?.unlocked) cur = { ...cur, badge_100k_at: m.unlockedAt || new Date().toISOString() };
    }
    if (!cur || !canUse100kBadge(cur)) {
      return fail(res, 403, 'Badge 100K Legend hanya tersedia setelah mencapai 100.000 All-Time XP atau untuk Admin.');
    }
    const enabled = Boolean(input.enabled);
    const r = await getPool().query('UPDATE users SET badge_100k_visible=$1,updated_at=now() WHERE id=$2 RETURNING *', [enabled, u.id]);
    return json(res, 200, { user: publicUser(r.rows[0]) });
  }
  if (req.method === 'POST' && path === '/leaderboard-visibility') {
    if (u.role !== 'admin') return fail(res, 403, 'Pengaturan tampilan leaderboard khusus Admin.');
    const input = await body(req, 1000);
    await ensure100kBadgeColumn(getPool());
    const enabled = Boolean(input.enabled);
    const r = await getPool().query('UPDATE users SET show_in_leaderboard=$1,updated_at=now() WHERE id=$2 RETURNING *', [enabled, u.id]);
    return json(res, 200, { ok: true, showInLeaderboard: enabled, user: publicUser(r.rows[0]) });
  }
  if (req.method === 'PATCH' && path === '/profile') {
    const p = profile(await body(req));
    try { const r = await getPool().query('UPDATE users SET name=$1,username=$2,updated_at=now() WHERE id=$3 RETURNING *', [p.name, p.username, u.id]); return json(res, 200, { user: publicUser(r.rows[0]) }); }
    catch (e) { if (e.code === '23505') return fail(res, 409, 'Username sudah digunakan.'); throw e; }
  }
  if (req.method === 'POST' && path === '/password') {
    if (!limit(req, res, 10)) return;
    const x = await body(req);
    if (!(await verify(x.currentPassword, u))) return fail(res, 401, 'Password saat ini salah.');
    const pw = await hash(x.newPassword);
    await getPool().query('UPDATE users SET password_hash=$1,password_salt=$2,updated_at=now() WHERE id=$3', [pw.hash, pw.salt, u.id]);
    await getPool().query('DELETE FROM sessions WHERE user_id=$1', [u.id]);
    dropUser(u.id);
    await newSession(res, u.id);
    return json(res, 200, { ok: true });
  }
  if (req.method === 'DELETE' && path === '/account') {
    if (!limit(req, res, 10)) return;
    const x = await body(req);
    if (!(await verify(x.currentPassword, u))) return fail(res, 401, 'Password saat ini salah.');
    await getPool().query('DELETE FROM users WHERE id=$1', [u.id]);
    dropUser(u.id);
    clearCookie(res);
    return json(res, 200, { ok: true });
  }
  return fail(res, 404, 'Endpoint tidak ditemukan.');
}

export async function ensureAdmin() {
  try {
    const username = String(process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,24}$/.test(username)) { console.warn('ADMIN_USERNAME tidak valid (3-24 karakter: huruf kecil/angka/._-). Pembuatan admin otomatis dilewati.'); return; }
    const password = String(process.env.ADMIN_PASSWORD || '');
    // Password yang hanya tampil di log Vercel tidak dapat dipakai sebagai alur pemulihan akun.
    if (password.length < 12) { console.warn('ADMIN_PASSWORD belum diatur atau kurang dari 12 karakter. Bootstrap admin dilewati.'); return; }
    const name = String(process.env.ADMIN_NAME || 'Administrator CLINED').trim().slice(0, 40) || 'Administrator CLINED';
    const resetPassword = process.env.ADMIN_RESET_PASSWORD === 'true';
    const existing = await getPool().query('SELECT id,role FROM users WHERE username=$1', [username]);
    // Keep a password changed from the Account page. A reset must be an explicit
    // deployment action, not an incidental serverless cold start.
    if (existing.rowCount && existing.rows[0].role === 'admin' && !resetPassword) return;
    const pw = await hash(password), id = randomUUID();
    await getPool().query(`INSERT INTO users (id,name,username,email,password_hash,password_salt,role) VALUES ($1,$2,$3,NULL,$4,$5,'admin')
      ON CONFLICT (username) DO UPDATE SET name=EXCLUDED.name,role='admin',password_hash=EXCLUDED.password_hash,password_salt=EXCLUDED.password_salt,updated_at=now()`, [id, name, username, pw.hash, pw.salt]);
    console.log(`${existing.rowCount ? 'Reset' : 'Bootstrap'} admin selesai untuk username: ${username}`);
  } catch (e) { console.error('Gagal menyiapkan akun admin otomatis:', e.message); }
}
