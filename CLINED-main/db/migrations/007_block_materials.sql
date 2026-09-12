-- Admin-managed external material links per UAB block.
CREATE TABLE IF NOT EXISTS block_materials (
  block VARCHAR(80) PRIMARY KEY,
  url TEXT NOT NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
