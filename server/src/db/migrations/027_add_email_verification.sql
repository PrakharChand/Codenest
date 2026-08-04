-- ============================================================
-- 027_add_email_verification.sql
-- Add verified and verification_token columns to users table
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT DEFAULT NULL;
