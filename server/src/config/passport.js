/**
 * server/src/config/passport.js
 *
 * Passport strategies — GitHub and Google OAuth.
 *
 * Stateless mode: session: false throughout.
 * CodeNest uses JWTs from Phase 2; no server sessions are introduced.
 *
 * Account-linking rule (canonical — recorded in CODENEST_REFERENCE.md):
 *   Email is the identity key. On OAuth callback:
 *     1. Email matches existing user → log in (issue tokens for existing account).
 *        This handles "signed up with email/password first, later clicks OAuth".
 *        Password-based users have password_hash; OAuth login skips the password check.
 *     2. No user with that email → create a new user row:
 *        name + avatar from OAuth profile, password_hash = NULL (Phase 1 made it nullable),
 *        has_anonymous_identity = FALSE.
 *     3. Never create two rows for one email. Email is the identity key.
 *     4. Provider returns no email → fail with a clean message.
 *        Never invent a placeholder email.
 */

const passport       = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { query }      = require('./db');
const env            = require('./env');

// ── Shared account-resolver ───────────────────────────────────────────────

/**
 * findOrCreateOAuthUser({ email, name, avatarUrl })
 * Returns the user row. Throws if email is missing.
 */
async function findOrCreateOAuthUser({ email, name, avatarUrl }) {
  if (!email) {
    throw new Error('NO_EMAIL');
  }

  const normalizedEmail = email.toLowerCase();

  // 1. Look up existing user by email
  const { rows: existing } = await query(
    'SELECT id, name, email, avatar_url, has_anonymous_identity, anonymous_username, created_at FROM users WHERE email = $1',
    [normalizedEmail]
  );

  if (existing.length) {
    // Existing account — link and return it (regardless of sign-up method)
    return existing[0];
  }

  // 2. Create new user — password_hash left NULL (OAuth-only account)
  const { rows: created } = await query(
    `INSERT INTO users (name, email, avatar_url, password_hash)
     VALUES ($1, $2, $3, NULL)
     RETURNING id, name, email, avatar_url, has_anonymous_identity, anonymous_username, created_at`,
    [name || normalizedEmail, normalizedEmail, avatarUrl || null]
  );

  return created[0];
}

// ── GitHub Strategy ───────────────────────────────────────────────────────

passport.use(new GitHubStrategy(
  {
    clientID:     env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
    callbackURL:  env.GITHUB_CALLBACK_URL,
    scope:        ['user:email'],
  },
  async (_accessToken, _refreshToken, profile, done) => {
    try {
      // GitHub may nest email in profile.emails
      const email = profile.emails?.[0]?.value || null;
      const user  = await findOrCreateOAuthUser({
        email,
        name:      profile.displayName || profile.username,
        avatarUrl: profile.photos?.[0]?.value || null,
      });
      return done(null, user);
    } catch (err) {
      if (err.message === 'NO_EMAIL') {
        return done(null, false, {
          message: 'Your GitHub account does not have a public email. '
                 + 'Please make your email public in GitHub settings, or use email/password to sign up.',
        });
      }
      return done(err);
    }
  }
));

// ── Google Strategy ───────────────────────────────────────────────────────

passport.use(new GoogleStrategy(
  {
    clientID:     env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    callbackURL:  env.GOOGLE_CALLBACK_URL,
  },
  async (_accessToken, _refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value || null;
      const user  = await findOrCreateOAuthUser({
        email,
        name:      profile.displayName,
        avatarUrl: profile.photos?.[0]?.value || null,
      });
      return done(null, user);
    } catch (err) {
      if (err.message === 'NO_EMAIL') {
        return done(null, false, {
          message: 'Google did not provide an email address. Please use email/password to sign up.',
        });
      }
      return done(err);
    }
  }
));

module.exports = passport;
