-- Discord-style customizable chat display name color per user
ALTER TABLE users ADD COLUMN IF NOT EXISTS chat_name_color TEXT;
