-- Synced cross-account leaderboards for Meja Jaga IGD and Rujuk Langka mini games
CREATE TABLE IF NOT EXISTS igd_scores (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_best INTEGER NOT NULL DEFAULT 0,
  best_night_score INTEGER NOT NULL DEFAULT 0,
  nights_done INTEGER NOT NULL DEFAULT 0,
  solved_cases INTEGER NOT NULL DEFAULT 0,
  runs_played INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_igd_scores_rank
  ON igd_scores (total_best DESC, solved_cases DESC, nights_done DESC, updated_at ASC);

CREATE TABLE IF NOT EXISTS rujuk_langka_scores (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  best_score INTEGER NOT NULL DEFAULT 0,
  total_score INTEGER NOT NULL DEFAULT 0,
  rounds_done INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rujuk_langka_scores_rank
  ON rujuk_langka_scores (best_score DESC, total_score DESC, rounds_done DESC, updated_at ASC);
