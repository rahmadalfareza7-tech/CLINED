-- Chat (riwayat otomatis hilang setelah 48 jam), role "tempat bertanya" (bisa dobel dengan role lain), gaya pengumuman floating.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_mentor BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS chat_messages (
  id           BIGSERIAL PRIMARY KEY,
  sender_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS chat_messages_pair ON chat_messages (sender_id, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_inbox ON chat_messages (recipient_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_time ON chat_messages (created_at);
-- Pengumuman: tampilan floating yang bisa dikustom (warna, ikon, posisi, tombol, jadwal tayang).
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS style JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;
