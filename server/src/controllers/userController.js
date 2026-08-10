/**
 * server/src/controllers/userController.js
 *
 * User discovery endpoints — search, explore, profile view.
 *
 * Routes (mounted at /api/users):
 *   GET  /api/users/search?q=...     — search by name (partial, case-insensitive)
 *   GET  /api/users/explore          — paginated all-users list for discovery
 *   GET  /api/users/:id              — single user public profile
 *
 * Security:
 *   - anonymous_username, anonymous_avatar_url, anonymous_reputation_score
 *     are NEVER returned from any endpoint here.
 *   - email is NEVER returned from any endpoint here.
 *   - password_hash is NEVER returned from any endpoint here.
 */

'use strict';

const { query }                                   = require('../config/db');
const ApiError                                    = require('../utils/ApiError');
const { parsePagination, buildPaginatedResponse } = require('../utils/paginate');

// ── Public safe column projection ─────────────────────────────────────────
// All public endpoints return ONLY these columns. Never SELECT * on users.
const PUBLIC_USER_COLUMNS = `
  u.id,
  u.name,
  u.avatar_url,
  u.bio,
  u.github_url,
  u.twitter_url,
  u.created_at
`;

const { getUserRelationship } = require('../utils/relationshipHelper');

// ── GET /api/users/search?q=... ───────────────────────────────────────────

async function searchUsers(req, res) {
  const q = (req.query.q || '').trim();
  if (!q || q.length < 2) {
    return res.json({ results: [] });
  }

  const pattern = `%${q}%`;
  const viewerId = req.user?.id ?? null;

  const { rows } = await query(
    `SELECT ${PUBLIC_USER_COLUMNS}
     FROM users u
     WHERE (u.name ILIKE $1)
       AND u.id <> COALESCE($2, -1)
     ORDER BY u.name ASC
     LIMIT 20`,
    [pattern, viewerId]
  );

  const results = await Promise.all(
    rows.map(async (u) => {
      const rel = await getUserRelationship(viewerId, u.id);
      return { ...u, ...rel };
    })
  );

  return res.json({ results });
}

// ── GET /api/users/explore ─────────────────────────────────────────────────

async function exploreUsers(req, res) {
  const { page, limit, offset } = parsePagination(req.query);
  const viewerId = req.user?.id ?? null;

  const [countResult, dataResult] = await Promise.all([
    query(
      `SELECT COUNT(*) FROM users WHERE id <> COALESCE($1, -1)`,
      [viewerId]
    ),
    query(
      `SELECT ${PUBLIC_USER_COLUMNS},
              (SELECT COUNT(*) FROM connections WHERE follower_id = u.id) AS "followingCount",
              (SELECT COUNT(*) FROM connections WHERE following_id = u.id) AS "followerCount"
       FROM users u
       WHERE u.id <> COALESCE($1, -1)
       ORDER BY u.created_at DESC
       LIMIT $2 OFFSET $3`,
      [viewerId, limit, offset]
    ),
  ]);

  const total = parseInt(countResult.rows[0].count, 10);
  const userIds = dataResult.rows.map((u) => u.id);

  // Batch-fetch all follow relationships for the page in 2 queries (not N*2)
  let followMap = {};  // viewerId -> Set of following ids
  let followsMe = {}; // set of user ids that follow viewer
  let pendingMap = {};

  if (viewerId && userIds.length) {
    const [connRes, reqRes] = await Promise.all([
      query(
        `SELECT follower_id, following_id FROM connections
         WHERE follower_id = ANY($1::int[]) OR following_id = ANY($1::int[])
         AND (follower_id = $2 OR following_id = $2)`,
        [userIds, viewerId]
      ),
      query(
        `SELECT id, requester_id, requestee_id FROM connection_requests
         WHERE status = 'pending'
           AND (requester_id = $1 OR requestee_id = $1)
           AND (requester_id = ANY($2::int[]) OR requestee_id = ANY($2::int[]))`,
        [viewerId, userIds]
      ),
    ]);

    for (const row of connRes.rows) {
      if (row.follower_id === viewerId) followMap[row.following_id] = true;
      if (row.following_id === viewerId) followsMe[row.follower_id] = true;
    }
    for (const row of reqRes.rows) {
      const otherId = row.requester_id === viewerId ? row.requestee_id : row.requester_id;
      pendingMap[otherId] = {
        id: row.id,
        outgoing: row.requester_id === viewerId,
      };
    }
  }

  const rowsWithRel = dataResult.rows.map((u) => {
    if (!viewerId || viewerId === u.id) {
      return { ...u, isFollowing: false, followsMe: false, isConnected: false,
               connectionStatus: viewerId === u.id ? 'self' : 'none', pendingRequestId: null };
    }
    const iF  = !!followMap[u.id];
    const fMe = !!followsMe[u.id];
    const pend = pendingMap[u.id];
    let connectionStatus = 'none';
    let pendingRequestId = null;
    if (iF && fMe) { connectionStatus = 'connected'; }
    else if (pend) {
      pendingRequestId = pend.id;
      connectionStatus = pend.outgoing ? 'pending_outgoing' : 'pending_incoming';
    } else if (iF) { connectionStatus = 'following'; }
    else if (fMe) { connectionStatus = 'follows_me'; }
    return { ...u, isFollowing: iF, followsMe: fMe, isConnected: iF && fMe,
             connectionStatus, pendingRequestId };
  });

  return res.json(buildPaginatedResponse(rowsWithRel, total, page, limit));
}

