-- ============================================================
-- 020_shadow_reviews_unique.sql
-- Adds UNIQUE constraint on (submission_id, reviewer_id) to
-- prevent duplicate reviews at the database level.
--
-- Why this is migration 020, not part of 012_shadow_reviews.sql:
--   The race-condition risk became concrete when building the
--   review endpoint in Phase 4. Two browser tabs submitting
--   simultaneously can beat a JS-level check. Only a DB
--   constraint provides true deduplication under concurrency.
--   Same honest schema-evolution approach as migration 019.
--
-- Partial unique index (WHERE reviewer_id IS NOT NULL):
--   Phase 5 AI reviews land with reviewer_id = NULL. A plain
--   UNIQUE would block multiple AI reviews on the same
--   submission. The partial index only constrains human reviews
--   (those with a non-null reviewer_id), future-proofing for
--   Phase 5 without requiring another migration.
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_shadow_reviews_submission_reviewer
  ON shadow_reviews (submission_id, reviewer_id)
  WHERE reviewer_id IS NOT NULL;
