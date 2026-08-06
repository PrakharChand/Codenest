-- ============================================================
-- 033_community_topics_and_requests.sql
-- Creates community_topics and community_join_requests tables.
-- Adds topic_id FK to community_posts.
-- ============================================================

-- 1. Community Topics
CREATE TABLE IF NOT EXISTS community_topics (
  id              SERIAL PRIMARY KEY,
  community_id    INTEGER NOT NULL
                    REFERENCES communities(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  created_by      INTEGER
                    REFERENCES users(id) ON DELETE SET NULL,
  post_count      INTEGER NOT NULL DEFAULT 0,
  is_pinned       BOOLEAN NOT NULL DEFAULT FALSE,
  is_locked       BOOLEAN NOT NULL DEFAULT FALSE,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_topics_community_id
  ON community_topics(community_id);

-- 2. Community Join Requests (for private communities)
CREATE TABLE IF NOT EXISTS community_join_requests (
  id           SERIAL PRIMARY KEY,
  community_id INTEGER NOT NULL
                 REFERENCES communities(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL
                 REFERENCES users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'approved', 'rejected')),
  message      TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ,
  UNIQUE (community_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_join_requests_community_status
  ON community_join_requests(community_id, status);

-- 3. Add topic_id to community_posts (nullable — posts without topic go to General)
ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS topic_id INTEGER
    REFERENCES community_topics(id) ON DELETE SET NULL;

-- 4. Add like_count and comment_count to community_posts
ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS like_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS comment_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;

-- 5. Create a default "General" topic for every existing community
INSERT INTO community_topics (community_id, name, description, created_by, is_pinned)
SELECT c.id, 'General', 'General discussion for this community', c.created_by, TRUE
FROM communities c
WHERE NOT EXISTS (
  SELECT 1 FROM community_topics t WHERE t.community_id = c.id AND t.name = 'General'
);

-- 6. Update topic_count on communities
UPDATE communities c
SET topic_count = (
  SELECT COUNT(*) FROM community_topics t WHERE t.community_id = c.id
);
