import { randomUUID } from 'node:crypto';
import { getPool, json, fail, limit, origin, body, user } from './http.mjs';
import { sanitizeItems, analyzeRow } from './item-analysis.mjs';
import { cleanStyle } from './announce-logic.mjs';
import { cleanTerm, parseCsv, MAX_IMPORT } from './glossary-logic.mjs';
import { broadcast } from './stream.mjs';

const REPORT_CATS = ['key', 'typo', 'ambiguous', 'explanation', 'other'];
const REPORT_STATUS = ['new', 'checked', 'fixed', 'dismissed'];
const clip = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

export async function questionReports(req, res, u) {
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

export async function adminQuestionReports(req, res, u, sub) {
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
    if (r.rowCount) {
      const q = (r.rows[0].questions || []).find(x => String(x?.id) === id);
      return json(res, 200, { bankId: r.rows[0].id, bankName: r.rows[0].name, question: q });
    }
    const rawId = id.startsWith('mat:') ? id.split(':').slice(2).join(':') : id;
    const pkgIdHint = id.startsWith('mat:') ? id.split(':')[1] : '';
    const cp = await db.query(
      `SELECT id, title, module, questions FROM content_packages
        WHERE module IN ('UAB','MAT')
          AND (($1::text <> '' AND id::text = $1) OR questions @> $2::jsonb OR questions @> $3::jsonb)
        LIMIT 5`,
      [pkgIdHint, JSON.stringify([{ id }]), JSON.stringify([{ id: rawId }])]
    ).catch(() => ({ rows: [] }));
    for (const row of cp.rows) {
      const q = (row.questions || []).find(x => String(x?.id) === id || String(x?.id) === rawId);
      if (q) {
        return json(res, 200, { packageId: row.id, bankName: `${row.title} (${row.module})`, question: q, questionId: String(q.id) });
      }
    }
    return fail(res, 404, 'Soal ini tidak ditemukan di bank server maupun paket UAB/Latihan Materi.');
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

export async function glossary(req, res, u, sub) {
  if (!u) return fail(res, 401, 'Silakan masuk terlebih dahulu.');
  const db = getPool();
  if (req.method === 'GET' && (sub === '' || sub === '/')) {
    const r = await db.query('SELECT id, term, aliases, definition, source, verified, updated_at FROM glossary_terms ORDER BY lower(term)');
    res.setHeader('Cache-Control', 'private, max-age=300');
    return json(res, 200, {
      terms: r.rows.map(x => ({ id: String(x.id), term: x.term, aliases: x.aliases || [], definition: x.definition, source: x.source, verified: x.verified })),
      updatedAt: r.rows.reduce((m, x) => Math.max(m, new Date(x.updated_at).getTime()), 0)
    });
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

export async function itemStatsPublic(req, res, u) {
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

export async function itemStats(req, res, u) {
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

export async function adminItemStats(req, res, u) {
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
    `SELECT question_id, source, bank, snippet, correct_idx, n_total, n_wrong, opt_counts, updated_at
     FROM item_stats WHERE n_total >= $1 AND ($2::text IS NULL OR source = $2)
     ORDER BY (n_wrong::float / NULLIF(n_total,0)) DESC, n_total DESC LIMIT 300`, [minN, source]);
  const totals = await getPool().query('SELECT COUNT(*)::int AS items, COALESCE(SUM(n_total),0)::int AS answers FROM item_stats');
  return json(res, 200, { minN, totals: totals.rows[0], items: r.rows.map(analyzeRow) });
}

export async function publicAnnouncements(req, res) {
  if (req.method !== 'GET') return fail(res, 405, 'Method tidak diizinkan.');
  const r = await getPool().query(
    `SELECT id, title, body, priority, created_at, updated_at, style FROM announcements
     WHERE published = true AND (expires_at IS NULL OR expires_at > now()) AND (starts_at IS NULL OR starts_at <= now())
     ORDER BY CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END, created_at DESC LIMIT 10`
  );
  return json(res, 200, { announcements: r.rows });
}

function broadcastAnnouncementState(row) {
  if (!row) return;
  const now = Date.now();
  const startsOk = !row.starts_at || new Date(row.starts_at).getTime() <= now;
  const expiresOk = !row.expires_at || new Date(row.expires_at).getTime() > now;
  if (row.published && startsOk && expiresOk) {
    broadcast('announcement', {
      kind: 'live',
      announcement: {
        id: row.id,
        title: row.title,
        body: row.body,
        priority: row.priority,
        created_at: row.created_at,
        updated_at: row.updated_at,
        style: row.style
      }
    });
  } else {
    broadcast('announcement', { kind: 'remove', id: row.id });
  }
}

export async function adminAnnouncements(req, res, u) {
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
      if (!['publish', 'draft', 'delete'].includes(action)) return fail(res, 400, 'Aksi pengumuman tidak valid.');
      if (action === 'delete') {
        const r = await getPool().query('DELETE FROM announcements WHERE id=$1 RETURNING id', [id]);
        if (!r.rowCount) return fail(res, 404, 'Pengumuman tidak ditemukan.');
        broadcast('announcement', { kind: 'remove', id });
        return json(res, 200, { ok: true, deleted: true, id });
      }
      const published = action === 'publish';
      const r = await getPool().query('UPDATE announcements SET published=$1, updated_at=now() WHERE id=$2 RETURNING id, title, body, priority, published, starts_at, expires_at, created_at, updated_at, style', [published, id]);
      if (!r.rowCount) return fail(res, 404, 'Pengumuman tidak ditemukan.');
      broadcastAnnouncementState(r.rows[0]);
      return json(res, 200, { ok: true, id, published: r.rows[0].published });
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
    const ins = await getPool().query(
      `INSERT INTO announcements (id, title, body, priority, published, created_by, expires_at, starts_at, style)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
       RETURNING id, title, body, priority, published, starts_at, expires_at, created_at, updated_at, style`,
      [id, title, bodyText, priority, input.published === true, u.id, expiresAt, startsAt, JSON.stringify(st.value)]
    );
    broadcastAnnouncementState(ins.rows[0]);
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
      fields.push(`title=$${vals.length + 1}`); vals.push(title);
    }
    if (input.body !== undefined) {
      const bodyText = String(input.body || '').trim();
      if (!bodyText || bodyText.length > 2000) return fail(res, 400, 'Isi pengumuman harus 1–2000 karakter.');
      fields.push(`body=$${vals.length + 1}`); vals.push(bodyText);
    }
    if (input.priority !== undefined) {
      if (!['low', 'normal', 'high', 'urgent'].includes(input.priority)) return fail(res, 400, 'Prioritas tidak valid.');
      fields.push(`priority=$${vals.length + 1}`); vals.push(input.priority);
    }
    if (input.published !== undefined) { fields.push(`published=$${vals.length + 1}`); vals.push(Boolean(input.published)); }
    if (input.style !== undefined) {
      const st = cleanStyle(input.style); if (st.error) return fail(res, 400, st.error);
      fields.push(`style=$${vals.length + 1}::jsonb`); vals.push(JSON.stringify(st.value));
    }
    for (const [k, col] of [['starts_at', 'starts_at'], ['expires_at', 'expires_at']]) {
      if (input[k] === undefined) continue;
      const d = input[k] ? new Date(input[k]) : null;
      if (d && Number.isNaN(d.getTime())) return fail(res, 400, 'Tanggal tidak valid.');
      fields.push(`${col}=$${vals.length + 1}`); vals.push(d);
    }
    if (!fields.length) return fail(res, 400, 'Tidak ada field yang diubah.');
    fields.push(`updated_at=now()`);
    vals.push(aId);
    const upd = await getPool().query(`UPDATE announcements SET ${fields.join(',')} WHERE id=$${vals.length} RETURNING id, title, body, priority, published, starts_at, expires_at, created_at, updated_at, style`, vals);
    if (upd.rowCount) broadcastAnnouncementState(upd.rows[0]);
    return json(res, 200, { ok: true });
  }

  if (req.method === 'DELETE') {
    origin(req);
    await getPool().query('DELETE FROM announcements WHERE id=$1', [aId]);
    broadcast('announcement', { kind: 'remove', id: aId });
    return json(res, 200, { ok: true });
  }

  return fail(res, 405, 'Method tidak diizinkan.');
}

export async function questionNotes(req, res) {
  const u = await user(req);
  if (!u) return fail(res, 401, 'Silakan masuk terlebih dahulu.');
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
