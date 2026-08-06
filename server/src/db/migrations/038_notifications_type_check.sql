-- ============================================================
-- 038_notifications_type_check.sql
-- Expand notifications type CHECK constraint to accept 'connection_request' and 'connection_accepted'.
-- ============================================================

ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('like', 'comment', 'share', 'connection', 'connection_request', 'connection_accepted', 'review', 'mention'));
