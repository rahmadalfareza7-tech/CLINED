-- Tag Champion per Blok pada profil pengguna (dikelola Admin)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS champion_blocks TEXT[] NOT NULL DEFAULT ARRAY[]::text[];
