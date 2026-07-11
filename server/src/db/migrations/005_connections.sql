-- ============================================================
-- 005_connections.sql
-- Follower/following relationships between users.
--
-- Deletion policy:
--   Both FKs → ON DELETE CASCADE: a deleted user's follow
--   relationships (as follower and as followed) are removed.
--
-- Constraints:
--   Composite PK (follower_id, following_id) — one connection
--   per directed pair at DB level.
--   CHECK follower_id <> following_id — self-follow impossible
--   at DB level.
-- ============================================================

CREATE TABLE IF NOT EXISTS connections (
  follower_id  INTEGER NOT NULL
                 REFERENCES users(id) ON DELETE CASCADE,
  following_id INTEGER NOT NULL
                 REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT no_self_connection CHECK (follower_id <> following_id)
);
