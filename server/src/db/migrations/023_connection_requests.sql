-- ============================================================
-- 023_connection_requests.sql
-- Connection requests between users (symmetric, approval-based).
--
-- Status lifecycle:
--   pending  → accepted  (requester now follows requestee bidirectionally)
--   pending  → declined  (soft decline, requestee can later re-accept)
--
-- Constraints:
--   UNIQUE (requester_id, requestee_id) — one pending request per pair.
--   CHECK requester_id <> requestee_id  — no self-requests.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'connection_request_status') THEN
    CREATE TYPE connection_request_status AS ENUM ('pending', 'accepted', 'declined');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS connection_requests (
  id             SERIAL PRIMARY KEY,
  requester_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requestee_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status         connection_request_status NOT NULL DEFAULT 'pending',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT no_self_request CHECK (requester_id <> requestee_id),
  CONSTRAINT one_request_per_pair UNIQUE (requester_id, requestee_id)
);

CREATE INDEX IF NOT EXISTS idx_connection_requests_requestee
  ON connection_requests (requestee_id, status);

CREATE INDEX IF NOT EXISTS idx_connection_requests_requester
  ON connection_requests (requester_id, status);
