-- Migration 040: Performance & High-Throughput Index Tuning for CodeNest
-- Purpose: Accelerate feed queries, live chat lookups, pending AI reviews, and identity verification.

-- 1. Partial Index for Active Non-Banned Users
CREATE INDEX IF NOT EXISTS idx_users_active_lookup 
ON users(id, email) 
WHERE is_banned = FALSE;

-- 2. Composite Index for Author Post Pagination (Feed & User Profile)
CREATE INDEX IF NOT EXISTS idx_posts_author_created 
ON posts(author_id, created_at DESC);

-- 3. Partial Index for Pending Anonymous Reviews (For Hourly AI Review Cron & Un-reviewed Queue)
CREATE INDEX IF NOT EXISTS idx_shadow_pending_reviews 
ON shadow_submissions(created_at ASC) 
WHERE review_count = 0;

-- 4. Composite Index for Mutual Connections Verification & Live Chat Guards
CREATE INDEX IF NOT EXISTS idx_connections_bidirectional_status 
ON connections(user_id, connected_user_id, status);

-- 5. Composite Index for Real-Time Messages Ordering & Conversation Streams
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON messages(conversation_id, created_at DESC);

-- 6. Partial Index for Fast Unread Notifications Lookup
CREATE INDEX IF NOT EXISTS idx_notifications_unread_recipient 
ON notifications(user_id, created_at DESC) 
WHERE is_read = FALSE;

-- 7. Composite Index for Community Posts Filtering
CREATE INDEX IF NOT EXISTS idx_community_posts_community_created 
ON community_posts(community_id, created_at DESC);

-- 8. Partial Index for Banned Identifiers Fast Verification
CREATE INDEX IF NOT EXISTS idx_banned_identifiers_fast_lookup 
ON banned_identifiers(identifier_value, identifier_type);
