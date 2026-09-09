import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { contentApi } from '../content-api.mjs';

// Node 20 belum tentu punya global WebSocket bawaan; kasih tau eksplisit
// supaya driver Neon (WebSocket-based) jalan konsisten di Vercel maupun lokal.
neonConfig.webSocketConstructor = ws;

// @neondatabase/serverless: driver Postgres via WebSocket, dibuat khusus untuk
// runtime serverless (Vercel Functions) di mana proses baru bisa muncul tiap
// request/cold-start — TCP pool biasa (paket `pg`) gampang bikin "connection
// storm" ke database. Cuma cocok kalau database-nya Neon (bukan Postgres generik).
// db/*.mjs (migrate/seed/create-admin) tetap pakai `pg` biasa — itu script sekali-jalan, aman.

const scrypt = promisify(scryptCallback);
const production = process.env.NODE_ENV === 'production';
const secureCookie = process.env.AUTH_COOKIE_SECURE === 'true' || (production && process.env.AUTH_COOKIE_SECURE !== 'false');
const allowedOrigins = String(process.env.FRONTEND_ORIGIN || '').split(',').map(s=>s.trim()).filter(Boolean);
const maxPhotoBytes = Number(process.env.MAX_PHOTO_BYTES || 2 * 1024 * 1024);
const ttl = 7 * 24 * 60 * 60 * 1000;
const buckets = new Map(); // best-effort per warm serverless instance
let pool = null;
function getPool() {
  if (pool) return pool;
  const databaseUrl = String(process.env.DATABASE_URL || '').trim();
  if (!databaseUrl) throw Object.assign(Error('DATABASE_URL belum diatur di Vercel Environment Variables.'), {status:503});
  if (production && !secureCookie) throw Object.assign(Error('AUTH_COOKIE_SECURE harus true di production.'), {status:500});
  pool = new Pool({ connectionString: databaseUrl, max: Number(process.env.DATABASE_POOL_SIZE || 5) });
  return pool;
}

function cors(req,res){
  const o=req.headers.origin;
  if(!allowedOrigins.length||!o)return;
  if(allowedOrigins.includes(o)){res.setHeader('Access-Control-Allow-Origin',o);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Credentials','true');res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,DELETE,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');}
}
function headers(res) { res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('X-Frame-Options','DENY'); res.setHeader('Referrer-Policy','strict-origin-when-cross-origin'); res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()'); res.setHeader('Cross-Origin-Opener-Policy','same-origin'); res.setHeader('Content-Security-Policy',"default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'"); }
function json(res,status,data) { res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}); res.end(JSON.stringify(data)); }
function fail(res,status,error) { json(res,status,{error}); }
function cookies(req) { return Object.fromEntries((req.headers.cookie || '').split(';').map(x=>x.trim().split(/=(.*)/s)).filter(([k])=>k).map(([k,v])=>[k,decodeURIComponent(v||'')])); }
function limit(req,res,max=30) { const key=`${req.socket?.remoteAddress||req.headers['x-forwarded-for']||'x'}:${new URL(req.url,'http://x').pathname}`, now=Date.now(), old=buckets.get(key); const b=!old||old.until<now?{count:0,until:now+60_000}:old; b.count++;buckets.set(key,b); if(b.count<=max)return true;res.setHeader('Retry-After',Math.ceil((b.until-now)/1000));fail(res,429,'Terlalu banyak permintaan.');return false; }
function origin(req) { if (!req.headers.origin) return; const expected=`${req.headers['x-forwarded-proto']||'https'}://${req.headers.host}`;if(req.headers.origin!==expected)throw Object.assign(Error('Origin permintaan tidak diizinkan.'),{status:403}); }
async function body(req,max=200_000) { let raw='',size=0;for await(const c of req){size+=c.length;if(size>max)throw Object.assign(Error('Permintaan terlalu besar.'),{status:413});raw+=c;}try{return raw?JSON.parse(raw):{};}catch{throw Object.assign(Error('Data permintaan tidak valid.'),{status:400});} }
function publicUser(u){return{id:u.id,name:u.name,username:u.username,role:u.role,createdAt:u.created_at};}
function profile(input) { const name=String(input.name||'').trim(),username=String(input.username||'').trim().toLowerCase();if(name.length<2||name.length>40)throw Object.assign(Error('Nama harus terdiri dari 2–40 karakter.'),{status:400});if(!/^[a-z0-9._-]{3,24}$/.test(username))throw Object.assign(Error('Username harus 3–24 karakter.'),{status:400});return{name,username}; }
async function hash(password,salt=randomBytes(16).toString('base64url')) {if(typeof password!=='string'||password.length<8||password.length>128)throw Object.assign(Error('Password harus terdiri dari 8–128 karakter.'),{status:400});return{salt,hash:(await scrypt(password,salt,64)).toString('base64url')};}
async function verify(password,user){const candidate=await scrypt(String(password||''),user.password_salt,64), stored=Buffer.from(user.password_hash,'base64url');return stored.length===candidate.length&&timingSafeEqual(stored,candidate);}
function sessionCookie(res,id){res.setHeader('Set-Cookie',`clined_session=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ttl/1000}${secureCookie?'; Secure':''}`);}
function clearCookie(res){res.setHeader('Set-Cookie',`clined_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureCookie?'; Secure':''}`);}
async function newSession(res,userId){const id=randomUUID();await getPool().query('INSERT INTO sessions (id,user_id,expires_at) VALUES ($1,$2,to_timestamp($3/1000.0))',[id,userId,Date.now()+ttl]);sessionCookie(res,id);}
async function user(req){const id=cookies(req).clined_session;if(!/^[0-9a-f-]{36}$/i.test(id||''))return null;const r=await getPool().query('SELECT u.*,s.id session_id FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=$1 AND s.expires_at>now()',[id]);return r.rows[0]||null;}
async function required(req,res,admin=false){const u=await user(req);if(!u){fail(res,401,'Silakan masuk terlebih dahulu.');return null;}if(admin&&u.role!=='admin'){fail(res,403,'Akses admin diperlukan.');return null;}return u;}

