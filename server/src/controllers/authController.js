/**
 * server/src/controllers/authController.js
 *
 * Business logic for all /api/auth/* routes.
 * All functions are wrapped in asyncHandler at the route level.
 *
 * bcrypt salt rounds: 12
 * (recorded in CODENEST_REFERENCE.md under Auth Conventions)
 */

const bcrypt     = require('bcryptjs');
const { query, getClient } = require('../config/db');
const ApiError   = require('../utils/ApiError');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
  REFRESH_COOKIE_NAME,
} = require('../utils/tokens');
const { serializeShadowIdentityResponse } = require('../utils/shadowSerializer');

const BCRYPT_SALT_ROUNDS = 12;

// ── Helpers ───────────────────────────────────────────────────────────────

/** Safe public user fields returned after login/register — never password_hash */
const PUBLIC_USER_FIELDS = 'id, name, email, avatar_url, bio, has_anonymous_identity, anonymous_username, onboarding_completed_at, created_at';

function issueTokens(res, userId) {
  const accessToken  = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId);
  setRefreshCookie(res, refreshToken);
  return accessToken;
}

// ── Register ──────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Body: { name, email, password }
 */
async function register(req, res) {
  const { name, email, password } = req.body;

  const password_hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  // Unique-violation (23505) on email is caught by errorHandler → clean 409 with field: 'email'
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING ${PUBLIC_USER_FIELDS}`,
    [name, email.toLowerCase(), password_hash]
  );

  const user        = rows[0];
  const accessToken = issueTokens(res, user.id);

  return res.status(201).json({ accessToken, user });
}

// ── Login ─────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
async function login(req, res) {
  const { email, password } = req.body;

  // Load password_hash for comparison only — not returned to client
  const { rows } = await query(
    `SELECT id, password_hash, ${PUBLIC_USER_FIELDS} FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );

  const user = rows[0];

  // Generic error — does not reveal whether email or password was wrong
  const GENERIC_ERROR = ApiError.unauthorized('Invalid email or password.');

  if (!user) throw GENERIC_ERROR;
  if (!user.password_hash) {
    // OAuth-only account — no local password
    throw ApiError.unauthorized('This account uses OAuth. Please sign in with GitHub or Google.');
  }

  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches) throw GENERIC_ERROR;

  const accessToken = issueTokens(res, user.id);

  // Build the response object — explicitly omit password_hash
  const { password_hash: _removed, ...safeUser } = user;

  return res.json({ accessToken, user: safeUser });
}

// ── Refresh ───────────────────────────────────────────────────────────────

/**
 * POST /api/auth/refresh
 * Reads refresh token from httpOnly cookie, issues new access token + rotates cookie.
 */
async function refresh(req, res) {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) throw ApiError.unauthorized('No refresh token provided.');

  const payload = verifyRefreshToken(token); // throws 401 if invalid
  const userId  = parseInt(payload.sub, 10);

  // Confirm user still exists
  const { rows } = await query('SELECT id FROM users WHERE id = $1', [userId]);
  if (!rows.length) throw ApiError.unauthorized('User account not found.');

  const accessToken = issueTokens(res, userId);
  return res.json({ accessToken });
}

// ── Logout ────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/logout
 * Clears the refresh cookie. Idempotent.
 */
async function logout(_req, res) {
  clearRefreshCookie(res);
  return res.json({ message: 'Logged out successfully.' });
}

// ── Me ────────────────────────────────────────────────────────────────────

/**
 * GET /api/auth/me
 * Protected. Returns the current user's safe public profile.
 * The frontend calls this on load to rehydrate AuthContext.
 */
async function me(req, res) {
  const { rows } = await query(
    `SELECT ${PUBLIC_USER_FIELDS} FROM users WHERE id = $1`,
    [req.user.id]
  );
  if (!rows.length) throw ApiError.notFound('User not found.');
  return res.json({ user: rows[0] });
}

// ── Anonymous identity — options ──────────────────────────────────────────

/**
 * GET /api/auth/anonymous/options
 * Protected. Returns the adjective list, animal list, and number range
 * so the frontend's three-dropdown flow is fully data-driven.
 */
