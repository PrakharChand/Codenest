-- ============================================================
-- 009_tags.sql
-- Shared taxonomy for tagging posts (e.g. react, python, dsa).
--
-- Deletion policy: tags has no parent FK — it is a root lookup
-- table. Tags are deleted only intentionally (admin action).
-- ON DELETE CASCADE on post_tags handles the post side.
--
-- Seeded with starter tech tags in seed.js.
-- ============================================================

CREATE TABLE IF NOT EXISTS tags (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);