async function auth(req,res,path){if(req.method!=='GET')origin(req);if((path==='/register'||path==='/login')&&!limit(req,res,10))return;if(req.method==='GET'&&path==='/me'){const u=await user(req);return json(res,200,{user:u?publicUser(u):null});}
 if(req.method==='POST'&&path==='/register'){const input=await body(req),p=profile(input),pw=await hash(input.password),id=randomUUID();try{await getPool().query('INSERT INTO users (id,name,username,email,password_hash,password_salt,role) VALUES ($1,$2,$3,NULL,$4,$5,$6)',[id,p.name,p.username,pw.hash,pw.salt,'student']);}catch(e){if(e.code==='23505')return fail(res,409,'Username sudah digunakan.');throw e;}await newSession(res,id);const u=(await getPool().query('SELECT * FROM users WHERE id=$1',[id])).rows[0];return json(res,201,{user:publicUser(u)});}
 if(req.method==='POST'&&path==='/login'){const input=await body(req),id=String(input.identifier||'').trim().toLowerCase(),u=(await getPool().query('SELECT * FROM users WHERE username=$1',[id])).rows[0];if(!u||!(await verify(input.password,u)))return fail(res,401,'Username atau password salah.');await getPool().query('UPDATE users SET last_login_at=now() WHERE id=$1',[u.id]);await newSession(res,u.id);return json(res,200,{user:publicUser(u)});}
 if(req.method==='POST'&&path==='/logout'){const u=await user(req);if(u)await getPool().query('DELETE FROM sessions WHERE id=$1',[u.session_id]);clearCookie(res);return json(res,200,{ok:true});}
 const u=await required(req,res);if(!u)return;
 if(req.method==='PATCH'&&path==='/profile'){const p=profile(await body(req));try{const r=await getPool().query('UPDATE users SET name=$1,username=$2,updated_at=now() WHERE id=$3 RETURNING *',[p.name,p.username,u.id]);return json(res,200,{user:publicUser(r.rows[0])});}catch(e){if(e.code==='23505')return fail(res,409,'Username sudah digunakan.');throw e;}}
 if(req.method==='POST'&&path==='/password'){const x=await body(req);if(!(await verify(x.currentPassword,u)))return fail(res,401,'Password saat ini salah.');const pw=await hash(x.newPassword);await getPool().query('UPDATE users SET password_hash=$1,password_salt=$2,updated_at=now() WHERE id=$3',[pw.hash,pw.salt,u.id]);await getPool().query('DELETE FROM sessions WHERE user_id=$1',[u.id]);await newSession(res,u.id);return json(res,200,{ok:true});}
 if(req.method==='DELETE'&&path==='/account'){const x=await body(req);if(!(await verify(x.currentPassword,u)))return fail(res,401,'Password saat ini salah.');await getPool().query('DELETE FROM users WHERE id=$1',[u.id]);clearCookie(res);return json(res,200,{ok:true});}return fail(res,404,'Endpoint tidak ditemukan.');}

