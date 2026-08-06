/**
 * server/src/controllers/communityJoinRequestController.js
 *
 * Private Community Join Requests (list, approve, reject).
 */

const { query } = require('../config/db');
const withTransaction = require('../utils/withTransaction');
const ApiError = require('../utils/ApiError');
const { parsePagination, buildPaginatedResponse } = require('../utils/paginate');

// ── GET /api/communities/:id/requests ─────────────────────────────────────
async function listRequests(req, res) {
  const communityId = parseInt(req.params.id, 10);
  const { page, limit, offset } = parsePagination(req.query);

  const [countResult, dataResult] = await Promise.all([
    query(
      `SELECT COUNT(*) FROM community_join_requests WHERE community_id = $1 AND status = 'pending'`,
      [communityId]
    ),
    query(
      `SELECT r.id, r.community_id, r.user_id, r.status, r.message, r.requested_at,
              u.name AS user_name, u.avatar_url AS user_avatar_url, u.bio AS user_bio
       FROM community_join_requests r
       JOIN users u ON u.id = r.user_id
       WHERE r.community_id = $1 AND r.status = 'pending'
       ORDER BY r.requested_at ASC
       LIMIT $2 OFFSET $3`,
      [communityId, limit, offset]
    ),
  ]);

  const total = parseInt(countResult.rows[0].count, 10);
  return res.json(buildPaginatedResponse(dataResult.rows, total, page, limit));
}

// ── POST /api/communities/:id/requests/:requestId/approve ─────────────────
async function approveRequest(req, res) {
  const communityId = parseInt(req.params.id, 10);
  const requestId = parseInt(req.params.requestId, 10);

  const { rows: reqRows } = await query(
    `SELECT id, user_id, status FROM community_join_requests WHERE community_id = $1 AND id = $2`,
    [communityId, requestId]
  );

  if (!reqRows.length) throw ApiError.notFound('Join request not found.');
  if (reqRows[0].status !== 'pending') {
    throw ApiError.badRequest(`Request has already been ${reqRows[0].status}.`);
  }

  const applicantId = reqRows[0].user_id;
  let updatedCount = 0;

  await withTransaction(async (client) => {
    // 1. Update request status
    await client.query(
      `UPDATE community_join_requests SET status = 'approved', resolved_at = NOW() WHERE id = $1`,
      [requestId]
    );

    // 2. Add member
    const { rowCount } = await client.query(
      `INSERT INTO community_members (community_id, user_id, role) VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING`,
      [communityId, applicantId]
    );

    if (rowCount > 0) {
      const resCount = await client.query(
        `UPDATE communities SET member_count = member_count + 1 WHERE id = $1 RETURNING member_count`,
        [communityId]
      );
      updatedCount = resCount.rows[0]?.member_count || 0;
    } else {
      const resCount = await client.query(`SELECT member_count FROM communities WHERE id = $1`, [communityId]);
      updatedCount = resCount.rows[0]?.member_count || 0;
    }

    // 3. Notify applicant
    const { rows: commRows } = await client.query(`SELECT name FROM communities WHERE id = $1`, [communityId]);
    const commName = commRows[0]?.name || 'Community';

    await client.query(
      `INSERT INTO notifications (user_id, type, actor_id, entity_type, entity_id, message)
       VALUES ($1, 'community_request_approved', $2, 'community', $3, $4)`,
      [applicantId, req.user.id, communityId, `Your request to join ${commName} was approved!`]
    );
  });

  return res.json({ message: 'Join request approved.', is_member: true, member_count: updatedCount });
}

// ── POST /api/communities/:id/requests/:requestId/reject ──────────────────
async function rejectRequest(req, res) {
  const communityId = parseInt(req.params.id, 10);
  const requestId = parseInt(req.params.requestId, 10);

  const { rows: reqRows } = await query(
    `SELECT id, user_id, status FROM community_join_requests WHERE community_id = $1 AND id = $2`,
    [communityId, requestId]
  );

  if (!reqRows.length) throw ApiError.notFound('Join request not found.');
  if (reqRows[0].status !== 'pending') {
    throw ApiError.badRequest(`Request has already been ${reqRows[0].status}.`);
  }

  const applicantId = reqRows[0].user_id;

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE community_join_requests SET status = 'rejected', resolved_at = NOW() WHERE id = $1`,
      [requestId]
    );

    const { rows: commRows } = await client.query(`SELECT name FROM communities WHERE id = $1`, [communityId]);
    const commName = commRows[0]?.name || 'Community';

    await client.query(
      `INSERT INTO notifications (user_id, type, actor_id, entity_type, entity_id, message)
       VALUES ($1, 'community_request_rejected', $2, 'community', $3, $4)`,
      [applicantId, req.user.id, communityId, `Your request to join ${commName} was declined.`]
    );
  });

  return res.json({ message: 'Join request rejected.' });
}

module.exports = {
  listRequests,
  approveRequest,
  rejectRequest,
};
