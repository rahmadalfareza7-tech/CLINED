-- Edit Latihan Farmako oleh admin/helper: hanya field yang diubah disimpan (patch) di atas data bawaan.
CREATE TABLE IF NOT EXISTS resep_overrides (
  dataset VARCHAR(20) NOT NULL,
  item_key VARCHAR(200) NOT NULL,
  data JSONB NOT NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (dataset, item_key)
);
