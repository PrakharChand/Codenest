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

async function getPublicStats(req, res) {
  const [
    usersRes,
    postsRes,
    reviewsRes,
    communitiesRes,
    projectsRes,
    submissionsRes,
  ] = await Promise.all([
    query('SELECT COUNT(*)::int AS count FROM users'),
    query('SELECT COUNT(*)::int AS count FROM posts'),
    query('SELECT COUNT(*)::int AS count FROM shadow_reviews'),
    query('SELECT COUNT(*)::int AS count FROM communities'),
    query('SELECT COUNT(*)::int AS count FROM user_roadmaps'),
    query('SELECT COUNT(*)::int AS count FROM shadow_submissions'),
  ]);

  const totalUsers           = usersRes.rows[0]?.count || 0;
  const totalPosts           = postsRes.rows[0]?.count || 0;
  const totalReviews         = reviewsRes.rows[0]?.count || 0;
  const totalCommunities     = communitiesRes.rows[0]?.count || 0;
  const totalProjects        = projectsRes.rows[0]?.count || 0;
  const totalCodeSubmissions = submissionsRes.rows[0]?.count || 0;

  return res.json({
    totalUsers,
    totalPosts,
    totalReviews,
    totalCommunities,
    totalProjects,
    totalCodeSubmissions,

    // Snake_case aliases for client compatibility
    total_users:            totalUsers,
    total_posts:            totalPosts,
    total_reviews:          totalReviews,
    total_communities:      totalCommunities,
    total_projects:         totalProjects,
    total_code_submissions: totalCodeSubmissions,
  });
}

module.exports = { getPublicStats };
