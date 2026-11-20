-- Discord-style avatar decoration frame per user
ALTER TABLE users ADD COLUMN IF NOT EXISTS chat_avatar_deco TEXT;
