-- ============================================================
-- 015_notifications.sql
-- In-app notifications for both Feed and Shadow surfaces.
--
-- Deletion policy:
--   user_id → ON DELETE CASCADE: notifications die with the user.
--
-- identity_context distinguishes which notification bell renders
-- it: 'public' = Feed bell, 'shadow' = Shadow bell.
-- This allows the UI to group and show them separately without
-- leaking which surface a notification came from.
--
-- reference_id is the related entity (post id, submission id, etc.)
-- resolved by the notification type at read time.
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER NOT NULL
                     REFERENCES users(id) ON DELETE CASCADE,
  type             TEXT NOT NULL
                     CHECK (type IN ('like', 'comment', 'share', 'connection', 'review', 'mention')),
  message          TEXT NOT NULL,
  reference_id     INTEGER,             -- nullable: the related post, submission, etc.
  identity_context TEXT NOT NULL
                     CHECK (identity_context IN ('public', 'shadow')),
  is_read          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
