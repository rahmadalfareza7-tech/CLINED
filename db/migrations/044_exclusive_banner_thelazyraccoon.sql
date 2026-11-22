-- Exclusive personal nameplate (Luuk Helix) granted & equipped strictly for @thelazyraccoon.
-- Hidden from public shop so only @thelazyraccoon can use it.

ALTER TABLE users ADD COLUMN IF NOT EXISTS chat_banner_url TEXT;

CREATE TABLE IF NOT EXISTS user_card_states (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  diamonds INTEGER NOT NULL DEFAULT 0 CHECK (diamonds >= 0),
  cards JSONB NOT NULL DEFAULT '[]'::jsonb,
  stars JSONB NOT NULL DEFAULT '{}'::jsonb,
  equipped_id TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE user_card_states ADD COLUMN IF NOT EXISTS owned_banners JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE user_card_states ADD COLUMN IF NOT EXISTS equipped_banner TEXT NOT NULL DEFAULT '';
ALTER TABLE user_card_states ADD COLUMN IF NOT EXISTS owned_decos JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE user_card_states ADD COLUMN IF NOT EXISTS equipped_deco TEXT NOT NULL DEFAULT '';
ALTER TABLE user_card_states ADD COLUMN IF NOT EXISTS free_banner_claimed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE user_card_states ADD COLUMN IF NOT EXISTS free_deco_claimed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE user_card_states ADD COLUMN IF NOT EXISTS cosmetic_tutorial_done BOOLEAN NOT NULL DEFAULT false;

-- 1. Equip preset banner directly on @thelazyraccoon's user profile
UPDATE users
   SET chat_banner_url = 'preset:luuk-helix-nameplate',
       updated_at = now()
 WHERE LOWER(username) = 'thelazyraccoon';

-- 2. Grant ownership & equip in user_card_states (preserving existing owned banners)
INSERT INTO user_card_states (user_id, owned_banners, equipped_banner, updated_at)
SELECT id, '["luuk-helix-nameplate"]'::jsonb, 'luuk-helix-nameplate', now()
  FROM users
 WHERE LOWER(username) = 'thelazyraccoon'
ON CONFLICT (user_id) DO UPDATE SET
  owned_banners = CASE
    WHEN COALESCE(user_card_states.owned_banners, '[]'::jsonb) @> '["luuk-helix-nameplate"]'::jsonb
      THEN user_card_states.owned_banners
    ELSE COALESCE(user_card_states.owned_banners, '[]'::jsonb) || '["luuk-helix-nameplate"]'::jsonb
  END,
  equipped_banner = 'luuk-helix-nameplate',
  updated_at = now();

-- 3. Keep delta-sync & full-sync KV stores aligned so existing/new devices don't revert it
INSERT INTO learning_state_entries (user_id, key, value, deleted, updated_at)
SELECT id, 'clined_equipped_banner_v1', 'luuk-helix-nameplate', false, now()
  FROM users
 WHERE LOWER(username) = 'thelazyraccoon'
ON CONFLICT (user_id, key) DO UPDATE SET
  value = 'luuk-helix-nameplate',
  deleted = false,
  updated_at = now();

UPDATE learning_states ls
   SET state = jsonb_set(
         COALESCE(ls.state, '{}'::jsonb),
         '{clined_equipped_banner_v1}',
         jsonb_build_object(
           'value', 'luuk-helix-nameplate',
           'deleted', false,
           'updatedAt', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
         ),
         true
       ),
       updated_at = now()
  FROM users u
 WHERE ls.user_id = u.id
   AND LOWER(u.username) = 'thelazyraccoon';
