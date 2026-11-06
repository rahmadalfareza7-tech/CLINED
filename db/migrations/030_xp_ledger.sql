-- Buku besar XP di server: peringkat tidak lagi bergantung pada sinkron localStorage.
-- Satu soal/kartu hanya dihitung sekali per hari per jenis (anti-farming).
CREATE TABLE IF NOT EXISTS xp_events (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,
  ref        TEXT NOT NULL,
  amount     INTEGER NOT NULL CHECK (amount BETWEEN 0 AND 100),
  day        DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS xp_events_once ON xp_events (user_id, kind, ref, day);
CREATE INDEX IF NOT EXISTS xp_events_day ON xp_events (day, user_id);
