-- ============================================================
-- 025_add_is_onboarded.sql
-- Add is_onboarded boolean column to users table defaulting to false.
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN NOT NULL DEFAULT FALSE;
