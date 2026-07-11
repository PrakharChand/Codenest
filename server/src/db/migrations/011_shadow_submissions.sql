-- ============================================================
-- 011_shadow_submissions.sql
-- Code submissions on Nest Shadow (bias-free review surface).
--
-- Deletion policy:
--   user_id → ON DELETE CASCADE: submissions die with the user.
--
-- SECURITY — Rule 2 & Rule 5:
--   user_id is stored here for ownership enforcement (Rule 5:
--   "a user cannot review their own submission — enforced at
--   query level by excluding rows where user_id = current_user").
--   user_id MUST NEVER be returned in a /api/shadow/ response.
--   Queries must SELECT only shadow-safe columns explicitly.
--   shadowSerializer.js enforces the allow-list at the app layer.
-- ============================================================

CREATE TABLE IF NOT EXISTS shadow_submissions (
  id           SERIAL PRIMARY KEY,

  -- Stored for Rule 5 enforcement ONLY — never returned in shadow responses.
  user_id      INTEGER NOT NULL
                 REFERENCES users(id) ON DELETE CASCADE,

  title        TEXT NOT NULL,
  content      TEXT NOT NULL,           -- Markdown code + context
  language_tag TEXT NOT NULL,           -- e.g. 'javascript', 'python'
  question     TEXT NOT NULL,           -- "What specifically should reviewers focus on?"
  review_count INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
