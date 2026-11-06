-- Status teman: pesan & kesan singkat (mis. setelah ujian), terlihat hanya oleh teman.
CREATE TABLE IF NOT EXISTS status_posts (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mood       TEXT NOT NULL DEFAULT 'semangat',
  message    TEXT NOT NULL DEFAULT '',
  exam_name  TEXT NOT NULL DEFAULT '',
  score_pct  SMALLINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS status_posts_user ON status_posts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS status_posts_time ON status_posts (created_at DESC);
CREATE TABLE IF NOT EXISTS status_reactions (
  post_id    BIGINT NOT NULL REFERENCES status_posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