const validKey=k=>/^(gaster_|clined_|medicalRpg|medical_rpg|current_block|last_worked|dashboard_block|alpha5_)/.test(k)&&!/auth|password|session|token/i.test(k);
async function sync(req,res){const u=await required(req,res);if(!u)return;if(req.method==='GET'){const r=await getPool().query('SELECT state,updated_at FROM learning_states WHERE user_id=$1',[u.id]);return json(res,200,{state:r.rows[0]?.state||{},updatedAt:r.rows[0]?.updated_at||null});}if(req.method!=='POST')return fail(res,405,'Method tidak diizinkan.');origin(req);if(!limit(req,res,60))return;const ops=(await body(req)).operations;if(!Array.isArray(ops))return fail(res,400,'operations harus berupa array.');const client=await getPool().connect();try{await client.query('BEGIN');const saved=await client.query('SELECT state FROM learning_states WHERE user_id=$1 FOR UPDATE',[u.id]);const state=saved.rows[0]?.state||{};for(const op of ops.slice(0,100)){if(!op||!/^[0-9a-f-]{36}$/i.test(op.id||'')||!validKey(String(op.key||''))||!['set','delete'].includes(op.type))continue;const inserted=await client.query('INSERT INTO sync_operations (user_id,idempotency_key) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING idempotency_key',[u.id,op.id]);if(!inserted.rowCount)continue;const incoming=Date.parse(op.updatedAt)||0,previous=Date.parse(state[op.key]?.updatedAt)||0;if(incoming<previous)continue;if(op.type==='delete')state[op.key]={deleted:true,updatedAt:op.updatedAt};else if(typeof op.value==='string'&&Buffer.byteLength(op.value)<=100000)state[op.key]={value:op.value,updatedAt:op.updatedAt};}await client.query('INSERT INTO learning_states (user_id,state,updated_at) VALUES ($1,$2::jsonb,now()) ON CONFLICT (user_id) DO UPDATE SET state=EXCLUDED.state,updated_at=now()',[u.id,JSON.stringify(state)]);await client.query('COMMIT');return json(res,200,{state});}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}

const PNG_SIG = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
function sniffImage(buf){
  if(buf.length>=8&&buf.subarray(0,8).equals(PNG_SIG))return 'image/png';
  if(buf.length>=3&&buf[0]===0xff&&buf[1]===0xd8&&buf[2]===0xff)return 'image/jpeg';
  return null;
}
async function photos(req,res,path){
  const u=await required(req,res);if(!u)return;
  if(req.method==='POST'&&path===''){
    if(!limit(req,res,20))return; origin(req);
    const input=await body(req,Math.ceil(maxPhotoBytes*1.4)+2000);
    const dataUrl=String(input.dataUrl||'');
    const m=/^data:([-\w./+]+);base64,([a-z0-9+/=]+)$/i.exec(dataUrl);
    if(!m)return fail(res,400,'Format data foto tidak valid.');
    const buf=Buffer.from(m[2],'base64');
    if(buf.length>maxPhotoBytes)return fail(res,413,`Ukuran foto maksimal ${(maxPhotoBytes/1024/1024).toFixed(1)}MB. Kompres dulu di perangkat kamu.`);
    const type=sniffImage(buf);
    if(!type)return fail(res,415,'Hanya file PNG atau JPG/JPEG yang diizinkan.');
    const id=randomUUID();
    await getPool().query('INSERT INTO user_photos (id,owner_user_id,mime_type,byte_size,data) VALUES ($1,$2,$3,$4,$5)',[id,u.id,type,buf.length,buf]);
    return json(res,201,{id,mimeType:type,byteSize:buf.length});
  }
  const match=path.match(/^\/([0-9a-f-]{36})$/i);
  if(match&&req.method==='GET'){
    const r=await getPool().query('SELECT mime_type,data FROM user_photos WHERE id=$1 AND owner_user_id=$2',[match[1],u.id]);
    if(!r.rowCount)return fail(res,404,'Foto tidak ditemukan.');
    res.writeHead(200,{'Content-Type':r.rows[0].mime_type,'Cache-Control':'private, max-age=86400'});
    return res.end(r.rows[0].data);
  }
  if(match&&req.method==='DELETE'){
    await getPool().query('DELETE FROM user_photos WHERE id=$1 AND owner_user_id=$2',[match[1],u.id]);
    return json(res,200,{ok:true});
  }
  return fail(res,404,'Endpoint foto tidak ditemukan.');
}

