-- ============================================================
-- 010_post_tags.sql
-- Many-to-many join between posts and tags.
--
-- Deletion policy:
--   post_id → ON DELETE CASCADE: tag associations die with post.
--   tag_id  → ON DELETE CASCADE: associations die if tag deleted.
-- Composite PK (post_id, tag_id) prevents duplicate associations.
-- ============================================================

CREATE TABLE IF NOT EXISTS post_tags (
  post_id INTEGER NOT NULL
            REFERENCES posts(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL
            REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);
