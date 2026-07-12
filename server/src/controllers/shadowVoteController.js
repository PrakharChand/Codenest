/**
 * server/src/controllers/shadowVoteController.js
 *
 * Helpful voting + reputation system.
 *
 * Reputation definition (locked in CODENEST_REFERENCE.md):
 *   Reputation is a stored running total on users.anonymous_reputation_score,
 *   updated transactionally at vote time — NOT recomputed on read.
 *   A helpful vote moves three things in one transaction:
 *     1. Insert shadow_helpful_votes row (composite PK dedupes)
 *     2. Increment shadow_reviews.helpful_vote_count
 *     3. Increment users.anonymous_reputation_score for the review author
 *
 * Asymmetry note: this transaction WRITES to a users column
 * (anonymous_reputation_score) but the review-author's real identity
 * is never read or returned — only their reputation integer changes.
 *
 * Self-vote: blocked at query level (reviewer_id <> current user).
 * Duplicate vote: ON CONFLICT DO NOTHING → idempotent success
 * (matches Phase 3 like/join convention).
 */

const { query }         = require('../config/db');
const withTransaction   = require('../utils/withTransaction');
const ApiError          = require('../utils/ApiError');

// ── POST /api/shadow/reviews/:id/helpful ─────────────────────────────────

async function voteHelpful(req, res) {
  const reviewId = parseInt(req.params.id, 10);
  const voterId  = req.user.id;

  // Verify review exists and get the reviewer_id for self-vote check
  const { rows: reviewRows } = await query(
    'SELECT id, reviewer_id FROM shadow_reviews WHERE id = $1',
    [reviewId]
  );

  if (!reviewRows.length) throw ApiError.notFound('Review not found.');

  // Self-vote blocked at query level
  if (reviewRows[0].reviewer_id === voterId) {
    throw ApiError.forbidden('You cannot vote on your own review.');
  }

  const reviewAuthorId = reviewRows[0].reviewer_id;

  await withTransaction(async (client) => {
    // 1. Insert vote — duplicate hits composite PK → ON CONFLICT DO NOTHING
    const { rowCount } = await client.query(
      `INSERT INTO shadow_helpful_votes (user_id, review_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [voterId, reviewId]
    );

    // Only bump counters if a new vote was actually inserted
    if (rowCount > 0) {
      // 2. Increment review's helpful_vote_count
      await client.query(
        'UPDATE shadow_reviews SET helpful_vote_count = helpful_vote_count + 1 WHERE id = $1',
        [reviewId]
      );

      // 3. Increment review author's anonymous_reputation_score
      // ASYMMETRY: writes to users table, but only the reputation integer.
      // The review author's real identity (name, email) is never read here.
      if (reviewAuthorId !== null) {
        await client.query(
          'UPDATE users SET anonymous_reputation_score = anonymous_reputation_score + 1 WHERE id = $1',
          [reviewAuthorId]
        );
      }
    }
  });

  return res.json({ message: 'Vote recorded.' });
}

// ── GET /api/shadow/me ───────────────────────────────────────────────────
// Minimal anonymous profile: anon username, avatar, reputation, stats.
// Returns ONLY anonymous fields via explicit column list — no real identity.

async function getShadowProfile(req, res) {
  const userId = req.user.id;

  const [userResult, subCountResult, reviewCountResult] = await Promise.all([
    query(
      `SELECT anonymous_username, anonymous_avatar_url, anonymous_reputation_score
       FROM users WHERE id = $1`,
      [userId]
    ),
    query(
      'SELECT COUNT(*) FROM shadow_submissions WHERE user_id = $1',
      [userId]
    ),
    query(
      'SELECT COUNT(*) FROM shadow_reviews WHERE reviewer_id = $1',
      [userId]
    ),
  ]);

  if (!userResult.rows.length) throw ApiError.notFound('User not found.');

  // SECURITY: Only anonymous_username, anonymous_avatar_url, anonymous_reputation_score
  // from users. No name, email, avatar_url, bio, password_hash.
  return res.json({
    ...userResult.rows[0],
    total_submissions: parseInt(subCountResult.rows[0].count, 10),
    total_reviews_given: parseInt(reviewCountResult.rows[0].count, 10),
  });
}

module.exports = { voteHelpful, getShadowProfile };
