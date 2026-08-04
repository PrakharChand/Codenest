/**
 * server/src/controllers/shadowSubmissionController.js
 *
 * SECURITY — HIGHEST-SENSITIVITY CODE IN THE PROJECT
 *
 * Every query in this file uses an EXPLICIT anonymous-only column list.
 * No SELECT *. No selecting name, email, avatar_url, bio, password_hash.
 * user_id is used in WHERE/JOIN conditions (for ownership + Rule 5 exclusion)
 * but NEVER appears in any SELECT list or response object.
 *
 * Identity Rules enforced:
 *   Rule 2 — SQL layer: only anonymous columns projected
 *   Rule 5 — queue excludes own submissions AND already-reviewed submissions
 *   Rule 6 — any real-identity leak is a stop-everything bug
 *
 * Content limits (recorded in CODENEST_REFERENCE.md):
 *   Submission title:    max 200 characters
 *   Submission content:  max 100,000 characters (code can be long)
 *   Submission question: max 2,000 characters
 *   Language tag:        max 50 characters
 *
 * Language filter (added):
 *   GET /api/shadow/queue?language=javascript
 *   GET /api/shadow/queue/languages  — distinct language tags used in the queue
 */

const { query }                                    = require('../config/db');
const ApiError                                     = require('../utils/ApiError');
const { parsePagination, buildPaginatedResponse }  = require('../utils/paginate');

// ── Queue content truncation ────────────────────────────────────────────
const QUEUE_CONTENT_PREVIEW_LENGTH = 300; // first N characters of content for queue

// ── POST /api/shadow/submissions ─────────────────────────────────────────

async function createSubmission(req, res) {
  const userId = req.user.id;
  const { title, content, language_tag, question } = req.body;

  const { rows } = await query(
    `INSERT INTO shadow_submissions (user_id, title, content, language_tag, question)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, title, content, language_tag, question, review_count, created_at`,
    [userId, title, content, language_tag, question]
  );

  // SECURITY: the RETURNING clause explicitly omits user_id.
  // No identity field is present in the response.
  return res.status(201).json(rows[0]);
}

// ── GET /api/shadow/queue ────────────────────────────────────────────────
// Returns submissions the current user:
//   1. Did NOT create (Rule 5 — user_id <> $currentUser)
//   2. Has NOT already reviewed (NOT EXISTS check)
//   3. (optional) Matches the ?language= query param (case-insensitive)
// NO username of any kind — not even anonymous — is returned (per spec).

async function getQueue(req, res) {
  const userId = req.user.id;
  const { page, limit, offset } = parsePagination(req.query);

  // ── Language filter ──────────────────────────────────────────────────
  // Accepted as a single lowercase string, e.g. "javascript".
  // Stored values may have mixed case so we use LOWER() on both sides.
  // Empty / missing → no filter applied.
  const rawLang  = (req.query.language || '').trim().toLowerCase();
  const hasLang  = rawLang.length > 0;

  // Build parameterised WHERE clause.
  // $1 = userId (always)
  // $2 = limit, $3 = offset (data query)
  // $4 = language (only when hasLang)
  // COUNT query uses same WHERE without LIMIT/OFFSET.
  const langCondition = hasLang ? `AND LOWER(ss.language_tag) = $4` : '';

  const baseWhere = `
    WHERE ss.user_id <> $1
      AND NOT EXISTS (
        SELECT 1 FROM shadow_reviews sr
        WHERE sr.submission_id = ss.id AND sr.reviewer_id = $1
      )
      ${langCondition}
  `;

  // Params for COUNT (no limit/offset)
  const countParams = hasLang ? [userId, rawLang] : [userId];
  // Params for data query — positional order: userId, limit, offset, [language]
  const dataParams  = hasLang
    ? [userId, limit, offset, rawLang]
    : [userId, limit, offset];

  // Rewrite $4 in COUNT to $2 when filtering
  const countWhere = hasLang
    ? baseWhere.replace('$4', '$2')
    : baseWhere;

  const [countResult, dataResult] = await Promise.all([
    query(
      `SELECT COUNT(*) FROM shadow_submissions ss ${countWhere}`,
      countParams
    ),
    query(
      `SELECT ss.id, ss.title, ss.language_tag, ss.review_count, ss.created_at,
              LEFT(ss.content, ${QUEUE_CONTENT_PREVIEW_LENGTH}) AS content_preview
       FROM shadow_submissions ss
       ${baseWhere}
       ORDER BY ss.created_at DESC
       LIMIT $2 OFFSET $3`,
      dataParams
    ),
  ]);

  // SECURITY: No user_id, no username, no anonymous_username in queue items.
  // The queue is anonymous even from the anonymous identity.
  const total = parseInt(countResult.rows[0].count, 10);
  return res.json(buildPaginatedResponse(dataResult.rows, total, page, limit));
}

