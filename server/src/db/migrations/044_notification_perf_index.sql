-- Migration 044: Notification query performance index
-- Covers the exact WHERE + ORDER BY pattern used by listNotifications:
--   WHERE user_id = $1 AND identity_context = $2
--   ORDER BY created_at DESC
-- Eliminates the sequential scan on notifications for every bell icon load.
-- NOTE: No CONCURRENTLY — the migrate runner uses a transaction block.

CREATE INDEX IF NOT EXISTS idx_notifications_user_context_created
  ON notifications (user_id, identity_context, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications (user_id, created_at DESC);
