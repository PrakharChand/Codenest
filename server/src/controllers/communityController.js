/**
 * server/src/controllers/communityController.js
 *
 * Business logic for /api/communities routes.
 *
 * Public: list, get detail (with posts)
 * Protected: create (auto-joins creator), join, leave, post-in-community (members only)
 *
 * Membership check for posting is query-level (EXISTS subquery before INSERT).
 * Counter (member_count) is always transactional.
 * Duplicate join → idempotent success (matches likes/connections convention).
 */

const { query }                                    = require('../config/db');
const withTransaction                              = require('../utils/withTransaction');
const ApiError                                     = require('../utils/ApiError');
const { parsePagination, buildPaginatedResponse }  = require('../utils/paginate');

const AUTHOR_CARD = `
  u.id         AS author_id,
  u.name       AS author_name,
  u.avatar_url AS author_avatar_url
`;

// ── GET /api/communities ─────────────────────────────────────────────────

async function listCommunities(req, res) {
  const { page, limit, offset } = parsePagination(req.query);
  const { search } = req.query;

  const params  = [];
  const where   = [];

  if (search) {
    params.push(`%${search}%`);
    where.push(`(c.name ILIKE $${params.length} OR c.description ILIKE $${params.length})`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [countResult, dataResult] = await Promise.all([
    query(`SELECT COUNT(*) FROM communities c ${whereClause}`, params),
    query(
      `SELECT c.id, c.name, c.description, c.member_count, c.created_at,
              ${AUTHOR_CARD}
       FROM communities c
       LEFT JOIN users u ON u.id = c.created_by
       ${whereClause}
       ORDER BY c.member_count DESC, c.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
  ]);

  const total = parseInt(countResult.rows[0].count, 10);
  return res.json(buildPaginatedResponse(dataResult.rows, total, page, limit));
}

// ── GET /api/communities/:id ─────────────────────────────────────────────

async function getCommunity(req, res) {
  const communityId = parseInt(req.params.id, 10);
  const viewerId   = req.user?.id ?? null;

  const { rows: commRows } = await query(
    `SELECT c.id, c.name, c.description, c.member_count, c.created_at,
            c.created_by,
            ${AUTHOR_CARD},
            CASE WHEN cm.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_member,
            CASE WHEN c.created_by = $2 THEN TRUE ELSE FALSE END AS is_admin
     FROM communities c
     LEFT JOIN users u ON u.id = c.created_by
     LEFT JOIN community_members cm ON cm.community_id = c.id AND cm.user_id = $2
     WHERE c.id = $1`,
    [communityId, viewerId]
  );
  if (!commRows.length) throw ApiError.notFound('Community not found.');

  return res.json(commRows[0]);
}

// ── GET /api/communities/:id/posts ─────────────────────────────────────────

async function getPostsByCommunity(req, res) {
  const communityId = parseInt(req.params.id, 10);
  const { page, limit, offset } = parsePagination(req.query);

  const [postCount, postRows] = await Promise.all([
    query('SELECT COUNT(*) FROM community_posts WHERE community_id = $1', [communityId]),
    query(
      `SELECT cp.id, cp.title, cp.content, cp.created_at,
              ${AUTHOR_CARD}
       FROM community_posts cp
       JOIN users u ON u.id = cp.user_id
       WHERE cp.community_id = $1
       ORDER BY cp.created_at DESC
       LIMIT $2 OFFSET $3`,
      [communityId, limit, offset]
    ),
  ]);

  const total = parseInt(postCount.rows[0].count, 10);
  return res.json(buildPaginatedResponse(postRows.rows, total, page, limit));
}

// ── POST /api/communities — create ───────────────────────────────────────

async function createCommunity(req, res) {
  const { name, description } = req.body;
  const userId = req.user.id;

  // Unique-violation on name → errorHandler converts 23505 → clean 409 with field: 'name'
  const community = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO communities (name, description, created_by, member_count)
       VALUES ($1, $2, $3, 1)
       RETURNING id, name, description, member_count, created_at`,
      [name.trim(), description?.trim() || null, userId]
    );
    const comm = rows[0];
    // Creator auto-joins
    await client.query(
      'INSERT INTO community_members (community_id, user_id) VALUES ($1, $2)',
      [comm.id, userId]
    );
    return comm;
  });

  return res.status(201).json(community);
}

// ── POST /api/communities/:id/join ───────────────────────────────────────

async function joinCommunity(req, res) {
  const communityId = parseInt(req.params.id, 10);
  const userId      = req.user.id;

  const { rows } = await query('SELECT id FROM communities WHERE id = $1', [communityId]);
  if (!rows.length) throw ApiError.notFound('Community not found.');

  await withTransaction(async (client) => {
    const { rowCount } = await client.query(
      `INSERT INTO community_members (community_id, user_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [communityId, userId]
    );
    if (rowCount > 0) {
      await client.query(
        'UPDATE communities SET member_count = member_count + 1 WHERE id = $1',
        [communityId]
      );
    }
  });

  return res.json({ message: 'Joined community.' });
}

// ── DELETE /api/communities/:id/join — leave ─────────────────────────────

async function leaveCommunity(req, res) {
  const communityId = parseInt(req.params.id, 10);
  const userId      = req.user.id;

  await withTransaction(async (client) => {
    const { rowCount } = await client.query(
      'DELETE FROM community_members WHERE community_id = $1 AND user_id = $2',
      [communityId, userId]
    );
    if (rowCount > 0) {
      await client.query(
        'UPDATE communities SET member_count = GREATEST(member_count - 1, 0) WHERE id = $1',
        [communityId]
      );
    }
  });

  return res.json({ message: 'Left community.' });
}

// ── POST /api/communities/:id/posts — post (members only) ────────────────

async function createCommunityPost(req, res) {
  const communityId = parseInt(req.params.id, 10);
  const userId      = req.user.id;
  const { title, content } = req.body;

  // Confirm community exists
  const { rows: commRows } = await query('SELECT id FROM communities WHERE id = $1', [communityId]);
  if (!commRows.length) throw ApiError.notFound('Community not found.');

  // Membership check at query level — non-members get 403, not 404
  const { rows: memberRows } = await query(
    'SELECT 1 FROM community_members WHERE community_id = $1 AND user_id = $2',
    [communityId, userId]
  );
  if (!memberRows.length) {
    throw ApiError.forbidden('You must be a member to post in this community.');
  }

  const { rows } = await query(
    `INSERT INTO community_posts (community_id, user_id, title, content)
     VALUES ($1, $2, $3, $4)
     RETURNING id, title, content, created_at`,
    [communityId, userId, title, content]
  );

  const { rows: userRows } = await query(
    'SELECT id AS author_id, name AS author_name, avatar_url AS author_avatar_url FROM users WHERE id = $1',
    [userId]
  );

  return res.status(201).json({ ...rows[0], ...userRows[0] });
}

module.exports = {
  listCommunities, getCommunity, getPostsByCommunity, createCommunity,
  joinCommunity, leaveCommunity, createCommunityPost,
};
