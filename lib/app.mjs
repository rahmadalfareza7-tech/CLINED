import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import pg from 'pg';
const { Pool } = pg;
import { contentApi } from '../content-api.mjs';
import { sanitizeItems, analyzeRow } from './item-analysis.mjs';
import { createSocial } from './social.mjs';
import { onlineStats } from './stream.mjs';
import { createChat } from './chat.mjs';
import { createQComments } from './qcomments.mjs';
import { createXp } from './xp.mjs';
import { cleanStyle } from './announce-logic.mjs';
import { createUsage } from './usage.mjs';
import { cleanTerm, parseCsv, MAX_IMPORT } from './glossary-logic.mjs';
import { cleanDataset, cleanItemKey, cleanPatch, canEditResep } from './resep-logic.mjs';

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
function headers(res) { res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('X-Frame-Options','DENY'); res.setHeader('Referrer-Policy','strict-origin-when-cross-origin'); res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()'); res.setHeader('Cross-Origin-Opener-Policy','same-origin');
  // Semua <script> inline sudah dipindah ke file eksternal (js/inline-boot.js), jadi script-src tidak lagi butuh 'unsafe-inline'.
  // style-src tetap 'unsafe-inline' karena banyak komponen memakai inline style="" yang belum dipisah semua; itu risiko lebih kecil dari script-src.
  res.setHeader('Content-Security-Policy',"default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'");
  if (secureCookie) res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');
}
function json(res,status,data) { res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}); res.end(JSON.stringify(data)); }
function fail(res,status,error) { json(res,status,{error}); }
function cookies(req) { return Object.fromEntries((req.headers.cookie || '').split(';').map(x=>x.trim().split(/=(.*)/s)).filter(([k])=>k).map(([k,v])=>[k,decodeURIComponent(v||'')])); }
let lastBucketSweep=0;
function sweepBuckets(now){ if(now-lastBucketSweep<60_000)return; lastBucketSweep=now; for(const [key,b] of buckets){ if(b.until<now) buckets.delete(key); } }
function limit(req,res,max=30) { const now=Date.now(); sweepBuckets(now); const key=`${req.socket?.remoteAddress||req.headers['x-forwarded-for']||'x'}:${new URL(req.url,'http://x').pathname}`, old=buckets.get(key); const b=!old||old.until<now?{count:0,until:now+60_000}:old; b.count++;buckets.set(key,b); if(b.count<=max)return true;res.setHeader('Retry-After',Math.ceil((b.until-now)/1000));fail(res,429,'Terlalu banyak permintaan.');return false; }
function origin(req) { const o=req.headers.origin; if(!o)return; if(!allowedOrigins.includes(o))throw Object.assign(Error('Origin permintaan tidak diizinkan.'),{status:403}); }
async function body(req,max=200_000) { let raw='',size=0;for await(const c of req){size+=c.length;if(size>max)throw Object.assign(Error('Permintaan terlalu besar.'),{status:413});raw+=c;}try{return raw?JSON.parse(raw):{};}catch{throw Object.assign(Error('Data permintaan tidak valid.'),{status:400});} }
function publicUser(u){return{id:u.id,name:u.name,username:u.username,role:u.role,isMentor:!!u.is_mentor,createdAt:u.created_at};}
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
 if(req.method==='POST'&&path==='/login'){const input=await body(req),id=String(input.identifier||'').trim().toLowerCase(),u=(await getPool().query('SELECT * FROM users WHERE username=$1',[id])).rows[0];if(!u||!(await verify(input.password,u)))return fail(res,401,'Username atau password salah.');await getPool().query('UPDATE users SET last_login_at=now() WHERE id=$1',[u.id]);if(u.role!=='admin')await getPool().query('INSERT INTO activity_logs (id,user_id,action,metadata) VALUES ($1,$2,$3,$4::jsonb)',[randomUUID(),u.id,'login',JSON.stringify({username:u.username,role:u.role})]);await newSession(res,u.id);return json(res,200,{user:publicUser(u)});}
 if(req.method==='POST'&&path==='/logout'){const u=await user(req);if(u){if(u.role!=='admin')await getPool().query('INSERT INTO activity_logs (id,user_id,action,metadata) VALUES ($1,$2,$3,$4::jsonb)',[randomUUID(),u.id,'logout',JSON.stringify({username:u.username,role:u.role})]);await getPool().query('DELETE FROM sessions WHERE id=$1',[u.session_id]);}clearCookie(res);return json(res,200,{ok:true});}
 const u=await required(req,res);if(!u)return;
 if(req.method==='PATCH'&&path==='/profile'){const p=profile(await body(req));try{const r=await getPool().query('UPDATE users SET name=$1,username=$2,updated_at=now() WHERE id=$3 RETURNING *',[p.name,p.username,u.id]);return json(res,200,{user:publicUser(r.rows[0])});}catch(e){if(e.code==='23505')return fail(res,409,'Username sudah digunakan.');throw e;}}
 if(req.method==='POST'&&path==='/password'){if(!limit(req,res,10))return;const x=await body(req);if(!(await verify(x.currentPassword,u)))return fail(res,401,'Password saat ini salah.');const pw=await hash(x.newPassword);await getPool().query('UPDATE users SET password_hash=$1,password_salt=$2,updated_at=now() WHERE id=$3',[pw.hash,pw.salt,u.id]);await getPool().query('DELETE FROM sessions WHERE user_id=$1',[u.id]);await newSession(res,u.id);return json(res,200,{ok:true});}
 if(req.method==='DELETE'&&path==='/account'){if(!limit(req,res,10))return;const x=await body(req);if(!(await verify(x.currentPassword,u)))return fail(res,401,'Password saat ini salah.');await getPool().query('DELETE FROM users WHERE id=$1',[u.id]);clearCookie(res);return json(res,200,{ok:true});}return fail(res,404,'Endpoint tidak ditemukan.');}

