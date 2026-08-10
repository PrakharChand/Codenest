/**
 * server/src/middleware/auth.js
 *
 * Authentication and identity-guard middleware used by all protected routes.
 *
 * requireAuth          — every protected route in Phases 3-5 uses this.
 * requireAnonymousIdentity — all /api/shadow/ routes stack this after requireAuth.
 *
 * Security: loads only { id, has_anonymous_identity } from the DB — never
 * the whole user row, never the password_hash. Attaches req.user = { id, hasAnonymousIdentity }.
 */

const { verifyAccessToken } = require('../utils/tokens');
const ApiError              = require('../utils/ApiError');
const { query }             = require('../config/db');

// In-memory cache for user auth verification (15-second TTL)
const userAuthCache = new Map();
const USER_AUTH_TTL_MS = 15 * 1000;

async function getCachedUserAuth(userId) {
  const cached = userAuthCache.get(userId);
  if (cached && Date.now() - cached.timestamp < USER_AUTH_TTL_MS) {
    return cached.user;
  }
  const { rows } = await query(
    'SELECT id, has_anonymous_identity, is_banned, suspended_until FROM users WHERE id = $1',
    [userId]
  );
  const user = rows[0] || null;
  if (user) {
    userAuthCache.set(userId, { user, timestamp: Date.now() });
    if (userAuthCache.size > 2000) {
      const firstKey = userAuthCache.keys().next().value;
      userAuthCache.delete(firstKey);
    }
  }
  return user;
}

/**
 * requireAuth
 *
 * Reads Authorization: Bearer <token>, verifies the access token,
 * loads the user's id + has_anonymous_identity (explicit column list),
 * and attaches req.user = { id, hasAnonymousIdentity }.
 *
 * Throws ApiError.unauthorized on any auth failure.
 * Every protected API route in the project uses this exact middleware.
 */
async function requireAuth(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Missing or malformed Authorization header.');
    }

    const token   = authHeader.slice(7); // remove 'Bearer '
    const payload = verifyAccessToken(token); // throws ApiError.unauthorized if invalid
    const userId  = parseInt(payload.sub, 10);

    // Load minimal user fields (cached for 15s) — check for bans and suspensions
    const user = await getCachedUserAuth(userId);

    if (!user) {
      throw ApiError.unauthorized('User account not found.');
    }

    // Enforce Permanent Ban
    if (user.is_banned) {
      throw ApiError.forbidden('Your account has been permanently banned due to repeated content violations.');
    }

    // Enforce 24-Hour Temporary Suspension
    if (user.suspended_until && new Date(user.suspended_until) > new Date()) {
      const untilFormatted = new Date(user.suspended_until).toLocaleString();
      throw ApiError.forbidden(`Your account is currently suspended until ${untilFormatted} due to content policy violations.`);
    }

    req.user = {
      id:                   user.id,
      hasAnonymousIdentity: user.has_anonymous_identity,
    };

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * requireAnonymousIdentity
 *
 * Stack this AFTER requireAuth on all /api/shadow/ routes.
 * Rejects with 403 if the user has not yet created their anonymous identity.
 *
 * This is the route-level enforcement of Identity Rule 3 / Shadow entry guard.
 * Phase 4 imports this — it does not reinvent the guard.
 */
function requireAnonymousIdentity(req, _res, next) {
  if (!req.user || !req.user.hasAnonymousIdentity) {
    return next(ApiError.forbidden(
      'You must create your anonymous identity before accessing Nest Shadow.'
    ));
  }
  next();
}

module.exports = { requireAuth, requireAnonymousIdentity };

/**
 * optionalAuth
 *
 * Like requireAuth but does NOT reject unauthenticated requests.
 * If a valid Bearer token is present, req.user is populated as usual.
 * If no token (or invalid token), req.user remains undefined and next() is called.
 *
 * Use for endpoints that show different data to authenticated vs guest callers.
 * Example: GET /api/communities/:id — returns is_member=true only if authenticated.
 */
async function optionalAuth(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // no token → guest, skip
    }

    const { verifyAccessToken } = require('../utils/tokens');

    const token   = authHeader.slice(7);
    let payload;
    try { payload = verifyAccessToken(token); } catch { return next(); } // invalid token → guest

    const userId = parseInt(payload.sub, 10);
    const user   = await getCachedUserAuth(userId);

    if (user) {
      req.user = { id: user.id, hasAnonymousIdentity: user.has_anonymous_identity };
    }

    next();
  } catch (err) {
    next(); // on any error, treat as guest — don't block the request
  }
}

module.exports = { requireAuth, requireAnonymousIdentity, optionalAuth };
