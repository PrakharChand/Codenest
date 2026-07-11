-- ============================================================
-- 013_shadow_helpful_votes.sql
-- "Helpful" votes on Shadow reviews — one per user per review.
--
-- Deletion policy:
--   user_id   → ON DELETE CASCADE: votes die with the voter.
--   review_id → ON DELETE CASCADE: votes die with the review.
-- Composite PK (user_id, review_id) enforces one vote per user
-- per review at the database level — not only in JS.
-- ============================================================

CREATE TABLE IF NOT EXISTS shadow_helpful_votes (
  user_id   INTEGER NOT NULL
              REFERENCES users(id) ON DELETE CASCADE,
  review_id INTEGER NOT NULL
              REFERENCES shadow_reviews(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, review_id)
);
