ALTER TABLE xp_events ADD COLUMN IF NOT EXISTS block VARCHAR(80);
CREATE INDEX IF NOT EXISTS xp_events_block ON xp_events (block, user_id);
