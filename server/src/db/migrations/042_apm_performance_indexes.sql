-- Migration 042: Targeted High-Throughput APM Performance Indexes for CodeNest
-- Purpose: Eliminate full table scans and sorting overhead for feed, activity, chat, and notification streams.

-- 1. Composite Index for User Activity Breakdown (posts, comments, reviews)
CREATE INDEX IF NOT EXISTS idx_comments_user_created
ON comments(user_id, created_at DESC);

-- 2. Partial Composite Index for Unread Chat Messages Stream
CREATE INDEX IF NOT EXISTS idx_messages_unread
ON messages(conversation_id, sender_id)
WHERE is_read = FALSE;

-- 3. Composite Index for Filtered Notification Stream (user_id + identity_context + created_at)
CREATE INDEX IF NOT EXISTS idx_notifications_user_context_created
ON notifications(user_id, identity_context, created_at DESC);

-- 4. Composite Index for Reverse Follower Lookups & Mutual Connections
CREATE INDEX IF NOT EXISTS idx_connections_following_follower
ON connections(following_id, follower_id);
