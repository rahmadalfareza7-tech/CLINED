-- Laporan soal dari mahasiswa → kotak masuk admin.
CREATE TABLE IF NOT EXISTS question_reports (
  id          BIGSERIAL PRIMARY KEY,
  question_id TEXT NOT NULL,
  source      TEXT NOT NULL DEFAULT 'bank' CHECK (source IN ('bank','mat')),
  bank        TEXT NOT NULL DEFAULT '',
  snippet     TEXT NOT NULL DEFAULT '',
  category    TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('key','typo','ambiguous','explanation','other')),
  note        TEXT NOT NULL DEFAULT '',
  reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','checked','fixed','dismissed')),
  admin_note  TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS question_reports_q_idx ON question_reports (question_id);
CREATE INDEX IF NOT EXISTS question_reports_status_idx ON question_reports (status, created_at DESC);
-- Satu pengguna hanya sekali melapor untuk soal yang sama selama belum ditutup.
CREATE UNIQUE INDEX IF NOT EXISTS question_reports_once ON question_reports (question_id, reporter_id) WHERE status IN ('new','checked') AND reporter_id IS NOT NULL;
