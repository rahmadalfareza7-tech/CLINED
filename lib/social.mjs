// Teman & duel. Dipasang dari app.mjs lewat createSocial(helpers).
import { randomUUID } from 'node:crypto';
import { push, broadcast, isOnline, openStream, setPresence, dropConn } from './stream.mjs';
import { cleanStatus, cleanReaction, cleanComment, DAILY_LIMIT, COMMENT_DAILY_LIMIT } from './status-logic.mjs';
import { makeCode, normalizeCode, pickQuestions, pickQuestionsAcrossBanks, canonicalDuelBlock, duelBlockLabel, gradeAnswer, decide, viewFor, isLate, questionStart, WAIT_MAX_MS, TIME_OPTIONS, MODES, WAGERS, EMOTES, RANK_TIERS, rankFromRp, calcMatchRpDelta, duelMeta, cleanShowcaseCard } from './duel-logic.mjs';
import { userAvatarUrl, userDecoUrl, userBannerUrl, userNameColor } from './http.mjs';
import { is100kBadgeVisible, ensure100kBadgeColumn } from './xp-milestone.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function gladiatorTitle(wins) {
  if (wins >= 25) return { icon: '👑', name: 'Grandmaster Gladiator' };
  if (wins >= 15) return { icon: '⚔️', name: 'Gladiator Klinik' };
  if (wins >= 8) return { icon: '🔥', name: 'Arena Champion' };
  if (wins >= 3) return { icon: '🛡️', name: 'Duelist Tangguh' };
  return { icon: '🗡️', name: 'Petarung Baru' };
}

