/**
 * server/src/utils/tokens.js
 *
 * JWT access + refresh token layer.
 *
 * ── Auth Conventions (recorded here and in CODENEST_REFERENCE.md) ──────
 *
 * Access token:
 *   - Lifetime: 15 minutes (JWT_ACCESS_EXPIRES_IN env var)
 *   - Payload:  { sub: userId }
 *   - Storage:  returned in JSON response body → AuthContext stores in memory
 *   - Signed with JWT_ACCESS_SECRET
 *
 * Refresh token:
 *   - Lifetime: 7 days (JWT_REFRESH_EXPIRES_IN env var)
 *   - Payload:  { sub: userId }
 *   - Storage:  set as httpOnly + Secure + SameSite=Strict cookie
 *               → JavaScript CANNOT read it (XSS-safe)
 *               → The cookie name is 'refreshToken'
 *   - Signed with JWT_REFRESH_SECRET (different secret from access token)
 *
 * This cookie strategy dictates:
 *   - Phase 7 Axios layer: attach access token from memory in headers
 *   - Phase 11 wiring:     /api/auth/refresh reads the cookie automatically
 *
 * bcrypt salt rounds: 12 (recorded here and in CODENEST_REFERENCE.md)
 * ────────────────────────────────────────────────────────────────────────
 */

const jwt      = require('jsonwebtoken');
const env      = require('../config/env');
const ApiError = require('./ApiError');

// ── Access tokens ─────────────────────────────────────────────────────────

/**
 * Sign a short-lived access token.
 * @param {number|string} userId
 * @returns {string} JWT
 */
function signAccessToken(userId) {
  return jwt.sign(
    { sub: String(userId) },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN }
  );
}

/**
 * Verify an access token.
 * @param {string} token
 * @returns {{ sub: string }} payload
 * @throws {ApiError} 401 on any failure
 */
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET);
  } catch {
    throw ApiError.unauthorized('Invalid or expired access token.');
  }
}

// ── Refresh tokens ────────────────────────────────────────────────────────

/**
 * Sign a longer-lived refresh token.
 * @param {number|string} userId
 * @returns {string} JWT
 */
function signRefreshToken(userId) {
  return jwt.sign(
    { sub: String(userId) },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
  );
}

/**
 * Verify a refresh token.
 * @param {string} token
 * @returns {{ sub: string }} payload
 * @throws {ApiError} 401 on any failure
 */
function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token.');
  }
}

// ── Cookie helper ─────────────────────────────────────────────────────────

/** Name used for the refresh token cookie — shared between authController and tokens layer */
const REFRESH_COOKIE_NAME = 'refreshToken';

/**
 * Set the refresh token as an httpOnly cookie on the response.
 * - httpOnly: JavaScript cannot access it (XSS-safe)
 * - Secure:   only sent over HTTPS in production
 * - SameSite: 'strict' in production, 'lax' in dev (allows localhost cross-port)
 * @param {import('express').Response} res
 * @param {string} refreshToken
 */
function setRefreshCookie(res, refreshToken) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure:   env.IS_PRODUCTION,
    sameSite: env.IS_PRODUCTION ? 'strict' : 'lax',
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path:     '/api/auth',              // cookie only sent to auth routes
  });
}

/**
 * Clear the refresh token cookie (logout).
 * @param {import('express').Response} res
 */
function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
  REFRESH_COOKIE_NAME,
};