const validKey=k=>/^(gaster_|clined_|medicalRpg|medical_rpg|current_block|last_worked|dashboard_block|alpha5_)/.test(k)&&!/auth|password|session|token|sync_queue|last_activity/i.test(k);
const SYNC_MAX_KEYS=200;
const isoOrNull=value=>{const t=Date.parse(String(value||''));return Number.isFinite(t)?new Date(t).toISOString():null;};
function syncEntry(key,row){return row?.deleted?{deleted:true,updatedAt:row.client_updated_at||row.updated_at}:{value:row?.value??'',updatedAt:row?.client_updated_at||row?.updated_at};}
async function sync(req,res){
  const u=await required(req,res); if(!u)return;
  if(req.method==='GET'){
    const sinceRaw=req.url?.includes('?')?new URL(req.url,'http://localhost').searchParams.get('since'):null;
    const since=sinceRaw&&Number.isFinite(Date.parse(sinceRaw))?new Date(sinceRaw).toISOString():null;
    if(!since){
      const r=await getPool().query('SELECT state,updated_at FROM learning_states WHERE user_id=$1',[u.id]);
      const state=r.rows[0]?.state||{};
      return json(res,200,{mode:'full',state,updatedAt:r.rows[0]?.updated_at||new Date().toISOString()});
    }
    const r=await getPool().query(`SELECT key,value,deleted,client_updated_at,updated_at
      FROM learning_state_entries WHERE user_id=$1 AND updated_at>$2::timestamptz
      ORDER BY updated_at ASC LIMIT $3`,[u.id,since,SYNC_MAX_KEYS]);
    const changes={};
    let cursor=since;
    for(const row of r.rows){changes[row.key]=syncEntry(row,row);cursor=row.updated_at>cursor?row.updated_at:cursor;}
    return json(res,200,{mode:'delta',changes,updatedAt:cursor,hasMore:r.rows.length===SYNC_MAX_KEYS});
  }
  if(req.method!=='POST')return fail(res,405,'Method tidak diizinkan.');
  origin(req); if(!limit(req,res,60))return;
  const ops=(await body(req)).operations;
  if(!Array.isArray(ops))return fail(res,400,'operations harus berupa array.');
  const client=await getPool().connect();
  try{
    await client.query('BEGIN');
    const saved=await client.query('SELECT state FROM learning_states WHERE user_id=$1 FOR UPDATE',[u.id]);
    const state=saved.rows[0]?.state||{};
    const accepted={};
    for(const op of ops.slice(0,SYNC_MAX_KEYS)){
      const key=String(op?.key||'');
      if(!op||!/^[0-9a-f-]{36}$/i.test(op.id||'')||!validKey(key)||!['set','delete'].includes(op.type))continue;
      if(op.type==='set'&&(typeof op.value!=='string'||Buffer.byteLength(op.value)>100000))continue;
      const incoming=Date.parse(op.updatedAt)||0;
      const previous=Date.parse(state[key]?.updatedAt)||0;
      // XP hanya boleh naik: jam perangkat yang tertinggal tidak boleh membuat XP baru ditolak selamanya.
      if(key==='gaster_v11_xp'&&op.type==='set'){const n=v=>{try{return Number(JSON.parse(v||'0'))||0;}catch{return Number(v)||0;}};if(n(op.value)<n(state[key]?.value))continue;}
      else if(incoming<previous)continue;
      const inserted=await client.query('INSERT INTO sync_operations (user_id,idempotency_key) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING idempotency_key',[u.id,op.id]);
      if(!inserted.rowCount)continue;
      const clientUpdated=isoOrNull(op.updatedAt)||new Date().toISOString();
      if(op.type==='delete'){
        state[key]={deleted:true,updatedAt:clientUpdated};
        await client.query(`INSERT INTO learning_state_entries(user_id,key,value,deleted,client_updated_at,updated_at) VALUES($1,$2,NULL,true,$3,clock_timestamp())
          ON CONFLICT(user_id,key) DO UPDATE SET value=NULL,deleted=true,client_updated_at=EXCLUDED.client_updated_at,updated_at=clock_timestamp()`,[u.id,key,clientUpdated]);
      }else{
        state[key]={value:op.value,updatedAt:clientUpdated};
        await client.query(`INSERT INTO learning_state_entries(user_id,key,value,deleted,client_updated_at,updated_at) VALUES($1,$2,$3,false,$4,clock_timestamp())
          ON CONFLICT(user_id,key) DO UPDATE SET value=EXCLUDED.value,deleted=false,client_updated_at=EXCLUDED.client_updated_at,updated_at=clock_timestamp()`,[u.id,key,op.value,clientUpdated]);
      }
      accepted[key]=state[key];
    }
    await client.query(`INSERT INTO learning_states(user_id,state,updated_at) VALUES($1,$2::jsonb,clock_timestamp())
      ON CONFLICT(user_id) DO UPDATE SET state=EXCLUDED.state,updated_at=clock_timestamp()`,[u.id,JSON.stringify(state)]);
    // Keep the weekly leaderboard snapshot in sync whenever the canonical XP key changes.
    // XP is stored as a JSON-encoded localStorage value, so parse it defensively.
    const xpEntry=state['gaster_v11_xp'];
    if(xpEntry && !xpEntry.deleted){
      let xpValue=0;
      try{xpValue=Number(JSON.parse(xpEntry.value||'0'))||0;}catch{xpValue=Number(xpEntry.value)||0;}
      const now=new Date();
      const weekStart=new Date(now);
      weekStart.setDate(now.getDate()-now.getDay()+1);
      weekStart.setHours(0,0,0,0);
      const weekKey=weekStart.toISOString().slice(0,10);
      await client.query(`INSERT INTO xp_snapshots (id,user_id,week_key,xp_total)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (user_id,week_key) DO UPDATE
        SET xp_total=GREATEST(EXCLUDED.xp_total,xp_snapshots.xp_total),updated_at=now()`,
        [randomUUID(),u.id,weekKey,xpValue]);
    }
    const cursor=await client.query('SELECT COALESCE(MAX(updated_at),clock_timestamp()) AS updated_at FROM learning_state_entries WHERE user_id=$1',[u.id]);
    await client.query('COMMIT');
    return json(res,200,{mode:'delta',changes:accepted,updatedAt:cursor.rows[0].updated_at});
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}

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
  // Ensure every bundled bank exists in Neon, but NEVER overwrite an existing
  // bank because admin-edited content is authoritative. This is important for
  // deployments whose database was created before newer blocks (e.g. KEDKEL)
  // were added to the bundled manifest.
  const manifestUrl = new URL('../seed-data/manifest.json', import.meta.url);
  const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));
  for (const bank of manifest.banks || []) {
    const fileUrl = new URL(`../seed-data/${String(bank.dataUrl).replace('./seed-data/', '')}`, import.meta.url);
    const questions = JSON.parse(await readFile(fileUrl, 'utf8'));
    // Seed only when the bank is missing or has an empty question array.
    // Existing non-empty admin content remains authoritative.
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
  const editable = /^\/[^/]+\/questions\/[^/]+$/.test(path) && (req.method === 'PATCH' || req.method === 'GET');
  if (!u || (u.role !== 'admin' && !(editable && u.role === 'helper'))) return fail(res,403,'Akses admin diperlukan.');
  if (req.method === 'GET' && path === '') {
    const r = await getPool().query('SELECT id,name,block,version,schema_version,published,questions,updated_at FROM question_banks ORDER BY id');
    return json(res,200,{banks:r.rows});
  }
  const one = path.match(/^\/([^/]+)\/questions\/([^/]+)$/);
  if (one && req.method === 'PATCH') {
    origin(req);
    const bankId = decodeURIComponent(one[1]), qid = decodeURIComponent(one[2]);
    const input = await body(req, 60_000);
    const cur = await getPool().query('SELECT questions,version FROM question_banks WHERE id=$1',[bankId]);
    if (!cur.rowCount) return fail(res,404,'Bank soal tidak ditemukan.');
    const list = Array.isArray(cur.rows[0].questions) ? cur.rows[0].questions : [];
    const idx = list.findIndex(x => String(x?.id) === qid);
    if (idx < 0) return fail(res,404,'Soal tidak ditemukan di bank ini.');
    const soal = String(input.soal ?? '').trim();
    const opsi = Array.isArray(input.opsi) ? input.opsi.map(x => String(x ?? '').trim()) : [];
    const key = Number(input.jawabanBenar);
    if (!soal || opsi.length < 2 || opsi.length > 6 || opsi.some(x => !x)) return fail(res,400,'Soal dan semua opsi harus diisi.');
    if (!Number.isInteger(key) || key < 0 || key >= opsi.length) return fail(res,400,'Kunci jawaban tidak valid.');
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
    await getPool().query('UPDATE question_banks SET questions=$1::jsonb,version=$2,updated_at=now() WHERE id=$3',[JSON.stringify(list),version,bankId]);
    invalidatePublicBankCache(bankId);
    return json(res,200,{ok:true,version,question:next});
  }
  if (one && req.method === 'GET') {
    const bankId = decodeURIComponent(one[1]), qid = decodeURIComponent(one[2]);
    const cur = await getPool().query('SELECT questions FROM question_banks WHERE id=$1',[bankId]);
    const q = (cur.rows[0]?.questions || []).find(x => String(x?.id) === qid);
    return q ? json(res,200,{question:q}) : fail(res,404,'Soal tidak ditemukan.');
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
    invalidatePublicBankCache(id);
    return json(res,200,{bank:r.rows[0],message:'Bank soal global diperbarui. Pengguna akan menerima versi terbaru saat memuat ulang.'});
  }
  return fail(res,405,'Method tidak diizinkan.');
}

