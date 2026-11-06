-- Analisis butir soal: agregat anonim jawaban per soal (tanpa user_id).
CREATE TABLE IF NOT EXISTS item_stats (
  question_id TEXT PRIMARY KEY,
  source      TEXT NOT NULL DEFAULT 'bank' CHECK (source IN ('bank','mat')),
  bank        TEXT NOT NULL DEFAULT '',
  snippet     TEXT NOT NULL DEFAULT '',
  correct_idx SMALLINT NOT NULL DEFAULT 0,
  n_total     INTEGER NOT NULL DEFAULT 0,
  n_wrong     INTEGER NOT NULL DEFAULT 0,
  opt_counts  INTEGER[] NOT NULL DEFAULT '{0,0,0,0,0}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS item_stats_wrong_idx ON item_stats (n_wrong DESC);
