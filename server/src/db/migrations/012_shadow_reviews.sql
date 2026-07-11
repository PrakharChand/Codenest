-- ============================================================
-- 012_shadow_reviews.sql
-- Reviews written on Shadow code submissions.
--
-- Deletion policy:
--   submission_id → ON DELETE CASCADE: reviews die with submission.
--   reviewer_id   → ON DELETE SET NULL: if a reviewer deletes their
--     account, their review's content survives (the submission owner
--     already benefited from the feedback). reviewer_id becomes NULL,
--     meaning "deleted reviewer". It must NEVER be broadcast; only
--     exposed to the submission owner as anonymous_username, resolved
--     at query time with a JOIN.
--
-- is_ai_review is reserved now (Phase 5 AI routes) so no schema
-- change is needed later. Always FALSE until AI phase is active.
-- ============================================================

CREATE TABLE IF NOT EXISTS shadow_reviews (
  id                  SERIAL PRIMARY KEY,
  submission_id       INTEGER NOT NULL
                        REFERENCES shadow_submissions(id) ON DELETE CASCADE,

  -- SET NULL: review content survives reviewer account deletion.
  -- Never broadcast — only exposed to submission owner as anon username.
  reviewer_id         INTEGER
                        REFERENCES users(id) ON DELETE SET NULL,

  what_good           TEXT NOT NULL,
  what_improve        TEXT NOT NULL,
  resources           TEXT,             -- nullable: links or docs, optional
  helpfulness_rating  INTEGER NOT NULL
                        CHECK (helpfulness_rating BETWEEN 1 AND 5),
  helpful_vote_count  INTEGER NOT NULL DEFAULT 0,

  -- Reserved for Phase 5 AI reviews — no schema change needed later.
  is_ai_review        BOOLEAN NOT NULL DEFAULT FALSE,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
