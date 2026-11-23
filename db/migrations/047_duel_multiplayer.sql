-- Multiplayer Duel Room (2–15 pemain) + per-player RP delta tracking.
ALTER TABLE duels ADD COLUMN IF NOT EXISTS max_players INTEGER NOT NULL DEFAULT 2;
ALTER TABLE duels ADD COLUMN IF NOT EXISTS participant_ids UUID[] NOT NULL DEFAULT ARRAY[]::uuid[];

UPDATE duels
   SET participant_ids = ARRAY_REMOVE(ARRAY[host_id, guest_id], NULL)
 WHERE COALESCE(array_length(participant_ids, 1), 0) = 0;

CREATE INDEX IF NOT EXISTS idx_duels_participants ON duels USING GIN (participant_ids);

CREATE TABLE IF NOT EXISTS duel_career_applied (
  duel_id UUID PRIMARY KEY REFERENCES duels(id) ON DELETE CASCADE,
  host_rp_delta INTEGER NOT NULL DEFAULT 0,
  host_prev_rp INTEGER NOT NULL DEFAULT 0,
  host_new_rp INTEGER NOT NULL DEFAULT 0,
  guest_rp_delta INTEGER NOT NULL DEFAULT 0,
  guest_prev_rp INTEGER NOT NULL DEFAULT 0,
  guest_new_rp INTEGER NOT NULL DEFAULT 0,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE duel_career_applied ADD COLUMN IF NOT EXISTS player_deltas JSONB NOT NULL DEFAULT '{}'::jsonb;
