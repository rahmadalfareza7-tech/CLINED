-- Custom Discord-style chat nameplate/banner background per user
ALTER TABLE users ADD COLUMN IF NOT EXISTS chat_banner_url TEXT;