async function anonymousOptions(_req, res) {
  const [adjResult, animResult] = await Promise.all([
    query('SELECT word FROM anon_adjectives ORDER BY word'),
    query('SELECT word FROM anon_animals ORDER BY word'),
  ]);

  return res.json({
    adjectives:  adjResult.rows.map((r) => r.word),
    animals:     animResult.rows.map((r) => r.word),
    numberRange: { min: 1, max: 99 },
  });
}

// ── Anonymous identity — create ───────────────────────────────────────────

/**
 * POST /api/auth/anonymous/create
 * Protected. Body: { adjective, animal, number }
 *
 * Rule 3 guardrails (all server-side):
 *   - 409 if identity already exists (permanent — cannot be recreated)
 *   - 400 if adjective/animal not in lookup tables
 *   - 400 if number out of 1-99 range
 *   - 409 if composed username collides (user should pick a different number)
 *   - Returns ONLY anonymous fields via shadowSerializer (no real identity)
 */
async function anonymousCreate(req, res) {
  const { adjective, animal, number } = req.body;

  // Guard: identity already created (Rule 3 — permanent)
  if (req.user.hasAnonymousIdentity) {
    throw ApiError.conflict(
      'Your anonymous identity has already been created and cannot be changed.'
    );
  }

  // Validate number range
  const num = parseInt(number, 10);
  if (isNaN(num) || num < 1 || num > 99) {
    throw ApiError.badRequest('Number must be between 1 and 99.', 'number');
  }

  // Validate adjective exists in the lookup table
  const adjCheck = await query(
    'SELECT 1 FROM anon_adjectives WHERE LOWER(word) = LOWER($1)',
    [adjective]
  );
  if (!adjCheck.rows.length) {
    throw ApiError.badRequest('Invalid adjective. Please select from the provided list.', 'adjective');
  }

  // Validate animal exists in the lookup table
  const animCheck = await query(
    'SELECT 1 FROM anon_animals WHERE LOWER(word) = LOWER($1)',
    [animal]
  );
  if (!animCheck.rows.length) {
    throw ApiError.badRequest('Invalid animal. Please select from the provided list.', 'animal');
  }

  // Compose username: silent_fox27
  const username = `${adjective.toLowerCase()}_${animal.toLowerCase()}${num}`;

  // Default anonymous avatar (DiceBear pixel-art style, deterministic by username)
  const defaultAvatarUrl = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(username)}`;

  // Transactional update — single atomic operation
  const client = await getClient();
  let updatedUser;
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE users
       SET anonymous_username        = $1,
           anonymous_avatar_url      = $2,
           has_anonymous_identity    = TRUE,
           updated_at                = NOW()
       WHERE id = $3
       RETURNING anonymous_username, anonymous_avatar_url, anonymous_reputation_score, has_anonymous_identity`,
      [username, defaultAvatarUrl, req.user.id]
    );
    updatedUser = rows[0];
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    // Unique-violation on anonymous_username → errorHandler converts to clean 409
    // but we add a more helpful message here
    if (err.code === '23505') {
      throw ApiError.conflict(
        'That username combination is already taken. Please pick a different number.',
        'number'
      );
    }
    throw err;
  } finally {
    client.release();
  }

  // Return ONLY anonymous fields — no real identity data (Rule 2)
  return res.status(201).json({
    message:  'Anonymous identity created successfully.',
    identity: serializeShadowIdentityResponse(updatedUser),
  });
}

/**
 * POST /api/users/me/onboarding/complete or /api/auth/onboarding/complete
 * Protected. Stamps onboarding_completed_at = NOW()
 */
async function completeOnboarding(req, res) {
  const { rows } = await query(
    `UPDATE users SET onboarding_completed_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING onboarding_completed_at`,
    [req.user.id]
  );
  return res.json({ onboarding_completed_at: rows[0]?.onboarding_completed_at });
}

module.exports = { register, login, refresh, logout, me, anonymousOptions, anonymousCreate, completeOnboarding };
