-- Komentar per soal (diskusi di bawah pembahasan) + suka/tidak suka.
CREATE TABLE IF NOT EXISTS question_comments (
  id         BIGSERIAL PRIMARY KEY,
  qkey       TEXT NOT NULL,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS question_comments_q ON question_comments (qkey, created_at DESC);
CREATE INDEX IF NOT EXISTS question_comments_user ON question_comments (user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS question_comment_votes (
  comment_id BIGINT NOT NULL REFERENCES question_comments(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value      SMALLINT NOT NULL CHECK (value IN (-1, 1)),
  PRIMARY KEY (comment_id, user_id)
);
