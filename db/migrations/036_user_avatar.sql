-- Custom user profile avatar (stored as validated compact image data URL, served via /api/auth/avatar/:id)
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
