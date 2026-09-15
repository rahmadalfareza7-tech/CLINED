import { randomUUID, randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
import pg from 'pg';

const scrypt = promisify(scryptCallback), { Pool } = pg;
const username = String(process.env.ADMIN_USERNAME || '').trim().toLowerCase();
const password = String(process.env.ADMIN_PASSWORD || '');
const name = String(process.env.ADMIN_NAME || 'Administrator CLINED').trim();
if (!process.env.DATABASE_URL || !/^[a-z0-9._-]{3,24}$/.test(username) || password.length < 12) throw new Error('Atur DATABASE_URL, ADMIN_USERNAME, dan ADMIN_PASSWORD (minimal 12 karakter).');
const salt = randomBytes(16).toString('base64url'); const passwordHash = (await scrypt(password, salt, 64)).toString('base64url');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined });
try {
  await pool.query(`INSERT INTO users (id,name,username,email,password_hash,password_salt,role) VALUES ($1,$2,$3,NULL,$4,$5,'admin')
    ON CONFLICT (username) DO UPDATE SET name=EXCLUDED.name,password_hash=EXCLUDED.password_hash,password_salt=EXCLUDED.password_salt,role='admin',updated_at=now()`, [randomUUID(), name.slice(0, 40), username, passwordHash, salt]);
  console.log(`Admin ${username} siap digunakan.`);
} finally { await pool.end(); }
