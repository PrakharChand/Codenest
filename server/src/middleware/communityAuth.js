/**
 * server/src/middleware/communityAuth.js
 *
 * Authorization middleware for Community role-based access control.
 * Roles hierarchy: owner > admin > member
 */

const { query } = require('../config/db');
const ApiError = require('../utils/ApiError');

const ROLE_RANK = {
  owner: 3,
  admin: 2,
  member: 1,
};

/**
 * Ensures req.user has at least minRole in community req.params.id (or req.params.communityId).
 * Attaches req.communityRole and req.isCommunityMember to the request object.
 */
function requireCommunityRole(minRole = 'member') {
  return async (req, res, next) => {
    try {
      const communityId = parseInt(req.params.id || req.params.communityId, 10);
      const userId = req.user?.id;

      if (!communityId || isNaN(communityId)) {
        return next(ApiError.badRequest('Invalid community ID.'));
      }
      if (!userId) {
        return next(ApiError.unauthorized('Authentication required.'));
      }

      // Query viewer role in this community
      const { rows } = await query(
        `SELECT role FROM community_members WHERE community_id = $1 AND user_id = $2`,
        [communityId, userId]
      );

      const userRole = rows[0]?.role || null;
      req.communityRole = userRole;
      req.isCommunityMember = Boolean(userRole);

      if (!userRole) {
        return next(ApiError.forbidden('You must be a member of this community to perform this action.'));
      }

      const userRank = ROLE_RANK[userRole] || 0;
      const minRank = ROLE_RANK[minRole] || 1;

      if (userRank < minRank) {
        return next(ApiError.forbidden(`This action requires ${minRole} permissions or higher.`));
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = {
  requireCommunityRole,
  ROLE_RANK,
};
