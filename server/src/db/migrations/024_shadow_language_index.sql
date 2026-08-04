-- ============================================================
-- 024_shadow_language_index.sql
-- Index on shadow_submissions(language_tag) to efficiently
-- support the queue language filter added to GET /api/shadow/queue.
--
-- Also indexes lower(language_tag) for case-insensitive lookups
-- (e.g. "JavaScript" and "javascript" both match).
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_shadow_submissions_language_tag
  ON shadow_submissions(language_tag);

CREATE INDEX IF NOT EXISTS idx_shadow_submissions_language_lower
  ON shadow_submissions(lower(language_tag));
