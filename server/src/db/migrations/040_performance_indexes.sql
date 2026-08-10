-- Migration 040: Performance & High-Throughput Index Tuning for CodeNest
-- Purpose: Accelerate feed queries, follower lookups, un-reviewed code queue, and notification streams.

-- 1. Partial Index for Active Non-Banned Users
CREATE INDEX IF NOT EXISTS idx_users_active_lookup 
ON users(id, email) 
WHERE is_banned = FALSE;

-- 2. Composite Index for User Post Pagination (Feed & Profile Posts)
CREATE INDEX IF NOT EXISTS idx_posts_user_created 
ON posts(user_id, created_at DESC);

-- 3. Partial Index for Pending Anonymous Code Submissions (Hourly AI Review Cron & Un-reviewed Queue)
CREATE INDEX IF NOT EXISTS idx_shadow_pending_reviews 
ON shadow_submissions(created_at ASC) 
WHERE review_count = 0;

-- 4. Composite Index for Followers/Following Connections Lookups
CREATE INDEX IF NOT EXISTS idx_connections_follower_following 
ON connections(follower_id, following_id);

-- 5. Composite Index for Unread Notifications Stream
CREATE INDEX IF NOT EXISTS idx_notifications_unread_user 
ON notifications(user_id, created_at DESC) 
WHERE is_read = FALSE;

-- 6. Composite Index for Community Posts Ordering
CREATE INDEX IF NOT EXISTS idx_community_posts_community_created 
ON community_posts(community_id, created_at DESC);
