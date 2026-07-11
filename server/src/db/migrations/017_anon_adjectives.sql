-- ============================================================
-- 017_anon_adjectives.sql
-- Lookup table for the anonymous-username adjective pool.
-- Rule 3: anonymous usernames are generated via a three-dropdown
-- flow (adjective + animal + number). Storing these as DB rows
-- makes the generator data-driven — Phase 2 reads this table
-- rather than importing a hardcoded JS constant.
--
-- Populated by seed.js with ON CONFLICT DO NOTHING — idempotent.
-- ============================================================

CREATE TABLE IF NOT EXISTS anon_adjectives (
  id   SERIAL PRIMARY KEY,
  word TEXT NOT NULL UNIQUE
);