export function createSocial({ getPool, json, fail, body, origin, limit, awardXp }) {
  const db = () => getPool();
  let sweeper = null;

  const rowToDuel = r => ({
    id: r.id, code: r.code, hostId: r.host_id, guestId: r.guest_id, invitedId: r.invited_id,
    bankId: r.bank_id, bankName: r.bank_name, status: r.status, questions: r.questions || [], answers: r.answers || {},
    createdAt: r.created_at ? new Date(r.created_at).getTime() : 0,
    startedAt: r.started_at ? new Date(r.started_at).getTime() : 0, winnerId: r.winner_id, reason: r.reason || '', perQ: Number(r.per_q_ms) || 0
  });
  const notifyOpenRooms = (reason, duelId = null) => {
    try { broadcast('duel_lobby', { kind: 'open_rooms', reason, id: duelId, at: Date.now() }); } catch {}
  };
  async function people(ids) {
    const list = [...new Set(ids.filter(Boolean))]; if (!list.length) return {};
    await ensure100kBadgeColumn(db());
    const r = await db().query(`SELECT id,name,username,role,badge_100k_at,badge_100k_visible,(avatar_url IS NOT NULL) AS avatar_url,chat_avatar_deco,CASE WHEN chat_banner_url LIKE 'preset:%' THEN chat_banner_url WHEN chat_banner_url IS NOT NULL THEN 'custom' ELSE NULL END AS chat_banner_url,chat_name_color,updated_at FROM users WHERE id = ANY($1::uuid[])`, [list]);
    return Object.fromEntries(r.rows.map(x => [x.id, { name: x.name, username: x.username, xp100k: is100kBadgeVisible(x), avatarUrl: userAvatarUrl(x), avatarDeco: userDecoUrl(x), bannerUrl: userBannerUrl(x), nameColor: userNameColor(x) }]));
  }
  async function areFriends(a, b) {
    const r = await db().query(`SELECT 1 FROM friend_links WHERE status='accepted' AND ((requester_id=$1 AND addressee_id=$2) OR (requester_id=$2 AND addressee_id=$1)) LIMIT 1`, [a, b]);
    return r.rowCount > 0;
  }
  async function isBlocked(a, b) {
    const r = await db().query(`SELECT 1 FROM friend_links WHERE status='blocked' AND ((requester_id=$1 AND addressee_id=$2) OR (requester_id=$2 AND addressee_id=$1)) LIMIT 1`, [a, b]);
    return r.rowCount > 0;
  }
  const viewOf = async (d, me) => {
    const v = viewFor(d, me, await people([d.hostId, d.guestId, d.invitedId]), isOnline);
    return enrichViewWithRank(v, d, me);
  };

  // ── STREAM ───────────────────────────────────────────────────────────────
  async function stream(req, res, u, sub = '') {
    if (!u) return fail(res, 401, 'Silakan masuk terlebih dahulu.');
    if (sub === '/presence') {
      if (req.method !== 'POST') return fail(res, 405, 'Method tidak diizinkan.');
      origin(req);
      if (!limit(req, res, 120)) return;
      const input = await body(req, 1024);
      const connId = String(input.connId || '').slice(0, 64);
      const state = String(input.state || '');
      if (state === 'offline') dropConn(u.id, connId);
      else if (state === 'visible' || state === 'hidden') setPresence(u.id, connId, state);
      else return fail(res, 400, 'Status presence tidak valid.');
      return json(res, 200, { ok: true });
    }
    if (sub && sub !== '/') return fail(res, 404, 'Endpoint tidak ditemukan.');
    if (req.method !== 'GET') return fail(res, 405, 'Method tidak diizinkan.');
    startSweeper();
    const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    const visible = url.searchParams.get('vis') !== '0';
    return openStream(req, res, u.id, { sessionId: u.session_id, expiresAt: u.session_expires_at, visible });
  }

  // ── TEMAN ────────────────────────────────────────────────────────────────
  async function friends(req, res, u, sub) {
    if (!u) return fail(res, 401, 'Silakan masuk terlebih dahulu.');
    if (req.method !== 'GET') { origin(req); if (!limit(req, res, 40)) return; }
    const q = db();
    if (req.method === 'GET' && (sub === '' || sub === '/')) {
      const r = await q.query(
        `SELECT l.id, l.requester_id, l.addressee_id, l.status, u2.id AS other_id, u2.name, u2.username, (u2.avatar_url IS NOT NULL) AS avatar_url, u2.chat_avatar_deco, u2.updated_at
           FROM friend_links l JOIN users u2 ON u2.id = CASE WHEN l.requester_id=$1 THEN l.addressee_id ELSE l.requester_id END
          WHERE (l.requester_id=$1 OR l.addressee_id=$1) AND l.status IN ('pending','accepted') ORDER BY l.updated_at DESC LIMIT 300`, [u.id]);
      const bl = await q.query(
        `SELECT u2.id, u2.name, u2.username, (u2.avatar_url IS NOT NULL) AS avatar_url, u2.chat_avatar_deco, u2.updated_at FROM friend_links l JOIN users u2 ON u2.id=l.addressee_id
          WHERE l.requester_id=$1 AND l.status='blocked' ORDER BY l.updated_at DESC LIMIT 100`, [u.id]);
      const out = { friends: [], incoming: [], outgoing: [], blocked: bl.rows.map(x => ({ id: x.id, name: x.name, username: x.username, avatarUrl: userAvatarUrl(x), avatarDeco: userDecoUrl(x) })) };
      for (const x of r.rows) {
        const p = { linkId: x.id, id: x.other_id, name: x.name, username: x.username, avatarUrl: userAvatarUrl({ id: x.other_id, avatar_url: x.avatar_url, updated_at: x.updated_at }), avatarDeco: userDecoUrl(x) };
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
    const { wager } = duelMeta(nd);
    if (nd.winnerId && awardXp) {
      awardXp(nd.winnerId, 'duel', `${nd.id}:win`, Math.min(60, 30 + wager)).catch(() => {});
      if (wager > 0) awardXp(nd.winnerId, 'duel', `${nd.id}:wager`, Math.min(60, wager)).catch(() => {});
    }
    await syncDuelCareerStats(db()).catch(() => {});
    for (const id of [nd.hostId, nd.guestId]) if (id) push(id, 'duel', { id: nd.id, kind: 'finished' });
    return nd;
  }
  async function load(id) {
    if (!UUID.test(id)) return null;
    const r = await db().query('SELECT * FROM duels WHERE id=$1', [id]);
    return r.rowCount ? rowToDuel(r.rows[0]) : null;
  }
  const member = (d, uid) => d.hostId === uid || d.guestId === uid;

  let careerTablesReady = false;
  async function ensureDuelCareerTables(q) {
    if (careerTablesReady) return;
    await q.query(`CREATE TABLE IF NOT EXISTS duel_career_stats (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      draws INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL DEFAULT 0,
      streak INTEGER NOT NULL DEFAULT 0,
      best_streak INTEGER NOT NULL DEFAULT 0,
      rp INTEGER NOT NULL DEFAULT 0,
      last_card JSONB,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_duel_career_stats_rp ON duel_career_stats (rp DESC, wins DESC)`);
    await q.query(`CREATE TABLE IF NOT EXISTS duel_career_applied (
      duel_id UUID PRIMARY KEY REFERENCES duels(id) ON DELETE CASCADE,
      host_rp_delta INTEGER NOT NULL DEFAULT 0,
      host_prev_rp INTEGER NOT NULL DEFAULT 0,
      host_new_rp INTEGER NOT NULL DEFAULT 0,
      guest_rp_delta INTEGER NOT NULL DEFAULT 0,
      guest_prev_rp INTEGER NOT NULL DEFAULT 0,
      guest_new_rp INTEGER NOT NULL DEFAULT 0,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    careerTablesReady = true;
  }

  async function syncDuelCareerStats(q) {
    await ensureDuelCareerTables(q);
    const check = await q.query(
      `SELECT 1 FROM duels d
        WHERE d.status='finished' AND d.guest_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM duel_career_applied a WHERE a.duel_id = d.id)
        LIMIT 1`
    );
    if (!check.rowCount) return;

    const client = await db().connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT pg_advisory_xact_lock(74219031)`);
      const pending = await client.query(
        `SELECT d.id, d.host_id, d.guest_id, d.winner_id, d.reason, d.answers
           FROM duels d
          WHERE d.status='finished' AND d.guest_id IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM duel_career_applied a WHERE a.duel_id = d.id)
          ORDER BY d.finished_at ASC NULLS LAST, d.updated_at ASC, d.id ASC`
      );
      if (pending.rowCount) {
        const uids = new Set();
        for (const r of pending.rows) { if (r.host_id) uids.add(r.host_id); if (r.guest_id) uids.add(r.guest_id); }
        const uidArr = [...uids];
        const curStats = await client.query(
          `SELECT * FROM duel_career_stats WHERE user_id = ANY($1::uuid[]) FOR UPDATE`,
          [uidArr]
        );
        const byU = new Map();
        for (const row of curStats.rows) {
          byU.set(row.user_id, {
            wins: Number(row.wins) || 0,
            losses: Number(row.losses) || 0,
            draws: Number(row.draws) || 0,
            total: Number(row.total) || 0,
            streak: Number(row.streak) || 0,
            bestStreak: Number(row.best_streak) || 0,
            rp: Number(row.rp) || 0,
            card: row.last_card || null,
          });
        }
        const getU = uid => {
          if (!byU.has(uid)) byU.set(uid, { wins: 0, losses: 0, draws: 0, total: 0, streak: 0, bestStreak: 0, rp: 0, card: null });
          return byU.get(uid);
        };
        const touched = new Set();
        for (const row of pending.rows) {
          const h = row.host_id, g = row.guest_id, w = row.winner_id;
          if (!h || !g) continue;
          const hs = getU(h), gs = getU(g);
          const { mode, wager, hostCard, guestCard } = duelMeta({ answers: row.answers });
          if (hostCard) hs.card = hostCard;
          if (guestCard) gs.card = guestCard;
          const reason = row.reason || '';
          hs.total++; gs.total++;
          let hOutcome = 'draw', gOutcome = 'draw';
          if (!w) {
            hs.draws++; gs.draws++;
            hs.streak = 0; gs.streak = 0;
          } else if (w === h) {
            hOutcome = 'win'; gOutcome = 'loss';
            hs.wins++; hs.streak++; if (hs.streak > hs.bestStreak) hs.bestStreak = hs.streak;
            gs.losses++; gs.streak = 0;
          } else if (w === g) {
            gOutcome = 'win'; hOutcome = 'loss';
            gs.wins++; gs.streak++; if (gs.streak > gs.bestStreak) gs.bestStreak = gs.streak;
            hs.losses++; hs.streak = 0;
          }
          const hPrevRp = hs.rp, gPrevRp = gs.rp;
          const hDelta = calcMatchRpDelta({ outcome: hOutcome, currentRp: hPrevRp, streak: hs.streak, mode, wager, reason });
          const gDelta = calcMatchRpDelta({ outcome: gOutcome, currentRp: gPrevRp, streak: gs.streak, mode, wager, reason });
          hs.rp = Math.max(0, hPrevRp + hDelta);
          gs.rp = Math.max(0, gPrevRp + gDelta);
          touched.add(h); touched.add(g);
          await client.query(
            `INSERT INTO duel_career_applied (duel_id, host_rp_delta, host_prev_rp, host_new_rp, guest_rp_delta, guest_prev_rp, guest_new_rp)
             VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
            [row.id, hDelta, hPrevRp, hs.rp, gDelta, gPrevRp, gs.rp]
          );
        }
        for (const uid of touched) {
          const s = byU.get(uid);
          await client.query(
            `INSERT INTO duel_career_stats (user_id, wins, losses, draws, total, streak, best_streak, rp, last_card, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,now())
             ON CONFLICT (user_id) DO UPDATE SET
               wins=EXCLUDED.wins, losses=EXCLUDED.losses, draws=EXCLUDED.draws,
               total=EXCLUDED.total, streak=EXCLUDED.streak, best_streak=EXCLUDED.best_streak,
               rp=EXCLUDED.rp, last_card=COALESCE(EXCLUDED.last_card, duel_career_stats.last_card), updated_at=now()`,
            [uid, s.wins, s.losses, s.draws, s.total, s.streak, s.bestStreak, s.rp, s.card ? JSON.stringify(s.card) : null]
          );
        }
      }
      await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  }

  async function buildDuelCareerAndLeaderboard(q, myId) {
    await syncDuelCareerStats(q);
    const [statsRes, h2hRes, deltasRes] = await Promise.all([
      q.query(
        `SELECT s.user_id, s.wins, s.losses, s.draws, s.total, s.streak, s.best_streak, s.rp, s.last_card
           FROM duel_career_stats s
           JOIN users u ON u.id = s.user_id
          WHERE s.total > 0`
      ),
      q.query(
        `SELECT host_id, guest_id, winner_id
           FROM duels
          WHERE status='finished' AND guest_id IS NOT NULL AND (host_id=$1 OR guest_id=$1)`,
        [myId]
      ),
      q.query(
        `SELECT d.id, d.host_id, d.guest_id, a.host_rp_delta, a.host_prev_rp, a.host_new_rp,
                a.guest_rp_delta, a.guest_prev_rp, a.guest_new_rp
           FROM duel_career_applied a
           JOIN duels d ON d.id = a.duel_id
          WHERE d.host_id=$1 OR d.guest_id=$1
          ORDER BY d.finished_at DESC NULLS LAST
          LIMIT 50`,
        [myId]
      )
    ]);

    const byUser = new Map();
    for (const row of statsRes.rows) {
      byUser.set(row.user_id, {
        wins: Number(row.wins) || 0,
        losses: Number(row.losses) || 0,
        draws: Number(row.draws) || 0,
        total: Number(row.total) || 0,
        streak: Number(row.streak) || 0,
        bestStreak: Number(row.best_streak) || 0,
        rp: Number(row.rp) || 0,
        card: row.last_card || null,
      });
    }
    const h2h = {};
    for (const row of h2hRes.rows) {
      const oppId = row.host_id === myId ? row.guest_id : row.host_id;
      if (!oppId) continue;
      if (!h2h[oppId]) h2h[oppId] = { wins: 0, losses: 0, draws: 0 };
      if (!row.winner_id) h2h[oppId].draws++;
      else if (row.winner_id === myId) h2h[oppId].wins++;
      else h2h[oppId].losses++;
    }
    const duelDeltas = new Map();
    for (const row of deltasRes.rows) {
      if (row.host_id) duelDeltas.set(`${row.id}:${row.host_id}`, { rpDelta: row.host_rp_delta, prevRp: row.host_prev_rp, newRp: row.host_new_rp });
      if (row.guest_id) duelDeltas.set(`${row.id}:${row.guest_id}`, { rpDelta: row.guest_rp_delta, prevRp: row.guest_prev_rp, newRp: row.guest_new_rp });
    }

    const meRaw = byUser.get(myId) || { wins: 0, losses: 0, draws: 0, total: 0, streak: 0, bestStreak: 0, rp: 0, card: null };
    const myRank = rankFromRp(meRaw.rp);
    const myStats = {
      ...meRaw,
      winRate: meRaw.total ? Math.round((meRaw.wins / meRaw.total) * 100) : 0,
      title: gladiatorTitle(meRaw.wins),
      rank: myRank
    };
    await ensure100kBadgeColumn(q);
    const hiddenAdminsRes = await q.query(
      `SELECT id FROM users WHERE role = 'admin' AND COALESCE(show_in_leaderboard, false) = false`
    ).catch(() => ({ rows: [] }));
    const hiddenAdminIds = new Set(hiddenAdminsRes.rows.map(r => r.id));
    const sortedIds = [...byUser.entries()]
      .filter(([uid, s]) => s.total > 0 && !hiddenAdminIds.has(uid))
      .sort((a, b) => (b[1].rp - a[1].rp) || (b[1].wins - a[1].wins) || ((b[1].wins / b[1].total) - (a[1].wins / a[1].total)) || (b[1].bestStreak - a[1].bestStreak))
      .map(([uid]) => uid);
    const myPlace = sortedIds.indexOf(myId);
    const topIds = sortedIds.slice(0, 50);
    if (myPlace >= 50) topIds.push(myId);
    const ppl = await people(topIds);
    const fullLeaderboard = topIds.map((uid) => {
      const idx = sortedIds.indexOf(uid);
      const s = byUser.get(uid);
      const p = ppl[uid] || { name: 'Pemain', username: '' };
      return {
        rank: idx + 1,
        id: uid,
        me: uid === myId,
        name: p.name,
        username: p.username,
        avatarUrl: p.avatarUrl || '',
        avatarDeco: p.avatarDeco || '',
        bannerUrl: p.bannerUrl || '',
        nameColor: p.nameColor || '',
        xp100k: Boolean(p.xp100k),
        online: isOnline(uid),
        wins: s.wins,
        losses: s.losses,
        draws: s.draws,
        total: s.total,
        rp: s.rp,
        tier: rankFromRp(s.rp),
        card: s.card || null,
        winRate: s.total ? Math.round((s.wins / s.total) * 100) : 0,
        bestStreak: s.bestStreak,
        title: gladiatorTitle(s.wins)
      };
    });
    const leaderboard = fullLeaderboard.slice(0, 10);
    return { myStats, h2h, leaderboard, leaderboardFull: fullLeaderboard, byUser, duelDeltas };
  }

  async function enrichViewWithRank(v, d, me) {
    try {
      const career = await buildDuelCareerAndLeaderboard(db(), me);
      const myU = career.byUser.get(me);
      v.me.rank = rankFromRp(myU?.rp || 0);
      if (!v.me.card && myU?.card) v.me.card = myU.card;
      if (v.opponent && v.opponent.id) {
        const opU = career.byUser.get(v.opponent.id);
        v.opponent.rank = rankFromRp(opU?.rp || 0);
        if (!v.opponent.card && opU?.card) v.opponent.card = opU.card;
      }
      if (v.result && d?.id) {
        const dd = career.duelDeltas.get(`${d.id}:${me}`);
        if (dd) {
          const prevRank = rankFromRp(dd.prevRp);
          const newRank = rankFromRp(dd.newRp);
          v.result.rpDelta = dd.rpDelta;
          v.result.prevRank = prevRank;
          v.result.newRank = newRank;
          v.result.rankUp = newRank.fullName !== prevRank.fullName && newRank.rp > prevRank.rp;
        } else {
          v.result.rpDelta = 0;
          v.result.newRank = v.me.rank;
        }
      }
    } catch {}
    return v;
  }

  async function loadDuelBlocksCatalog(q) {
    const [qbRes, pkgRes] = await Promise.all([
      q.query(`SELECT id, block, jsonb_array_length(CASE WHEN jsonb_typeof(questions)='array' THEN questions ELSE '[]'::jsonb END) AS cnt FROM question_banks WHERE published=true`),
      q.query(`SELECT id, block, jsonb_array_length(CASE WHEN jsonb_typeof(questions)='array' THEN questions ELSE '[]'::jsonb END) AS cnt FROM content_packages WHERE module='UAB' AND visibility='public'`).catch(() => ({ rows: [] }))
    ]);
    const map = new Map();
    const addRow = row => {
      const cnt = Number(row.cnt) || 0;
      if (cnt <= 0) return;
      const b = canonicalDuelBlock(row.block);
      if (!b || b === 'OTHER') return;
      const cur = map.get(b) || { block: b, label: duelBlockLabel(b), bankCount: 0, questionCount: 0 };
      cur.bankCount += 1;
      cur.questionCount += cnt;
      map.set(b, cur);
    };
    for (const row of qbRes.rows) addRow(row);
    for (const row of pkgRes.rows) addRow(row);
    return [...map.values()]
      .filter(x => x.questionCount >= 5)
      .sort((a, b) => a.block.localeCompare(b.block, 'id'));
  }

  async function resolveDuelQuestions(q, input, count, { allowFallbackBlock = false } = {}) {
    const rawBlock = String(input?.block || '').trim();
    const rawBankId = String(input?.bankId || '').trim().slice(0, 80);
    let targetBlock = rawBlock
      ? canonicalDuelBlock(rawBlock)
      : (/^block:/i.test(rawBankId) ? canonicalDuelBlock(rawBankId) : '');

    if (!targetBlock && !rawBankId && allowFallbackBlock) {
      const blocks = await loadDuelBlocksCatalog(q);
      targetBlock = blocks[0]?.block || '';
    }

    if (targetBlock) {
      const [qbRes, pkgRes] = await Promise.all([
        q.query('SELECT id, name, block, questions FROM question_banks WHERE published=true'),
        q.query(`SELECT id, title AS name, block, questions FROM content_packages WHERE module='UAB' AND visibility='public'`).catch(() => ({ rows: [] }))
      ]);
      const lists = [];
      for (const row of qbRes.rows) {
        if (canonicalDuelBlock(row.block) === targetBlock && Array.isArray(row.questions) && row.questions.length) {
          lists.push(row.questions);
        }
      }
      for (const row of pkgRes.rows) {
        if (canonicalDuelBlock(row.block) === targetBlock && Array.isArray(row.questions) && row.questions.length) {
          lists.push(row.questions);
        }
      }
      if (!lists.length) return { errorStatus: 404, error: `Blok ${targetBlock} belum memiliki bank soal yang dipublikasikan.` };
      const picked = pickQuestionsAcrossBanks(lists, count);
      if (picked.length < 5) return { errorStatus: 400, error: `Blok ${targetBlock} belum punya cukup soal valid untuk duel (minimal 5 soal).` };
      return {
        bankId: `block:${targetBlock}`,
        bankName: `${duelBlockLabel(targetBlock)} (Acak)`.slice(0, 80),
        picked
      };
    }

    // Kompatibilitas mundur jika klien lama masih mengirim bankId spesifik
    let b = rawBankId ? (await q.query('SELECT id,name,questions FROM question_banks WHERE id=$1 AND published=true', [rawBankId])).rows[0] : null;
    if (!b && rawBankId.startsWith('server-uab-')) {
      const pkgId = rawBankId.slice('server-uab-'.length);
      if (UUID.test(pkgId)) {
        const pr = await q.query(`SELECT id, title AS name, questions FROM content_packages WHERE id=$1 AND module='UAB' AND visibility='public'`, [pkgId]).catch(() => ({ rows: [] }));
        if (pr.rows[0]) b = { id: rawBankId, name: pr.rows[0].name, questions: pr.rows[0].questions };
      }
    }
    if (!b && allowFallbackBlock) {
      const blocks = await loadDuelBlocksCatalog(q);
      if (blocks[0]?.block) return resolveDuelQuestions(q, { block: blocks[0].block }, count, { allowFallbackBlock: false });
      b = (await q.query('SELECT id,name,questions FROM question_banks WHERE published=true ORDER BY updated_at DESC LIMIT 1')).rows[0];
    }
    if (!b) return { errorStatus: 404, error: 'Blok atau bank soal tidak ditemukan.' };
    const picked = pickQuestions(b.questions, count);
    if (picked.length < 5) return { errorStatus: 400, error: 'Bank ini belum punya cukup soal untuk duel.' };
    return { bankId: b.id, bankName: String(b.name || b.id).slice(0, 80), picked };
  }

  async function duels(req, res, u, sub) {
    if (!u) return fail(res, 401, 'Silakan masuk terlebih dahulu.');
    startSweeper();
    const q = db();
    if (req.method === 'GET' && sub === '/active') {
      const [r, openRes, career, duelBlocks] = await Promise.all([
        q.query(`SELECT * FROM duels WHERE status IN ('waiting','active') AND (host_id=$1 OR guest_id=$1 OR invited_id=$1) ORDER BY created_at DESC LIMIT 10`, [u.id]),
        q.query(
          `SELECT d.* FROM duels d
            WHERE d.status='waiting' AND d.guest_id IS NULL AND d.invited_id IS NULL AND d.host_id<>$1
              AND NOT EXISTS (
                SELECT 1 FROM friend_links b
                 WHERE b.status='blocked'
                   AND ((b.requester_id=$1 AND b.addressee_id=d.host_id) OR (b.requester_id=d.host_id AND b.addressee_id=$1))
              )
            ORDER BY d.created_at DESC LIMIT 12`,
          [u.id]
        ),
        buildDuelCareerAndLeaderboard(q, u.id).catch(() => ({
          myStats: { wins: 0, losses: 0, draws: 0, total: 0, streak: 0, bestStreak: 0, rp: 0, winRate: 0, title: gladiatorTitle(0), rank: rankFromRp(0) },
          h2h: {},
          leaderboard: [],
          byUser: new Map()
        })),
        loadDuelBlocksCatalog(q).catch(() => [])
      ]);
      const list = r.rows.map(rowToDuel), openList = openRes.rows.map(rowToDuel), mine = [], invites = [], openRooms = [];
      const ppl = await people([...list.flatMap(d => [d.hostId, d.guestId, d.invitedId]), ...openList.map(d => d.hostId)]);
      for (const d of list) {
        const v = viewFor(d, u.id, ppl, isOnline);
        if (member(d, u.id)) mine.push(v);
        else if (d.invitedId === u.id && d.status === 'waiting') invites.push({ id: d.id, code: d.code, bank: v.bank, total: v.total, perQ: v.perQ, mode: v.mode, wager: v.wager, from: v.opponent });
      }
      for (const d of openList) {
        const meta = duelMeta(d);
        if (!meta.isPublic) continue;
        const hp = ppl[d.hostId] || { name: 'Pemain', username: '', avatarUrl: '', avatarDeco: '' };
        const hostRank = rankFromRp(career.byUser?.get(d.hostId)?.rp || 0);
        const hostCard = meta.hostCard || career.byUser?.get(d.hostId)?.card || null;
        const hostInfo = { id: d.hostId, name: hp.name, username: hp.username, avatarUrl: hp.avatarUrl || '', avatarDeco: hp.avatarDeco || '', online: isOnline(d.hostId), rank: hostRank, card: hostCard };
        openRooms.push({
          id: d.id,
          code: d.code,
          bank: { id: d.bankId, name: d.bankName },
          total: d.questions.length,
          perQ: d.perQ || 0,
          mode: meta.mode,
          wager: meta.wager,
          createdAt: d.createdAt || Date.now(),
          host: hostInfo,
          from: hostInfo
        });
      }
      return json(res, 200, { mine, invites, openRooms, duelBlocks, myStats: career.myStats, h2h: career.h2h, leaderboard: career.leaderboard, leaderboardFull: career.leaderboardFull || career.leaderboard, rankTiers: RANK_TIERS });
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

    if (sub === '/quick') {                                           // matchmaking cepat: masuk ruang publik atau buat baru
      const input = await body(req, 3000);
      const myCard = cleanShowcaseCard(input.card);
      const busy = await q.query(`SELECT 1 FROM duels WHERE status='active' AND (host_id=$1 OR guest_id=$1) LIMIT 1`, [u.id]);
      if (busy.rowCount) return fail(res, 409, 'Selesaikan duel yang sedang berjalan dulu.');
      const prefBlock = canonicalDuelBlock(input.block || (String(input.bankId || '').startsWith('block:') ? input.bankId : ''));
      const prefBankKey = prefBlock ? `block:${prefBlock}` : String(input.bankId || '');
      const openCand = await q.query(
        `SELECT * FROM duels d
          WHERE d.status='waiting' AND d.guest_id IS NULL AND d.invited_id IS NULL AND d.host_id<>$1
            AND COALESCE((d.answers->'_meta'->>'isPublic')::boolean, true) = true
            AND NOT EXISTS (
              SELECT 1 FROM friend_links b
               WHERE b.status='blocked'
                 AND ((b.requester_id=$1 AND b.addressee_id=d.host_id) OR (b.requester_id=d.host_id AND b.addressee_id=$1))
            )
          ORDER BY CASE WHEN $2 <> '' AND d.bank_id = $2 THEN 0 ELSE 1 END, d.created_at DESC LIMIT 5`,
        [u.id, prefBankKey]
      );
      for (const row of openCand.rows) {
        const joined = await q.query(
          `UPDATE duels SET guest_id=$1, status='active', started_at=now() + interval '5 seconds', updated_at=now(),
                  answers = CASE WHEN $3::jsonb IS NOT NULL THEN jsonb_set(COALESCE(answers, '{}'::jsonb), '{_meta,guestCard}', $3::jsonb, true) ELSE answers END
            WHERE id=$2 AND status='waiting' AND guest_id IS NULL AND host_id<>$1 RETURNING *`,
          [u.id, row.id, myCard ? JSON.stringify(myCard) : null]
        );
        if (joined.rowCount) {
          await q.query(`UPDATE duels SET status='cancelled', updated_at=now() WHERE host_id=$1 AND status='waiting'`, [u.id]);
          const d = rowToDuel(joined.rows[0]);
          const m = duelMeta(d);
          push(d.hostId, 'duel', { id: d.id, kind: 'joined', bankName: d.bankName, total: d.questions.length, mode: m.mode, from: { name: u.name, username: u.username } });
          notifyOpenRooms('matched', d.id);
          return json(res, 200, { matched: true, duel: await viewOf(d, u.id) });
        }
      }
      // Belum ada ruang terbuka -> buat ruang publik baru otomatis dari blok yang dipilih
      const count = [5, 10, 15].includes(Number(input.count)) ? Number(input.count) : 10;
      const perQ = (TIME_OPTIONS.includes(Number(input.seconds)) ? Number(input.seconds) : 30) * 1000;
      const mode = MODES.includes(input.mode) ? input.mode : 'classic';
      const wager = WAGERS.includes(Number(input.wager)) ? Number(input.wager) : 0;
      const resolved = await resolveDuelQuestions(q, input, count, { allowFallbackBlock: true });
      if (resolved.error) return fail(res, resolved.errorStatus || 400, resolved.error);
      await q.query(`UPDATE duels SET status='cancelled', updated_at=now() WHERE host_id=$1 AND status='waiting'`, [u.id]);
      const initAnswers = JSON.stringify({ _meta: { mode, wager, isPublic: true, ...(myCard ? { hostCard: myCard } : {}) } });
      for (let i = 0; i < 6; i++) {
        const r = await q.query(
          `INSERT INTO duels (id, code, host_id, invited_id, bank_id, bank_name, status, questions, answers, per_q_ms)
           VALUES ($1,$2,$3,NULL,$4,$5,'waiting',$6::jsonb,$7::jsonb,$8::int) ON CONFLICT (code) DO NOTHING RETURNING *`,
          [randomUUID(), makeCode(), u.id, resolved.bankId, resolved.bankName, JSON.stringify(resolved.picked), initAnswers, perQ]);
        if (r.rowCount) {
          const d = rowToDuel(r.rows[0]);
          notifyOpenRooms('created', d.id);
          return json(res, 200, { matched: false, duel: await viewOf(d, u.id) });
        }
      }
      return fail(res, 500, 'Gagal membuat ruang duel cepat.');
    }

    if (sub === '' || sub === '/') {                                  // buat
      const input = await body(req, 3000);
      const myCard = cleanShowcaseCard(input.card);
      const busy = await q.query(`SELECT 1 FROM duels WHERE status='active' AND (host_id=$1 OR guest_id=$1) LIMIT 1`, [u.id]);
      if (busy.rowCount) return fail(res, 409, 'Selesaikan duel yang sedang berjalan dulu.');
      const count = [5, 10, 15].includes(Number(input.count)) ? Number(input.count) : 10;
      const perQ = (TIME_OPTIONS.includes(Number(input.seconds)) ? Number(input.seconds) : 0) * 1000;
      const mode = MODES.includes(input.mode) ? input.mode : 'classic';
      const wager = WAGERS.includes(Number(input.wager)) ? Number(input.wager) : 0;
      const resolved = await resolveDuelQuestions(q, input, count);
      if (resolved.error) return fail(res, resolved.errorStatus || 400, resolved.error);
      let invited = null;
      if (input.friendId) {
        invited = String(input.friendId);
        if (!UUID.test(invited) || !(await areFriends(u.id, invited)) || await isBlocked(u.id, invited)) return fail(res, 400, 'Hanya teman yang bisa kamu tantang.');
      }
      const isPublic = invited ? false : (input.isPublic !== false);
      const initAnswers = JSON.stringify({ _meta: { mode, wager, isPublic, ...(myCard ? { hostCard: myCard } : {}) } });
      const prevCancelled = await q.query(`UPDATE duels SET status='cancelled', updated_at=now() WHERE host_id=$1 AND status='waiting' RETURNING id`, [u.id]);
      for (let i = 0; i < 6; i++) {
        const r = await q.query(
          `INSERT INTO duels (id, code, host_id, invited_id, bank_id, bank_name, status, questions, answers, per_q_ms) VALUES ($1,$2,$3,$4,$5,$6,'waiting',$7::jsonb,$8::jsonb,$9::int) ON CONFLICT (code) DO NOTHING RETURNING *`,
          [randomUUID(), makeCode(), u.id, invited, resolved.bankId, resolved.bankName, JSON.stringify(resolved.picked), initAnswers, perQ]);
        if (r.rowCount) {
          const d = rowToDuel(r.rows[0]);
          if (invited) push(invited, 'duel', { id: d.id, kind: 'invite', from: { name: u.name, username: u.username } });
          if (isPublic || prevCancelled.rowCount) notifyOpenRooms(isPublic ? 'created' : 'cancelled', d.id);
          return json(res, 200, { duel: await viewOf(d, u.id) });
        }
      }
      return fail(res, 500, 'Gagal membuat kode duel, coba lagi.');
    }
    if (sub === '/join') {
      const input = await body(req, 1000), code = normalizeCode(input.code);
      const myCard = cleanShowcaseCard(input.card);
      if (code.length !== 6) return fail(res, 400, 'Kode duel harus 6 karakter.');
      const busy = await q.query(`SELECT 1 FROM duels WHERE status='active' AND (host_id=$1 OR guest_id=$1) LIMIT 1`, [u.id]);
      if (busy.rowCount) return fail(res, 409, 'Selesaikan duel yang sedang berjalan dulu.');
      const pre = (await q.query(`SELECT host_id FROM duels WHERE code=$1 AND status='waiting'`, [code])).rows[0];
      if (pre && await isBlocked(u.id, pre.host_id)) return fail(res, 404, 'Kode tidak valid, sudah dipakai, atau bukan untukmu.');
      const r = await q.query(
        `UPDATE duels SET guest_id=$1, status='active', started_at=now() + interval '5 seconds', updated_at=now(),
                answers = CASE WHEN $3::jsonb IS NOT NULL THEN jsonb_set(COALESCE(answers, '{}'::jsonb), '{_meta,guestCard}', $3::jsonb, true) ELSE answers END
          WHERE code=$2 AND status='waiting' AND guest_id IS NULL AND host_id<>$1 AND (invited_id IS NULL OR invited_id=$1) RETURNING *`,
        [u.id, code, myCard ? JSON.stringify(myCard) : null]);
      if (!r.rowCount) return fail(res, 404, 'Kode tidak valid, sudah dipakai, atau bukan untukmu.');
      const prevGuestWaiting = await q.query(`UPDATE duels SET status='cancelled', updated_at=now() WHERE host_id=$1 AND status='waiting' RETURNING id`, [u.id]);
      const d = rowToDuel(r.rows[0]);
      const m = duelMeta(d);
      push(d.hostId, 'duel', { id: d.id, kind: 'joined', bankName: d.bankName, total: d.questions.length, mode: m.mode, from: { name: u.name, username: u.username } });
      if (!d.invitedId || prevGuestWaiting.rowCount) notifyOpenRooms('joined', d.id);
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

    if (action === '/emote') {
      if (d.status !== 'active' && d.status !== 'waiting') return fail(res, 409, 'Duel sudah berakhir.');
      const input = await body(req, 500);
      const rawEmoteId = String(input.emoteId || input.emote || '').trim();
      const em = EMOTES.find(x => x.id === rawEmoteId);
      if (!em) return fail(res, 400, 'Stiker tidak valid.');
      const other = d.hostId === u.id ? d.guestId : d.hostId;
      if (other) push(other, 'duel', { id: d.id, kind: 'emote', emoteId: em.id, emoji: em.emoji, text: em.text, from: { id: u.id, name: u.name } });
      return json(res, 200, { ok: true, emote: em });
    }

    if (action === '/leave') {
      if (d.status === 'waiting') {
        await q.query(`UPDATE duels SET status='cancelled', updated_at=now() WHERE id=$1 AND status='waiting'`, [d.id]);
        if (d.invitedId) push(d.invitedId, 'duel', { id: d.id, kind: 'cancelled' });
        else notifyOpenRooms('cancelled', d.id);
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
      else { const other = nd.hostId === u.id ? nd.guestId : nd.hostId; push(other, 'duel', { id: nd.id, kind: 'progress', ok: !!entry.ok, idx, from: { name: u.name, username: u.username } }); }
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
        `SELECT p.id, p.user_id, p.mood, p.message, p.exam_name, p.score_pct, p.created_at, u2.name, u2.username, (u2.avatar_url IS NOT NULL) AS avatar_url, u2.chat_avatar_deco, u2.chat_name_color, u2.updated_at,
                (SELECT COALESCE(jsonb_object_agg(t.e, t.n), '{}'::jsonb) FROM (SELECT emoji AS e, COUNT(*)::int AS n FROM status_reactions r WHERE r.post_id=p.id GROUP BY emoji) t) AS reactions,
                (SELECT emoji FROM status_reactions r WHERE r.post_id=p.id AND r.user_id=$1) AS mine,
                (SELECT COUNT(*)::int FROM status_comments c WHERE c.post_id=p.id) AS comments,
                ${FRIEND} AS friend
           FROM status_posts p JOIN users u2 ON u2.id=p.user_id
          WHERE ${VISIBLE}
          ORDER BY p.created_at DESC LIMIT 200`, [u.id]);
      return json(res, 200, { posts: r.rows.map(x => ({
        id: String(x.id), userId: x.user_id, name: x.name, username: x.username, avatarUrl: userAvatarUrl({ id: x.user_id, avatar_url: x.avatar_url, updated_at: x.updated_at }), avatarDeco: userDecoUrl(x), nameColor: userNameColor(x), mood: x.mood, message: x.message,
        examName: x.exam_name, scorePct: x.score_pct, createdAt: new Date(x.created_at).getTime(),
        reactions: x.reactions || {}, mine: x.mine || null, comments: x.comments || 0, own: x.user_id === u.id, friend: !!x.friend })), canModerate: u.role === 'admin', scope: 'public' });
    }
    if (req.method === 'GET' && sub === '/comments') {
      const id = Number(new URL(req.url, 'https://x').searchParams.get('id'));
      if (!Number.isInteger(id)) return fail(res, 400, 'Status tidak valid.');
      const vis = await q.query(`SELECT p.user_id FROM status_posts p WHERE p.id=$2 AND ${VISIBLE}`, [u.id, id]);
      if (!vis.rowCount) return fail(res, 404, 'Status tidak ditemukan.');
      const r = await q.query(`SELECT c.id, c.user_id, c.message, c.created_at, u2.name, u2.username, (u2.avatar_url IS NOT NULL) AS avatar_url, u2.chat_avatar_deco, u2.chat_name_color, u2.updated_at FROM status_comments c JOIN users u2 ON u2.id=c.user_id WHERE c.post_id=$1 ORDER BY c.created_at ASC LIMIT 200`, [id]);
      return json(res, 200, { comments: r.rows.map(x => ({ id: String(x.id), userId: x.user_id, name: x.name, username: x.username, avatarUrl: userAvatarUrl({ id: x.user_id, avatar_url: x.avatar_url, updated_at: x.updated_at }), avatarDeco: userDecoUrl(x), nameColor: userNameColor(x), message: x.message, createdAt: new Date(x.created_at).getTime(), own: x.user_id === u.id, canDelete: x.user_id === u.id || vis.rows[0].user_id === u.id || u.role === 'admin' })) });
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
    if (w.rowCount) notifyOpenRooms('expired');
    await q.query(`DELETE FROM duels WHERE (status='cancelled' OR (status='finished' AND guest_id IS NULL)) AND updated_at < now() - interval '30 days'`);
    await q.query(`DELETE FROM chat_messages WHERE created_at < now() - interval '2 days'`).catch(() => {});
  }
  function startSweeper() {
    if (sweeper) return;
    sweeper = setInterval(() => sweep().catch(e => console.error('Sweep duel gagal:', e?.message || e)), 60_000);
    sweeper.unref?.();
  }

  return { stream, friends, duels, status, sweep };
}
