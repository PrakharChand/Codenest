-- ============================================================
-- 003_comments.sql
-- Comments on Nest Feed posts.
--
-- Deletion policy:
--   post_id  → ON DELETE CASCADE: comments die with the post.
--   user_id  → ON DELETE CASCADE: comments die with the user.
-- Both are intentional — orphan comments without an author or
-- post are not useful and create referential ambiguity.
-- ============================================================

CREATE TABLE IF NOT EXISTS comments (
  id         SERIAL PRIMARY KEY,
  post_id    INTEGER NOT NULL
               REFERENCES posts(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL
               REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
