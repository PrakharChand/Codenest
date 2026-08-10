-- Migration 043: Public Feed Partial Indexes for CodeNest
-- Purpose: Accelerate default public post feed ordering and like count filtering.

CREATE INDEX IF NOT EXISTS idx_posts_public_created
ON posts(created_at DESC)
WHERE visibility = 'public';

CREATE INDEX IF NOT EXISTS idx_posts_public_top
ON posts(like_count DESC, created_at DESC)
WHERE visibility = 'public';