// ── GET /api/users/:id ─────────────────────────────────────────────────────

async function getUserProfile(req, res) {
  const targetId = parseInt(req.params.id, 10);
  const viewerId = req.user?.id ?? null;

  const { rows } = await query(
    `SELECT ${PUBLIC_USER_COLUMNS},
            (SELECT COUNT(*) FROM connections WHERE follower_id = u.id) AS "followingCount",
            (SELECT COUNT(*) FROM connections WHERE following_id = u.id) AS "followerCount",
            (SELECT COUNT(*) FROM posts WHERE user_id = u.id AND visibility = 'public') AS "postCount"
     FROM users u
     WHERE u.id = $1`,
    [targetId]
  );

  if (!rows.length) throw ApiError.notFound('User not found.');

  const rel = await getUserRelationship(viewerId, targetId);
  return res.json({ ...rows[0], ...rel });
}

// ── PUT /api/users/:id ────────────────────────────────────────────────────

async function updateProfile(req, res) {
  const targetId = parseInt(req.params.id, 10);

  // Users can only update their own profile
  if (req.user.id !== targetId) throw ApiError.forbidden('You can only update your own profile.');

  const { name, bio, github_url, twitter_url, avatar_url } = req.body;

  // For URLs: allow explicit clearing (empty string → NULL stored)
  // For name/bio: COALESCE keeps existing value if not provided
  const { rows } = await query(
    `UPDATE users
     SET name        = COALESCE($1, name),
         bio         = COALESCE($2, bio),
         github_url  = $3,
         twitter_url = $4,
         avatar_url  = COALESCE($5, avatar_url),
         updated_at  = NOW()
     WHERE id = $6
     RETURNING id, name, bio, github_url, twitter_url, avatar_url, created_at`,
    [
      name        || null,
      bio         || null,
      github_url  !== undefined ? (github_url  || null) : null,
      twitter_url !== undefined ? (twitter_url || null) : null,
      avatar_url  || null,
      targetId,
    ]
  );


  if (!rows.length) throw ApiError.notFound('User not found.');
  return res.json(rows[0]);
}

// ── DELETE /api/users/:id or /api/users/me ─────────────────────────────────

const { clearRefreshCookie } = require('../utils/tokens');

async function deleteAccount(req, res) {
  const targetParam = req.params.id;
  const userId = req.user.id;

  if (targetParam && targetParam !== 'me') {
    const targetId = parseInt(targetParam, 10);
    if (isNaN(targetId) || targetId !== userId) {
      throw ApiError.forbidden('You can only delete your own account.');
    }
  }

  const { rowCount } = await query('DELETE FROM users WHERE id = $1', [userId]);
  if (!rowCount) throw ApiError.notFound('User not found.');

  clearRefreshCookie(res);
  return res.json({ message: 'Account deleted successfully.' });
}

