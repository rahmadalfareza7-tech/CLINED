import { randomUUID } from 'node:crypto';

let tableReady = null;
const MAX_STORED_ERRORS = 500;

export async function ensureClientErrorTable(pool) {
  if (!pool) return;
  if (!tableReady) {
    tableReady = (async () => {
      await pool.query(`CREATE TABLE IF NOT EXISTS client_error_logs (
        id UUID PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        kind VARCHAR(32) NOT NULL DEFAULT 'error',
        message TEXT NOT NULL,
        source TEXT,
        line INTEGER NOT NULL DEFAULT 0,
        col INTEGER NOT NULL DEFAULT 0,
        stack TEXT,
        view_id VARCHAR(64),
        user_agent TEXT,
        app_version VARCHAR(80),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_client_error_logs_created
        ON client_error_logs (created_at DESC)`);
    })().catch(err => {
      tableReady = null;
      throw err;
    });
  }
  return tableReady;
}

export function sanitizeClientError(input, ua = '') {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const redact = (v, max) => String(v ?? '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/clined_session=[^;\s]+/gi, 'clined_session=[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
    .replace(/password["']?\s*[:=]\s*["']?[^"',\s}]+/gi, 'password=[redacted]')
    .trim()
    .slice(0, max);

  const message = redact(input.message, 320);
  if (!message) return null;
  const kind = input.kind === 'unhandledrejection' ? 'unhandledrejection' : 'error';
  return {
    kind,
    message,
    source: redact(input.source, 200),
    line: Math.max(0, Math.min(1_000_000, Math.floor(Number(input.line) || 0))),
    col: Math.max(0, Math.min(1_000_000, Math.floor(Number(input.col) || 0))),
    stack: redact(input.stack, 1000),
    viewId: redact(input.viewId, 64),
    appVersion: redact(input.appVersion, 80),
    userAgent: redact(ua, 240)
  };
}

export function createTelemetry({ getPool, json, fail, body, origin, limit }) {
  const db = () => getPool();

  async function ingest(req, res, u) {
    if (req.method !== 'POST') return fail(res, 405, 'Method tidak diizinkan.');
    origin(req);
    if (!limit(req, res, 20)) return;
    const raw = await body(req, 16_000);
    const clean = sanitizeClientError(raw, req.headers?.['user-agent'] || '');
    if (!clean) return fail(res, 400, 'Payload error tidak valid.');

    await ensureClientErrorTable(db());
    await db().query(
      `INSERT INTO client_error_logs (id, user_id, kind, message, source, line, col, stack, view_id, user_agent, app_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        randomUUID(),
        u?.id || null,
        clean.kind,
        clean.message,
        clean.source || null,
        clean.line,
        clean.col,
        clean.stack || null,
        clean.viewId || null,
        clean.userAgent || null,
        clean.appVersion || null
      ]
    );
    // Keep table bounded to last MAX_STORED_ERRORS entries
    db().query(
      `DELETE FROM client_error_logs
        WHERE id IN (
          SELECT id FROM client_error_logs ORDER BY created_at DESC OFFSET $1
        )`,
      [MAX_STORED_ERRORS]
    ).catch(() => {});

    return json(res, 202, { ok: true });
  }

  async function adminList(req, res, u) {
    if (!u) return fail(res, 401, 'Silakan masuk terlebih dahulu.');
    if (u.role !== 'admin' && u.role !== 'developer') return fail(res, 403, 'Akses admin diperlukan.');
    await ensureClientErrorTable(db());

    if (req.method === 'DELETE') {
      origin(req);
      await db().query('DELETE FROM client_error_logs');
      return json(res, 200, { ok: true, cleared: true });
    }
    if (req.method !== 'GET') return fail(res, 405, 'Method tidak diizinkan.');

    const r = await db().query(
      `SELECT l.id, l.kind, l.message, l.source, l.line, l.col, l.stack, l.view_id, l.user_agent, l.app_version, l.created_at,
              u.username
         FROM client_error_logs l
         LEFT JOIN users u ON u.id = l.user_id
        ORDER BY l.created_at DESC
        LIMIT 100`
    );
    return json(res, 200, {
      ok: true,
      count: r.rows.length,
      items: r.rows.map(row => ({
        id: row.id,
        kind: row.kind,
        message: row.message,
        source: row.source || '',
        line: Number(row.line) || 0,
        col: Number(row.col) || 0,
        stack: row.stack || '',
        viewId: row.view_id || '',
        userAgent: row.user_agent || '',
        appVersion: row.app_version || '',
        username: row.username || '',
        createdAt: row.created_at
      }))
    });
  }

  return { ingest, adminList };
}
