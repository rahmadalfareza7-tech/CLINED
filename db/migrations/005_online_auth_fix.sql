ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);
CREATE INDEX IF NOT EXISTS question_banks_published_idx ON question_banks(published, updated_at DESC);
