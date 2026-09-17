-- Foto disimpan sebagai bytea di Postgres (bukan disk lokal) karena PaaS gratisan
-- (Render/Koyeb free tier) punya filesystem EPHEMERAL: hilang tiap redeploy/restart.
CREATE TABLE IF NOT EXISTS user_photos (
  id UUID PRIMARY KEY,
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/png','image/jpeg')),
  byte_size INTEGER NOT NULL CHECK (byte_size > 0 AND byte_size <= 2097152),
  data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_photos_owner_idx ON user_photos (owner_user_id);

-- Riwayat skor kuis, dinormalisasi (bukan blob JSON) supaya query/laporan efisien
-- untuk skala 150 pengguna: leaderboard, rata-rata per blok, dsb tanpa parse JSON.
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module TEXT NOT NULL CHECK (module IN ('UAB','UPI')),
  block TEXT,
  package_id UUID REFERENCES content_packages(id) ON DELETE SET NULL,
  score INTEGER NOT NULL CHECK (score >= 0),
  total INTEGER NOT NULL CHECK (total > 0),
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS quiz_attempts_user_idx ON quiz_attempts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS quiz_attempts_module_idx ON quiz_attempts (module, block);
