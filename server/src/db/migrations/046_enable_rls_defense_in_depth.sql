-- ============================================================
-- 046_enable_rls_defense_in_depth.sql
--
-- PURPOSE:
--   Hardens Supabase PostgreSQL by enabling Row Level Security (RLS)
--   across all public tables and revoking direct schema privileges
--   from Supabase's auto-generated API roles ('anon', 'authenticated').
--
-- WHY THIS IS SAFE:
--   1. CodeNest uses a 3-tier architecture where the Express server
--      connects as the database owner ('postgres') over standard TCP.
--   2. In PostgreSQL, superusers and table owners bypass RLS by default
--      (FORCE ROW LEVEL SECURITY is NOT enabled).
--   3. Therefore, Express and its connection pool retain 100% full,
--      unrestricted access to all tables, queries, and transactions.
--   4. Any unauthorized external caller hitting Supabase's public
--      PostgREST API endpoint (/rest/v1/*) will be completely blocked,
--      resolving all Supabase Advisor "RLS Disabled in Public" alerts.
-- ============================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  -- 1. Enable RLS on all existing tables in public schema
  FOR r IN (
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;

  -- 2. Revoke all privileges on public tables from Supabase API roles (if they exist)
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon';
    EXECUTE 'REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated';
    EXECUTE 'REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES FROM authenticated';
  END IF;
END $$;