// ── GET /api/shadow/queue/languages ──────────────────────────────────────
// Returns all distinct language tags currently present in the reviewable
// queue for this user (i.e. applies the same Rule 5 + already-reviewed
// exclusions so the filter only surfaces languages that have results).
//
// Response: { languages: string[] }  — sorted alphabetically, lowercase.
//
// SECURITY: No submission IDs, no user data.

async function getQueueLanguages(req, res) {
  const userId = req.user.id;

  const { rows } = await query(
    `SELECT DISTINCT LOWER(ss.language_tag) AS language
     FROM shadow_submissions ss
     WHERE ss.user_id <> $1
       AND NOT EXISTS (
         SELECT 1 FROM shadow_reviews sr
         WHERE sr.submission_id = ss.id AND sr.reviewer_id = $1
       )
       AND ss.language_tag IS NOT NULL
       AND TRIM(ss.language_tag) <> ''
     ORDER BY language ASC`,
    [userId]
  );

  return res.json({ languages: rows.map((r) => r.language) });
}

// ── GET /api/shadow/submissions/mine ─────────────────────────────────────
// Current user's own submissions + their reviews with reviewer anonymous names.
// This is the one place reviewer anonymous handles are revealed (Review Reveal rule).

async function getMySubmissions(req, res) {
  const userId = req.user.id;
  const { page, limit, offset } = parsePagination(req.query);

  const [countResult, subResult] = await Promise.all([
    query(
      'SELECT COUNT(*) FROM shadow_submissions WHERE user_id = $1',
      [userId]
    ),
    query(
      `SELECT id, title, content, language_tag, question, review_count, created_at
       FROM shadow_submissions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ),
  ]);

  const total = parseInt(countResult.rows[0].count, 10);

  // For each submission, attach reviews with reviewer's anonymous identity
  const data = await Promise.all(
    subResult.rows.map(async (sub) => {
      const { rows: reviews } = await query(
        `SELECT sr.id, sr.what_good, sr.what_improve, sr.resources,
                sr.helpfulness_rating, sr.helpful_vote_count, sr.is_ai_review, sr.created_at,
                u.anonymous_username AS reviewer_anonymous_username,
                u.anonymous_avatar_url AS reviewer_anonymous_avatar_url
         FROM shadow_reviews sr
         LEFT JOIN users u ON u.id = sr.reviewer_id
         WHERE sr.submission_id = $1
         ORDER BY sr.created_at ASC`,
        [sub.id]
      );
      // SECURITY: Only anonymous_username and anonymous_avatar_url from users.
      // reviewer_id never appears in SELECT or the response.
      return { ...sub, reviews };
    })
  );

  return res.json(buildPaginatedResponse(data, total, page, limit));
}

// ── GET /api/shadow/submissions/:id ──────────────────────────────────────
// Ownership-branch rule:
//   Owner    → full detail + reviewer anonymous usernames (Review Reveal)
//   Non-owner → content for reviewing, reviewer usernames withheld
// Submitter's identity is NEVER revealed to anyone.

async function getSubmission(req, res) {
  const submissionId = parseInt(req.params.id, 10);
  const userId       = req.user.id;

  // Fetch submission — user_id used only for ownership check, never returned
  const { rows } = await query(
    `SELECT id, title, content, language_tag, question, review_count, created_at, user_id
     FROM shadow_submissions
     WHERE id = $1`,
    [submissionId]
  );

  if (!rows.length) throw ApiError.notFound('Submission not found.');

  const submission = rows[0];
  const isOwner    = submission.user_id === userId;

  // SECURITY: Strip user_id before building the response
  const { user_id: _stripped, ...safeSub } = submission;

  if (isOwner) {
    // Review Reveal: owner sees reviewer anonymous identities
    const { rows: reviews } = await query(
      `SELECT sr.id, sr.what_good, sr.what_improve, sr.resources,
              sr.helpfulness_rating, sr.helpful_vote_count, sr.is_ai_review, sr.created_at,
              u.anonymous_username AS reviewer_anonymous_username,
              u.anonymous_avatar_url AS reviewer_anonymous_avatar_url
       FROM shadow_reviews sr
       LEFT JOIN users u ON u.id = sr.reviewer_id
       WHERE sr.submission_id = $1
       ORDER BY sr.created_at ASC`,
      [submissionId]
    );
    return res.json({ ...safeSub, reviews });
  } else {
    // Non-owner: content visible for reviewing, reviewer usernames withheld
    const { rows: reviews } = await query(
      `SELECT sr.id, sr.what_good, sr.what_improve, sr.resources,
              sr.helpfulness_rating, sr.helpful_vote_count, sr.is_ai_review, sr.created_at
       FROM shadow_reviews sr
       WHERE sr.submission_id = $1
       ORDER BY sr.created_at ASC`,
      [submissionId]
    );
    return res.json({ ...safeSub, reviews });
  }
}

module.exports = { createSubmission, getQueue, getQueueLanguages, getMySubmissions, getSubmission };
