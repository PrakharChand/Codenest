/**
 * server/src/controllers/shadowCommunityController.js
 *
 * Anonymous community posts — separate from Phase 3's Nest Feed communities.
 * Must never join to or read from Phase 3's communities/community_posts tables.
 *
 * Security: each post's author is shown as anonymous_username/anonymous_avatar_url
 * ONLY. user_id stored for ownership but never returned.
 */

const { query }                                    = require('../config/db');
const ApiError                                     = require('../utils/ApiError');
const { parsePagination, buildPaginatedResponse }  = require('../utils/paginate');

// ── GET /api/shadow/community ────────────────────────────────────────────

async function listShadowCommunityPosts(req, res) {
  const { page, limit, offset } = parsePagination(req.query);

  const [countResult, dataResult] = await Promise.all([
    query('SELECT COUNT(*) FROM shadow_community_posts'),
    query(
      `SELECT scp.id, scp.content, scp.created_at,
              u.anonymous_username AS author_anonymous_username,
              u.anonymous_avatar_url AS author_anonymous_avatar_url
       FROM shadow_community_posts scp
       JOIN users u ON u.id = scp.user_id
       ORDER BY scp.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    ),
  ]);

  // SECURITY: Only anonymous_username and anonymous_avatar_url from users.
  // user_id appears in JOIN condition only, never in SELECT or response.
  const total = parseInt(countResult.rows[0].count, 10);
  return res.json(buildPaginatedResponse(dataResult.rows, total, page, limit));
}

// ── POST /api/shadow/community ───────────────────────────────────────────

async function createShadowCommunityPost(req, res) {
  const userId    = req.user.id;
  const { content } = req.body;

  const { rows } = await query(
    `INSERT INTO shadow_community_posts (user_id, content)
     VALUES ($1, $2)
     RETURNING id, content, created_at`,
    [userId, content]
  );

  // Fetch the author's anonymous identity for the response
  const { rows: userRows } = await query(
    `SELECT anonymous_username AS author_anonymous_username,
            anonymous_avatar_url AS author_anonymous_avatar_url
     FROM users WHERE id = $1`,
    [userId]
  );

  // SECURITY: RETURNING clause omits user_id. Response includes only anon fields.
  return res.status(201).json({ ...rows[0], ...userRows[0] });
}

module.exports = { listShadowCommunityPosts, createShadowCommunityPost };