async function adminLogins(req,res,u){
  if (!u || u.role !== 'admin') return fail(res,403,'Akses admin diperlukan.');
  if (req.method !== 'GET') return fail(res,405,'Method tidak diizinkan.');
  // "Hari ini" dihitung pakai jam lokal WIB (Asia/Jakarta), bukan UTC, dan query
  // otomatis "reset" tiap hari karena batas tanggal dihitung ulang tiap request
  // -- tidak ada state tersimpan yang perlu dibersihkan.
  const r = await getPool().query(`
    SELECT id,name,username,role,last_login_at
    FROM users
    WHERE last_login_at >= (date_trunc('day', now() AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'Asia/Jakarta')
      AND role <> 'admin'
    ORDER BY last_login_at DESC`);
  return json(res,200,{date:new Date().toISOString().slice(0,10),count:r.rowCount,logins:r.rows.map(row=>({id:row.id,name:row.name,username:row.username,role:row.role,lastLoginAt:row.last_login_at}))});
}



async function ensureBlockMaterialsTable(){
  await getPool().query(`CREATE TABLE IF NOT EXISTS block_materials (
    block VARCHAR(80) PRIMARY KEY,
    url TEXT NOT NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
}

async function adminMaterials(req,res,u){
  if(!u || u.role!=='admin') return fail(res,403,'Akses admin diperlukan.');
  await ensureBlockMaterialsTable();
  const pathname=new URL(req.url,`https://${req.headers.host||'localhost'}`).pathname;
  if(req.method==='GET' && pathname==='/api/admin/materials'){
    const r=await getPool().query('SELECT block,url,updated_at FROM block_materials ORDER BY block');
    return json(res,200,{materials:r.rows.map(x=>({block:x.block,url:x.url,updatedAt:x.updated_at}))});
  }
  const match=pathname.match(/^\/api\/admin\/materials\/([^/]+)$/);
  if(!match) return fail(res,404,'Endpoint materi tidak ditemukan.');
  const block=decodeURIComponent(match[1]).trim().slice(0,80);
  if(req.method==='DELETE'){
    await getPool().query('DELETE FROM block_materials WHERE block=$1',[block]);
    return json(res,200,{ok:true,message:`Link materi ${block} dihapus.`});
  }
  if(req.method!=='PUT') return fail(res,405,'Method tidak diizinkan.');
  origin(req);
  const input=await body(req), urlValue=String(input.url||'').trim();
  if(!/^https?:\/\//i.test(urlValue) || urlValue.length>2000) return fail(res,400,'Link materi harus berupa URL http/https yang valid.');
  const r=await getPool().query(`INSERT INTO block_materials (block,url,updated_by,updated_at) VALUES ($1,$2,$3,now()) ON CONFLICT (block) DO UPDATE SET url=EXCLUDED.url,updated_by=EXCLUDED.updated_by,updated_at=now() RETURNING block,url,updated_at`,[block,urlValue,u.id]);
  return json(res,200,{material:{block:r.rows[0].block,url:r.rows[0].url,updatedAt:r.rows[0].updated_at},message:`Link materi ${block} berhasil disimpan.`});
}


async function ensureResepOverridesTable(){
  await getPool().query(`CREATE TABLE IF NOT EXISTS resep_overrides (
    dataset VARCHAR(20) NOT NULL,
    item_key VARCHAR(200) NOT NULL,
    data JSONB NOT NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (dataset, item_key)
  )`);
}
async function publicResepOverrides(req,res){
  if(req.method!=='GET') return fail(res,405,'Method tidak diizinkan.');
  await ensureResepOverridesTable();
  const r=await getPool().query('SELECT dataset,item_key,data FROM resep_overrides ORDER BY dataset,item_key');
  return json(res,200,{overrides:r.rows.map(x=>({dataset:x.dataset,key:x.item_key,data:x.data}))});
}
async function adminResepOverrides(req,res,u,sub){
  if(!u) return fail(res,401,'Silakan masuk terlebih dahulu.');
  if(!canEditResep(u)) return fail(res,403,'Akses admin atau helper diperlukan.');
  await ensureResepOverridesTable();
  const m=String(sub||'').match(/^\/([a-z]+)\/([^/]+)$/);
  if(!m) return fail(res,404,'Endpoint tidak ditemukan.');
  const dataset=cleanDataset(m[1]),key=cleanItemKey(decodeURIComponent(m[2]));
  if(!dataset||!key) return fail(res,400,'Dataset atau item tidak valid.');
  if(req.method==='DELETE'){
    origin(req);
    await getPool().query('DELETE FROM resep_overrides WHERE dataset=$1 AND item_key=$2',[dataset,key]);
    return json(res,200,{ok:true,message:'Dikembalikan ke versi bawaan.'});
  }
  if(req.method!=='PUT') return fail(res,405,'Method tidak diizinkan.');
  origin(req);
  const input=await body(req,120_000),patch=cleanPatch(dataset,input?.data);
  if(!patch) return fail(res,400,'Data perubahan tidak valid atau terlalu besar.');
  await getPool().query(`INSERT INTO resep_overrides (dataset,item_key,data,updated_by,updated_at) VALUES ($1,$2,$3::jsonb,$4,now())
    ON CONFLICT (dataset,item_key) DO UPDATE SET data=EXCLUDED.data,updated_by=EXCLUDED.updated_by,updated_at=now()`,[dataset,key,JSON.stringify(patch),u.id]);
  return json(res,200,{ok:true,message:'Perubahan disimpan untuk semua pengguna.',data:patch});
}

async function publicMaterials(req,res){
  await ensureBlockMaterialsTable();
  if(req.method!=='GET') return fail(res,405,'Method tidak diizinkan.');
  const r=await getPool().query('SELECT block,url FROM block_materials ORDER BY block');
  return json(res,200,{materials:r.rows});
}

async function ensureBlockYoutubeTable(){
  await getPool().query(`CREATE TABLE IF NOT EXISTS block_youtube_links (
    block VARCHAR(80) PRIMARY KEY, url TEXT NOT NULL, updated_by UUID REFERENCES users(id) ON DELETE SET NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
}
async function adminYoutube(req,res,u){
  if(!u || u.role!=='admin') return fail(res,403,'Akses admin diperlukan.');
  await ensureBlockYoutubeTable();
  const pathname=new URL(req.url,`https://${req.headers.host||'localhost'}`).pathname;
  if(req.method==='GET' && pathname==='/api/admin/youtube'){const r=await getPool().query('SELECT block,url,updated_at FROM block_youtube_links ORDER BY block');return json(res,200,{links:r.rows.map(x=>({block:x.block,url:x.url,updatedAt:x.updated_at}))});}
  const match=pathname.match(/^\/api\/admin\/youtube\/([^/]+)$/); if(!match)return fail(res,404,'Endpoint YouTube tidak ditemukan.');
  const block=decodeURIComponent(match[1]).trim().slice(0,80);
  if(req.method==='DELETE'){await getPool().query('DELETE FROM block_youtube_links WHERE block=$1',[block]);return json(res,200,{ok:true,message:`Link Ninja Nerd ${block} dihapus.`});}
  if(req.method!=='PUT')return fail(res,405,'Method tidak diizinkan.');
  origin(req); const input=await body(req),urlValue=String(input.url||'').trim();
  if(!/^https?:\/\//i.test(urlValue)||urlValue.length>2000)return fail(res,400,'Link YouTube harus berupa URL http/https yang valid.');
  const r=await getPool().query(`INSERT INTO block_youtube_links (block,url,updated_by,updated_at) VALUES ($1,$2,$3,now()) ON CONFLICT (block) DO UPDATE SET url=EXCLUDED.url,updated_by=EXCLUDED.updated_by,updated_at=now() RETURNING block,url,updated_at`,[block,urlValue,u.id]);
  return json(res,200,{link:{block:r.rows[0].block,url:r.rows[0].url,updatedAt:r.rows[0].updated_at},message:`Link Ninja Nerd ${block} berhasil disimpan.`});
}
async function publicYoutube(req,res){await ensureBlockYoutubeTable();if(req.method!=='GET')return fail(res,405,'Method tidak diizinkan.');const r=await getPool().query('SELECT block,url FROM block_youtube_links ORDER BY block');return json(res,200,{links:r.rows});}

async function ensureActivityTables(){
  const db=getPool();
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

async function adminActivity(req,res,u){
  if(!u || u.role!=='admin') return fail(res,403,'Akses admin diperlukan.');
  await ensureActivityTables();
  if(req.method==='GET'){
    const countResult=await getPool().query('SELECT COUNT(*)::int AS count FROM users');
    const userCount=countResult.rows[0]?.count||0;
    const r=await getPool().query(`
      SELECT a.id,a.action,a.metadata,a.created_at,u.id AS user_id,u.name,u.username,u.role
      FROM activity_logs a
      LEFT JOIN users u ON u.id=a.user_id
      WHERE NOT (a.action IN ('login','logout') AND u.role='admin')
      ORDER BY a.created_at DESC
      LIMIT 200`);
    return json(res,200,{userCount,activities:r.rows.map(x=>({
      id:x.id, action:x.action, metadata:x.metadata||{}, createdAt:x.created_at,
      user:x.user_id?{id:x.user_id,name:x.name,username:x.username,role:x.role}:null
    }))});
  }
  if(req.method==='DELETE'){
    const input=await body(req);
    const id=String(input.id||'').trim();
    if(id){
      if(!/^[0-9a-f-]{36}$/i.test(id)) return fail(res,400,'ID aktivitas tidak valid.');
      const r=await getPool().query(`DELETE FROM activity_logs WHERE id=$1 AND action IN ('login','logout') RETURNING id`,[id]);
      if(!r.rowCount) return fail(res,404,'Aktivitas login/logout tidak ditemukan.');
      return json(res,200,{ok:true,message:'Aktivitas login/logout dihapus.'});
    }
    // Reset aktivitas = bersihkan seluruh riwayat login/logout, tetapi pertahankan audit perubahan role.
    const r=await getPool().query(`DELETE FROM activity_logs WHERE action IN ('login','logout')`);
    return json(res,200,{ok:true,deleted:r.rowCount,message:`Aktivitas login/logout berhasil direset (${r.rowCount} aktivitas).`});
  }
  return fail(res,405,'Method tidak diizinkan.');
}

async function adminUsers(req,res,u){
  if(!u || u.role!=='admin') return fail(res,403,'Akses admin diperlukan.');
  await ensureActivityTables();
  const pathname=new URL(req.url,`https://${req.headers.host||'localhost'}`).pathname;
  if(req.method==='GET' && pathname==='/api/admin/users'){
    const r=await getPool().query('SELECT id,name,username,role,is_mentor,created_at,last_login_at FROM users ORDER BY CASE WHEN role=\'admin\' THEN 0 ELSE 1 END,name');
    return json(res,200,{users:r.rows.map(row=>({...publicUser(row),lastLoginAt:row.last_login_at}))});
  }
  const deleteMatch=pathname.match(/^\/api\/admin\/users\/([0-9a-f-]{36})$/i);
  if(deleteMatch){
    if(req.method!=='DELETE') return fail(res,405,'Method tidak diizinkan.');
    const targetId=deleteMatch[1];
    if(targetId===u.id) return fail(res,400,'Akun admin yang sedang digunakan tidak dapat dihapus.');
    const target=(await getPool().query('SELECT id,name,username,role FROM users WHERE id=$1',[targetId])).rows[0];
    if(!target) return fail(res,404,'Pengguna tidak ditemukan.');
    const client=await getPool().connect();
    try{
      await client.query('BEGIN');
      // Konten publik hanya boleh berasal dari admin. Jika ada data lama yang dibuat sebelum aturan ini, jangan berikan kembali hak kepemilikan kepada user lain.
      await client.query('UPDATE content_packages SET created_by=NULL WHERE created_by=$1',[targetId]);
      await client.query('DELETE FROM users WHERE id=$1',[targetId]);
      await client.query('COMMIT');
      return json(res,200,{ok:true,message:`Pengguna @${target.username} berhasil dihapus.`});
    }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  }
  const match=pathname.match(/^\/api\/admin\/users\/([0-9a-f-]{36})\/role$/i);
  if(!match) return fail(res,404,'Pengguna tidak ditemukan.');
  if(req.method!=='PATCH') return fail(res,405,'Method tidak diizinkan.');
  const targetId=match[1];
  const input=await body(req);
  const hasRole=input.role!==undefined, hasMentor=input.mentor!==undefined;
  if(!hasRole && !hasMentor) return fail(res,400,'Tidak ada perubahan.');
  const role=hasRole?String(input.role||'').trim().toLowerCase():null;
  if(hasRole && !['student','admin','helper'].includes(role)) return fail(res,400,'Role tidak valid.');
  if(hasRole && targetId===u.id && role!=='admin') return fail(res,400,'Kamu tidak dapat menurunkan role akun admin yang sedang dipakai.');
  const target=(await getPool().query('SELECT id,name,username,role,is_mentor FROM users WHERE id=$1',[targetId])).rows[0];
  if(!target) return fail(res,404,'Pengguna tidak ditemukan.');
  const nextRole=hasRole?role:target.role, nextMentor=hasMentor?!!input.mentor:!!target.is_mentor;
  if(nextRole===target.role && nextMentor===!!target.is_mentor) return json(res,200,{user:publicUser(target),message:`Tidak ada perubahan untuk @${target.username}.`});
  const client=await getPool().connect();
  try{
    await client.query('BEGIN');
    const r=await client.query('UPDATE users SET role=$1,is_mentor=$2,updated_at=now() WHERE id=$3 RETURNING id,name,username,role,is_mentor,created_at,last_login_at',[nextRole,nextMentor,targetId]);
    if(!r.rowCount){await client.query('ROLLBACK');return fail(res,404,'Pengguna tidak ditemukan.');}
    await client.query('INSERT INTO activity_logs (id,user_id,action,metadata) VALUES ($1,$2,$3,$4::jsonb)',[
      randomUUID(),u.id,'role_changed',JSON.stringify({targetUserId:target.id,targetUsername:target.username,from:target.role,to:nextRole,mentorFrom:!!target.is_mentor,mentorTo:nextMentor})
    ]);
    await client.query('COMMIT');
    return json(res,200,{user:publicUser(r.rows[0]),message:`@${target.username}: role ${nextRole}${nextMentor?' + tempat bertanya':''}.`});
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}


async function api(req,res,path){if(path==='/health'&&req.method==='GET'){await getPool().query('SELECT 1');return json(res,200,{ok:true});}
  if(path==='/banks'&&req.method==='GET'){
    const r=await getPool().query('SELECT id,name,block,version,schema_version,jsonb_array_length(questions) AS count,updated_at FROM question_banks WHERE published=true ORDER BY id');
    res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=60, stale-while-revalidate=300'});
    return res.end(JSON.stringify({banks:r.rows}));
  }
  const match=path.match(/^\/banks\/([a-z0-9_-]+)$/i);
  if(match&&req.method==='GET'){
    const id=match[1], now=Date.now(), cached=publicBankCache.get(id);
    if(cached && cached.expiresAt>now){
      if(req.headers['if-none-match']===cached.etag){res.writeHead(304,{'ETag':cached.etag,'Cache-Control':'public, max-age=3600, stale-while-revalidate=86400'});return res.end();}
      res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=3600, stale-while-revalidate=86400','ETag':cached.etag});
      return res.end(cached.body);
    }
    const r=await getPool().query('SELECT id,name,block,version,schema_version,questions,updated_at FROM question_banks WHERE id=$1 AND published=true',[id]);
    if(!r.rowCount)return fail(res,404,'Bank soal tidak ditemukan.');
    const b=r.rows[0], etag=`"${b.id}-v${b.version}"`, body=JSON.stringify({bank:b});
    publicBankCache.set(id,{etag,body,expiresAt:now+PUBLIC_BANK_CACHE_MS});
    if(req.headers['if-none-match']===etag){res.writeHead(304,{'ETag':etag,'Cache-Control':'public, max-age=3600, stale-while-revalidate=86400'});return res.end();}
    res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=3600, stale-while-revalidate=86400','ETag':etag});return res.end(body);
  }
  return fail(res,404,'Endpoint tidak ditemukan.');
}

// Warm-instance cache untuk bank soal publik. Ini tidak mengubah source of truth (Neon),
// tetapi mencegah request berulang mengambil JSON soal besar dari Neon pada instance Vercel yang sama.
const publicBankCache = new Map();
const PUBLIC_BANK_CACHE_MS = 5 * 60 * 1000;
function invalidatePublicBankCache(id){ publicBankCache.delete(String(id||'')); }

const xpMod = createXp({ getPool, json, fail, body, origin, limit });
const social = createSocial({ getPool, json, fail, body, origin, limit, awardXp: xpMod.award });
const chat = createChat({ getPool, json, fail, body, origin, limit });
const qcomments = createQComments({ getPool, json, fail, body, origin, limit });
const usage = createUsage({ getPool, json, fail, body, origin, limit });

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
    if(path==='/api/banks'||path.startsWith('/api/banks/'))return await api(req,res,path.slice(4));if(path==='/api/materials')return await publicMaterials(req,res);if(path==='/api/youtube')return await publicYoutube(req,res);if(path==='/api/admin/materials'||path.startsWith('/api/admin/materials/'))return await adminMaterials(req,res,await user(req));if(path==='/api/admin/youtube'||path.startsWith('/api/admin/youtube/'))return await adminYoutube(req,res,await user(req));if(path.startsWith('/api/content/'))return await contentApi({request:req,response:res,url,user:await user(req),pool:getPool(),body,json,fail,origin});
    if(path.startsWith('/api/admin/banks'))return await adminBanks(req,res,path.slice('/api/admin/banks'.length),await user(req));
    if(path==='/api/admin/logins')return await adminLogins(req,res,await user(req));if(path==='/api/admin/activity')return await adminActivity(req,res,await user(req));if(path==='/api/admin/users'||path.startsWith('/api/admin/users/'))return await adminUsers(req,res,await user(req));
    if(path==='/api/resep-overrides')return await publicResepOverrides(req,res);
    if(path.startsWith('/api/admin/resep-overrides'))return await adminResepOverrides(req,res,await user(req),path.slice('/api/admin/resep-overrides'.length));
    if(path==='/api/announcements')return await publicAnnouncements(req,res);
    if(path==='/api/admin/online-stats'){
      if(req.method!=='GET')return fail(res,405,'Method tidak diizinkan.');
      const u=await user(req);
      if(!u)return fail(res,401,'Silakan masuk terlebih dahulu.');
      if(u.role!=='admin')return fail(res,403,'Akses admin diperlukan.');
      const s=onlineStats();
      return json(res,200,{ok:true,...s,capacityPercent:Number((s.connections/s.maxConnections*100).toFixed(2))});
    }
    if(path==='/api/leaderboard')return await xpMod.leaderboard(req,res,await user(req));
    if(path==='/api/xp')return await xpMod.xp(req,res,await user(req));
    if(path==='/api/status'||path.startsWith('/api/status/'))return await social.status(req,res,await user(req),path.slice('/api/status'.length));
    if(path==='/api/glossary'||path.startsWith('/api/glossary/'))return await glossary(req,res,await user(req),path.slice('/api/glossary'.length));
    if(path==='/api/usage')return await usage.record(req,res,await user(req));
    if(path==='/api/admin/usage')return await usage.admin(req,res,await user(req));
    if(path==='/api/qcomments'||path==='/api/qcomments/vote')return await qcomments.handle(req,res,await user(req));
    if(path==='/api/chat'||path.startsWith('/api/chat/'))return await chat.chat(req,res,await user(req),path.slice('/api/chat'.length));
    if(path==='/api/stream')return social.stream(req,res,await user(req));
    if(path==='/api/friends'||path.startsWith('/api/friends/'))return await social.friends(req,res,await user(req),path.slice('/api/friends'.length));
    if(path==='/api/duels'||path.startsWith('/api/duels/'))return await social.duels(req,res,await user(req),path.slice('/api/duels'.length));
    if(path==='/api/question-reports')return await questionReports(req,res,await user(req));
    if(path==='/api/admin/question-reports'||path.startsWith('/api/admin/question-reports/'))return await adminQuestionReports(req,res,await user(req),path.slice('/api/admin/question-reports'.length));
    if(path==='/api/item-stats/public')return await itemStatsPublic(req,res,await user(req));
    if(path==='/api/item-stats')return await itemStats(req,res,await user(req));
    if(path==='/api/admin/item-stats')return await adminItemStats(req,res,await user(req));
    if(path==='/api/notes'||path.startsWith('/api/notes'))return await questionNotes(req,res);
    if(path==='/api/admin/announcements'||path.startsWith('/api/admin/announcements/'))return await adminAnnouncements(req,res,await user(req));
    if(path==='/api/health')return await api(req,res,path.slice(4));
    if(path.startsWith('/api/')){if(!await user(req))return fail(res,401,'Silakan masuk terlebih dahulu.');return await api(req,res,path.slice(4));}
    return fail(res,404,'Bukan endpoint API. File statis dilayani otomatis oleh Vercel/CDN.');
  }catch(e){console.error(e);fail(res,e.status||500,e.status?e.message:'Terjadi gangguan pada server.');}
}

// ── LAPORAN SOAL ───────────────────────────────────────────────────────────
const REPORT_CATS = ['key', 'typo', 'ambiguous', 'explanation', 'other'];
const REPORT_STATUS = ['new', 'checked', 'fixed', 'dismissed'];
const clip = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

async function questionReports(req, res, u) {
  if (req.method !== 'POST') return fail(res, 405, 'Method tidak diizinkan.');
  if (!u) return fail(res, 401, 'Silakan masuk terlebih dahulu.');
  origin(req);
  if (!limit(req, res, 20)) return;
  const input = await body(req, 20_000);
  const qid = clip(input.questionId, 200);
  if (!qid) return fail(res, 400, 'ID soal tidak valid.');
  const category = REPORT_CATS.includes(input.category) ? input.category : 'other';
  const source = input.source === 'mat' ? 'mat' : 'bank';
  const note = String(input.note ?? '').trim().slice(0, 600);
  const db = getPool();
  const r = await db.query(
    `INSERT INTO question_reports (question_id, source, bank, snippet, category, note, reporter_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (question_id, reporter_id) WHERE status IN ('new','checked') AND reporter_id IS NOT NULL
     DO UPDATE SET category = EXCLUDED.category, note = EXCLUDED.note, updated_at = now()
     RETURNING id`,
    [qid, source, clip(input.bank, 80), clip(input.snippet, 220), category, note, u.id]);
  return json(res, 200, { ok: true, id: r.rows[0].id });
}

async function adminQuestionReports(req, res, u, sub) {
  if (!u || (u.role !== 'admin' && u.role !== 'helper')) return fail(res, 403, 'Akses admin atau helper diperlukan.');
  const db = getPool();
  const url = new URL(req.url, 'https://x');
  if (req.method === 'GET' && (sub === '' || sub === '/')) {
    const status = url.searchParams.get('status');
    const where = REPORT_STATUS.includes(status) ? 'WHERE r.status = $1' : "WHERE r.status IN ('new','checked')";
    const rows = await db.query(
      `SELECT r.question_id, r.source, MAX(r.bank) AS bank, MAX(r.snippet) AS snippet,
              COUNT(*)::int AS reports, COUNT(DISTINCT r.reporter_id)::int AS reporters,
              MAX(r.created_at) AS last_at,
              (ARRAY_AGG(r.status ORDER BY r.created_at DESC))[1] AS status,
              JSONB_OBJECT_AGG(r.category, 1) AS cats,
              ARRAY_REMOVE(ARRAY_AGG(NULLIF(r.note,'') ORDER BY r.created_at DESC), NULL) AS notes
       FROM question_reports r ${where}
       GROUP BY r.question_id, r.source
       ORDER BY COUNT(*) DESC, MAX(r.created_at) DESC LIMIT 200`,
      REPORT_STATUS.includes(status) ? [status] : []);
    const counts = await db.query('SELECT status, COUNT(*)::int AS n FROM question_reports GROUP BY status');
    return json(res, 200, {
      counts: Object.fromEntries(counts.rows.map(x => [x.status, x.n])),
      items: rows.rows.map(x => ({ ...x, notes: (x.notes || []).slice(0, 5) }))
    });
  }
  const qm = sub.match(/^\/([^/]+)\/question$/);
  if (qm && req.method === 'GET') {
    const id = decodeURIComponent(qm[1]);
    const r = await db.query('SELECT id, name, questions FROM question_banks WHERE questions @> $1::jsonb LIMIT 1', [JSON.stringify([{ id }])]);
    if (!r.rowCount) return fail(res, 404, 'Soal ini tidak ada di bank server (mungkin dari Latihan Materi atau bank bawaan). Edit lewat tab Latihan Materi atau berkas bank.');
    const q = (r.rows[0].questions || []).find(x => String(x?.id) === id);
    return json(res, 200, { bankId: r.rows[0].id, bankName: r.rows[0].name, question: q });
  }
  const m = sub.match(/^\/([^/]+)$/);
  if (!m) return fail(res, 404, 'Endpoint tidak ditemukan.');
  const qid = decodeURIComponent(m[1]);
  if (req.method === 'PATCH') {
    origin(req);
    const input = await body(req, 5_000);
    const status = String(input.status || '');
    if (!REPORT_STATUS.includes(status)) return fail(res, 400, 'Status tidak valid.');
    const r = await db.query(
      `UPDATE question_reports SET status = $1, admin_note = CASE WHEN $2 <> '' THEN $2 ELSE admin_note END, updated_at = now()
       WHERE question_id = $3 AND status IN ('new','checked')`,
      [status, clip(input.adminNote, 400), qid]);
    return json(res, 200, { ok: true, updated: r.rowCount });
  }
  if (req.method === 'DELETE') {
    if (u.role !== 'admin') return fail(res, 403, 'Hanya admin yang dapat menghapus laporan.');
    origin(req);
    await db.query('DELETE FROM question_reports WHERE question_id = $1', [qid]);
    return json(res, 200, { ok: true });
  }
  return fail(res, 405, 'Method tidak diizinkan.');
}

// ── GLOSARIUM ──────────────────────────────────────────────────────────────
async function glossary(req, res, u, sub) {
  if (!u) return fail(res, 401, 'Silakan masuk terlebih dahulu.');
  const db = getPool();
  if (req.method === 'GET' && (sub === '' || sub === '/')) {
    const r = await db.query('SELECT id, term, aliases, definition, source, verified, updated_at FROM glossary_terms ORDER BY lower(term)');
    res.setHeader('Cache-Control', 'private, max-age=300');
    return json(res, 200, { terms: r.rows.map(x => ({ id: String(x.id), term: x.term, aliases: x.aliases || [], definition: x.definition, source: x.source, verified: x.verified })),
      updatedAt: r.rows.reduce((m, x) => Math.max(m, new Date(x.updated_at).getTime()), 0) });
  }
  if (u.role !== 'admin') return fail(res, 403, 'Hanya admin yang dapat mengelola glosarium.');
  if (req.method !== 'POST') return fail(res, 405, 'Method tidak diizinkan.');
  origin(req); if (!limit(req, res, 60)) return;
  const upsert = async v => db.query(
    `INSERT INTO glossary_terms (term_key, term, aliases, definition, source, verified, updated_by)
     VALUES ($1,$2,$3::text[],$4,$5,$6,$7)
     ON CONFLICT (term_key) DO UPDATE SET term=EXCLUDED.term, aliases=EXCLUDED.aliases, definition=EXCLUDED.definition, source=EXCLUDED.source, verified=EXCLUDED.verified, updated_by=EXCLUDED.updated_by, updated_at=now()
     RETURNING (xmax = 0) AS inserted`, [v.termKey, v.term, v.aliases, v.definition, v.source, v.verified, u.id]);
  if (sub === '' || sub === '/') {
    const input = await body(req, 8000), c = cleanTerm(input);
    if (c.error) return fail(res, 400, c.error);
    const r = await upsert(c.value);
    return json(res, 200, { ok: true, created: !!r.rows[0].inserted });
  }
  if (sub === '/import') {
    const input = await body(req, 600_000);
    let rows = Array.isArray(input.rows) ? input.rows : (typeof input.csv === 'string' ? parseCsv(input.csv) : []);
    if (!rows.length) return fail(res, 400, 'Tidak ada baris yang bisa dibaca. Pastikan ada kolom term dan definition.');
    if (rows.length > MAX_IMPORT) return fail(res, 400, `Maksimal ${MAX_IMPORT} baris per impor.`);
    let created = 0, updated = 0; const skipped = [];
    for (const [i, row] of rows.entries()) {
      const c = cleanTerm({ ...row, verified: input.verified === true ? true : row.verified });
      if (c.error) { skipped.push({ row: i + 2, term: String(row?.term ?? '').slice(0, 40), reason: c.error }); continue; }
      const r = await upsert(c.value); r.rows[0].inserted ? created++ : updated++;
    }
    return json(res, 200, { ok: true, created, updated, skipped: skipped.slice(0, 30), skippedCount: skipped.length });
  }
  if (sub === '/delete') {
    const input = await body(req, 1000), id = Number(input.id);
    if (!Number.isInteger(id)) return fail(res, 400, 'Istilah tidak valid.');
    await db.query('DELETE FROM glossary_terms WHERE id=$1', [id]);
    return json(res, 200, { ok: true });
  }
  return fail(res, 404, 'Endpoint tidak ditemukan.');
}

// ── ANALISIS BUTIR SOAL ────────────────────────────────────────────────────
async function itemStatsPublic(req, res, u) {
  if (req.method !== 'GET') return fail(res, 405, 'Method tidak diizinkan.');
  if (!u) return fail(res, 401, 'Silakan masuk terlebih dahulu.');
  if (!limit(req, res, 120)) return;
  const ids = String(new URL(req.url, 'https://x').searchParams.get('ids') || '').split(',').map(x => x.trim()).filter(x => x && x.length <= 200).slice(0, 30);
  if (!ids.length) return json(res, 200, { stats: {} });
  const r = await getPool().query('SELECT question_id, n_total, n_wrong FROM item_stats WHERE question_id = ANY($1::text[]) AND n_total >= 20', [ids]);
  const stats = {};
  for (const row of r.rows) stats[row.question_id] = { n: row.n_total, correct: Math.round((1 - row.n_wrong / row.n_total) * 100) };
  res.setHeader('Cache-Control', 'private, max-age=60');
  return json(res, 200, { stats });
}

async function itemStats(req, res, u) {
  if (req.method !== 'POST') return fail(res, 405, 'Method tidak diizinkan.');
  if (!u) return fail(res, 401, 'Silakan masuk terlebih dahulu.');
  origin(req);
  if (!limit(req, res, 60)) return;
  const items = sanitizeItems(await body(req, 60_000));
  if (!items.length) return json(res, 200, { ok: true, saved: 0 });
  const db = getPool();
  for (const it of items) {
    await db.query(
      `INSERT INTO item_stats (question_id, source, bank, snippet, correct_idx, n_total, n_wrong, opt_counts)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (question_id) DO UPDATE SET
         n_total = item_stats.n_total + EXCLUDED.n_total,
         n_wrong = item_stats.n_wrong + EXCLUDED.n_wrong,
         opt_counts = ARRAY(SELECT COALESCE(a,0) + COALESCE(b,0)
                            FROM unnest(item_stats.opt_counts, EXCLUDED.opt_counts) WITH ORDINALITY AS t(a,b,i)
                            ORDER BY i),
         correct_idx = EXCLUDED.correct_idx,
         snippet = CASE WHEN EXCLUDED.snippet <> '' THEN EXCLUDED.snippet ELSE item_stats.snippet END,
         bank = CASE WHEN EXCLUDED.bank <> '' THEN EXCLUDED.bank ELSE item_stats.bank END,
         updated_at = now()`,
      [it.id, it.src, it.bank, it.s, it.ci, it.n, it.w, it.o]
    );
  }
  return json(res, 200, { ok: true, saved: items.length });
}

async function adminItemStats(req, res, u) {
  if (!u || (u.role !== 'admin' && u.role !== 'helper')) return fail(res, 403, 'Akses admin atau helper diperlukan.');
  if (req.method === 'DELETE') {
    if (u.role !== 'admin') return fail(res, 403, 'Hanya admin yang dapat mereset statistik.');
    origin(req);
    const id = new URL(req.url, 'https://x').searchParams.get('id');
    if (id) await getPool().query('DELETE FROM item_stats WHERE question_id = $1', [id]);
    else await getPool().query('DELETE FROM item_stats');
    return json(res, 200, { ok: true });
  }
  if (req.method !== 'GET') return fail(res, 405, 'Method tidak diizinkan.');
  const q = new URL(req.url, 'https://x').searchParams;
  const minN = Math.min(500, Math.max(1, parseInt(q.get('min') || '10', 10) || 10));
  const source = ['bank', 'mat'].includes(q.get('source')) ? q.get('source') : null;
  const r = await getPool().query(
    `SELECT question_id, source, bank, snippet, correct_idx, n_total, n_wrong, opt_counts
     FROM item_stats WHERE n_total >= $1 AND ($2::text IS NULL OR source = $2)
     ORDER BY (n_wrong::float / NULLIF(n_total,0)) DESC, n_total DESC LIMIT 300`, [minN, source]);
  const totals = await getPool().query('SELECT COUNT(*)::int AS items, COALESCE(SUM(n_total),0)::int AS answers FROM item_stats');
  return json(res, 200, { minN, totals: totals.rows[0], items: r.rows.map(analyzeRow) });
}

// ── ANNOUNCEMENTS ──────────────────────────────────────────────────────────
async function publicAnnouncements(req, res) {
  if (req.method !== 'GET') return fail(res, 405, 'Method tidak diizinkan.');
  const r = await getPool().query(
    `SELECT id, title, body, priority, created_at, updated_at, style FROM announcements
     WHERE published = true AND (expires_at IS NULL OR expires_at > now()) AND (starts_at IS NULL OR starts_at <= now())
     ORDER BY CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END, created_at DESC LIMIT 10`
  );
  return json(res, 200, { announcements: r.rows });
}

async function adminAnnouncements(req, res, u) {
  if (!u || u.role !== 'admin') return fail(res, 403, 'Akses admin diperlukan.');
  const url = new URL(req.url, 'https://x');
  const pathname = url.pathname;

  if (req.method === 'GET' && pathname === '/api/admin/announcements') {
    const r = await getPool().query(
      `SELECT id, title, body, priority, published, starts_at, expires_at, created_at, updated_at, style
       FROM announcements ORDER BY created_at DESC LIMIT 50`
    );
    return json(res, 200, { announcements: r.rows });
  }

  if (req.method === 'POST' && pathname === '/api/admin/announcements') {
    origin(req);
    const input = await body(req);
    const action = String(input.action || '').toLowerCase();
    if (action) {
      const id = String(input.id || '');
      if (!/^[0-9a-f-]{36}$/i.test(id)) return fail(res, 400, 'ID pengumuman tidak valid.');
      if (!['publish','draft','delete'].includes(action)) return fail(res, 400, 'Aksi pengumuman tidak valid.');
      if (action === 'delete') {
        const r = await getPool().query('DELETE FROM announcements WHERE id=$1 RETURNING id', [id]);
        if (!r.rowCount) return fail(res, 404, 'Pengumuman tidak ditemukan.');
        return json(res, 200, { ok:true, deleted:true, id });
      }
      const published = action === 'publish';
      const r = await getPool().query('UPDATE announcements SET published=$1, updated_at=now() WHERE id=$2 RETURNING id, published', [published, id]);
      if (!r.rowCount) return fail(res, 404, 'Pengumuman tidak ditemukan.');
      return json(res, 200, { ok:true, id, published:r.rows[0].published });
    }
    const title = String(input.title || '').trim();
    const bodyText = String(input.body || '').trim();
    const priority = ['low', 'normal', 'high', 'urgent'].includes(input.priority) ? input.priority : 'normal';
    if (!title || title.length > 120) return fail(res, 400, 'Judul harus 1–120 karakter.');
    if (!bodyText || bodyText.length > 2000) return fail(res, 400, 'Isi pengumuman harus 1–2000 karakter.');
    const id = randomUUID();
    const expiresAt = input.expires_at ? new Date(input.expires_at) : null;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) return fail(res, 400, 'Tanggal kedaluwarsa tidak valid.');
    const startsAt = input.starts_at ? new Date(input.starts_at) : null;
    if (startsAt && Number.isNaN(startsAt.getTime())) return fail(res, 400, 'Tanggal mulai tidak valid.');
    const st = cleanStyle(input.style);
    if (st.error) return fail(res, 400, st.error);
    await getPool().query(
      `INSERT INTO announcements (id, title, body, priority, published, created_by, expires_at, starts_at, style)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
      [id, title, bodyText, priority, input.published === true, u.id, expiresAt, startsAt, JSON.stringify(st.value)]
    );
    return json(res, 201, { id });
  }

  const match = pathname.match(/^\/api\/admin\/announcements\/([0-9a-f-]{36})$/i);
  if (!match) return fail(res, 404, 'Endpoint tidak ditemukan.');
  const aId = match[1];

  if (req.method === 'PATCH') {
    origin(req);
    const input = await body(req);
    const fields = [];
    const vals = [];
    if (input.title !== undefined) {
      const title = String(input.title || '').trim();
      if (!title || title.length > 120) return fail(res, 400, 'Judul harus 1–120 karakter.');
      fields.push(`title=$${vals.length+1}`); vals.push(title);
    }
    if (input.body !== undefined) {
      const bodyText = String(input.body || '').trim();
      if (!bodyText || bodyText.length > 2000) return fail(res, 400, 'Isi pengumuman harus 1–2000 karakter.');
      fields.push(`body=$${vals.length+1}`); vals.push(bodyText);
    }
    if (input.priority !== undefined) {
      if (!['low','normal','high','urgent'].includes(input.priority)) return fail(res, 400, 'Prioritas tidak valid.');
      fields.push(`priority=$${vals.length+1}`); vals.push(input.priority);
    }
    if (input.published !== undefined) { fields.push(`published=$${vals.length+1}`); vals.push(Boolean(input.published)); }
    if (input.style !== undefined) {
      const st = cleanStyle(input.style); if (st.error) return fail(res, 400, st.error);
      fields.push(`style=$${vals.length+1}::jsonb`); vals.push(JSON.stringify(st.value));
    }
    for (const [k, col] of [['starts_at', 'starts_at'], ['expires_at', 'expires_at']]) {
      if (input[k] === undefined) continue;
      const d = input[k] ? new Date(input[k]) : null;
      if (d && Number.isNaN(d.getTime())) return fail(res, 400, 'Tanggal tidak valid.');
      fields.push(`${col}=$${vals.length+1}`); vals.push(d);
    }
    if (!fields.length) return fail(res, 400, 'Tidak ada field yang diubah.');
    fields.push(`updated_at=now()`);
    vals.push(aId);
    await getPool().query(`UPDATE announcements SET ${fields.join(',')} WHERE id=$${vals.length}`, vals);
    return json(res, 200, { ok: true });
  }

  if (req.method === 'DELETE') {
    origin(req);
    await getPool().query('DELETE FROM announcements WHERE id=$1', [aId]);
    return json(res, 200, { ok: true });
  }

  return fail(res, 405, 'Method tidak diizinkan.');
}

// ── LEADERBOARD ─────────────────────────────────────────────────────────────
async function leaderboard(req, res) {
  const u = await user(req);
  if (!u) return fail(res, 401, 'Silakan masuk terlebih dahulu.');
  if (req.method !== 'GET') return fail(res, 405, 'Method tidak diizinkan.');

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1); // Senin
  weekStart.setHours(0,0,0,0);

  const r = await getPool().query(
    `SELECT u.id, u.name, u.username,
       COALESCE(s.xp_total, NULLIF(x.state->'gaster_v11_xp'->>'value','')::numeric, 0) AS xp_weekly,
       x.state->'gaster_v11_xp'->>'value' AS xp_all_time
     FROM users u
     LEFT JOIN xp_snapshots s ON s.user_id=u.id AND s.week_key=$1
     LEFT JOIN learning_states x ON x.user_id=u.id
     WHERE u.role='student'
     ORDER BY COALESCE(s.xp_total, NULLIF(x.state->'gaster_v11_xp'->>'value','')::numeric, 0) DESC, u.name ASC LIMIT 20`,
    [weekStart.toISOString().slice(0,10)]
  );

  return json(res, 200, {
    week: weekStart.toISOString().slice(0,10),
    me: u.id,
    rankings: r.rows.map((row, idx) => ({
      rank: idx + 1,
      id: row.id,
      name: row.name,
      username: row.username,
      xpWeekly: Number(row.xp_weekly) || 0,
      xpAllTime: (() => { try { return Number(JSON.parse(row.xp_all_time || '0')) || 0; } catch { return 0; } })()
    }))
  });
}

// ── UPDATE XP SNAPSHOT (called from sync endpoint) ─────────────────────────
async function upsertXpSnapshot(userId, xpValue) {
  try {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0,0,0,0);
    const weekKey = weekStart.toISOString().slice(0,10);
    const xp = Number(xpValue) || 0;
    await getPool().query(
      `INSERT INTO xp_snapshots (id, user_id, week_key, xp_total)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id, week_key) DO UPDATE
       SET xp_total=GREATEST(EXCLUDED.xp_total, xp_snapshots.xp_total), updated_at=now()`,
      [randomUUID(), userId, weekKey, xp]
    );
  } catch (e) { console.warn('upsertXpSnapshot failed:', e.message); }
}

// ── QUESTION NOTES ───────────────────────────────────────────────────────────
async function questionNotes(req, res) {
  const u = await user(req);
  if (!u) return fail(res, 401, 'Silakan masuk terlebih dahulu.');
  const url = new URL(req.url, 'https://x');

  if (req.method === 'GET') {
    const r = await getPool().query(
      'SELECT question_key, note, updated_at FROM question_notes WHERE user_id=$1 ORDER BY updated_at DESC',
      [u.id]
    );
    return json(res, 200, { notes: r.rows });
  }

  if (req.method === 'POST') {
    origin(req);
    const input = await body(req);
    const key = String(input.question_key || '').trim().slice(0, 200);
    const note = String(input.note || '').trim().slice(0, 2000);
    if (!key) return fail(res, 400, 'question_key diperlukan.');
    if (!note) {
      await getPool().query('DELETE FROM question_notes WHERE user_id=$1 AND question_key=$2', [u.id, key]);
      return json(res, 200, { deleted: true });
    }
    await getPool().query(
      `INSERT INTO question_notes (user_id, question_key, note)
       VALUES ($1,$2,$3)
       ON CONFLICT (user_id, question_key) DO UPDATE SET note=EXCLUDED.note, updated_at=now()`,
      [u.id, key, note]
    );
    return json(res, 200, { ok: true });
  }

  return fail(res, 405, 'Method tidak diizinkan.');
}
