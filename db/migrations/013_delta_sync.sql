CREATE TABLE IF NOT EXISTS learning_state_entries (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT,
  deleted BOOLEAN NOT NULL DEFAULT false,
  client_updated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);
CREATE INDEX IF NOT EXISTS learning_state_entries_updated_idx
  ON learning_state_entries(user_id, updated_at);

-- Backfill the existing aggregate state once so existing accounts can immediately
-- use delta sync without downloading their whole state on every pull.
INSERT INTO learning_state_entries (user_id, key, value, deleted, client_updated_at, updated_at)
SELECT ls.user_id, x.key,
       CASE WHEN jsonb_typeof(x.value)='object' AND (x.value ? 'value') THEN x.value->>'value' ELSE NULL END,
       CASE WHEN jsonb_typeof(x.value)='object' AND (x.value->>'deleted')::text = 'true' THEN true ELSE false END,
       CASE WHEN jsonb_typeof(x.value)='object' AND x.value ? 'updatedAt' THEN NULLIF(x.value->>'updatedAt','')::timestamptz ELSE NULL END,
       ls.updated_at
FROM learning_states ls
CROSS JOIN LATERAL jsonb_each(ls.state) x
ON CONFLICT (user_id, key) DO NOTHING;
