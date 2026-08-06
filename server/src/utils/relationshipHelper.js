/**
 * server/src/utils/relationshipHelper.js
 *
 * Single authoritative helper for computing relationship status between viewer and target user.
 */

const { query } = require('../config/db');

/**
 * Get unified relationship object for a target user relative to viewerId
 * @param {number|null} viewerId - ID of logged-in viewer
 * @param {number} targetId - ID of target user
 * @returns {Promise<{isFollowing: boolean, followsMe: boolean, isConnected: boolean, connectionStatus: string, pendingRequestId: number|null}>}
 */
async function getUserRelationship(viewerId, targetId) {
  if (!viewerId || !targetId || viewerId === targetId) {
    return {
      isFollowing: false,
      followsMe: false,
      isConnected: false,
      connectionStatus: viewerId === targetId ? 'self' : 'none',
      pendingRequestId: null,
    };
  }

  // 1. Check connections table in both directions
  const connRes = await query(
    `SELECT follower_id, following_id FROM connections
     WHERE (follower_id = $1 AND following_id = $2)
        OR (follower_id = $2 AND following_id = $1)`,
    [viewerId, targetId]
  );

  let isFollowing = false;
  let followsMe = false;

  for (const row of connRes.rows) {
    if (row.follower_id === viewerId && row.following_id === targetId) {
      isFollowing = true;
    }
    if (row.follower_id === targetId && row.following_id === viewerId) {
      followsMe = true;
    }
  }

  const isConnected = isFollowing && followsMe;

  if (isConnected) {
    return {
      isFollowing: true,
      followsMe: true,
      isConnected: true,
      connectionStatus: 'connected',
      pendingRequestId: null,
    };
  }

  // 2. Check pending connection_requests in both directions
  const reqRes = await query(
    `SELECT id, requester_id, requestee_id, status FROM connection_requests
     WHERE ((requester_id = $1 AND requestee_id = $2) OR (requester_id = $2 AND requestee_id = $1))
       AND status = 'pending'`,
    [viewerId, targetId]
  );

  let connectionStatus = 'none';
  let pendingRequestId = null;

  if (reqRes.rows.length) {
    const reqRow = reqRes.rows[0];
    pendingRequestId = reqRow.id;
    if (reqRow.requester_id === viewerId) {
      connectionStatus = 'pending_outgoing';
    } else {
      connectionStatus = 'pending_incoming';
    }
  } else if (isFollowing) {
    connectionStatus = 'following';
  } else if (followsMe) {
    connectionStatus = 'follows_me';
  }

  return {
    isFollowing,
    followsMe,
    isConnected,
    connectionStatus,
    pendingRequestId,
  };
}

module.exports = { getUserRelationship };
