-- ============================================================
-- 002_posts.sql
-- Nest Feed posts — public identity surface.
--
-- Deletion policy: ON DELETE CASCADE from users.
-- A user's posts are personal content; deleting the user removes
-- their posts. Counters (like_count, comment_count, share_count)
-- are denormalized for performance — kept in sync by triggers
-- or controller logic, never computed live on every read.
-- ============================================================

CREATE TABLE IF NOT EXISTS posts (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL
                  REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,          -- stored as Markdown
  image_url     TEXT,                   -- nullable — not all posts have images
  visibility    TEXT NOT NULL DEFAULT 'public'
                  CHECK (visibility IN ('public', 'private', 'draft')),
  like_count    INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  share_count   INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
