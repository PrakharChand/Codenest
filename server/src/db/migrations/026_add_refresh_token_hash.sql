-- ============================================================
-- 026_add_refresh_token_hash.sql
-- Add refresh_token_hash column to users table for Refresh Token Rotation
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token_hash TEXT DEFAULT NULL;
