-- Migration 045: Additional APM Performance Indexes for CodeNest
-- Purpose: Optimize connection request status filtering and user activity UNION queries.

CREATE INDEX IF NOT EXISTS idx_connection_requests_requester_status
ON connection_requests(requester_id, status);

CREATE INDEX IF NOT EXISTS idx_connection_requests_requestee_status
ON connection_requests(requestee_id, status);

CREATE INDEX IF NOT EXISTS idx_posts_user_created
ON posts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shadow_reviews_reviewer_created
ON shadow_reviews(reviewer_id, created_at DESC);
