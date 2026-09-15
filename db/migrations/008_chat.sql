CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY,
  user_a UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (user_a <> user_b),
  UNIQUE (user_a, user_b)
);
CREATE INDEX IF NOT EXISTS chat_conversations_user_a_idx ON chat_conversations(user_a, updated_at DESC);
CREATE INDEX IF NOT EXISTS chat_conversations_user_b_idx ON chat_conversations(user_b, updated_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text','question')),
  body TEXT NOT NULL,
  question_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_messages_conversation_idx ON chat_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_sender_idx ON chat_messages(sender_id, created_at DESC);