async function ensureDatabase(){
  const db= getPool();
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
  // Seed the bundled banks only when missing. Admin updates remain authoritative afterwards.
  const bankCount = Number((await db.query('SELECT COUNT(*)::int AS count FROM question_banks')).rows[0]?.count || 0);
  if (bankCount === 0) {
    const manifestUrl = new URL('../banks/manifest.json', import.meta.url);
    const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));
    for (const bank of manifest.banks || []) {
      const fileUrl = new URL(`../banks/${String(bank.dataUrl).replace('./banks/', '')}`, import.meta.url);
      const questions = JSON.parse(await readFile(fileUrl, 'utf8'));
      await db.query(`INSERT INTO question_banks (id,name,block,version,schema_version,published,questions)
        VALUES ($1,$2,$3,$4,$5,true,$6::jsonb) ON CONFLICT (id) DO NOTHING`,
        [bank.id, bank.name, bank.block, bank.version, bank.schema, JSON.stringify(questions)]);
    }
  }
}

async function ensureAdmin(){
  try{
    const username=String(process.env.ADMIN_USERNAME||'admin').trim().toLowerCase();
    if(!/^[a-z0-9._-]{3,24}$/.test(username)){console.warn('ADMIN_USERNAME tidak valid (3-24 karakter: huruf kecil/angka/._-). Pembuatan admin otomatis dilewati.');return;}
    const password=String(process.env.ADMIN_PASSWORD||'');
    // Password yang hanya tampil di log Vercel tidak dapat dipakai sebagai alur pemulihan akun.
    if(password.length<12){console.warn('ADMIN_PASSWORD belum diatur atau kurang dari 12 karakter. Bootstrap admin dilewati.');return;}
    const name=String(process.env.ADMIN_NAME||'Administrator CLINED').trim().slice(0,40)||'Administrator CLINED';
    const resetPassword=process.env.ADMIN_RESET_PASSWORD==='true';
    const existing=await getPool().query('SELECT id,role FROM users WHERE username=$1',[username]);
    // Keep a password changed from the Account page. A reset must be an explicit
    // deployment action, not an incidental serverless cold start.
    if(existing.rowCount && existing.rows[0].role==='admin' && !resetPassword)return;
    const pw=await hash(password),id=randomUUID();
    await getPool().query(`INSERT INTO users (id,name,username,email,password_hash,password_salt,role) VALUES ($1,$2,$3,NULL,$4,$5,'admin')
      ON CONFLICT (username) DO UPDATE SET name=EXCLUDED.name,role='admin',password_hash=EXCLUDED.password_hash,password_salt=EXCLUDED.password_salt,updated_at=now()`,[id,name,username,pw.hash,pw.salt]);
    console.log(`${existing.rowCount?'Reset':'Bootstrap'} admin selesai untuk username: ${username}`);
  }catch(e){console.error('Gagal menyiapkan akun admin otomatis:',e.message);}
}
// Lazy, bukan top-level await: di serverless, kerjaan berat saat import memperlambat SEMUA cold start.
// Promise di-cache di module scope -> tetap cuma jalan sekali per instance warm.
let adminReady=null;
function initializeDatabase(){
  if(!adminReady) adminReady=ensureDatabase().then(ensureAdmin).catch(error=>{
    // A transient Neon/network failure must not poison this warm function forever.
    adminReady=null;
    throw error;
  });
  return adminReady;
}

