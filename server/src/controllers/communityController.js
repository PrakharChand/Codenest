/**
 * server/src/controllers/communityController.js
 *
 * Business logic for /api/communities routes.
 *
 * Supports Public and Private community types, role permissions, and topic integration.
 */

const { query } = require('../config/db');
const withTransaction = require('../utils/withTransaction');
const ApiError = require('../utils/ApiError');
const { parsePagination, buildPaginatedResponse } = require('../utils/paginate');

const AUTHOR_CARD = `
  u.id         AS author_id,
  u.name       AS author_name,
  u.avatar_url AS author_avatar_url
`;

// ── GET /api/communities ─────────────────────────────────────────────────
async function listCommunities(req, res) {
  const { page, limit, offset } = parsePagination(req.query);
  const { search, type } = req.query;
  const viewerId = req.user?.id ?? null;

  const params = [];
  const where = [];

  if (search) {
    params.push(`%${search}%`);
    where.push(`(c.name ILIKE $${params.length} OR c.description ILIKE $${params.length})`);
  }

  if (type && ['public', 'private'].includes(type)) {
    params.push(type);
    where.push(`c.type = $${params.length}`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const viewerParamIdx = params.length + 1;
  const limitParamIdx = params.length + 2;
  const offsetParamIdx = params.length + 3;

  const [countResult, dataResult] = await Promise.all([
    query(`SELECT COUNT(*) FROM communities c ${whereClause}`, params),
    query(
      `SELECT c.id, c.name, c.description, c.type, c.member_count, c.topic_count, c.created_at,
              ${AUTHOR_CARD},
              cm.role AS viewer_role,
              CASE WHEN cm.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_member,
              CASE WHEN cm.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS "isMember",
              CASE
                WHEN cm.user_id IS NOT NULL THEN 'member'
                WHEN cjr.id IS NOT NULL THEN 'pending'
                ELSE 'none'
              END AS join_status
       FROM communities c
       LEFT JOIN users u ON u.id = c.created_by
       LEFT JOIN community_members cm ON cm.community_id = c.id AND cm.user_id = $${viewerParamIdx}
       LEFT JOIN community_join_requests cjr ON cjr.community_id = c.id AND cjr.user_id = $${viewerParamIdx} AND cjr.status = 'pending'
       ${whereClause}
       ORDER BY c.member_count DESC, c.created_at DESC
       LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}`,
      [...params, viewerId, limit, offset]
    ),
  ]);

  const total = parseInt(countResult.rows[0].count, 10);
  return res.json(buildPaginatedResponse(dataResult.rows, total, page, limit));
}

// ── GET /api/communities/:id ─────────────────────────────────────────────
async function getCommunity(req, res) {
  const communityId = parseInt(req.params.id, 10);
  const viewerId = req.user?.id ?? null;

  const { rows: commRows } = await query(
    `SELECT c.id, c.name, c.description, c.type, c.member_count, c.topic_count, c.created_at,
            c.created_by,
            ${AUTHOR_CARD},
            cm.role AS viewer_role,
            CASE WHEN cm.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_member,
            CASE WHEN cm.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS "isMember",
            CASE WHEN cm.role IN ('owner', 'admin') THEN TRUE ELSE FALSE END AS is_admin,
            CASE
              WHEN cm.user_id IS NOT NULL THEN 'member'
              WHEN cjr.id IS NOT NULL THEN 'pending'
              ELSE 'none'
            END AS join_status
     FROM communities c
     LEFT JOIN users u ON u.id = c.created_by
     LEFT JOIN community_members cm ON cm.community_id = c.id AND cm.user_id = $2
     LEFT JOIN community_join_requests cjr ON cjr.community_id = c.id AND cjr.user_id = $2 AND cjr.status = 'pending'
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
      `SELECT cp.id, cp.title, cp.content, cp.topic_id, cp.like_count, cp.comment_count, cp.is_pinned, cp.created_at,
              ct.name AS topic_name,
              ${AUTHOR_CARD}
       FROM community_posts cp
       JOIN users u ON u.id = cp.user_id
       LEFT JOIN community_topics ct ON ct.id = cp.topic_id
       WHERE cp.community_id = $1
       ORDER BY cp.is_pinned DESC, cp.created_at DESC
       LIMIT $2 OFFSET $3`,
      [communityId, limit, offset]
    ),
  ]);

  const total = parseInt(postCount.rows[0].count, 10);
  return res.json(buildPaginatedResponse(postRows.rows, total, page, limit));
}

// ── POST /api/communities — create ───────────────────────────────────────
async function createCommunity(req, res) {
  const { name, description, type = 'public' } = req.body;
  const userId = req.user.id;

  const validTypes = ['public', 'private'];
  const communityType = validTypes.includes(type) ? type : 'public';

  const community = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO communities (name, description, type, created_by, member_count, topic_count)
       VALUES ($1, $2, $3, $4, 1, 1)
       RETURNING id, name, description, type, member_count, topic_count, created_at`,
      [name.trim(), description?.trim() || null, communityType, userId]
    );
    const comm = rows[0];

    // Creator auto-joins as owner
    await client.query(
      `INSERT INTO community_members (community_id, user_id, role) VALUES ($1, $2, 'owner')`,
      [comm.id, userId]
    );

    // Auto-create default "General" topic
    await client.query(
      `INSERT INTO community_topics (community_id, name, description, created_by, is_pinned)
       VALUES ($1, 'General', 'General discussion for this community', $2, TRUE)`,
      [comm.id, userId]
    );

    return { ...comm, is_member: true, isMember: true, viewer_role: 'owner', join_status: 'member' };
  });

  return res.status(201).json(community);
}

