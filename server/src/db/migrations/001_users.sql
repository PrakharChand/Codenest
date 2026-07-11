-- ============================================================
-- 001_users.sql
-- Identity core table — holds BOTH identities per Rule 1.
--
-- Deletion policy: users is the root anchor. No ON DELETE CASCADE
-- from here — child tables (posts, connections, etc.) cascade
-- off users so deleting a user removes all their content.
--
-- SECURITY — Rule 2: The anonymous columns below must NEVER
-- appear in a /api/shadow/ response alongside public columns.
-- SQL queries on shadow routes must SELECT only anonymous
-- columns explicitly. SELECT * is forbidden on this table.
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id                        SERIAL PRIMARY KEY,

  -- ── Public identity fields ─────────────────────────────────
  name                      TEXT NOT NULL,
  email                     TEXT NOT NULL UNIQUE,
  password_hash             TEXT,            -- NULL for OAuth-only users
  bio                       TEXT,
  avatar_url                TEXT,
  github_url                TEXT,
  twitter_url               TEXT,

  -- ── Anonymous identity fields (Rule 2 boundary) ───────────
  -- These columns MUST NEVER be returned from any /api/shadow/
  -- endpoint together with the public fields above. Queries on
  -- shadow routes must use explicit column lists limited to these
  -- anonymous columns only. shadowSerializer.js is the sole
  -- permitted formatter for shadow responses.
  has_anonymous_identity    BOOLEAN NOT NULL DEFAULT FALSE,
  anonymous_username        TEXT UNIQUE,     -- NULL until identity is created (Rule 3: permanent once set)
  anonymous_avatar_url      TEXT,
  anonymous_reputation_score INTEGER NOT NULL DEFAULT 0,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