// ── GET /api/users/me/activity ─────────────────────────────────────────────

async function getUserActivity(req, res) {
  const userId = req.user.id;

  // 1. Fetch user's activity timestamps for the last 30 days
  const { rows } = await query(
    `SELECT DATE(created_at AT TIME ZONE 'UTC') AS act_date, 'post' AS type
     FROM posts
     WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
     UNION ALL
     SELECT DATE(created_at AT TIME ZONE 'UTC') AS act_date, 'comment' AS type
     FROM comments
     WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
     UNION ALL
     SELECT DATE(created_at AT TIME ZONE 'UTC') AS act_date, 'review' AS type
     FROM shadow_reviews
     WHERE reviewer_id = $1 AND created_at >= NOW() - INTERVAL '30 days'`,
    [userId]
  );

  const activityByDate = {};
  for (const row of rows) {
    const dateStr = typeof row.act_date === 'string'
      ? row.act_date.split('T')[0]
      : new Date(row.act_date).toISOString().split('T')[0];

    if (!activityByDate[dateStr]) {
      activityByDate[dateStr] = { posts: 0, comments: 0, reviews: 0, total: 0 };
    }
    if (row.type === 'post') activityByDate[dateStr].posts += 1;
    if (row.type === 'comment') activityByDate[dateStr].comments += 1;
    if (row.type === 'review') activityByDate[dateStr].reviews += 1;
    activityByDate[dateStr].total += 1;
  }

  // 2. Build 7-day daily breakdown ending today (UTC)
  const daily = [];
  const now = new Date();
  let total7DayActivity = 0;
  let totalPosts = 0;
  let totalComments = 0;
  let totalReviews = 0;

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });

    const counts = activityByDate[dateStr] || { posts: 0, comments: 0, reviews: 0, total: 0 };
    total7DayActivity += counts.total;
    totalPosts += counts.posts;
    totalComments += counts.comments;
    totalReviews += counts.reviews;

    daily.push({
      day: dayLabel,
      date: dateStr,
      posts: counts.posts,
      comments: counts.comments,
      reviews: counts.reviews,
      activity: counts.total,
      likes: counts.total, // For backward compatibility with existing dataKey="likes"
    });
  }

  // 3. Calculate streak (consecutive active days backwards from today)
  let streak = 0;
  let checkDate = new Date(now);
  let todayStr = checkDate.toISOString().split('T')[0];
  let todayHasActivity = (activityByDate[todayStr]?.total || 0) > 0;

  if (!todayHasActivity) {
    // Check if yesterday had activity to keep streak alive
    checkDate.setUTCDate(checkDate.getUTCDate() - 1);
    let yesterdayStr = checkDate.toISOString().split('T')[0];
    if ((activityByDate[yesterdayStr]?.total || 0) > 0) {
      while (true) {
        let dateKey = checkDate.toISOString().split('T')[0];
        if ((activityByDate[dateKey]?.total || 0) > 0) {
          streak += 1;
          checkDate.setUTCDate(checkDate.getUTCDate() - 1);
        } else {
          break;
        }
      }
    }
  } else {
    while (true) {
      let dateKey = checkDate.toISOString().split('T')[0];
      if ((activityByDate[dateKey]?.total || 0) > 0) {
        streak += 1;
        checkDate.setUTCDate(checkDate.getUTCDate() - 1);
      } else {
        break;
      }
    }
  }

  // 4. Calculate estimated study/coding time in minutes
  // 1 post = 15 mins, 1 review = 20 mins, 1 comment = 5 mins, base session = 15 mins per active day
  let activeDays = daily.filter((d) => d.activity > 0).length;
  const timeSpentMins = (totalPosts * 15) + (totalReviews * 20) + (totalComments * 5) + (activeDays * 15);

  return res.json({
    daily,
    streak,
    activityCount: total7DayActivity,
    totalPosts,
    totalComments,
    totalReviews,
    timeSpentMins,
  });
}

module.exports = {
  searchUsers,
  exploreUsers,
  getUserProfile,
  updateProfile,
  deleteAccount,
  getUserActivity,
};



