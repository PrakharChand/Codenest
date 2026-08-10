-- Migration 041: Soft Deletes & Audit Logging Infrastructure
-- Purpose: Add deleted_at timestamps across core content tables and build audit_logs tracking table.

-- 1. Add deleted_at columns for Soft Deletes
ALTER TABLE posts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE shadow_submissions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Create Audit Logs Table for Security & Regulatory Compliance
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER,
  metadata JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes for Soft Delete Filtering & Audit Log Queries
CREATE INDEX IF NOT EXISTS idx_posts_active ON posts(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comments_active ON comments(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shadow_active ON shadow_submissions(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_active ON messages(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);
