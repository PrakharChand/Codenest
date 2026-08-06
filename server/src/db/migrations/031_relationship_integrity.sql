-- ============================================================
-- 031_relationship_integrity.sql
-- Database Integrity Constraints for Connections, Requests, and Community Members
-- ============================================================

-- 1. Ensure connections table has UNIQUE constraint on (follower_id, following_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unq_connections_follower_following'
  ) THEN
    ALTER TABLE connections ADD CONSTRAINT unq_connections_follower_following UNIQUE (follower_id, following_id);
  END IF;
END $$;

-- 2. Ensure connection_requests table has UNIQUE constraint on (requester_id, requestee_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unq_connection_requests_pair'
  ) THEN
    ALTER TABLE connection_requests ADD CONSTRAINT unq_connection_requests_pair UNIQUE (requester_id, requestee_id);
  END IF;
END $$;

-- 3. Ensure community_members table has UNIQUE constraint on (community_id, user_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unq_community_members_pair'
  ) THEN
    ALTER TABLE community_members ADD CONSTRAINT unq_community_members_pair UNIQUE (community_id, user_id);
  END IF;
END $$;

-- Clean up any duplicate records if any exist
DELETE FROM connections a USING connections b
WHERE a.id < b.id AND a.follower_id = b.follower_id AND a.following_id = b.following_id;

DELETE FROM community_members a USING community_members b
WHERE a.id < b.id AND a.community_id = b.community_id AND a.user_id = b.user_id;
