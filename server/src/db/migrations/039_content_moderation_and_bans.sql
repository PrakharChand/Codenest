-- ============================================================
-- 039_content_moderation_and_bans.sql
-- AI Content Moderation & 5-Strike Progressive Ban System
-- ============================================================

-- 1. Add moderation columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS violation_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Create banned_identifiers table (cross-account permanent bans for Email, GitHub, Google)
CREATE TABLE IF NOT EXISTS banned_identifiers (
  id SERIAL PRIMARY KEY,
  identifier_type VARCHAR(20) NOT NULL CHECK (identifier_type IN ('email', 'github', 'google')),
  identifier_value VARCHAR(255) NOT NULL UNIQUE,
  reason TEXT,
  banned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_banned_identifiers_val ON banned_identifiers(identifier_value);

-- 3. Create content_violations log table
CREATE TABLE IF NOT EXISTS content_violations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_type VARCHAR(30) NOT NULL,
  flagged_reason TEXT NOT NULL,
  content_snippet TEXT,
  violation_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_violations_user ON content_violations(user_id);
