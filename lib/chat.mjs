// Chat 1-lawan-1. Pesan otomatis hilang setelah 48 jam. Dipasang dari app.mjs lewat createChat(helpers).
import { push, isOnline } from './stream.mjs';
import { sendPush, vapidFromEnv } from './webpush.mjs';
import { cleanMessage, RETENTION_HOURS, DAILY_LIMIT, badgesOf, isOpen, canChat } from './chat-logic.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FRESH = `created_at > now() - interval '${RETENTION_HOURS} hours'`;

export function createChat({ getPool, json, fail, body, origin, limit }) {
  const db = () => getPool();

  async function relation(a, b) {
    const r = await db().query(`SELECT requester_id, status FROM friend_links WHERE (requester_id=$1 AND addressee_id=$2) OR (requester_id=$2 AND addressee_id=$1)`, [a, b]);
    let friend = null, blocked = false;
    for (const x of r.rows) { if (x.status === 'blocked') blocked = true; else if (x.status === 'accepted') friend = 'accepted'; }
    return { friend, blocked };
  }

  const vapid = vapidFromEnv();
  /** Kirim notifikasi HP ke semua perangkat penerima. Gagal tidak boleh mengganggu chat. */
  async function pushTo(userId, payload) {
    if (!vapid) return;
    try {
      const subs = (await db().query('SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id=$1 LIMIT 10', [userId])).rows;
      await Promise.all(subs.map(async s => {
        try {
          const r = await sendPush(s, payload, vapid);
          if (r.gone) await db().query('DELETE FROM push_subscriptions WHERE endpoint=$1', [s.endpoint]);
        } catch {}
      }));
    } catch {}
  }

  async function chat(req, res, u, sub) {
    if (!u) return fail(res, 401, 'Silakan masuk terlebih dahulu.');
    const q = db();
    if (sub === '/push/key' && req.method === 'GET') return json(res, 200, { enabled: !!vapid, key: vapid?.publicKey || null });
    if (sub === '/push/subscribe' && req.method === 'POST') {
      origin(req); if (!limit(req, res, 20)) return;
      if (!vapid) return fail(res, 503, 'Notifikasi belum diaktifkan di server.');
      const i = await body(req, 4000), e = String(i.endpoint || ''), k = i.keys || {};
      if (!/^https:\/\/.{10,500}$/.test(e) || !k.p256dh || !k.auth || String(k.p256dh).length > 120 || String(k.auth).length > 40) return fail(res, 400, 'Langganan tidak valid.');
      await q.query(`INSERT INTO push_subscriptions (endpoint, user_id, p256dh, auth, user_agent) VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (endpoint) DO UPDATE SET user_id=EXCLUDED.user_id, p256dh=EXCLUDED.p256dh, auth=EXCLUDED.auth`, [e, u.id, String(k.p256dh), String(k.auth), String(req.headers['user-agent'] || '').slice(0, 200)]);
      return json(res, 200, { ok: true });
    }
    if (sub === '/push/unsubscribe' && req.method === 'POST') {
      origin(req);
      const i = await body(req, 2000);
      await q.query('DELETE FROM push_subscriptions WHERE endpoint=$1 AND user_id=$2', [String(i.endpoint || ''), u.id]);
      return json(res, 200, { ok: true });
    }
    if (req.method === 'GET' && sub === '/users') {
      const [us, fl, last, unread] = await Promise.all([
        q.query(`SELECT id, name, username, role, is_mentor FROM users WHERE id<>$1 LIMIT 600`, [u.id]),
        q.query(`SELECT requester_id, addressee_id, status FROM friend_links WHERE requester_id=$1 OR addressee_id=$1`, [u.id]),
        q.query(`SELECT DISTINCT ON (peer) peer, body, created_at, sender_id FROM (
                   SELECT CASE WHEN sender_id=$1 THEN recipient_id ELSE sender_id END AS peer, body, created_at, sender_id
                     FROM chat_messages WHERE (sender_id=$1 OR recipient_id=$1) AND ${FRESH}) t ORDER BY peer, created_at DESC`, [u.id]),
        q.query(`SELECT sender_id, COUNT(*)::int AS n FROM chat_messages WHERE recipient_id=$1 AND read_at IS NULL AND ${FRESH} GROUP BY sender_id`, [u.id])
      ]);
      const rel = new Map();
      for (const l of fl.rows) {
        const other = l.requester_id === u.id ? l.addressee_id : l.requester_id;
        const cur = rel.get(other) || {};
        if (l.status === 'blocked') cur.blocked = true;
        else if (l.status === 'accepted') cur.friend = 'accepted';
        else if (l.status === 'pending') cur.friend = l.requester_id === u.id ? 'outgoing' : 'incoming';
        rel.set(other, cur);
      }
      const lastBy = new Map(last.rows.map(x => [x.peer, x])), unBy = new Map(unread.rows.map(x => [x.sender_id, x.n]));
      const meOpen = isOpen(u);
      const list = us.rows.filter(x => !rel.get(x.id)?.blocked).map(x => {
        const r = rel.get(x.id) || {}, lm = lastBy.get(x.id);
        return {
          id: x.id, name: x.name, username: x.username, badges: badgesOf(x), online: isOnline(x.id), friend: r.friend || null,
          canChat: canChat({ friend: r.friend, blocked: false, aOpen: meOpen, bOpen: isOpen(x) }),
          unread: unBy.get(x.id) || 0, lastText: lm ? (lm.sender_id === u.id ? 'Kamu: ' : '') + String(lm.body).slice(0, 60) : '', lastAt: lm ? new Date(lm.created_at).getTime() : 0
        };
      });
      const tier = x => x.badges.includes('admin') ? 0 : x.badges.includes('helper') ? 1 : x.badges.includes('mentor') ? 2 : 3;
      list.sort((a, b) => (tier(a) - tier(b)) || ((a.friend === 'accepted' ? 0 : 1) - (b.friend === 'accepted' ? 0 : 1)) || ((b.online ? 1 : 0) - (a.online ? 1 : 0)) || String(a.name).localeCompare(String(b.name), 'id'));
      return json(res, 200, { users: list, unread: list.reduce((n, x) => n + x.unread, 0), retentionHours: RETENTION_HOURS });
    }
    if (req.method === 'GET' && sub === '/unread') {
      const r = await q.query(`SELECT COUNT(*)::int AS n FROM chat_messages WHERE recipient_id=$1 AND read_at IS NULL AND ${FRESH}`, [u.id]);
      return json(res, 200, { unread: r.rows[0].n });
    }
    if (req.method === 'GET' && sub === '/messages') {
      const other = new URL(req.url, 'https://x').searchParams.get('with') || '';
      if (!UUID.test(other)) return fail(res, 400, 'Pengguna tidak valid.');
      const peer = await q.query('SELECT id, name, username, role, is_mentor FROM users WHERE id=$1', [other]);
      if (!peer.rowCount) return fail(res, 404, 'Pengguna tidak ditemukan.');
      const rel = await relation(u.id, other);
      if (rel.blocked) return fail(res, 403, 'Chat tidak tersedia.');
      const r = await q.query(`SELECT id, sender_id, body, created_at FROM chat_messages
        WHERE ((sender_id=$1 AND recipient_id=$2) OR (sender_id=$2 AND recipient_id=$1)) AND ${FRESH} ORDER BY created_at ASC, id ASC LIMIT 300`, [u.id, other]);
      await q.query(`UPDATE chat_messages SET read_at=now() WHERE recipient_id=$1 AND sender_id=$2 AND read_at IS NULL`, [u.id, other]);
      const p = peer.rows[0];
      return json(res, 200, {
        peer: { id: p.id, name: p.name, username: p.username, badges: badgesOf(p), online: isOnline(p.id), friend: rel.friend },
        canChat: canChat({ friend: rel.friend, blocked: false, aOpen: isOpen(u), bOpen: isOpen(p) }),
        retentionHours: RETENTION_HOURS,
        messages: r.rows.map(x => ({ id: String(x.id), mine: x.sender_id === u.id, text: x.body, at: new Date(x.created_at).getTime() }))
      });
    }
    if (req.method === 'POST' && sub === '/send') {
      origin(req); if (!limit(req, res, 40)) return;
      const input = await body(req, 4000);
      const to = String(input.to || ''), c = cleanMessage(input.text);
      if (!UUID.test(to) || to === u.id) return fail(res, 400, 'Penerima tidak valid.');
      if (c.error) return fail(res, 400, c.error);
      const peer = await q.query('SELECT id, name, username, role, is_mentor FROM users WHERE id=$1', [to]);
      if (!peer.rowCount) return fail(res, 404, 'Pengguna tidak ditemukan.');
      const rel = await relation(u.id, to);
      if (!canChat({ friend: rel.friend, blocked: rel.blocked, aOpen: isOpen(u), bOpen: isOpen(peer.rows[0]) }))
        return fail(res, 403, rel.blocked ? 'Chat tidak tersedia.' : 'Tambahkan sebagai teman dulu untuk mulai chat.');
      const n = (await q.query(`SELECT COUNT(*)::int AS n FROM chat_messages WHERE sender_id=$1 AND created_at > now() - interval '24 hours'`, [u.id])).rows[0].n;
      if (n >= DAILY_LIMIT) return fail(res, 429, 'Batas pesan harian tercapai.');
      const r = await q.query(`INSERT INTO chat_messages (sender_id, recipient_id, body) VALUES ($1,$2,$3) RETURNING id, created_at`, [u.id, to, c.value]);
      if (Math.random() < 0.05) q.query(`DELETE FROM chat_messages WHERE created_at < now() - interval '${RETENTION_HOURS} hours'`).catch(() => {});
      push(to, 'chat', { kind: 'message', id: String(r.rows[0].id), from: { id: u.id, name: u.name, username: u.username }, text: c.value.slice(0, 80) });
      pushTo(to, { title: u.name || 'Pesan baru', body: c.value.slice(0, 120), tag: 'chat-' + u.id, url: './app.html?chat=' + u.id });
      return json(res, 200, { ok: true, message: { id: String(r.rows[0].id), mine: true, text: c.value, at: new Date(r.rows[0].created_at).getTime() } });
    }
    return fail(res, 404, 'Endpoint tidak ditemukan.');
  }
  const sweep = () => db().query(`DELETE FROM chat_messages WHERE created_at < now() - interval '${RETENTION_HOURS} hours'`);
  return { chat, sweep };
}
