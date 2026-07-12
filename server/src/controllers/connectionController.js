/**
 * server/src/controllers/connectionController.js
 *
 * Connections: one-tap follow (no request/accept flow).
 *
 * Routes (mounted at /api/users):
 *   POST   /api/users/:id/connect          — follow a user
 *   DELETE /api/users/:id/connect          — unfollow
 *   GET    /api/users/:id/connections      — paginated connections with isMutual flag
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

  return res.json({ message: 'Connected.' });
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

  return res.json({ message: 'Disconnected.' });
}

// ── GET /api/users/:id/connections ──────────────────────────────────────

async function listConnections(req, res) {
  const userId = parseInt(req.params.id, 10);
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
      // For each user this person follows, compute isMutual = reverse row exists
      `SELECT u.id, u.name, u.avatar_url,
              EXISTS (
                SELECT 1 FROM connections r
                WHERE r.follower_id = u.id AND r.following_id = $1
              ) AS "isMutual",
              c.created_at AS connected_at
       FROM connections c
       JOIN users u ON u.id = c.following_id
       WHERE c.follower_id = $1
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ),
  ]);

  const total = parseInt(countResult.rows[0].count, 10);
  return res.json(buildPaginatedResponse(dataResult.rows, total, page, limit));
}

module.exports = { connect, disconnect, listConnections };
