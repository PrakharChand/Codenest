/**
 * server/src/routes/authRoutes.js
 *
 * URL definitions for /api/auth/* — no business logic here.
 * Convention: routes = URL + middleware chain only. Logic is in the controller.
 *
 * OAuth handoff mechanism (recorded in CODENEST_REFERENCE.md):
 *   On successful OAuth callback, the server:
 *     1. Issues an access token (same spec as Phase 2: JWT, sub=userId, 15m)
 *     2. Sets the refresh token as an httpOnly cookie (same spec as Phase 2)
 *     3. Redirects to CLIENT_URL/oauth-callback?token=<accessToken>
 *   The frontend (Phase 7/11) reads the token query param, stores it in
 *   AuthContext memory, then immediately clears it from the URL.
 *   The refresh token is NEVER in the URL.
 */

const express      = require('express');
const { body }     = require('express-validator');
const router       = express.Router();

const asyncHandler  = require('../utils/asyncHandler');
const validate      = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimit');
const { requireAuth } = require('../middleware/auth');
const {
  register,
  login,
  refresh,
  logout,
  me,
  anonymousOptions,
  anonymousCreate,
} = require('../controllers/authController');

const passport = require('../config/passport');
const { signAccessToken, signRefreshToken, setRefreshCookie } = require('../utils/tokens');
const env      = require('../config/env');

// ── Validation chains ─────────────────────────────────────────────────────

const registerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required.')
    .isLength({ max: 100 })
    .withMessage('Name must be 100 characters or fewer.'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('A valid email address is required.')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters.'),
];

const loginValidation = [
  body('email').trim().isEmail().withMessage('A valid email is required.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.'),
];

const anonymousCreateValidation = [
  body('adjective').trim().notEmpty().withMessage('Adjective is required.'),
  body('animal').trim().notEmpty().withMessage('Animal is required.'),
  body('number')
    .isInt({ min: 1, max: 99 })
    .withMessage('Number must be between 1 and 99.'),
];

// ── Routes ────────────────────────────────────────────────────────────────

// Public — rate-limited
router.post('/register', authLimiter, registerValidation,   validate, asyncHandler(register));
router.post('/login',    authLimiter, loginValidation,       validate, asyncHandler(login));
router.post('/refresh',  authLimiter,                                  asyncHandler(refresh));
router.post('/logout',                                                  asyncHandler(logout));

// Protected
router.get('/me', requireAuth, asyncHandler(me));

// Anonymous identity (protected)
router.get('/anonymous/options', requireAuth, asyncHandler(anonymousOptions));
router.post(
  '/anonymous/create',
  requireAuth,
  anonymousCreateValidation,
  validate,
  asyncHandler(anonymousCreate)
);

// ── OAuth — GitHub ────────────────────────────────────────────────────────

router.get('/github',
  passport.authenticate('github', { session: false, scope: ['user:email'] })
);

router.get('/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${env.CLIENT_URL}/login?error=oauth_failed` }),
  (req, res) => {
    const user         = req.user;
    const accessToken  = signAccessToken(user.id);
    const refreshToken = signRefreshToken(user.id);
    setRefreshCookie(res, refreshToken);
    // Handoff: redirect with access token in query param.
    // Phase 7/11 reads it into AuthContext memory and immediately clears it from the URL.
    // Refresh token is NEVER in the URL.
    res.redirect(`${env.CLIENT_URL}/oauth-callback?token=${accessToken}`);
  }
);

// ── OAuth — Google ────────────────────────────────────────────────────────

router.get('/google',
  passport.authenticate('google', { session: false, scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${env.CLIENT_URL}/login?error=oauth_failed` }),
  (req, res) => {
    const user         = req.user;
    const accessToken  = signAccessToken(user.id);
    const refreshToken = signRefreshToken(user.id);
    setRefreshCookie(res, refreshToken);
    res.redirect(`${env.CLIENT_URL}/oauth-callback?token=${accessToken}`);
  }
);

module.exports = router;

