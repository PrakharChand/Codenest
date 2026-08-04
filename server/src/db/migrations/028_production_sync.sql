-- ============================================================
-- 028_production_sync.sql
-- Syncs production database with all columns added in migrations 025-027.
-- All statements use IF NOT EXISTS — fully idempotent and safe to re-run.
-- ============================================================

-- From 025_add_is_onboarded.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN NOT NULL DEFAULT FALSE;

-- From 026_add_refresh_token_hash.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token_hash TEXT DEFAULT NULL;

-- From 027_add_email_verification.sql
-- NOTE: column is named "verified" in the codebase (not "is_verified")
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT DEFAULT NULL;
