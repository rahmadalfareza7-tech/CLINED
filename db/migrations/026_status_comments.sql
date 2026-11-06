-- Komentar pada status teman.
CREATE TABLE IF NOT EXISTS status_comments (
  id         BIGSERIAL PRIMARY KEY,
  post_id    BIGINT NOT NULL REFERENCES status_posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS status_comments_post ON status_comments (post_id, created_at);
CREATE INDEX IF NOT EXISTS status_comments_user ON status_comments (user_id, created_at DESC);
