/**
 * server/src/controllers/userController.js
 *
 * User discovery endpoints — search, explore, profile view.
 *
 * Routes (mounted at /api/users):
 *   GET  /api/users/search?q=...     — search by name (partial, case-insensitive)
 *   GET  /api/users/explore          — paginated all-users list for discovery
 *   GET  /api/users/:id              — single user public profile
 *
 * Security:
 *   - anonymous_username, anonymous_avatar_url, anonymous_reputation_score
 *     are NEVER returned from any endpoint here.
 *   - email is NEVER returned from any endpoint here.
 *   - password_hash is NEVER returned from any endpoint here.
 */

'use strict';

const { query }                                   = require('../config/db');
const ApiError                                    = require('../utils/ApiError');
const { parsePagination, buildPaginatedResponse } = require('../utils/paginate');

// ── Public safe column projection ─────────────────────────────────────────
// All public endpoints return ONLY these columns. Never SELECT * on users.
const PUBLIC_USER_COLUMNS = `
  u.id,
  u.name,
  u.avatar_url,
  u.bio,
  u.github_url,
  u.twitter_url,
  u.created_at
`;

// ── GET /api/users/search?q=... ───────────────────────────────────────────

async function searchUsers(req, res) {
  const q = (req.query.q || '').trim();
  if (!q || q.length < 2) {
    return res.json({ results: [] });
  }

  const pattern = `%${q}%`;
  const viewerId = req.user?.id ?? null;

  const { rows } = await query(
    `SELECT ${PUBLIC_USER_COLUMNS},
            CASE WHEN c.follower_id IS NOT NULL THEN TRUE ELSE FALSE END AS "isFollowing"
     FROM users u
     LEFT JOIN connections c
       ON c.follower_id = $2 AND c.following_id = u.id
     WHERE (u.name ILIKE $1)
       AND u.id <> COALESCE($2, -1)
     ORDER BY u.name ASC
     LIMIT 20`,
    [pattern, viewerId]
  );

  return res.json({ results: rows });
}

// ── GET /api/users/explore ─────────────────────────────────────────────────

async function exploreUsers(req, res) {
  const { page, limit, offset } = parsePagination(req.query);
  const viewerId = req.user?.id ?? null;

  const [countResult, dataResult] = await Promise.all([
    query(
      `SELECT COUNT(*) FROM users WHERE id <> COALESCE($1, -1)`,
      [viewerId]
    ),
    query(
      `SELECT ${PUBLIC_USER_COLUMNS},
              (SELECT COUNT(*) FROM connections WHERE follower_id = u.id) AS "followingCount",
              (SELECT COUNT(*) FROM connections WHERE following_id = u.id) AS "followerCount",
              CASE WHEN c.follower_id IS NOT NULL THEN TRUE ELSE FALSE END AS "isFollowing"
       FROM users u
       LEFT JOIN connections c
         ON c.follower_id = $3 AND c.following_id = u.id
       WHERE u.id <> COALESCE($3, -1)
       ORDER BY u.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset, viewerId]
    ),
  ]);

  const total = parseInt(countResult.rows[0].count, 10);
  return res.json(buildPaginatedResponse(dataResult.rows, total, page, limit));
}

// ── GET /api/users/:id ─────────────────────────────────────────────────────

async function getUserProfile(req, res) {
  const targetId = parseInt(req.params.id, 10);
  const viewerId = req.user?.id ?? null;

  const { rows } = await query(
    `SELECT ${PUBLIC_USER_COLUMNS},
            (SELECT COUNT(*) FROM connections WHERE follower_id = u.id) AS "followingCount",
            (SELECT COUNT(*) FROM connections WHERE following_id = u.id) AS "followerCount",
            (SELECT COUNT(*) FROM posts WHERE user_id = u.id AND visibility = 'public') AS "postCount",
            CASE WHEN c.follower_id IS NOT NULL THEN TRUE ELSE FALSE END AS "isFollowing"
     FROM users u
     LEFT JOIN connections c
       ON c.follower_id = $2 AND c.following_id = u.id
     WHERE u.id = $1`,
    [targetId, viewerId]
  );

  if (!rows.length) throw ApiError.notFound('User not found.');
  return res.json(rows[0]);
}

// ── PUT /api/users/:id ────────────────────────────────────────────────────

async function updateProfile(req, res) {
  const targetId = parseInt(req.params.id, 10);

  // Users can only update their own profile
  if (req.user.id !== targetId) throw ApiError.forbidden('You can only update your own profile.');

  const { name, bio, github_url, twitter_url } = req.body;

  const { rows } = await query(
    `UPDATE users
     SET name = COALESCE($1, name),
         bio = COALESCE($2, bio),
         github_url = COALESCE($3, github_url),
         twitter_url = COALESCE($4, twitter_url),
         updated_at = NOW()
     WHERE id = $5
     RETURNING id, name, bio, github_url, twitter_url, avatar_url, created_at`,
    [name || null, bio || null, github_url || null, twitter_url || null, targetId]
  );

  if (!rows.length) throw ApiError.notFound('User not found.');
  return res.json(rows[0]);
}

module.exports = { searchUsers, exploreUsers, getUserProfile, updateProfile };

