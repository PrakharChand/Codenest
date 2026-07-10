// Auth middleware — populated in Phase 2
// Verifies JWT access token and attaches req.user
const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

/**
 * requireAuth
 * Attaches req.user = { id, email, has_anonymous_identity }
 * Throws 401 if token is missing or invalid.
 */
function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required.', 401, 'UNAUTHENTICATED');
    }
    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new AppError('Invalid or expired token.', 401, 'TOKEN_INVALID'));
    }
    next(err);
  }
}

/**
 * requireShadowIdentity
 * Must be used after requireAuth on all /api/shadow/ routes.
 * Ensures the authenticated user has created their anonymous identity.
 */
function requireShadowIdentity(req, _res, next) {
  if (!req.user || !req.user.has_anonymous_identity) {
    return next(new AppError('Anonymous identity not yet created.', 403, 'NO_SHADOW_IDENTITY'));
  }
  next();
}

module.exports = { requireAuth, requireShadowIdentity };