async function adminBanks(req,res,path,u){
  if (!u || u.role !== 'admin') return fail(res,403,'Akses admin diperlukan.');
  if (req.method === 'GET' && path === '') {
    const r = await getPool().query('SELECT id,name,block,version,schema_version,published,questions,updated_at FROM question_banks ORDER BY id');
    return json(res,200,{banks:r.rows});
  }
  const match = path.match(/^\/([^/]+)$/);
  if (!match) return fail(res,404,'Bank admin tidak ditemukan.');
  const id = match[1];
  if (req.method === 'PATCH') {
    origin(req);
    const input = await body(req, 2_000_000);
    const questions = Array.isArray(input.questions) ? input.questions : null;
    if (!questions || !questions.length || questions.length > 50000) return fail(res,400,'Daftar soal tidak valid.');
    const seen = new Set();
    for (let i=0;i<questions.length;i++) {
      const q=questions[i];
      if (!q || typeof q!=='object' || !String(q.id||'').trim() || !String(q.soal||'').trim() || !Array.isArray(q.opsi) || q.opsi.length<2 || !Number.isInteger(q.jawabanBenar) || q.jawabanBenar<0 || q.jawabanBenar>=q.opsi.length) return fail(res,400,`Format soal #${i+1} tidak valid.`);
      const qid=String(q.id).trim(); if(seen.has(qid)) return fail(res,400,`ID soal duplikat: ${qid}`); seen.add(qid);
    }
    const existing=await getPool().query('SELECT id,name,block,version,schema_version FROM question_banks WHERE id=$1',[id]);
    if(!existing.rowCount) return fail(res,404,'Bank soal tidak ditemukan.');
    const version=Math.max(Number(existing.rows[0].version||1)+1, Number(input.version||0));
    const r=await getPool().query(`UPDATE question_banks SET questions=$1::jsonb,version=$2,published=$3,updated_at=now() WHERE id=$4 RETURNING id,name,block,version,schema_version,published,updated_at`,[JSON.stringify(questions),version,input.published!==false,id]);
    return json(res,200,{bank:r.rows[0],message:'Bank soal global diperbarui. Pengguna akan menerima versi terbaru saat memuat ulang.'});
  }
  return fail(res,405,'Method tidak diizinkan.');
}

async function api(req,res,path){if(path==='/health'&&req.method==='GET'){await getPool().query('SELECT 1');return json(res,200,{ok:true});}if(path==='/banks'&&req.method==='GET'){const r=await getPool().query('SELECT id,name,block,version,schema_version FROM question_banks WHERE published=true ORDER BY id');return json(res,200,{banks:r.rows});}const match=path.match(/^\/banks\/([a-z0-9_-]+)$/i);if(match&&req.method==='GET'){const r=await getPool().query('SELECT id,name,block,version,schema_version,questions FROM question_banks WHERE id=$1 AND published=true',[match[1]]);return r.rowCount?json(res,200,{bank:r.rows[0]}):fail(res,404,'Bank soal tidak ditemukan.');}return fail(res,404,'Endpoint tidak ditemukan.');}

/** Handler API murni (tanpa static file) — dipakai server.mjs (self-host/Render) & api/[...path].mjs (Vercel). */
export async function handleRequest(req,res){
  headers(res);cors(req,res);
  if(req.method==='OPTIONS')return res.writeHead(204).end();
  if(req.method==='GET' && new URL(req.url,`https://${req.headers.host||'localhost'}`).pathname==='/api/health'){
    try{
      // Health menjalankan jalur inisialisasi yang sama dengan login.
      await initializeDatabase();
      const r=await getPool().query("SELECT to_regclass('public.users') AS users_table, to_regclass('public.learning_states') AS learning_states_table");
      const ready=Boolean(r.rows[0]?.users_table && r.rows[0]?.learning_states_table);
      const adminConfigured=String(process.env.ADMIN_PASSWORD||'').length>=12;
      return json(res,ready?200:503,{ok:ready,database:true,schema:ready?'ready':'missing_tables',admin:{configured:adminConfigured,username:adminConfigured?String(process.env.ADMIN_USERNAME||'admin').trim().toLowerCase():null,resetPending:process.env.ADMIN_RESET_PASSWORD==='true'}});
    }catch(error){
      console.error('Health check gagal:',error?.message||error);
      return json(res,503,{ok:false,database:false,error:error?.message||'Database tidak dapat diakses.'});
    }
  }
  try{
    await initializeDatabase();
    const url=new URL(req.url,`https://${req.headers.host||'localhost'}`),path=url.pathname;
    if(path.startsWith('/api/auth/'))return await auth(req,res,path.slice(9));
    if(path==='/api/sync')return await sync(req,res);
    if(path.startsWith('/api/photos'))return await photos(req,res,path.slice(11));
    if(path.startsWith('/api/content/'))return await contentApi({request:req,response:res,url,user:await user(req),pool:getPool(),body,json,fail,origin});
    if(path.startsWith('/api/admin/banks'))return await adminBanks(req,res,path.slice('/api/admin/banks'.length),await user(req));
    if(path==='/api/health')return await api(req,res,path.slice(4));
    if(path.startsWith('/api/')){if(!await user(req))return fail(res,401,'Silakan masuk terlebih dahulu.');return await api(req,res,path.slice(4));}
    return fail(res,404,'Bukan endpoint API. File statis dilayani otomatis oleh Vercel/CDN.');
  }catch(e){console.error(e);fail(res,e.status||500,e.status?e.message:'Terjadi gangguan pada server.');}
}
