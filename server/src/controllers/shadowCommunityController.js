/**
 * server/src/controllers/shadowCommunityController.js
 *
 * Anonymous community posts — separate from Nest Feed communities.
 * Must never join to or read from public user profiles.
 *
 * Security: each post's author is shown as anonymous_username/anonymous_avatar_url ONLY.
 */

const { query } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { parsePagination, buildPaginatedResponse } = require('../utils/paginate');

// ── GET /api/shadow/community ────────────────────────────────────────────

async function listShadowCommunityPosts(req, res) {
  const { page, limit, offset } = parsePagination(req.query);
  const { search, topic } = req.query;

  const params = [];
  const where = [];

  if (search) {
    params.push(`%${search}%`);
    where.push(`scp.content ILIKE $${params.length}`);
  }

  if (topic && topic !== 'all') {
    params.push(`%#${topic}%`);
    where.push(`(scp.content ILIKE $${params.length} OR scp.topic = $${params.length})`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;

  const [countResult, dataResult] = await Promise.all([
    query(`SELECT COUNT(*) FROM shadow_community_posts scp ${whereClause}`, params),
    query(
      `SELECT scp.id, scp.content, scp.created_at,
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

// ── POST /api/shadow/community ───────────────────────────────────────────

async function createShadowCommunityPost(req, res) {
  const userId = req.user.id;
  const { content, topic } = req.body;

  let finalContent = content.trim();
  if (topic && topic !== 'General' && !finalContent.includes(`#${topic}`)) {
    finalContent = `[#${topic}] ${finalContent}`;
  }

  const { rows } = await query(
    `INSERT INTO shadow_community_posts (user_id, content)
     VALUES ($1, $2)
     RETURNING id, content, created_at`,
    [userId, finalContent]
  );

  const { rows: userRows } = await query(
    `SELECT anonymous_username AS author_anonymous_username,
            anonymous_avatar_url AS author_anonymous_avatar_url
     FROM users WHERE id = $1`,
    [userId]
  );

  return res.status(201).json({ ...rows[0], ...userRows[0] });
}

module.exports = { listShadowCommunityPosts, createShadowCommunityPost };
