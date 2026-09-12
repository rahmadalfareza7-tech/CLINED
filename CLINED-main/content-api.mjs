import { randomUUID } from 'node:crypto';
const packageQuestion = (question, index) => {
  if (!question || typeof question !== 'object' || Array.isArray(question)) throw Object.assign(Error(`Soal #${index + 1} tidak valid.`), { status: 400 });
  const id = String(question.id || '').trim(), soal = String(question.soal || '').trim(), opsi = Array.isArray(question.opsi) ? question.opsi.map(value => String(value || '').trim()) : [];
  if (!id || !soal || opsi.length < 2 || opsi.some(value => !value) || !Number.isInteger(question.jawabanBenar) || question.jawabanBenar < 0 || question.jawabanBenar >= opsi.length) throw Object.assign(Error(`Format soal #${index + 1} tidak sesuai.`), { status: 400 });
  return { ...question, id, soal, opsi };
};
export async function contentApi({ request, response, url, user, pool, body, json, fail, origin }) {
  if (!user) return fail(response, 401, 'Silakan masuk terlebih dahulu.');
  const path = url.pathname.slice('/api/content'.length);
  if (path === '/attempts' || path.startsWith('/attempts')) return attemptsApi({ request, response, url, user, pool, body, json, fail, origin, path: path.slice('/attempts'.length) });
  if (request.method === 'GET' && path === '/packages') {
    const module = url.searchParams.get('module');
    if (module && !['UAB', 'UPI'].includes(module)) return fail(response, 400, 'Modul tidak valid.');
    const result = await pool.query(`SELECT id,module,title,block,visibility,questions,schema_version,published_at,updated_at
      FROM content_packages WHERE (visibility = 'public' OR owner_user_id = $1) AND ($2::text IS NULL OR module = $2)
      ORDER BY visibility DESC, updated_at DESC`, [user.id, module]);
    return json(response, 200, { packages: result.rows });
  }
  if (request.method !== 'POST' || path !== '/packages') return fail(response, 404, 'Endpoint konten tidak ditemukan.');
  origin(request);
  const input = await body(request), module = String(input.module || ''), title = String(input.title || '').trim(), block = input.block ? String(input.block).trim().slice(0, 80) : null;
  if (!['UAB', 'UPI'].includes(module) || !title || title.length > 160 || !Array.isArray(input.questions) || !input.questions.length || input.questions.length > 500) return fail(response, 400, 'Paket soal tidak valid.');
  const questions = input.questions.map(packageQuestion), ids = new Set(questions.map(question => question.id));
  if (ids.size !== questions.length) return fail(response, 400, 'ID soal dalam paket harus unik.');
  // Semua paket server yang masuk ke katalog publik hanya boleh dibuat admin.
  // Pengguna biasa tidak boleh membuat konten publik melalui API ini.
  if (user.role !== 'admin') return fail(response, 403, 'Hanya admin yang dapat membuat konten publik.');
  const visibility = 'public';
  const ownerId = null;
  const result = await pool.query(`INSERT INTO content_packages (id,module,title,block,visibility,owner_user_id,created_by,questions,published_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,CASE WHEN $5='public' THEN now() ELSE NULL END) RETURNING id,module,title,block,visibility,owner_user_id,created_at`,
    [randomUUID(), module, title, block, visibility, ownerId, user.id, JSON.stringify(questions)]);
  return json(response, 201, { package: result.rows[0] });
}

// Riwayat skor kuis: INSERT ringan + SELECT ber-index, jauh lebih murah (CPU/RAM)
// daripada baca-ubah-tulis satu file JSON besar per submit di skala 150 pengguna.
async function attemptsApi({ request, response, user, pool, body, json, fail, origin, path }) {
  if (request.method === 'POST' && path === '') {
    origin(request);
    const input = await body(request);
    const moduleName = String(input.module || '');
    const score = Number.isInteger(input.score) ? input.score : -1;
    const total = Number.isInteger(input.total) ? input.total : 0;
    if (!['UAB', 'UPI'].includes(moduleName) || score < 0 || total <= 0 || score > total) {
      return fail(response, 400, 'Data hasil kuis tidak valid.');
    }
    const block = input.block ? String(input.block).trim().slice(0, 80) : null;
    const packageId = /^[0-9a-f-]{36}$/i.test(input.packageId || '') ? input.packageId : null;
    const duration = Number.isInteger(input.durationSeconds) && input.durationSeconds >= 0 ? Math.min(input.durationSeconds, 24 * 3600) : null;
    const result = await pool.query(
      `INSERT INTO quiz_attempts (id,user_id,module,block,package_id,score,total,duration_seconds)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,module,block,score,total,duration_seconds,created_at`,
      [randomUUID(), user.id, moduleName, block, packageId, score, total, duration]
    );
    return json(response, 201, { attempt: result.rows[0] });
  }
  if (request.method === 'GET' && path === '') {
    const limit = Math.min(Number(new URL(request.url, 'http://x').searchParams.get('limit')) || 20, 100);
    const result = await pool.query(
      `SELECT id,module,block,score,total,duration_seconds,created_at FROM quiz_attempts
       WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [user.id, limit]
    );
    return json(response, 200, { attempts: result.rows });
  }
  return fail(response, 404, 'Endpoint riwayat tidak ditemukan.');
}
