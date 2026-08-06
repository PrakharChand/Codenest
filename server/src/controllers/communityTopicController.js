/**
 * server/src/controllers/communityTopicController.js
 *
 * Controllers for Community Topics (sub-forums/channels).
 */

const { query } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { parsePagination, buildPaginatedResponse } = require('../utils/paginate');

const AUTHOR_CARD = `
  u.id         AS author_id,
  u.name       AS author_name,
  u.avatar_url AS author_avatar_url
`;

// ── GET /api/communities/:id/topics ──────────────────────────────────────
async function listTopics(req, res) {
  const communityId = parseInt(req.params.id, 10);

  const { rows } = await query(
    `SELECT t.id, t.community_id, t.name, t.description, t.post_count,
            t.is_pinned, t.is_locked, t.last_activity_at, t.created_at,
            ${AUTHOR_CARD}
     FROM community_topics t
     LEFT JOIN users u ON u.id = t.created_by
     WHERE t.community_id = $1
     ORDER BY t.is_pinned DESC, t.last_activity_at DESC, t.created_at DESC`,
    [communityId]
  );

  return res.json({ data: rows });
}

// ── GET /api/communities/:id/topics/:topicId ──────────────────────────────
async function getTopic(req, res) {
  const communityId = parseInt(req.params.id, 10);
  const topicId = parseInt(req.params.topicId, 10);

  const { rows } = await query(
    `SELECT t.id, t.community_id, t.name, t.description, t.post_count,
            t.is_pinned, t.is_locked, t.last_activity_at, t.created_at,
            c.name AS community_name,
            ${AUTHOR_CARD}
     FROM community_topics t
     JOIN communities c ON c.id = t.community_id
     LEFT JOIN users u ON u.id = t.created_by
     WHERE t.community_id = $1 AND t.id = $2`,
    [communityId, topicId]
  );

  if (!rows.length) throw ApiError.notFound('Topic not found.');
  return res.json(rows[0]);
}

// ── POST /api/communities/:id/topics ─────────────────────────────────────
async function createTopic(req, res) {
  const communityId = parseInt(req.params.id, 10);
  const userId = req.user.id;
  const { name, description } = req.body;

  if (!name || !name.trim()) throw ApiError.badRequest('Topic name is required.');

  const { rows } = await query(
    `INSERT INTO community_topics (community_id, name, description, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING id, community_id, name, description, post_count, is_pinned, is_locked, last_activity_at, created_at`,
    [communityId, name.trim(), description?.trim() || null, userId]
  );

  // Increment community topic_count
  await query(`UPDATE communities SET topic_count = topic_count + 1 WHERE id = $1`, [communityId]);

  return res.status(201).json(rows[0]);
}

// ── PUT /api/communities/:id/topics/:topicId ──────────────────────────────
async function updateTopic(req, res) {
  const communityId = parseInt(req.params.id, 10);
  const topicId = parseInt(req.params.topicId, 10);
  const { name, description, is_pinned, is_locked } = req.body;

  const { rows: existing } = await query(
    `SELECT id FROM community_topics WHERE community_id = $1 AND id = $2`,
    [communityId, topicId]
  );
  if (!existing.length) throw ApiError.notFound('Topic not found.');

  const { rows } = await query(
    `UPDATE community_topics
     SET name = COALESCE($1, name),
         description = COALESCE($2, description),
         is_pinned = COALESCE($3, is_pinned),
         is_locked = COALESCE($4, is_locked)
     WHERE community_id = $5 AND id = $6
     RETURNING id, community_id, name, description, post_count, is_pinned, is_locked, last_activity_at, created_at`,
    [name?.trim(), description?.trim(), is_pinned, is_locked, communityId, topicId]
  );

  return res.json(rows[0]);
}

// ── DELETE /api/communities/:id/topics/:topicId ───────────────────────────
async function deleteTopic(req, res) {
  const communityId = parseInt(req.params.id, 10);
  const topicId = parseInt(req.params.topicId, 10);

  const { rowCount } = await query(
    `DELETE FROM community_topics WHERE community_id = $1 AND id = $2`,
    [communityId, topicId]
  );
  if (rowCount === 0) throw ApiError.notFound('Topic not found.');

  // Decrement community topic_count
  await query(`UPDATE communities SET topic_count = GREATEST(topic_count - 1, 0) WHERE id = $1`, [communityId]);

  return res.json({ message: 'Topic deleted successfully.' });
}

// ── GET /api/communities/:id/topics/:topicId/posts ────────────────────────
async function getPostsByTopic(req, res) {
  const communityId = parseInt(req.params.id, 10);
  const topicId = parseInt(req.params.topicId, 10);
  const { page, limit, offset } = parsePagination(req.query);

  const [postCount, postRows] = await Promise.all([
    query(
      `SELECT COUNT(*) FROM community_posts WHERE community_id = $1 AND topic_id = $2`,
      [communityId, topicId]
    ),
    query(
      `SELECT cp.id, cp.title, cp.content, cp.topic_id, cp.like_count, cp.comment_count, cp.is_pinned, cp.created_at,
              ct.name AS topic_name,
              ${AUTHOR_CARD}
       FROM community_posts cp
       JOIN users u ON u.id = cp.user_id
       LEFT JOIN community_topics ct ON ct.id = cp.topic_id
       WHERE cp.community_id = $1 AND cp.topic_id = $2
       ORDER BY cp.is_pinned DESC, cp.created_at DESC
       LIMIT $3 OFFSET $4`,
      [communityId, topicId, limit, offset]
    ),
  ]);

  const total = parseInt(postCount.rows[0].count, 10);
  return res.json(buildPaginatedResponse(postRows.rows, total, page, limit));
}

module.exports = {
  listTopics,
  getTopic,
  createTopic,
  updateTopic,
  deleteTopic,
  getPostsByTopic,
};