// ── PUT /api/communities/:id — edit community ────────────────────────────
async function updateCommunity(req, res) {
  const communityId = parseInt(req.params.id, 10);
  const { name, description, type } = req.body;

  const validTypes = ['public', 'private'];
  const updatedType = validTypes.includes(type) ? type : undefined;

  const { rows } = await query(
    `UPDATE communities
     SET name = COALESCE($1, name),
         description = COALESCE($2, description),
         type = COALESCE($3, type)
     WHERE id = $4
     RETURNING id, name, description, type, member_count, topic_count, created_at`,
    [name?.trim(), description?.trim(), updatedType, communityId]
  );

  if (!rows.length) throw ApiError.notFound('Community not found.');

  return res.json(rows[0]);
}

// ── DELETE /api/communities/:id — delete community ───────────────────────
async function deleteCommunity(req, res) {
  const communityId = parseInt(req.params.id, 10);

  const { rowCount } = await query(`DELETE FROM communities WHERE id = $1`, [communityId]);
  if (rowCount === 0) throw ApiError.notFound('Community not found.');

  return res.json({ message: 'Community deleted successfully.' });
}

// ── POST /api/communities/:id/join ───────────────────────────────────────
async function joinCommunity(req, res) {
  const communityId = parseInt(req.params.id, 10);
  const userId = req.user.id;

  const { rows: commRows } = await query('SELECT id, type FROM communities WHERE id = $1', [communityId]);
  if (!commRows.length) throw ApiError.notFound('Community not found.');

  const comm = commRows[0];

  // Check existing membership
  const { rows: memberRows } = await query(
    `SELECT role FROM community_members WHERE community_id = $1 AND user_id = $2`,
    [communityId, userId]
  );
  if (memberRows.length) {
    return res.json({
      message: 'Already a member of this community.',
      is_member: true,
      isMember: true,
      join_status: 'member',
    });
  }

  // Handle PRIVATE Community Join Request
  if (comm.type === 'private') {
    const { rows: existingReq } = await query(
      `SELECT id, status FROM community_join_requests WHERE community_id = $1 AND user_id = $2`,
      [communityId, userId]
    );

    if (existingReq.length) {
      if (existingReq[0].status === 'pending') {
        return res.json({
          message: 'Your join request is pending approval.',
          is_member: false,
          isMember: false,
          join_status: 'pending',
        });
      }
      // Re-request if previously rejected
      await query(
        `UPDATE community_join_requests SET status = 'pending', requested_at = NOW() WHERE id = $1`,
        [existingReq[0].id]
      );
    } else {
      await query(
        `INSERT INTO community_join_requests (community_id, user_id, status) VALUES ($1, $2, 'pending')`,
        [communityId, userId]
      );
    }

    return res.json({
      message: 'Request to join sent. An admin will review your application.',
      is_member: false,
      isMember: false,
      join_status: 'pending',
    });
  }

  // Handle PUBLIC Community Instant Join
  let updatedCount = 0;
  await withTransaction(async (client) => {
    const { rowCount } = await client.query(
      `INSERT INTO community_members (community_id, user_id, role)
       VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING`,
      [communityId, userId]
    );
    if (rowCount > 0) {
      const resCount = await client.query(
        'UPDATE communities SET member_count = member_count + 1 WHERE id = $1 RETURNING member_count',
        [communityId]
      );
      updatedCount = resCount.rows[0]?.member_count || 0;
    } else {
      const resCount = await client.query('SELECT member_count FROM communities WHERE id = $1', [communityId]);
      updatedCount = resCount.rows[0]?.member_count || 0;
    }
  });

  return res.json({
    message: 'Joined community.',
    is_member: true,
    isMember: true,
    join_status: 'member',
    member_count: updatedCount,
  });
}

