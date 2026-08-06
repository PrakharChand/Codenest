-- ============================================================
-- 034_shadow_communities.sql
-- Anonymous Communities for Nest Shadow (separate from Nest Feed)
-- Creator & members are attached by user_id for integrity, but
-- public queries return ONLY anonymous_username and anonymous_avatar_url.
-- ============================================================

-- 1. Anonymous Communities Table
CREATE TABLE IF NOT EXISTS shadow_communities (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  description  TEXT,
  type         TEXT NOT NULL DEFAULT 'public' CHECK (type IN ('public', 'private')),
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  member_count INTEGER NOT NULL DEFAULT 1,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Anonymous Community Members Table
CREATE TABLE IF NOT EXISTS shadow_community_members (
  community_id INTEGER NOT NULL REFERENCES shadow_communities(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (community_id, user_id)
);

-- 3. Add shadow_community_id to shadow_community_posts
ALTER TABLE shadow_community_posts
  ADD COLUMN IF NOT EXISTS shadow_community_id INTEGER
    REFERENCES shadow_communities(id) ON DELETE CASCADE;

-- 4. Create default "Global Anonymous Lounge" community if empty
INSERT INTO shadow_communities (name, description, type, member_count)
SELECT 'Global Anonymous Lounge', 'Default anonymous lounge for software architecture, code reviews, and tech discussions.', 'public', 1
WHERE NOT EXISTS (SELECT 1 FROM shadow_communities WHERE name = 'Global Anonymous Lounge');
