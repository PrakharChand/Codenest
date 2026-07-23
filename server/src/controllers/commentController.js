/**
 * server/src/controllers/commentController.js
 *
 * Business logic for comment routes:
 *   GET  /api/posts/:id/comments       — paginated, public
 *   POST /api/posts/:id/comments       — protected, bumps comment_count
 *   DELETE /api/comments/:commentId    — protected, owner-only, decrements comment_count
 *
 * Ownership: query-level (WHERE id=$1 AND user_id=$2), 0 rows → forbidden.
 * Counters: always transactional via withTransaction.
 */

const { query }                                    = require('../config/db');
const withTransaction                              = require('../utils/withTransaction');
const ApiError                                     = require('../utils/ApiError');
const { parsePagination, buildPaginatedResponse }  = require('../utils/paginate');
const createNotification                           = require('../utils/createNotification');

const AUTHOR_CARD = `
  u.id          AS author_id,
  u.name        AS author_name,
  u.avatar_url  AS author_avatar_url
`;

// ── GET /api/posts/:id/comments ──────────────────────────────────────────

async function listComments(req, res) {
  const postId = parseInt(req.params.postId, 10);
  const { page, limit, offset } = parsePagination(req.query);

  // Confirm post exists
  const { rows: postRows } = await query('SELECT id FROM posts WHERE id = $1', [postId]);
  if (!postRows.length) throw ApiError.notFound('Post not found.');

  const [countResult, dataResult] = await Promise.all([
    query('SELECT COUNT(*) FROM comments WHERE post_id = $1', [postId]),
    query(
      `SELECT c.id, c.content, c.created_at, ${AUTHOR_CARD}
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC
       LIMIT $2 OFFSET $3`,
      [postId, limit, offset]
    ),
  ]);

  const total = parseInt(countResult.rows[0].count, 10);
  return res.json(buildPaginatedResponse(dataResult.rows, total, page, limit));
}

// ── POST /api/posts/:id/comments ─────────────────────────────────────────

async function createComment(req, res) {
  const postId = parseInt(req.params.postId, 10);
  const userId = req.user.id;
  const { content } = req.body;

  const { rows: postRows } = await query('SELECT id, user_id FROM posts WHERE id = $1', [postId]);
  if (!postRows.length) throw ApiError.notFound('Post not found.');

  const comment = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO comments (post_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, content, created_at`,
      [postId, userId, content]
    );
    await client.query(
      'UPDATE posts SET comment_count = comment_count + 1 WHERE id = $1',
      [postId]
    );
    // Notify post owner about the new comment — never self-notify
    const ownerId = postRows[0].user_id;
    if (ownerId !== userId) {
      await createNotification({
        userId: ownerId,
        type: 'comment',
        message: 'Someone commented on your post.',
        referenceId: postId,
        identityContext: 'public',
        client,
      });
    }
    return rows[0];
  });

  // Fetch author card to return
  const { rows: userRows } = await query(
    'SELECT id AS author_id, name AS author_name, avatar_url AS author_avatar_url FROM users WHERE id = $1',
    [userId]
  );

  return res.status(201).json({ ...comment, ...userRows[0] });
}

// ── DELETE /api/comments/:commentId ──────────────────────────────────────

async function deleteComment(req, res) {
  const commentId = parseInt(req.params.commentId, 10);
  const userId    = req.user.id;

  // Look up the comment to get the post_id (needed for counter decrement)
  const { rows } = await query(
    'SELECT id, post_id FROM comments WHERE id = $1',
    [commentId]
  );
  const comment = rows[0];
  if (!comment) throw ApiError.notFound('Comment not found.');

  await withTransaction(async (client) => {
    // Ownership enforced at query level
    const { rowCount } = await client.query(
      'DELETE FROM comments WHERE id = $1 AND user_id = $2',
      [commentId, userId]
    );
    if (!rowCount) throw ApiError.forbidden('You do not own this comment.');

    await client.query(
      'UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = $1',
      [comment.post_id]
    );
  });

  return res.json({ message: 'Comment deleted.' });
}

module.exports = { listComments, createComment, deleteComment };
