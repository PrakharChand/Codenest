/**
 * server/src/controllers/connectionController.js
 *
 * Connections: one-tap follow (no request/accept flow).
 *
 * Routes (mounted at /api/users):
 *   POST   /api/users/:id/connect          — follow a user
 *   DELETE /api/users/:id/connect          — unfollow
 *   GET    /api/users/:id/connections      — paginated list of users userId follows
 *   GET    /api/users/:id/followers        — paginated list of users who follow userId
 *   GET    /api/users/:id/mutual           — paginated mutual connections (both directions)
 *
 * "Mutual" definition (locked in CODENEST_REFERENCE.md):
 *   A connection is mutual when both directions exist:
 *   (follower_id=A, following_id=B) AND (follower_id=B, following_id=A).
 *
 * Self-connect: the Phase 1 CHECK (follower_id <> following_id) catches this
 * at the DB level → errorHandler translates 23514 to 400 BAD_REQUEST.
 * Duplicate connect: ON CONFLICT DO NOTHING → idempotent success.
 */

const { query }                                    = require('../config/db');
const withTransaction                              = require('../utils/withTransaction');
const ApiError                                     = require('../utils/ApiError');
const { parsePagination, buildPaginatedResponse }  = require('../utils/paginate');
const createNotification                           = require('../utils/createNotification');

const { getUserRelationship } = require('../utils/relationshipHelper');

// ── POST /api/users/:id/connect ──────────────────────────────────────────

async function connect(req, res) {
  const followingId = parseInt(req.params.id, 10);
  const followerId  = req.user.id;

  // Confirm target user exists
  const { rows } = await query('SELECT id FROM users WHERE id = $1', [followingId]);
  if (!rows.length) throw ApiError.notFound('User not found.');

  // Self-connect hits CHECK constraint → errorHandler converts 23514 → 400
  await withTransaction(async (client) => {
    const { rowCount } = await client.query(
      `INSERT INTO connections (follower_id, following_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [followerId, followingId]
    );
    // Notify followed user only when a real new connection was inserted
    if (rowCount > 0) {
      await createNotification({
        userId: followingId,
        type: 'connection',
        message: 'Someone connected with you.',
        referenceId: followerId,
        identityContext: 'public',
        client,
      });
    }
  });

  const relationship = await getUserRelationship(followerId, followingId);
  return res.json({ message: 'Connected.', relationship, ...relationship });
}

// ── DELETE /api/users/:id/connect ────────────────────────────────────────

async function disconnect(req, res) {
  const followingId = parseInt(req.params.id, 10);
  const followerId  = req.user.id;

  // Idempotent — no error if row doesn't exist
  await query(
    'DELETE FROM connections WHERE follower_id = $1 AND following_id = $2',
    [followerId, followingId]
  );

  const relationship = await getUserRelationship(followerId, followingId);
  return res.json({ message: 'Disconnected.', relationship, ...relationship });
}

// ── GET /api/users/:id/connections  (people userId *follows*) ────────────

async function listConnections(req, res) {
  const userId   = parseInt(req.params.id, 10);
  const viewerId = req.user?.id ?? null;
  const { page, limit, offset } = parsePagination(req.query);

  // Confirm user exists
  const { rows: userRows } = await query('SELECT id FROM users WHERE id = $1', [userId]);
  if (!userRows.length) throw ApiError.notFound('User not found.');

  const [countResult, dataResult] = await Promise.all([
    query(
      'SELECT COUNT(*) FROM connections WHERE follower_id = $1',
      [userId]
    ),
    query(
      `SELECT u.id, u.name, u.bio, u.avatar_url, u.github_url, u.twitter_url,
              EXISTS (
                SELECT 1 FROM connections r
                WHERE r.follower_id = u.id AND r.following_id = $1
              ) AS "isMutual",
              CASE WHEN cv.follower_id IS NOT NULL THEN TRUE ELSE FALSE END AS "isFollowing",
              c.created_at AS connected_at
       FROM connections c
       JOIN users u ON u.id = c.following_id
       LEFT JOIN connections cv ON cv.follower_id = $4 AND cv.following_id = u.id
       WHERE c.follower_id = $1
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset, viewerId]
    ),
  ]);

  const total = parseInt(countResult.rows[0].count, 10);
  return res.json(buildPaginatedResponse(dataResult.rows, total, page, limit));
}

// ── GET /api/users/:id/followers  (people who follow userId) ─────────────

async function listFollowers(req, res) {
  const userId   = parseInt(req.params.id, 10);
  const viewerId = req.user?.id ?? null;
  const { page, limit, offset } = parsePagination(req.query);

  const { rows: userRows } = await query('SELECT id FROM users WHERE id = $1', [userId]);
  if (!userRows.length) throw ApiError.notFound('User not found.');

  const [countResult, dataResult] = await Promise.all([
    query(
      'SELECT COUNT(*) FROM connections WHERE following_id = $1',
      [userId]
    ),
    query(
      `SELECT u.id, u.name, u.bio, u.avatar_url, u.github_url, u.twitter_url,
              EXISTS (
                SELECT 1 FROM connections r
                WHERE r.follower_id = $1 AND r.following_id = u.id
              ) AS "isMutual",
              CASE WHEN cv.follower_id IS NOT NULL THEN TRUE ELSE FALSE END AS "isFollowing",
              c.created_at AS connected_at
       FROM connections c
       JOIN users u ON u.id = c.follower_id
       LEFT JOIN connections cv ON cv.follower_id = $4 AND cv.following_id = u.id
       WHERE c.following_id = $1
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset, viewerId]
    ),
  ]);

  const total = parseInt(countResult.rows[0].count, 10);
  return res.json(buildPaginatedResponse(dataResult.rows, total, page, limit));
}

// ── GET /api/users/:id/mutual  (mutual follows — both directions) ─────────

async function listMutual(req, res) {
  const userId   = parseInt(req.params.id, 10);
  const viewerId = req.user?.id ?? null;
  const { page, limit, offset } = parsePagination(req.query);

  const { rows: userRows } = await query('SELECT id FROM users WHERE id = $1', [userId]);
  if (!userRows.length) throw ApiError.notFound('User not found.');

  const [countResult, dataResult] = await Promise.all([
    query(
      `SELECT COUNT(*)
       FROM connections a
       JOIN connections b ON b.follower_id = a.following_id AND b.following_id = a.follower_id
       WHERE a.follower_id = $1`,
      [userId]
    ),
    query(
      `SELECT u.id, u.name, u.bio, u.avatar_url, u.github_url, u.twitter_url,
              TRUE AS "isMutual",
              CASE WHEN cv.follower_id IS NOT NULL THEN TRUE ELSE FALSE END AS "isFollowing",
              a.created_at AS connected_at
       FROM connections a
       JOIN connections b ON b.follower_id = a.following_id AND b.following_id = a.follower_id
       JOIN users u ON u.id = a.following_id
       LEFT JOIN connections cv ON cv.follower_id = $4 AND cv.following_id = u.id
       WHERE a.follower_id = $1
       ORDER BY a.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset, viewerId]
    ),
  ]);

  const total = parseInt(countResult.rows[0].count, 10);
  return res.json(buildPaginatedResponse(dataResult.rows, total, page, limit));
}

module.exports = { connect, disconnect, listConnections, listFollowers, listMutual };
