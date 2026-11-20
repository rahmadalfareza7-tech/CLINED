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
    owned_banners JSONB NOT NULL DEFAULT '[]'::jsonb,
    equipped_banner TEXT NOT NULL DEFAULT '',
    owned_decos JSONB NOT NULL DEFAULT '[]'::jsonb,
    equipped_deco TEXT NOT NULL DEFAULT '',
    free_banner_claimed BOOLEAN NOT NULL DEFAULT false,
    free_deco_claimed BOOLEAN NOT NULL DEFAULT false,
    cosmetic_tutorial_done BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await getPool().query(`ALTER TABLE user_card_states ADD COLUMN IF NOT EXISTS owned_banners JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await getPool().query(`ALTER TABLE user_card_states ADD COLUMN IF NOT EXISTS equipped_banner TEXT NOT NULL DEFAULT ''`);
  await getPool().query(`ALTER TABLE user_card_states ADD COLUMN IF NOT EXISTS owned_decos JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await getPool().query(`ALTER TABLE user_card_states ADD COLUMN IF NOT EXISTS equipped_deco TEXT NOT NULL DEFAULT ''`);
  await getPool().query(`ALTER TABLE user_card_states ADD COLUMN IF NOT EXISTS free_banner_claimed BOOLEAN NOT NULL DEFAULT false`);
  await getPool().query(`ALTER TABLE user_card_states ADD COLUMN IF NOT EXISTS free_deco_claimed BOOLEAN NOT NULL DEFAULT false`);
  await getPool().query(`ALTER TABLE user_card_states ADD COLUMN IF NOT EXISTS cosmetic_tutorial_done BOOLEAN NOT NULL DEFAULT false`);
  ensured = true;
}

export async function cardsApi(req, res, u) {
  if (!u) return fail(res, 401, 'Silakan masuk terlebih dahulu.');
  await ensureCardStatesTable();
  const db = getPool();

  if (req.method === 'GET') {
    const r = await db.query(
      'SELECT diamonds, cards, stars, equipped_id, owned_banners, equipped_banner, owned_decos, equipped_deco, free_banner_claimed, free_deco_claimed, cosmetic_tutorial_done, updated_at FROM user_card_states WHERE user_id=$1',
      [u.id]
    );
    if (!r.rowCount) {
      return json(res, 200, { exists: false, diamonds: 0, cards: [], stars: {}, equippedId: '', ownedBanners: [], equippedBanner: '', ownedDecos: [], equippedDeco: '', freeBannerClaimed: false, freeDecoClaimed: false, cosmeticTutorialDone: false, updatedAt: null });
    }
    const row = r.rows[0];
    return json(res, 200, {
      exists: true,
      diamonds: Number(row.diamonds) || 0,
      cards: Array.isArray(row.cards) ? row.cards : [],
      stars: row.stars && typeof row.stars === 'object' ? row.stars : {},
      equippedId: String(row.equipped_id || ''),
      ownedBanners: Array.isArray(row.owned_banners) ? row.owned_banners : [],
      equippedBanner: String(row.equipped_banner || ''),
      ownedDecos: Array.isArray(row.owned_decos) ? row.owned_decos : [],
      equippedDeco: String(row.equipped_deco || ''),
      freeBannerClaimed: Boolean(row.free_banner_claimed),
      freeDecoClaimed: Boolean(row.free_deco_claimed),
      cosmeticTutorialDone: Boolean(row.cosmetic_tutorial_done),
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
        'SELECT diamonds, cards, stars, equipped_id, owned_banners, equipped_banner, owned_decos, equipped_deco, free_banner_claimed, free_deco_claimed, cosmetic_tutorial_done FROM user_card_states WHERE user_id=$1 FOR UPDATE',
        [u.id]
      );
      const existing = cur.rowCount
        ? {
            diamonds: Number(cur.rows[0].diamonds) || 0,
            cards: cur.rows[0].cards || [],
            stars: cur.rows[0].stars || {},
            equippedId: cur.rows[0].equipped_id || '',
            ownedBanners: cur.rows[0].owned_banners || [],
            equippedBanner: cur.rows[0].equipped_banner || '',
            ownedDecos: cur.rows[0].owned_decos || [],
            equippedDeco: cur.rows[0].equipped_deco || '',
            freeBannerClaimed: Boolean(cur.rows[0].free_banner_claimed),
            freeDecoClaimed: Boolean(cur.rows[0].free_deco_claimed),
            cosmeticTutorialDone: Boolean(cur.rows[0].cosmetic_tutorial_done)
          }
        : null;
      const merged = mergeCardStates(existing, input, existing ? mode : 'merge');
      const saved = await client.query(
        `INSERT INTO user_card_states (user_id, diamonds, cards, stars, equipped_id, owned_banners, equipped_banner, owned_decos, equipped_deco, free_banner_claimed, free_deco_claimed, cosmetic_tutorial_done, updated_at)
         VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6::jsonb, $7, $8::jsonb, $9, $10, $11, $12, now())
         ON CONFLICT (user_id) DO UPDATE SET
           diamonds = EXCLUDED.diamonds,
           cards = EXCLUDED.cards,
           stars = EXCLUDED.stars,
           equipped_id = EXCLUDED.equipped_id,
           owned_banners = EXCLUDED.owned_banners,
           equipped_banner = EXCLUDED.equipped_banner,
           owned_decos = EXCLUDED.owned_decos,
           equipped_deco = EXCLUDED.equipped_deco,
           free_banner_claimed = EXCLUDED.free_banner_claimed,
           free_deco_claimed = EXCLUDED.free_deco_claimed,
           cosmetic_tutorial_done = EXCLUDED.cosmetic_tutorial_done,
           updated_at = now()
         RETURNING diamonds, cards, stars, equipped_id, owned_banners, equipped_banner, owned_decos, equipped_deco, free_banner_claimed, free_deco_claimed, cosmetic_tutorial_done, updated_at`,
        [u.id, merged.diamonds, JSON.stringify(merged.cards), JSON.stringify(merged.stars), merged.equippedId, JSON.stringify(merged.ownedBanners), merged.equippedBanner, JSON.stringify(merged.ownedDecos), merged.equippedDeco, merged.freeBannerClaimed, merged.freeDecoClaimed, merged.cosmeticTutorialDone]
      );
      if (input.equippedBanner !== undefined) {
        if (merged.equippedBanner) {
          await client.query('UPDATE users SET chat_banner_url=$1, updated_at=now() WHERE id=$2', [`preset:${merged.equippedBanner}`, u.id]);
        } else {
          await client.query(`UPDATE users SET chat_banner_url=NULL, updated_at=now() WHERE id=$1 AND chat_banner_url LIKE 'preset:%'`, [u.id]);
        }
      }
      if (input.equippedDeco !== undefined) {
        await client.query('UPDATE users SET chat_avatar_deco=$1, updated_at=now() WHERE id=$2', [merged.equippedDeco || null, u.id]);
      }
      await client.query('COMMIT');
      const row = saved.rows[0];
      return json(res, 200, {
        exists: true,
        diamonds: Number(row.diamonds) || 0,
        cards: row.cards || [],
        stars: row.stars || {},
        equippedId: String(row.equipped_id || ''),
        ownedBanners: row.owned_banners || [],
        equippedBanner: String(row.equipped_banner || ''),
        ownedDecos: row.owned_decos || [],
        equippedDeco: String(row.equipped_deco || ''),
        freeBannerClaimed: Boolean(row.free_banner_claimed),
        freeDecoClaimed: Boolean(row.free_deco_claimed),
        cosmeticTutorialDone: Boolean(row.cosmetic_tutorial_done),
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
