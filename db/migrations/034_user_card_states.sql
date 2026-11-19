CREATE TABLE IF NOT EXISTS user_card_states (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  diamonds INTEGER NOT NULL DEFAULT 0 CHECK (diamonds >= 0),
  cards JSONB NOT NULL DEFAULT '[]'::jsonb,
  stars JSONB NOT NULL DEFAULT '{}'::jsonb,
  equipped_id TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
