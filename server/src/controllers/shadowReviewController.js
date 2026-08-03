/**
 * server/src/controllers/shadowReviewController.js
 *
 * SECURITY — reviews for Shadow submissions.
 *
 * Guardrails (all at query level, not JS checks):
 *   1. Self-review blocked: submission's user_id <> req.user.id → forbidden (Rule 5)
 *   2. Duplicate review: DB unique index (migration 020) → 409 via errorHandler
 *   3. Counter + row: always transactional via withTransaction
 *
 * A review is IMMUTABLE once posted — no edit/delete endpoint.
 * This is recorded in CODENEST_REFERENCE.md.
 */

const { query }         = require('../config/db');
const withTransaction   = require('../utils/withTransaction');
const ApiError          = require('../utils/ApiError');
const createNotification = require('../utils/createNotification');

// ── POST /api/shadow/submissions/:id/reviews ─────────────────────────────

async function createReview(req, res) {
  const submissionId = parseInt(req.params.id, 10);
  const reviewerId   = req.user.id;
  const { what_good, what_improve, resources, helpfulness_rating } = req.body;

  // Verify submission exists and check for self-review (Rule 5)
  const { rows: subRows } = await query(
    'SELECT id, user_id FROM shadow_submissions WHERE id = $1',
    [submissionId]
  );

  if (!subRows.length) throw ApiError.notFound('Submission not found.');

  // Rule 5 — defense-in-depth: queue already hides own submissions,
  // but a direct POST call could bypass the queue. Block here too.
  if (subRows[0].user_id === reviewerId) {
    throw ApiError.forbidden('You cannot review your own submission.');
  }

  // Duplicate review → DB unique index (23505) → errorHandler → clean 409
  // "You've already reviewed this submission" with field: submission_id, reviewer_id
  const review = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO shadow_reviews (submission_id, reviewer_id, what_good, what_improve, resources, helpfulness_rating)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, what_good, what_improve, resources, helpfulness_rating,
                 helpful_vote_count, is_ai_review, created_at`,
      [submissionId, reviewerId, what_good, what_improve, resources || null, helpfulness_rating]
    );

    // Counter integrity: review_count always matches actual review rows
    await client.query(
      'UPDATE shadow_submissions SET review_count = review_count + 1 WHERE id = $1',
      [submissionId]
    );

    // IDENTITY RULE: Shadow notifications must never contain real-identity text.
    // "Your submission received a new review" — no name, no username.
    await createNotification({
      userId: subRows[0].user_id,
      type: 'review',
      message: 'Your submission received a new review.',
      referenceId: submissionId,
      identityContext: 'shadow',
      client,
    });

    return rows[0];
  });

  // SECURITY: RETURNING clause omits reviewer_id and submission's user_id.
  // No real identity field present in the response.
  return res.status(201).json(review);
}

// ── GET /api/shadow/my-reviews ────────────────────────────────────────────
// Returns all submissions the current user has reviewed.
// SECURITY: Only anonymous fields. No real identities of submitters or self.

async function getMyReviews(req, res) {
  const { parsePagination, buildPaginatedResponse } = require('../utils/paginate');
  const reviewerId = req.user.id;
  const { page, limit, offset } = parsePagination(req.query);

  const [countResult, dataResult] = await Promise.all([
    query(
      'SELECT COUNT(*) FROM shadow_reviews WHERE reviewer_id = $1',
      [reviewerId]
    ),
    query(
      // SECURITY: Explicit column list — no user_id, no reviewer_id in output
      `SELECT
         sr.id           AS review_id,
         sr.what_good,
         sr.what_improve,
         sr.resources,
         sr.helpfulness_rating,
         sr.helpful_vote_count,
         sr.is_ai_review,
         sr.created_at   AS reviewed_at,
         ss.id           AS submission_id,
         ss.title        AS submission_title,
         ss.language_tag,
         ss.review_count
       FROM shadow_reviews sr
       JOIN shadow_submissions ss ON ss.id = sr.submission_id
       WHERE sr.reviewer_id = $1
       ORDER BY sr.created_at DESC
       LIMIT $2 OFFSET $3`,
      [reviewerId, limit, offset]
    ),
  ]);

  const total = parseInt(countResult.rows[0].count, 10);
  return res.json(buildPaginatedResponse(dataResult.rows, total, page, limit));
}

module.exports = { createReview, getMyReviews };
