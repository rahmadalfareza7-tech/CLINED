-- Statistik pemakaian agregat. Tidak menyimpan ID pengguna: "actor" = HMAC(rahasia, minggu|id) sehingga
-- hanya bisa dihitung per minggu dan tidak bisa ditautkan lintas minggu dari tabel ini.
CREATE TABLE IF NOT EXISTS usage_secret (
  id     SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  secret TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS usage_active (
  day   DATE NOT NULL,
  actor TEXT NOT NULL,
  PRIMARY KEY (day, actor)
);
CREATE TABLE IF NOT EXISTS usage_events (
  day   DATE NOT NULL,
  event TEXT NOT NULL,
  n     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, event)
);
