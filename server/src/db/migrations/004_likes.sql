-- ============================================================
-- 004_likes.sql
-- Post likes — one per user per post enforced by composite PK.
--
-- Deletion policy:
--   user_id → ON DELETE CASCADE: likes die with the user.
--   post_id → ON DELETE CASCADE: likes die with the post.
-- The composite PRIMARY KEY (user_id, post_id) enforces the
-- "no duplicate likes" rule at the database level — not in JS.
-- ============================================================

CREATE TABLE IF NOT EXISTS likes (
  user_id    INTEGER NOT NULL
               REFERENCES users(id) ON DELETE CASCADE,
  post_id    INTEGER NOT NULL
               REFERENCES posts(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, post_id)
);
