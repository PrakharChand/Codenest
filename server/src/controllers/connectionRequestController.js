/**
 * server/src/controllers/connectionRequestController.js
 *
 * Connection Requests — approval-based symmetric connections.
 *
 * Routes (mounted at /api/users):
 *   POST   /api/users/:id/request           — send a connection request
 *   POST   /api/users/:id/request/accept    — accept an incoming request
 *   POST   /api/users/:id/request/decline   — decline an incoming request
 *   GET    /api/users/me/requests/incoming  — list my pending received requests
 *   GET    /api/users/me/requests/outgoing  — list my pending sent requests
 */

'use strict';

const { query }          = require('../config/db');
const withTransaction    = require('../utils/withTransaction');
const ApiError           = require('../utils/ApiError');
const createNotification = require('../utils/createNotification');

const { getUserRelationship } = require('../utils/relationshipHelper');

// ── POST /api/users/:id/request ──────────────────────────────────────────

async function sendRequest(req, res) {
  const requesterId = req.user.id;
  const requesteeId = parseInt(req.params.id, 10);

  if (requesterId === requesteeId) {
    throw ApiError.badRequest('You cannot send a connection request to yourself.');
  }

  // Confirm target user exists
  const { rows: target } = await query('SELECT id FROM users WHERE id = $1', [requesteeId]);
  if (!target.length) throw ApiError.notFound('User not found.');

  // Upsert request — reset to pending if previously declined
  await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO connection_requests (requester_id, requestee_id, status)
       VALUES ($1, $2, 'pending')
       ON CONFLICT (requester_id, requestee_id)
       DO UPDATE SET status = 'pending', updated_at = NOW()
       RETURNING id`,
      [requesterId, requesteeId]
    );

    if (rows.length) {
      await createNotification({
        userId: requesteeId,
        type: 'connection',
        message: 'Someone sent you a connection request.',
        referenceId: requesterId,
        identityContext: 'public',
        client,
      });
    }
  });

  bustRequestsCache(requesterId);
  bustRequestsCache(requesteeId);

  const relationship = await getUserRelationship(requesterId, requesteeId);
  return res.status(200).json({ message: 'Connection request sent.', relationship, ...relationship });
}

// ── POST /api/users/:id/request/accept ───────────────────────────────────

async function acceptRequest(req, res) {
  const requesteeId = req.user.id;
  const requesterId = parseInt(req.params.id, 10);

  await withTransaction(async (client) => {
    // Mark request accepted
    const { rowCount } = await client.query(
      `UPDATE connection_requests
       SET status = 'accepted', updated_at = NOW()
       WHERE requester_id = $1 AND requestee_id = $2 AND status = 'pending'`,
      [requesterId, requesteeId]
    );

    // Create bidirectional follow
    await client.query(
      `INSERT INTO connections (follower_id, following_id)
       VALUES ($1, $2), ($2, $1)
       ON CONFLICT DO NOTHING`,
      [requesterId, requesteeId]
    );

    // Notify requester that their request was accepted
    if (rowCount > 0) {
      await createNotification({
        userId: requesterId,
        type: 'connection',
        message: 'Your connection request was accepted.',
        referenceId: requesteeId,
        identityContext: 'public',
        client,
      });
    }
  });

  bustRequestsCache(requesterId);
  bustRequestsCache(requesteeId);

  const relationship = await getUserRelationship(requesteeId, requesterId);
  return res.json({ message: 'Connection request accepted.', relationship, ...relationship });
}

// ── POST /api/users/:id/request/decline ──────────────────────────────────

async function declineRequest(req, res) {
  const requesteeId = req.user.id;
  const requesterId = parseInt(req.params.id, 10);

  await query(
    `UPDATE connection_requests
     SET status = 'declined', updated_at = NOW()
     WHERE requester_id = $1 AND requestee_id = $2 AND status = 'pending'`,
    [requesterId, requesteeId]
  );

  bustRequestsCache(requesterId);
  bustRequestsCache(requesteeId);

  const relationship = await getUserRelationship(requesteeId, requesterId);
  return res.json({ message: 'Connection request declined.', relationship, ...relationship });
}

// In-memory cache for connection requests (10-second TTL)
const requestsCache = new Map();
const REQUESTS_TTL_MS = 10_000;

function bustRequestsCache(userId) {
  for (const key of requestsCache.keys()) {
    if (key.startsWith(`${userId}:`)) requestsCache.delete(key);
  }
}

// ── GET /api/users/me/requests/incoming ──────────────────────────────────

async function incomingRequests(req, res) {
  const userId = req.user.id;
  const cacheKey = `${userId}:incoming`;
  const cached = requestsCache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) {
    return res.json(cached.data);
  }

  const { rows } = await query(
    `SELECT cr.id, cr.created_at,
            u.id AS "userId", u.name, u.avatar_url, u.bio
     FROM connection_requests cr
     JOIN users u ON u.id = cr.requester_id
     WHERE cr.requestee_id = $1 AND cr.status = 'pending'
     ORDER BY cr.created_at DESC
     LIMIT 50`,
    [userId]
  );

  const payload = { requests: rows, total: rows.length };
  requestsCache.set(cacheKey, { data: payload, expiry: Date.now() + REQUESTS_TTL_MS });
  return res.json(payload);
}

// ── GET /api/users/me/requests/outgoing ──────────────────────────────────

async function outgoingRequests(req, res) {
  const userId = req.user.id;
  const cacheKey = `${userId}:outgoing`;
  const cached = requestsCache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) {
    return res.json(cached.data);
  }

  const { rows } = await query(
    `SELECT cr.id, cr.status, cr.created_at,
            u.id AS "userId", u.name, u.avatar_url, u.bio
     FROM connection_requests cr
     JOIN users u ON u.id = cr.requestee_id
     WHERE cr.requester_id = $1 AND cr.status IN ('pending', 'declined')
     ORDER BY cr.created_at DESC
     LIMIT 50`,
    [userId]
  );

  const payload = { requests: rows, total: rows.length };
  requestsCache.set(cacheKey, { data: payload, expiry: Date.now() + REQUESTS_TTL_MS });
  return res.json(payload);
}

module.exports = {
  sendRequest,
  acceptRequest,
  declineRequest,
  incomingRequests,
  outgoingRequests,
};
