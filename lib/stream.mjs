// Server-Sent Events: dorong kabar (teman/duel/chat) ke pengguna yang sedang online. Memori proses → jalankan SATU proses Node.
import { randomUUID } from 'node:crypto';

export const HEARTBEAT_MS = 15_000;
export const HIDDEN_GRACE_MS = 60_000;
const PER_USER = 4, GLOBAL_MAX = 3000;

const conns = new Map();            // userId -> Map<res, meta>
let total = 0, beat = null;

const isDead = res => Boolean(
  !res || res.writableEnded || res.destroyed || res.closed ||
  res.socket?.destroyed || res.writableNeedDrain || (Number(res.writableLength) > 0)
);

const write = (res, text) => {
  if (!res || res.writableEnded || res.destroyed || res.closed || res.socket?.destroyed) return false;
  try {
    res.write(text);
    return !res.destroyed && !res.writableEnded;
  } catch {
    return false;
  }
};

function isConnActive(meta, now = Date.now()) {
  if (!meta) return false;
  if (meta.expiresAt && now >= meta.expiresAt) return false;
  if (meta.state === 'offline') return false;
  if (meta.state === 'hidden' && meta.hiddenAt > 0 && (now - meta.hiddenAt) >= HIDDEN_GRACE_MS) return false;
  return true;
}

export function isOnline(userId, now = Date.now()) {
  const map = conns.get(userId);
  if (!map || !map.size) return false;
  for (const [res, meta] of map) {
    if (!isDead(res) && isConnActive(meta, now)) return true;
  }
  return false;
}

export function connectionCount() { return total; }

export function onlineStats(now = Date.now()) {
  let accounts = 0;
  for (const uid of conns.keys()) {
    if (isOnline(uid, now)) accounts++;
  }
  return { connections: total, accounts, maxConnections: GLOBAL_MAX };
}

export function push(userId, event, data = {}) {
  const map = conns.get(userId); if (!map) return 0;
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  let n = 0;
  for (const [res] of [...map.entries()]) {
    if (res.writableEnded || res.destroyed || res.closed || res.socket?.destroyed) {
      drop(userId, res, true);
      continue;
    }
    if (write(res, msg)) n++;
    else drop(userId, res, true);
  }
  return n;
}

export function broadcast(event, data = {}) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  let n = 0;
  for (const [uid, map] of [...conns.entries()]) {
    for (const [res] of [...map.entries()]) {
      if (res.writableEnded || res.destroyed || res.closed || res.socket?.destroyed) {
        drop(uid, res, true);
        continue;
      }
      if (write(res, msg)) n++;
      else drop(uid, res, true);
    }
  }
  return n;
}

function drop(userId, res, closeSocket = false) {
  const map = conns.get(userId); if (!map || !map.delete(res)) return;
  total = Math.max(0, total - 1);
  if (!map.size) conns.delete(userId);
  if (conns.size === 0 && beat) { clearInterval(beat); beat = null; }
  if (closeSocket) {
    try { res.end?.(); } catch {}
    try { res.destroy?.(); } catch {}
  }
}

export function dropUser(userId) {
  const map = conns.get(userId);
  if (!map) return 0;
  let n = 0;
  for (const [res] of [...map.entries()]) {
    drop(userId, res, true);
    n++;
  }
  return n;
}

export function dropSession(sessionId) {
  if (!sessionId) return 0;
  let n = 0;
  for (const [uid, map] of [...conns.entries()]) {
    for (const [res, meta] of [...map.entries()]) {
      if (meta.sessionId === sessionId) {
        drop(uid, res, true);
        n++;
      }
    }
  }
  return n;
}

export function dropConn(userId, connId) {
  const map = conns.get(userId);
  if (!map || !connId) return 0;
  let n = 0;
  for (const [res, meta] of [...map.entries()]) {
    if (meta.connId === connId) {
      drop(userId, res, true);
      n++;
    }
  }
  return n;
}

export function setPresence(userId, connId, state, now = Date.now()) {
  const map = conns.get(userId);
  if (!map || !connId) return false;
  for (const [, meta] of map) {
    if (meta.connId !== connId) continue;
    if (state === 'visible') {
      meta.state = 'visible';
      meta.hiddenAt = 0;
    } else if (state === 'hidden') {
      if (meta.state !== 'hidden' || !meta.hiddenAt) meta.hiddenAt = now;
      meta.state = 'hidden';
    }
    return true;
  }
  return false;
}

export function heartbeat(now = Date.now()) {
  for (const [uid, map] of [...conns.entries()]) {
    for (const [res, meta] of [...map.entries()]) {
      if ((meta.expiresAt && now >= meta.expiresAt) || isDead(res)) {
        drop(uid, res, true);
        continue;
      }
      if (!write(res, `event: ping\ndata: {"ts":${now}}\n\n`)) {
        drop(uid, res, true);
      }
    }
  }
}

export function openStream(req, res, userId, opts = {}) {
  if (total >= GLOBAL_MAX) { res.writeHead(503, { 'Retry-After': '30' }); return res.end(); }
  req.setTimeout?.(0);
  res.setTimeout?.(0);
  req.socket?.setKeepAlive?.(true, HEARTBEAT_MS);
  req.socket?.setNoDelay?.(true);
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive', 'X-Accel-Buffering': 'no'
  });
  write(res, 'retry: 5000\n\n');
  let map = conns.get(userId); if (!map) conns.set(userId, map = new Map());
  while (map.size >= PER_USER) {
    const old = map.keys().next().value;
    drop(userId, old, true);
    map = conns.get(userId);
    if (!map) { conns.set(userId, map = new Map()); break; }
  }
  const now = Number(opts.now) || Date.now();
  const connId = String(opts.connId || randomUUID());
  const visible = opts.visible !== false;
  const expiresAt = opts.expiresAt ? new Date(opts.expiresAt).getTime() : 0;
  map.set(res, {
    userId,
    connId,
    sessionId: opts.sessionId || '',
    expiresAt: Number.isFinite(expiresAt) ? expiresAt : 0,
    state: visible ? 'visible' : 'hidden',
    hiddenAt: visible ? 0 : Math.max(1, now - HIDDEN_GRACE_MS)
  });
  total++;
  if (!beat) { beat = setInterval(() => heartbeat(), HEARTBEAT_MS); beat.unref?.(); }
  write(res, `event: ready\ndata: ${JSON.stringify({ connId })}\n\n`);
  const done = () => drop(userId, res);
  req.on('close', done); req.on('aborted', done); res.on('close', done); res.on('error', done);
}
