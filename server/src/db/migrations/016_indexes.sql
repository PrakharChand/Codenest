-- ============================================================
-- 016_indexes.sql
-- Performance indexes — all in one file so indexing decisions
-- are reviewable in one place, separate from schema definitions.
--
-- Each index is annotated with the query it serves.
-- ============================================================

-- posts(user_id) — serves: "get all posts by a user" (profile feed)
CREATE INDEX IF NOT EXISTS idx_posts_user_id
  ON posts(user_id);

-- posts(created_at DESC) — serves: global feed sorted by newest
CREATE INDEX IF NOT EXISTS idx_posts_created_at
  ON posts(created_at DESC);

-- comments(post_id) — serves: "get all comments for a post"
CREATE INDEX IF NOT EXISTS idx_comments_post_id
  ON comments(post_id);

-- connections(following_id) — serves: "who follows this user?" (reverse lookup)
CREATE INDEX IF NOT EXISTS idx_connections_following_id
  ON connections(following_id);

-- community_posts(community_id) — serves: "get posts in a community"
CREATE INDEX IF NOT EXISTS idx_community_posts_community_id
  ON community_posts(community_id);

-- post_tags(tag_id) — serves: "get all posts with a given tag"
CREATE INDEX IF NOT EXISTS idx_post_tags_tag_id
  ON post_tags(tag_id);

-- shadow_submissions(user_id) — serves: Rule 5 self-exclusion filter
-- and "get my own submissions" owner view
CREATE INDEX IF NOT EXISTS idx_shadow_submissions_user_id
  ON shadow_submissions(user_id);

-- shadow_submissions(created_at DESC) — serves: the review queue sorted by newest
CREATE INDEX IF NOT EXISTS idx_shadow_submissions_created_at
  ON shadow_submissions(created_at DESC);

-- shadow_reviews(submission_id) — serves: "get all reviews for a submission"
CREATE INDEX IF NOT EXISTS idx_shadow_reviews_submission_id
  ON shadow_reviews(submission_id);

-- shadow_reviews(reviewer_id) — serves: "how many reviews has this shadow user written?"
-- (reputation queries in Phase 4)
CREATE INDEX IF NOT EXISTS idx_shadow_reviews_reviewer_id
  ON shadow_reviews(reviewer_id);

-- notifications(user_id, identity_context, is_read) — serves: unread notification
-- count per surface (Feed bell vs Shadow bell)
CREATE INDEX IF NOT EXISTS idx_notifications_user_context_read
  ON notifications(user_id, identity_context, is_read);
