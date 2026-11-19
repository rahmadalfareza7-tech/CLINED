import { getPool, json, fail, origin, body, limit } from './http.mjs';
import { mergeCardStates } from './cards-logic.mjs';

let ensured = false;
async function ensureCardStatesTable() {
  if (ensured) return;
  await getPool().query(`CREATE TABLE IF NOT EXISTS user_card_states (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    diamonds INTEGER NOT NULL DEFAULT 0 CHECK (diamonds >= 0),
    cards JSONB NOT NULL DEFAULT '[]'::jsonb,
    stars JSONB NOT NULL DEFAULT '{}'::jsonb,
    equipped_id TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  ensured = true;
}

export async function cardsApi(req, res, u) {
  if (!u) return fail(res, 401, 'Silakan masuk terlebih dahulu.');
  await ensureCardStatesTable();
  const db = getPool();

  if (req.method === 'GET') {
    const r = await db.query(
      'SELECT diamonds, cards, stars, equipped_id, updated_at FROM user_card_states WHERE user_id=$1',
      [u.id]
    );
    if (!r.rowCount) {
      return json(res, 200, { exists: false, diamonds: 0, cards: [], stars: {}, equippedId: '', updatedAt: null });
    }
    const row = r.rows[0];
    return json(res, 200, {
      exists: true,
      diamonds: Number(row.diamonds) || 0,
      cards: Array.isArray(row.cards) ? row.cards : [],
      stars: row.stars && typeof row.stars === 'object' ? row.stars : {},
      equippedId: String(row.equipped_id || ''),
      updatedAt: row.updated_at
    });
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    origin(req);
    if (!limit(req, res, 60)) return;
    const input = await body(req, 100_000);
    const mode = input.mode === 'merge' ? 'merge' : 'save';
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const cur = await client.query(
        'SELECT diamonds, cards, stars, equipped_id FROM user_card_states WHERE user_id=$1 FOR UPDATE',
        [u.id]
      );
      const existing = cur.rowCount
        ? {
            diamonds: Number(cur.rows[0].diamonds) || 0,
            cards: cur.rows[0].cards || [],
            stars: cur.rows[0].stars || {},
            equippedId: cur.rows[0].equipped_id || ''
          }
        : null;
      const merged = mergeCardStates(existing, input, existing ? mode : 'merge');
      const saved = await client.query(
        `INSERT INTO user_card_states (user_id, diamonds, cards, stars, equipped_id, updated_at)
         VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, now())
         ON CONFLICT (user_id) DO UPDATE SET
           diamonds = EXCLUDED.diamonds,
           cards = EXCLUDED.cards,
           stars = EXCLUDED.stars,
           equipped_id = EXCLUDED.equipped_id,
           updated_at = now()
         RETURNING diamonds, cards, stars, equipped_id, updated_at`,
        [u.id, merged.diamonds, JSON.stringify(merged.cards), JSON.stringify(merged.stars), merged.equippedId]
      );
      await client.query('COMMIT');
      const row = saved.rows[0];
      return json(res, 200, {
        exists: true,
        diamonds: Number(row.diamonds) || 0,
        cards: row.cards || [],
        stars: row.stars || {},
        equippedId: String(row.equipped_id || ''),
        updatedAt: row.updated_at
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  return fail(res, 405, 'Method tidak diizinkan.');
}
