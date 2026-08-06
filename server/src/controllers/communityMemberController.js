/**
 * server/src/controllers/communityMemberController.js
 *
 * Member management for communities (list, kick, role promotion).
 */

const { query } = require('../config/db');
const withTransaction = require('../utils/withTransaction');
const ApiError = require('../utils/ApiError');
const { parsePagination, buildPaginatedResponse } = require('../utils/paginate');

// ── GET /api/communities/:id/members ──────────────────────────────────────
async function listMembers(req, res) {
  const communityId = parseInt(req.params.id, 10);
  const { page, limit, offset } = parsePagination(req.query);
  const { search } = req.query;

  const params = [communityId];
  const where = ['cm.community_id = $1'];

  if (search) {
    params.push(`%${search}%`);
    where.push(`u.name ILIKE $${params.length}`);
  }

  const whereClause = `WHERE ${where.join(' AND ')}`;
  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;

  const [countResult, dataResult] = await Promise.all([
    query(`SELECT COUNT(*) FROM community_members cm JOIN users u ON u.id = cm.user_id ${whereClause}`, params),
    query(
      `SELECT cm.community_id, cm.user_id, cm.role, cm.joined_at,
              u.name AS user_name, u.avatar_url AS user_avatar_url, u.bio AS user_bio
       FROM community_members cm
       JOIN users u ON u.id = cm.user_id
       ${whereClause}
       ORDER BY CASE cm.role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END, cm.joined_at ASC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...params, limit, offset]
    ),
  ]);

  const total = parseInt(countResult.rows[0].count, 10);
  return res.json(buildPaginatedResponse(dataResult.rows, total, page, limit));
}

// ── DELETE /api/communities/:id/members/:userId — Kick member ────────────
async function removeMember(req, res) {
  const communityId = parseInt(req.params.id, 10);
  const targetUserId = parseInt(req.params.userId, 10);
  const actorUserId = req.user.id;

  if (targetUserId === actorUserId) {
    throw ApiError.badRequest('Use the leave community button to leave.');
  }

  // Check target user role
  const { rows: targetRows } = await query(
    `SELECT role FROM community_members WHERE community_id = $1 AND user_id = $2`,
    [communityId, targetUserId]
  );
  if (!targetRows.length) {
    throw ApiError.notFound('Member not found in community.');
  }

  const targetRole = targetRows[0].role;
  const actorRole = req.communityRole;

  if (targetRole === 'owner') {
    throw ApiError.forbidden('The community owner cannot be removed.');
  }
  if (targetRole === 'admin' && actorRole !== 'owner') {
    throw ApiError.forbidden('Only the community owner can remove an admin.');
  }

  let updatedCount = 0;
  await withTransaction(async (client) => {
    await client.query(
      `DELETE FROM community_members WHERE community_id = $1 AND user_id = $2`,
      [communityId, targetUserId]
    );
    const resCount = await client.query(
      `UPDATE communities SET member_count = GREATEST(member_count - 1, 0) WHERE id = $1 RETURNING member_count`,
      [communityId]
    );
    updatedCount = resCount.rows[0]?.member_count || 0;
  });

  return res.json({ message: 'Member removed successfully.', member_count: updatedCount });
}

// ── PUT /api/communities/:id/members/:userId/role — Promote / Demote ──────
async function updateMemberRole(req, res) {
  const communityId = parseInt(req.params.id, 10);
  const targetUserId = parseInt(req.params.userId, 10);
  const { role } = req.body;

  if (!['admin', 'member'].includes(role)) {
    throw ApiError.badRequest('Role must be either "admin" or "member".');
  }

  // Only owner can promote/demote (enforced by requireCommunityRole('owner'))
  const { rows: targetRows } = await query(
    `SELECT role FROM community_members WHERE community_id = $1 AND user_id = $2`,
    [communityId, targetUserId]
  );
  if (!targetRows.length) {
    throw ApiError.notFound('Member not found in community.');
  }

  if (targetRows[0].role === 'owner') {
    throw ApiError.forbidden('Cannot change the owner role.');
  }

  const { rows } = await query(
    `UPDATE community_members
     SET role = $1
     WHERE community_id = $2 AND user_id = $3
     RETURNING community_id, user_id, role, joined_at`,
    [role, communityId, targetUserId]
  );

  return res.json({ message: `Member role updated to ${role}.`, member: rows[0] });
}

module.exports = {
  listMembers,
  removeMember,
  updateMemberRole,
};
