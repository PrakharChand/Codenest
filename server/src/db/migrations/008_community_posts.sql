-- ============================================================
-- 008_community_posts.sql
-- Posts scoped to a community (Nest Feed community feed).
--
-- Deletion policy:
--   community_id → ON DELETE CASCADE: posts die with the community.
--   user_id      → ON DELETE CASCADE: posts die with the user.
-- These are distinct from the main posts table — community posts
-- are community-scoped discussions, not global feed posts.
-- ============================================================

CREATE TABLE IF NOT EXISTS community_posts (
  id           SERIAL PRIMARY KEY,
  community_id INTEGER NOT NULL
                 REFERENCES communities(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL
                 REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,           -- stored as Markdown
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
