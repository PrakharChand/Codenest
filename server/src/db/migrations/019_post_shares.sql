-- ============================================================
-- 019_post_shares.sql
-- Adds shared_from_post_id to posts for the reshare feature.
--
-- Why this is migration 019 not part of 002_posts.sql:
--   The share relationship became concrete only when building
--   the /api/posts/:id/share endpoint in Phase 3. Editing an
--   already-applied migration would break _migrations idempotency
--   proven in Phase 1. New numbered migrations are the honest,
--   traceable way to evolve a live schema mid-build.
--
-- Deletion policy:
--   ON DELETE SET NULL: if the original post is deleted, the
--   reshare survives but shows "original removed" — the reshare
--   content belongs to the sharer, not the original author.
-- ============================================================

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS shared_from_post_id INTEGER
    REFERENCES posts(id) ON DELETE SET NULL;
