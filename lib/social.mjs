// Teman & duel. Dipasang dari app.mjs lewat createSocial(helpers).
import { randomUUID } from 'node:crypto';
import { push, isOnline, openStream } from './stream.mjs';
import { cleanStatus, cleanReaction, cleanComment, DAILY_LIMIT, COMMENT_DAILY_LIMIT } from './status-logic.mjs';
import { makeCode, normalizeCode, pickQuestions, gradeAnswer, decide, viewFor, isLate, questionStart, WAIT_MAX_MS, TIME_OPTIONS } from './duel-logic.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createSocial({ getPool, json, fail, body, origin, limit, awardXp }) {
  const db = () => getPool();
  let sweeper = null;

  const rowToDuel = r => ({
    id: r.id, code: r.code, hostId: r.host_id, guestId: r.guest_id, invitedId: r.invited_id,
    bankId: r.bank_id, bankName: r.bank_name, status: r.status, questions: r.questions || [], answers: r.answers || {},
    startedAt: r.started_at ? new Date(r.started_at).getTime() : 0, winnerId: r.winner_id, reason: r.reason || '', perQ: Number(r.per_q_ms) || 0
  });
  async function people(ids) {
    const list = [...new Set(ids.filter(Boolean))]; if (!list.length) return {};
    const r = await db().query('SELECT id,name,username FROM users WHERE id = ANY($1::uuid[])', [list]);
    return Object.fromEntries(r.rows.map(x => [x.id, { name: x.name, username: x.username }]));
  }
  async function areFriends(a, b) {
    const r = await db().query(`SELECT 1 FROM friend_links WHERE status='accepted' AND ((requester_id=$1 AND addressee_id=$2) OR (requester_id=$2 AND addressee_id=$1)) LIMIT 1`, [a, b]);
    return r.rowCount > 0;
  }
  async function isBlocked(a, b) {
    const r = await db().query(`SELECT 1 FROM friend_links WHERE status='blocked' AND ((requester_id=$1 AND addressee_id=$2) OR (requester_id=$2 AND addressee_id=$1)) LIMIT 1`, [a, b]);
    return r.rowCount > 0;
  }
  const viewOf = async (d, me) => viewFor(d, me, await people([d.hostId, d.guestId, d.invitedId]), isOnline);

  // ── STREAM ───────────────────────────────────────────────────────────────
  function stream(req, res, u) {
    if (req.method !== 'GET') return fail(res, 405, 'Method tidak diizinkan.');
    if (!u) return fail(res, 401, 'Silakan masuk terlebih dahulu.');
    startSweeper();
    return openStream(req, res, u.id);
  }

  // ── TEMAN ────────────────────────────────────────────────────────────────
  async function friends(req, res, u, sub) {
    if (!u) return fail(res, 401, 'Silakan masuk terlebih dahulu.');
    if (req.method !== 'GET') { origin(req); if (!limit(req, res, 40)) return; }
    const q = db();
    if (req.method === 'GET' && (sub === '' || sub === '/')) {
      const r = await q.query(
        `SELECT l.id, l.requester_id, l.addressee_id, l.status, u2.id AS other_id, u2.name, u2.username
           FROM friend_links l JOIN users u2 ON u2.id = CASE WHEN l.requester_id=$1 THEN l.addressee_id ELSE l.requester_id END
          WHERE (l.requester_id=$1 OR l.addressee_id=$1) AND l.status IN ('pending','accepted') ORDER BY l.updated_at DESC LIMIT 300`, [u.id]);
      const bl = await q.query(
        `SELECT u2.id, u2.name, u2.username FROM friend_links l JOIN users u2 ON u2.id=l.addressee_id
          WHERE l.requester_id=$1 AND l.status='blocked' ORDER BY l.updated_at DESC LIMIT 100`, [u.id]);
      const out = { friends: [], incoming: [], outgoing: [], blocked: bl.rows.map(x => ({ id: x.id, name: x.name, username: x.username })) };
      for (const x of r.rows) {
        const p = { linkId: x.id, id: x.other_id, name: x.name, username: x.username };
        if (x.status === 'accepted') out.friends.push({ ...p, online: isOnline(x.other_id) });
        else if (x.addressee_id === u.id) out.incoming.push(p); else out.outgoing.push(p);
      }
      out.friends.sort((a, b) => (b.online - a.online) || a.name.localeCompare(b.name));
      return json(res, 200, out);
    }
    if (req.method !== 'POST') return fail(res, 405, 'Method tidak diizinkan.');
    const input = await body(req, 3000);

    if (sub === '/request') {
      const name = String(input.username || '').trim().replace(/^@/, '').toLowerCase().slice(0, 24);
      if (!name) return fail(res, 400, 'Tulis username temanmu.');
      const t = (await q.query('SELECT id,name,username FROM users WHERE lower(username)=$1 LIMIT 1', [name])).rows[0];
      if (!t) return fail(res, 404, 'Username tidak ditemukan atau tidak bisa ditambahkan.');
      if (t.id === u.id) return fail(res, 400, 'Itu username kamu sendiri.');
      if (await isBlocked(u.id, t.id)) return fail(res, 404, 'Username tidak ditemukan atau tidak bisa ditambahkan.');
      const ex = (await q.query(`SELECT id, requester_id, status FROM friend_links WHERE (requester_id=$1 AND addressee_id=$2) OR (requester_id=$2 AND addressee_id=$1) LIMIT 1`, [u.id, t.id])).rows[0];
      if (ex) {
        if (ex.status === 'accepted') return fail(res, 400, 'Kalian sudah berteman.');
        if (ex.requester_id === u.id) return fail(res, 400, 'Permintaan sudah dikirim, tunggu dia menerima.');
        await q.query(`UPDATE friend_links SET status='accepted', updated_at=now() WHERE id=$1`, [ex.id]);   // dia sudah meminta lebih dulu → langsung berteman
        push(t.id, 'friend', { kind: 'accepted', from: { name: u.name, username: u.username } });
        return json(res, 200, { ok: true, status: 'accepted', user: { id: t.id, name: t.name, username: t.username } });
      }
      const cnt = (await q.query(`SELECT COUNT(*)::int AS n FROM friend_links WHERE requester_id=$1 AND status='pending'`, [u.id])).rows[0].n;
      if (cnt >= 50) return fail(res, 400, 'Terlalu banyak permintaan yang belum dijawab.');
      await q.query(`INSERT INTO friend_links (requester_id, addressee_id, status) VALUES ($1,$2,'pending') ON CONFLICT DO NOTHING`, [u.id, t.id]);
      push(t.id, 'friend', { kind: 'request', from: { name: u.name, username: u.username } });
      return json(res, 200, { ok: true, status: 'pending', user: { id: t.id, name: t.name, username: t.username } });
    }
    if (sub === '/respond') {
      const id = Number(input.id); if (!Number.isInteger(id)) return fail(res, 400, 'Permintaan tidak valid.');
      if (input.accept) {
        const r = await q.query(`UPDATE friend_links SET status='accepted', updated_at=now() WHERE id=$1 AND addressee_id=$2 AND status='pending' RETURNING requester_id`, [id, u.id]);
        if (r.rowCount) push(r.rows[0].requester_id, 'friend', { kind: 'accepted', from: { name: u.name, username: u.username } });
      } else await q.query(`DELETE FROM friend_links WHERE id=$1 AND addressee_id=$2 AND status='pending'`, [id, u.id]);
      return json(res, 200, { ok: true });
    }
    const uid = String(input.userId || '');
    if (!UUID.test(uid)) return fail(res, 400, 'Pengguna tidak valid.');
    if (sub === '/remove') {
      await q.query(`DELETE FROM friend_links WHERE status IN ('pending','accepted') AND ((requester_id=$1 AND addressee_id=$2) OR (requester_id=$2 AND addressee_id=$1))`, [u.id, uid]);
      push(uid, 'friend', { kind: 'removed' });
      return json(res, 200, { ok: true });
    }
    if (sub === '/block') {
      if (uid === u.id) return fail(res, 400, 'Tidak bisa memblokir diri sendiri.');
      await q.query(`DELETE FROM friend_links WHERE (requester_id=$1 AND addressee_id=$2) OR (requester_id=$2 AND addressee_id=$1)`, [u.id, uid]);
      await q.query(`INSERT INTO friend_links (requester_id, addressee_id, status) SELECT $1::uuid, id, 'blocked' FROM users WHERE id=$2::uuid ON CONFLICT DO NOTHING`, [u.id, uid]);
      await q.query(`UPDATE duels SET status='cancelled', updated_at=now() WHERE status='waiting' AND ((host_id=$1 AND invited_id=$2) OR (host_id=$2 AND invited_id=$1))`, [u.id, uid]);
      return json(res, 200, { ok: true });
    }
    if (sub === '/unblock') {
      await q.query(`DELETE FROM friend_links WHERE requester_id=$1 AND addressee_id=$2 AND status='blocked'`, [u.id, uid]);
      return json(res, 200, { ok: true });
    }
    return fail(res, 404, 'Endpoint tidak ditemukan.');
  }

  // ── DUEL ─────────────────────────────────────────────────────────────────
  async function finalize(d, decision) {
    const r = await db().query(
      `UPDATE duels SET status='finished', winner_id=$2, reason=$3, finished_at=now(), updated_at=now() WHERE id=$1 AND status='active' RETURNING *`,
      [d.id, decision.winnerId, decision.reason]);
    if (!r.rowCount) return null;
    const nd = rowToDuel(r.rows[0]);
    for (const id of [nd.hostId, nd.guestId]) if (id) push(id, 'duel', { id: nd.id, kind: 'finished' });
    return nd;
  }
  async function load(id) {
    if (!UUID.test(id)) return null;
    const r = await db().query('SELECT * FROM duels WHERE id=$1', [id]);
    return r.rowCount ? rowToDuel(r.rows[0]) : null;
  }
  const member = (d, uid) => d.hostId === uid || d.guestId === uid;

  async function duels(req, res, u, sub) {
    if (!u) return fail(res, 401, 'Silakan masuk terlebih dahulu.');
    startSweeper();
    const q = db();
    if (req.method === 'GET' && sub === '/active') {
      const r = await q.query(`SELECT * FROM duels WHERE status IN ('waiting','active') AND (host_id=$1 OR guest_id=$1 OR invited_id=$1) ORDER BY created_at DESC LIMIT 10`, [u.id]);
      const list = r.rows.map(rowToDuel), mine = [], invites = [];
      const ppl = await people(list.flatMap(d => [d.hostId, d.guestId, d.invitedId]));
      for (const d of list) {
        const v = viewFor(d, u.id, ppl, isOnline);
        if (member(d, u.id)) mine.push(v); else if (d.invitedId === u.id && d.status === 'waiting') invites.push({ id: d.id, code: d.code, bank: v.bank, total: v.total, from: v.opponent });
      }
      return json(res, 200, { mine, invites });
    }
    const one = sub.match(/^\/([0-9a-f-]{36})(\/[a-z]+)?$/i);
    if (req.method === 'GET' && one && !one[2]) {
      let d = await load(one[1]);
      if (!d || !(member(d, u.id) || (d.invitedId === u.id && d.status === 'waiting'))) return fail(res, 404, 'Duel tidak ditemukan.');
      if (d.status === 'active') { const dec = decide(d); if (dec) d = (await finalize(d, dec)) || await load(d.id); }
      return json(res, 200, { duel: await viewOf(d, u.id) });
    }
    if (req.method !== 'POST') return fail(res, 405, 'Method tidak diizinkan.');
    origin(req); if (!limit(req, res, 120)) return;

    if (sub === '' || sub === '/') {                                  // buat
      const input = await body(req, 3000);
      const busy = await q.query(`SELECT 1 FROM duels WHERE status='active' AND (host_id=$1 OR guest_id=$1) LIMIT 1`, [u.id]);
      if (busy.rowCount) return fail(res, 409, 'Selesaikan duel yang sedang berjalan dulu.');
      const bankId = String(input.bankId || '').slice(0, 80), count = [5, 10, 15].includes(Number(input.count)) ? Number(input.count) : 10;
      const perQ = (TIME_OPTIONS.includes(Number(input.seconds)) ? Number(input.seconds) : 0) * 1000;
      const b = (await q.query('SELECT id,name,questions FROM question_banks WHERE id=$1 AND published=true', [bankId])).rows[0];
      if (!b) return fail(res, 404, 'Bank soal tidak ditemukan.');
      const picked = pickQuestions(b.questions, count);
      if (picked.length < 5) return fail(res, 400, 'Bank ini belum punya cukup soal untuk duel.');
      let invited = null;
      if (input.friendId) {
        invited = String(input.friendId);
        if (!UUID.test(invited) || !(await areFriends(u.id, invited)) || await isBlocked(u.id, invited)) return fail(res, 400, 'Hanya teman yang bisa kamu tantang.');
      }
      await q.query(`UPDATE duels SET status='cancelled', updated_at=now() WHERE host_id=$1 AND status='waiting'`, [u.id]);
      for (let i = 0; i < 6; i++) {
        const r = await q.query(
          `INSERT INTO duels (id, code, host_id, invited_id, bank_id, bank_name, status, questions, per_q_ms) VALUES ($1,$2,$3,$4,$5,$6,'waiting',$7::jsonb,$8::int) ON CONFLICT (code) DO NOTHING RETURNING *`,
          [randomUUID(), makeCode(), u.id, invited, b.id, String(b.name || b.id).slice(0, 80), JSON.stringify(picked), perQ]);
        if (r.rowCount) {
          const d = rowToDuel(r.rows[0]);
          if (invited) push(invited, 'duel', { id: d.id, kind: 'invite', from: { name: u.name, username: u.username } });
          return json(res, 200, { duel: await viewOf(d, u.id) });
        }
      }
      return fail(res, 500, 'Gagal membuat kode duel, coba lagi.');
    }
    if (sub === '/join') {
      const input = await body(req, 1000), code = normalizeCode(input.code);
      if (code.length !== 6) return fail(res, 400, 'Kode duel harus 6 karakter.');
      const busy = await q.query(`SELECT 1 FROM duels WHERE status='active' AND (host_id=$1 OR guest_id=$1) LIMIT 1`, [u.id]);
      if (busy.rowCount) return fail(res, 409, 'Selesaikan duel yang sedang berjalan dulu.');
      const pre = (await q.query(`SELECT host_id FROM duels WHERE code=$1 AND status='waiting'`, [code])).rows[0];
      if (pre && await isBlocked(u.id, pre.host_id)) return fail(res, 404, 'Kode tidak valid, sudah dipakai, atau bukan untukmu.');
      const r = await q.query(
        `UPDATE duels SET guest_id=$1, status='active', started_at=now() + interval '3 seconds', updated_at=now()
          WHERE code=$2 AND status='waiting' AND guest_id IS NULL AND host_id<>$1 AND (invited_id IS NULL OR invited_id=$1) RETURNING *`, [u.id, code]);
      if (!r.rowCount) return fail(res, 404, 'Kode tidak valid, sudah dipakai, atau bukan untukmu.');
      const d = rowToDuel(r.rows[0]);
      push(d.hostId, 'duel', { id: d.id, kind: 'joined', from: { name: u.name, username: u.username } });
      return json(res, 200, { duel: await viewOf(d, u.id) });
    }
    if (!one || !one[2]) return fail(res, 404, 'Endpoint tidak ditemukan.');
    const d = await load(one[1]);
    if (!d) return fail(res, 404, 'Duel tidak ditemukan.');
    const action = one[2];

    if (action === '/decline') {
      if (d.invitedId !== u.id || d.status !== 'waiting') return fail(res, 404, 'Undangan tidak ditemukan.');
      await q.query(`UPDATE duels SET status='cancelled', updated_at=now() WHERE id=$1 AND status='waiting'`, [d.id]);
      push(d.hostId, 'duel', { id: d.id, kind: 'declined', from: { name: u.name, username: u.username } });
      return json(res, 200, { ok: true });
    }
    if (!member(d, u.id)) return fail(res, 404, 'Duel tidak ditemukan.');

    if (action === '/leave') {
      if (d.status === 'waiting') {
        await q.query(`UPDATE duels SET status='cancelled', updated_at=now() WHERE id=$1 AND status='waiting'`, [d.id]);
        if (d.invitedId) push(d.invitedId, 'duel', { id: d.id, kind: 'cancelled' });
      } else if (d.status === 'active') {
        const other = d.hostId === u.id ? d.guestId : d.hostId;
        await finalize(d, { winnerId: other, reason: 'forfeit' });
      }
      return json(res, 200, { ok: true });
    }
    if (action === '/answer') {
      if (d.status !== 'active') return fail(res, 409, 'Duel ini tidak sedang berjalan.');
      const input = await body(req, 1000), idx = Number(input.idx), choice = Number(input.choice);
      if (Date.now() < d.startedAt - 300) return fail(res, 409, 'Duel belum dimulai, tunggu hitungan mundur.');
      if (!Number.isInteger(idx) || idx < 0 || idx >= d.questions.length) return fail(res, 400, 'Nomor soal tidak valid.');
      const mine = d.answers[u.id] || [];
      if (idx < mine.length) return json(res, 200, { ok: true, duplicate: true, duel: await viewOf(d, u.id) });   // idempoten
      if (idx > mine.length) return fail(res, 409, 'Jawab soal secara berurutan.');
      const now = Date.now(), late = isLate(d, u.id, now);
      let entry, g = null;
      if (choice === -1) {                       // waktu habis — hanya sah kalau memang sudah lewat batas
        if (!(d.perQ > 0) || now - questionStart(d, u.id) < d.perQ - 800) return fail(res, 400, 'Waktu soal belum habis.');
        entry = { c: -1, ok: false, at: now };
      } else {
        g = gradeAnswer(d.questions[idx], choice);
        if (!g) return fail(res, 400, 'Pilihan jawaban tidak valid.');
        entry = late ? { c: -1, ok: false, at: now } : { c: choice, ok: g.ok, at: now };   // terlambat = dianggap tidak menjawab
      }
      const upd = await q.query(
        `UPDATE duels SET answers = jsonb_set(answers, ARRAY[$2::text], COALESCE(answers -> $2::text, '[]'::jsonb) || $3::jsonb, true), updated_at = now()
          WHERE id=$1 AND status='active' AND jsonb_array_length(COALESCE(answers -> $2::text, '[]'::jsonb)) = $4::int RETURNING *`,
        [d.id, u.id, JSON.stringify(entry), idx]);
      if (!upd.rowCount) return fail(res, 409, 'Jawabanmu tidak dapat disimpan, muat ulang duel.');
      if (entry.c !== -1 && awardXp) awardXp(u.id, 'duel', `${d.id}:${idx}`, entry.ok ? 20 : 5).catch(() => {});
      let nd = rowToDuel(upd.rows[0]);
      const dec = decide(nd);
      if (dec) nd = (await finalize(nd, dec)) || nd;
      else { const other = nd.hostId === u.id ? nd.guestId : nd.hostId; push(other, 'duel', { id: nd.id, kind: 'progress' }); }
      return json(res, 200, { ok: true, timeout: entry.c === -1, result: { ok: entry.ok, correctIdx: d.questions[idx].jawabanBenar, pembahasan: d.questions[idx].pembahasan || '' }, duel: await viewOf(nd, u.id) });
    }
    return fail(res, 404, 'Endpoint tidak ditemukan.');
  }


  // ── STATUS TEMAN ─────────────────────────────────────────────────────────
  // Status publik: semua user login bisa lihat, kecuali pasangan yang saling blokir.
  const VISIBLE = `(p.user_id=$1 OR NOT EXISTS (SELECT 1 FROM friend_links b WHERE b.status='blocked' AND ((b.requester_id=$1 AND b.addressee_id=p.user_id) OR (b.requester_id=p.user_id AND b.addressee_id=$1))))`;
  const FRIEND = `EXISTS (SELECT 1 FROM friend_links l WHERE l.status='accepted' AND ((l.requester_id=$1 AND l.addressee_id=p.user_id) OR (l.requester_id=p.user_id AND l.addressee_id=$1)))`;
  async function status(req, res, u, sub) {
    if (!u) return fail(res, 401, 'Silakan masuk terlebih dahulu.');
    const q = db();
    if (req.method === 'GET' && (sub === '' || sub === '/')) {
      const r = await q.query(
        `SELECT p.id, p.user_id, p.mood, p.message, p.exam_name, p.score_pct, p.created_at, u2.name, u2.username,
                (SELECT COALESCE(jsonb_object_agg(t.e, t.n), '{}'::jsonb) FROM (SELECT emoji AS e, COUNT(*)::int AS n FROM status_reactions r WHERE r.post_id=p.id GROUP BY emoji) t) AS reactions,
                (SELECT emoji FROM status_reactions r WHERE r.post_id=p.id AND r.user_id=$1) AS mine,
                (SELECT COUNT(*)::int FROM status_comments c WHERE c.post_id=p.id) AS comments,
                ${FRIEND} AS friend
           FROM status_posts p JOIN users u2 ON u2.id=p.user_id
          WHERE p.created_at > now() - interval '30 days' AND ${VISIBLE}
          ORDER BY p.created_at DESC LIMIT 50`, [u.id]);
      return json(res, 200, { posts: r.rows.map(x => ({
        id: String(x.id), userId: x.user_id, name: x.name, username: x.username, mood: x.mood, message: x.message,
        examName: x.exam_name, scorePct: x.score_pct, createdAt: new Date(x.created_at).getTime(),
        reactions: x.reactions || {}, mine: x.mine || null, comments: x.comments || 0, own: x.user_id === u.id, friend: !!x.friend })), canModerate: u.role === 'admin', scope: 'public' });
    }
    if (req.method === 'GET' && sub === '/comments') {
      const id = Number(new URL(req.url, 'https://x').searchParams.get('id'));
      if (!Number.isInteger(id)) return fail(res, 400, 'Status tidak valid.');
      const vis = await q.query(`SELECT p.user_id FROM status_posts p WHERE p.id=$2 AND ${VISIBLE}`, [u.id, id]);
      if (!vis.rowCount) return fail(res, 404, 'Status tidak ditemukan.');
      const r = await q.query(`SELECT c.id, c.user_id, c.message, c.created_at, u2.name, u2.username FROM status_comments c JOIN users u2 ON u2.id=c.user_id WHERE c.post_id=$1 ORDER BY c.created_at ASC LIMIT 200`, [id]);
      return json(res, 200, { comments: r.rows.map(x => ({ id: String(x.id), userId: x.user_id, name: x.name, username: x.username, message: x.message, createdAt: new Date(x.created_at).getTime(), own: x.user_id === u.id, canDelete: x.user_id === u.id || vis.rows[0].user_id === u.id || u.role === 'admin' })) });
    }
    if (req.method !== 'POST') return fail(res, 405, 'Method tidak diizinkan.');
    origin(req); if (!limit(req, res, 40)) return;
    const input = await body(req, 4000);
    if (sub === '' || sub === '/') {
      const c = cleanStatus(input);
      if (c.error) return fail(res, 400, c.error);
      const n = (await q.query(`SELECT COUNT(*)::int AS n FROM status_posts WHERE user_id=$1 AND created_at > now() - interval '24 hours'`, [u.id])).rows[0].n;
      if (n >= DAILY_LIMIT) return fail(res, 429, `Batas ${DAILY_LIMIT} status per hari tercapai. Coba lagi besok.`);
      const v = c.value;
      const r = await q.query(`INSERT INTO status_posts (user_id, mood, message, exam_name, score_pct) VALUES ($1,$2,$3,$4,$5) RETURNING id`, [u.id, v.mood, v.message, v.examName, v.scorePct]);
      const fr = await q.query(`SELECT CASE WHEN requester_id=$1 THEN addressee_id ELSE requester_id END AS fid FROM friend_links WHERE status='accepted' AND (requester_id=$1 OR addressee_id=$1)`, [u.id]);
      for (const x of fr.rows) push(x.fid, 'status', { kind: 'new', id: String(r.rows[0].id), from: { name: u.name, username: u.username } });
      return json(res, 200, { ok: true, id: String(r.rows[0].id) });
    }
    if (sub === '/react') {
      const id = Number(input.id), emoji = cleanReaction(input.emoji);
      if (!Number.isInteger(id) || emoji === undefined) return fail(res, 400, 'Reaksi tidak valid.');
      const vis = await q.query(`SELECT p.user_id FROM status_posts p WHERE p.id=$2 AND ${VISIBLE}`, [u.id, id]);
      if (!vis.rowCount) return fail(res, 404, 'Status tidak ditemukan.');
      if (emoji === null) await q.query('DELETE FROM status_reactions WHERE post_id=$1 AND user_id=$2', [id, u.id]);
      else {
        await q.query(`INSERT INTO status_reactions (post_id, user_id, emoji) VALUES ($1,$2,$3) ON CONFLICT (post_id, user_id) DO UPDATE SET emoji=EXCLUDED.emoji, created_at=now()`, [id, u.id, emoji]);
        if (vis.rows[0].user_id !== u.id) push(vis.rows[0].user_id, 'status', { kind: 'reaction', emoji, from: { name: u.name, username: u.username } });
      }
      return json(res, 200, { ok: true });
    }
    if (sub === '/comment') {
      const id = Number(input.id), c = cleanComment(input);
      if (!Number.isInteger(id)) return fail(res, 400, 'Status tidak valid.');
      if (c.error) return fail(res, 400, c.error);
      const vis = await q.query(`SELECT p.user_id FROM status_posts p WHERE p.id=$2 AND ${VISIBLE}`, [u.id, id]);
      if (!vis.rowCount) return fail(res, 404, 'Status tidak ditemukan.');
      const n = (await q.query(`SELECT COUNT(*)::int AS n FROM status_comments WHERE user_id=$1 AND created_at > now() - interval '24 hours'`, [u.id])).rows[0].n;
      if (n >= COMMENT_DAILY_LIMIT) return fail(res, 429, `Batas ${COMMENT_DAILY_LIMIT} komentar per hari tercapai.`);
      const r = await q.query(`INSERT INTO status_comments (post_id, user_id, message) VALUES ($1,$2,$3) RETURNING id`, [id, u.id, c.value.message]);
      if (vis.rows[0].user_id !== u.id) push(vis.rows[0].user_id, 'status', { kind: 'comment', id: String(id), from: { name: u.name, username: u.username } });
      return json(res, 200, { ok: true, id: String(r.rows[0].id) });
    }
    if (sub === '/comment/delete') {
      const id = Number(input.id); if (!Number.isInteger(id)) return fail(res, 400, 'Komentar tidak valid.');
      await q.query(`DELETE FROM status_comments c USING status_posts p WHERE c.id=$1 AND p.id=c.post_id AND (c.user_id=$2 OR p.user_id=$2 OR $3::boolean)`, [id, u.id, u.role === 'admin']);
      return json(res, 200, { ok: true });
    }
    if (sub === '/delete') {
      const id = Number(input.id); if (!Number.isInteger(id)) return fail(res, 400, 'Status tidak valid.');
      await q.query(`DELETE FROM status_posts WHERE id=$1 AND (user_id=$2 OR $3::boolean)`, [id, u.id, u.role === 'admin']);
      return json(res, 200, { ok: true });
    }
    return fail(res, 404, 'Endpoint tidak ditemukan.');
  }

  // ── PEMBERSIHAN OTOMATIS ─────────────────────────────────────────────────
  async function sweep() {
    const q = db();
    const act = await q.query(`SELECT * FROM duels WHERE status='active' AND started_at < now() - interval '1 minute' LIMIT 200`);
    for (const row of act.rows) { const d = rowToDuel(row); const dec = decide(d); if (dec) await finalize(d, dec); }
    const w = await q.query(`UPDATE duels SET status='cancelled', updated_at=now() WHERE status='waiting' AND created_at < now() - ($1::int * interval '1 millisecond') RETURNING id, host_id`, [WAIT_MAX_MS]);
    for (const x of w.rows) push(x.host_id, 'duel', { id: x.id, kind: 'cancelled' });
    await q.query(`DELETE FROM duels WHERE status IN ('finished','cancelled') AND updated_at < now() - interval '30 days'`);
    await q.query(`DELETE FROM status_posts WHERE created_at < now() - interval '90 days'`);
    await q.query(`DELETE FROM chat_messages WHERE created_at < now() - interval '2 days'`).catch(() => {});
  }
  function startSweeper() {
    if (sweeper) return;
    sweeper = setInterval(() => sweep().catch(e => console.error('Sweep duel gagal:', e?.message || e)), 60_000);
    sweeper.unref?.();
  }

  return { stream, friends, duels, status, sweep };
}
