/**
 * server/src/controllers/shadowCommunityController.js
 *
 * Anonymous community creation and discussions for Nest Shadow.
 * SECURITY RULE: user_id is stored for ownership but queries return ONLY
 * anonymous_username and anonymous_avatar_url.
 */

const { query } = require('../config/db');
const withTransaction = require('../utils/withTransaction');
const ApiError = require('../utils/ApiError');
const { parsePagination, buildPaginatedResponse } = require('../utils/paginate');

// ── GET /api/shadow/communities — List Anonymous Communities ────────────
async function listShadowCommunities(req, res) {
  const { page, limit, offset } = parsePagination(req.query);
  const { search } = req.query;
  const userId = req.user.id;

  const params = [userId];
  const where = [];

  if (search) {
    params.push(`%${search}%`);
    where.push(`(sc.name ILIKE $${params.length} OR sc.description ILIKE $${params.length})`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;

  const [countResult, dataResult] = await Promise.all([
    query(`SELECT COUNT(*) FROM shadow_communities sc ${whereClause}`, params.slice(1)),
    query(
      `SELECT sc.id, sc.name, sc.description, sc.type, sc.member_count, sc.created_at,
              u.anonymous_username AS author_anonymous_username,
              u.anonymous_avatar_url AS author_anonymous_avatar_url,
              CASE WHEN scm.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_member
       FROM shadow_communities sc
       LEFT JOIN users u ON u.id = sc.created_by
       LEFT JOIN shadow_community_members scm ON scm.community_id = sc.id AND scm.user_id = $1
       ${whereClause}
       ORDER BY sc.member_count DESC, sc.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...params, limit, offset]
    ),
  ]);

  const total = parseInt(countResult.rows[0].count, 10);
  return res.json(buildPaginatedResponse(dataResult.rows, total, page, limit));
}

// ── POST /api/shadow/communities — Create Anonymous Community ───────────
async function createShadowCommunity(req, res) {
  const userId = req.user.id;
  const { name, description, type = 'public' } = req.body;

  if (!name || !name.trim()) throw ApiError.badRequest('Community name is required.');

  const commType = ['public', 'private'].includes(type) ? type : 'public';

  const community = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO shadow_communities (name, description, type, created_by, member_count)
       VALUES ($1, $2, $3, $4, 1)
       RETURNING id, name, description, type, member_count, created_at`,
      [name.trim(), description?.trim() || null, commType, userId]
    );

    const comm = rows[0];

    await client.query(
      `INSERT INTO shadow_community_members (community_id, user_id, role) VALUES ($1, $2, 'owner')`,
      [comm.id, userId]
    );

    return { ...comm, is_member: true };
  });

  return res.status(201).json(community);
}

// ── POST /api/shadow/communities/:id/join — Join ────────────────────────
async function joinShadowCommunity(req, res) {
  const communityId = parseInt(req.params.id, 10);
  const userId = req.user.id;

  let updatedCount = 0;
  await withTransaction(async (client) => {
    const { rowCount } = await client.query(
      `INSERT INTO shadow_community_members (community_id, user_id, role)
       VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING`,
      [communityId, userId]
    );
    if (rowCount > 0) {
      const resCount = await client.query(
        `UPDATE shadow_communities SET member_count = member_count + 1 WHERE id = $1 RETURNING member_count`,
        [communityId]
      );
      updatedCount = resCount.rows[0]?.member_count || 0;
    } else {
      const resCount = await client.query(`SELECT member_count FROM shadow_communities WHERE id = $1`, [communityId]);
      updatedCount = resCount.rows[0]?.member_count || 0;
    }
  });

  return res.json({ message: 'Joined anonymous community.', is_member: true, member_count: updatedCount });
}

// ── DELETE /api/shadow/communities/:id/join — Leave ──────────────────────
async function leaveShadowCommunity(req, res) {
  const communityId = parseInt(req.params.id, 10);
  const userId = req.user.id;

  let updatedCount = 0;
  await withTransaction(async (client) => {
    const { rowCount } = await client.query(
      `DELETE FROM shadow_community_members WHERE community_id = $1 AND user_id = $2`,
      [communityId, userId]
    );
    if (rowCount > 0) {
      const resCount = await client.query(
        `UPDATE shadow_communities SET member_count = GREATEST(member_count - 1, 0) WHERE id = $1 RETURNING member_count`,
        [communityId]
      );
      updatedCount = resCount.rows[0]?.member_count || 0;
    } else {
      const resCount = await client.query(`SELECT member_count FROM shadow_communities WHERE id = $1`, [communityId]);
      updatedCount = resCount.rows[0]?.member_count || 0;
    }
  });

  return res.json({ message: 'Left anonymous community.', is_member: false, member_count: updatedCount });
}

// ── GET /api/shadow/community — List Posts ───────────────────────────────
async function listShadowCommunityPosts(req, res) {
  const { page, limit, offset } = parsePagination(req.query);
  const { search, topic, community_id } = req.query;

  const params = [];
  const where = [];

  if (community_id) {
    params.push(parseInt(community_id, 10));
    where.push(`scp.shadow_community_id = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    where.push(`scp.content ILIKE $${params.length}`);
  }

  if (topic && topic !== 'all') {
    params.push(`%#${topic}%`);
    where.push(`scp.content ILIKE $${params.length}`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;

  const [countResult, dataResult] = await Promise.all([
    query(`SELECT COUNT(*) FROM shadow_community_posts scp ${whereClause}`, params),
    query(
      `SELECT scp.id, scp.content, scp.shadow_community_id, scp.created_at,
              u.anonymous_username AS author_anonymous_username,
              u.anonymous_avatar_url AS author_anonymous_avatar_url
       FROM shadow_community_posts scp
       JOIN users u ON u.id = scp.user_id
       ${whereClause}
       ORDER BY scp.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...params, limit, offset]
    ),
  ]);

  const total = parseInt(countResult.rows[0].count, 10);
  return res.json(buildPaginatedResponse(dataResult.rows, total, page, limit));
}

// ── POST /api/shadow/community — Create Post ──────────────────────────────
async function createShadowCommunityPost(req, res) {
  const userId = req.user.id;
  const { content, topic, community_id } = req.body;

  let finalContent = content.trim();
  if (topic && topic !== 'General' && !finalContent.includes(`#${topic}`)) {
    finalContent = `[#${topic}] ${finalContent}`;
  }

  const commId = community_id ? parseInt(community_id, 10) : null;

  const { rows } = await query(
    `INSERT INTO shadow_community_posts (user_id, content, shadow_community_id)
     VALUES ($1, $2, $3)
     RETURNING id, content, shadow_community_id, created_at`,
    [userId, finalContent, commId]
  );

  const { rows: userRows } = await query(
    `SELECT anonymous_username AS author_anonymous_username,
            anonymous_avatar_url AS author_anonymous_avatar_url
     FROM users WHERE id = $1`,
    [userId]
  );

  return res.status(201).json({ ...rows[0], ...userRows[0] });
}

module.exports = {
  listShadowCommunities,
  createShadowCommunity,
  joinShadowCommunity,
  leaveShadowCommunity,
  listShadowCommunityPosts,
  createShadowCommunityPost,
};
