-- ============================================================
-- 014_shadow_community_posts.sql
-- Discussion posts on the anonymous Shadow community board.
--
-- Deletion policy:
--   user_id → ON DELETE CASCADE: posts die with the user.
--
-- SECURITY — Rule 2:
--   user_id is stored for ownership (delete own post), but is
--   NEVER returned in a /api/shadow/ response. Content is always
--   attributed to anonymous_username only — resolved at query time
--   via JOIN on users using only anonymous columns.
-- ============================================================

CREATE TABLE IF NOT EXISTS shadow_community_posts (
  id         SERIAL PRIMARY KEY,

  -- Stored for ownership ONLY — never returned in shadow responses.
  user_id    INTEGER NOT NULL
               REFERENCES users(id) ON DELETE CASCADE,

  content    TEXT NOT NULL,             -- Markdown
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
