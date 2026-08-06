-- ============================================================
-- 032_community_roles_and_type.sql
-- Adds community type (public/private) and member role system.
-- Safe and fully additive — no data loss.
-- ============================================================

-- 1. Add type column to communities (default public for existing ones)
ALTER TABLE communities
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'public'
    CHECK (type IN ('public', 'private'));

-- 2. Add topic_count to communities
ALTER TABLE communities
  ADD COLUMN IF NOT EXISTS topic_count INTEGER NOT NULL DEFAULT 0;

-- 3. Add role column to community_members
ALTER TABLE community_members
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'admin', 'member'));

-- 4. Backfill: set role = 'owner' for the creator of each community
--    (only where that user is still a member)
UPDATE community_members cm
SET role = 'owner'
FROM communities c
WHERE c.id = cm.community_id
  AND c.created_by = cm.user_id
  AND cm.role = 'member';
