-- ============================================================
-- 006_communities.sql
-- Nest Feed communities (topic-based groups).
--
-- Deletion policy:
--   created_by → ON DELETE SET NULL: communities survive their
--   creator leaving. A NULL created_by means "original creator
--   account deleted" — handled gracefully in queries via COALESCE.
--
-- member_count is denormalized for performance; kept in sync
-- by controller logic when members join or leave.
-- ============================================================

CREATE TABLE IF NOT EXISTS communities (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  description  TEXT,
  created_by   INTEGER
                 REFERENCES users(id) ON DELETE SET NULL,
  member_count INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
