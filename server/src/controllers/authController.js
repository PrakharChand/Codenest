/**
 * server/src/controllers/authController.js
 *
 * Business logic for all /api/auth/* routes.
 * All functions are wrapped in asyncHandler at the route level.
 *
 * bcrypt salt rounds: 12
 * (recorded in CODENEST_REFERENCE.md under Auth Conventions)
 */

const crypto     = require('crypto');
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
const PUBLIC_USER_FIELDS = 'id, name, email, avatar_url, bio, has_anonymous_identity, anonymous_username, is_onboarded, verified, onboarding_completed_at, created_at';

async function issueTokens(res, userId) {
  const accessToken  = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId);

  // Hash refresh token for storage & token rotation security
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await query('UPDATE users SET refresh_token_hash = $1 WHERE id = $2', [tokenHash, userId]);

  setRefreshCookie(res, refreshToken);
  return accessToken;
}

async function checkBannedIdentifier(val) {
  if (!val) return;
  const { rows } = await query(
    'SELECT id FROM banned_identifiers WHERE LOWER(identifier_value) = LOWER($1)',
    [String(val)]
  );
  if (rows.length) {
    throw ApiError.forbidden('This account, email address, or login method has been permanently banned due to severe policy violations.');
  }
}

// ── Register ──────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Body: { name, email, password }
 */
async function register(req, res) {
  const { name, email, password } = req.body;

  await checkBannedIdentifier(email);

  // Duplicate email check — case-insensitive
  const existing = await query(
    'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
    [email]
  );
  if (existing.rows.length) {
    throw ApiError.conflict('An account with this email address already exists.', 'email');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  const verificationToken = crypto.randomBytes(32).toString('hex');

  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash, verification_token, verified)
     VALUES ($1, $2, $3, $4, TRUE)
     RETURNING ${PUBLIC_USER_FIELDS}`,
    [name, email, passwordHash, verificationToken]
  );

  const user        = rows[0];
  const accessToken = await issueTokens(res, user.id);

  return res.status(201).json({ user, accessToken, verification_token: verificationToken });
}

// ── Login ─────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
async function login(req, res) {
  const { email, password } = req.body;

  await checkBannedIdentifier(email);

  const { rows } = await query(
    `SELECT id, password_hash, name, email, avatar_url, bio,
            has_anonymous_identity, anonymous_username, is_onboarded, onboarding_completed_at, created_at
     FROM users WHERE LOWER(email) = LOWER($1)`,
    [email]
  );

  if (!rows.length) throw ApiError.unauthorized('Invalid email or password.');

  const user       = rows[0];
  const match      = await bcrypt.compare(password, user.password_hash);
  if (!match) throw ApiError.unauthorized('Invalid email or password.');

  delete user.password_hash;
  const accessToken = await issueTokens(res, user.id);

  return res.json({ user, accessToken });
}

// ── Refresh ───────────────────────────────────────────────────────────────

/**
 * POST /api/auth/refresh
 * Reads refresh token from httpOnly cookie, issues brand new rotated tokens
 * and invalidates previous refresh token (Refresh Token Rotation).
 */
async function refresh(req, res) {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) throw ApiError.unauthorized('No refresh token provided.');

  const payload = verifyRefreshToken(token);
  const userId  = parseInt(payload.sub, 10);
  const incomingHash = crypto.createHash('sha256').update(token).digest('hex');

  // Fetch user & verify token hash matches stored hash
  const { rows } = await query(
    'SELECT id, refresh_token_hash FROM users WHERE id = $1',
    [userId]
  );
  if (!rows.length) throw ApiError.unauthorized('User account not found.');

  const storedHash = rows[0].refresh_token_hash;

  // Token reuse / theft detection: if stored hash doesn't match incoming hash,
  // invalidate stored hash and reject request immediately (401)
  if (!storedHash || storedHash !== incomingHash) {
    await query('UPDATE users SET refresh_token_hash = NULL WHERE id = $1', [userId]);
    clearRefreshCookie(res);
    throw ApiError.unauthorized('Invalid refresh token or token reuse detected.');
  }

  // Rotate tokens: issue brand new access token + new refresh token
  const accessToken = await issueTokens(res, userId);
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
 * Protected. Stamps is_onboarded = TRUE and onboarding_completed_at = NOW()
 */
async function completeOnboarding(req, res) {
  const { rows } = await query(
    `UPDATE users
     SET is_onboarded = TRUE,
         onboarding_completed_at = COALESCE(onboarding_completed_at, NOW()),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, is_onboarded, onboarding_completed_at`,
    [req.user.id]
  );
  return res.json({ is_onboarded: true, onboarding_completed_at: rows[0]?.onboarding_completed_at });
}

/**
 * GET /api/auth/verify/:token
 * Public. Verifies user account using verification_token.
 */
async function verifyEmail(req, res) {
  const { token } = req.params;
  if (!token) throw ApiError.badRequest('Verification token is required.');

  const { rows } = await query(
    `UPDATE users
     SET verified = TRUE,
         verification_token = NULL,
         updated_at = NOW()
     WHERE verification_token = $1
     RETURNING id, name, email, verified`,
    [token]
  );

  if (!rows.length) {
    throw ApiError.badRequest('Invalid or expired email verification token.');
  }

  return res.json({
    message: 'Email verified successfully! You now have full access.',
    user: rows[0],
  });
}

/**
 * POST /api/auth/verify-me
 * Protected. Allows logged in users to self-verify their email in one click.
 */
async function verifyMe(req, res) {
  const { rows } = await query(
    `UPDATE users
     SET verified = TRUE,
         verification_token = NULL,
         updated_at = NOW()
     WHERE id = $1
     RETURNING ${PUBLIC_USER_FIELDS}`,
    [req.user.id]
  );

  return res.json({
    message: 'Email verified successfully!',
    user: rows[0],
  });
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  me,
  anonymousOptions,
  anonymousCreate,
  completeOnboarding,
  verifyEmail,
  verifyMe,
};
