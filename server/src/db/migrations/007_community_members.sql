-- ============================================================
-- 007_community_members.sql
-- Membership join table between users and communities.
--
-- Deletion policy:
--   community_id → ON DELETE CASCADE: memberships die with community.
--   user_id      → ON DELETE CASCADE: memberships die with user.
-- Composite PK (community_id, user_id) prevents duplicate membership.
-- ============================================================

CREATE TABLE IF NOT EXISTS community_members (
  community_id INTEGER NOT NULL
                 REFERENCES communities(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL
                 REFERENCES users(id) ON DELETE CASCADE,
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (community_id, user_id)
);
