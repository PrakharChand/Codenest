-- ============================================================
-- 035_conversations.sql
-- Conversations between two mutually connected users in Nest Feed.
-- ============================================================

CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  participant_one_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_two_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(participant_one_id, participant_two_id),
  CHECK(participant_one_id < participant_two_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_p1 ON conversations(participant_one_id);
CREATE INDEX IF NOT EXISTS idx_conversations_p2 ON conversations(participant_two_id);
