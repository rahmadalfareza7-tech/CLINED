// Server-Sent Events: dorong kabar (teman/duel) ke pengguna yang sedang online. Memori proses → jalankan SATU proses Node.
const conns = new Map();            // userId -> Set<res>
const PER_USER = 4, GLOBAL_MAX = 3000;
let total = 0, beat = null;

const write = (res, text) => { try { res.write(text); return true; } catch { return false; } };

export function isOnline(userId) { return (conns.get(userId)?.size || 0) > 0; }
export function connectionCount() { return total; }
export function onlineStats() {
  let accounts = 0;
  for (const set of conns.values()) if (set.size > 0) accounts++;
  return { connections: total, accounts, maxConnections: GLOBAL_MAX };
}

export function push(userId, event, data = {}) {
  const set = conns.get(userId); if (!set) return 0;
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  let n = 0; for (const res of set) if (write(res, msg)) n++;
  return n;
}

function drop(userId, res) {
  const set = conns.get(userId); if (!set || !set.delete(res)) return;
  total--; if (!set.size) conns.delete(userId);
}

export function openStream(req, res, userId) {
  if (total >= GLOBAL_MAX) { res.writeHead(503, { 'Retry-After': '30' }); return res.end(); }
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive', 'X-Accel-Buffering': 'no'
  });
  write(res, 'retry: 5000\n\n');
  let set = conns.get(userId); if (!set) conns.set(userId, set = new Set());
  while (set.size >= PER_USER) { const old = set.values().next().value; set.delete(old); total--; try { old.end(); } catch {} }
  set.add(res); total++;
  if (!beat) { beat = setInterval(() => { for (const [uid, s] of conns) for (const r of s) if (!write(r, ': ping\n\n')) drop(uid, r); }, 25_000); beat.unref?.(); }
  write(res, `event: ready\ndata: {}\n\n`);
  const done = () => drop(userId, res);
  req.on('close', done); res.on('close', done); res.on('error', done);
}
