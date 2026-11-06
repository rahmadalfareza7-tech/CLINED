// Komentar per soal: lihat, tulis, suka/tidak suka, hapus. Dipasang dari app.mjs.
import { badgesOf } from './chat-logic.mjs';
import { validKey, cleanComment, cleanVote, rank, canDelete, DAILY_LIMIT } from './qcomments-logic.mjs';

export function createQComments({ getPool, json, fail, body, origin, limit }) {
  const db = () => getPool();
  async function handle(req, res, u) {
    if (!u) return fail(res, 401, 'Silakan masuk terlebih dahulu.');
    const url = new URL(req.url, 'https://x'), q = db();
    if (req.method === 'GET') {
      const key = url.searchParams.get('key') || '';
      if (!validKey(key)) return fail(res, 400, 'Soal tidak valid.');
      const r = await q.query(`
        SELECT c.id, c.user_id, c.body, c.created_at, us.name, us.username, us.role, us.is_mentor,
               COALESCE(SUM(CASE WHEN v.value=1 THEN 1 END),0)::int AS up,
               COALESCE(SUM(CASE WHEN v.value=-1 THEN 1 END),0)::int AS down,
               MAX(CASE WHEN v.user_id=$2 THEN v.value END) AS mine
          FROM question_comments c JOIN users us ON us.id=c.user_id
          LEFT JOIN question_comment_votes v ON v.comment_id=c.id
         WHERE c.qkey=$1 GROUP BY c.id, us.id ORDER BY c.created_at DESC LIMIT 200`, [key, u.id]);
      const list = r.rows.map(x => ({ id: String(x.id), userId: x.user_id, name: x.name, username: x.username, badges: badgesOf(x), text: x.body, at: new Date(x.created_at).getTime(), up: x.up, down: x.down, mine: x.mine == null ? 0 : Number(x.mine) }));
      const ranked = rank(list).map(c => ({ id: c.id, name: c.name, username: c.username, badges: c.badges, text: c.text, at: c.at, up: c.up, down: c.down, mine: c.mine, own: c.userId === u.id, canDelete: canDelete(u, c) }));
      return json(res, 200, { comments: ranked });
    }
    if (req.method === 'POST' && url.pathname.endsWith('/vote')) {
      origin(req); if (!limit(req, res, 120)) return;
      const i = await body(req, 1000), id = String(i.id || ''), val = cleanVote(i.value);
      if (!/^\d{1,18}$/.test(id) || val === null) return fail(res, 400, 'Data tidak valid.');
      const c = await q.query('SELECT user_id FROM question_comments WHERE id=$1', [id]);
      if (!c.rowCount) return fail(res, 404, 'Komentar tidak ditemukan.');
      if (c.rows[0].user_id === u.id) return fail(res, 400, 'Tidak bisa menilai komentar sendiri.');
      if (val === 0) await q.query('DELETE FROM question_comment_votes WHERE comment_id=$1 AND user_id=$2', [id, u.id]);
      else await q.query(`INSERT INTO question_comment_votes (comment_id,user_id,value) VALUES ($1,$2,$3) ON CONFLICT (comment_id,user_id) DO UPDATE SET value=EXCLUDED.value`, [id, u.id, val]);
      const t = (await q.query(`SELECT COALESCE(SUM(CASE WHEN value=1 THEN 1 END),0)::int AS up, COALESCE(SUM(CASE WHEN value=-1 THEN 1 END),0)::int AS down FROM question_comment_votes WHERE comment_id=$1`, [id])).rows[0];
      return json(res, 200, { ok: true, up: t.up, down: t.down, mine: val });
    }
    if (req.method === 'POST') {
      origin(req); if (!limit(req, res, 20)) return;
      const i = await body(req, 4000), key = String(i.key || ''), c = cleanComment(i.text);
      if (!validKey(key)) return fail(res, 400, 'Soal tidak valid.');
      if (c.error) return fail(res, 400, c.error);
      const n = (await q.query(`SELECT COUNT(*)::int AS n FROM question_comments WHERE user_id=$1 AND created_at > now() - interval '24 hours'`, [u.id])).rows[0].n;
      if (n >= DAILY_LIMIT) return fail(res, 429, 'Batas komentar harian tercapai.');
      const r = await q.query('INSERT INTO question_comments (qkey,user_id,body) VALUES ($1,$2,$3) RETURNING id, created_at', [key, u.id, c.value]);
      return json(res, 200, { ok: true, comment: { id: String(r.rows[0].id), name: u.name, username: u.username, badges: badgesOf(u), text: c.value, at: new Date(r.rows[0].created_at).getTime(), up: 0, down: 0, mine: 0, own: true, canDelete: true } });
    }
    if (req.method === 'DELETE') {
      origin(req);
      const id = url.searchParams.get('id') || '';
      if (!/^\d{1,18}$/.test(id)) return fail(res, 400, 'Data tidak valid.');
      const c = await q.query('SELECT user_id FROM question_comments WHERE id=$1', [id]);
      if (!c.rowCount) return fail(res, 404, 'Komentar tidak ditemukan.');
      if (!canDelete(u, { userId: c.rows[0].user_id })) return fail(res, 403, 'Tidak diizinkan.');
      await q.query('DELETE FROM question_comments WHERE id=$1', [id]);
      return json(res, 200, { ok: true });
    }
    return fail(res, 405, 'Method tidak diizinkan.');
  }
  return { handle };
}
