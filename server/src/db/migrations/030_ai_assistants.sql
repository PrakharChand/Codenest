-- ============================================================
-- 030_ai_assistants.sql
-- Database schema for Dual AI Assistants (CodeNest Guide & Shadow Mentor),
-- RAG Knowledge Embeddings, Chat History, and User AI Settings.
-- ============================================================

-- 1. AI Conversations Table
CREATE TABLE IF NOT EXISTS ai_conversations (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assistant_mode VARCHAR(20) NOT NULL CHECK (assistant_mode IN ('feed', 'shadow')),
  title          VARCHAR(255) NOT NULL DEFAULT 'New Conversation',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. AI Messages Table
CREATE TABLE IF NOT EXISTS ai_messages (
  id              SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  sender          VARCHAR(20) NOT NULL CHECK (sender IN ('user', 'assistant', 'system')),
  content         TEXT NOT NULL,
  tokens_used     INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Document Embeddings Table (Vector store)
CREATE TABLE IF NOT EXISTS ai_embeddings (
  id            SERIAL PRIMARY KEY,
  source_type   VARCHAR(30) NOT NULL CHECK (source_type IN ('knowledge', 'creator')),
  document_path TEXT NOT NULL,
  chunk_index   INTEGER NOT NULL,
  chunk_text    TEXT NOT NULL,
  embedding     JSONB NOT NULL, -- JSON array of floats representing vector
  file_hash     VARCHAR(64) NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unq_doc_chunk UNIQUE (document_path, chunk_index)
);

-- 4. User AI Settings Table
CREATE TABLE IF NOT EXISTS ai_user_settings (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  model        VARCHAR(50) NOT NULL DEFAULT 'gemini-flash-latest',
  temperature  NUMERIC(3,2) NOT NULL DEFAULT 0.30,
  max_tokens   INTEGER NOT NULL DEFAULT 2048,
  context_size INTEGER NOT NULL DEFAULT 4,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for high-performance lookup
CREATE INDEX IF NOT EXISTS idx_ai_conv_user_mode ON ai_conversations(user_id, assistant_mode, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conv ON ai_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ai_embeddings_type ON ai_embeddings(source_type);