// ── DELETE /api/communities/:id/join — leave ─────────────────────────────
async function leaveCommunity(req, res) {
  const communityId = parseInt(req.params.id, 10);
  const userId = req.user.id;

  // Owners cannot leave without transferring ownership or deleting
  const { rows: memberRows } = await query(
    `SELECT role FROM community_members WHERE community_id = $1 AND user_id = $2`,
    [communityId, userId]
  );
  if (memberRows.length && memberRows[0].role === 'owner') {
    throw ApiError.badRequest('As the owner, you cannot leave the community. Transfer ownership first or delete the community.');
  }

  let updatedCount = 0;
  await withTransaction(async (client) => {
    const { rowCount } = await client.query(
      'DELETE FROM community_members WHERE community_id = $1 AND user_id = $2',
      [communityId, userId]
    );
    if (rowCount > 0) {
      const resCount = await client.query(
        'UPDATE communities SET member_count = GREATEST(member_count - 1, 0) WHERE id = $1 RETURNING member_count',
        [communityId]
      );
      updatedCount = resCount.rows[0]?.member_count || 0;
    } else {
      const resCount = await client.query('SELECT member_count FROM communities WHERE id = $1', [communityId]);
      updatedCount = resCount.rows[0]?.member_count || 0;
    }
  });

  return res.json({
    message: 'Left community.',
    is_member: false,
    isMember: false,
    join_status: 'none',
    member_count: updatedCount,
  });
}

// ── POST /api/communities/:id/posts — post (members only) ────────────────
async function createCommunityPost(req, res) {
  const communityId = parseInt(req.params.id, 10);
  const userId = req.user.id;
  const { title, content, topic_id } = req.body;

  // Confirm community exists
  const { rows: commRows } = await query('SELECT id FROM communities WHERE id = $1', [communityId]);
  if (!commRows.length) throw ApiError.notFound('Community not found.');

  // Membership check at query level
  const { rows: memberRows } = await query(
    'SELECT 1 FROM community_members WHERE community_id = $1 AND user_id = $2',
    [communityId, userId]
  );
  if (!memberRows.length) {
    throw ApiError.forbidden('You must be a member to post in this community.');
  }

  let validTopicId = topic_id ? parseInt(topic_id, 10) : null;

  // Default to General topic if topic_id not provided
  if (!validTopicId) {
    const { rows: genTopic } = await query(
      `SELECT id FROM community_topics WHERE community_id = $1 AND name = 'General'`,
      [communityId]
    );
    if (genTopic.length) validTopicId = genTopic[0].id;
  }

  const { rows } = await query(
    `INSERT INTO community_posts (community_id, user_id, title, content, topic_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, title, content, topic_id, like_count, comment_count, is_pinned, created_at`,
    [communityId, userId, title, content, validTopicId]
  );

  // Update topic post_count and last_activity_at if topic exists
  if (validTopicId) {
    await query(
      `UPDATE community_topics
       SET post_count = post_count + 1, last_activity_at = NOW()
       WHERE id = $1`,
      [validTopicId]
    );
  }

  const { rows: userRows } = await query(
    'SELECT id AS author_id, name AS author_name, avatar_url AS author_avatar_url FROM users WHERE id = $1',
    [userId]
  );

  return res.status(201).json({ ...rows[0], ...userRows[0] });
}

module.exports = {
  listCommunities,
  getCommunity,
  getPostsByCommunity,
  createCommunity,
  updateCommunity,
  deleteCommunity,
  joinCommunity,
  leaveCommunity,
  createCommunityPost,
};
