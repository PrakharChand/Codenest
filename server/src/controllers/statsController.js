/**
 * server/src/controllers/statsController.js
 *
 * Public platform statistics endpoint.
 * Returns live counts for:
 *  - total users
 *  - total posts
 *  - total reviews
 *  - total communities
 *  - total projects (AI roadmaps)
 *  - total code submissions
 */

const { query } = require('../config/db');

const DEFAULT_PAYLOAD = {
  totalUsers: 1,
  totalPosts: 1,
  totalReviews: 0,
  totalCommunities: 1,
  totalProjects: 0,
  totalCodeSubmissions: 0,
  total_users: 1,
  total_posts: 1,
  total_reviews: 0,
  total_communities: 1,
  total_projects: 0,
  total_code_submissions: 0,
};

// In-memory cache for public stats (60-second TTL) with instant default payload
let statsCache = DEFAULT_PAYLOAD;
let statsCacheExpiry = 0;
let isRefreshing = false;
const STATS_TTL_MS = 60 * 1000;

async function refreshStatsCache() {
  if (isRefreshing) return;
  isRefreshing = true;
  try {
    const [
      usersRes,
      postsRes,
      reviewsRes,
      communitiesRes,
      projectsRes,
      submissionsRes,
    ] = await Promise.all([
      query('SELECT COUNT(*)::int AS count FROM users').catch(() => ({ rows: [{ count: 0 }] })),
      query('SELECT COUNT(*)::int AS count FROM posts').catch(() => ({ rows: [{ count: 0 }] })),
      query('SELECT COUNT(*)::int AS count FROM shadow_reviews').catch(() => ({ rows: [{ count: 0 }] })),
      query('SELECT COUNT(*)::int AS count FROM communities').catch(() => ({ rows: [{ count: 0 }] })),
      query('SELECT COUNT(*)::int AS count FROM user_roadmaps').catch(() => ({ rows: [{ count: 0 }] })),
      query('SELECT COUNT(*)::int AS count FROM shadow_submissions').catch(() => ({ rows: [{ count: 0 }] })),
    ]);

    const totalUsers           = usersRes.rows[0]?.count || 0;
    const totalPosts           = postsRes.rows[0]?.count || 0;
    const totalReviews         = reviewsRes.rows[0]?.count || 0;
    const totalCommunities     = communitiesRes.rows[0]?.count || 0;
    const totalProjects        = projectsRes.rows[0]?.count || 0;
    const totalCodeSubmissions = submissionsRes.rows[0]?.count || 0;

    statsCache = {
      totalUsers,
      totalPosts,
      totalReviews,
      totalCommunities,
      totalProjects,
      totalCodeSubmissions,
      total_users:            totalUsers,
      total_posts:            totalPosts,
      total_reviews:          totalReviews,
      total_communities:      totalCommunities,
      total_projects:         totalProjects,
      total_code_submissions: totalCodeSubmissions,
    };
    statsCacheExpiry = Date.now() + STATS_TTL_MS;
  } catch (_) {
    // Quiet degradation
  } finally {
    isRefreshing = false;
  }
}

// Background warm-up on server load
setTimeout(refreshStatsCache, 1000);

async function getPublicStats(req, res) {
  if (Date.now() >= statsCacheExpiry) {
    refreshStatsCache(); // Asynchronous background update (non-blocking)
  }
  return res.json(statsCache || DEFAULT_PAYLOAD);
}

module.exports = { getPublicStats };
