-- ============================================================
-- 029_recommendations.sql
-- Smart Developer Recommendation tracking and cooldown system
-- ============================================================

CREATE TABLE IF NOT EXISTS recommendation_cooldowns (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  candidate_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action       VARCHAR(20) NOT NULL, -- 'shown', 'dismissed', 'connected'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_rec CHECK (user_id <> candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_rec_cooldowns_user_candidate
  ON recommendation_cooldowns (user_id, candidate_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rec_cooldowns_action
  ON recommendation_cooldowns (user_id, action, created_at DESC);
