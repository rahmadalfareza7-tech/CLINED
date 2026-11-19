import { randomUUID } from 'node:crypto';
import { getPool, json, fail, limit, origin, body, publicUser, profile, hash, verify, clearCookie, newSession, user, required } from './http.mjs';

export async function auth(req, res, path) {
  if (req.method !== 'GET') origin(req);
  if ((path === '/register' || path === '/login') && !limit(req, res, 10)) return;
  if (req.method === 'GET' && path === '/me') { const u = await user(req); return json(res, 200, { user: u ? publicUser(u) : null }); }
  if (req.method === 'POST' && path === '/register') {
    const input = await body(req), p = profile(input), pw = await hash(input.password), id = randomUUID();
    try { await getPool().query('INSERT INTO users (id,name,username,email,password_hash,password_salt,role) VALUES ($1,$2,$3,NULL,$4,$5,$6)', [id, p.name, p.username, pw.hash, pw.salt, 'student']); }
    catch (e) { if (e.code === '23505') return fail(res, 409, 'Username sudah digunakan.'); throw e; }
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
  if (req.method === 'POST' && path === '/logout') {
    const u = await user(req);
    if (u) {
      await getPool().query('DELETE FROM sessions WHERE id=$1', [u.session_id]);
      if (u.role !== 'admin') await getPool().query('INSERT INTO activity_logs (id,user_id,action,metadata) VALUES ($1,$2,$3,$4::jsonb)', [randomUUID(), u.id, 'logout', JSON.stringify({ username: u.username, role: u.role })]);
    }
    clearCookie(res);
    return json(res, 200, { ok: true });
  }
  const u = await required(req, res); if (!u) return;
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
    await newSession(res, u.id);
    return json(res, 200, { ok: true });
  }
  if (req.method === 'DELETE' && path === '/account') {
    if (!limit(req, res, 10)) return;
    const x = await body(req);
    if (!(await verify(x.currentPassword, u))) return fail(res, 401, 'Password saat ini salah.');
    await getPool().query('DELETE FROM users WHERE id=$1', [u.id]);
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
