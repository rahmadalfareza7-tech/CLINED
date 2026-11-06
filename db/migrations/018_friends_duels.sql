-- Teman & duel soal.
CREATE TABLE IF NOT EXISTS friend_links (
  id           BIGSERIAL PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','blocked')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (requester_id <> addressee_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS friend_links_pair ON friend_links (requester_id, addressee_id);
CREATE INDEX IF NOT EXISTS friend_links_addressee ON friend_links (addressee_id, status);

CREATE TABLE IF NOT EXISTS duels (
  id          UUID PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  host_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  guest_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  invited_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  bank_id     TEXT NOT NULL DEFAULT '',
  bank_name   TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','active','finished','cancelled')),
  questions   JSONB NOT NULL DEFAULT '[]'::jsonb,
  answers     JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at  TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  winner_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  reason      TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS duels_host ON duels (host_id, status);
CREATE INDEX IF NOT EXISTS duels_guest ON duels (guest_id, status);
CREATE INDEX IF NOT EXISTS duels_invited ON duels (invited_id, status);
