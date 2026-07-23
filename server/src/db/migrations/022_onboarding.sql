-- Migration 022: Add onboarding_completed_at to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ DEFAULT NULL;
