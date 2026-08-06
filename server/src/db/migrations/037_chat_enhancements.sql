-- ============================================================
-- 037_chat_enhancements.sql
-- Add is_edited column to messages table for chat message editing.
-- ============================================================

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;
