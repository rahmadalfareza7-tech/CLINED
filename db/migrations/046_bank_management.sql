-- Catatan bank bawaan (seed) yang sengaja dihapus admin agar tidak di-seed ulang saat server restart.
CREATE TABLE IF NOT EXISTS deleted_seed_banks (
  id TEXT PRIMARY KEY,
  deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
