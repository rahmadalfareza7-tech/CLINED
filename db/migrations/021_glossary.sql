-- Glosarium istilah medis. Isi definisi dimasukkan admin (mis. dari kamus berlisensi) — aplikasi tidak membawa teks kamus.
CREATE TABLE IF NOT EXISTS glossary_terms (
  id         BIGSERIAL PRIMARY KEY,
  term_key   TEXT NOT NULL UNIQUE,
  term       TEXT NOT NULL,
  aliases    TEXT[] NOT NULL DEFAULT '{}',
  definition TEXT NOT NULL,
  source     TEXT NOT NULL DEFAULT '',
  verified   BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
